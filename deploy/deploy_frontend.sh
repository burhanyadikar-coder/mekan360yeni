#!/usr/bin/env bash
set -e
# Deploy frontend: build with npm and copy to nginx root

APP_DIR="/var/www/mekan360"
FRONTEND_DIR="$APP_DIR/frontend"
NGINX_ROOT="/var/www/html/mekan360"
USER="www-data"

echo "Deploying frontend from $FRONTEND_DIR"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

sudo rm -rf "$NGINX_ROOT"
sudo mkdir -p "$NGINX_ROOT"
sudo cp -r build/* "$NGINX_ROOT/"
sudo chown -R $USER:$USER "$NGINX_ROOT"

sudo nginx -t && sudo systemctl reload nginx

echo "Frontend deploy finished."
