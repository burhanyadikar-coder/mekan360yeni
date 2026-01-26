import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Building2,
  ArrowLeft,
  Upload,
  X,
  Plus,
  MapPin,
  Home,
  Compass,
  Ruler,
  Layers,
  Calendar,
  Flame,
  Image as ImageIcon,
  Save
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FACING_DIRECTIONS = [
  { value: 'Kuzey', label: 'Kuzey' },
  { value: 'Güney', label: 'Güney' },
  { value: 'Doğu', label: 'Doğu' },
  { value: 'Batı', label: 'Batı' },
  { value: 'Kuzey-Doğu', label: 'Kuzey-Doğu' },
  { value: 'Kuzey-Batı', label: 'Kuzey-Batı' },
  { value: 'Güney-Doğu', label: 'Güney-Doğu' },
  { value: 'Güney-Batı', label: 'Güney-Batı' },
];

const HEATING_TYPES = [
  { value: 'Doğalgaz (Kombi)', label: 'Doğalgaz (Kombi)' },
  { value: 'Merkezi', label: 'Merkezi' },
  { value: 'Soba', label: 'Soba' },
  { value: 'Klima', label: 'Klima' },
  { value: 'Yerden Isıtma', label: 'Yerden Isıtma' },
  { value: 'Yok', label: 'Yok' },
];

const POI_TYPES = [
  { value: 'school', label: 'Okul', icon: '🏫' },
  { value: 'market', label: 'Market', icon: '🛒' },
  { value: 'transport', label: 'Durak/Metro', icon: '🚌' },
  { value: 'hospital', label: 'Hastane', icon: '🏥' },
  { value: 'park', label: 'Park', icon: '🌳' },
  { value: 'other', label: 'Diğer', icon: '📍' },
];

export default function PropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const panoramaInputRef = useRef(null);
  const imagesInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    district: '',
    square_meters: '',
    room_count: '',
    floor: '',
    total_floors: '',
    building_age: '',
    heating_type: '',
    facing_direction: '',
    price: '',
    currency: 'TRY',
    panorama_image: null,
    regular_images: [],
    pois: []
  });

  const [newPoi, setNewPoi] = useState({ name: '', type: 'school', distance: '' });

  useEffect(() => {
    if (isEditing) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/properties/${id}`);
      const property = response.data;
      setFormData({
        ...property,
        square_meters: property.square_meters.toString(),
        floor: property.floor.toString(),
        total_floors: property.total_floors.toString(),
        building_age: property.building_age.toString(),
        price: property.price.toString(),
      });
    } catch (error) {
      toast.error('Daire bilgileri yüklenemedi');
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePanoramaUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Panoramik görsel 10MB\'dan küçük olmalı');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, panorama_image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.regular_images.length > 10) {
      toast.error('En fazla 10 görsel yükleyebilirsiniz');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} 5MB'dan büyük`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          regular_images: [...prev.regular_images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      regular_images: prev.regular_images.filter((_, i) => i !== index)
    }));
  };

  const removePanorama = () => {
    setFormData(prev => ({ ...prev, panorama_image: null }));
  };

  const addPoi = () => {
    if (!newPoi.name || !newPoi.distance) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    setFormData(prev => ({
      ...prev,
      pois: [...prev.pois, { ...newPoi }]
    }));
    setNewPoi({ name: '', type: 'school', distance: '' });
  };

  const removePoi = (index) => {
    setFormData(prev => ({
      ...prev,
      pois: prev.pois.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        square_meters: parseFloat(formData.square_meters),
        floor: parseInt(formData.floor),
        total_floors: parseInt(formData.total_floors),
        building_age: parseInt(formData.building_age),
        price: parseFloat(formData.price),
      };

      if (isEditing) {
        await axios.put(`${API_URL}/properties/${id}`, payload);
        toast.success('Daire başarıyla güncellendi');
      } else {
        await axios.post(`${API_URL}/properties`, payload);
        toast.success('Daire başarıyla eklendi');
      }
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'İşlem başarısız';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" data-testid="back-btn">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/dashboard" className="flex items-center gap-3" data-testid="form-logo">
                <Building2 className="w-7 h-7 text-primary" />
                <span className="font-heading text-lg font-semibold text-primary">HomeView Pro</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-12 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-primary">
            {isEditing ? 'Daire Düzenle' : 'Yeni Daire Ekle'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Daire bilgilerini eksiksiz doldurun.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" data-testid="property-form">
          {/* Basic Info */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Home className="w-5 h-5 text-primary" />
                Temel Bilgiler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">İlan Başlığı *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Örn: Deniz Manzaralı 3+1 Daire"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  data-testid="title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Daire hakkında detaylı açıklama..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  data-testid="description-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Fiyat *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    data-testid="price-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Para Birimi</Label>
                  <Select value={formData.currency} onValueChange={(v) => handleSelectChange('currency', v)}>
                    <SelectTrigger data-testid="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY (₺)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Konum Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Adres *</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Sokak, Mahalle"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  data-testid="address-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Şehir *</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="İstanbul"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    data-testid="city-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">İlçe *</Label>
                  <Input
                    id="district"
                    name="district"
                    placeholder="Kadıköy"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    data-testid="district-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Layers className="w-5 h-5 text-primary" />
                Daire Özellikleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="square_meters" className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    m² *
                  </Label>
                  <Input
                    id="square_meters"
                    name="square_meters"
                    type="number"
                    placeholder="120"
                    value={formData.square_meters}
                    onChange={handleChange}
                    required
                    data-testid="sqm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room_count">Oda Sayısı *</Label>
                  <Input
                    id="room_count"
                    name="room_count"
                    placeholder="3+1"
                    value={formData.room_count}
                    onChange={handleChange}
                    required
                    data-testid="rooms-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Bulunduğu Kat *</Label>
                  <Input
                    id="floor"
                    name="floor"
                    type="number"
                    placeholder="5"
                    value={formData.floor}
                    onChange={handleChange}
                    required
                    data-testid="floor-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_floors">Toplam Kat *</Label>
                  <Input
                    id="total_floors"
                    name="total_floors"
                    type="number"
                    placeholder="10"
                    value={formData.total_floors}
                    onChange={handleChange}
                    required
                    data-testid="total-floors-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="building_age" className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Bina Yaşı *
                  </Label>
                  <Input
                    id="building_age"
                    name="building_age"
                    type="number"
                    placeholder="5"
                    value={formData.building_age}
                    onChange={handleChange}
                    required
                    data-testid="age-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heating_type" className="flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    Isıtma *
                  </Label>
                  <Select value={formData.heating_type} onValueChange={(v) => handleSelectChange('heating_type', v)}>
                    <SelectTrigger data-testid="heating-select">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {HEATING_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facing_direction" className="flex items-center gap-1">
                    <Compass className="w-4 h-4" />
                    Cephe *
                  </Label>
                  <Select value={formData.facing_direction} onValueChange={(v) => handleSelectChange('facing_direction', v)}>
                    <SelectTrigger data-testid="facing-select">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACING_DIRECTIONS.map(dir => (
                        <SelectItem key={dir.value} value={dir.value}>{dir.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 360 Panorama */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <span className="text-primary">360°</span>
                Panoramik Görsel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={panoramaInputRef}
                accept="image/*"
                onChange={handlePanoramaUpload}
                className="hidden"
              />
              
              {formData.panorama_image ? (
                <div className="relative rounded-sm overflow-hidden">
                  <img
                    src={formData.panorama_image}
                    alt="360 Panorama"
                    className="w-full h-64 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full"
                    onClick={removePanorama}
                    data-testid="remove-panorama-btn"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-primary/90 text-white text-sm rounded">
                    360° Panorama Yüklendi
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => panoramaInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  data-testid="upload-panorama-btn"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">360° Panoramik Görsel Yükle</p>
                    <p className="text-sm text-muted-foreground mt-1">PNG, JPG (max 10MB)</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Regular Images */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <ImageIcon className="w-5 h-5 text-primary" />
                Diğer Görseller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={imagesInputRef}
                accept="image/*"
                multiple
                onChange={handleImagesUpload}
                className="hidden"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.regular_images.map((img, index) => (
                  <div key={index} className="relative rounded-sm overflow-hidden aspect-square">
                    <img src={img} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 w-6 h-6 rounded-full"
                      onClick={() => removeImage(index)}
                      data-testid={`remove-image-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                
                {formData.regular_images.length < 10 && (
                  <button
                    type="button"
                    onClick={() => imagesInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    data-testid="upload-images-btn"
                  >
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Görsel Ekle</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* POIs */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Yakın Çevre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing POIs */}
              {formData.pois.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.pois.map((poi, index) => {
                    const poiType = POI_TYPES.find(t => t.value === poi.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm"
                      >
                        <span>{poiType?.icon}</span>
                        <span className="font-medium">{poi.name}</span>
                        <span className="text-muted-foreground">({poi.distance})</span>
                        <button
                          type="button"
                          onClick={() => removePoi(index)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          data-testid={`remove-poi-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New POI */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Tür</Label>
                  <Select value={newPoi.type} onValueChange={(v) => setNewPoi(p => ({ ...p, type: v }))}>
                    <SelectTrigger data-testid="poi-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POI_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>İsim</Label>
                  <Input
                    placeholder="Örn: Atatürk İlkokulu"
                    value={newPoi.name}
                    onChange={(e) => setNewPoi(p => ({ ...p, name: e.target.value }))}
                    data-testid="poi-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mesafe</Label>
                  <Input
                    placeholder="Örn: 500m"
                    value={newPoi.distance}
                    onChange={(e) => setNewPoi(p => ({ ...p, distance: e.target.value }))}
                    data-testid="poi-distance-input"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addPoi} data-testid="add-poi-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Ekle
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link to="/dashboard">
              <Button type="button" variant="ghost" data-testid="cancel-btn">
                İptal
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
              data-testid="submit-btn"
            >
              {loading ? 'Kaydediliyor...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Güncelle' : 'Kaydet'}
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
