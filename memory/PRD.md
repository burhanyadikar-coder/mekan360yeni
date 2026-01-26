# HomeView Pro - Premium Daire Tanıtım Sistemi

## Problem Statement
Emlakçılar ve inşaat firmaları için premium daire tanıtım sistemi. 360° sanal tur, güneş simülasyonu, yakın çevre bilgileri ve ziyaretçi analitiği özellikleri ile gayrimenkul satışlarını hızlandırmak.

## User Personas
1. **Emlakçı/Gayrimenkul Danışmanı**: Dairelerini profesyonelce tanıtmak isteyen
2. **İnşaat Firması**: Yeni projeleri premium seviyede sergilemek isteyen
3. **Potansiyel Alıcı**: Daire detaylarını online incelemek isteyen

## Core Requirements
- 360° panoramik fotoğraf ile sanal tur
- Güneş simülasyonu (gün içi ışık değişimi)
- Yakın çevre POI bilgileri (okul, market, durak vb.)
- Daire özellikleri (m², oda, kat, cephe, fiyat)
- Ziyaretçi takibi ve raporlama
- JWT kimlik doğrulama

## What's Been Implemented (26 Ocak 2025)

### Backend (FastAPI + MongoDB)
- JWT Authentication (register/login/me)
- Property CRUD operations
- 360° panorama image storage (base64)
- POI management
- Visit tracking with duration
- Analytics endpoints

### Frontend (React + Tailwind + Shadcn/UI)
- Landing Page (premium design)
- Login/Register pages
- Dashboard with stats
- Property form (create/edit)
- Property detail page:
  - Pannellum-react 360° viewer
  - Sun simulation slider (CSS filter)
  - POI cards
  - Property features
- Analytics page with Recharts

## Tech Stack
- Backend: FastAPI, MongoDB, JWT, bcrypt
- Frontend: React, Tailwind CSS, Shadcn/UI, Pannellum-react, Recharts, Framer Motion
- Database: MongoDB

## Prioritized Backlog

### P0 (Kritik - Tamamlandı)
- [x] JWT Authentication
- [x] Property CRUD
- [x] 360° Viewer
- [x] Sun Simulation
- [x] POI Management
- [x] Visit Tracking
- [x] Analytics Dashboard

### P1 (Önemli - Sonraki Fazda)
- [ ] Email verification
- [ ] Password reset
- [ ] Image compression/optimization
- [ ] Property search/filter
- [ ] Multiple 360° scenes per property

### P2 (Nice to Have)
- [ ] Social sharing integrations
- [ ] QR code generation
- [ ] PDF export for property details
- [ ] Multi-language support
- [ ] Dark mode

## Next Tasks
1. Image optimization for 360° uploads
2. Property search and filtering
3. Email notifications
4. Mobile app (React Native)
