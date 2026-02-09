#!/bin/bash

#============================================
# mekan360 - GitHub Deploy Scripti
# GitHub'dan çekip otomatik deploy yapar
#============================================

set -e

# Yapılandırma
GITHUB_REPO="https://github.com/KULLANICI_ADI/mekan360.git"  # Buraya GitHub repo URL'nizi yazın
APP_DIR="/home/yadigar/mekan360"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
BRANCH="main"  # veya "master"

echo "=========================================="
echo "  mekan360 GitHub Deploy"
echo "=========================================="

# Git kurulu mu kontrol et
if ! command -v git &> /dev/null; then
    echo "⚠️  Git bulunamadı, kuruluyor..."
    apt update && apt install -y git
fi

# İlk kurulum mu yoksa güncelleme mi?
if [ -d "$APP_DIR/.git" ]; then
    echo "[1/5] Güncelleme yapılıyor..."
    cd $APP_DIR

    # Değişiklikleri sakla
    git stash

    # Son değişiklikleri çek
    git pull origin $BRANCH

    # Saklanan değişiklikleri geri al (varsa)
    git stash pop 2>/dev/null || true
else
    echo "[1/5] İlk kurulum yapılıyor..."

    # Dizin varsa yedekle
    if [ -d "$APP_DIR" ]; then
        mv $APP_DIR ${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)
    fi

    # Clone
    git clone -b $BRANCH $GITHUB_REPO $APP_DIR
    cd $APP_DIR
fi

# .env dosyası kontrolü
echo "[2/5] Yapılandırma kontrol ediliyor..."

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  Backend .env dosyası bulunamadı!"

    if [ -f "$BACKEND_DIR/.env.example" ]; then
        echo "📝 .env.example dosyasından oluşturuluyor..."
        cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env
        echo ""
        echo "⚠️  DİKKAT: $BACKEND_DIR/.env dosyasını düzenleyin!"
        echo "   - Supabase bilgilerini ekleyin"
        echo "   - JWT_SECRET ayarlayın"
        echo ""
        read -p "Düzenlemek için Ctrl+C ile durdurun, devam etmek için Enter'a basın..."
    else
        echo "❌ HATA: .env.example dosyası da bulunamadı!"
        exit 1
    fi
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    if [ -f "$FRONTEND_DIR/.env.example" ]; then
        echo "📝 Frontend .env dosyası oluşturuluyor..."
        cp $FRONTEND_DIR/.env.example $FRONTEND_DIR/.env
    fi
fi

# Backend kurulumu
echo "[3/5] Backend kuruluyor..."
cd $BACKEND_DIR

# Virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# Dependencies
pip install --upgrade pip
pip install -r requirements.txt

# PM2 ile backend başlat
pm2 delete mekan360-backend 2>/dev/null || true
pm2 start "venv/bin/uvicorn" --name mekan360-backend --interpreter none -- server:app --host 0.0.0.0 --port 8000

deactivate

# Frontend kurulumu
echo "[4/5] Frontend kuruluyor..."
cd $FRONTEND_DIR

# Node modüllerini kur
npm install

# Build
npm run build

# PM2 ve Nginx
echo "[5/5] Servisler yapılandırılıyor..."

# PM2 kaydet
pm2 save
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami)) 2>/dev/null || true

# Nginx yapılandırması varsa reload
if [ -f "/etc/nginx/sites-available/mekan360" ]; then
    echo "📡 Nginx yeniden yükleniyor..."
    nginx -t && systemctl reload nginx
fi

# Durum
sleep 2
echo ""
echo "=========================================="
echo "  ✅ DEPLOY TAMAMLANDI!"
echo "=========================================="
echo ""
echo "📊 Durum:"
pm2 status
echo ""
echo "🌐 URL'ler:"
echo "   Frontend: http://38.19.198.52"
echo "   API:      http://38.19.198.52/api"
echo ""
echo "📝 Komutlar:"
echo "   pm2 status          - Servislerin durumu"
echo "   pm2 logs            - Logları görüntüle"
echo "   pm2 restart all     - Servisleri yeniden başlat"
echo "   cd $APP_DIR && git pull - Kodu güncelle"
echo ""
