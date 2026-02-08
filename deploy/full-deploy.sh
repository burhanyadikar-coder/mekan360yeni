#!/bin/bash

#============================================
# mekan360 - Tam Otomatik Deploy Scripti
# Tek komutla dosya transferi + deploy
#============================================

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

# Ayarlar
SERVER="vm676"
SERVER_USER="root"
REMOTE_DIR="/home/yadigar/mekan360"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}=========================================="
echo "  mekan360 - Tam Otomatik Deploy"
echo "==========================================${NC}"
echo ""
echo "Sunucu: $SERVER"
echo "Hedef Dizin: $REMOTE_DIR"
echo "Kaynak Dizin: $LOCAL_DIR"
echo ""

# Onay al
read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "İptal edildi."
    exit 1
fi

# 1. Dizin oluştur
echo -e "${YELLOW}[1/5] Sunucuda dizinler oluşturuluyor...${NC}"
ssh $SERVER_USER@$SERVER "mkdir -p $REMOTE_DIR/{backend,frontend,deploy}"

# 2. Backend dosyalarını transfer et
echo -e "${YELLOW}[2/5] Backend dosyaları aktarılıyor...${NC}"
rsync -avz --progress \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    $LOCAL_DIR/backend/ \
    $SERVER_USER@$SERVER:$REMOTE_DIR/backend/

# 3. Frontend dosyalarını transfer et
echo -e "${YELLOW}[3/5] Frontend dosyaları aktarılıyor...${NC}"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'build' \
    --exclude '.env' \
    $LOCAL_DIR/frontend/ \
    $SERVER_USER@$SERVER:$REMOTE_DIR/frontend/

# 4. Deploy scriptlerini transfer et
echo -e "${YELLOW}[4/5] Deploy scriptleri aktarılıyor...${NC}"
rsync -avz --progress \
    $LOCAL_DIR/deploy/ \
    $SERVER_USER@$SERVER:$REMOTE_DIR/deploy/

# 5. .env dosyalarını kontrol et ve yükle (varsa)
echo -e "${YELLOW}[5/5] .env dosyaları kontrol ediliyor...${NC}"
if [ -f "$LOCAL_DIR/backend/.env" ]; then
    echo "Backend .env aktarılıyor..."
    scp $LOCAL_DIR/backend/.env $SERVER_USER@$SERVER:$REMOTE_DIR/backend/.env
else
    echo -e "${RED}⚠️  UYARI: backend/.env dosyası bulunamadı!${NC}"
    echo "Sunucuda manuel olarak oluşturmanız gerekecek."
fi

if [ -f "$LOCAL_DIR/frontend/.env" ]; then
    echo "Frontend .env aktarılıyor..."
    scp $LOCAL_DIR/frontend/.env $SERVER_USER@$SERVER:$REMOTE_DIR/frontend/.env
else
    echo -e "${YELLOW}ℹ️  Frontend .env dosyası bulunamadı (opsiyonel).${NC}"
fi

echo ""
echo -e "${GREEN}✓ Dosya transferi tamamlandı!${NC}"
echo ""
echo -e "${BLUE}Şimdi sunucuda deploy başlatılıyor...${NC}"
echo ""

# Deploy scriptini çalıştır
ssh $SERVER_USER@$SERVER << 'ENDSSH'
cd /home/yadigar/mekan360
chmod +x deploy/deploy.sh

echo "=========================================="
echo "  Deploy Başlıyor..."
echo "=========================================="

./deploy/deploy.sh

echo ""
echo "=========================================="
echo "  TÜM İŞLEMLER TAMAMLANDI!"
echo "=========================================="
echo ""
echo "Uygulama Adresleri:"
echo "  http://38.19.198.52"
echo "  http://mekan360.com.tr (DNS ayarlandıysa)"
echo ""
echo "API Test:"
echo "  curl http://38.19.198.52/api/health"
echo ""
ENDSSH

echo ""
echo -e "${GREEN}=========================================="
echo "  DEPLOY BAŞARIYLA TAMAMLANDI!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Kontrol Komutları:${NC}"
echo "  ssh $SERVER_USER@$SERVER 'pm2 status'"
echo "  ssh $SERVER_USER@$SERVER 'pm2 logs mekan360-backend'"
echo ""
