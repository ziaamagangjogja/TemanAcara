import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Edit3,
  Camera,
  MapPin,
  Calendar,
  Wallet,
  Clock,
  Star,
  ChevronRight,
  Settings,
  LogOut,
  HelpCircle,
  FileText,
  Bell,
  X,
  Save,
  CheckCircle,
  Eye,
  RefreshCw,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RatingModal } from "@/components/RatingModal";
import { talents } from "@/data/mockData";
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import { useToast } from "@/hooks/use-toast";
import {
  getCurrentUser,
  updateCurrentUser,
  UserProfile,
  markAllNotificationsRead
} from "@/lib/userStore";
import { getBookings, refreshBookingsFromSupabase, updateBookingRating } from "@/lib/bookingStore";
import { dicebearAvatar, initialsAvatar } from "@/lib/utils";
import { compressImageFile } from "@/utils/imageCompressor";

const TOP_UP_OPTIONS = [50000, 100000, 250000];

export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bookings");
  const [isEditing, setIsEditing] = useState(false);

  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);

  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Daftar talent dari database (mitra asli), digabung dengan data dummy.
  // Ini penting agar booking ke mitra asli (mis. Yasmin) tetap tampil.
  const [dbTalents, setDbTalents] = useState<any[]>([]);

  // Cari talent dari data DB dulu, baru fallback ke data dummy.
  const findTalent = useCallback(
    (id: string): any | undefined => {
      const fromDb = dbTalents.find((t) => t.id === id);
      if (fromDb) return fromDb;
      return talents.find((t) => t.id === id);
    },
    [dbTalents]
  );

  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    talentId: string;
    bookingId: string;
  }>({ isOpen: false, talentId: "", bookingId: "" });
  const [ratedBookings, setRatedBookings] = useState<string[]>([]);
  const [ratedDetails, setRatedDetails] = useState<Record<string, { rating: number; comment: string; talentId: string }>>({});

  const notifications = useMemo(() => userData?.notifications || [], [userData?.notifications]);

  const loadUserData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserData(user);
        setEditData(user);
      }
    } catch (err) {
      console.error("Gagal memuat profil user:", err);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const loadUserBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const allBookings = await refreshBookingsFromSupabase();
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        setBookings([]);
        setIsLoadingBookings(false);
        return;
      }

      const matchesCurrentUserBooking = (booking: any) => {
        return booking.userId === currentUser.id;
      };

      let userBookings: any[] = allBookings.filter(matchesCurrentUserBooking);

      setBookings(userBookings);
    } catch (error) {
      console.error("Error loading user bookings:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data booking. Silakan refresh halaman.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBookings(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  const handleRefreshBookings = () => {
    setIsRefreshing(true);
    void loadUserBookings();
  };

  useEffect(() => {
    loadUserData();
    loadUserBookings();

    // Muat daftar talent dari database agar booking ke mitra asli
    // (mis. Yasmin) tetap dapat ditampilkan di riwayat.
    getAllVerifiedTalents()
      .then((list) => {
        setDbTalents(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        console.error("Gagal memuat talent dari database:", e);
      });

    try {
      const stored = localStorage.getItem("rentmate_user_reviews");
      if (stored) {
        const arr = JSON.parse(stored) as Array<{ bookingId: string; rating: number; comment: string; talentId: string }>;
        const map: Record<string, { rating: number; comment: string; talentId: string }> = {};
        const ids: string[] = [];
        arr.forEach((it) => {
          map[it.bookingId] = { rating: it.rating, comment: it.comment, talentId: it.talentId };
          ids.push(it.bookingId);
        });
        setRatedDetails(map);
        setRatedBookings(ids);
      }
    } catch {}
  }, [loadUserData, loadUserBookings, refreshTrigger]);

  useEffect(() => {
    const handleBookingUpdate = () => {
      loadUserBookings();
    };

    window.addEventListener('bookingUpdated', handleBookingUpdate);
    window.addEventListener('bookingCompleted', handleBookingUpdate);
    window.addEventListener('bookingApproved', handleBookingUpdate);

    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
      window.removeEventListener('bookingCompleted', handleBookingUpdate);
      window.removeEventListener('bookingApproved', handleBookingUpdate);
    };
  }, [loadUserBookings]);

  useEffect(() => {
    async function checkNotifications() {
      if (activeTab === "notifications" && notifications.some((n) => !n.read)) {
        const updated = await markAllNotificationsRead();
        if (updated) {
          setUserData(updated);
          setEditData(updated);
        }
      }
    }
    checkNotifications();
  }, [activeTab, notifications]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const handleEditClick = () => {
    if (userData) setEditData(userData);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    if (userData) setEditData(userData);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editData) return;
    const updated = await updateCurrentUser(editData);
    if (updated) {
      setUserData(updated);
      setIsEditing(false);
      toast({
        title: "Profil berhasil diperbarui",
        description: "Perubahan telah disimpan ke server",
      });
    } else {
      toast({
        title: "Gagal memperbarui",
        description: "Terjadi kesalahan saat menyimpan perubahan",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("rentmate_current_username");
    window.dispatchEvent(new CustomEvent("userUpdated"));

    toast({
      title: "Berhasil Keluar",
      description: "Sampai jumpa kembali!",
    });

    navigate("/login");
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImageFile(file);
        setPhotoPreview(compressedBase64);
      } catch (err) {
        console.error("Gagal mengkompresi gambar:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSavePhoto = async () => {
    if (photoPreview) {
      const updated = await updateCurrentUser({ photo: photoPreview });
      if (updated) {
        setUserData(updated);
        setEditData(updated);
        setIsPhotoModalOpen(false);
        setPhotoPreview(null);
        toast({
          title: "Foto Profil Diperbarui",
          description: "Foto profil baru Anda telah disimpan.",
        });
      }
    }
  };

  const handleViewTransactionDetails = (booking: any) => {
    setSelectedTransaction(booking);
    setShowTransactionDialog(true);
  };

  const handleNavigateToChat = (e: React.MouseEvent, booking: any) => {
    e.stopPropagation();
    let chatId = booking.id;
    if (booking.chatId) {
      chatId = booking.chatId;
    }
    navigate(`/chat/${chatId}`);
  };

  const menuItems = [
    {
      icon: Bell,
      label: "Notifikasi",
      action: async () => {
        setActiveTab("notifications");
        if (notifications.some((n) => !n.read)) {
          const updated = await markAllNotificationsRead();
          if (updated) {
            setUserData(updated);
            setEditData(updated);
          }
        }
      },
      badge: notifications.filter(n => !n.read).length
    },
    {
      icon: Settings,
      label: "Pengaturan",
      action: () => {
        handleEditClick();
      }
    },
    {
      icon: HeartHandshake,
      label: "Jadi Mitra / Talent",
      path: "/mitra"
    },
    {
      icon: HelpCircle,
      label: "Bantuan",
      path: "/faq"
    },
    {
      icon: FileText,
      label: "Syarat & Ketentuan",
      path: "/syarat-ketentuan"
    },
  ];

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-bold mb-2">Belum Masuk</h2>
          <p className="text-muted-foreground mb-4">Silakan masuk atau daftar terlebih dahulu untuk melihat profil Anda.</p>
          <Button onClick={() => navigate("/login")} className="w-full">Masuk Sekarang</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 md:pt-24 pb-24 md:pb-8">
      <div className="container max-w-4xl">
        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
              <img
                src={userData.photo || initialsAvatar(userData.username || userData.name, 128)}
                alt={userData.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover ring-4 ring-primary/20 transition-all group-hover:ring-primary/50"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = initialsAvatar(userData.username || userData.name, 128);
                }}
              />
              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white drop-shadow-md" />
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-orange pointer-events-none"
                  aria-label="Edit foto profil">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            {!isEditing ? (
              <>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{userData.name}</h1>
                    <Badge variant="secondary" className="gap-1">
                      <User className="w-3 h-3" />
                      {userData.preference === "online" ? "Online" : userData.preference === "offline" ? "Offline" : "Online & Offline"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-1">@{userData.username}</p>
                  <p className="text-sm text-muted-foreground mb-2">{userData.bio}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {userData.city || "Indonesia"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Bergabung {new Date(userData.joinDate).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button variant="outline" className="gap-2" onClick={handleEditClick}>
                    <Edit3 className="w-4 h-4" />
                    Edit Profil
                  </Button>
                </div>
              </>
            ) : editData && (
              <div className="flex-1 w-full">
                <div className="grid gap-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nama Lengkap</label>
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Nama lengkap"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Username</label>
                      <Input
                        value={editData.username}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        placeholder="Username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Bio Singkat</label>
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      placeholder="Ceritakan tentang dirimu"
                      className="resize-none"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Kota</label>
                      <Input
                        value={editData.city}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        placeholder="Kota"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Hobi</label>
                      <Input
                        value={editData.hobbies}
                        onChange={(e) => setEditData({ ...editData, hobbies: e.target.value })}
                        placeholder="Hobi (pisahkan dengan koma)"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Nomor Kontak</label>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Nomor telepon"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Status / Preferensi Pertemuan</label>
                    <div className="flex gap-2">
                      {[
                        { value: "online", label: "Online" },
                        { value: "offline", label: "Offline" },
                        { value: "both", label: "Keduanya" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={editData.preference === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setEditData({ ...editData, preference: option.value as "online" | "offline" | "both" })
                          }
                          className="flex-1"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t bg-muted/20 p-4 rounded-lg">
                    <p className="text-sm font-semibold mb-3">Informasi Akun</p>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Email</span>
                        <span className="font-medium bg-background px-2 py-1 rounded border block">{userData.email || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">ID Akun</span>
                        <span className="font-mono text-xs bg-background px-2 py-1.5 rounded border block">{userData.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 border-t mt-2">
                    <Button variant="hero" className="flex-1 gap-2" onClick={handleSaveProfile}>
                      <Save className="w-4 h-4" />
                      Simpan Perubahan
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={handleCancelEdit}>
                      <X className="w-4 h-4" />
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Wallet Card */}
        <Card className="p-6 mb-6 bg-gradient-hero text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Saldo Dompet</p>
                <p className="text-2xl font-bold">{formatPrice(userData.wallet)}</p>
              </div>
            </div>
            <Button variant="secondary" className="text-foreground" onClick={() => setIsTopUpOpen(true)}>
              Isi Saldo
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="bookings">Riwayat</TabsTrigger>
            <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Riwayat Pemesanan</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefreshBookings}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>

            {isLoadingBookings ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : bookings.length > 0 ? (
              bookings.map((booking) => {
                const talent = findTalent(booking.talentId);
                if (!talent) return null;

                return (
                  <Card key={booking.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewTransactionDetails(booking)}>
                    <div className="flex gap-4">
                      <img
                        src={talent.photo}
                        alt={talent.name}
                        className="w-20 h-20 rounded-xl object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = dicebearAvatar(talent.name, talent.gender as any, 128);
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold">{talent.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {booking.purpose}
                            </p>
                          </div>
                          <Badge
                            variant={
                              booking.status === "completed"
                                ? "success"
                                : booking.status === "upcoming" || booking.approvalStatus === "approved"
                                ? "accent"
                                : "secondary"
                            }
                          >
                            {booking.status || booking.approvalStatus || "Pending"}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {booking.time} • {booking.duration} jam
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">
                              {formatPrice(booking.total)}
                            </span>
                            {(booking.status === "completed" || booking.approvalStatus === "completed") ? (
                              !ratedBookings.includes(booking.id) ? (
                                <Button
                                  variant="hero"
                                  size="sm"
                                  className="gap-1 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRatingModal({
                                      isOpen: true,
                                      talentId: booking.talentId,
                                      bookingId: booking.id,
                                    });
                                  }}
                                >
                                  <Star className="w-4 h-4" />
                                  Beri Ulasan
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" disabled>
                                    Ulasan telah diberikan
                                  </Button>
                                  <div className="flex items-center gap-1 text-amber-500">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span className="font-semibold">{ratedDetails[booking.id]?.rating}</span>
                                  </div>
                                </>
                              )
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Belum dapat memberi ulasan
                              </Button>
                            )}
                            {(booking.status === "upcoming" || booking.approvalStatus === "approved") && (
                              <Button
                                size="sm"
                                onClick={(e) => handleNavigateToChat(e, booking)}
                              >
                                Obrolan
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTransactionDetails(booking);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              Lihat Detail
                            </Button>
                          </div>
                        </div>
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
                <Button onClick={() => navigate("/talents")}>
                  Cari Talent
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
             {notifications.length > 0 ? (
                notifications.map((notif: any) => (
                  <Card key={notif.id} className={`p-4 ${!notif.read ? 'bg-accent/10 border-l-4 border-l-primary' : ''}`}>
                    <div className="flex items-start gap-4">
                       <div className={`p-2 rounded-full ${notif.type === 'payment' ? 'bg-green-100 text-green-600' : notif.type === 'booking' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          {notif.type === 'payment' ? <Wallet className="w-5 h-5" /> : notif.type === 'booking' ? <Calendar className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <h4 className="font-semibold text-sm">{notif.title}</h4>
                             <span className="text-xs text-muted-foreground">{notif.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                          {notif.read && (
                            <Badge variant="secondary" className="mt-2 text-xs">Sudah dibaca</Badge>
                          )}
                       </div>
                    </div>
                  </Card>
                ))
             ) : (
                <div className="text-center py-8 text-muted-foreground">
                   Tidak ada notifikasi
                </div>
             )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <Card
                  key={item.label}
                  className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                  onClick={item.action}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center relative">
                      <Icon className="w-5 h-5 text-primary" />
                      {item.badge ? (
                         <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                           {item.badge}
                         </span>
                      ) : null}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Card>
              );

              if (item.path) {
                return (
                  <Link key={item.label} to={item.path} className="block">
                    {content}
                  </Link>
                );
              }

              return content;
            })}

            <Card
              className="p-4 flex items-center justify-between cursor-pointer text-destructive mt-4 hover:shadow-md transition-shadow"
              onClick={handleLogout}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-medium">Keluar</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rating Modal */}
        {ratingModal.talentId && (
          <RatingModal
            isOpen={ratingModal.isOpen}
            onClose={() => setRatingModal({ isOpen: false, talentId: "", bookingId: "" })}
            talentName={findTalent(ratingModal.talentId)?.name || ""}
            talentPhoto={findTalent(ratingModal.talentId)?.photo || ""}
            bookingId={ratingModal.bookingId}
            onSubmit={async (rating, comment) => {
              const entry = { bookingId: ratingModal.bookingId, rating, comment, talentId: ratingModal.talentId };
              const updatedBooking = await updateBookingRating(ratingModal.bookingId, rating, comment);
              if (!updatedBooking) {
                toast({
                  title: "Rating gagal disimpan",
                  description: "Rating belum tersimpan ke server. Silakan coba lagi.",
                  variant: "destructive",
                });
                return;
              }

              setRatedBookings((prev) => [...prev, ratingModal.bookingId]);
              setRatedDetails((prev) => ({ ...prev, [ratingModal.bookingId]: { rating, comment, talentId: ratingModal.talentId } }));
              try {
                const stored = localStorage.getItem("rentmate_user_reviews");
                const arr = stored ? JSON.parse(stored) : [];
                arr.push(entry);
                localStorage.setItem("rentmate_user_reviews", JSON.stringify(arr));
              } catch {}
            }}
          />
        )}

        {/* Photo Upload Modal */}
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ganti Foto Profil</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative">
                <img
                  src={photoPreview || userData.photo || initialsAvatar(userData.username || userData.name, 128)}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => document.getElementById("profile-upload-input")?.click()}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = initialsAvatar(userData.username || userData.name, 128);
                  }}
                />
              </div>
              <div className="w-full max-w-xs">
                <label className="block text-sm font-medium mb-2 text-center">
                  Pilih Foto Baru
                </label>
                <Input
                  id="profile-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => { setIsPhotoModalOpen(false); setPhotoPreview(null); }}>
                 Batal
               </Button>
               <Button onClick={handleSavePhoto} disabled={!photoPreview}>
                 Simpan Foto
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Top Up Modal */}
        <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Isi Saldo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Pilih nominal untuk menambah saldo dompet Anda</p>
              <div className="grid grid-cols-3 gap-3">
                {TOP_UP_OPTIONS.map((amount) => (
                  <Button
                    key={amount}
                    variant={topUpAmount === amount ? "hero" : "outline"}
                    onClick={() => setTopUpAmount(amount)}
                  >
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsTopUpOpen(false); setTopUpAmount(null); }}>
                Batal
              </Button>
              <Button
                onClick={async () => {
                  if (topUpAmount && userData) {
                    const updated = await updateCurrentUser({ wallet: userData.wallet + topUpAmount });
                    if (updated) {
                      setUserData(updated);
                      setEditData(updated);
                      setIsTopUpOpen(false);
                      setTopUpAmount(null);
                      toast({
                        title: "Saldo berhasil ditambahkan",
                        description: `Saldo bertambah sebesar ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(topUpAmount)}`,
                      });
                    }
                  }
                }}
                disabled={!topUpAmount}
              >
                Konfirmasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <img
                      src={userData.photo}
                      alt={userData.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-background shadow"
                    />
                    <div>
                      <p className="text-xs text-muted-foreground">Pengguna</p>
                      <h3 className="font-bold">{userData.name}</h3>
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
                      <h3 className="font-bold">{findTalent(selectedTransaction.talentId)?.name}</h3>
                    </div>
                    <img
                      src={findTalent(selectedTransaction.talentId)?.photo}
                      alt={findTalent(selectedTransaction.talentId)?.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" 
                    />
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
                      <p className="text-xs text-muted-foreground mb-1">Total Pembayaran</p>
                      <p className="font-bold text-primary text-lg">{formatPrice(selectedTransaction.total)}</p>
                    </div>
                  </div>
                </div>
                    
                {selectedTransaction.paymentProof && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-semibold mb-2">Detail Pembayaran</p>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Metode</p>
                        <p className="font-medium">{selectedTransaction.paymentMethod ? selectedTransaction.paymentMethod.toUpperCase() : "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Kode Pembayaran</p>
                        <p className="font-medium">{selectedTransaction.paymentCode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Waktu Transfer</p>
                        <p className="font-medium">{selectedTransaction.transferTime}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jumlah</p>
                        <p className="font-medium">{formatPrice(selectedTransaction.transferAmount)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-muted-foreground text-sm mb-1">Bukti Transfer</p>
                      <img 
                        src={selectedTransaction.paymentProof} 
                        alt="Bukti Transfer" 
                        className="w-48 rounded-lg border shadow cursor-pointer" 
                        onClick={() => window.open(selectedTransaction.paymentProof, "_blank")} 
                      />
                    </div>
                  </div>
                )}
                
                {selectedTransaction.notes && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-semibold mb-2">Catatan Tambahan</p>
                    <p className="text-sm">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}