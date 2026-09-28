import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/userStore";


export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.email && formData.password.length >= 6) {
      const usernameOnly = formData.email.split("@")[0];

      try {
        if (isLogin) {
          localStorage.removeItem("rentmate_current_username");
          localStorage.removeItem("mitraAuthenticated");
          localStorage.removeItem("rentmate_current_mitra");
          localStorage.removeItem("rentmate_current_user");

          // 1. Coba login sebagai regular User.
          //    Bisa pakai email ATAU username (banyak user mengingat username).
          const identifier = formData.email.trim();
          const candidates = [
            `/api/users/by-email/${encodeURIComponent(identifier)}`,
            `/api/users/${encodeURIComponent(identifier)}`,
          ];

          let userResponse: Response | null = null;
          for (const url of candidates) {
            const res = await fetch(url);
            if (res.ok) {
              userResponse = res;
              break;
            }
          }

          if (userResponse) {
            const data = await userResponse.json();

            // Verifikasi password. Akun lama yang password-nya masih kosong
            // tetap boleh masuk agar tidak mengunci user yang sudah terdaftar.
            const storedPassword = String(data.password ?? "");
            if (storedPassword !== "" && storedPassword !== formData.password) {
              toast({
                title: "Login Gagal",
                description: "Kata sandi salah. Silakan coba lagi.",
                variant: "destructive",
              });
              setIsLoading(false);
              return;
            }

            localStorage.setItem("rentmate_current_username", data.username);
            localStorage.setItem("rentmate_current_user", JSON.stringify(data));
            window.dispatchEvent(new CustomEvent("userUpdated"));

            toast({
              title: "Login Berhasil! 🎉",
              description: "Selamat datang kembali di RentMate",
            });

            setTimeout(() => {
              navigate("/profile", { replace: true });
            }, 300);
            setIsLoading(false);
            return;
          }

          // 2. Jika tidak ditemukan di tabel users, coba login sebagai Mitra
          const mitraRes = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
          });

          if (mitraRes.ok) {
            const result = await mitraRes.json();
            const mitraUser = {
              ...result.user,
              talentId: result.user.talentId || result.user.id || result.user.user_id,
              isOnline: true,
              lastActive: new Date().toISOString(),
            };
            localStorage.setItem("mitraAuthenticated", "true");
            localStorage.setItem("rentmate_current_mitra", JSON.stringify(mitraUser));

            toast({
              title: "Login Mitra Berhasil! 🎉",
              description: "Selamat datang kembali di Portal Mitra RentMate",
            });

            setTimeout(() => {
              navigate("/mitra/dashboard", { replace: true });
            }, 300);
            setIsLoading(false);
            return;
          } else {
            const errorData = await mitraRes.json().catch(() => null);
            if (errorData && errorData.message && errorData.message.includes('belum disetujui')) {
              toast({
                title: "Akun Menunggu Verifikasi",
                description: "Akun Mitra Anda belum disetujui oleh admin. Silakan tunggu persetujuan.",
                variant: "destructive",
              });
              setIsLoading(false);
              return;
            }
          }

          // 3. Jika tidak ditemukan di manapun
          toast({
            title: "Login Gagal",
            description: "Email atau password salah / Akun belum terdaftar.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        } else {
          localStorage.removeItem("rentmate_current_username");
          localStorage.removeItem("mitraAuthenticated");
          localStorage.removeItem("rentmate_current_mitra");
          localStorage.removeItem("rentmate_current_user");

          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name || usernameOnly,
              username: usernameOnly,
              email: formData.email,
              password: formData.password,
              phone: "",
              bio: "",
              city: "",
              hobbies: "",
              preference: "online",
              photo: `https://api.dicebear.com/7.x/initials/svg?seed=${usernameOnly}`,
              wallet: 0,
            })
          });

          if (!response.ok) {
            toast({
              title: "Pendaftaran Gagal",
              description: "Username atau email sudah digunakan.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          const data = await response.json();

          localStorage.setItem("rentmate_current_username", usernameOnly);
          localStorage.setItem("rentmate_current_user", JSON.stringify(data));
        }

        window.dispatchEvent(new CustomEvent("userUpdated"));

        toast({
          title: isLogin ? "Login Berhasil! 🎉" : "Pendaftaran Berhasil! 🎉",
          description: isLogin
            ? "Selamat datang kembali di RentMate"
            : "Akun kamu berhasil dibuat.",
        });

        setTimeout(() => {
          navigate("/profile", { replace: true });
        }, 500);
      } catch (err) {
        toast({
          title: "Error",
          description: "Terjadi kesalahan server.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: isLogin ? "Login Gagal" : "Pendaftaran Gagal",
        description: "Pastikan email terisi dan password minimal 6 karakter.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleSocialLogin = async (provider: string) => {
    // Menonaktifkan dummy social login yang membuat data bentrok
    toast({
      title: "Fitur Belum Tersedia",
      description: `Login dengan ${provider} sedang dalam tahap pengembangan. Silakan gunakan email untuk saat ini.`,
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4 pt-20 md:pt-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-card-hover animate-fade-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-orange">
                <span className="text-primary-foreground font-bold text-xl">R</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold">
              {isLogin ? "Selamat Datang Kembali!" : "Buat Akun Baru"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isLogin
                ? "Masuk ke akun RentMate kamu"
                : "Daftar untuk mulai menggunakan RentMate"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    className="pl-11"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required={!isLogin}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  className="pl-11"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  className="pl-11 pr-11"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <a href="#" className="text-sm text-primary hover:underline">
                  Lupa kata sandi?
                </a>
              </div>
            )}

            <Button 
              variant="hero" 
              size="lg" 
              className="w-full group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                <>
                  {isLogin ? "Masuk" : "Daftar"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full gap-3"
              onClick={() => handleSocialLogin("Google")}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Lanjutkan dengan Google
            </Button>
          </div>

          {/* Toggle Login/Register */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isLoading}
            >
              {isLogin ? "Daftar sekarang" : "Masuk"}
            </button>
          </p>
        </Card>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}