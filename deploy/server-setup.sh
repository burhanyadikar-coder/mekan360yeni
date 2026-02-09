#!/bin/bash
set -e

echo "=== Mekan360 Sunucu Kurulumu ==="

apt-get update
apt-get install -y curl gnupg software-properties-common

echo "=== MongoDB Kuruluyor ==="
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

echo "=== Node.js Kuruluyor ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Python Kuruluyor ==="
apt-get install -y python3 python3-pip python3-venv

echo "=== Nginx Kuruluyor ==="
apt-get install -y nginx
systemctl enable nginx

echo "=== Uygulama Dizini Olusturuluyor ==="
mkdir -p /var/www/mekan360
mkdir -p /var/www/mekan360/backend
mkdir -p /var/www/mekan360/frontend

echo "=== Kurulum Tamamlandi ==="
echo "Simdi dosyalari /var/www/mekan360 dizinine yukleyin"
