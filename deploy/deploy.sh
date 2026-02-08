#!/bin/bash

#============================================
# mekan360 - Uygulama Deploy Scripti
# Kurulum sonrası çalıştırılacak (Supabase)
#============================================

set -e

APP_DIR="/home/yadigar/mekan360"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "=========================================="
echo "  mekan360 Deploy Başlıyor..."
echo "=========================================="

# .env dosyası kontrolü
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  HATA: Backend .env dosyası bulunamadı!"
    echo "Lütfen $BACKEND_DIR/.env dosyasını oluşturun."
    exit 1
fi

# Backend kurulumu
echo "[1/4] Backend kuruluyor..."
cd $BACKEND_DIR

# Python virtual environment
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

# Frontend kurulumu
echo "[2/4] Frontend kuruluyor..."
cd $FRONTEND_DIR
npm install
npm run build

# PM2 kaydet
echo "[3/4] PM2 yapılandırılıyor..."
pm2 save
pm2 startup | grep 'sudo' || true

# Durum kontrolü
echo "[4/4] Durum kontrol ediliyor..."
sleep 2
pm2 status
echo ""
echo "=========================================="
echo "  DEPLOY TAMAMLANDI!"
echo "=========================================="
echo ""
echo "Kontrol komutları:"
echo "  pm2 status          - Servislerin durumu"
echo "  pm2 logs            - Logları görüntüle"
echo "  pm2 restart all     - Servisleri yeniden başlat"
echo ""
