#!/usr/bin/env bash
set -e
# Simple wrapper to run backend and frontend deploy scripts.
# Update APP_DIR if your deployment path differs.

APP_DIR="/var/www/mekan360"
BACKEND_SCRIPT="$APP_DIR/deploy_backend.sh"
FRONTEND_SCRIPT="$APP_DIR/deploy_frontend.sh"

echo "Running deploy wrapper (APP_DIR=$APP_DIR)"

if [ -f "$BACKEND_SCRIPT" ]; then
  echo "Running backend deploy"
  sudo bash "$BACKEND_SCRIPT"
else
  echo "Backend deploy script not found at $BACKEND_SCRIPT"
fi

if [ -f "$FRONTEND_SCRIPT" ]; then
  echo "Running frontend deploy"
  sudo bash "$FRONTEND_SCRIPT"
else
  echo "Frontend deploy script not found at $FRONTEND_SCRIPT"
fi

echo "Deploy wrapper finished."
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

# Backend kurulumu
echo "[1/4] Backend kuruluyor..."
cd $BACKEND_DIR

# Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Dependencies
pip install --upgrade pip
pip install -r requirements.txt

# PM2 ile backend başlat
pm2 delete mekan360-backend 2>/dev/null || true
pm2 start "source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8001" --name mekan360-backend --cwd $BACKEND_DIR

# Frontend kurulumu
echo "[2/4] Frontend kuruluyor..."
cd $FRONTEND_DIR
yarn install
yarn build

# PM2 kaydet
echo "[3/4] PM2 yapılandırılıyor..."
pm2 save
pm2 startup

# Nginx restart
echo "[4/4] Nginx yeniden başlatılıyor..."
systemctl restart nginx

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
