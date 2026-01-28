import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Building2, MapPin, Home, Eye, ArrowRight, Phone } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function GroupViewPage() {
  const { id } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/groups/${id}`);
      
      if (!res.ok) {
        setError('Grup bulunamadı');
        return;
      }
      
      const data = await res.json();
      setGroupData(data);
    } catch (error) {
      console.error('Error fetching group:', error);
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-heading text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-semibold mb-2">{error}</h1>
          <p className="text-muted-foreground mb-4">Bu paylaşım linki geçerli değil veya kaldırılmış olabilir.</p>
          <Link to="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { group, properties } = groupData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <span className="font-heading text-xl font-semibold text-primary">mekan360</span>
            </div>
            
            <a href="tel:05514780259" className="flex items-center gap-2 text-primary">
              <Phone className="w-4 h-4" />
              <span className="font-medium">0551 478 02 59</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Group Header */}
      <section className="py-12 bg-primary">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center text-white">
            <p className="text-white/70 mb-2">{group.company_name}</p>
            <h1 className="font-heading text-4xl font-semibold mb-4">{group.name}</h1>
            {group.description && (
              <p className="text-white/80 max-w-2xl mx-auto">{group.description}</p>
            )}
            <p className="mt-4 text-gold font-medium">{properties.length} Daire</p>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          {properties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-medium mb-2">Bu grupta henüz daire yok</h3>
                <p className="text-muted-foreground">Daireler eklendiğinde burada görünecektir.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  {/* Cover Image */}
                  <div className="relative h-48 bg-muted">
                    {property.cover_image ? (
                      <img 
                        src={property.cover_image} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : property.rooms?.[0]?.photos?.[0] ? (
                      <img 
                        src={property.rooms[0].photos[0]} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {property.view_type === '360' && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-gold text-white text-xs font-medium rounded">
                        360° Tur
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5">
                    <h3 className="font-heading text-lg font-semibold mb-2 line-clamp-1">
                      {property.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <MapPin className="w-4 h-4" />
                      {property.district}, {property.city}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span>{property.room_count}</span>
                      <span>•</span>
                      <span>{property.square_meters} m²</span>
                      <span>•</span>
                      <span>Kat {property.floor}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-heading text-xl font-bold text-primary">
                        {property.price?.toLocaleString('tr-TR')} {property.currency}
                      </div>
                      
                      <Link to={`/view/${property.id}`}>
                        <Button size="sm" className="rounded-full group-hover:bg-primary">
                          <Eye className="w-4 h-4 mr-1" />
                          Görüntüle
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-muted">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-2xl font-semibold text-primary mb-4">
            Bu daireler hakkında bilgi almak ister misiniz?
          </h2>
          <p className="text-muted-foreground mb-6">
            {group.company_name} ile iletişime geçin
          </p>
          <a href="tel:05514780259">
            <Button size="lg" className="rounded-full">
              <Phone className="w-5 h-5 mr-2" />
              0551 478 02 59
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="font-heading text-lg font-semibold text-primary">mekan360</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 mekan360. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
