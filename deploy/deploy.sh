#!/bin/bash

#============================================
# mekan360 - Uygulama Deploy Scripti
# Kurulum sonrası çalıştırılacak
#============================================

set -e

APP_DIR="/var/www/mekan360"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "=========================================="
echo "  mekan360 Deploy Başlıyor..."
echo "=========================================="

# MongoDB kontrolü
echo "[0/5] MongoDB kontrolü..."
if ! systemctl is-active --quiet mongod; then
    echo "MongoDB başlatılıyor..."
    systemctl start mongod
fi

# .env dosyası kontrolü
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  HATA: Backend .env dosyası bulunamadı!"
    echo "Lütfen $BACKEND_DIR/.env dosyasını oluşturun."
    exit 1
fi

# Backend kurulumu
echo "[1/5] Backend kuruluyor..."
cd $BACKEND_DIR

# Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Dependencies
pip install --upgrade pip
pip install -r requirements.txt

# PM2 ile backend başlat
pm2 delete mekan360-backend 2>/dev/null || true
pm2 start "venv/bin/uvicorn" --name mekan360-backend --interpreter none -- server:app --host 0.0.0.0 --port 8001

# Frontend kurulumu
echo "[2/5] Frontend kuruluyor..."
cd $FRONTEND_DIR
yarn install
yarn build

# PM2 kaydet
echo "[3/5] PM2 yapılandırılıyor..."
pm2 save
pm2 startup

# Nginx restart
echo "[4/5] Nginx yeniden başlatılıyor..."
systemctl restart nginx

# Durum kontrolü
echo "[5/5] Durum kontrol ediliyor..."
sleep 2
pm2 status
echo ""
echo "MongoDB durumu:"
systemctl status mongod --no-pager | head -3
echo ""
echo "=========================================="
echo "  DEPLOY TAMAMLANDI!"
echo "=========================================="
echo ""
echo "Kontrol komutları:"
echo "  pm2 status          - Servislerin durumu"
echo "  pm2 logs            - Logları görüntüle"
echo "  systemctl status nginx"
echo ""
