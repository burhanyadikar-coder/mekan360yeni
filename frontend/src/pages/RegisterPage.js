import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Building2, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.companyName, formData.phone);
      toast.success('Hesabınız başarıyla oluşturuldu');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Kayıt başarısız';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Image */}
      <div 
        className="hidden lg:block bg-cover bg-center relative order-2 lg:order-1"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1627383837679-6488f58969d5?crop=entropy&cs=srgb&fm=jpg&q=85')` }}
      >
        <div className="absolute inset-0 bg-primary/60" />
        <div className="absolute top-16 left-16 right-16 z-10">
          <h2 className="font-heading text-4xl font-light text-white mb-6">
            Gayrimenkul Tanıtımında<br />
            <span className="font-semibold text-gold">Yeni Nesil</span>
          </h2>
          <ul className="space-y-4 text-white/80">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/30 flex items-center justify-center">
                <span className="text-gold text-sm">✓</span>
              </div>
              360° Panoramik Görüntüleme
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/30 flex items-center justify-center">
                <span className="text-gold text-sm">✓</span>
              </div>
              Güneş Simülasyonu
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/30 flex items-center justify-center">
                <span className="text-gold text-sm">✓</span>
              </div>
              Detaylı Ziyaretçi Analitikleri
            </li>
          </ul>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-8 lg:p-16 order-1 lg:order-2">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-12" data-testid="register-logo">
              <Building2 className="w-8 h-8 text-primary" />
              <span className="font-heading text-xl font-semibold text-primary">HomeView Pro</span>
            </Link>
            
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-primary mb-3">
              Hesap Oluşturun
            </h1>
            <p className="text-muted-foreground">
              Ücretsiz hesabınızı oluşturun ve hemen başlayın.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-foreground">
                Firma / Kişi Adı
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="Firma veya kişi adınız"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="pl-11 h-12 border-border focus:border-primary"
                  required
                  data-testid="register-company-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Adresi
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-11 h-12 border-border focus:border-primary"
                  required
                  data-testid="register-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Telefon (Opsiyonel)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-11 h-12 border-border focus:border-primary"
                  data-testid="register-phone-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Şifre
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-11 h-12 border-border focus:border-primary"
                    required
                    data-testid="register-password-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Şifre Tekrar
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-11 h-12 border-border focus:border-primary"
                    required
                    data-testid="register-confirm-password-input"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full text-sm font-medium tracking-wide mt-2"
              data-testid="register-submit-btn"
            >
              {loading ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline" data-testid="login-link">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
