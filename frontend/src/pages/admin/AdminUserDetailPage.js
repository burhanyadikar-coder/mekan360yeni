import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Shield, ArrowLeft, User, Mail, Phone, Building, CreditCard, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  expired: 'bg-red-500/20 text-red-400'
};

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users/${id}`);
      setUser(response.data);
      setFormData({
        email: response.data.email,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        company_name: response.data.company_name,
        phone: response.data.phone,
        package: response.data.package,
        subscription_status: response.data.subscription_status
      });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      } else {
        toast.error('Kullanıcı bilgileri yüklenemedi');
        navigate('/admin/users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/admin/users/${id}`, formData);
      toast.success('Kullanıcı bilgileri güncellendi');
      fetchUser();
    } catch (error) {
      toast.error('Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
        <div className="animate-pulse text-white font-heading text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-emerald-950">
      {/* Header */}
      <header className="bg-emerald-900/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/admin/users">
                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-gold" />
                <span className="font-heading text-xl font-semibold text-white">Kullanıcı Detayı</span>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-12 py-8">
        <div className="grid gap-6">
          {/* User Info Card */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-gold" />
                Kullanıcı Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">İsim</Label>
                  <Input
                    value={formData.first_name || ''}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    data-testid="edit-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Soyisim</Label>
                  <Input
                    value={formData.last_name || ''}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    data-testid="edit-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="pl-11 bg-white/10 border-white/20 text-white"
                    data-testid="edit-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Telefon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="pl-11 bg-white/10 border-white/20 text-white"
                      data-testid="edit-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Şirket</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      value={formData.company_name || ''}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                      className="pl-11 bg-white/10 border-white/20 text-white"
                      data-testid="edit-company"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Paket</Label>
                  <Select value={formData.package} onValueChange={(v) => handleChange('package', v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="edit-package">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Başlangıç (₺700/ay)</SelectItem>
                      <SelectItem value="premium">Premium (₺1.000/ay)</SelectItem>
                      <SelectItem value="ultra">Ultra (₺2.000/ay)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Abonelik Durumu</Label>
                  <Select value={formData.subscription_status} onValueChange={(v) => handleChange('subscription_status', v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gold text-white hover:bg-gold-hover rounded-full"
                data-testid="save-user-btn"
              >
                {saving ? 'Kaydediliyor...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Kaydet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gold" />
                Ödeme Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.payments && user.payments.length > 0 ? (
                <div className="space-y-3">
                  {user.payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium">₺{payment.amount}</p>
                        <p className="text-white/50 text-sm">
                          {new Date(payment.payment_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <Badge className={payment.status === 'completed' ? 'bg-green-500/20 text-green-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
                        {payment.status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-8">Henüz ödeme kaydı yok</p>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Kayıt Tarihi</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Gayrimenkul</p>
                  <p className="text-white font-medium mt-1">{user.property_count || 0}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Abonelik Bitiş</p>
                  <p className="text-white font-medium mt-1">
                    {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Otomatik Ödeme</p>
                  <p className="text-white font-medium mt-1">
                    {user.auto_payment ? 'Aktif' : 'Kapalı'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
