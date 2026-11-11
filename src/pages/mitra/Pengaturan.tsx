import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  Calendar,
  Clock,
  User,
  Star,
  MessageCircle,
  ArrowRight,
  History,
  CreditCard,
  Shield,
  LogOut,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  MapPin,
  Sparkles,
  AlertCircle,
  Coins,
  Wallet,
  Receipt,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { getCurrentMitra, subscribeToMitraChanges, updateMitraProfile } from "@/lib/mitraStore";
import {
  getBookings,
  refreshBookingsFromSupabase,
  subscribeToBookings,
  calculateMitraEarnings,
  calculateMitraRating,
  subscribeToCompletedBookings,
  updateBookingApproval
} from "@/lib/bookingStore";
import { formatPrice } from "@/lib/utils";
import { MITRA_ACTIVITIES, normalizeMitraActivities } from "@/data/mitraActivities";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EarningsDetails } from "@/components/mitra/EarningsDetails";
import { saveCurrentMitraSession, clearCurrentMitraSession } from "@/lib/storageHelper";
import { CitySelect } from "@/components/CitySelect";
import {
  MARKET_PRICE_GUIDE,
  EXTRA_EXPENSES_DISCLAIMER,
  formatRupiah,
  getDefaultServicesForTalent,
  getStartingPriceForTalent,
} from "@/data/pricingReference";

export default function Pengaturan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [currentMitra, setCurrentMitra] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("riwayat");
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    pending: 0,
    completed: 0
  });
  // State untuk dialog detail transaksi
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showRejectionReason, setShowRejectionReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const openBookingIdRef = useRef<string | null>(
    (location.state as { openBookingId?: string } | null)?.openBookingId || null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk edit profil mitra
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    photo: "",
    city: "",
    category: "",
    supportedActivities: [] as string[],
    description: "",
  });

  // Buka dialog edit profil & isi form dari data mitra saat ini
  const handleOpenEditProfile = () => {
    setProfileForm({
      name: currentMitra?.name || "",
      photo: currentMitra?.photo || "",
      city: currentMitra?.city || currentMitra?.address || "",
      category: currentMitra?.category || "",
      supportedActivities: normalizeMitraActivities(currentMitra?.supportedActivities || currentMitra?.supported_activities),
      description: currentMitra?.description || "",
    });
    setShowEditProfile(true);
  };

  // Unggah foto profil mitra (base64)
  const handleProfilePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Upload Gagal", description: "Ukuran foto maksimal 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({ ...prev, photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Simpan perubahan profil mitra oleh mitra sendiri
  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    if (profileForm.supportedActivities.length === 0) {
      toast({ title: "Pilih aktivitas layanan", description: "Pilih minimal satu aktivitas yang bersedia Anda temani.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await updateMitraProfile({
        name: profileForm.name || undefined,
        photo: profileForm.photo || undefined,
        city: profileForm.city || undefined,
        category: profileForm.category || undefined,
        supportedActivities: profileForm.supportedActivities,
        description: profileForm.description || undefined,
      });
      setCurrentMitra(updated);
      toast({ title: "Profil Diperbarui", description: "Perubahan profil berhasil disimpan." });
      setShowEditProfile(false);
    } catch (error: any) {
      toast({
        title: "Gagal Menyimpan",
        description: error.message || "Terjadi kesalahan saat menyimpan profil.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Fungsi untuk mendapatkan persentase komisi aplikasi
  const getAppCommission = (): number => {
    try {
      const commission = JSON.parse(localStorage.getItem("rentmate_app_commission") || "{}");
      return commission.percentage || 20; // Default 20% jika tidak ada pengaturan
    } catch (error) {
      console.error("Error getting app commission:", error);
      return 20; // Default 20% jika terjadi error
    }
  };

  const calculatePaymentSplit = (totalAmount: number, commissionPercentage: number) => {
    const appAmount = Math.round(totalAmount * (commissionPercentage / 100));
    const mitraAmount = totalAmount - appAmount;
    
    return {
      appAmount,
      mitraAmount,
      totalAmount,
      commissionPercentage
    };
  };

  // Fungsi helper untuk menghitung pendapatan mitra setelah komisi
  const calculateMitraEarning = (total: number) => {
    if (!total) return 0;
    const commissionPercentage = getAppCommission();
    const paymentSplit = calculatePaymentSplit(total, commissionPercentage);
    return paymentSplit.mitraAmount;
  };

  // Fungsi untuk membuka dialog detail transaksi
  const handleViewTransactionDetails = (booking: any) => {
    setSelectedTransaction(booking);
    setShowRejectionReason(false);
    setRejectionReason("");
    setShowTransactionDialog(true);
  };

  // Fungsi untuk menyalin ID Transaksi
  const handleCopyTransactionId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({ title: "ID Disalin", description: "ID Transaksi berhasil disalin ke clipboard." });
  };

  // Opsi alasan penolakan cepat
  const QUICK_REJECTION_REASONS = [
    "Jadwal bentrok dengan kegiatan lain",
    "Kondisi kesehatan sedang kurang fit",
    "Lokasi pertemuan di luar jangkauan area saya",
    "Permintaan kegiatan di luar etika & ketentuan layanan",
  ];

  // Fungsi untuk mengubah status persetujuan (Terima / Tolak)
  const handleUpdateApproval = async (bookingId: string, status: "approved" | "rejected", reason?: string) => {
    try {
      setIsSubmittingApproval(true);
      const updated = await updateBookingApproval(bookingId, status, reason);
      if (!updated) {
        throw new Error("Booking tidak ditemukan");
      }

      window.dispatchEvent(new CustomEvent("bookingsUpdated"));
      window.dispatchEvent(new CustomEvent("bookingApproved"));

      toast({
        title: status === "approved" ? "Booking Disetujui!" : "Booking Ditolak",
        description: status === "approved"
          ? "Pesanan berhasil diterima. Silakan cek pesan & hubungi klien."
          : "Pesanan telah ditolak dan status diperbarui.",
      });
      
      setShowTransactionDialog(false);
      setShowRejectionReason(false);
      setRejectionReason("");
      refreshBookings();
    } catch (error) {
      console.error("Gagal mengubah status booking:", error);
      toast({ title: "Error", description: "Gagal memperbarui status.", variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Fungsi untuk memuat ulang data booking — fetch LANGSUNG dari Supabase
  const calculateEarnings = useCallback((bookingsData: any[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    let pendingEarnings = 0;
    let completedBookings = 0;
    
    bookingsData.forEach(booking => {
      const bookingDate = new Date(booking.date);
      const mitraEarning = calculateMitraEarning(booking.total);
      
      if (booking.approvalStatus === "completed") {
        completedBookings++;
        totalEarnings += mitraEarning;
        
        if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
          thisMonthEarnings += mitraEarning;
        }
      } else if (booking.approvalStatus === "approved") {
        pendingEarnings += mitraEarning;
      }
    });
    
    setEarnings({
      total: totalEarnings,
      thisMonth: thisMonthEarnings,
      pending: pendingEarnings,
      completed: completedBookings
    });
  }, []);

  const refreshBookings = useCallback(async () => {
    const mitra = getCurrentMitra();
    if (!mitra) return;
    try {
      const freshBookings = await refreshBookingsFromSupabase();
      const mitraBookings = freshBookings.filter(booking =>
        booking.talentId === mitra.talentId
      );
      setBookings(mitraBookings);
      const requestedBookingId = openBookingIdRef.current;
      const requestedBooking = requestedBookingId
        ? mitraBookings.find(booking => booking.id === requestedBookingId)
        : undefined;
      if (requestedBooking) {
        setSelectedTransaction(requestedBooking);
        setShowTransactionDialog(true);
        openBookingIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
      }
      setCurrentMitra(previous => previous ? {
        ...previous,
        rating: calculateMitraRating(mitra.talentId),
      } : previous);
      calculateEarnings(mitraBookings);
    } catch (err) {
      console.error("Gagal refresh booking:", err);
    }
  }, [calculateEarnings, location.pathname, navigate]);

  // Memuat data mitra dan booking saat pertama kali mount
  useEffect(() => {
    const mitra = getCurrentMitra();
    if (mitra) {
      setCurrentMitra(mitra);
      // Sinkronisasi foto terbaru dari API (foto bisa diperbarui oleh admin)
      fetch('/api/talents')
        .then(r => r.ok ? r.json() : null)
        .then((data: any[] | null) => {
          if (!data) return;
          const fresh = data.find((t: any) => t.user_id === mitra.talentId || t.user_id === mitra.id);
          if (fresh?.photo && fresh.photo !== mitra.photo) {
            const updated = { ...mitra, photo: fresh.photo };
            saveCurrentMitraSession(updated);
            setCurrentMitra(updated);
          }
        })
        .catch(() => {/* silent */});
      // Langsung fetch dari Supabase saat mount
      refreshBookings();
    }
  }, [refreshBookings]);

  // Tambahkan event listener untuk update booking
  useEffect(() => {
    const handleBookingUpdate = () => {
      console.log("Booking update detected, refreshing...");
      refreshBookings();
    };

    // Tambahkan event listener — termasuk 'bookingsUpdated' yang di-dispatch saat booking baru masuk
    window.addEventListener('bookingUpdated', handleBookingUpdate);
    window.addEventListener('bookingCompleted', handleBookingUpdate);
    window.addEventListener('bookingApproved', handleBookingUpdate);
    window.addEventListener('bookingsUpdated', handleBookingUpdate);

    // Cleanup
    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
      window.removeEventListener('bookingCompleted', handleBookingUpdate);
      window.removeEventListener('bookingApproved', handleBookingUpdate);
      window.removeEventListener('bookingsUpdated', handleBookingUpdate);
    };
  }, [refreshBookings]);

  // Tambahkan subscription untuk update real-time
  useEffect(() => {
    if (!currentMitra) return;
    
    const unsubscribeBookings = subscribeToBookings(() => {
      console.log("Bookings updated in real-time, refreshing...");
      refreshBookings();
    });

    const unsubscribeMitra = subscribeToMitraChanges(() => {
      const mitra = getCurrentMitra();
      if (mitra) {
        setCurrentMitra(mitra);
      }
    });

    // PERBAIKAN: Gunakan subscribeToCompletedBookings untuk notifikasi langsung
    const unsubscribeCompleted = subscribeToCompletedBookings(
      currentMitra.talentId, 
      () => {
        console.log("Booking completed, updating earnings...");
        refreshBookings();
        
        // Tampilkan notifikasi
        toast({
          title: "Booking Selesai!",
          description: "Pendapatan Anda telah diperbarui. Silakan periksa tab Pendapatan.",
        });
      },
      true // isTalentMode = true
    );

    // Event listener untuk status online/offline
    const handleOnlineStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        console.log("Back online, refreshing data...");
        refreshBookings();
      }
    };
    
    window.addEventListener("online", handleOnlineStatusChange);
    window.addEventListener("offline", handleOnlineStatusChange);

    // Cleanup
    return () => {
      unsubscribeBookings();
      unsubscribeMitra();
      unsubscribeCompleted();
      window.removeEventListener("online", handleOnlineStatusChange);
      window.removeEventListener("offline", handleOnlineStatusChange);
    };
  }, [currentMitra, refreshBookings, toast]);

  const handleLogout = () => {
    clearCurrentMitraSession();
    navigate("/mitra/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
      case "pending_mitra":
        return <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Menunggu Persetujuan</Badge>;
      case "approved":
        return <Badge className="border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Disetujui</Badge>;
      case "completed":
        return <Badge className="border-transparent bg-orange-500 text-white shadow-sm">Selesai</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      case "expired":
        return <Badge variant="destructive">Kadaluarsa</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // State filter riwayat pemesanan
  const [historyFilter, setHistoryFilter] = useState<"all" | "pending" | "completed" | "rejected">("all");

  const pendingDecisionCount = useMemo(() => {
    return bookings.filter(b => b.approvalStatus === "pending_approval" || b.approvalStatus === "pending_mitra").length;
  }, [bookings]);

  const rejectedBookingsCount = useMemo(() => {
    return bookings.filter(b => b.approvalStatus === "rejected" || b.approvalStatus === "expired" || b.approvalStatus === "cancelled").length;
  }, [bookings]);

  const filteredHistoryBookings = useMemo(() => {
    if (historyFilter === "pending") {
      return bookings.filter(b => b.approvalStatus === "pending_approval" || b.approvalStatus === "pending_mitra");
    }
    if (historyFilter === "completed") {
      return bookings.filter(b => b.approvalStatus === "completed" || b.approvalStatus === "approved");
    }
    if (historyFilter === "rejected") {
      return bookings.filter(b => b.approvalStatus === "rejected" || b.approvalStatus === "expired" || b.approvalStatus === "cancelled");
    }
    return bookings;
  }, [bookings, historyFilter]);

  // PERBAIKAN: Fungsi refresh manual
  const handleRefresh = useCallback(() => {
    if (!isOnline) {
      toast({ title: "Tidak Ada Koneksi", description: "Tidak dapat memperbarui data saat offline.", variant: "destructive" });
      return;
    }
    setIsRefreshing(true);
    localStorage.removeItem("rentmate_chats");
    localStorage.removeItem("rentmate_bookings");
    localStorage.setItem("rentmate_last_data_update", Date.now().toString());
    
    refreshBookings();
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: "Data Diperbarui", description: "Data berhasil diperbarui" });
    }, 1000);
  }, [isOnline, toast, refreshBookings]);

  // PERBAIKAN: Gunakan useMemo untuk optimasi performa
  const completedBookings = useMemo(() => {
    return bookings.filter(booking => booking.approvalStatus === "completed");
  }, [bookings]);

  const pendingBookings = useMemo(() => {
    return bookings.filter(booking => booking.approvalStatus === "approved");
  }, [bookings]);

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/mitra/dashboard")}
              className="rounded-full"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold">
              Pengaturan <span className="text-gradient">Akun</span>
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Kelola akun dan lihat riwayat pemesanan Anda
          </p>
          {!isOnline && (
            <div className="ml-12 mt-2">
              <Badge variant="destructive">Offline - Data mungkin tidak terbaru</Badge>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={currentMitra?.photo || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"}
              alt={currentMitra?.name || "Profile"}
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentMitra?.name || "Mitra"}</h2>
              <p className="text-muted-foreground">{currentMitra?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={currentMitra?.verificationStatus === "approved" ? "success" : "warning"}>
                  {currentMitra?.verificationStatus === "approved" ? "Terverifikasi" : "Menunggu Verifikasi"}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{currentMitra?.rating || "0"}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-orange-600 font-bold bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full border border-orange-200">
                  <Coins className="w-3.5 h-3.5 text-orange-500" />
                  <span>{formatRupiah(getStartingPriceForTalent(currentMitra).price)}</span>
                  <span className="text-xs font-normal text-muted-foreground">mulai {getStartingPriceForTalent(currentMitra).unitLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleOpenEditProfile}>
                <User className="w-4 h-4 mr-2" />
                Edit Profil
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </Card>

        {/* Dialog Edit Profil Mitra */}
        <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Edit Profil
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={profileForm.photo || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"}
                  alt={profileForm.name || "Profile"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-background shadow"
                />
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="text-xs" />
                  <p className="text-xs text-muted-foreground mt-1">Unggah foto baru (JPG/PNG, maks 5MB)</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Nama</label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Kota Domisili</label>
                  <CitySelect
                    value={profileForm.city}
                    onChange={(val) => setProfileForm(prev => ({ ...prev, city: val }))}
                    placeholder="Pilih atau cari kota..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Kategori</label>
                  <Input
                    value={profileForm.category}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Contoh: Travelling"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">Aktivitas yang Bersedia Ditemani</label>
                  <span className="text-xs text-muted-foreground">{profileForm.supportedActivities.length} dipilih</span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Hanya aktivitas yang dipilih ini yang akan tersedia untuk booking.
                </p>
                <div className="flex flex-wrap gap-2">
                  {MITRA_ACTIVITIES.map(({ id, label }) => {
                    const selected = profileForm.supportedActivities.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setProfileForm((previous) => ({
                          ...previous,
                          supportedActivities: selected
                            ? previous.supportedActivities.filter((activity) => activity !== id)
                            : [...previous.supportedActivities, id],
                        }))}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Deskripsi Diri</label>
                <textarea
                  className="w-full min-h-[90px] rounded-md border-input bg-background px-3 py-2 text-sm"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ceritakan tentang dirimu..."
                />
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-xs">
                <p className="font-semibold">Tarif layanan ditetapkan dan dikelola admin.</p>
                <p className="mt-1 text-muted-foreground">
                  Perubahan tarif per layanan atau paket dapat diajukan untuk ditinjau admin. Tarif pelanggan baru berlaku setelah disetujui.
                </p>
                <div className="mt-2 space-y-1">
                  {getDefaultServicesForTalent(currentMitra).map((service) => (
                    <div key={service.id} className="flex justify-between gap-3">
                      <span>{service.category} ({service.unitLabel})</span>
                      <strong>{formatRupiah(service.price)}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-orange-800">
                  Acuan harga pasar untuk admin: {MARKET_PRICE_GUIDE.slice(0, 3).map((guide) =>
                    `${guide.category} ${formatRupiah(guide.minPrice)}–${formatRupiah(guide.maxPrice)}`
                  ).join("; ")}.
                </p>
                <p className="mt-1 text-[10px] text-orange-800">
                  <strong>Biaya tambahan:</strong> {EXTRA_EXPENSES_DISCLAIMER}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/mitra/verification")}
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Ajukan Perubahan Tarif
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditProfile(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "riwayat"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("riwayat")}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat Pemesanan
            </div>
          </button>
          <button
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "pendapatan"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("pendapatan")}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pendapatan
            </div>
          </button>
          <button
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "pesan-mitra"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("pesan-mitra")}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Ingin Pesan Mitra?
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "riwayat" && (
          <div className="space-y-4">
            {/* Filter Sub-Tabs */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border/60">
              <Button
                variant={historyFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setHistoryFilter("all")}
                className={`h-8 text-xs font-medium rounded-full ${historyFilter === "all" ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Semua ({bookings.length})
              </Button>
              <Button
                variant={historyFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setHistoryFilter("pending")}
                className={`h-8 text-xs font-medium rounded-full ${historyFilter === "pending" ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Perlu Tindakan
                {pendingDecisionCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {pendingDecisionCount}
                  </span>
                )}
              </Button>
              <Button
                variant={historyFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setHistoryFilter("completed")}
                className={`h-8 text-xs font-medium rounded-full ${historyFilter === "completed" ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Disetujui / Selesai
              </Button>
              <Button
                variant={historyFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setHistoryFilter("rejected")}
                className={`h-8 text-xs font-medium rounded-full ${historyFilter === "rejected" ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Ditolak / Batal ({rejectedBookingsCount})
              </Button>
            </div>

            {filteredHistoryBookings.length > 0 ? (
              filteredHistoryBookings.map((booking) => {
                const commissionPercentage = getAppCommission();
                const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);
                const isRejected = booking.approvalStatus === "rejected";
                const isExpired = booking.approvalStatus === "expired";
                const isPending = booking.approvalStatus === "pending_approval" || booking.approvalStatus === "pending_mitra";
                
                return (
                  <Card key={booking.id} className="p-5 cursor-pointer hover:shadow-md transition-shadow border-orange-100/60 dark:border-orange-950/30" 
                    onClick={() => handleViewTransactionDetails(booking)}>
                    <div className="flex items-start gap-4">
                      <img
                        src={booking.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.userName || 'U')}&background=ffedd5&color=ea580c`}
                        alt={booking.userName || "Pengguna"}
                        className="w-12 h-12 rounded-full object-cover border border-orange-200"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{booking.userName || "Pengguna"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(booking.date)} • {booking.time} • {booking.duration} jam
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Tujuan: {booking.purpose}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(booking.approvalStatus)}

                            {isRejected ? (
                              <div className="mt-1">
                                <p className="text-sm font-semibold text-rose-500 line-through">
                                  +{formatPrice(paymentSplit.mitraAmount)}
                                </p>
                                <span className="text-[11px] text-rose-600 font-medium block">
                                  Pesanan Ditolak
                                </span>
                                {booking.rejectionReason && (
                                  <p className="text-[11px] text-muted-foreground max-w-[190px] truncate italic mt-0.5" title={booking.rejectionReason}>
                                    "{booking.rejectionReason}"
                                  </p>
                                )}
                              </div>
                            ) : isExpired ? (
                              <div className="mt-1">
                                <p className="text-sm font-semibold text-muted-foreground line-through">
                                  +{formatPrice(paymentSplit.mitraAmount)}
                                </p>
                                <span className="text-[11px] text-muted-foreground block">
                                  Batas Waktu Habis
                                </span>
                              </div>
                            ) : isPending ? (
                              <div className="mt-1">
                                <p className="text-sm font-medium text-amber-600">
                                  Perlu Persetujuan
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Total: {formatPrice(booking.total)}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <p className="text-lg font-bold text-orange-600">
                                  +{formatPrice(paymentSplit.mitraAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Total: {formatPrice(booking.total)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Biaya Admin ({commissionPercentage}%): {formatPrice(paymentSplit.appAmount)}
                                </p>
                              </div>
                            )}

                            <Button variant="ghost" size="sm" className="mt-2 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                              <Eye className="w-4 h-4" />
                              Lihat Detail
                            </Button>
                          </div>
                        </div>
                        {booking.approvalStatus === "approved" && (
                          <div className="mt-3 pt-3 border-t">
                            <Link to={`/mitra/chat/${booking.id}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50">
                                <MessageCircle className="w-4 h-4" />
                                Buka Percakapan
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-8 text-center border-orange-100">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {historyFilter === "pending"
                    ? "Tidak Ada Pesanan Menunggu"
                    : historyFilter === "rejected"
                    ? "Tidak Ada Pesanan Ditolak"
                    : historyFilter === "completed"
                    ? "Belum Ada Pesanan Selesai"
                    : "Belum Ada Pemesanan"}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {historyFilter === "pending"
                    ? "Semua pesanan baru sudah Anda respons."
                    : historyFilter === "rejected"
                    ? "Belum ada pesanan yang Anda tolak atau dibatalkan."
                    : "Riwayat pemesanan Anda akan tercatat di sini."}
                </p>
                <Button onClick={() => setActiveTab("pesan-mitra")}>
                  Cari Mitra Lain
                </Button>
              </Card>
            )}
          </div>
        )}

        {activeTab === "pendapatan" && (
          <div className="space-y-4">
            {/* PERBAIKAN: Tambahkan tombol refresh */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Pendapatan Anda</h2>
              
            </div>
            
            {/* Summary Metric Cards - Clean Orange & White Aesthetic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <Card className="p-5 bg-card border rounded-2xl shadow-xs hover:border-orange-200 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Pendapatan
                    </span>
                    <p className="text-2xl font-extrabold text-foreground mt-1 tracking-tight">
                      {formatPrice(earnings.total)}
                    </p>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      Akumulasi seluruh booking selesai
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-5 bg-card border rounded-2xl shadow-xs hover:border-orange-200 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pendapatan Bulan Ini
                    </span>
                    <p className="text-2xl font-extrabold text-foreground mt-1 tracking-tight">
                      {formatPrice(earnings.thisMonth)}
                    </p>
                    <span className="text-[11px] text-orange-600 font-medium mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Periode bulan berjalan aktif
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Komponen Utama Pencairan & Riwayat Pendapatan */}
            <EarningsDetails isTalentMode={true} />
          </div>
        )}
        
        {activeTab === "pesan-mitra" && (
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <User className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Ingin Pesan Mitra Lain?</h3>
              <p className="text-muted-foreground mb-6">
                Sebagai mitra, Anda juga dapat memesan mitra lain untuk berbagai aktivitas.
              </p>
              <Link to="/mitra/talents">
                <Button variant="hero" className="gap-2">
                  Lihat Daftar Mitra
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </Card>
            
            <Card className="p-6 bg-accent/50">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Catatan Penting</h4>
                  <p className="text-sm text-muted-foreground">
                    Sebagai mitra, Anda dapat memesan mitra lain dengan syarat dan ketentuan yang berlaku. 
                    Sistem akan mencegah konflik jadwal jika Anda dan mitra yang sama sudah memiliki pemesanan di waktu yang bersamaan.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Dialog Detail Transaksi - Tema Oren-Putih RentMate & Scroll Lancar */}
      <Dialog open={showTransactionDialog} onOpenChange={(open) => !open && setShowTransactionDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border shadow-2xl overflow-hidden bg-background">
          {/* Header Dialog (Fixed / Shrink-0) */}
          <div className="shrink-0 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border-b border-border/80 px-6 py-4">
            <DialogHeader className="p-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      Detail Pesanan Teman
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {selectedTransaction?.id ? `#${selectedTransaction.id.slice(0, 13)}...` : "-"}
                    </span>
                    {selectedTransaction?.id && (
                      <button
                        onClick={() => handleCopyTransactionId(selectedTransaction.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-700 hover:underline font-medium"
                        title="Salin ID Transaksi"
                      >
                        {copiedId ? (
                          <>
                            <Check className="w-3 h-3 text-orange-600" />
                            <span className="text-orange-600 font-semibold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin ID</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {selectedTransaction && (
                  <div>
                    {selectedTransaction.approvalStatus === "pending_approval" ||
                    selectedTransaction.approvalStatus === "pending_mitra" ? (
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs py-1 px-3">
                        ⏳ Menunggu Keputusan Anda
                      </Badge>
                    ) : (
                      getStatusBadge(selectedTransaction.approvalStatus)
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
          </div>

          {/* Konten Dialog Scrollable (Flex-1 & Overflow-Y-Auto) */}
          {selectedTransaction && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 overscroll-contain">
              {/* Kartu Hubungan Pemesan & Mitra */}
              <div className="relative rounded-2xl border border-orange-100 dark:border-orange-950/40 bg-gradient-to-r from-orange-50/30 via-background to-orange-50/20 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  {/* Pihak Pengguna */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={
                        selectedTransaction.userPhoto ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          selectedTransaction.userName || "U"
                        )}&background=ffedd5&color=ea580c`
                      }
                      alt={selectedTransaction.userName || "Pengguna"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 dark:border-orange-800 shadow-sm shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Klien / Pemesan
                      </span>
                      <h4 className="font-bold text-sm truncate text-foreground">
                        {selectedTransaction.userName || "Pengguna"}
                      </h4>
                    </div>
                  </div>

                  {/* Penghubung Visual */}
                  <div className="flex flex-col items-center justify-center px-2 shrink-0">
                    <div className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">memesan</span>
                  </div>

                  {/* Pihak Mitra */}
                  <div className="flex items-center gap-3 flex-1 justify-end min-w-0 text-right">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Teman Anda
                      </span>
                      <h4 className="font-bold text-sm truncate text-foreground">
                        {selectedTransaction.talentName || currentMitra?.name || "Saya"}
                      </h4>
                    </div>
                    <img
                      src={
                        currentMitra?.photo ||
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                      }
                      alt={currentMitra?.name || "Talent"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-orange-300 dark:border-orange-800 shadow-sm shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Rincian Jadwal & Aktivitas */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" /> Rincian Waktu & Lokasi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Tujuan / Agenda</span>
                      <p className="font-semibold text-sm text-foreground mt-0.5">
                        {selectedTransaction.purpose || "Aktivitas Sosial"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Tanggal Pertemuan</span>
                      <p className="font-semibold text-sm text-foreground mt-0.5">
                        {new Date(selectedTransaction.date).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Jam Mulai & Durasi</span>
                      <p className="font-semibold text-sm text-foreground mt-0.5">
                        {String(selectedTransaction.time).slice(0, 5)} WIB • {selectedTransaction.duration} Jam Layanan
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Kota Pertemuan</span>
                      <p className="font-semibold text-sm text-foreground mt-0.5">
                        {selectedTransaction.meeting_city || currentMitra?.city || "Sesuai Kesepakatan"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Finansial & Pendapatan Bersih Mitra - Tema Oranye & Putih */}
              <div className="rounded-2xl border border-orange-200 dark:border-orange-950/40 bg-gradient-to-br from-orange-50/40 via-background to-amber-50/20 dark:from-orange-950/20 dark:via-background dark:to-amber-950/10 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-foreground">Kalkulasi Pendapatan</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-orange-100/70 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300 font-medium">
                    Status Bayar: {selectedTransaction.paymentStatus === "paid" ? "✅ Lunas" : "⏳ Pending"}
                  </Badge>
                </div>

                {/* Banner Sorotan Pendapatan Bersih (Oranye Putih RentMate) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 gap-2">
                  <div>
                    <span className="text-xs text-orange-100 font-medium">Estimasi Pendapatan Bersih Mitra</span>
                    <h3 className="text-2xl font-extrabold tracking-tight mt-0.5 text-white">
                      {formatPrice(calculatePaymentSplit(selectedTransaction.total || 0, getAppCommission()).mitraAmount)}
                    </h3>
                  </div>
                  <span className="text-[11px] bg-white/20 text-white rounded-lg px-2.5 py-1 font-medium w-fit">
                    Masuk ke saldo dompet Anda
                  </span>
                </div>

                {/* Rincian Komisi */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1 text-muted-foreground">
                  <div className="space-y-1">
                    <span>Total Pembayaran Klien:</span>
                    <p className="font-semibold text-sm text-foreground">{formatPrice(selectedTransaction.total || 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <span>Biaya Layanan RentMate ({getAppCommission()}%):</span>
                    <p className="font-semibold text-sm text-foreground">
                      - {formatPrice(calculatePaymentSplit(selectedTransaction.total || 0, getAppCommission()).appAmount)}
                    </p>
                  </div>
                </div>

                {selectedTransaction.paymentProof && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Lampiran Bukti Pembayaran:</p>
                    <img
                      src={selectedTransaction.paymentProof}
                      alt="Bukti Transfer"
                      className="w-40 h-24 object-cover rounded-xl border border-orange-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(selectedTransaction.paymentProof, "_blank")}
                    />
                  </div>
                )}
              </div>

              {/* Catatan Tambahan Pemesan (Jika Ada) */}
              {selectedTransaction.notes && (
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-orange-500" /> Catatan Tambahan Klien
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">
                    "{selectedTransaction.notes}"
                  </p>
                </div>
              )}

              {/* FORMULIR PENOLAKAN PESANAN (Tampil saat Mitra menekan 'Tolak') */}
              {showRejectionReason && (
                <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-rose-700 dark:text-rose-400">
                        Konfirmasi Penolakan Pesanan
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Mohon sampaikan alasan yang jelas dan sopan. Alasan ini akan dikirimkan kepada pelanggan dan tercatat pada sistem.
                      </p>
                    </div>
                  </div>

                  {/* Tombol Alasan Cepat (Quick Reasons) */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-2">
                      Pilih Alasan Cepat:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REJECTION_REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setRejectionReason(reason)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all text-left ${
                            rejectionReason === reason
                              ? "bg-rose-600 text-white border-rose-600 font-medium shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground border-border hover:border-border/80"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Alasan Custom */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex justify-between">
                      <span>Tulis / Sesuaikan Alasan: <span className="text-destructive">*</span></span>
                      <span className={`text-[11px] ${rejectionReason.trim().length < 5 ? "text-destructive" : "text-orange-600 font-medium"}`}>
                        {rejectionReason.trim().length} / min 5 karakter
                      </span>
                    </label>
                    <Textarea
                      autoFocus
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Tuliskan alasan penolakan secara jelas dan sopan..."
                      className="text-sm bg-background"
                      maxLength={500}
                    />
                  </div>

                  {/* Edukasi Poin Pelanggaran */}
                  <p className="text-[11px] text-muted-foreground bg-background/80 p-3 rounded-lg border leading-relaxed">
                    💡 <strong>Ketentuan Mitra:</strong> Menolak pesanan yang sudah diverifikasi tanpa alasan sah secara berturut-turut dapat memengaruhi poin kepatuhan (Strike) akun Anda.
                  </p>

                  {/* Tombol Aksi Penolakan */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectionReason(false)}
                      disabled={isSubmittingApproval}
                    >
                      Batal
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={rejectionReason.trim().length < 5 || isSubmittingApproval}
                      onClick={() => void handleUpdateApproval(selectedTransaction.id, "rejected", rejectionReason)}
                      className="gap-1.5 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      {isSubmittingApproval ? "Memproses..." : "Kirim Penolakan"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Aksi Dialog (Selalu Terlihat di Bagian Bawah / Pinned) */}
          <div className="shrink-0 border-t bg-background/95 backdrop-blur px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowTransactionDialog(false);
                setShowRejectionReason(false);
              }}
              className="w-full sm:w-auto"
            >
              Tutup
            </Button>

            {/* Tombol Terima & Tolak muncul saat status menunggu konfirmasi mitra */}
            {!showRejectionReason &&
              (selectedTransaction?.approvalStatus === "pending_approval" ||
                selectedTransaction?.approvalStatus === "pending_mitra") && (
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1.5 flex-1 sm:flex-initial"
                    onClick={() => {
                      setShowRejectionReason(true);
                      setRejectionReason("");
                    }}
                    disabled={isSubmittingApproval}
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak Pesanan
                  </Button>

                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold gap-1.5 shadow-md shadow-orange-500/25 flex-1 sm:flex-initial"
                    onClick={() => handleUpdateApproval(selectedTransaction.id, "approved")}
                    disabled={isSubmittingApproval}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmittingApproval ? "Menyetujui..." : "Terima (Approve)"}
                  </Button>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}