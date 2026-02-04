import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Sun,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Info,
  Navigation,
  Compass
} from 'lucide-react';

// Oda tipleri Türkçe karşılıkları
const ROOM_NAMES = {
  living_room: 'Salon',
  bedroom: 'Yatak Odası',
  kitchen: 'Mutfak',
  bathroom: 'Banyo',
  balcony: 'Balkon',
  hallway: 'Koridor',
  entrance: 'Giriş',
  entry: 'Giriş',
  storage: 'Depo',
  other: 'Diğer'
};

// Yön dereceleri (pusula - 0 = Kuzey)
const DIRECTION_DEGREES = {
  'Kuzey': 0,
  'Kuzeydoğu': 45,
  'Doğu': 90,
  'Güneydoğu': 135,
  'Güney': 180,
  'Güneybatı': 225,
  'Batı': 270,
  'Kuzeybatı': 315
};

// Türkiye enlemi için güneş azimut hesabı (~40°)
const getSunPosition = (hour, minute = 0) => {
  const time = hour + minute / 60;
  
  // Gün doğumu: ~06:00, Öğle: ~12:00, Gün batımı: ~18:00
  // Azimut: Doğu (90°) -> Güney (180°) -> Batı (270°)
  
  if (time < 6 || time > 20) {
    return { azimuth: 0, elevation: -10, visible: false };
  }
  
  // Azimut hesabı (yatay açı)
  const azimuth = 90 + ((time - 6) / 12) * 180;
  
  // Elevasyon hesabı (dikey açı) - öğlen en yüksek
  const hourFromNoon = Math.abs(time - 12);
  const elevation = 60 - (hourFromNoon * 8); // Max 60° öğlen
  
  return { azimuth, elevation, visible: true };
};

// Güneş yüzeye vuruyor mu hesabı
const calculateSunIntensity = (sunAzimuth, facingDirection) => {
  if (!facingDirection || !DIRECTION_DEGREES[facingDirection]) return 0.5;
  
  const facingDegrees = DIRECTION_DEGREES[facingDirection];
  let angleDiff = Math.abs(sunAzimuth - facingDegrees);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  
  if (angleDiff <= 90) {
    return 1 - (angleDiff / 90) * 0.7;
  }
  return 0.2;
};

// Saat formatı
const formatTime = (hour) => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

export default function VirtualTourViewer({ 
  property, 
  currentRoomIndex, 
  onRoomChange,
  onClose 
}) {
  const [sunTime, setSunTime] = useState([12]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(true);
  const [viewerYaw, setViewerYaw] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  
  const pannellumRef = useRef(null);
  const viewerRef = useRef(null);
  const containerRef = useRef(null);

  const currentRoom = property?.rooms?.[currentRoomIndex];
  const agent = property?.agent;

  // Pannellum viewer başlat
  useEffect(() => {
    if (!currentRoom?.panorama_photo || !pannellumRef.current || !window.pannellum) return;

    // Mevcut viewer'ı temizle
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    // Bağlı odalar için hotspot'lar oluştur
    const hotspots = [];
    
    // Önce custom hotspot'ları kontrol et (emlakçının belirlediği pozisyonlar)
    if (currentRoom.hotspots && currentRoom.hotspots.length > 0) {
      currentRoom.hotspots.forEach((hotspot) => {
        const connectedRoom = property.rooms.find(r => r.id === hotspot.target_room_id);
        if (connectedRoom) {
          hotspots.push({
            pitch: hotspot.pitch || -15,
            yaw: hotspot.yaw || 0,
            type: 'scene',
            text: hotspot.label || `${connectedRoom.name || ROOM_NAMES[connectedRoom.room_type] || 'Oda'}'ya Git`,
            cssClass: 'custom-hotspot',
            clickHandlerFunc: () => {
              const roomIndex = property.rooms.findIndex(r => r.id === hotspot.target_room_id);
              if (roomIndex >= 0) {
                onRoomChange(roomIndex);
              }
            }
          });
        }
      });
    } 
    // Eğer custom hotspot yoksa, connections'dan otomatik oluştur
    else if (currentRoom.connections && currentRoom.connections.length > 0) {
      currentRoom.connections.forEach((connectedRoomId, index) => {
        const connectedRoom = property.rooms.find(r => r.id === connectedRoomId);
        if (connectedRoom) {
          // Hotspot pozisyonunu hesapla (daire şeklinde dağıt)
          const angle = (index / currentRoom.connections.length) * 360;
          const yaw = angle - 180;
          
          hotspots.push({
            pitch: -15,
            yaw: yaw,
            type: 'scene',
            text: `${connectedRoom.name || ROOM_NAMES[connectedRoom.room_type] || 'Oda'}'ya Git`,
            cssClass: 'custom-hotspot',
            clickHandlerFunc: () => {
              const roomIndex = property.rooms.findIndex(r => r.id === connectedRoomId);
              if (roomIndex >= 0) {
                onRoomChange(roomIndex);
              }
            }
          });
        }
      });
    }

    // Yeni viewer oluştur
    viewerRef.current = window.pannellum.viewer(pannellumRef.current, {
      type: 'equirectangular',
      panorama: currentRoom.panorama_photo,
      autoLoad: true,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      mouseZoom: true,
      compass: false,
      hfov: 100,
      minHfov: 50,
      maxHfov: 120,
      pitch: 0,
      yaw: 0,
      hotSpots: hotspots,
      autoRotate: 0
    });

    // Viewer yaw değişikliğini izle
    viewerRef.current.on('mouseup', () => {
      if (viewerRef.current) {
        setViewerYaw(viewerRef.current.getYaw());
      }
    });

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [currentRoom, property, onRoomChange]);

  // Güneş filtresi hesapla
  const getSunFilter = useCallback(() => {
    const hour = sunTime[0];
    const { azimuth, elevation, visible } = getSunPosition(hour);
    const facingDirection = currentRoom?.facing_direction || property?.facing_direction || 'Güney';
    const intensity = calculateSunIntensity(azimuth, facingDirection);
    
    let brightness = 0.7 + intensity * 0.4;
    let warmth = 0;
    let saturation = 1;
    
    if (hour < 8) {
      warmth = 0.15;
      brightness *= 0.9;
    } else if (hour > 17) {
      warmth = 0.2;
      saturation = 1.1;
      brightness *= 0.85;
    } else if (hour >= 11 && hour <= 14) {
      brightness *= 1.05;
    }
    
    return {
      filter: `brightness(${brightness}) sepia(${warmth}) saturate(${saturation})`,
      sunPosition: { azimuth, elevation, visible }
    };
  }, [sunTime, currentRoom, property]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Kat planındaki odaları render et
  const renderFloorPlan = () => {
    const rooms = property?.rooms || [];
    if (rooms.length === 0) return null;

    // Grid boyutlarını hesapla
    const minX = Math.min(...rooms.map(r => r.position_x)) - 1;
    const maxX = Math.max(...rooms.map(r => r.position_x)) + 1;
    const minY = Math.min(...rooms.map(r => r.position_y)) - 1;
    const maxY = Math.max(...rooms.map(r => r.position_y)) + 1;
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    // Normalize edilmiş pozisyonlar
    const normalizedRooms = rooms.map((room, idx) => ({
      ...room,
      nx: room.position_x - minX,
      ny: room.position_y - minY,
      index: idx
    }));

    return (
      <div 
        className="relative bg-slate-900/80 rounded-lg p-3"
        style={{ 
          width: `${Math.max(width * 50, 180)}px`,
          height: `${Math.max(height * 45, 120)}px`
        }}
      >
        {/* Başlık */}
        <div className="absolute -top-3 left-3 bg-slate-800 px-2 py-0.5 rounded text-xs text-white font-semibold">
          KAT PLANI
        </div>
        
        {/* Odalar */}
        {normalizedRooms.map((room) => {
          const isActive = room.index === currentRoomIndex;
          const isEntry = room.id === property.entry_room_id;
          
          // Güneş alıyor mu kontrol et
          const { azimuth } = getSunPosition(sunTime[0]);
          const roomDirection = room.facing_direction || property?.facing_direction;
          const sunIntensity = calculateSunIntensity(azimuth, roomDirection);
          const isLit = sunIntensity > 0.5;
          
          return (
            <button
              key={room.id}
              onClick={() => onRoomChange(room.index)}
              className={`absolute flex items-center justify-center text-xs font-medium 
                rounded transition-all duration-200 border-2
                ${isActive 
                  ? 'bg-blue-500 border-blue-400 text-white scale-110 z-10' 
                  : isEntry
                    ? 'bg-amber-500/80 border-amber-400 text-white'
                    : 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-600'
                }
                ${isLit ? 'ring-1 ring-yellow-400/50' : ''}
              `}
              style={{
                left: `${(room.nx / width) * 100}%`,
                top: `${(room.ny / height) * 100}%`,
                width: '48px',
                height: '36px',
                transform: 'translate(-50%, -50%)'
              }}
              title={room.name || ROOM_NAMES[room.room_type]}
            >
              <span className="truncate px-1">
                {(room.name || ROOM_NAMES[room.room_type] || 'Oda').slice(0, 6)}
              </span>
              {isLit && <Sun className="w-2.5 h-2.5 text-yellow-300 ml-0.5" />}
            </button>
          );
        })}
        
        {/* Görüş açısı göstergesi */}
        {currentRoom && (
          <div 
            className="absolute w-0 h-0 z-20 transition-transform duration-300"
            style={{
              left: `${((normalizedRooms.find(r => r.index === currentRoomIndex)?.nx || 0) / width) * 100}%`,
              top: `${((normalizedRooms.find(r => r.index === currentRoomIndex)?.ny || 0) / height) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${viewerYaw}deg)`,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderBottom: '20px solid rgba(59, 130, 246, 0.5)'
            }}
          />
        )}
      </div>
    );
  };

  // Güneş ikonunun pozisyonu
  const renderSunIndicator = () => {
    const { azimuth, elevation, visible } = getSunPosition(sunTime[0]);
    if (!visible) return null;
    
    // Azimut'u ekran pozisyonuna çevir (sol: doğu, orta: güney, sağ: batı)
    const normalizedAzimuth = ((azimuth - 90) / 180) * 100;
    const x = Math.max(5, Math.min(95, normalizedAzimuth));
    const y = Math.max(5, Math.min(40, 50 - elevation * 0.5));
    
    return (
      <div 
        className="absolute transition-all duration-500 ease-out pointer-events-none z-20"
        style={{ 
          left: `${x}%`, 
          top: `${y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          {/* Güneş ışınları */}
          <div className="absolute inset-0 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-yellow-300/30 blur-xl" />
          </div>
          {/* Güneş */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg shadow-yellow-400/50" />
        </div>
      </div>
    );
  };

  const { filter: sunFilter } = getSunFilter();

  if (!property || !currentRoom) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <p className="text-white/60">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-slate-900 overflow-hidden"
    >
      {/* 360 Panorama Viewer */}
      <div 
        ref={pannellumRef} 
        className="absolute inset-0 z-0"
        style={{ filter: sunFilter }}
      />
      
      {/* Güneş göstergesi */}
      {renderSunIndicator()}
      
      {/* Üst Orta - Firma Filigranı */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 text-center">
        {agent?.company_logo ? (
          <img 
            src={agent.company_logo} 
            alt={agent.company_name}
            className="h-12 object-contain mx-auto drop-shadow-lg"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white drop-shadow-lg tracking-wide">
              {agent?.company_name?.split(' ').map((word, i) => (
                <span key={i} className={i === 0 ? 'text-white' : 'text-amber-400'}>
                  {word}{' '}
                </span>
              )) || 'MEKAN360'}
            </span>
          </div>
        )}
        <p className="text-white/60 text-xs mt-1 uppercase tracking-widest">
          GAYRİMENKUL
        </p>
      </div>
      
      {/* Sağ Üst - Emlakçı Bilgi Kartı */}
      <div className="absolute top-4 right-4 z-30">
        <div className="bg-white rounded-xl shadow-2xl p-3 min-w-[200px]">
          <div className="flex items-center gap-3">
            {/* Profil Fotoğrafı */}
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0">
              {agent?.profile_photo ? (
                <img 
                  src={agent.profile_photo} 
                  alt={`${agent.first_name} ${agent.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-lg font-bold">
                  {agent?.first_name?.[0]}{agent?.last_name?.[0]}
                </div>
              )}
            </div>
            
            {/* Bilgiler */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">
                {agent?.first_name} {agent?.last_name}
              </h3>
              <p className="text-xs text-blue-600 font-medium truncate">
                {agent?.company_name}
              </p>
              
              {agent?.phone && (
                <a 
                  href={`tel:${agent.phone}`}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 mt-1"
                >
                  <Phone className="w-3 h-3" />
                  {agent.phone}
                </a>
              )}
              
              {agent?.email && (
                <a 
                  href={`mailto:${agent.email}`}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600"
                >
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{agent.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Sol Alt - Kat Planı */}
      {showFloorPlan && (
        <div className="absolute bottom-24 left-4 z-30">
          {renderFloorPlan()}
        </div>
      )}
      
      {/* Alt Orta - Güneş Simülasyonu Slider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-md px-4">
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              GÜNEŞ SİMÜLASYONU
            </span>
            <span className="text-amber-400 font-mono text-lg font-bold">
              {formatTime(sunTime[0])}
            </span>
          </div>
          
          <div className="relative">
            <Slider
              value={sunTime}
              onValueChange={setSunTime}
              min={6}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sağ Alt - Kontroller */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowFloorPlan(!showFloorPlan)}
          className="bg-white/90 hover:bg-white rounded-full w-10 h-10 shadow-lg"
          title="Kat Planı"
        >
          <Navigation className="w-5 h-5 text-slate-700" />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowInfo(!showInfo)}
          className="bg-white/90 hover:bg-white rounded-full w-10 h-10 shadow-lg"
          title="Bilgi"
        >
          <Info className="w-5 h-5 text-slate-700" />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleFullscreen}
          className="bg-blue-500 hover:bg-blue-600 rounded-full w-10 h-10 shadow-lg"
          title="Tam Ekran"
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-white" />
          ) : (
            <Maximize2 className="w-5 h-5 text-white" />
          )}
        </Button>
      </div>
      
      {/* Oda Geçiş Hotspot Stili */}
      <style jsx global>{`
        .custom-hotspot {
          background: rgba(59, 130, 246, 0.9);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(4px);
        }
        .custom-hotspot:hover {
          background: rgba(59, 130, 246, 1);
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.6);
        }
        .pnlm-hotspot-base {
          background: none !important;
        }
        .pnlm-hotspot {
          width: auto !important;
          height: auto !important;
        }
        .pnlm-tooltip {
          display: none !important;
        }
      `}</style>
      
      {/* Bilgi Overlay */}
      {showInfo && (
        <div className="absolute inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{property.title}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-100 rounded-lg p-3">
                <p className="text-xs text-slate-500">Metrekare</p>
                <p className="text-lg font-semibold text-slate-800">{property.square_meters} m²</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <p className="text-xs text-slate-500">Oda Sayısı</p>
                <p className="text-lg font-semibold text-slate-800">{property.room_count}</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <p className="text-xs text-slate-500">Kat</p>
                <p className="text-lg font-semibold text-slate-800">{property.floor}/{property.total_floors}</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <p className="text-xs text-slate-500">Cephe</p>
                <p className="text-lg font-semibold text-slate-800">{property.facing_direction}</p>
              </div>
            </div>
            
            <p className="text-slate-600 text-sm mb-4">{property.description}</p>
            
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('tr-TR').format(property.price)} {property.currency}
              </p>
              <Button onClick={() => setShowInfo(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
