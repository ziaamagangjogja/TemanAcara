// src/pages/MitraLogin.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { loginMitra, getCurrentMitra } from "@/lib/mitraStore";

export default function MitraLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // PERBAIKAN: Tambahkan pengecekan status login saat komponen dimuat
  useEffect(() => {
    const isMitraAuthenticated = localStorage.getItem("mitraAuthenticated");
    const currentMitra = getCurrentMitra();
    
    // Jika sudah login, arahkan ke dashboard
    if (isMitraAuthenticated === "true" && currentMitra) {
      navigate("/mitra/dashboard");
    }
  }, [navigate]);

  // Di dalam src/pages/MitraLogin.tsx

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.email || !formData.password) {
    toast({
      title: "Login Gagal",
      description: "Email dan password wajib diisi",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);

  try {
    const loggedInMitra = await loginMitra({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });

    // *** PERBAIKAN KRUSIAL: Cek status verifikasi sebelum melanjutkan ***
    if (loggedInMitra.verificationStatus === "pending") {
      toast({
        title: "Akun Menunggu Verifikasi",
        description: "Akun Anda sedang dalam proses verifikasi oleh admin. Silakan cek email Anda atau hubungi admin.",
        variant: "destructive",
      });
      setIsLoading(false);
      return; // *** HENTIKAN PROSES LOGIN DI SINI ***
    }

    if (loggedInMitra.verificationStatus === "rejected") {
      toast({
        title: "Akun Ditolak",
        description: "Pendaftaran Anda ditolak oleh admin. Silakan hubungi admin untuk informasi lebih lanjut.",
        variant: "destructive",
      });
      setIsLoading(false);
      return; // *** HENTIKAN PROSES LOGIN DI SINI ***
    }

    // Jika statusnya 'approved', lanjutkan proses login
    localStorage.removeItem("rentmate_current_username");
    localStorage.removeItem("rentmate_current_user");
    localStorage.removeItem("mitraAuthenticated");
    localStorage.setItem("mitraAuthenticated", "true");
    localStorage.setItem("rentmate_current_mitra", JSON.stringify(loggedInMitra)); // Simpan data lengkap

    toast({
      title: "Login Berhasil 🎉",
      description: "Selamat datang kembali!",
    });

    setTimeout(() => {
      navigate("/mitra/dashboard");
    }, 300);
  } catch (error: any) {
    toast({
      title: "Login Gagal",
      description:
        error.message ||
        "Email tidak terdaftar atau akun Anda belum diverifikasi.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-orange">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Login Talent</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Talent lama langsung login, tanpa daftar ulang
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@contoh.com"
                className="pl-11"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-11 pr-11"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2"
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

          <Button
            type="submit"
            className="w-full"
            variant="hero"
            disabled={isLoading}
          >
            {isLoading ? "Masuk..." : "Masuk"}
          </Button>
        </form>

        {/* FOOTER */}
        <div className="mt-6 pt-6 border-t text-center space-y-4">
          <p className="text-xs text-muted-foreground">
            ⚠️ Pendaftaran hanya untuk talent baru.  
            Talent lama cukup login menggunakan akun yang sudah ada.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/mitra/register")}
          >
            Daftar Talent Baru
          </Button>
        </div>
      </Card>
    </div>
  );
}