import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import {
  Building2,
  MapPin,
  Ruler,
  Layers,
  Compass,
  Flame,
  Calendar,
  Share2,
  Sun,
  Home,
  Phone,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Map,
  DoorOpen,
  Maximize2,
  Info,
  Grid3X3
} from 'lucide-react';
import { Pannellum } from 'pannellum-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

const ROOM_ICONS = {
  living_room: '🛋️',
  bedroom: '🛏️',
  kitchen: '🍳',
  bathroom: '🚿',
  balcony: '🌅',
  hallway: '🚪',
  entrance: '🚪',
  entry: '🚪',
  storage: '📦',
  other: '📍'
};

// Direction to degrees mapping for sun position
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

export default function PropertyViewPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVisitorForm, setShowVisitorForm] = useState(true);
  const [visitor, setVisitor] = useState(null);
  const [visitorForm, setVisitorForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // View states
  const [viewMode, setViewMode] = useState('tour'); // 'tour', 'floorplan', 'info'
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sunTime, setSunTime] = useState([12]);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(0);
  
  const viewStartTime = useRef(null);
  const visitedRooms = useRef([]);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  useEffect(() => {
    if (visitor && !viewStartTime.current) {
      viewStartTime.current = Date.now();
    }

    return () => {
      if (visitor && viewStartTime.current) {
        trackVisit();
      }
    };
  }, [visitor]);

  useEffect(() => {
    // Set initial room to entry room
    if (property?.rooms?.length > 0) {
      const entryIndex = property.rooms.findIndex(r => r.id === property.entry_room_id);
      if (entryIndex >= 0) {
        setCurrentRoomIndex(entryIndex);
      }
    }
  }, [property]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      toast.error('Gayrimenkul bulunamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    if (!visitorForm.first_name || !visitorForm.last_name || !visitorForm.phone) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/visitors/register`, {
        property_id: id,
        ...visitorForm
      });
      setVisitor(response.data);
      setShowVisitorForm(false);
      toast.success('Hoş geldiniz!');
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const trackVisit = async () => {
    if (!visitor || !viewStartTime.current) return;
    
    const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
    try {
      await axios.post(`${API_URL}/visits`, {
        property_id: id,
        visitor_id: visitor.id,
        duration,
        rooms_visited: visitedRooms.current
      });
    } catch (error) {
      console.error('Visit tracking failed:', error);
    }
  };

  // Calculate sun position based on time and facing direction
  const getSunPosition = () => {
    const time = sunTime[0];
    const facingDegrees = DIRECTION_DEGREES[property?.facing_direction] || 180;
    
    // Sun moves from east (90°) to west (270°) during the day
    // At 6:00 it's at east, at 12:00 it's at south, at 18:00 it's at west
    const sunAngle = 90 + ((time - 6) / 12) * 180; // 90° at 6am, 180° at noon, 270° at 6pm
    
    // Calculate if sun is hitting this face
    const angleDiff = Math.abs(sunAngle - facingDegrees);
    const normalizedDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff;
    const sunIntensity = Math.max(0, 1 - normalizedDiff / 90); // 0-1 based on angle difference
    
    return {
      angle: sunAngle,
      intensity: sunIntensity,
      x: 50 + Math.cos((sunAngle - 90) * Math.PI / 180) * 40,
      y: 50 - Math.sin((sunAngle - 90) * Math.PI / 180) * 30
    };
  };

  const getSunFilter = () => {
    const time = sunTime[0];
    const sunPos = getSunPosition();
    
    let brightness = 0.8 + sunPos.intensity * 0.4;
    let sepia = 0;
    let saturate = 1;
    let warmth = 0;

    if (time < 8) {
      warmth = 0.2;
      sepia = 0.15;
    } else if (time > 17) {
      warmth = 0.3;
      sepia = 0.2;
      saturate = 1.1;
    }

    return {
      filter: `brightness(${brightness}) sepia(${sepia}) saturate(${saturate})`,
      warmth
    };
  };

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatTime = (hour) => `${hour.toString().padStart(2, '0')}:00`;

  const handleRoomChange = (index) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentRoomIndex(index);
      setCurrentPhotoIndex(0);
      const room = property.rooms[index];
      if (room && !visitedRooms.current.includes(room.id)) {
        visitedRooms.current.push(room.id);
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handlePhotoChange = (direction) => {
    const room = property.rooms[currentRoomIndex];
    if (!room?.photos?.length) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      if (direction === 'next') {
        setCurrentPhotoIndex((prev) => (prev + 1) % room.photos.length);
      } else {
        setCurrentPhotoIndex((prev) => (prev - 1 + room.photos.length) % room.photos.length);
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `${property?.title} - ${property?.district}, ${property?.city}`,
          url: shareUrl,
        });
      } catch (error) {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link kopyalandı');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link kopyalandı');
    }
  };

  // Render floor plan grid (same as PropertyFormPage)
  const renderFloorPlan = () => {
    const floorRooms = property.rooms?.filter(r => r.floor === currentFloor) || [];
    
    if (floorRooms.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-white/50">
          Bu katta oda bulunmuyor
        </div>
      );
    }

    // Calculate grid bounds
    const minX = Math.min(...floorRooms.map(r => r.position_x)) - 1;
    const maxX = Math.max(...floorRooms.map(r => r.position_x)) + 1;
    const minY = Math.min(...floorRooms.map(r => r.position_y)) - 1;
    const maxY = Math.max(...floorRooms.map(r => r.position_y)) + 1;

    const sunPos = getSunPosition();
    
    const grid = [];
    for (let y = minY; y <= maxY; y++) {
      const row = [];
      for (let x = minX; x <= maxX; x++) {
        const room = floorRooms.find(r => r.position_x === x && r.position_y === y);
        
        row.push(
          <div key={`${x}-${y}`} className="w-20 h-20 md:w-24 md:h-24 p-0.5">
            {room ? (
              <button
                onClick={() => {
                  const idx = property.rooms.findIndex(r => r.id === room.id);
                  if (idx >= 0) {
                    handleRoomChange(idx);
                    setViewMode('tour');
                  }
                }}
                className={`w-full h-full rounded-lg p-1 text-center transition-all hover:scale-105 relative overflow-hidden ${
                  room.id === property.entry_room_id 
                    ? 'bg-amber-500 text-white' 
                    : currentRoomIndex === property.rooms.findIndex(r => r.id === room.id)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                <span className="text-lg md:text-2xl block">{ROOM_ICONS[room.room_type] || '📍'}</span>
                <span className="text-[10px] md:text-xs font-medium truncate block leading-tight">
                  {room.name || ROOM_NAMES[room.room_type]}
                </span>
                {room.square_meters && (
                  <span className="text-[8px] md:text-[10px] opacity-70">{room.square_meters}m²</span>
                )}
              </button>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        );
      }
      grid.push(
        <div key={y} className="flex justify-center">
          {row}
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Sun indicator */}
        <div 
          className="absolute w-12 h-12 transition-all duration-500 pointer-events-none z-10"
          style={{
            left: `${sunPos.x}%`,
            top: `${sunPos.y}%`,
            transform: 'translate(-50%, -50%)',
            opacity: sunPos.intensity > 0.1 ? 1 : 0.3
          }}
        >
          <Sun 
            className={`w-full h-full drop-shadow-lg ${sunPos.intensity > 0.5 ? 'text-yellow-400' : 'text-orange-400'}`}
            style={{
              filter: `drop-shadow(0 0 ${10 + sunPos.intensity * 20}px ${sunPos.intensity > 0.5 ? '#fbbf24' : '#f97316'})`
            }}
          />
        </div>

        {/* Compass indicator */}
        <div className="absolute top-2 right-2 text-white/60 text-xs flex items-center gap-1">
          <Compass className="w-4 h-4" />
          <span>{property.facing_direction || 'Güney'}</span>
        </div>

        <div className="space-y-0">{grid}</div>
      </div>
    );
  };

  const currentRoom = property?.rooms?.[currentRoomIndex];
  const has360 = property?.view_type === '360' && currentRoom?.panorama_photo;
  const hasPhotos = currentRoom?.photos?.length > 0;
  const maxFloors = property?.property_type === 'triplex' ? 3 : property?.property_type === 'duplex' ? 2 : 1;
  const sunFilterStyle = getSunFilter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-900">
        <div className="animate-pulse text-white font-heading text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-900">
        <div className="text-center text-white">
          <Home className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <h1 className="font-heading text-2xl mb-2">Gayrimenkul Bulunamadı</h1>
          <p className="text-white/70">Bu gayrimenkul silinmiş veya mevcut değil.</p>
        </div>
      </div>
    );
  }

  // Visitor Form
  if (showVisitorForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Property Preview Card */}
          <Card className="bg-white/10 backdrop-blur border-white/20 overflow-hidden mb-6">
            {(property.cover_image || property.rooms?.[0]?.photos?.[0]) && (
              <img 
                src={property.cover_image || property.rooms[0].photos[0]} 
                alt={property.title} 
                className="w-full h-48 object-cover"
              />
            )}
            <CardContent className="p-6">
              <p className="text-white/60 text-sm mb-2">{property.company_name}</p>
              <h1 className="font-heading text-2xl font-semibold text-white mb-2">{property.title}</h1>
              <p className="text-white/70 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {property.district}, {property.city}
              </p>
              <div className="flex items-center gap-4 mt-4 text-white/60 text-sm">
                <span>{property.room_count}</span>
                <span>•</span>
                <span>{property.square_meters} m²</span>
                <span>•</span>
                <span>Kat {property.floor}</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="text-2xl font-bold text-amber-400">
                  {formatPrice(property.price, property.currency)}
                </div>
                {property.view_type === '360' && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-0">360°</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visitor Form */}
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <h2 className="font-heading text-xl text-white mb-2">Daireyi Görüntüle</h2>
              <p className="text-white/60 text-sm mb-6">
                Sanal tura başlamak için bilgilerinizi girin
              </p>
              
              <form onSubmit={handleVisitorSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Adınız</Label>
                    <Input
                      value={visitorForm.first_name}
                      onChange={(e) => setVisitorForm({...visitorForm, first_name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      placeholder="Ad"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Soyadınız</Label>
                    <Input
                      value={visitorForm.last_name}
                      onChange={(e) => setVisitorForm({...visitorForm, last_name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      placeholder="Soyad"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white/80">Telefon</Label>
                  <Input
                    value={visitorForm.phone}
                    onChange={(e) => setVisitorForm({...visitorForm, phone: e.target.value})}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 rounded-full"
                >
                  {submitting ? 'Yükleniyor...' : 'Tura Başla'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main View - Tour mode is default
  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-900 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      
      {/* Header - not shown in fullscreen */}
      {!fullscreen && (
        <header className="p-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">{property.company_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('info')}
              className={`text-white/70 hover:text-white ${viewMode === 'info' ? 'bg-white/10' : ''}`}
            >
              <Info className="w-4 h-4 mr-1" />
              Bilgi
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('floorplan')}
              className={`text-white/70 hover:text-white ${viewMode === 'floorplan' ? 'bg-white/10' : ''}`}
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              Kroki
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleShare}
              className="text-white/70 hover:text-white"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </header>
      )}

      {/* Tour View */}
      {viewMode === 'tour' && (
        <div className="flex flex-col h-[calc(100vh-56px)]">
          {/* Photo/Panorama View */}
          <div className={`relative flex-1 ${fullscreen ? 'h-screen' : ''}`}>
            {/* Fullscreen toggle */}
            {!fullscreen ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setFullscreen(true)}
                className="absolute top-4 right-4 z-20 text-white bg-black/50 hover:bg-black/70 rounded-full"
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            )}

            {/* Sun indicator overlay */}
            {!fullscreen && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                <Sun className="w-4 h-4 text-yellow-400" style={{
                  filter: `drop-shadow(0 0 ${5 + getSunPosition().intensity * 10}px #fbbf24)`
                }} />
                <span className="text-white/80 text-sm">{formatTime(sunTime[0])}</span>
                {property.facing_direction && (
                  <span className="text-white/50 text-xs">• {property.facing_direction}</span>
                )}
              </div>
            )}

            {has360 ? (
              // 360 Panorama
              <div className="w-full h-full relative">
                <div style={{ filter: sunFilterStyle.filter }} className="w-full h-full">
                  <Pannellum
                    width="100%"
                    height="100%"
                    image={currentRoom.panorama_photo}
                    pitch={0}
                    yaw={0}
                    hfov={110}
                    autoLoad
                    showZoomCtrl={false}
                    showFullscreenCtrl={false}
                    mouseZoom={true}
                    compass={true}
                  />
                </div>
                <Badge className="absolute bottom-4 left-4 bg-blue-500 text-white">
                  360° - Sürükleyerek Gez
                </Badge>
              </div>
            ) : hasPhotos ? (
              // Regular Photos with Transition
              <div className="relative w-full h-full overflow-hidden bg-black">
                <img
                  src={currentRoom.photos[currentPhotoIndex]}
                  alt={`${currentRoom.name} - ${currentPhotoIndex + 1}`}
                  className={`w-full h-full object-contain transition-all duration-300 ${
                    isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`}
                  style={{ filter: sunFilterStyle.filter }}
                />
                
                {/* Photo Navigation */}
                {currentRoom.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => handlePhotoChange('prev')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handlePhotoChange('next')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Photo Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {currentRoom.photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setIsTransitioning(true);
                            setTimeout(() => {
                              setCurrentPhotoIndex(idx);
                              setIsTransitioning(false);
                            }, 300);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            idx === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50 w-2'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white/50">
                  <Home className="w-16 h-16 mx-auto mb-4" />
                  <p>Bu oda için fotoğraf yok</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls - not in fullscreen */}
          {!fullscreen && (
            <div className="bg-black/40 backdrop-blur">
              {/* Sun Simulation */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <Sun className="w-5 h-5 text-yellow-400" />
                  <div className="flex-1">
                    <Slider
                      value={sunTime}
                      onValueChange={setSunTime}
                      min={6}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <span className="text-white/70 text-sm w-12">{formatTime(sunTime[0])}</span>
                </div>
              </div>

              {/* Room Navigation */}
              {property.rooms?.length > 0 && (
                <div className="px-4 py-3">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {property.rooms.map((room, idx) => (
                      <button
                        key={room.id}
                        onClick={() => handleRoomChange(idx)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 ${
                          idx === currentRoomIndex
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        <span>{ROOM_ICONS[room.room_type] || '📍'}</span>
                        {room.name || ROOM_NAMES[room.room_type] || room.room_type}
                        {room.panorama_photo && <span className="text-blue-300">360°</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floor Plan View */}
      {viewMode === 'floorplan' && (
        <div className="p-4">
          <div className="text-center mb-4">
            <h2 className="text-white font-heading text-xl mb-1">{property.title}</h2>
            <p className="text-white/60 text-sm">{property.room_count} • {property.square_meters} m²</p>
          </div>

          {/* Floor selector for duplex/triplex */}
          {maxFloors > 1 && (
            <div className="flex items-center justify-center gap-4 mb-6">
              {[...Array(maxFloors)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentFloor(idx)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    currentFloor === idx
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {idx === 0 ? 'Zemin Kat' : `${idx}. Kat`}
                </button>
              ))}
            </div>
          )}

          {/* Sun Simulation for Floor Plan */}
          <div className="mb-4 px-4 py-3 bg-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <Sun className="w-5 h-5 text-yellow-400" />
              <div className="flex-1">
                <Slider
                  value={sunTime}
                  onValueChange={setSunTime}
                  min={6}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
              <span className="text-white/70 text-sm w-12">{formatTime(sunTime[0])}</span>
            </div>
            <p className="text-white/50 text-xs mt-2 text-center">
              Güneş simülasyonu • Cephe: {property.facing_direction || 'Belirtilmemiş'}
            </p>
          </div>

          {/* Floor Plan Grid */}
          <div className="bg-white/10 rounded-2xl p-4 mb-6 min-h-[300px]">
            {renderFloorPlan()}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm text-white/60 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500" />
              <span>Giriş</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500" />
              <span>Seçili</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white/20" />
              <span>Oda</span>
            </div>
          </div>

          {/* Back to Tour Button */}
          <Button 
            onClick={() => setViewMode('tour')}
            className="w-full h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Eye className="w-5 h-5 mr-2" />
            Tura Dön
          </Button>
        </div>
      )}

      {/* Info View */}
      {viewMode === 'info' && (
        <div className="p-4 pb-24 overflow-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
          {/* Cover */}
          <div className="relative h-48 rounded-xl overflow-hidden mb-6">
            {(property.cover_image || property.rooms?.[0]?.photos?.[0]) ? (
              <img 
                src={property.cover_image || property.rooms[0].photos[0]} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Home className="w-12 h-12 text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-white font-heading text-2xl font-semibold">{property.title}</h1>
              <p className="text-white/70 flex items-center gap-1 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                {property.district}, {property.city}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full font-semibold">
              {formatPrice(property.price, property.currency)}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Ruler className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-semibold text-sm">{property.square_meters}</p>
              <p className="text-white/50 text-xs">m²</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <DoorOpen className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-semibold text-sm">{property.room_count}</p>
              <p className="text-white/50 text-xs">Oda</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Layers className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-semibold text-sm">{property.floor}/{property.total_floors}</p>
              <p className="text-white/50 text-xs">Kat</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Calendar className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-semibold text-sm">{property.building_age}</p>
              <p className="text-white/50 text-xs">Yaş</p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white/10 rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-3">Detaylar</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-white/60">Cephe:</span>
                <span className="text-white">{property.facing_direction}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-white/60">Isıtma:</span>
                <span className="text-white">{property.heating_type}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">Açıklama</h3>
              <p className="text-white/70 text-sm">{property.description}</p>
            </div>
          )}

          {/* Fixed bottom button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-emerald-950 via-emerald-950/95 to-transparent">
            <Button 
              onClick={() => setViewMode('tour')}
              className="w-full h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Eye className="w-5 h-5 mr-2" />
              Daireyi Gez
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
