#!/usr/bin/env bash
set -euo pipefail

# simple_deploy.sh
# Amaç: Sunucuya WinSCP ile kopyaladığınız backend ve frontend dizinlerini
# tek komutla deploy etmek.
# Kullanım (repo kökünde veya tam yol vererek):
# sudo bash deploy/simple_deploy.sh --app /var/www/mekan360

APP_DIR="/var/www/mekan360"
SERVICE_NAME="mekan360-backend"
WEBROOT="/var/www/html/mekan360"

usage(){
  cat <<EOF
Usage: sudo bash deploy/simple_deploy.sh [--app APP_DIR] [--service SERVICE_NAME]
Defaults:
  APP_DIR=${APP_DIR}
  SERVICE_NAME=${SERVICE_NAME}

This script assumes you copied your backend/ and frontend/ folders into APP_DIR via SFTP/WinSCP.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) APP_DIR="$2"; shift 2;;
    --service) SERVICE_NAME="$2"; shift 2;;
    --help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

if [ ! -d "$APP_DIR" ]; then
  echo "APP_DIR bulunamadı: $APP_DIR" >&2
  exit 1
fi

echo "[deploy] App dir: $APP_DIR"

# 1) Backend: venv oluşturup requirements yükle
if [ -f "$APP_DIR/backend/requirements.txt" ]; then
  echo "[deploy] Backend: venv kur ve pip install"
  cd "$APP_DIR/backend"
  python3 -m venv .venv || true
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  deactivate || true
else
  echo "[deploy] Warning: backend/requirements.txt bulunamadı, atlanıyor"
fi

# 2) Frontend: build
if [ -d "$APP_DIR/frontend" ]; then
  echo "[deploy] Frontend: build başlıyor"
  cd "$APP_DIR/frontend"
  if command -v yarn >/dev/null 2>&1; then
    yarn install --frozen-lockfile || yarn install
    yarn build
  else
    npm install
    npm run build --if-present
  fi
  if [ -d "build" ]; then
    echo "[deploy] Frontend build kopyalanıyor -> $WEBROOT"
    sudo mkdir -p "$WEBROOT"
    sudo rm -rf "$WEBROOT"/* || true
    sudo cp -r build/* "$WEBROOT/"
  else
    echo "[deploy] Warning: frontend/build bulunamadı"
  fi
else
  echo "[deploy] Warning: frontend dizini yok, atlanıyor"
fi

# 3) Servisi yeniden başlat
echo "[deploy] Servis yeniden başlatılıyor: $SERVICE_NAME"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_NAME" || echo "[deploy] systemctl restart başarısız"
else
  echo "[deploy] systemctl yok — servis manuel restart edilmelidir"
fi

echo "[deploy] Tamamlandı. Servis loglarını görmek için: sudo journalctl -u $SERVICE_NAME -n 200 --no-pager"
exit 0
