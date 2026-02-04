import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import {
  Building2,
  ArrowLeft,
  MapPin,
  Ruler,
  Layers,
  Compass,
  Flame,
  Calendar,
  Share2,
  Copy,
  Sun,
  Moon,
  School,
  ShoppingCart,
  Bus,
  TreePine,
  Hospital,
  CircleDot,
  Home,
  X,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import VirtualTourViewer from '../components/VirtualTourViewer';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Room type names
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

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sunTime, setSunTime] = useState([12]);
  const [viewStartTime, setViewStartTime] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [showTourPreview, setShowTourPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    fetchProperty();
    fetchVisitors();
    setViewStartTime(Date.now());

    return () => {
      if (!hasTrackedRef.current && viewStartTime) {
        trackVisit();
      }
    };
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasTrackedRef.current && viewStartTime) {
        trackVisit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [viewStartTime]);

  const fetchProperty = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/properties/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setProperty(response.data);
    } catch (error) {
      toast.error('Daire bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/properties/${id}/visitors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVisitors(response.data);
    } catch (error) {
      console.error('Visitors fetch failed:', error);
    }
  };

  const trackVisit = async () => {
    if (hasTrackedRef.current || !viewStartTime) return;
    hasTrackedRef.current = true;

    const duration = Math.round((Date.now() - viewStartTime) / 1000);
    try {
      await axios.post(`${API_URL}/visits`, {
        property_id: id,
        duration,
        visitor_ip: null,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Visit tracking failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İlan silindi');
      navigate('/dashboard');
    } catch (error) {
      toast.error('İlan silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = () => {
    const viewUrl = `${window.location.origin}/view/${id}`;
    navigator.clipboard.writeText(viewUrl);
    toast.success('Müşteri linki kopyalandı');
  };

  const handleShare = async () => {
    const viewUrl = `${window.location.origin}/view/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `${property?.title} - ${property?.district}, ${property?.city}`,
          url: viewUrl,
        });
      } catch (error) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRoomChange = (index) => {
    setSelectedRoomIndex(index);
  };

  const formatPrice = (price, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR').format(price) + ' ' + currency;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSunFilter = () => {
    const time = sunTime[0];
    // Morning (6-10): warmer, less bright
    // Midday (10-14): bright, neutral
    // Afternoon (14-18): warm golden
    // Evening (18-20): warm, dimmer

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

  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const has360 = property?.view_type === '360' && property?.rooms?.some(r => r.panorama_photo);

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
          <h1 className="font-heading text-2xl text-foreground mb-2">Daire Bulunamadı</h1>
          <p className="text-muted-foreground mb-6">Bu daire silinmiş veya mevcut değil.</p>
          <Link to="/dashboard">
            <Button className="rounded-full">Panele Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Tam ekran tur önizleme modu
  if (showTourPreview && has360) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Çıkış butonu */}
        <button
          onClick={() => setShowTourPreview(false)}
          className="absolute top-4 left-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all"
        >
          <X className="w-5 h-5" />
          <span>Önizlemeden Çık</span>
        </button>
        
        {/* Emlakçı bilgi badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <Badge className="bg-amber-500 text-white border-0 px-4 py-2">
            <Eye className="w-4 h-4 mr-2" />
            Müşteri Önizlemesi
          </Badge>
        </div>
        
        <VirtualTourViewer
          property={property}
          currentRoomIndex={selectedRoomIndex}
          onRoomChange={handleRoomChange}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/dashboard" className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-emerald-600" />
                <span className="font-semibold text-emerald-600 hidden sm:inline">mekan360</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link to={`/property/edit/${id}`}>
                <Button variant="outline" size="sm" className="text-slate-600">
                  <Edit className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Düzenle</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="text-slate-600">
                <Copy className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Link</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="text-slate-600">
                <Share2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Paylaş</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sol Kolon - Ana İçerik */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 360 Tur Önizleme Kartı */}
            {has360 && (
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="relative h-80 bg-slate-900">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <Eye className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">360° Sanal Tur</h3>
                      <p className="text-white/60 mb-4">Müşterinizin göreceği deneyimi önizleyin</p>
                      <Button 
                        onClick={() => setShowTourPreview(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Tur Önizleme
                      </Button>
                    </div>
                  </div>
                  <Badge className="absolute top-4 right-4 bg-blue-500 text-white border-0">
                    360°
                  </Badge>
                </div>
                <CardContent className="p-4 bg-slate-800">
                  <div className="flex flex-wrap gap-2">
                    {property.rooms?.filter(r => r.panorama_photo).map((room, idx) => (
                      <Badge 
                        key={room.id} 
                        variant="secondary"
                        className="bg-slate-700 text-slate-200"
                      >
                        {room.name || ROOM_NAMES[room.room_type]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Kapak Görseli - 360 yoksa */}
            {!has360 && (property.cover_image || property.rooms?.[0]?.photos?.[0]) && (
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="relative h-80">
                  <img 
                    src={property.cover_image || property.rooms[0].photos[0]} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-slate-800 text-white border-0">
                      Normal Fotoğraf
                    </Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* İlan Bilgileri Kartı */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">{property.title}</h1>
                    <p className="text-slate-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {property.district}, {property.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatPrice(property.price, property.currency)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 py-4 border-y border-slate-100">
                  <div className="text-center">
                    <Ruler className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-semibold text-slate-800">{property.square_meters}</p>
                    <p className="text-xs text-slate-500">m²</p>
                  </div>
                  <div className="text-center">
                    <Home className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-semibold text-slate-800">{property.room_count}</p>
                    <p className="text-xs text-slate-500">Oda</p>
                  </div>
                  <div className="text-center">
                    <Layers className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-semibold text-slate-800">{property.floor}/{property.total_floors}</p>
                    <p className="text-xs text-slate-500">Kat</p>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-semibold text-slate-800">{property.building_age}</p>
                    <p className="text-xs text-slate-500">Bina Yaşı</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Cephe:</span>
                    <span className="text-slate-800 font-medium">{property.facing_direction}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Flame className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Isıtma:</span>
                    <span className="text-slate-800 font-medium">{property.heating_type}</span>
                  </div>
                </div>

                {property.description && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-slate-600 text-sm">{property.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Müşteri Linki Kartı */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <h3 className="font-semibold text-lg mb-1">Müşteri Paylaşım Linki</h3>
                    <p className="text-white/80 text-sm">Bu linki müşterilerinize gönderin</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCopyLink}
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Kopyala
                    </Button>
                    <Button 
                      onClick={handleShare}
                      className="bg-white text-emerald-600 hover:bg-white/90 border-0"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Paylaş
                    </Button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/10 rounded-lg">
                  <code className="text-white/90 text-sm break-all">
                    {window.location.origin}/view/{id}
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Kolon - İstatistikler */}
          <div className="space-y-6">
            
            {/* Görüntülenme İstatistikleri */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-500" />
                  İstatistikler
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{property.view_count || 0}</p>
                    <p className="text-xs text-slate-500 mt-1">Görüntülenme</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{visitors.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Ziyaretçi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Son Ziyaretçiler */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Son Ziyaretçiler
                </h3>
                {visitors.length > 0 ? (
                  <div className="space-y-3">
                    {visitors.slice(0, 5).map((visitor) => (
                      <div key={visitor.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {visitor.first_name} {visitor.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{visitor.phone}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {visitor.visit_count}x
                          </Badge>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDate(visitor.last_visit)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {visitors.length > 5 && (
                      <Link to="/analytics">
                        <Button variant="ghost" className="w-full text-sm text-emerald-600">
                          Tümünü Gör
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Henüz ziyaretçi yok</p>
                    <p className="text-xs mt-1">Linki paylaşarak başlayın</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hızlı İşlemler */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Hızlı İşlemler</h3>
                <div className="space-y-2">
                  <Link to={`/property/edit/${id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="w-4 h-4 mr-2" />
                      İlanı Düzenle
                    </Button>
                  </Link>
                  <a href={`${window.location.origin}/view/${id}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Müşteri Görünümü
                    </Button>
                  </a>
                  <Link to="/analytics" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="w-4 h-4 mr-2" />
                      Detaylı Analiz
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Oda Fotoğrafları (eski koddan kalan kısım için basitleştirilmiş) */}
      {property.rooms?.some(r => r.photos?.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Oda Fotoğrafları</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.rooms.flatMap((room, roomIdx) => 
                  room.photos?.slice(0, 2).map((photo, photoIdx) => (
                    <div 
                      key={`${roomIdx}-${photoIdx}`}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedImage(photo)}
                    >
                      <img 
                        src={photo} 
                        alt={room.name || ROOM_NAMES[room.room_type]}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                      <Badge className="absolute bottom-2 left-2 bg-black/50 text-white text-xs border-0">
                        {room.name || ROOM_NAMES[room.room_type]}
                      </Badge>
                    </div>
                  ))
                ).slice(0, 8)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
