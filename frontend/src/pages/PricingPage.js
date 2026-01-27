import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Building2, Check, ArrowRight, Crown } from 'lucide-react';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Başlangıç',
    price: 700,
    description: 'Yeni başlayanlar için ideal',
    features: [
      '10 gayrimenkul ekleme',
      'Düz fotoğraf koleksiyonu',
      'İnteraktif haritalama (kroki)',
      'Şirket adı ekleme',
      'Güneş simülasyonu',
      'Temel analitikler'
    ],
    notIncluded: [
      '360° panoramik görüntüleme',
      'Çevre bilgisi ekleme'
    ],
    highlight: false
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1000,
    description: 'Profesyoneller için en popüler',
    features: [
      '50 gayrimenkul ekleme',
      'Düz fotoğraf koleksiyonu',
      '360° panoramik görüntüleme *',
      'İnteraktif haritalama (kroki)',
      'Çevre bilgisi ekleme (okul, market, durak vb.)',
      'm² ve tüm gayrimenkul özellikleri',
      'Şirket adı ekleme',
      'Güneş simülasyonu',
      'Detaylı ziyaretçi analitikleri'
    ],
    notIncluded: [],
    note: '* 360° fotoğrafların kullanıcı tarafından çekilip yüklenmesi gerekmektedir',
    highlight: true
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 2000,
    description: 'Kurumsal firmalar için sınırsız',
    features: [
      'Sınırsız gayrimenkul ekleme',
      'Tüm Premium özellikler dahil',
      'Öncelikli teknik destek',
      'Özel müşteri temsilcisi'
    ],
    notIncluded: [],
    highlight: false
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <Building2 className="w-8 h-8 text-primary" />
              <span className="font-heading text-xl font-semibold text-primary">HomeView Pro</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-primary hover:text-primary/80" data-testid="login-nav-btn">
                  Giriş Yap
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6" data-testid="register-nav-btn">
                  Üyelik Satın Al
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-light text-white mb-4">
            Size Uygun <span className="font-semibold text-gold">Paketi</span> Seçin
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            İhtiyacınıza göre paket seçin, hemen başlayın. Tüm paketler aylık abonelik şeklindedir.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 lg:py-24 -mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PACKAGES.map((pkg) => (
              <Card 
                key={pkg.id}
                className={`relative border-2 transition-all hover:-translate-y-2 hover:shadow-xl ${
                  pkg.highlight 
                    ? 'border-gold shadow-lg scale-105 z-10' 
                    : 'border-border/40'
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gold text-white text-sm font-medium rounded-full flex items-center gap-1">
                    <Crown className="w-4 h-4" />
                    En Popüler
                  </div>
                )}
                
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="font-heading text-2xl font-semibold text-foreground mb-2">
                      {pkg.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      {pkg.description}
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`font-heading text-5xl font-bold ${pkg.highlight ? 'text-gold' : 'text-primary'}`}>
                        ₺{pkg.price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/ay</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          pkg.highlight ? 'bg-gold/20' : 'bg-primary/10'
                        }`}>
                          <Check className={`w-3 h-3 ${pkg.highlight ? 'text-gold' : 'text-primary'}`} />
                        </div>
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                    {pkg.notIncluded.map((feature, i) => (
                      <li key={`not-${i}`} className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-muted">
                          <span className="text-xs text-muted-foreground">✕</span>
                        </div>
                        <span className="text-muted-foreground line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {pkg.note && (
                    <p className="text-xs text-amber-600 mb-6 p-3 bg-amber-50 rounded-lg">
                      {pkg.note}
                    </p>
                  )}

                  <Link to={`/register?package=${pkg.id}`}>
                    <Button 
                      className={`w-full rounded-full h-12 ${
                        pkg.highlight 
                          ? 'bg-gold text-white hover:bg-gold-hover' 
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                      data-testid={`buy-${pkg.id}-btn`}
                    >
                      Üyelik Satın Al
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24 bg-muted">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-heading text-3xl font-semibold text-primary text-center mb-12">
            Sıkça Sorulan Sorular
          </h2>
          
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border border-border/40">
              <h3 className="font-heading font-semibold text-foreground mb-2">
                Aboneliğimi istediğim zaman iptal edebilir miyim?
              </h3>
              <p className="text-muted-foreground">
                Evet, aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal ettiğinizde mevcut dönemin sonuna kadar hizmet almaya devam edersiniz.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border/40">
              <h3 className="font-heading font-semibold text-foreground mb-2">
                360° fotoğrafları nasıl çekeceğim?
              </h3>
              <p className="text-muted-foreground">
                360° fotoğraflar için özel kamera veya akıllı telefon uygulamaları (Google Street View, Insta360 vb.) kullanabilirsiniz. Çektiğiniz panoramik fotoğrafları sisteme yükleyebilirsiniz.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border/40">
              <h3 className="font-heading font-semibold text-foreground mb-2">
                Paket yükseltme yapabilir miyim?
              </h3>
              <p className="text-muted-foreground">
                Evet, istediğiniz zaman daha üst bir pakete geçiş yapabilirsiniz. Fark ücreti orantılı olarak hesaplanır.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border/40">
              <h3 className="font-heading font-semibold text-foreground mb-2">
                Ziyaretçi bilgilerini nasıl göreceğim?
              </h3>
              <p className="text-muted-foreground">
                Gayrimenkullerinizi görüntüleyen her ziyaretçi önce isim ve telefon bilgilerini girmek zorundadır. Bu bilgiler dashboard'unuzdaki analitikler bölümünde görüntülenebilir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-emerald-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-light text-white mb-4">
            Hemen Başlamaya Hazır mısınız?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Size uygun paketi seçin ve gayrimenkullerinizi premium seviyede tanıtmaya başlayın.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-gold text-white hover:bg-gold-hover rounded-full px-10 h-14 text-base font-medium">
              Üyelik Satın Al
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="font-heading text-lg font-semibold text-primary">HomeView Pro</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 HomeView Pro. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
