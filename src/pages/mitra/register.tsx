import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserPlus, X, Link, ImageOff, Clock, Upload, CheckCircle2, Info, FileText, Image, Trash2, ExternalLink, Check, Plus, Sparkles, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { registerMitra } from "@/lib/mitraStore";
import { getCurrentUser } from "@/lib/userStore";
import { talents } from "@/data/mockData";
import { saveCurrentMitraSession } from "@/lib/storageHelper";
import { CitySelect } from "@/components/CitySelect";

const DEFAULT_HOBBIES = [
  "Kuliner & Kafe",
  "Nonton Film",
  "Travelling",
  "Belanja",
  "Musik & Konser",
  "Gaming Kasual",
  "Olahraga",
  "Membaca",
  "Karaoke",
  "Fotografi Santai",
  "Seni & Pameran",
  "Memasak",
];

const SPECIALIST_SKILLS = [
  "Fotografer Pro",
  "Videografer & Editor",
  "Pro Gamer / Coach",
  "Tour Guide / Pemandu",
  "Musisi / Vokalis",
  "MC / Host Acara",
  "Personal Trainer",
  "Penerjemah Bahasa",
];

const SERVICE_TYPE_DETAILS: Record<string, {
  title: string;
  description: string;
  examples: string;
  suggestedPrice: string;
}> = {
  kasual: {
    title: "Teman Kasual & Santai",
    description: "Fokus pada aktivitas santai sehari-hari untuk teman ngobrol, eksplorasi kuliner, ngopi di kafe, nonton film di bioskop, atau jalan-jalan santai di mall/taman kota.",
    examples: "Teman ngopi, kulineran, nonton bioskop, shopping buddy, jalan santai.",
    suggestedPrice: "Rp 200.000 - Rp 250.000",
  },
  acara: {
    title: "Pendamping Acara & Sosial",
    description: "Menemani klien menghadiri acara semi-formal atau perayaan sosial agar klien memiliki partner yang nyaman, percaya diri, dan sopan di depan umum.",
    examples: "Kondangan pernikahan, partner wisuda, gathering kantor, reuni keluarga/teman, pesta.",
    suggestedPrice: "Rp 250.000 - Rp 350.000",
  },
  spesialis: {
    title: "Keahlian Khusus & Spesialis",
    description: "Layanan berbasis keahlian spesifik yang Anda kuasai, membutuhkan keterampilan praktis khusus untuk memandu atau mendampingi klien.",
    examples: "Pemandu wisata/tour guide lokal, fotografer hunting foto, partner olahraga/gym, mabar game.",
    suggestedPrice: "Rp 350.000 - Rp 450.000",
  },
};

export default function MitraRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const profileImageRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasUserProfile, setHasUserProfile] = useState(false);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customHobbies, setCustomHobbies] = useState<string[]>([]);
  const [isAddingCustomHobby, setIsAddingCustomHobby] = useState(false);
  const [customHobbyInput, setCustomHobbyInput] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<string | null>(null);
  const [portfolioFileName, setPortfolioFileName] = useState<string | null>(null);
  const [portfolioPreview, setPortfolioPreview] = useState<string | null>(null);
  const [portfolioLink, setPortfolioLink] = useState<string>("");
  const portfolioFileRef = useRef<HTMLInputElement>(null);

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
    experienceLevel: "acara",
    priceExpectation: "Rp 250.000 - Rp 350.000",
    socialMedia: "",
  });

  useEffect(() => {
    let isActive = true;

    const fillFromUserProfile = async () => {
      const user = await getCurrentUser();
      if (!isActive || !user) return;

      setHasUserProfile(true);
      setFormData(current => ({
        ...current,
        name: current.name || user.name,
        email: current.email || user.email,
        phone: current.phone || user.phone,
        address: current.address || user.city,
        description: current.description || user.bio,
      }));
      setProfileImagePreview(current => current || user.photo || null);

      const profileHobbies = (user.hobbies || "")
        .split(/[,;\n]/)
        .map(hobby => hobby.trim().toLocaleLowerCase())
        .filter(Boolean);
      const matchingHobbies = DEFAULT_HOBBIES.filter(hobby =>
        profileHobbies.includes(hobby.toLocaleLowerCase())
      );
      setSelectedHobbies(current => current.length ? current : matchingHobbies);
    };

    void fillFromUserProfile();
    return () => {
      isActive = false;
    };
  }, []);

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

  // Fungsi untuk toggle pilihan hobi
  const toggleHobby = (hobby: string) => {
    setSelectedHobbies(prev =>
      prev.includes(hobby) ? prev.filter(h => h !== hobby) : [...prev, hobby]
    );
  };

  // Fungsi untuk toggle pilihan keahlian khusus
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  // Fungsi untuk menambah hobi kustom (opsi lainnya)
  const handleAddCustomHobby = () => {
    const trimmed = customHobbyInput.trim();
    if (!trimmed) return;
    const formatted = trimmed
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    if (!selectedHobbies.includes(formatted)) {
      setSelectedHobbies(prev => [...prev, formatted]);
    }
    if (!customHobbies.includes(formatted)) {
      setCustomHobbies(prev => [...prev, formatted]);
    }
    setCustomHobbyInput("");
    setIsAddingCustomHobby(false);
  };

  // Fungsi untuk memvalidasi format link Google Drive atau link dokumen
  const isValidGDriveLink = (link: string) => {
    return (
      link.includes("drive.google.com") ||
      link.startsWith("http://") ||
      link.startsWith("https://")
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

  // Fungsi untuk menangani upload berkas / gambar portofolio
  const handlePortfolioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Upload Gagal",
          description: "Ukuran berkas portofolio maksimal 10MB",
          variant: "destructive",
        });
        return;
      }

      setPortfolioFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPortfolioFile(result);
        if (file.type.startsWith("image/")) {
          setPortfolioPreview(result);
        } else {
          setPortfolioPreview(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePortfolio = () => {
    setPortfolioFile(null);
    setPortfolioFileName(null);
    setPortfolioPreview(null);
    if (portfolioFileRef.current) portfolioFileRef.current.value = "";
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

    const finalPhoto =
      profileImagePreview ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400";

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

    const combinedCategories = [...selectedSkills, ...selectedHobbies];
    if (combinedCategories.length === 0) {
      toast({
        title: "Registrasi Gagal",
        description: "Pilih minimal satu hobi atau keahlian",
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

    // Validasi Portofolio: Wajib jika memilih layanan Spesialis / Pro
    const isSpecialist = formData.experienceLevel === "spesialis";
    const finalPortfolio = portfolioFile || portfolioLink.trim() || "";

    if (isSpecialist && selectedSkills.length === 0) {
      toast({
        title: "Keahlian Spesialis Diperlukan",
        description: "Untuk kategori layanan Spesialis / Pro, silakan pilih minimal satu keahlian khusus yang Anda kuasai.",
        variant: "destructive",
      });
      return;
    }

    if (isSpecialist && !finalPortfolio) {
      toast({
        title: "Portofolio Wajib Diisi",
        description: "Untuk kategori layanan Spesialis / Pro, Anda wajib melampirkan berkas/gambar portofolio atau link sertifikat keahlian sebagai bukti kualifikasi.",
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
        category: combinedCategories.join(", "),
        photo: finalPhoto, // Simpan foto profil
        ktp: formData.ktpLink, // Simpan KTP sebagai link Google Drive
        age: parseInt(formData.age), // Tambahkan umur
        experience_level: formData.experienceLevel,
        price_expectation: formData.priceExpectation,
        social_media: formData.socialMedia,
        portfolio_file: finalPortfolio,
        // Harga tidak disertakan karena akan ditentukan secara objektif oleh admin
      });

      // Simpan sesi calon mitra yang baru mendaftar agar langsung bisa memantau status
      const candidateSession = {
        id: formData.email,
        talentId: formData.email,
        name: formData.name,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        category: combinedCategories.join(", "),
        photo: finalPhoto,
        age: parseInt(formData.age),
        experience_level: formData.experienceLevel,
        price_expectation: formData.priceExpectation,
        social_media: formData.socialMedia,
        portfolio_file: finalPortfolio,
        status: "pending",
        verificationStatus: "pending",
        isVerified: false,
      };
      saveCurrentMitraSession(candidateSession);
      window.dispatchEvent(new CustomEvent("mitraLoggedIn", { detail: { user: candidateSession } }));

      toast({
        title: "Pendaftaran Berhasil 🎉",
        description: "Akun calon mitra Anda telah dibuat dan sedang dalam proses verifikasi admin.",
      });

      // Tampilkan halaman sukses
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center shadow-xl border-primary/20">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Pendaftaran Berhasil! 🎉</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Berkas pendaftaran Anda telah tersimpan dan sedang dalam antrean verifikasi admin (maksimal 1x24 jam).
          </p>

          {/* Preview Profil Singkat */}
          <div className="bg-muted/40 rounded-xl p-4 mb-6 border border-border/60 text-left flex items-center gap-3">
            {profileImagePreview ? (
              <img
                src={profileImagePreview}
                alt={formData.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/40 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                {formData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm truncate">{formData.name}</h2>
              <p className="text-xs text-muted-foreground truncate">{formData.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  Status: Menunggu Kurasi Admin
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full gap-2 font-semibold shadow-md shadow-primary/20"
              onClick={() => navigate("/mitra/verification")}
            >
              Pantau Status Pengajuan Saya ➔
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Kembali ke Beranda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Daftar Menjadi Mitra</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Lengkapi data yang belum tersedia untuk mengajukan profil mitra.
          </p>
        </div>

        {hasUserProfile && (
          <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Data profil akunmu sudah diisi otomatis. Periksa kembali dan lengkapi bagian yang masih kosong.
          </div>
        )}

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
              <Label htmlFor="address">Kota Domisili / Lokasi Layanan</Label>
              <CitySelect
                id="address"
                placeholder="Pilih atau cari kota domisili..."
                value={formData.address}
                onChange={(val) => handleInputChange("address", val)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Pilih dari daftar kota yang tersedia atau ketik untuk mencari. Jika kota Anda belum terdaftar, Anda dapat memilih opsi &ldquo;Gunakan [Kota Anda]&rdquo; atau ketik manual.
              </p>
            </div>
          </div>

          {/* Informasi Talent Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Informasi Talent</h2>
            
            {/* 1. Hobi & Minat Santai (Pill Badges) */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-orange-50/40 border border-orange-200/70">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                    Hobi & Minat Santai
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pilih aktivitas santai yang Anda sukai untuk seru-seruan bareng klien
                  </p>
                </div>
                {selectedHobbies.length > 0 && (
                  <Badge variant="outline" className="text-[10px] text-orange-700 border-orange-300 bg-orange-100/60 font-semibold">
                    {selectedHobbies.length} dipilih
                  </Badge>
                )}
              </div>

              {/* Daftar Pill Hobi */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[...DEFAULT_HOBBIES, ...customHobbies].map((hobby) => {
                  const isSelected = selectedHobbies.includes(hobby);
                  return (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                        isSelected
                          ? "bg-orange-500 text-white font-medium shadow-xs ring-1 ring-orange-500"
                          : "bg-background border border-orange-200/80 text-foreground hover:border-orange-400 hover:bg-orange-50/50"
                      }`}
                    >
                      <span>{hobby}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </button>
                  );
                })}

                {/* Tombol Tambah Hobi Kustom / Lainnya */}
                {!isAddingCustomHobby ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomHobby(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-dashed border-orange-400 text-orange-700 bg-background hover:bg-orange-100/60 transition-colors font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Lainnya (Tulis Sendiri)</span>
                  </button>
                ) : null}
              </div>

              {/* Form Input Hobi Lainnya (Inline & Rapi) */}
              {isAddingCustomHobby && (
                <div className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-150">
                  <Input
                    type="text"
                    value={customHobbyInput}
                    onChange={(e) => setCustomHobbyInput(e.target.value)}
                    placeholder="Tulis hobi Anda (mis: Board Game, Cosplay)..."
                    className="h-8 text-xs flex-1 bg-background border-orange-300 focus-visible:ring-orange-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomHobby();
                      } else if (e.key === "Escape") {
                        setIsAddingCustomHobby(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomHobby}
                    className="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Tambah
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingCustomHobby(false);
                      setCustomHobbyInput("");
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground"
                  >
                    Batal
                  </Button>
                </div>
              )}
            </div>

            {/* 2. Keahlian Khusus / Spesialis (Pill Badges) */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-orange-600" />
                    Keahlian Khusus / Spesialis
                    <span className="text-[11px] font-normal text-muted-foreground">(Opsional)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pilih jika Anda memiliki keterampilan profesional dengan portofolio
                  </p>
                </div>
                {selectedSkills.length > 0 && (
                  <Badge variant="outline" className="text-[10px] text-orange-700 border-orange-300 bg-orange-50 font-semibold">
                    {selectedSkills.length} dipilih
                  </Badge>
                )}
              </div>

              {/* Daftar Pill Keahlian Spesialis */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SPECIALIST_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                        isSelected
                          ? "bg-orange-600 text-white font-medium shadow-xs ring-1 ring-orange-600"
                          : "bg-background border border-border text-foreground hover:border-orange-300 hover:bg-orange-50/50"
                      }`}
                    >
                      <span>{skill}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {formData.experienceLevel === "spesialis" && selectedSkills.length === 0 && (
                <p className="text-[11px] text-orange-700 font-medium">
                  ⚠️ Anda memilih tipe layanan <strong>Spesialis / Pro</strong> di bawah. Silakan pilih minimal 1 keahlian khusus di atas.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Deskripsi Diri</Label>
              <Textarea
                id="description"
                placeholder="Ceritakan tentang diri Anda, hobi, dan kepribadian yang membuat orang nyaman ditemani"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Tipe Layanan Utama */}
            <div className="space-y-2">
              <Label className="font-medium text-sm">Tipe Layanan Utama</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "kasual", title: "Kasual & Santai" },
                  { id: "acara", title: "Acara & Sosial" },
                  { id: "spesialis", title: "Spesialis / Pro" },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      handleInputChange("experienceLevel", tier.id);
                      const detail = SERVICE_TYPE_DETAILS[tier.id];
                      if (detail) {
                        handleInputChange("priceExpectation", detail.suggestedPrice);
                      }
                    }}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium text-center transition-all ${
                      formData.experienceLevel === tier.id
                        ? "border-orange-500 bg-orange-50 text-orange-600 font-semibold ring-1 ring-orange-500 shadow-xs"
                        : "border-border hover:bg-muted/50 text-muted-foreground bg-card"
                    }`}
                  >
                    {tier.title}
                  </button>
                ))}
              </div>

              {/* Penjelasan Detail Tipe Layanan yang Dipilih */}
              {SERVICE_TYPE_DETAILS[formData.experienceLevel] && (
                <div className="p-3 bg-orange-50/70 border border-orange-200/90 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-orange-950 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      {SERVICE_TYPE_DETAILS[formData.experienceLevel].title}
                    </span>
                    <span className="text-[10px] font-semibold text-orange-700 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200/60">
                      Rekomendasi: {SERVICE_TYPE_DETAILS[formData.experienceLevel].suggestedPrice}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {SERVICE_TYPE_DETAILS[formData.experienceLevel].description}
                  </p>
                  <div className="pt-1.5 border-t border-orange-200/60 flex items-start gap-1 text-[11px] text-orange-900/90">
                    <span className="font-semibold shrink-0">Contoh Kegiatan:</span>
                    <span className="italic">{SERVICE_TYPE_DETAILS[formData.experienceLevel].examples}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ekspektasi Tarif */}
            <div className="space-y-1.5">
              <Label htmlFor="priceExpectation" className="font-medium text-sm">
                Ekspektasi Tarif per Jam
              </Label>
              <select
                id="priceExpectation"
                value={formData.priceExpectation}
                onChange={(e) => handleInputChange("priceExpectation", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="Rp 200.000 - Rp 250.000">Rp 200.000 - Rp 250.000 / jam (Kasual)</option>
                <option value="Rp 250.000 - Rp 350.000">Rp 250.000 - Rp 350.000 / jam (Rekomendasi)</option>
                <option value="Rp 350.000 - Rp 450.000">Rp 350.000 - Rp 450.000 / jam (Spesialis)</option>
                <option value="> Rp 450.000">&gt; Rp 450.000 / jam (VIP)</option>
              </select>
            </div>

            {/* Akun Media Sosial / Portofolio */}
            <div className="space-y-1.5">
              <Label htmlFor="socialMedia" className="font-medium text-sm">
                Akun Media Sosial / Portofolio <span className="text-muted-foreground font-normal text-xs">(Opsional)</span>
              </Label>
              <Input
                id="socialMedia"
                placeholder="Contoh: @instagram atau link portofolio"
                value={formData.socialMedia}
                onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                className="rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Upload Dokumen Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Dokumen</h2>
            
            {/* Upload Foto Profil */}
            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Foto Profil</Label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 border flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {profileImagePreview ? (
                    <img 
                      src={profileImagePreview} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover object-top" 
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
                    Format: JPG, PNG. Maks: 5MB. Disarankan foto portrait tegak agar wajah pas & tidak terpotong.
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

            {/* Unggah Berkas / Portofolio Keahlian */}
            <div className={`p-4 rounded-xl border transition-all ${
              formData.experienceLevel === "spesialis"
                ? "bg-orange-50/50 border-orange-300 dark:border-orange-800"
                : "bg-muted/30 border-border"
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Label htmlFor="portfolioDoc" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                  Berkas / Portofolio Keahlian
                </Label>
                {formData.experienceLevel === "spesialis" ? (
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold shrink-0">
                    Wajib untuk Spesialis / Pro
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal shrink-0">
                    Opsional
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {formData.experienceLevel === "spesialis" ? (
                  <span className="text-orange-900 font-medium">
                    ⚠️ Karena Anda memilih kategori <strong>Spesialis / Pro</strong>, wajib melampirkan berkas gambar portofolio atau link portofolio/sertifikat keahlian agar admin dapat menyetujui tarif tinggi yang diajukan.
                  </span>
                ) : (
                  "Unggah gambar contoh karya/portofolio, sertifikat keahlian, atau cantumkan link portofolio pendukung untuk memperbesar peluang tarif Anda disetujui lebih tinggi oleh admin."
                )}
              </p>

              {/* Upload File Gambar / Dokumen */}
              <div className="space-y-2">
                <Input
                  id="portfolioDoc"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePortfolioUpload}
                  ref={portfolioFileRef}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => portfolioFileRef.current?.click()}
                    className="gap-2 border-orange-300 hover:bg-orange-50 text-xs sm:text-sm font-medium"
                  >
                    <Upload className="w-4 h-4 text-orange-600" />
                    {portfolioFileName ? "Ganti Berkas Portofolio" : "Unggah Gambar / File Portofolio"}
                  </Button>

                  {portfolioFileName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePortfolio}
                      className="text-xs text-destructive hover:bg-destructive/10 h-9 px-2 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </Button>
                  )}
                </div>

                {/* Preview Berkas Portofolio jika ada */}
                {portfolioFileName && (
                  <div className="mt-2 p-2.5 bg-background rounded-lg border border-orange-200 flex items-center gap-3 animate-in fade-in">
                    {portfolioPreview ? (
                      <img
                        src={portfolioPreview}
                        alt="Preview Portofolio"
                        className="w-16 h-16 rounded-md object-cover border border-orange-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-foreground">{portfolioFileName}</p>
                      <p className="text-[11px] text-orange-700 font-medium">✓ Berkas portofolio siap dilampirkan</p>
                    </div>
                  </div>
                )}

                {/* Input Alternatif / Tambahan: Link Portofolio Drive / Web */}
                <div className="pt-2">
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="portfolioLink"
                      placeholder="Atau tautan link portofolio (Drive, Behance, GitHub, Website)"
                      className="pl-9 text-xs sm:text-sm"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                    />
                  </div>
                </div>
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