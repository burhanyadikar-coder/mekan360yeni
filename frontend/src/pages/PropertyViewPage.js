import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
  Moon,
  School,
  ShoppingCart,
  Bus,
  TreePine,
  Hospital,
  CircleDot,
  Home,
  User,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Pannellum } from 'pannellum-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const POI_ICONS = {
  school: School,
  market: ShoppingCart,
  transport: Bus,
  hospital: Hospital,
  park: TreePine,
  other: CircleDot,
};

const POI_COLORS = {
  school: 'bg-blue-100 text-blue-700',
  market: 'bg-green-100 text-green-700',
  transport: 'bg-yellow-100 text-yellow-700',
  hospital: 'bg-red-100 text-red-700',
  park: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function PropertyViewPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVisitorForm, setShowVisitorForm] = useState(true);
  const [visitor, setVisitor] = useState(null);
  const [visitorForm, setVisitorForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const [sunTime, setSunTime] = useState([12]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
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
      toast.success('Hoş geldiniz! Sanal tura başlayabilirsiniz.');
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

  const getSunFilter = () => {
    const time = sunTime[0];
    let brightness = 1;
    let sepia = 0;
    let saturate = 1;

    if (time < 8) {
      brightness = 0.7 + (time - 6) * 0.1;
      sepia = 0.3 - (time - 6) * 0.1;
    } else if (time < 10) {
      brightness = 0.9 + (time - 8) * 0.05;
      sepia = 0.1 - (time - 8) * 0.05;
    } else if (time < 14) {
      brightness = 1;
      sepia = 0;
    } else if (time < 17) {
      brightness = 1 - (time - 14) * 0.03;
      sepia = (time - 14) * 0.1;
      saturate = 1 + (time - 14) * 0.05;
    } else {
      brightness = 0.85 - (time - 17) * 0.1;
      sepia = 0.3 + (time - 17) * 0.1;
      saturate = 1.15;
    }

    return `brightness(${brightness}) sepia(${sepia}) saturate(${saturate})`;
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
    setCurrentRoomIndex(index);
    const room = property.rooms[index];
    if (room && !visitedRooms.current.includes(room.id)) {
      visitedRooms.current.push(room.id);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `${property?.title} - ${property?.district}, ${property?.city}`,
          url: window.location.href,
        });
      } catch (error) {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link kopyalandı');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link kopyalandı');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-heading text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-heading text-2xl text-foreground mb-2">Gayrimenkul Bulunamadı</h1>
          <p className="text-muted-foreground mb-6">Bu gayrimenkul silinmiş veya mevcut değil.</p>
          <Link to="/">
            <Button className="rounded-full">Ana Sayfaya Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Visitor Form Dialog
  if (showVisitorForm) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-primary py-6">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-gold" />
              <span className="font-heading text-xl font-semibold text-white">HomeView Pro</span>
            </div>
            <p className="text-white/70">{property.company_name}</p>
          </div>
        </header>

        {/* Property Preview */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className="border-border/40 overflow-hidden mb-8">
            {property.cover_image ? (
              <img src={property.cover_image} alt={property.title} className="w-full h-64 object-cover" />
            ) : property.rooms?.[0]?.photos?.[0] ? (
              <img src={property.rooms[0].photos[0]} alt={property.title} className="w-full h-64 object-cover" />
            ) : (
              <div className="w-full h-64 bg-muted flex items-center justify-center">
                <Home className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <CardContent className="p-6">
              <h1 className="font-heading text-2xl font-semibold text-foreground mb-2">{property.title}</h1>
              <p className="flex items-center text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 mr-1" />
                {property.district}, {property.city}
              </p>
              <p className="font-heading text-3xl font-bold text-gold">
                {formatPrice(property.price, property.currency)}
              </p>
            </CardContent>
          </Card>

          {/* Visitor Form */}
          <Card className="border-border/40">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Sanal Tura Başlamak İçin
                </h2>
                <p className="text-muted-foreground">
                  Lütfen bilgilerinizi girin. Emlak danışmanımız sizinle iletişime geçebilir.
                </p>
              </div>

              <form onSubmit={handleVisitorSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">İsim *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="first_name"
                        placeholder="İsminiz"
                        value={visitorForm.first_name}
                        onChange={(e) => setVisitorForm(p => ({ ...p, first_name: e.target.value }))}
                        className="pl-11 h-12"
                        required
                        data-testid="visitor-first-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Soyisim *</Label>
                    <Input
                      id="last_name"
                      placeholder="Soyisminiz"
                      value={visitorForm.last_name}
                      onChange={(e) => setVisitorForm(p => ({ ...p, last_name: e.target.value }))}
                      className="h-12"
                      required
                      data-testid="visitor-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      value={visitorForm.phone}
                      onChange={(e) => setVisitorForm(p => ({ ...p, phone: e.target.value }))}
                      className="pl-11 h-12"
                      required
                      data-testid="visitor-phone"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full"
                  data-testid="start-tour-btn"
                >
                  {submitting ? 'İşleniyor...' : 'Sanal Tura Başla'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Property View
  const currentRoom = property.rooms?.[currentRoomIndex];
  const is360 = property.view_type === '360';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Building2 className="w-7 h-7 text-primary" />
              <div>
                <span className="font-heading text-lg font-semibold text-primary block leading-tight">HomeView Pro</span>
                <span className="text-xs text-muted-foreground">{property.company_name}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare} data-testid="share-btn">
              <Share2 className="w-4 h-4 mr-2" />
              Paylaş
            </Button>
          </div>
        </div>
      </header>

      {/* Image/360 Viewer Section */}
      <section className="relative">
        {is360 && currentRoom?.panorama_photo ? (
          <div className="panorama-container sun-filter" style={{ filter: getSunFilter() }}>
            <Pannellum
              width="100%"
              height="100%"
              image={currentRoom.panorama_photo}
              pitch={0}
              yaw={0}
              hfov={110}
              autoLoad
              autoRotate={-2}
              compass={true}
              showZoomCtrl={true}
              showFullscreenCtrl={true}
            />
            
            {/* Room Info Overlay */}
            {currentRoom && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white">
                <p className="font-medium">{currentRoom.name}</p>
                {currentRoom.square_meters && (
                  <p className="text-sm text-white/70">{currentRoom.square_meters} m²</p>
                )}
              </div>
            )}
          </div>
        ) : currentRoom?.photos?.length > 0 ? (
          <div className="relative h-[60vh] bg-muted">
            <img
              src={currentRoom.photos[0]}
              alt={currentRoom.name}
              className="w-full h-full object-cover sun-filter"
              style={{ filter: getSunFilter() }}
            />
            {currentRoom && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white">
                <p className="font-medium">{currentRoom.name}</p>
                {currentRoom.square_meters && (
                  <p className="text-sm text-white/70">{currentRoom.square_meters} m²</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[40vh] bg-muted flex items-center justify-center">
            <Home className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {/* Room Navigation */}
        {property.rooms?.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => handleRoomChange(Math.max(0, currentRoomIndex - 1))}
              disabled={currentRoomIndex === 0}
              className="rounded-full bg-black/50 text-white hover:bg-black/70"
              data-testid="prev-room-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white text-sm">
                {currentRoomIndex + 1} / {property.rooms.length}
              </span>
            </div>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={() => handleRoomChange(Math.min(property.rooms.length - 1, currentRoomIndex + 1))}
              disabled={currentRoomIndex === property.rooms.length - 1}
              className="rounded-full bg-black/50 text-white hover:bg-black/70"
              data-testid="next-room-btn"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Sun Simulation */}
        <div className="absolute bottom-0 left-0 right-0 glass-dark p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white">
                <Sun className="w-4 h-4 text-gold" />
                <span className="text-sm">Güneş Simülasyonu</span>
              </div>
              <span className="text-white font-medium">{formatTime(sunTime[0])}</span>
            </div>
            <div className="flex items-center gap-4">
              <Moon className="w-4 h-4 text-white/60" />
              <Slider value={sunTime} onValueChange={setSunTime} min={6} max={20} step={1} className="flex-1" />
              <Sun className="w-4 h-4 text-gold" />
            </div>
          </div>
        </div>
      </section>

      {/* Room Thumbnails */}
      {property.rooms?.length > 1 && (
        <div className="bg-muted py-4 overflow-x-auto">
          <div className="flex gap-3 px-6 max-w-7xl mx-auto">
            {property.rooms.map((room, index) => (
              <button
                key={room.id}
                onClick={() => handleRoomChange(index)}
                className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentRoomIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                data-testid={`room-thumb-${index}`}
              >
                {room.photos?.[0] || room.panorama_photo ? (
                  <img
                    src={room.photos?.[0] || room.panorama_photo}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted-foreground/20 flex items-center justify-center">
                    <Home className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Property Info */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 space-y-8">
            {/* Title & Price */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="font-heading text-2xl md:text-3xl font-semibold text-primary mb-2">
                    {property.title}
                  </h1>
                  <p className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.address}, {property.district}, {property.city}
                  </p>
                </div>
                <p className="font-heading text-2xl md:text-3xl font-semibold text-gold">
                  {formatPrice(property.price, property.currency)}
                </p>
              </div>
              {property.description && (
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              )}
            </div>

            {/* Property Features */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Ruler className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Alan</p>
                    <p className="font-heading font-medium">{property.square_meters} m²</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Oda</p>
                    <p className="font-heading font-medium">{property.room_count}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Kat</p>
                    <p className="font-heading font-medium">{property.floor}/{property.total_floors}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Cephe</p>
                    <p className="font-heading font-medium">{property.facing_direction}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Isıtma</p>
                    <p className="font-heading font-medium text-sm">{property.heating_type}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Bina Yaşı</p>
                    <p className="font-heading font-medium">{property.building_age} yıl</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* POIs */}
          <div className="lg:col-span-5 space-y-6">
            {property.pois?.length > 0 && (
              <Card className="border-border/40">
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Yakın Çevre
                  </h3>
                  <div className="space-y-3">
                    {property.pois.map((poi, index) => {
                      const IconComponent = POI_ICONS[poi.type] || CircleDot;
                      const colorClass = POI_COLORS[poi.type] || POI_COLORS.other;
                      return (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <span className="font-medium">{poi.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {poi.distance}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/40 bg-primary text-primary-foreground">
              <CardContent className="p-6 text-center">
                <h3 className="font-heading text-xl font-semibold mb-2">İletişime Geçin</h3>
                <p className="text-primary-foreground/80 text-sm mb-4">
                  Bu gayrimenkul hakkında daha fazla bilgi almak için emlak danışmanımızla iletişime geçin.
                </p>
                <Button onClick={handleShare} className="bg-gold text-white hover:bg-gold-hover rounded-full w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  İlanı Paylaş
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-muted border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-muted-foreground text-sm">
            Bu ilan <span className="font-medium text-foreground">HomeView Pro</span> ile oluşturulmuştur.
          </p>
        </div>
      </footer>
    </div>
  );
}
