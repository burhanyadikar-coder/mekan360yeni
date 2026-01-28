import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Building2, 
  ArrowLeft, 
  Save, 
  Share2, 
  Home,
  LogOut,
  BarChart3,
  FolderOpen,
  Copy,
  ExternalLink,
  Plus,
  Minus,
  MapPin
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [group, setGroup] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedGroup, setEditedGroup] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch group
      const groupRes = await fetch(`${BACKEND_URL}/api/groups/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!groupRes.ok) {
        toast.error('Grup bulunamadı');
        navigate('/groups');
        return;
      }
      
      const groupData = await groupRes.json();
      setGroup(groupData);
      setEditedGroup({ name: groupData.name, description: groupData.description || '' });
      
      // Fetch all properties
      const propsRes = await fetch(`${BACKEND_URL}/api/properties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!editedGroup.name.trim()) {
      toast.error('Grup adı gereklidir');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedGroup)
      });

      if (res.ok) {
        const data = await res.json();
        setGroup(data);
        setEditMode(false);
        toast.success('Grup güncellendi');
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProperty = async (propertyId, isInGroup) => {
    try {
      const token = localStorage.getItem('token');
      const method = isInGroup ? 'DELETE' : 'POST';
      
      const res = await fetch(`${BACKEND_URL}/api/groups/${id}/properties/${propertyId}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        // Update local state
        if (isInGroup) {
          setGroup({
            ...group,
            property_ids: group.property_ids.filter(pid => pid !== propertyId)
          });
          toast.success('Daire gruptan çıkarıldı');
        } else {
          setGroup({
            ...group,
            property_ids: [...(group.property_ids || []), propertyId]
          });
          toast.success('Daire gruba eklendi');
        }
      } else {
        toast.error('İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const copyShareLink = () => {
    const fullUrl = `${window.location.origin}${group.share_link}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Paylaşım linki kopyalandı');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <span className="font-heading text-xl font-semibold text-primary">mekan360</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/groups">
                <Button variant="ghost" size="sm" className="text-primary">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Gruplar
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analitik
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
        {/* Back Button */}
        <Link to="/groups" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Gruplara Dön
        </Link>

        {/* Group Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{group?.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Linki Kopyala
                </Button>
                <Link to={group?.share_link} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Önizle
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Grup Adı</Label>
                  <Input
                    id="name"
                    value={editedGroup.name}
                    onChange={(e) => setEditedGroup({...editedGroup, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={editedGroup.description}
                    onChange={(e) => setEditedGroup({...editedGroup, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveGroup} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">
                  {group?.description || 'Açıklama yok'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{group?.property_ids?.length || 0} daire</span>
                  <span>•</span>
                  <span>Oluşturulma: {new Date(group?.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditMode(true)}>
                  Düzenle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Properties List */}
        <div>
          <h2 className="font-heading text-xl font-semibold mb-4">Daireleri Yönet</h2>
          <p className="text-muted-foreground mb-6">Gruba eklemek istediğiniz daireleri seçin</p>
          
          {properties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-medium mb-2">Henüz daire yok</h3>
                <p className="text-muted-foreground mb-4">Önce daire eklemeniz gerekiyor</p>
                <Link to="/property/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Daire Ekle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map((property) => {
                const isInGroup = group?.property_ids?.includes(property.id);
                return (
                  <Card 
                    key={property.id} 
                    className={`cursor-pointer transition-all ${isInGroup ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => handleToggleProperty(property.id, isInGroup)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox checked={isInGroup} className="pointer-events-none" />
                        <div className="flex-1">
                          <h3 className="font-medium">{property.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.district}, {property.city}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {property.room_count} • {property.square_meters} m²
                          </p>
                        </div>
                        <Button
                          variant={isInGroup ? "destructive" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleProperty(property.id, isInGroup);
                          }}
                        >
                          {isInGroup ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
