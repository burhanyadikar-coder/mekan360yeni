import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Building2, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Şifreniz başarıyla güncellendi');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      const message = error.response?.data?.detail || 'Bir hata oluştu';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/40">
          <CardContent className="p-8 text-center">
            <h2 className="font-heading text-2xl font-semibold text-destructive mb-2">
              Geçersiz Link
            </h2>
            <p className="text-muted-foreground mb-6">
              Bu şifre sıfırlama linki geçersiz veya süresi dolmuş.
            </p>
            <Link to="/forgot-password">
              <Button className="rounded-full">
                Yeni Link İste
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/40">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
              Şifre Güncellendi
            </h2>
            <p className="text-muted-foreground">
              Yeni şifrenizle giriş yapabilirsiniz. Yönlendiriliyorsunuz...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-3 mb-8">
            <Building2 className="w-10 h-10 text-primary" />
            <span className="font-heading text-2xl font-semibold text-primary">HomeView Pro</span>
          </Link>
          
          <h1 className="font-heading text-3xl font-semibold text-primary mb-2">
            Yeni Şifre Belirle
          </h1>
          <p className="text-muted-foreground">
            Yeni şifrenizi girin.
          </p>
        </div>

        <Card className="border-border/40">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Yeni Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="En az 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12"
                    required
                    data-testid="new-password-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Şifreyi tekrar girin"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-11 h-12"
                    required
                    data-testid="confirm-new-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full"
                data-testid="reset-submit-btn"
              >
                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
