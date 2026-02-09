#!/bin/bash

#============================================
# GitHub'a Push Scripti
# Projeyi GitHub'a yüklemek için
#============================================

echo "=========================================="
echo "  GitHub'a Push"
echo "=========================================="
echo ""

# Git kurulu mu?
if ! command -v git &> /dev/null; then
    echo "❌ Git bulunamadı! Lütfen git kurun:"
    echo "   apt install git"
    exit 1
fi

# Zaten git repo'su mu?
if [ ! -d ".git" ]; then
    echo "📝 Git repository başlatılıyor..."
    git init
    git branch -M main

    echo ""
    echo "🔗 GitHub repository URL'nizi girin:"
    echo "   Örnek: https://github.com/kullaniciadi/mekan360.git"
    read -p "URL: " GITHUB_URL

    if [ -z "$GITHUB_URL" ]; then
        echo "❌ URL boş olamaz!"
        exit 1
    fi

    git remote add origin $GITHUB_URL
    echo "✅ Remote origin eklendi: $GITHUB_URL"
fi

# .gitignore kontrolü
if [ ! -f ".gitignore" ]; then
    echo "📝 .gitignore oluşturuluyor..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
__pycache__/

# Environment
.env
.env.local

# Build
build/
dist/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test
coverage/
.pytest_cache/
EOF
fi

# Commit mesajı
echo ""
read -p "📝 Commit mesajı (boş bırakılırsa 'Update'): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Update"}

# Git işlemleri
echo ""
echo "🔄 Değişiklikler ekleniyor..."
git add .

echo "💾 Commit yapılıyor..."
git commit -m "$COMMIT_MSG" || echo "ℹ️  Yeni değişiklik yok"

echo "📤 GitHub'a gönderiliyor..."
git push -u origin main || git push origin main

echo ""
echo "=========================================="
echo "  ✅ GitHub'a başarıyla gönderildi!"
echo "=========================================="
echo ""
echo "📋 Sonraki adımlar:"
echo "   1. Sunucunuza bağlanın: ssh root@vm676"
echo "   2. Deploy scriptini çalıştırın: ./github-deploy.sh"
echo ""
