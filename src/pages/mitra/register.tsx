// src/pages/MitraRegister.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserPlus, X, Link, ImageOff, Clock, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { registerMitra } from "@/lib/mitraStore";
import { talents } from "@/data/mockData";

export default function MitraRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const profileImageRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    description: "",
    ktpLink: "", // Hanya KTP yang menggunakan link Google Drive
    age: "", // Tambahkan field umur
  });

  // Daftar kategori yang tersedia
  const categories = [
    "Travelling", "Nonton Film", "Kuliner", "Fotografi", "Gaming",
    "Musik", "Videografer", "Olahraga", "Membaca", "Seni",
    "Memasak", "Hiking", "Yoga", "Renang", "Basket",
    "Badminton", "Sepak Bola", "Karaoke", "Belanja", "Kopi",
    "Podcast", "Lainnya"
  ];

  // Fungsi untuk menangani perubahan input
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fungsi untuk menangani perubahan input nomor telepon (hanya angka)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Hanya mengizinkan angka
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, phone: numericValue }));
  };

  // Fungsi untuk menangani pemilihan kategori
  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  // Fungsi untuk menghapus kategori yang dipilih
  const removeCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };

  // Fungsi untuk memvalidasi format link Google Drive
  const isValidGDriveLink = (link: string) => {
    return (
      link.includes("drive.google.com/file/d/") ||
      link.includes("drive.google.com/open?id=")
    );
  };

  // Fungsi untuk menangani upload foto profil
  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi ukuran file (maksimal 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Upload Gagal",
          description: "Ukuran foto profil maksimal 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validasi tipe file
      if (!file.type.match('image.*')) {
        toast({
          title: "Upload Gagal",
          description: "Hanya file gambar yang diperbolehkan",
          variant: "destructive",
        });
        return;
      }

      // Buat preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fungsi untuk pendaftaran
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Registrasi Gagal",
        description: "Password tidak cocok",
        variant: "destructive",
      });
      return;
    }

    if (!profileImagePreview) {
      toast({
        title: "Registrasi Gagal",
        description: "Foto profil wajib diunggah",
        variant: "destructive",
      });
      return;
    }

    if (!formData.ktpLink) {
      toast({
        title: "Registrasi Gagal",
        description: "Link KTP wajib diisi",
        variant: "destructive",
      });
      return;
    }

    if (!isValidGDriveLink(formData.ktpLink)) {
      toast({
        title: "Registrasi Gagal",
        description: "Link KTP harus berupa link Google Drive yang valid",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Registrasi Gagal",
        description: "Pilih minimal satu kategori talent",
        variant: "destructive",
      });
      return;
    }

    // Validasi umur
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 17 || Number(formData.age) > 65) {
      toast({
        title: "Registrasi Gagal",
        description: "Umur harus diisi dengan angka antara 17-65 tahun",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await registerMitra({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        category: selectedCategories.join(", "),
        photo: profileImagePreview, // Simpan foto profil sebagai base64
        ktp: formData.ktpLink, // Simpan KTP sebagai link Google Drive
        age: parseInt(formData.age), // Tambahkan umur
        // Harga tidak disertakan karena akan ditentukan oleh admin
      });

      toast({
        title: "Registrasi Berhasil 🎉",
        description: "Akun Anda telah dibuat dan sedang menunggu verifikasi admin. Anda akan menerima email dalam 1x24 jam.",
      });

      navigate("/mitra/login");
    } catch (err: any) {
      toast({
        title: "Registrasi Gagal",
        description: err.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Daftar Talent Baru</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Hanya untuk talent yang belum terdaftar
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Informasi Pribadi Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Informasi Pribadi</h2>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@contoh.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Konfirmasi password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Umur</Label>
              <Input
                id="age"
                type="number"
                placeholder="Masukkan umur (17-65 tahun)"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                min="17"
                max="65"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Masukkan nomor telepon"
                value={formData.phone}
                onChange={handlePhoneChange}
                required
              />
              <p className="text-xs text-muted-foreground">Hanya angka yang diperbolehkan</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                placeholder="Masukkan alamat lengkap"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Informasi Talent Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Informasi Talent</h2>
            
            <div className="space-y-2">
              <Label>Hobi Talent (Pilih satu atau lebih)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {categories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm font-normal">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
              
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCategories.map((category) => (
                    <Badge key={category} variant="secondary" className="gap-1 pr-1">
                      {category}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="ml-1 rounded-full hover:bg-secondary-80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Diri</Label>
              <Textarea
                id="description"
                placeholder="Ceritakan tentang diri Anda"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Field harga dihapus karena akan ditentukan oleh admin */}
          </div>

          {/* Upload Dokumen Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Dokumen</h2>
            
            {/* Upload Foto Profil */}
            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Foto Profil</Label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profileImagePreview ? (
                    <img 
                      src={profileImagePreview} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <UserPlus className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="profilePhoto"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    ref={profileImageRef}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profileImageRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Pilih Foto
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: JPG, PNG. Maksimal: 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Link KTP Google Drive */}
            <div className="space-y-2">
              <Label htmlFor="ktpLink">Link KTP (Google Drive)</Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="ktpLink"
                  placeholder="https://drive.google.com/file/d/..."
                  className="pl-10"
                  value={formData.ktpLink}
                  onChange={(e) => handleInputChange("ktpLink", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Informasi Verifikasi */}
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Proses Verifikasi</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Setelah mendaftar, akun Anda akan diverifikasi oleh admin dalam waktu 1x24 jam. 
                  Harga akan ditentukan oleh admin setelah verifikasi disetujui.
                  Anda akan menerima email konfirmasi setelah proses verifikasi selesai.
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Mendaftar..." : "Daftar Talent"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/mitra/login")}>
            Kembali ke Login
          </Button>
        </div>
      </Card>
    </div>
  );
}