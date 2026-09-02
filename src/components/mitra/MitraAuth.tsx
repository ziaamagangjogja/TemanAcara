import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  Upload,
  CheckCircle,
  AlertCircle,
  Camera,
  Shield
} from 'lucide-react';
import { talents } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

// TYPES LANGSUNG DI SINI
interface MitraAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  photo: string;
  talentId: string;
  isVerified: boolean;
  verificationDocuments: {
    ktp: string | null;
    kk: string | null;
    selfie: string | null;
    sim: string | null;
  };
  isOnline: boolean;
  lastActive: string;
  earnings: number;
  rating: number;
  totalBookings: number;
  createdAt: string;
}

interface MitraRegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  talentId: string;
  photo: string;
}

interface MitraLoginData {
  email: string;
  password: string;
}

// STATE MANAGEMENT LANGSUNG DI SINI
let mitraAccounts: MitraAccount[] = [];
let currentMitra: MitraAccount | null = null;

function loadMitraAccounts(): void {
  try {
    const saved = localStorage.getItem('rentmate_mitra_accounts');
    if (saved) {
      mitraAccounts = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load mitra accounts:', error);
    mitraAccounts = [];
  }
}

function saveMitraAccounts(): void {
  try {
    localStorage.setItem('rentmate_mitra_accounts', JSON.stringify(mitraAccounts));
  } catch (error) {
    console.error('Failed to save mitra accounts:', error);
  }
}

loadMitraAccounts();

export function isEmailRegistered(email: string): boolean {
  return mitraAccounts.some(m => m.email === email);
}

export function doesTalentHaveAccount(talentId: string): boolean {
  return mitraAccounts.some(m => m.talentId === talentId && m.isVerified);
}

export function registerMitra(data: MitraRegistrationData): MitraAccount | null {
  if (data.password !== data.confirmPassword) {
    throw new Error('Password tidak cocok');
  }

  if (isEmailRegistered(data.email)) {
    throw new Error('Email sudah terdaftar');
  }

  if (doesTalentHaveAccount(data.talentId)) {
    throw new Error('Talent ini sudah memiliki akun mitra');
  }

  const talent = talents.find(t => t.id === data.talentId);
  if (!talent) {
    throw new Error('Talent tidak ditemukan');
  }

  const newMitra: MitraAccount = {
    id: `mitra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: data.email,
    password: data.password,
    name: data.name,
    phone: data.phone,
    photo: data.photo || talent.photo,
    talentId: data.talentId,
    isVerified: false,
    verificationDocuments: {
      ktp: null,
      kk: null,
      selfie: null,
      sim: null,
    },
    isOnline: false,
    lastActive: new Date().toISOString(),
    earnings: 0,
    rating: 0,
    totalBookings: 0,
    createdAt: new Date().toISOString(),
  };

  mitraAccounts.push(newMitra);
  saveMitraAccounts();

  return newMitra;
}

export function loginMitra(data: MitraLoginData): MitraAccount | null {
  const mitra = mitraAccounts.find(m => 
    m.email === data.email && 
    m.password === data.password &&
    m.isVerified
  );

  if (mitra) {
    currentMitra = mitra;
    mitra.isOnline = true;
    mitra.lastActive = new Date().toISOString();
    saveMitraAccounts();
    return mitra;
  }

  return null;
}

export function logoutMitra(): void {
  if (currentMitra) {
    currentMitra.isOnline = false;
    currentMitra.lastActive = new Date().toISOString();
    saveMitraAccounts();
  }
  currentMitra = null;
}

export function getCurrentMitra(): MitraAccount | null {
  return currentMitra;
}

export function getMitraByTalentId(talentId: string): MitraAccount | null {
  return mitraAccounts.find(m => m.talentId === talentId && m.isVerified) || null;
}

// KOMPONEN UTAMA
interface MitraAuthProps {
  defaultMode?: 'login' | 'register';
}

export default function MitraAuth({ defaultMode = 'login' }: MitraAuthProps) {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') as 'login' | 'register' || defaultMode
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState<MitraLoginData>({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState<MitraRegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    talentId: '',
    photo: '',
  });

  const availableTalents = talents.filter(talent => !doesTalentHaveAccount(talent.id));

  useEffect(() => {
    setErrors({});
  }, [mode]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, photo: 'Ukuran foto maksimal 5MB' });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, photo: 'File harus berupa gambar' });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setRegisterData({ ...registerData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
      setErrors({ ...errors, photo: '' });
    }
  };

  const validateLogin = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!loginData.email) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.email = 'Email tidak valid';
    }

    if (!loginData.password) {
      newErrors.password = 'Password wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!registerData.email) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      newErrors.email = 'Email tidak valid';
    }

    if (!registerData.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (registerData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    if (!registerData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }

    if (!registerData.name) {
      newErrors.name = 'Nama wajib diisi';
    }

    if (!registerData.phone) {
      newErrors.phone = 'Nomor telepon wajib diisi';
    } else if (!/^\d{10,13}$/.test(registerData.phone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Nomor telepon tidak valid';
    }

    if (!registerData.talentId) {
      newErrors.talentId = 'Pilih talent terlebih dahulu';
    }

    if (!registerData.photo) {
      newErrors.photo = 'Foto wajib diupload';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLogin()) return;

    setIsLoading(true);
    try {
      const mitra = loginMitra(loginData);
      
      if (mitra) {
        toast({
          title: "Login Berhasil",
          description: `Selamat datang kembali, ${mitra.name}!`,
        });
        
        sessionStorage.setItem('mitraAuthenticated', 'true');
        sessionStorage.setItem('currentMitraId', mitra.id);
        
        navigate('/mitra/dashboard');
      } else {
        setErrors({ 
          login: 'Email atau password salah, atau akun belum diverifikasi' 
        });
      }
    } catch (error) {
      setErrors({ 
        login: 'Terjadi kesalahan saat login. Silakan coba lagi.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegister()) return;

    setIsLoading(true);
    try {
      const mitra = registerMitra(registerData);
      
      if (mitra) {
        toast({
          title: "Pendaftaran Berhasil",
          description: "Akun Anda telah dibuat. Silakan lengkapi data verifikasi.",
        });
        
        sessionStorage.setItem('mitraAuthenticated', 'true');
        sessionStorage.setItem('currentMitraId', mitra.id);
        
        navigate('/mitra/verification');
      }
    } catch (error: any) {
      setErrors({ 
        register: error.message || 'Terjadi kesalahan saat mendaftar' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className={`w-full ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Hero section dengan orange accent */}
        <div className="w-16 h-16 bg-gradient-hero rounded-xl flex items-center justify-center mx-auto mb-4 shadow-orange">
          <Shield className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-center">Portal Mitra</h1>
        <p className="text-muted-foreground text-center mt-2">
          {mode === 'login' ? 'Masuk ke akun mitra Anda' : 'Daftar sebagai mitra RentMate'}
        </p>
        
        <Card className="p-8">
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="gap-2">
                <LogIn className="w-4 h-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Daftar
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                {errors.login && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.login}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="email@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="login-password">Password</Label>
                    <Button variant="link" size="sm" className="px-0 h-auto">
                      Lupa password?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Memproses..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                {errors.register && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.register}</AlertDescription>
                  </Alert>
                )}

                {/* Responsive Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Personal Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Informasi Pribadi</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nama Lengkap</Label>
                      <Input
                        id="register-name"
                        placeholder="Masukkan nama lengkap"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Nomor Telepon</Label>
                      <Input
                        id="register-phone"
                        placeholder="08xxxxxxxxxx"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className={errors.phone ? 'border-red-500' : ''}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="email@example.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Minimal 6 karakter"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-500">{errors.password}</p>
                      )}
                    </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password">Konfirmasi Password</Label>
                        <div className="relative">
                          <Input
                            id="register-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Ulangi password"
                            value={registerData.confirmPassword}
                            onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                            className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Talent Selection & Photo */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Pilih Talent</h3>
                    
                    {availableTalents.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Semua talent sudah memiliki akun mitra.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {availableTalents.map((talent) => (
                          <Card
                            key={talent.id}
                            className={`p-3 cursor-pointer transition-all ${
                              registerData.talentId === talent.id
                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                : 'border-input hover:border-primary/50'
                            }`}
                            onClick={() => {
                              setRegisterData({ ...registerData, talentId: talent.id });
                              setErrors({ ...errors, talentId: '' });
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={talent.photo}
                                alt={talent.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <p className="font-medium">{talent.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {talent.city} • {talent.age} thn
                                </p>
                                <Badge variant="secondary" className="mt-1">
                                  {formatPrice(talent.pricePerHour)}/jam
                                </Badge>
                              </div>
                              {registerData.talentId === talent.id && (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                    {errors.talentId && (
                      <p className="text-sm text-red-500">{errors.talentId}</p>
                    )}

                    <h3 className="font-semibold text-lg mt-6">Foto Profil</h3>
                    
                    // Di dalam TabsContent register, bagian foto upload:
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview foto profil"
                            className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-input">
                            <Camera className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <Label htmlFor="photo-upload" className="sr-only">
                          Upload Foto Profil
                        </Label>
                        <input
                          type="file"
                          id="photo-upload"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          aria-label="Upload foto profil"
                          aria-describedby="photo-upload-description"
                          title="Upload foto profil mitra"
                          placeholder="Pilih file foto"
                        />
                        <Label
                          htmlFor="photo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              document.getElementById('photo-upload')?.click();
                            }
                          }}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Foto
                        </Label>
                        <p id="photo-upload-description" className="text-sm text-muted-foreground mt-2">
                          Format: JPG, PNG. Maksimal: 5MB
                        </p>
                        {errors.photo && (
                          <p id="photo-upload-error" className="text-sm text-red-500 mt-1">{errors.photo}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || availableTalents.length === 0}
                >
                  {isLoading ? "Memproses..." : "Daftar Sekarang"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}