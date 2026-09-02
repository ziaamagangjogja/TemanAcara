// src/pages/mitra/claim-profile.jsx (atau register.jsx)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { registerMitra } from "@/lib/mitraStore"; // Hanya butuh registerMitra
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { talents } from "@/data/mockData"; // Import data talent utama

export default function MitraRegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedTalentId, setSelectedTalentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAccount = async () => {
    // Validasi
    if (!selectedTalentId) {
      toast({ title: "Error", description: "Silakan pilih profil talent Anda.", variant: "destructive" });
      return;
    }
    if (!email || !password) {
      toast({ title: "Error", description: "Email dan password harus diisi.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Cari data talent yang dipilih
      const selectedTalent = talents.find(t => t.id === selectedTalentId);
      if (!selectedTalent) {
        throw new Error("Profil talent tidak ditemukan.");
      }

      // Panggil registerMitra dengan data talent yang sudah ada
      await registerMitra({
        email: email,
        password: password,
        name: selectedTalent.name,
        photo: selectedTalent.photo,
        talentId: selectedTalentId, // INI YANG TERPENTING
        phone: "",
      });
      
      toast({
        title: "Akun Berhasil Dibuat!",
        description: "Akun Anda sudah aktif. Silakan masuk.",
      });
      
      // Arahkan ke halaman login
      navigate("/mitra/login");
      
    } catch (error: any) {
      toast({
        title: "Gagal Membuat Akun",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <CardHeader className="text-center mb-6">
          <CardTitle className="text-2xl font-bold">Buat Akun Talent</CardTitle>
          <p className="text-muted-foreground">
            Buat akun login untuk profil Anda yang sudah terdaftar
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Pilih Profil Talent Anda</Label>
            <Select value={selectedTalentId} onValueChange={setSelectedTalentId}>
              <SelectTrigger>
                <SelectValue placeholder="Cari nama Anda di daftar..." />
              </SelectTrigger>
              <SelectContent>
                {talents.map((talent) => (
                  <SelectItem key={talent.id} value={talent.id}>
                    {talent.name} - {talent.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Ketik ulang password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleCreateAccount}
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : "Buat Akun Saya"}
          </Button>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Sudah punya akun?
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/mitra/login")}>
              Masuk di sini
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}