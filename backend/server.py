from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import secrets
import base64
from io import BytesIO
import httpx
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Bunny CDN Configuration
BUNNY_STORAGE_ZONE = os.environ.get('BUNNY_STORAGE_ZONE', '')
BUNNY_API_KEY = os.environ.get('BUNNY_API_KEY', '')
BUNNY_CDN_HOSTNAME = os.environ.get('BUNNY_CDN_HOSTNAME', '')
BUNNY_STORAGE_REGION = os.environ.get('BUNNY_STORAGE_REGION', 'storage.bunnycdn.com')
BUNNY_ENABLED = bool(BUNNY_STORAGE_ZONE and BUNNY_API_KEY)

# Bunny CDN Upload Helper
async def upload_to_bunny(file_content: bytes, file_path: str, content_type: str = "image/jpeg") -> Optional[str]:
    """Upload file to Bunny CDN Storage and return CDN URL"""
    if not BUNNY_ENABLED:
        return None

    try:
        url = f"https://{BUNNY_STORAGE_REGION}/{BUNNY_STORAGE_ZONE}/{file_path}"
        checksum = hashlib.sha256(file_content).hexdigest().upper()

        headers = {
            "AccessKey": BUNNY_API_KEY,
            "Content-Type": content_type,
            "Checksum": checksum
        }

        async with httpx.AsyncClient() as client:
            response = await client.put(url, content=file_content, headers=headers, timeout=60.0)

        if response.status_code == 201:
            cdn_url = f"https://{BUNNY_CDN_HOSTNAME}/{file_path}"
            logging.info(f"Uploaded to Bunny CDN: {cdn_url}")
            return cdn_url
        else:
            logging.error(f"Bunny upload failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logging.error(f"Bunny upload error: {e}")
        return None

async def delete_from_bunny(file_path: str) -> bool:
    """Delete file from Bunny CDN Storage"""
    if not BUNNY_ENABLED:
        return False

    try:
        url = f"https://{BUNNY_STORAGE_REGION}/{BUNNY_STORAGE_ZONE}/{file_path}"
        headers = {"AccessKey": BUNNY_API_KEY}

        async with httpx.AsyncClient() as client:
            response = await client.delete(url, headers=headers, timeout=30.0)

        return response.status_code in [200, 204]
    except Exception as e:
        logging.error(f"Bunny delete error: {e}")
        return False

def base64_to_bytes(base64_string: str) -> tuple:
    """Convert base64 string to bytes and return (bytes, content_type)"""
    if ',' in base64_string:
        header, data = base64_string.split(',', 1)
        content_type = header.split(':')[1].split(';')[0] if ':' in header else 'image/jpeg'
    else:
        data = base64_string
        content_type = 'image/jpeg'

    return base64.b64decode(data), content_type

async def upload_base64_to_bunny(base64_string: str, folder: str, filename: str = None) -> Optional[str]:
    """Upload base64 image to Bunny CDN"""
    if not BUNNY_ENABLED or not base64_string:
        return None

    try:
        file_content, content_type = base64_to_bytes(base64_string)

        if not filename:
            ext = 'jpg' if 'jpeg' in content_type else content_type.split('/')[-1]
            filename = f"{uuid.uuid4()}.{ext}"

        file_path = f"{folder}/{filename}"
        return await upload_to_bunny(file_content, file_path, content_type)
    except Exception as e:
        logging.error(f"Base64 to Bunny upload error: {e}")
        return None

async def process_room_photos_for_bunny(rooms: List[Dict], property_id: str) -> List[Dict]:
    """Process room photos - upload to Bunny CDN and replace base64 with URLs"""
    if not BUNNY_ENABLED:
        return rooms

    processed_rooms = []
    for room in rooms:
        room_copy = dict(room)
        room_id = room.get('id', str(uuid.uuid4()))

        if room_copy.get('photos'):
            new_photos = []
            for i, photo in enumerate(room_copy['photos']):
                if photo and photo.startswith('data:'):
                    cdn_url = await upload_base64_to_bunny(
                        photo,
                        f"properties/{property_id}/rooms/{room_id}",
                        f"photo_{i}.jpg"
                    )
                    new_photos.append(cdn_url if cdn_url else photo)
                else:
                    new_photos.append(photo)
            room_copy['photos'] = new_photos

        if room_copy.get('panorama_photo') and room_copy['panorama_photo'].startswith('data:'):
            cdn_url = await upload_base64_to_bunny(
                room_copy['panorama_photo'],
                f"properties/{property_id}/rooms/{room_id}",
                "panorama.jpg"
            )
            if cdn_url:
                room_copy['panorama_photo'] = cdn_url

        processed_rooms.append(room_copy)

    return processed_rooms

def compress_base64_image(base64_string: str, max_size_kb: int = 500) -> str:
    """Compress base64 image to reduce size"""
    try:
        if ',' in base64_string:
            header, data = base64_string.split(',', 1)
        else:
            header = 'data:image/jpeg;base64'
            data = base64_string

        image_data = base64.b64decode(data)

        current_size_kb = len(image_data) / 1024
        if current_size_kb <= max_size_kb:
            return base64_string

        try:
            from PIL import Image
            img = Image.open(BytesIO(image_data))

            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_size = (max_width, int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)

            quality = 85
            output = BytesIO()

            while quality > 20:
                output.seek(0)
                output.truncate()
                img.save(output, format='JPEG', quality=quality, optimize=True)
                if len(output.getvalue()) / 1024 <= max_size_kb:
                    break
                quality -= 10

            compressed_data = base64.b64encode(output.getvalue()).decode()
            return f"data:image/jpeg;base64,{compressed_data}"
        except ImportError:
            logging.warning("PIL not available for image compression")
            return base64_string
    except Exception as e:
        logging.error(f"Image compression error: {e}")
        return base64_string

def compress_room_photos(rooms: List[Dict]) -> List[Dict]:
    """Compress all photos in room data"""
    for room in rooms:
        if room.get('photos'):
            room['photos'] = [compress_base64_image(p) for p in room['photos']]
        if room.get('panorama_photo'):
            room['panorama_photo'] = compress_base64_image(room['panorama_photo'], max_size_kb=800)
    return rooms

# Supabase connection
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase: Client = create_client(supabase_url, supabase_key)

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'homeview-pro-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'admin-secret-2024')

# Resend Email (optional)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://urgent-repair-1.preview.emergentagent.com')

app = FastAPI(title="HomeView Pro API")
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin")
security = HTTPBearer()

# ==================== PACKAGES ====================

PACKAGES = {
    "free": {
        "name": "Ücretsiz Paket",
        "price": 0,
        "property_limit": 1,
        "features": ["regular_photos", "mapping"],
        "has_360": False,
        "is_free": True,
        "weekly_limit": 1,
        "auto_delete_days": 7
    },
    "starter": {
        "name": "Başlangıç Paketi",
        "price": 700,
        "property_limit": 10,
        "features": ["regular_photos", "mapping", "company_name", "sun_simulation"],
        "has_360": False,
        "is_free": False
    },
    "premium": {
        "name": "Premium Paket",
        "price": 1000,
        "property_limit": 50,
        "features": ["regular_photos", "360_photos", "mapping", "poi", "property_details", "company_name", "sun_simulation"],
        "has_360": True,
        "is_free": False
    },
    "ultra": {
        "name": "Ultra Paket",
        "price": 2000,
        "property_limit": 100,
        "features": ["regular_photos", "360_photos", "mapping", "poi", "property_details", "company_name", "sun_simulation"],
        "has_360": True,
        "is_free": False
    },
    "corporate": {
        "name": "Kurumsal Paket",
        "price": -1,
        "property_limit": -1,
        "features": ["regular_photos", "360_photos", "mapping", "poi", "property_details", "company_name", "sun_simulation", "priority_support", "dedicated_manager"],
        "has_360": True,
        "is_free": False,
        "contact_required": True
    }
}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    company_name: str
    phone: str
    package: str = "free"
    auto_payment: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    company_name: str
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    company_logo: Optional[str] = None
    package: str
    package_name: str
    property_limit: int
    property_count: int
    has_360: bool
    subscription_status: str
    subscription_end: Optional[str] = None
    auto_payment: bool
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PaymentCreate(BaseModel):
    user_id: str
    amount: float
    package: str

class PaymentResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    package: str
    status: str
    payment_date: str
    next_payment_date: Optional[str] = None

class HotspotData(BaseModel):
    target_room_id: str
    yaw: float = 0
    pitch: float = -10
    label: Optional[str] = None

class RoomData(BaseModel):
    id: str
    name: str
    room_type: str
    position_x: int
    position_y: int
    floor: int = 0
    square_meters: Optional[float] = None
    facing_direction: Optional[str] = None
    photos: List[str] = []
    panorama_photo: Optional[str] = None
    connections: List[str] = []
    hotspots: List[HotspotData] = []

class PropertyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    address: str
    city: str
    district: str
    square_meters: float
    room_count: str
    property_type: str = "single"
    floor: int
    total_floors: int
    building_age: int
    heating_type: str
    facing_direction: str
    price: float
    currency: str = "TRY"
    view_type: str = "regular"
    rooms: List[RoomData] = []
    entry_room_id: Optional[str] = None
    pois: List[Dict] = []
    cover_image: Optional[str] = None

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    square_meters: Optional[float] = None
    room_count: Optional[str] = None
    property_type: Optional[str] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    building_age: Optional[int] = None
    heating_type: Optional[str] = None
    facing_direction: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    view_type: Optional[str] = None
    rooms: Optional[List[RoomData]] = None
    entry_room_id: Optional[str] = None
    pois: Optional[List[Dict]] = None
    cover_image: Optional[str] = None

class AgentInfo(BaseModel):
    first_name: str
    last_name: str
    company_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    profile_photo: Optional[str] = None
    company_logo: Optional[str] = None

class PropertyResponse(BaseModel):
    id: str
    user_id: str
    company_name: str
    title: str
    description: Optional[str] = None
    address: str
    city: str
    district: str
    square_meters: float
    room_count: str
    property_type: str
    floor: int
    total_floors: int
    building_age: int
    heating_type: str
    facing_direction: str
    price: float
    currency: str
    view_type: str
    rooms: List[RoomData] = []
    entry_room_id: Optional[str] = None
    pois: List[Dict] = []
    cover_image: Optional[str] = None
    view_count: int = 0
    total_view_duration: int = 0
    created_at: str
    updated_at: str
    share_link: str
    agent: Optional[AgentInfo] = None

class VisitorCreate(BaseModel):
    property_id: str
    first_name: str
    last_name: str
    phone: str

class VisitorResponse(BaseModel):
    id: str
    property_id: str
    first_name: str
    last_name: str
    phone: str
    visit_count: int
    total_duration: int
    last_visit: str
    created_at: str

class VisitCreate(BaseModel):
    property_id: str
    visitor_id: str
    duration: int
    rooms_visited: List[str] = []

class AdminLogin(BaseModel):
    email: str
    password: str

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    package: Optional[str] = None
    subscription_status: Optional[str] = None
    subscription_end: Optional[str] = None
    subscription_days: Optional[int] = None

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    company_name: str
    phone: Optional[str] = None
    package: str
    subscription_status: str = "active"
    subscription_days: int = 30

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    property_ids: List[str] = []

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    property_ids: Optional[List[str]] = None

class GroupResponse(BaseModel):
    id: str
    user_id: str
    company_name: str
    name: str
    description: Optional[str] = None
    property_ids: List[str] = []
    created_at: str
    updated_at: str
    share_link: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, is_admin: bool = False) -> str:
    payload = {
        "sub": user_id,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Geçersiz token")

        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

        user = result.data[0]
        user.pop('password', None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")

        admin_id = payload.get("sub")
        return {"id": admin_id, "is_admin": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

# ==================== EMAIL HELPER ====================

async def send_email(to_email: str, subject: str, html_content: str):
    """Send email using Resend API"""
    if not RESEND_API_KEY:
        logging.warning(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
        return {"id": "mock-" + str(uuid.uuid4())}

    try:
        import resend
        resend.api_key = RESEND_API_KEY

        params = {
            "from": f"Mekan360 <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }

        result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Email sent successfully to {to_email}, ID: {result.get('id', 'unknown')}")
        return result
    except Exception as e:
        logging.error(f"Resend email failed: {e}")
        raise HTTPException(status_code=500, detail=f"E-posta gönderilemedi: {str(e)}")

# ==================== AUTH ROUTES ====================

@api_router.get("/packages")
async def get_packages():
    return PACKAGES

@api_router.post("/cleanup/free-properties")
async def cleanup_free_properties():
    """7 günden eski ücretsiz kullanıcı gayrimenkullerini siler"""
    try:
        free_users_result = supabase.table("users").select("*").eq("package", "free").execute()
        free_users = free_users_result.data
        deleted_count = 0

        for user in free_users:
            user_id = user["id"]
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

            old_props = supabase.table("properties").select("id").eq("user_id", user_id).lt("created_at", cutoff_date).execute()

            for prop in old_props.data:
                supabase.table("properties").delete().eq("id", prop["id"]).execute()
                deleted_count += 1

            current_props = supabase.table("properties").select("id", count="exact").eq("user_id", user_id).execute()
            current_count = current_props.count or 0

            supabase.table("users").update({"property_count": current_count}).eq("id", user_id).execute()

        return {"deleted_count": deleted_count, "message": f"{deleted_count} eski gayrimenkul silindi"}
    except Exception as e:
        logging.error(f"Cleanup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_result = supabase.table("users").select("*").eq("email", user_data.email).execute()
    if existing_result.data and len(existing_result.data) > 0:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    if user_data.package not in PACKAGES:
        raise HTTPException(status_code=400, detail="Geçersiz paket")

    if user_data.package == "corporate":
        raise HTTPException(status_code=400, detail="Kurumsal paket için lütfen bizimle iletişime geçin: 0551 478 02 59")

    package_info = PACKAGES[user_data.package]
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    is_free = package_info.get("is_free", False)
    subscription_status = "active" if is_free else "pending"
    subscription_end = (now + timedelta(days=365)).isoformat() if is_free else None

    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "company_name": user_data.company_name,
        "phone": user_data.phone,
        "package": user_data.package,
        "auto_payment": user_data.auto_payment,
        "subscription_status": subscription_status,
        "subscription_end": subscription_end,
        "property_count": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    supabase.table("users").insert(user_doc).execute()

    if is_free:
        token = create_token(user_id, is_admin=False)
        return {
            "user_id": user_id,
            "email": user_data.email,
            "package": user_data.package,
            "package_name": package_info["name"],
            "amount": 0,
            "access_token": token,
            "message": "Kayıt başarılı! Ücretsiz paketiniz aktif."
        }

    return {
        "user_id": user_id,
        "email": user_data.email,
        "package": user_data.package,
        "package_name": package_info["name"],
        "amount": package_info["price"],
        "message": "Kayıt oluşturuldu. Ödeme bekleniyor."
    }

@api_router.post("/auth/complete-payment")
async def complete_payment(payment_data: PaymentCreate):
    """Called after successful iyzico payment (MOCK for now)"""
    user_result = supabase.table("users").select("*").eq("id", payment_data.user_id).execute()
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user = user_result.data[0]
    now = datetime.now(timezone.utc)
    subscription_end = now + timedelta(days=30)

    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "user_id": payment_data.user_id,
        "amount": payment_data.amount,
        "package": payment_data.package,
        "status": "completed",
        "payment_date": now.isoformat(),
        "next_payment_date": subscription_end.isoformat()
    }
    supabase.table("payments").insert(payment_doc).execute()

    supabase.table("users").update({
        "subscription_status": "active",
        "subscription_end": subscription_end.isoformat(),
        "updated_at": now.isoformat()
    }).eq("id", payment_data.user_id).execute()

    token = create_token(payment_data.user_id)
    updated_user_result = supabase.table("users").select("*").eq("id", payment_data.user_id).execute()
    updated_user = updated_user_result.data[0]
    package_info = PACKAGES[updated_user["package"]]

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=updated_user["id"],
            email=updated_user["email"],
            first_name=updated_user["first_name"],
            last_name=updated_user["last_name"],
            company_name=updated_user["company_name"],
            phone=updated_user.get("phone"),
            package=updated_user["package"],
            package_name=package_info["name"],
            property_limit=package_info["property_limit"],
            property_count=updated_user.get("property_count", 0),
            has_360=package_info["has_360"],
            subscription_status=updated_user["subscription_status"],
            subscription_end=updated_user.get("subscription_end"),
            auto_payment=updated_user.get("auto_payment", False),
            created_at=updated_user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user_result = supabase.table("users").select("*").eq("email", user_data.email).execute()
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")

    user = user_result.data[0]

    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")

    if user.get("subscription_status") != "active":
        raise HTTPException(status_code=403, detail="Aboneliğiniz aktif değil. Lütfen ödeme yapın.")

    if user.get("subscription_end"):
        end_date = datetime.fromisoformat(user["subscription_end"])
        if end_date < datetime.now(timezone.utc):
            supabase.table("users").update({"subscription_status": "expired"}).eq("id", user["id"]).execute()
            raise HTTPException(status_code=403, detail="Aboneliğiniz sona erdi. Lütfen yenileyin.")

    token = create_token(user["id"])
    package_info = PACKAGES[user["package"]]

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            company_name=user["company_name"],
            phone=user.get("phone"),
            package=user["package"],
            package_name=package_info["name"],
            property_limit=package_info["property_limit"],
            property_count=user.get("property_count", 0),
            has_360=package_info["has_360"],
            subscription_status=user["subscription_status"],
            subscription_end=user.get("subscription_end"),
            auto_payment=user.get("auto_payment", False),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    package_info = PACKAGES[current_user["package"]]
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        company_name=current_user["company_name"],
        phone=current_user.get("phone"),
        profile_photo=current_user.get("profile_photo"),
        company_logo=current_user.get("company_logo"),
        package=current_user["package"],
        package_name=package_info["name"],
        property_limit=package_info["property_limit"],
        property_count=current_user.get("property_count", 0),
        has_360=package_info["has_360"],
        subscription_status=current_user["subscription_status"],
        subscription_end=current_user.get("subscription_end"),
        auto_payment=current_user.get("auto_payment", False),
        created_at=current_user["created_at"]
    )

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    company_logo: Optional[str] = None

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Kullanıcı profil bilgilerini güncelle"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")

    if BUNNY_ENABLED:
        if update_data.get('profile_photo') and update_data['profile_photo'].startswith('data:'):
            cdn_url = await upload_base64_to_bunny(
                update_data['profile_photo'],
                f"users/{current_user['id']}",
                "profile.jpg"
            )
            if cdn_url:
                update_data['profile_photo'] = cdn_url

        if update_data.get('company_logo') and update_data['company_logo'].startswith('data:'):
            cdn_url = await upload_base64_to_bunny(
                update_data['company_logo'],
                f"users/{current_user['id']}",
                "logo.png"
            )
            if cdn_url:
                update_data['company_logo'] = cdn_url
    else:
        if update_data.get('profile_photo'):
            update_data['profile_photo'] = compress_base64_image(update_data['profile_photo'], max_size_kb=200)
        if update_data.get('company_logo'):
            update_data['company_logo'] = compress_base64_image(update_data['company_logo'], max_size_kb=200)

    supabase.table("users").update(update_data).eq("id", current_user["id"]).execute()

    updated_user_result = supabase.table("users").select("*").eq("id", current_user["id"]).execute()
    updated_user = updated_user_result.data[0]
    package_info = PACKAGES[updated_user["package"]]

    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        first_name=updated_user["first_name"],
        last_name=updated_user["last_name"],
        company_name=updated_user["company_name"],
        phone=updated_user.get("phone"),
        profile_photo=updated_user.get("profile_photo"),
        company_logo=updated_user.get("company_logo"),
        package=updated_user["package"],
        package_name=package_info["name"],
        property_limit=package_info["property_limit"],
        property_count=updated_user.get("property_count", 0),
        has_360=package_info["has_360"],
        subscription_status=updated_user["subscription_status"],
        subscription_end=updated_user.get("subscription_end"),
        auto_payment=updated_user.get("auto_payment", False),
        created_at=updated_user["created_at"]
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    user_result = supabase.table("users").select("*").eq("email", request.email).execute()
    if not user_result.data or len(user_result.data) == 0:
        return {"message": "Şifre sıfırlama linki e-posta adresinize gönderildi."}

    user = user_result.data[0]

    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    supabase.table("password_resets").insert({
        "user_id": user["id"],
        "token": reset_token,
        "expires_at": expiry.isoformat(),
        "used": False
    }).execute()

    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
            <tr>
                <td style="background:linear-gradient(135deg,#064E3B 0%,#0D5C4D 100%);padding:30px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;">Mekan360</h1>
                    <p style="color:#10B981;margin:10px 0 0;font-size:14px;">Premium Daire Tanıtım Sistemi</p>
                </td>
            </tr>
            <tr>
                <td style="padding:40px 30px;">
                    <h2 style="color:#064E3B;margin:0 0 20px;font-size:24px;">Şifre Sıfırlama</h2>
                    <p style="color:#333333;font-size:16px;line-height:1.6;">Merhaba <strong>{user['first_name']}</strong>,</p>
                    <p style="color:#666666;font-size:14px;line-height:1.6;">Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
                    <div style="text-align:center;margin:30px 0;">
                        <a href="{reset_link}" style="background:linear-gradient(135deg,#064E3B 0%,#0D5C4D 100%);color:#ffffff;padding:15px 40px;text-decoration:none;border-radius:30px;display:inline-block;font-weight:bold;font-size:16px;">Şifremi Sıfırla</a>
                    </div>
                    <p style="color:#999999;font-size:12px;line-height:1.6;">Bu link <strong>1 saat</strong> süreyle geçerlidir.</p>
                    <p style="color:#999999;font-size:12px;line-height:1.6;">Bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz. Hesabınız güvende.</p>
                </td>
            </tr>
            <tr>
                <td style="background-color:#f8f8f8;padding:20px 30px;text-align:center;border-top:1px solid #eeeeee;">
                    <p style="color:#999999;font-size:12px;margin:0;">© 2024 Mekan360. Tüm hakları saklıdır.</p>
                    <p style="color:#999999;font-size:11px;margin:5px 0 0;">
                        <a href="https://mekan360.com.tr" style="color:#064E3B;text-decoration:none;">mekan360.com.tr</a>
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    await send_email(request.email, "Mekan360 - Şifre Sıfırlama", html_content)

    return {"message": "Şifre sıfırlama linki e-posta adresinize gönderildi."}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetConfirm):
    reset_result = supabase.table("password_resets").select("*").eq("token", request.token).eq("used", False).execute()

    if not reset_result.data or len(reset_result.data) == 0:
        raise HTTPException(status_code=400, detail="Geçersiz veya kullanılmış token")

    reset_record = reset_result.data[0]

    expiry = datetime.fromisoformat(reset_record["expires_at"])
    if expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token süresi dolmuş")

    supabase.table("users").update({"password": hash_password(request.new_password)}).eq("id", reset_record["user_id"]).execute()

    supabase.table("password_resets").update({"used": True}).eq("token", request.token).execute()

    return {"message": "Şifreniz başarıyla güncellendi."}

# ==================== PROPERTY ROUTES ====================

@api_router.post("/properties", response_model=PropertyResponse)
async def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    package_info = PACKAGES[current_user["package"]]
    property_count = current_user.get("property_count", 0)

    if package_info["property_limit"] != -1 and property_count >= package_info["property_limit"]:
        raise HTTPException(status_code=403, detail=f"Paket limitinize ulaştınız ({package_info['property_limit']} gayrimenkul)")

    if property_data.view_type == "360" and not package_info["has_360"]:
        raise HTTPException(status_code=403, detail="360° görüntüleme için Premium veya Ultra pakete yükseltin")

    property_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    property_dict = property_data.model_dump()

    if BUNNY_ENABLED:
        if property_dict.get('rooms'):
            property_dict['rooms'] = await process_room_photos_for_bunny(
                [dict(r) for r in property_dict['rooms']],
                property_id
            )
        if property_dict.get('cover_image') and property_dict['cover_image'].startswith('data:'):
            cdn_url = await upload_base64_to_bunny(
                property_dict['cover_image'],
                f"properties/{property_id}",
                "cover.jpg"
            )
            if cdn_url:
                property_dict['cover_image'] = cdn_url
    else:
        if property_dict.get('rooms'):
            property_dict['rooms'] = compress_room_photos([dict(r) for r in property_dict['rooms']])
        if property_dict.get('cover_image'):
            property_dict['cover_image'] = compress_base64_image(property_dict['cover_image'])

    property_doc = {
        "id": property_id,
        "user_id": current_user["id"],
        "company_name": current_user["company_name"],
        **property_dict,
        "view_count": 0,
        "total_view_duration": 0,
        "created_at": now,
        "updated_at": now,
        "share_link": f"/view/{property_id}"
    }

    supabase.table("properties").insert(property_doc).execute()

    supabase.table("users").update({
        "property_count": property_count + 1
    }).eq("id", current_user["id"]).execute()

    return PropertyResponse(**property_doc)

@api_router.get("/properties", response_model=List[PropertyResponse])
async def get_user_properties(current_user: dict = Depends(get_current_user)):
    result = supabase.table("properties").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).limit(200).execute()

    return [PropertyResponse(**p) for p in result.data]

@api_router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    property_result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_doc = property_result.data[0]

    user_result = supabase.table("users").select("*").eq("id", property_doc["user_id"]).execute()
    if user_result.data and len(user_result.data) > 0:
        user_doc = user_result.data[0]
        property_doc["agent"] = AgentInfo(
            first_name=user_doc.get("first_name", ""),
            last_name=user_doc.get("last_name", ""),
            company_name=user_doc.get("company_name", ""),
            phone=user_doc.get("phone"),
            email=user_doc.get("email"),
            profile_photo=user_doc.get("profile_photo"),
            company_logo=user_doc.get("company_logo")
        )

    return PropertyResponse(**property_doc)

@api_router.put("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: dict = Depends(get_current_user)
):
    property_result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_doc = property_result.data[0]

    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu gayrimenkulü düzenleme yetkiniz yok")

    update_data = {k: v for k, v in property_data.model_dump().items() if v is not None}

    if BUNNY_ENABLED:
        if update_data.get('rooms'):
            update_data['rooms'] = await process_room_photos_for_bunny(
                [dict(r) for r in update_data['rooms']],
                property_id
            )
        if update_data.get('cover_image') and update_data['cover_image'].startswith('data:'):
            cdn_url = await upload_base64_to_bunny(
                update_data['cover_image'],
                f"properties/{property_id}",
                "cover.jpg"
            )
            if cdn_url:
                update_data['cover_image'] = cdn_url
    else:
        if update_data.get('rooms'):
            update_data['rooms'] = compress_room_photos([dict(r) for r in update_data['rooms']])
        if update_data.get('cover_image'):
            update_data['cover_image'] = compress_base64_image(update_data['cover_image'])

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("properties").update(update_data).eq("id", property_id).execute()

    updated_result = supabase.table("properties").select("*").eq("id", property_id).execute()
    return PropertyResponse(**updated_result.data[0])

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    property_result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_doc = property_result.data[0]

    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu gayrimenkulü silme yetkiniz yok")

    supabase.table("properties").delete().eq("id", property_id).execute()
    supabase.table("visitors").delete().eq("property_id", property_id).execute()
    supabase.table("visits").delete().eq("property_id", property_id).execute()

    current_count = current_user.get("property_count", 0)
    if current_count > 0:
        supabase.table("users").update({
            "property_count": current_count - 1
        }).eq("id", current_user["id"]).execute()

    return {"message": "Gayrimenkul başarıyla silindi"}

# ==================== VISITOR ROUTES ====================

@api_router.post("/visitors/register", response_model=VisitorResponse)
async def register_visitor(visitor_data: VisitorCreate):
    """Register visitor before viewing property"""
    property_result = supabase.table("properties").select("*").eq("id", visitor_data.property_id).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_doc = property_result.data[0]

    existing_result = supabase.table("visitors").select("*").eq("property_id", visitor_data.property_id).eq("phone", visitor_data.phone).execute()

    if existing_result.data and len(existing_result.data) > 0:
        existing = existing_result.data[0]
        visit_count = existing.get("visit_count", 0)

        supabase.table("visitors").update({
            "visit_count": visit_count + 1,
            "last_visit": datetime.now(timezone.utc).isoformat()
        }).eq("id", existing["id"]).execute()

        updated_result = supabase.table("visitors").select("*").eq("id", existing["id"]).execute()
        return VisitorResponse(**updated_result.data[0])

    visitor_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    visitor_doc = {
        "id": visitor_id,
        "property_id": visitor_data.property_id,
        "user_id": property_doc["user_id"],
        "first_name": visitor_data.first_name,
        "last_name": visitor_data.last_name,
        "phone": visitor_data.phone,
        "visit_count": 1,
        "total_duration": 0,
        "rooms_visited": [],
        "last_visit": now,
        "created_at": now
    }

    supabase.table("visitors").insert(visitor_doc).execute()

    return VisitorResponse(**visitor_doc)

@api_router.post("/visits")
async def record_visit(visit_data: VisitCreate):
    """Record visit duration and rooms visited"""
    property_result = supabase.table("properties").select("*").eq("id", visit_data.property_id).execute()
    if property_result.data and len(property_result.data) > 0:
        prop = property_result.data[0]
        supabase.table("properties").update({
            "view_count": prop.get("view_count", 0) + 1,
            "total_view_duration": prop.get("total_view_duration", 0) + visit_data.duration
        }).eq("id", visit_data.property_id).execute()

    visitor_result = supabase.table("visitors").select("*").eq("id", visit_data.visitor_id).execute()
    if visitor_result.data and len(visitor_result.data) > 0:
        visitor = visitor_result.data[0]
        existing_rooms = visitor.get("rooms_visited", [])
        new_rooms = list(set(existing_rooms + visit_data.rooms_visited))

        supabase.table("visitors").update({
            "total_duration": visitor.get("total_duration", 0) + visit_data.duration,
            "rooms_visited": new_rooms,
            "last_visit": datetime.now(timezone.utc).isoformat()
        }).eq("id", visit_data.visitor_id).execute()

    visit_id = str(uuid.uuid4())
    visit_doc = {
        "id": visit_id,
        "property_id": visit_data.property_id,
        "visitor_id": visit_data.visitor_id,
        "duration": visit_data.duration,
        "rooms_visited": visit_data.rooms_visited,
        "visited_at": datetime.now(timezone.utc).isoformat()
    }
    supabase.table("visits").insert(visit_doc).execute()

    return {"message": "Ziyaret kaydedildi"}

@api_router.get("/properties/{property_id}/visitors", response_model=List[VisitorResponse])
async def get_property_visitors(property_id: str, current_user: dict = Depends(get_current_user)):
    property_result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_doc = property_result.data[0]

    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok")

    visitors_result = supabase.table("visitors").select("*").eq("property_id", property_id).order("last_visit", desc=True).limit(100).execute()

    return [VisitorResponse(**v) for v in visitors_result.data]

@api_router.get("/properties/{property_id}/visits")
async def get_property_visits(property_id: str, current_user: dict = Depends(get_current_user)):
    """Get visits for a specific property"""
    property_result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_doc = property_result.data[0]

    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok")

    visits_result = supabase.table("visits").select("*").eq("property_id", property_id).order("visited_at", desc=True).limit(100).execute()

    result = []
    for visit in visits_result.data:
        visitor_result = supabase.table("visitors").select("*").eq("id", visit.get("visitor_id")).execute()
        visitor = visitor_result.data[0] if visitor_result.data else None
        result.append({
            **visit,
            "visitor_name": f"{visitor.get('first_name', '')} {visitor.get('last_name', '')}" if visitor else "Bilinmeyen",
            "visitor_phone": visitor.get("phone", "") if visitor else ""
        })

    return result

@api_router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    properties_result = supabase.table("properties").select("*").eq("user_id", current_user["id"]).execute()
    properties = properties_result.data

    property_ids = [p["id"] for p in properties]

    total_views = sum(p.get("view_count", 0) for p in properties)
    total_duration = sum(p.get("total_view_duration", 0) for p in properties)
    avg_duration = total_duration / total_views if total_views > 0 else 0

    visitors_result = supabase.table("visitors").select("*").in_("property_id", property_ids).order("last_visit", desc=True).limit(100).execute()
    visitors = visitors_result.data

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    visits_result = supabase.table("visits").select("*").in_("property_id", property_ids).gte("visited_at", thirty_days_ago).limit(1000).execute()
    visits = visits_result.data

    daily_views = {}
    for visit in visits:
        date = visit["visited_at"][:10]
        daily_views[date] = daily_views.get(date, 0) + 1

    daily_views_list = [{"date": k, "views": v} for k, v in sorted(daily_views.items())]

    top_properties = sorted(properties, key=lambda x: x.get("view_count", 0), reverse=True)[:5]

    return {
        "total_views": total_views,
        "total_duration": total_duration,
        "avg_duration": avg_duration,
        "total_visitors": len(visitors),
        "daily_views": daily_views_list,
        "top_properties": [{
            "id": p["id"],
            "title": p["title"],
            "views": p.get("view_count", 0),
            "avg_duration": p.get("total_view_duration", 0) / max(p.get("view_count", 1), 1)
        } for p in top_properties],
        "recent_visitors": visitors[:10]
    }

# Admin Routes
@admin_router.post("/login")
async def admin_login(data: AdminLogin):
    if data.email != "yadigrb" or data.password != "Yadigar34":
        raise HTTPException(status_code=401, detail="Geçersiz kimlik bilgileri")

    admin_id = "admin-mekan360"
    token = create_token(admin_id, is_admin=True)
    return {"access_token": token, "token_type": "bearer"}

@admin_router.get("/users")
async def admin_get_users(admin: dict = Depends(get_admin_user)):
    users_result = supabase.table("users").select("*").order("created_at", desc=True).limit(500).execute()
    users = users_result.data

    enriched_users = []
    for user in users:
        package_info = PACKAGES.get(user.get("package", "free"), PACKAGES["free"])
        user["package_name"] = package_info["name"]
        user["property_limit"] = package_info["property_limit"]
        user["has_360"] = package_info["has_360"]
        user["property_count"] = user.get("property_count", 0)
        user["auto_payment"] = user.get("auto_payment", False)
        user.pop('password', None)
        enriched_users.append(user)

    return enriched_users

@admin_router.get("/users/{user_id}")
async def admin_get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user_result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user = user_result.data[0]
    user.pop('password', None)

    package_info = PACKAGES.get(user.get("package", "free"), PACKAGES["free"])
    user["package_name"] = package_info["name"]
    user["property_limit"] = package_info["property_limit"]
    user["has_360"] = package_info["has_360"]
    user["property_count"] = user.get("property_count", 0)
    user["auto_payment"] = user.get("auto_payment", False)

    payments_result = supabase.table("payments").select("*").eq("user_id", user_id).order("payment_date", desc=True).limit(50).execute()

    return {**user, "payments": payments_result.data}

@admin_router.put("/users/{user_id}")
async def admin_update_user(user_id: str, data: AdminUserUpdate, admin: dict = Depends(get_admin_user)):
    user_result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user = user_result.data[0]

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if update_data.get("password"):
        update_data["password"] = hash_password(update_data["password"])

    if update_data.get("subscription_days"):
        days = update_data.pop("subscription_days")
        now = datetime.now(timezone.utc)

        current_end_str = user.get("subscription_end")
        if current_end_str:
            try:
                current_expiry = datetime.fromisoformat(current_end_str)
                if current_expiry > now:
                    new_expiry = current_expiry + timedelta(days=days)
                else:
                    new_expiry = now + timedelta(days=days)
            except ValueError:
                new_expiry = now + timedelta(days=days)
        else:
            new_expiry = now + timedelta(days=days)

        update_data["subscription_end"] = new_expiry.isoformat()
        update_data["subscription_status"] = "active"

    elif update_data.get("subscription_status") == "active":
        current_end = user.get("subscription_end")
        is_expired = False
        if current_end:
            try:
                if datetime.fromisoformat(current_end) < datetime.now(timezone.utc):
                    is_expired = True
            except:
                is_expired = True

        if not current_end or is_expired:
            new_expiry = datetime.now(timezone.utc) + timedelta(days=30)
            update_data["subscription_end"] = new_expiry.isoformat()

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("users").update(update_data).eq("id", user_id).execute()

    updated_result = supabase.table("users").select("*").eq("id", user_id).execute()
    updated = updated_result.data[0]
    updated.pop('password', None)
    return updated

@admin_router.get("/payments")
async def admin_get_payments(admin: dict = Depends(get_admin_user)):
    payments_result = supabase.table("payments").select("*").order("payment_date", desc=True).limit(500).execute()
    return payments_result.data

@admin_router.get("/stats")
async def admin_get_stats(admin: dict = Depends(get_admin_user)):
    total_users_result = supabase.table("users").select("id", count="exact").execute()
    total_users = total_users_result.count or 0

    active_users_result = supabase.table("users").select("id", count="exact").eq("subscription_status", "active").execute()
    active_users = active_users_result.count or 0

    total_properties_result = supabase.table("properties").select("id", count="exact").execute()
    total_properties = total_properties_result.count or 0

    total_payments_result = supabase.table("payments").select("id", count="exact").execute()
    total_payments = total_payments_result.count or 0

    payments_result = supabase.table("payments").select("*").eq("status", "completed").limit(1000).execute()
    payments = payments_result.data
    total_revenue = sum(p.get("amount", 0) for p in payments)

    starter_result = supabase.table("users").select("id", count="exact").eq("package", "starter").execute()
    starter_count = starter_result.count or 0

    premium_result = supabase.table("users").select("id", count="exact").eq("package", "premium").execute()
    premium_count = premium_result.count or 0

    ultra_result = supabase.table("users").select("id", count="exact").eq("package", "ultra").execute()
    ultra_count = ultra_result.count or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_properties": total_properties,
        "total_payments": total_payments,
        "total_revenue": total_revenue,
        "package_distribution": {
            "starter": starter_count,
            "premium": premium_count,
            "ultra": ultra_count
        }
    }

@admin_router.post("/users")
async def admin_create_user(data: AdminUserCreate, admin: dict = Depends(get_admin_user)):
    """Admin creates a new user manually"""
    existing_result = supabase.table("users").select("*").eq("email", data.email).execute()
    if existing_result.data and len(existing_result.data) > 0:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    if data.package not in PACKAGES:
        raise HTTPException(status_code=400, detail="Geçersiz paket")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    subscription_end = now + timedelta(days=data.subscription_days)

    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "first_name": data.first_name,
        "last_name": data.last_name,
        "company_name": data.company_name,
        "phone": data.phone,
        "package": data.package,
        "auto_payment": False,
        "subscription_status": data.subscription_status,
        "subscription_end": subscription_end.isoformat() if data.subscription_status == "active" else None,
        "property_count": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    supabase.table("users").insert(user_doc).execute()

    if data.subscription_status == "active":
        package_info = PACKAGES[data.package]
        payment_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": package_info["price"],
            "package": data.package,
            "status": "completed",
            "payment_date": now.isoformat(),
            "next_payment_date": subscription_end.isoformat(),
            "note": "Manuel ekleme (Admin)"
        }
        supabase.table("payments").insert(payment_doc).execute()

    return {"message": "Kullanıcı başarıyla eklendi", "user_id": user_id}

@admin_router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin deletes a user"""
    user_result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    supabase.table("properties").delete().eq("user_id", user_id).execute()
    supabase.table("groups").delete().eq("user_id", user_id).execute()
    supabase.table("visitors").delete().eq("user_id", user_id).execute()
    supabase.table("payments").delete().eq("user_id", user_id).execute()
    supabase.table("users").delete().eq("id", user_id).execute()

    return {"message": "Kullanıcı ve tüm verileri silindi"}

# ==================== GROUP ROUTES ====================

@api_router.post("/groups", response_model=GroupResponse)
async def create_group(group_data: GroupCreate, current_user: dict = Depends(get_current_user)):
    """Create a new property group"""
    group_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    group_doc = {
        "id": group_id,
        "user_id": current_user["id"],
        "company_name": current_user["company_name"],
        "name": group_data.name,
        "description": group_data.description,
        "property_ids": group_data.property_ids,
        "created_at": now,
        "updated_at": now,
        "share_link": f"/group/{group_id}"
    }

    supabase.table("groups").insert(group_doc).execute()
    return GroupResponse(**group_doc)

@api_router.get("/groups", response_model=List[GroupResponse])
async def get_user_groups(current_user: dict = Depends(get_current_user)):
    """Get all groups for current user"""
    groups_result = supabase.table("groups").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).limit(100).execute()

    return [GroupResponse(**g) for g in groups_result.data]

@api_router.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group(group_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific group"""
    group_result = supabase.table("groups").select("*").eq("id", group_id).eq("user_id", current_user["id"]).execute()
    if not group_result.data or len(group_result.data) == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    return GroupResponse(**group_result.data[0])

@api_router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, group_data: GroupUpdate, current_user: dict = Depends(get_current_user)):
    """Update a group"""
    group_result = supabase.table("groups").select("*").eq("id", group_id).eq("user_id", current_user["id"]).execute()
    if not group_result.data or len(group_result.data) == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    update_data = {k: v for k, v in group_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("groups").update(update_data).eq("id", group_id).execute()

    updated_result = supabase.table("groups").select("*").eq("id", group_id).execute()
    return GroupResponse(**updated_result.data[0])

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a group"""
    group_result = supabase.table("groups").select("*").eq("id", group_id).eq("user_id", current_user["id"]).execute()
    if not group_result.data or len(group_result.data) == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    supabase.table("groups").delete().eq("id", group_id).execute()
    return {"message": "Grup başarıyla silindi"}

@api_router.post("/groups/{group_id}/properties/{property_id}")
async def add_property_to_group(group_id: str, property_id: str, current_user: dict = Depends(get_current_user)):
    """Add a property to a group"""
    group_result = supabase.table("groups").select("*").eq("id", group_id).eq("user_id", current_user["id"]).execute()
    if not group_result.data or len(group_result.data) == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    group = group_result.data[0]

    property_result = supabase.table("properties").select("*").eq("id", property_id).eq("user_id", current_user["id"]).execute()
    if not property_result.data or len(property_result.data) == 0:
        raise HTTPException(status_code=404, detail="Gayrimenkul bulunamadı")

    property_ids = group.get("property_ids", [])
    if property_id not in property_ids:
        property_ids.append(property_id)
        supabase.table("groups").update({
            "property_ids": property_ids,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", group_id).execute()

    return {"message": "Gayrimenkul gruba eklendi"}

@api_router.delete("/groups/{group_id}/properties/{property_id}")
async def remove_property_from_group(group_id: str, property_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a property from a group"""
    group_result = supabase.table("groups").select("*").eq("id", group_id).eq("user_id", current_user["id"]).execute()
    if not group_result.data or len(group_result.data) == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    group = group_result.data[0]
    property_ids = group.get("property_ids", [])

    if property_id in property_ids:
        property_ids.remove(property_id)
        supabase.table("groups").update({
            "property_ids": property_ids,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", group_id).execute()

    return {"message": "Gayrimenkul gruptan çıkarıldı"}

@api_router.get("/public/groups/{group_id}")
async def get_public_group(group_id: str):
    """Public endpoint to view a shared group"""
    group_result = supabase.table("groups").select("*").eq("id", group_id).execute()
    if not group_result.data or len(group_result.data) == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    group = group_result.data[0]

    property_ids = group.get("property_ids", [])
    properties_result = supabase.table("properties").select("*").in_("id", property_ids).execute()

    return {
        "group": GroupResponse(**group),
        "properties": [PropertyResponse(**p) for p in properties_result.data]
    }

# ==================== SETUP ADMIN ====================

@api_router.post("/setup-admin")
async def setup_admin():
    """One-time admin setup - remove in production"""
    return {"message": "Admin kullanıcısı fixed credentials ile çalışıyor"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "mekan360 API", "status": "running", "version": "2.0", "database": "Supabase"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "database": "Supabase"}

# Include routers
app.include_router(api_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
