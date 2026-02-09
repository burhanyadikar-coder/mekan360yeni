#!/bin/bash

# Mekan360 Başlatma Scripti

echo "🚀 Mekan360 başlatılıyor..."

# Backend başlat
echo "📦 Backend başlatılıyor..."
cd /tmp/cc-agent/63517426/project/backend
/home/appuser/.local/bin/uvicorn server:app --host 0.0.0.0 --port 5000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend başlatıldı (PID: $BACKEND_PID, Port: 5000)"

# Frontend başlat
echo "🎨 Frontend başlatılıyor..."
cd /tmp/cc-agent/63517426/project/frontend
PORT=3000 npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend başlatılıyor (PID: $FRONTEND_PID, Port: 3000)"

echo ""
echo "📊 Servisler:"
echo "   Backend API: http://localhost:5000/docs"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Loglar:"
echo "   Backend: tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "⏸️  Durdurmak için: pkill -f 'uvicorn server:app' && pkill -f 'node.*start'"
