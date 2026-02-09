#!/bin/bash
set -e

SERVER_IP="38.19.198.52"
SERVER_USER="root"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Mekan360 Otomatik Deploy ==="
echo "Proje: $PROJECT_DIR"
echo "Sunucu: $SERVER_USER@$SERVER_IP"
echo ""

echo ">>> Frontend build aliniyor..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build

echo ""
echo ">>> Sunucu baglantisi test ediliyor..."
ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo 'Baglanti basarili!'"

echo ""
echo ">>> Sunucuda dizinler hazirlaniyor..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p /var/www/mekan360/backend /var/www/mekan360/frontend"

echo ""
echo ">>> Frontend dosyalari kopyalaniyor..."
scp -r "$PROJECT_DIR/frontend/build/"* $SERVER_USER@$SERVER_IP:/var/www/mekan360/frontend/

echo ""
echo ">>> Backend dosyalari kopyalaniyor..."
scp "$PROJECT_DIR/backend/server.py" "$PROJECT_DIR/backend/requirements.txt" $SERVER_USER@$SERVER_IP:/var/www/mekan360/backend/

echo ""
echo ">>> Deploy dosyalari kopyalaniyor..."
scp "$PROJECT_DIR/deploy/mekan360-backend.service" $SERVER_USER@$SERVER_IP:/etc/systemd/system/
scp "$PROJECT_DIR/deploy/nginx-mekan360.conf" $SERVER_USER@$SERVER_IP:/etc/nginx/sites-available/mekan360

echo ""
echo ">>> Sunucuda kurulum yapiliyor..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

if ! command -v mongod &> /dev/null; then
    echo "MongoDB kuruluyor..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
fi

if ! command -v python3 &> /dev/null; then
    apt-get update
    apt-get install -y python3 python3-pip python3-venv
fi

cd /var/www/mekan360/backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

systemctl daemon-reload
systemctl enable mekan360-backend
systemctl restart mekan360-backend

ln -sf /etc/nginx/sites-available/mekan360 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "Kurulum tamamlandi!"
ENDSSH

echo ""
echo "=== Deploy Tamamlandi! ==="
echo "Site: http://$SERVER_IP"
echo "Admin: http://$SERVER_IP/mekanadmin"
