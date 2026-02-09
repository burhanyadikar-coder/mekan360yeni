# 🚀 GitHub Deploy Talimatları

## Ön Hazırlık

### 1. GitHub Repository Oluşturun
```bash
# Local'de (bilgisayarınızda)
cd /tmp/cc-agent/63517426/project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/mekan360.git
git push -u origin main
```

### 2. Sunucuya İlk Bağlantı
```bash
ssh root@vm676
# veya
ssh root@38.19.198.52
```

### 3. Sunucu Gereksinimleri Kurulumu (Sadece İlk Seferde)
```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Python ve pip
apt install -y python3 python3-pip python3-venv

# PM2 (Process Manager)
npm install -g pm2

# Nginx (Web Server)
apt install -y nginx

# Git
apt install -y git
```

## 🎯 Deploy Adımları

### Otomatik Deploy (Önerilen)

```bash
# 1. GitHub'dan deploy scriptini çekin
cd /tmp
wget https://raw.githubusercontent.com/KULLANICI_ADI/mekan360/main/deploy/github-deploy.sh
chmod +x github-deploy.sh

# 2. Script'i düzenleyin (GitHub URL'nizi girin)
nano github-deploy.sh
# veya
vim github-deploy.sh

# GITHUB_REPO satırını düzenleyin:
# GITHUB_REPO="https://github.com/KULLANICI_ADI/mekan360.git"

# 3. Deploy'u çalıştırın
./github-deploy.sh
```

### Manuel Adımlar

```bash
# 1. GitHub'dan klonlayın
cd /home/yadigar
git clone https://github.com/KULLANICI_ADI/mekan360.git
cd mekan360

# 2. .env dosyalarını oluşturun
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. .env dosyalarını düzenleyin
nano backend/.env

# Şunları ayarlayın:
# - SUPABASE_URL
# - SUPABASE_KEY
# - JWT_SECRET
# - DATABASE_URL

# 4. Deploy scriptini çalıştırın
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## 🌐 Nginx Yapılandırması

```bash
# 1. Nginx config oluşturun
nano /etc/nginx/sites-available/mekan360
```

Aşağıdaki içeriği yapıştırın:

```nginx
server {
    listen 80;
    server_name 38.19.198.52 mekan360.com.tr www.mekan360.com.tr;

    # Frontend
    location / {
        root /home/yadigar/mekan360/frontend/build;
        index index.html;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Güvenlik başlıkları
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip sıkıştırma
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

```bash
# 2. Aktive edin
ln -s /etc/nginx/sites-available/mekan360 /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Varsayılan siteyi kaldırın

# 3. Test ve başlat
nginx -t
systemctl restart nginx
systemctl enable nginx
```

## 🔄 Güncelleme (Sonraki Deploylar)

```bash
# Sunucuda
cd /home/yadigar/mekan360

# 1. Son kodları çekin
git pull origin main

# 2. Deploy scriptini çalıştırın
./deploy/deploy.sh
```

Veya otomatik script ile:

```bash
/tmp/github-deploy.sh
```

## ✅ Kontrol ve Test

```bash
# Servis durumu
pm2 status

# Logları görüntüle
pm2 logs mekan360-backend
pm2 logs mekan360-backend --lines 100

# API testi
curl http://localhost:8000/api/health
curl http://38.19.198.52/api/health

# Nginx durumu
systemctl status nginx
nginx -t

# Frontend testi
curl -I http://38.19.198.52
```

## 🔧 Sorun Giderme

### Backend çalışmıyor
```bash
cd /home/yadigar/mekan360/backend
source venv/bin/activate
python -c "import server"  # Import hatalarını kontrol et
pm2 restart mekan360-backend
pm2 logs mekan360-backend --lines 50
```

### Frontend build hatası
```bash
cd /home/yadigar/mekan360/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port zaten kullanımda
```bash
# 8000 portunu kontrol et
lsof -i :8000
# veya
netstat -tulpn | grep 8000

# Gerekirse öldür
kill -9 PID
```

### Nginx hata veriyor
```bash
# Hata loglarını kontrol et
tail -f /var/log/nginx/error.log

# Config testi
nginx -t

# Yeniden başlat
systemctl restart nginx
```

## 🔐 SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kur
apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
certbot --nginx -d mekan360.com.tr -d www.mekan360.com.tr

# Otomatik yenileme testi
certbot renew --dry-run
```

## 📊 İzleme ve Bakım

```bash
# PM2 monitör
pm2 monit

# Sistem kaynakları
htop

# Disk kullanımı
df -h

# Log rotasyonu için PM2 modülü
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🔄 Otomatik Deploy (GitHub Actions)

`.github/workflows/deploy.yml` dosyası ile otomatik deploy:

```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: 38.19.198.52
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/yadigar/mekan360
            git pull origin main
            ./deploy/deploy.sh
```

## 📞 Hızlı Komutlar

```bash
# Yeniden başlat
pm2 restart all

# Logları izle
pm2 logs --lines 100

# Servis durdur
pm2 stop all

# PM2'yi sistem başlangıcına ekle
pm2 startup
pm2 save

# Güncelleme + Deploy
cd /home/yadigar/mekan360 && git pull && ./deploy/deploy.sh
```
