# 🏢 mekan360

360° sanal tur oluşturma ve yönetme platformu. Kullanıcılar panoramik görüntüler yükleyip interaktif sanal turlar oluşturabilir ve paylaşabilir.

## 🚀 Hızlı Deploy

### 1️⃣ GitHub'a Yükleyin
```bash
chmod +x deploy/push-to-github.sh
./deploy/push-to-github.sh
```

### 2️⃣ Sunucunuzda Deploy Edin
```bash
# Sunucuya bağlanın
ssh root@vm676

# Deploy scriptini çalıştırın
cd /tmp
wget https://raw.githubusercontent.com/KULLANICI_ADI/mekan360/main/deploy/github-deploy.sh
chmod +x github-deploy.sh
nano github-deploy.sh  # GITHUB_REPO satırını düzenleyin
./github-deploy.sh
```

📖 **Detaylı talimatlar:** [deploy/GITHUB_DEPLOY.md](deploy/GITHUB_DEPLOY.md)

---

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Teknolojiler](#teknolojiler)
- [Lokal Geliştirme](#lokal-geliştirme)
- [Deploy](#deploy)
- [API Dökümantasyonu](#api-dökümantasyonu)

---

## ✨ Özellikler

### 🎯 Temel Özellikler
- ✅ 360° panoramik görüntü yükleme
- ✅ İnteraktif sanal tur oluşturma
- ✅ Hotspot (bağlantı noktaları) ekleme
- ✅ Tur grupları oluşturma
- ✅ Link ile paylaşma
- ✅ Mobil uyumlu PWA

### 👥 Kullanıcı Yönetimi
- ✅ Email/Şifre ile kayıt ve giriş
- ✅ Şifre sıfırlama
- ✅ Kullanıcı profili
- ✅ Kullanıcı bazlı tur yönetimi

### 📊 Yönetim Paneli
- ✅ Tur listesi ve düzenleme
- ✅ Grup yönetimi
- ✅ Görüntüleme istatistikleri
- ✅ Admin paneli

### 💎 Premium Özellikler
- ✅ Fiyatlandırma planları
- ✅ Ödeme entegrasyonu (Stripe hazır)
- ✅ Kullanım kotaları

---

## 🛠 Teknolojiler

### Frontend
- **React 18** - Modern web framework
- **React Router** - Sayfa yönlendirme
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Premium UI components
- **Pannellum** - 360° görüntü gösterimi
- **Axios** - HTTP istekleri

### Backend
- **FastAPI** - Modern Python web framework
- **Supabase** - Database & Authentication
- **PostgreSQL** - Veritabanı
- **JWT** - Token-based auth
- **Uvicorn** - ASGI server

### DevOps
- **PM2** - Process manager
- **Nginx** - Web server & reverse proxy
- **Git** - Version control

---

## 💻 Lokal Geliştirme

### Gereksinimler
- Node.js 18+
- Python 3.9+
- npm veya yarn

### Kurulum

1. **Repository'i klonlayın**
```bash
git clone https://github.com/KULLANICI_ADI/mekan360.git
cd mekan360
```

2. **Backend kurulumu**
```bash
cd backend

# Virtual environment oluştur
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları kur
pip install -r requirements.txt

# .env dosyasını oluştur
cp .env.example .env
nano .env  # Supabase bilgilerini girin

# Sunucuyu başlat
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

3. **Frontend kurulumu**
```bash
cd frontend

# Bağımlılıkları kur
npm install

# .env dosyasını oluştur
cp .env.example .env
nano .env  # Backend URL'sini girin

# Geliştirme sunucusunu başlat
npm start
```

4. **Tarayıcıda açın**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🌐 Deploy

### Otomatik Deploy
```bash
# GitHub'a push edin
./deploy/push-to-github.sh

# Sunucunuzda çalıştırın
ssh root@vm676
./github-deploy.sh
```

### Manuel Deploy
Detaylı talimatlar için: [deploy/GITHUB_DEPLOY.md](deploy/GITHUB_DEPLOY.md)

### Deploy Scriptleri
- `deploy/github-deploy.sh` - GitHub'dan çekip otomatik deploy
- `deploy/deploy.sh` - Lokal deploy
- `deploy/push-to-github.sh` - GitHub'a push
- `deploy/install.sh` - Sunucu ilk kurulum

---

## 📚 API Dökümantasyonu

Backend çalıştıktan sonra şu adreslerde API dökümantasyonuna erişebilirsiniz:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Ana Endpoint'ler

#### Authentication
```bash
POST /api/auth/register      # Kayıt ol
POST /api/auth/login         # Giriş yap
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

#### Properties (Turlar)
```bash
GET    /api/properties       # Tüm turları listele
POST   /api/properties       # Yeni tur oluştur
GET    /api/properties/{id}  # Tur detayı
PUT    /api/properties/{id}  # Tur güncelle
DELETE /api/properties/{id}  # Tur sil
```

#### Groups
```bash
GET    /api/groups           # Grupları listele
POST   /api/groups           # Grup oluştur
GET    /api/groups/{id}      # Grup detayı
PUT    /api/groups/{id}      # Grup güncelle
DELETE /api/groups/{id}      # Grup sil
```

#### Analytics
```bash
GET /api/analytics/views     # Görüntüleme istatistikleri
GET /api/analytics/users     # Kullanıcı istatistikleri
```

---

## 📁 Proje Yapısı

```
mekan360/
├── backend/              # FastAPI backend
│   ├── server.py        # Ana uygulama
│   ├── requirements.txt # Python bağımlılıkları
│   └── .env.example     # Env template
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Sayfa components
│   │   ├── contexts/    # React contexts
│   │   └── hooks/       # Custom hooks
│   ├── public/          # Static files
│   └── package.json
│
├── deploy/              # Deploy scriptleri
│   ├── github-deploy.sh
│   ├── deploy.sh
│   ├── push-to-github.sh
│   └── GITHUB_DEPLOY.md
│
└── supabase/           # Database migrations
    └── migrations/
```

---

## 🔧 Yapılandırma

### Backend (.env)
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_database_url
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🐛 Sorun Giderme

### Backend hataları
```bash
# Logları kontrol et
pm2 logs mekan360-backend

# Manuel başlat
cd backend
source venv/bin/activate
uvicorn server:app --reload
```

### Frontend build hataları
```bash
# Cache temizle
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port çakışması
```bash
# Port kontrolü
lsof -i :8000
lsof -i :3000

# Process'i sonlandır
kill -9 <PID>
```

---

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

## 📄 Lisans

Bu proje özel lisans altındadır.

---

## 📞 İletişim

Sorularınız için: [GitHub Issues](https://github.com/KULLANICI_ADI/mekan360/issues)

---

## 🎉 Teşekkürler

- [Pannellum](https://pannellum.org/) - 360° görüntü görüntüleyici
- [Supabase](https://supabase.com/) - Backend ve database
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
