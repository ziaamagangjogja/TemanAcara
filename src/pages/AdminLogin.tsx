import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error("Email atau password admin salah!");
    }

    sessionStorage.setItem("adminAuthenticated", "true");
    toast({
      title: "Login Berhasil",
      description: "Selamat datang di Admin Dashboard",
    });
    navigate("/admin");
  } catch (error) {
    toast({
      title: "Login Gagal",
      description: error instanceof Error ? error.message : "Server tidak tersedia.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-orange">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Masuk ke Panel Administrasi RentMate
          </p>
        </div>

        {/* Notice */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Akses Terbatas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Halaman ini hanya untuk administrator. Jika Anda adalah pengguna biasa, silakan kembali ke halaman utama.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email Admin</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="admin@rentmate.com"
                className="pl-11"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
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
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            {isLoading ? "Memproses..." : "Masuk sebagai Admin"}
          </Button>
        </form>

        {/* Back to user site */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Bukan administrator?
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            Kembali ke Halaman Utama
          </Button>
        </div>
      </Card>
    </div>
  );
}
