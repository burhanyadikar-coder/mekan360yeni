# 🚀 Mekan360 Deploy Kılavuzu

## Tek Komutla Deploy

### Ön Gereksinimler

1. SSH erişimi (root@vm676)
2. rsync yüklü olmalı (Linux/Mac'te varsayılan olarak var)
3. Windows'ta Git Bash veya WSL kullanın

### Deploy Komutu

Proje dizininde şu komutu çalıştırın:

```bash
./deploy/full-deploy.sh
```

Bu script otomatik olarak:
- ✅ Sunucuda gerekli dizinleri oluşturur
- ✅ Backend dosyalarını aktarır
- ✅ Frontend dosyalarını aktarır
- ✅ .env dosyalarını yükler
- ✅ Bağımlılıkları kurar
- ✅ Backend'i PM2 ile başlatır
- ✅ Frontend'i build eder
- ✅ Tüm servisleri başlatır

## Manuel Deploy (Alternatif)

Eğer otomatik script çalışmazsa:

### 1. Dosyaları WinSCP ile Yükle

```
Kaynak: C:\projeler\mekan360\backend\
Hedef: /home/yadigar/mekan360/backend/

Kaynak: C:\projeler\mekan360\frontend\
Hedef: /home/yadigar/mekan360/frontend/

Kaynak: C:\projeler\mekan360\deploy\
Hedef: /home/yadigar/mekan360/deploy/
```

### 2. SSH ile Bağlan ve Deploy Et

```bash
ssh root@vm676
cd /home/yadigar/mekan360
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## Kontrol Komutları

```bash
# Servis durumu
ssh root@vm676 'pm2 status'

# Logları görüntüle
ssh root@vm676 'pm2 logs mekan360-backend'

# API testi
curl http://38.19.198.52/api/health

# Yeniden başlat
ssh root@vm676 'pm2 restart all'
```

## Sorun Giderme

### SSH Key Hatası

```bash
# SSH key oluştur
ssh-keygen -t rsa -b 4096

# Sunucuya kopyala
ssh-copy-id root@vm676
```

### rsync Bulunamadı (Windows)

Git Bash veya WSL kullanın:
```bash
# Git Bash
bash ./deploy/full-deploy.sh

# WSL
wsl ./deploy/full-deploy.sh
```

### .env Dosyası Eksik

Backend ve frontend .env dosyaları otomatik oluşturuldu.
Gerekirse düzenleyin:
- `backend/.env` - Backend yapılandırması
- `frontend/.env` - Frontend yapılandırması

## Önemli Notlar

- İlk deploy 5-10 dakika sürebilir
- Frontend build işlemi biraz zaman alır
- PM2 otomatik olarak servisleri yeniden başlatır
- SSL sertifikası için ayrıca nginx yapılandırması gerekir
