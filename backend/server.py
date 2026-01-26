from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'homeview-pro-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="HomeView Pro API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    company_name: str
    phone: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class POI(BaseModel):
    name: str
    type: str  # school, market, transport, hospital, park, other
    distance: str  # e.g., "500m", "1.2km"

class PropertyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    address: str
    city: str
    district: str
    square_meters: float
    room_count: str  # e.g., "2+1", "3+1"
    floor: int
    total_floors: int
    building_age: int
    heating_type: str
    facing_direction: str  # North, South, East, West, etc.
    price: float
    currency: str = "TRY"
    panorama_image: Optional[str] = None  # Base64 encoded
    regular_images: Optional[List[str]] = []  # Base64 encoded
    pois: Optional[List[POI]] = []

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    square_meters: Optional[float] = None
    room_count: Optional[str] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    building_age: Optional[int] = None
    heating_type: Optional[str] = None
    facing_direction: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    panorama_image: Optional[str] = None
    regular_images: Optional[List[str]] = None
    pois: Optional[List[POI]] = None

class PropertyResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    address: str
    city: str
    district: str
    square_meters: float
    room_count: str
    floor: int
    total_floors: int
    building_age: int
    heating_type: str
    facing_direction: str
    price: float
    currency: str
    panorama_image: Optional[str] = None
    regular_images: List[str] = []
    pois: List[POI] = []
    view_count: int = 0
    total_view_duration: int = 0  # seconds
    created_at: str
    updated_at: str
    share_link: str

class VisitCreate(BaseModel):
    property_id: str
    duration: int  # seconds
    visitor_ip: Optional[str] = None
    user_agent: Optional[str] = None

class VisitResponse(BaseModel):
    id: str
    property_id: str
    duration: int
    visitor_ip: Optional[str] = None
    user_agent: Optional[str] = None
    visited_at: str

class AnalyticsResponse(BaseModel):
    total_views: int
    total_duration: int
    avg_duration: float
    daily_views: List[dict]
    top_properties: List[dict]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
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
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "company_name": user_data.company_name,
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            company_name=user_data.company_name,
            phone=user_data.phone,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    
    token = create_token(user["id"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            company_name=user["company_name"],
            phone=user.get("phone"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== PROPERTY ROUTES ====================

@api_router.post("/properties", response_model=PropertyResponse)
async def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    property_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    property_doc = {
        "id": property_id,
        "user_id": current_user["id"],
        **property_data.model_dump(),
        "view_count": 0,
        "total_view_duration": 0,
        "created_at": now,
        "updated_at": now,
        "share_link": f"/property/{property_id}"
    }
    
    await db.properties.insert_one(property_doc)
    
    return PropertyResponse(**{k: v for k, v in property_doc.items() if k != "_id"})

@api_router.get("/properties", response_model=List[PropertyResponse])
async def get_user_properties(current_user: dict = Depends(get_current_user)):
    properties = await db.properties.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [PropertyResponse(**p) for p in properties]

@api_router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Daire bulunamadı")
    return PropertyResponse(**property_doc)

@api_router.put("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: dict = Depends(get_current_user)
):
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Daire bulunamadı")
    
    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu daireyi düzenleme yetkiniz yok")
    
    update_data = {k: v for k, v in property_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return PropertyResponse(**updated)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Daire bulunamadı")
    
    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu daireyi silme yetkiniz yok")
    
    await db.properties.delete_one({"id": property_id})
    await db.visits.delete_many({"property_id": property_id})
    
    return {"message": "Daire başarıyla silindi"}

# ==================== VISIT TRACKING ROUTES ====================

@api_router.post("/visits", response_model=VisitResponse)
async def record_visit(visit_data: VisitCreate):
    # Update property view stats
    await db.properties.update_one(
        {"id": visit_data.property_id},
        {
            "$inc": {
                "view_count": 1,
                "total_view_duration": visit_data.duration
            }
        }
    )
    
    visit_id = str(uuid.uuid4())
    visit_doc = {
        "id": visit_id,
        "property_id": visit_data.property_id,
        "duration": visit_data.duration,
        "visitor_ip": visit_data.visitor_ip,
        "user_agent": visit_data.user_agent,
        "visited_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.visits.insert_one(visit_doc)
    
    return VisitResponse(**{k: v for k, v in visit_doc.items() if k != "_id"})

@api_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    # Get user's properties
    user_properties = await db.properties.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    property_ids = [p["id"] for p in user_properties]
    
    # Calculate totals
    total_views = sum(p.get("view_count", 0) for p in user_properties)
    total_duration = sum(p.get("total_view_duration", 0) for p in user_properties)
    avg_duration = total_duration / total_views if total_views > 0 else 0
    
    # Get daily views (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    visits = await db.visits.find({
        "property_id": {"$in": property_ids},
        "visited_at": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(1000)
    
    daily_views = {}
    for visit in visits:
        date = visit["visited_at"][:10]
        daily_views[date] = daily_views.get(date, 0) + 1
    
    daily_views_list = [{"date": k, "views": v} for k, v in sorted(daily_views.items())]
    
    # Top properties
    top_properties = sorted(user_properties, key=lambda x: x.get("view_count", 0), reverse=True)[:5]
    top_properties_list = [
        {"id": p["id"], "title": p["title"], "views": p.get("view_count", 0), "avg_duration": p.get("total_view_duration", 0) / max(p.get("view_count", 1), 1)}
        for p in top_properties
    ]
    
    return AnalyticsResponse(
        total_views=total_views,
        total_duration=total_duration,
        avg_duration=avg_duration,
        daily_views=daily_views_list,
        top_properties=top_properties_list
    )

@api_router.get("/properties/{property_id}/visits", response_model=List[VisitResponse])
async def get_property_visits(property_id: str, current_user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Daire bulunamadı")
    
    if property_doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu dairenin ziyaret bilgilerine erişim yetkiniz yok")
    
    visits = await db.visits.find({"property_id": property_id}, {"_id": 0}).sort("visited_at", -1).to_list(100)
    return [VisitResponse(**v) for v in visits]

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "HomeView Pro API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
