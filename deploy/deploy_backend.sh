#!/usr/bin/env bash
set -e
# Deploy backend: create venv, install deps, copy .env if missing, restart service

APP_DIR="/var/www/mekan360"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$APP_DIR/venv"
SERVICE_NAME="mekan360-backend"
USER="www-data"

echo "Deploying backend from $BACKEND_DIR"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtualenv at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  pip install -r "$BACKEND_DIR/requirements.txt"
fi

if [ ! -f "$BACKEND_DIR/.env" ] && [ -f "$BACKEND_DIR/.env.example" ]; then
  echo "Creating .env from .env.example (please edit values)"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi

sudo chown -R $USER:$USER "$APP_DIR"

# Ensure systemd service exists
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
  echo "Restarting $SERVICE_NAME"
  sudo systemctl daemon-reload || true
  sudo systemctl enable $SERVICE_NAME
  sudo systemctl restart $SERVICE_NAME
  sudo systemctl status $SERVICE_NAME --no-pager -n 5 || true
else
  echo "Service file /etc/systemd/system/$SERVICE_NAME.service not found. You can run uvicorn manually or install the provided service template."
fi

echo "Backend deploy finished."
