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
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {  Input } from "@/components/ui/input";
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
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EarningsDetails } from "@/components/mitra/EarningsDetails";

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
    description: "",
  });

  // Buka dialog edit profil & isi form dari data mitra saat ini
  const handleOpenEditProfile = () => {
    setProfileForm({
      name: currentMitra?.name || "",
      photo: currentMitra?.photo || "",
      city: currentMitra?.city || currentMitra?.address || "",
      category: currentMitra?.category || "",
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
    setIsSavingProfile(true);
    try {
      const updated = await updateMitraProfile({
        name: profileForm.name || undefined,
        photo: profileForm.photo || undefined,
        city: profileForm.city || undefined,
        category: profileForm.category || undefined,
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
    setShowTransactionDialog(true);
  };

  // Fungsi untuk mengubah status persetujuan (Terima / Tolak)
  const handleUpdateApproval = async (bookingId: string, status: "approved" | "rejected") => {
    try {
      const updated = await updateBookingApproval(bookingId, status);
      if (!updated) {
        throw new Error("Booking tidak ditemukan");
      }

      window.dispatchEvent(new CustomEvent("bookingsUpdated"));
      window.dispatchEvent(new CustomEvent("bookingApproved"));

      toast({
        title: status === "approved" ? "Booking Disetujui!" : "Booking Ditolak",
        description: `Status pemesanan berhasil diperbarui.`,
      });
      
      setShowTransactionDialog(false);
      refreshBookings();
    } catch (error) {
      console.error("Gagal mengubah status booking:", error);
      toast({ title: "Error", description: "Gagal memperbarui status.", variant: "destructive" });
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
            localStorage.setItem("rentmate_current_mitra", JSON.stringify(updated));
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
    localStorage.removeItem("mitraAuthenticated");
    localStorage.removeItem("rentmate_current_mitra");
    navigate("/mitra/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return <Badge variant="accent">Menunggu Persetujuan</Badge>;
      case "approved":
        return <Badge variant="success">Disetujui</Badge>;
      case "completed":
        return <Badge variant="default">Selesai</Badge>;
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
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={currentMitra?.verificationStatus === "approved" ? "success" : "warning"}>
                  {currentMitra?.verificationStatus === "approved" ? "Terverifikasi" : "Menunggu Verifikasi"}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{currentMitra?.rating || "0"}</span>
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
                  <label className="text-sm font-medium mb-2 block">Kota</label>
                  <Input
                    value={profileForm.city}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Contoh: Yogyakarta"
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
                <label className="text-sm font-medium mb-2 block">Deskripsi Diri</label>
                <textarea
                  className="w-full min-h-[90px] rounded-md border-input bg-background px-3 py-2 text-sm"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ceritakan tentang dirimu..."
                />
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Catatan: Harga per jam ditentukan oleh admin dan tidak dapat diubah sendiri.
              </p>
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
            {bookings.length > 0 ? (
              bookings.map((booking) => {
                const commissionPercentage = getAppCommission();
                const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);
                
                return (
                  <Card key={booking.id} className="p-5 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleViewTransactionDetails(booking)}>
                    <div className="flex items-start gap-4">
                      <img
                        src={booking.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.userName || 'U')}&background=f3f4f6&color=6b7280`}
                        alt={booking.userName || "Pengguna"}
                        className="w-12 h-12 rounded-full object-cover"
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
                            <p className="text-lg font-bold text-green-600 mt-1">
                              +{formatPrice(paymentSplit.mitraAmount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total: {formatPrice(booking.total)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Biaya Admin ({commissionPercentage}%): {formatPrice(paymentSplit.appAmount)}
                            </p>
                            <Button variant="ghost" size="sm" className="mt-2 gap-1">
                              <Eye className="w-4 h-4" />
                              Lihat Detail
                            </Button>
                          </div>
                        </div>
                        {booking.approvalStatus === "approved" && (
                          <div className="mt-3 pt-3 border-t">
                            <Link to={`/mitra/chat/${booking.id}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="gap-2">
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
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Pemesanan</h3>
                <p className="text-muted-foreground mb-4">
                  Anda belum memiliki riwayat pemesanan.
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
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Pendapatan</p>
                    <p className="text-2xl font-bold">{formatPrice(earnings.total)}</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-blue-200" />
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Pendapatan Bulan Ini</p>
                    <p className="text-2xl font-bold">{formatPrice(earnings.thisMonth)}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-200" />
                </div>
              </Card>
            </div>

            {/* PERBAIKAN: Gunakan komponen EarningsDetails yang sudah diimport */}
            <EarningsDetails isTalentMode={true} />
            
            {/* Detailed Earnings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Detail Pendapatan</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Pendapatan Selesai</p>
                      <p className="text-sm text-muted-foreground">
                        {earnings.completed} pemesanan selesai
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatPrice(earnings.total)}</p>
                </div>
                
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Pendapatan Tertunda</p>
                      <p className="text-sm text-muted-foreground">
                        Akan dibayar setelah pemesanan selesai
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatPrice(earnings.pending)}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Total Estimasi</p>
                      <p className="text-sm text-muted-foreground">
                        Pendapatan selesai + tertunda
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatPrice(earnings.total + earnings.pending)}</p>
                </div>
              </div>
            </Card>

            {/* Earnings History */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Riwayat Pendapatan</h3>
              
              {completedBookings.length > 0 ? (
                <div className="space-y-3">
                  {completedBookings
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((booking) => {
                      const commissionPercentage = getAppCommission();
                      const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);
                      
                      return (
                        <div key={booking.id} className="flex items-center justify-between pb-3 border-b last:border-0 cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors"
                          onClick={() => handleViewTransactionDetails(booking)}>
                          <div>
                            <p className="font-medium">{booking.userName || "Pengguna"}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(booking.date)} • {booking.time} • {booking.duration} jam
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{formatPrice(paymentSplit.mitraAmount)}</p>
                            <p className="text-xs text-muted-foreground">Total: {formatPrice(booking.total)}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Belum Ada Pendapatan</h3>
                  <p className="text-muted-foreground">
                    Anda belum memiliki pendapatan dari pemesanan yang selesai.
                  </p>
                </div>
              )}
            </Card>
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

      {/* Dialog Detail Transaksi */}
      <Dialog open={showTransactionDialog} onOpenChange={(open) => !open && setShowTransactionDialog(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detail Transaksi
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <img src={selectedTransaction.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTransaction.userName || 'U')}&background=f3f4f6&color=6b7280`} alt={selectedTransaction.userName || "Pengguna"} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pengguna</p>
                    <h3 className="font-bold">{selectedTransaction.userName || "Pengguna"}</h3>
                  </div>
                </div>
                <div className="text-center text-muted-foreground">
                  <div className="w-8 h-[2px] bg-border mx-auto mb-1" />
                  <span className="text-xs">memesan</span>
                  <div className="w-8 h-[2px] bg-border mx-auto mt-1" />
                </div>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Teman</p>
                    <h3 className="font-bold">{selectedTransaction.talentName || currentMitra?.name}</h3>
                  </div>
                  <img src={currentMitra?.photo || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"} alt={currentMitra?.name || "Talent"} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="mb-4 pb-4 border-b">
                  <p className="text-xs text-muted-foreground mb-2">ID Transaksi</p>
                  <div className="bg-background rounded p-3 border">
                    <p className="font-mono text-sm break-all">{selectedTransaction.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tujuan</p>
                    <p className="font-medium">{selectedTransaction.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tanggal</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(selectedTransaction.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Waktu & Durasi</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedTransaction.time} • {selectedTransaction.duration} jam
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <div>{getStatusBadge(selectedTransaction.approvalStatus)}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-semibold mb-2">Detail Pembayaran</p>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Pembayaran</p>
                    <p className="font-medium">{formatPrice(selectedTransaction.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Biaya Admin ({getAppCommission()}%)</p>
                    <p className="font-medium">{formatPrice(calculatePaymentSplit(selectedTransaction.total || 0, getAppCommission()).appAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendapatan Mitra</p>
                    <p className="font-medium">{formatPrice(calculatePaymentSplit(selectedTransaction.total || 0, getAppCommission()).mitraAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status Pembayaran</p>
                    <p className="font-medium">{selectedTransaction.paymentStatus || "Belum Dibayar"}</p>
                  </div>
                </div>
                
                {selectedTransaction.paymentProof && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-muted-foreground text-sm mb-1">Bukti Transfer</p>
                    <img 
                      src={selectedTransaction.paymentProof} 
                      alt="Bukti Transfer" 
                      className="w-48 rounded-lg border shadow cursor-pointer" 
                      onClick={() => window.open(selectedTransaction.paymentProof, "_blank")} 
                    />
                  </div>
                )}
              </div>
              
              {selectedTransaction.notes && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-2">Catatan Tambahan</p>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between items-center">
            {/* Tombol Terima/Tolak muncul saat menunggu persetujuan mitra,
                baik saat status masih "pending_approval" (belum diproses admin)
                maupun "pending_mitra" (admin sudah verifikasi, menunggu mitra). */}
            {selectedTransaction?.approvalStatus === "pending_approval" ||
            selectedTransaction?.approvalStatus === "pending_mitra" ? (
              <div className="flex flex-col gap-2">
                {selectedTransaction?.approvalStatus === "pending_mitra" && (
                  <p className="text-xs text-muted-foreground">
                    Admin sudah memverifikasi pembayaran. Konfirmasi apakah Anda bisa melayani pesanan ini.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateApproval(selectedTransaction.id, "rejected")}
                  >
                    Tolak
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleUpdateApproval(selectedTransaction.id, "approved")}
                  >
                    Terima (Approve)
                  </Button>
                </div>
              </div>
            ) : (
              <div />
            )}
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}