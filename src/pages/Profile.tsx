import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  PlusCircle,
  QrCode,
  MessageSquare,
  ArrowRight,
  XCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RatingModal } from "@/components/RatingModal";
import { SubmitComplaintModal } from "@/components/SubmitComplaintModal";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { CitySelect } from "@/components/CitySelect";
import { talents } from "@/data/mockData";
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import { useToast } from "@/hooks/use-toast";
import {
  getCurrentUser,
  updateCurrentUser,
  NotificationItem,
  UserProfile,
  markNotificationRead,
  markAllNotificationsRead
} from "@/lib/userStore";
import { getBookings, refreshBookingsFromSupabase, updateBookingRating } from "@/lib/bookingStore";
import { dicebearAvatar, initialsAvatar } from "@/lib/utils";
import { compressImageFile } from "@/utils/imageCompressor";
import { createTopUpRequest, getUserTopUpRequests, TopUpRequest } from "@/lib/topupStore";
import { getUserWithdrawalRequests, WithdrawalRequest } from "@/lib/withdrawalStore";
import { getActiveChatSessions } from "@/lib/chatStore";

const TOP_UP_OPTIONS = [50000, 100000, 200000, 500000, 1000000];

function parseNotificationDetails(notif: any) {
  const title = String(notif.title || '');
  const titleLower = title.toLowerCase();
  const message = String(notif.message || '');
  const messageLower = message.toLowerCase();

  const isTopUp = titleLower.includes('top-up') || titleLower.includes('isi saldo') || messageLower.includes('isi saldo');
  const isTopUpRejected = isTopUp && (titleLower.includes('ditolak') || messageLower.includes('ditolak'));
  const isTopUpApproval = isTopUp && (titleLower.includes('berhasil') || titleLower.includes('disetujui'));
  const isTopUpRequest = isTopUp && !isTopUpRejected && !isTopUpApproval;

  const isBookingRejected = !isTopUp && (
    titleLower.includes('ditolak') || 
    messageLower.includes('menolak pesanan') || 
    messageLower.includes('pesanan ditolak')
  );

  const isBookingApproved = !isTopUp && !isBookingRejected && (
    titleLower.includes('disetujui') || 
    messageLower.includes('telah disetujui')
  );

  const isPaymentVerification = !isTopUp && !isBookingRejected && !isBookingApproved && (
    titleLower.includes('pembayaran') || 
    messageLower.includes('sedang diverifikasi') || 
    messageLower.includes('verifikasi admin')
  );

  const isBookingCreated = !isTopUp && !isBookingRejected && !isBookingApproved && !isPaymentVerification && (
    titleLower.includes('berhasil dibuat') || 
    titleLower.includes('permintaan pemesanan')
  );

  let rejectionReason = "";
  let refundInfo = "";

  if (isBookingRejected) {
    const reasonMatch = message.match(/Alasan:\s*([^.]+)/i);
    if (reasonMatch) {
      rejectionReason = reasonMatch[1].trim();
    }
    
    if (messageLower.includes('menunggu admin')) {
      refundInfo = "Pengembalian dana transfer sedang menunggu proses verifikasi dan transfer dari admin.";
    } else if (messageLower.includes('saldo sudah dikembalikan') || messageLower.includes('dikembalikan ke saldo')) {
      refundInfo = "Dana saldo telah otomatis dikembalikan ke dompet akun RentMate kamu.";
    } else if (messageLower.includes('dana akan dikembalikan')) {
      refundInfo = "Dana akan dikembalikan sesuai metode pembayaran asal.";
    } else if (messageLower.includes('selesai') || messageLower.includes('telah dikembalikan')) {
      refundInfo = "Dana telah berhasil dikembalikan (refund selesai).";
    }
  }

  let categoryLabel = "Pemberitahuan";
  let variantType: "rejected" | "approved" | "payment" | "created" | "info" = "info";

  if (isBookingRejected) {
    categoryLabel = "Pesanan Ditolak";
    variantType = "rejected";
  } else if (isBookingApproved) {
    categoryLabel = "Pesanan Disetujui";
    variantType = "approved";
  } else if (isPaymentVerification) {
    categoryLabel = "Verifikasi Pembayaran";
    variantType = "payment";
  } else if (isBookingCreated) {
    categoryLabel = "Pesanan Dibuat";
    variantType = "created";
  } else if (isTopUpApproval) {
    categoryLabel = "Isi Saldo Berhasil";
    variantType = "approved";
  } else if (isTopUpRejected) {
    categoryLabel = "Isi Saldo Ditolak";
    variantType = "rejected";
  } else if (isTopUpRequest) {
    categoryLabel = "Permintaan Saldo";
    variantType = "payment";
  }

  return {
    isBookingRejected,
    isBookingApproved,
    isPaymentVerification,
    isBookingCreated,
    isTopUp,
    rejectionReason,
    refundInfo,
    categoryLabel,
    variantType,
  };
}


export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(requestedTab === "notifications" ? "notifications" : "bookings");
  const [isEditing, setIsEditing] = useState(false);

  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  // Multi-step top-up state
  const [topUpStep, setTopUpStep] = useState<1 | 2 | 3>(1);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [topUpCustomAmount, setTopUpCustomAmount] = useState("");
  const [topUpProofFile, setTopUpProofFile] = useState<File | null>(null);
  const [topUpProofPreview, setTopUpProofPreview] = useState<string | null>(null);
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const [myTopUpRequests, setMyTopUpRequests] = useState<TopUpRequest[]>([]);
  const [myWithdrawalRequests, setMyWithdrawalRequests] = useState<WithdrawalRequest[]>([]);

  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isNotificationDetailsOpen, setIsNotificationDetailsOpen] = useState(false);
  const [isMarkingAllNotificationsRead, setIsMarkingAllNotificationsRead] = useState(false);
  const [notificationCategoryFilter, setNotificationCategoryFilter] = useState<"all" | "unread" | "booking" | "payment">("all");

  const [bookings, setBookings] = useState<any[]>([]);
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [myChatSessions, setMyChatSessions] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"all" | "booking" | "saldo" | "withdrawal" | "complaint" | "chat">("all");
  const [historyTimeFilter, setHistoryTimeFilter] = useState<"newest" | "oldest">("newest");


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

  const [complaintModal, setComplaintModal] = useState<{
    isOpen: boolean;
    bookingId: string;
    talentName: string;
    talentPhoto?: string;
    bookingDate?: string;
    bookingPurpose?: string;
  }>({ isOpen: false, bookingId: "", talentName: "" });

  const notifications = useMemo(() => userData?.notifications || [], [userData?.notifications]);

  useEffect(() => {
    if (requestedTab === "notifications") setActiveTab("notifications");
  }, [requestedTab]);

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

  useEffect(() => {
    if (activeTab !== "notifications") return;

    const refreshNotifications = () => {
      if (document.visibilityState === "visible") void loadUserData();
    };
    const interval = window.setInterval(refreshNotifications, 7000);
    window.addEventListener("focus", refreshNotifications);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshNotifications);
    };
  }, [activeTab, loadUserData]);

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

  const loadUserComplaints = useCallback(async (userId: string, userEmail?: string) => {
    try {
      let reports: any[] = [];
      try {
        const res = await fetch("/api/complaints");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) reports = data;
        }
      } catch {
        // Fallback network error
      }

      try {
        const local = JSON.parse(localStorage.getItem("lovable_reports") || "[]");
        if (Array.isArray(local)) {
          const ids = new Set(reports.map(r => r.id));
          local.forEach(r => {
            if (!ids.has(r.id)) reports.push(r);
          });
        }
      } catch {
        // Fallback
      }

      const filtered = reports.filter(r =>
        (r.userId && r.userId === userId) ||
        (r.user_id && r.user_id === userId) ||
        (userEmail && r.userEmail && r.userEmail.toLowerCase() === userEmail.toLowerCase())
      );
      setMyComplaints(filtered);
    } catch (err) {
      console.error("Gagal memuat komplain pengguna:", err);
    }
  }, []);

  const loadUserChats = useCallback(() => {
    try {
      const sessions = getActiveChatSessions();
      setMyChatSessions(Array.isArray(sessions) ? sessions : []);
    } catch (err) {
      console.error("Gagal memuat sesi chat pengguna:", err);
    }
  }, []);

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

    // Muat riwayat top-up, penarikan saldo, komplain, & percakapan milik user
    loadUserData().then(async () => {
      const user = await import("@/lib/userStore").then(m => m.getCurrentUser());
      if (user) {
        getUserTopUpRequests(user.id).then(reqs => setMyTopUpRequests(reqs));
        getUserWithdrawalRequests(user.id).then(reqs => setMyWithdrawalRequests(reqs));
        loadUserComplaints(user.id, user.email);
        loadUserChats();
      }
    });
  }, [loadUserData, loadUserBookings, refreshTrigger, loadUserComplaints, loadUserChats]);

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

  // Re-load top-up, withdrawal, complaints & chat sessions when data changes
  useEffect(() => {
    const handleFinancialUpdate = async () => {
      const user = await import("@/lib/userStore").then(m => m.getCurrentUser());
      if (user) {
        getUserTopUpRequests(user.id).then(reqs => setMyTopUpRequests(reqs));
        getUserWithdrawalRequests(user.id).then(reqs => setMyWithdrawalRequests(reqs));
        loadUserComplaints(user.id, user.email);
        loadUserChats();
        // Reload user data to reflect wallet changes
        loadUserData();
      }
    };
    window.addEventListener("topupRequestsUpdated", handleFinancialUpdate);
    window.addEventListener("withdrawalRequestsUpdated", handleFinancialUpdate);
    window.addEventListener("userUpdated", handleFinancialUpdate);
    window.addEventListener("newReport", handleFinancialUpdate);
    window.addEventListener("chatsUpdated", handleFinancialUpdate);
    window.addEventListener("chatSessionsUpdated", handleFinancialUpdate);
    
    // Listen for notification updates
    const handleNotificationsUpdate = () => {
      loadUserData();
    };
    window.addEventListener("notificationsUpdated", handleNotificationsUpdate);
    
    // Cross-tab sync for localStorage
    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === "rentmate_topup_requests" ||
        e.key === "rentmate_withdrawal_requests" ||
        e.key === "rentmate_complaints_updated" ||
        e.key === "lovable_reports" ||
        e.key?.startsWith("rentmate_notifications_") ||
        e.key === "rentmate_current_username"
      ) {
        handleFinancialUpdate();
        loadUserData();
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("topupRequestsUpdated", handleFinancialUpdate);
      window.removeEventListener("withdrawalRequestsUpdated", handleFinancialUpdate);
      window.removeEventListener("userUpdated", handleFinancialUpdate);
      window.removeEventListener("newReport", handleFinancialUpdate);
      window.removeEventListener("chatsUpdated", handleFinancialUpdate);
      window.removeEventListener("chatSessionsUpdated", handleFinancialUpdate);
      window.removeEventListener("notificationsUpdated", handleNotificationsUpdate);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [loadUserData, loadUserComplaints, loadUserChats]);


  const handleTopUpProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 5MB", variant: "destructive" });
      return;
    }
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.8);
      setTopUpProofFile(file);
      setTopUpProofPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setTopUpProofPreview(reader.result as string);
      reader.readAsDataURL(file);
      setTopUpProofFile(file);
    }
  };

  const handleSubmitTopUp = async () => {
    if (!topUpAmount || !topUpProofPreview || !userData) return;
    setIsSubmittingTopUp(true);
    try {
      const result = await createTopUpRequest(
        userData.id,
        userData.name,
        userData.email,
        topUpAmount,
        topUpProofPreview,
        userData.photo
      );
      if (result) {
        setMyTopUpRequests(prev => [result, ...prev]);
        setTopUpStep(3);
        
        // Save notification to DB
        const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.id,
            title: "Permintaan Isi Saldo Terkirim",
            message: `Permintaan isi saldo sebesar ${fmt(topUpAmount)} telah terkirim dan sedang menunggu persetujuan Admin.`,
            type: "payment"
          })
        }).catch(() => {
          // Fallback: localStorage
          const key = `rentmate_notifications_${userData.id}`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          existing.unshift({ id: Date.now(), title: "Permintaan Isi Saldo Terkirim", message: `Permintaan isi saldo sebesar ${fmt(topUpAmount)} telah terkirim dan sedang menunggu persetujuan Admin.`, time: new Date().toLocaleString("id-ID"), read: false, type: "payment" });
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
        });
        window.dispatchEvent(new CustomEvent("notificationsUpdated"));
        

      } else {
        throw new Error("Gagal membuat permintaan");
      }
    } catch {
      toast({ title: "Gagal Mengirim", description: "Terjadi kesalahan. Coba lagi.", variant: "destructive" });
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  const resetTopUpModal = () => {
    setIsTopUpOpen(false);
    setTopUpStep(1);
    setTopUpAmount(null);
    setTopUpCustomAmount("");
    setTopUpProofFile(null);
    setTopUpProofPreview(null);
  };

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

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.type === "booking" || notification.type === "payment") {
      setSelectedNotification(notification);
      setIsNotificationDetailsOpen(true);
    }

    const updated = await markNotificationRead(notification.id);
    if (updated) {
      setUserData(updated);
      setEditData(updated);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (isMarkingAllNotificationsRead || !notifications.some(notification => !notification.read)) return;
    setIsMarkingAllNotificationsRead(true);
    try {
      const updated = await markAllNotificationsRead();
      if (updated) {
        setUserData(updated);
        setEditData(updated);
      }
    } finally {
      setIsMarkingAllNotificationsRead(false);
    }
  };

  const menuItems = [
    {
      icon: Bell,
      label: "Notifikasi",
      action: () => {
        setActiveTab("notifications");
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

  const unifiedHistory = useMemo(() => {
    // 1. Map bookings
    const mappedBookings = bookings.map(b => ({
      ...b,
      historyType: "booking" as const,
      sortDate: new Date(b.createdAt || b.date).getTime()
    }));

    // 2. Map top up
    const mappedTopUps = myTopUpRequests.map(t => ({
      ...t,
      historyType: "saldo" as const,
      sortDate: new Date(t.createdAt).getTime()
    }));

    // 3. Map penarikan saldo (withdrawal)
    const mappedWithdrawals = myWithdrawalRequests.map(w => ({
      ...w,
      historyType: "withdrawal" as const,
      sortDate: new Date(w.createdAt).getTime()
    }));

    // 4. Map komplain
    const mappedComplaints = myComplaints.map(c => ({
      ...c,
      historyType: "complaint" as const,
      sortDate: new Date(c.createdAt || c.created_at || Date.now()).getTime()
    }));

    // 5. Map chat / percakapan
    const mappedChats = myChatSessions.map(cs => ({
      ...cs,
      historyType: "chat" as const,
      sortDate: new Date(cs.lastMessageTime || Date.now()).getTime()
    }));

    // 6. Combine & Filter
    let combined = [...mappedBookings, ...mappedTopUps, ...mappedWithdrawals, ...mappedComplaints, ...mappedChats];

    if (historyTypeFilter !== "all") {
      combined = combined.filter(item => item.historyType === historyTypeFilter);
    }

    // 7. Sort
    combined.sort((a, b) => {
      if (historyTimeFilter === "newest") {
        return b.sortDate - a.sortDate;
      }
      return a.sortDate - b.sortDate;
    });

    return combined;
  }, [bookings, myTopUpRequests, myWithdrawalRequests, myComplaints, myChatSessions, historyTypeFilter, historyTimeFilter]);


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
                      <label className="text-sm font-medium mb-2 block">Kota Domisili</label>
                      <CitySelect
                        value={editData.city}
                        onChange={(val) => setEditData({ ...editData, city: val })}
                        placeholder="Pilih atau cari kota..."
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Saldo Dompet</p>
                <p className="text-2xl font-bold">{formatPrice(userData.wallet)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="text-foreground gap-1.5 shadow-sm" onClick={() => setIsTopUpOpen(true)}>
                <PlusCircle className="w-4 h-4 text-orange-600" />
                Isi Saldo
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/40 gap-1.5 shadow-sm backdrop-blur"
                onClick={() => setIsWithdrawalOpen(true)}
              >
                <ArrowUpRight className="w-4 h-4" />
                Tarik Saldo
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            const nextParams = new URLSearchParams(searchParams);
            if (tab === "notifications") nextParams.set("tab", "notifications");
            else nextParams.delete("tab");
            setSearchParams(nextParams, { replace: true });
          }}
        >
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="bookings">Riwayat</TabsTrigger>
            <TabsTrigger value="notifications" className="relative gap-2">
              <Bell className="w-4 h-4" />
              Notifikasi
              {notifications.filter((notification) => !notification.read).length > 0 && (
                <span
                  aria-label={`${notifications.filter((notification) => !notification.read).length} notifikasi baru`}
                  className="absolute -top-2 -right-1 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                >
                  {notifications.filter((notification) => !notification.read).length > 99
                    ? "99+"
                    : notifications.filter((notification) => !notification.read).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold">Riwayat Terpadu</h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <Select value={historyTypeFilter} onValueChange={(val: any) => setHistoryTypeFilter(val)}>
                  <SelectTrigger className="w-[170px] h-9">
                    <SelectValue placeholder="Semua Riwayat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Riwayat</SelectItem>
                    <SelectItem value="booking">Pemesanan</SelectItem>
                    <SelectItem value="saldo">Isi Saldo (Top Up)</SelectItem>
                    <SelectItem value="withdrawal">Tarik Saldo</SelectItem>
                    <SelectItem value="complaint">Komplain</SelectItem>
                    <SelectItem value="chat">Percakapan</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={historyTimeFilter} onValueChange={(val: any) => setHistoryTimeFilter(val)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Waktu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Terbaru</SelectItem>
                    <SelectItem value="oldest">Terlama</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 ml-auto md:ml-0"
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
            </div>

            {isLoadingBookings ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : unifiedHistory.length > 0 ? (
              <div className="space-y-4">
                {unifiedHistory.map((item, index) => {
                  if (item.historyType === "saldo") {
                    const req = item as TopUpRequest;
                    return (
                      <Card key={`saldo-${req.id}-${index}`} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${req.status === 'pending' ? 'bg-yellow-100' : req.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Wallet className={`w-5 h-5 ${req.status === 'pending' ? 'text-yellow-600' : req.status === 'approved' ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Isi Saldo Dompet</p>
                            <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatPrice(req.amount)}</p>
                          <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'destructive'} className="mt-1">
                            {req.status === 'pending' ? 'Menunggu' : req.status === 'approved' ? 'Berhasil' : 'Ditolak'}
                          </Badge>
                        </div>
                      </Card>
                    );
                  } else if (item.historyType === "withdrawal") {
                    const req = item as WithdrawalRequest;
                    return (
                      <Card key={`wd-${req.id}-${index}`} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${req.status === 'pending' ? 'bg-amber-100 text-amber-600' : req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <ArrowUpRight className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Tarik Saldo ke {req.bankName}</p>
                            <p className="text-xs text-muted-foreground">{req.accountNumber} a.n {req.accountName} • {new Date(req.createdAt).toLocaleString("id-ID")}</p>
                            {req.status === "rejected" && req.adminNote && (
                              <p className="text-[11px] text-red-500 mt-0.5">Alasan penolakan: {req.adminNote}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">- {formatPrice(req.amount)}</p>
                          <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'destructive'} className="mt-1">
                            {req.status === 'pending' ? 'Menunggu Transfer' : req.status === 'approved' ? 'Berhasil Ditransfer' : 'Ditolak'}
                          </Badge>
                        </div>
                      </Card>
                    );
                  } else if (item.historyType === "complaint") {
                    const comp = item as any;
                    const isResolved = comp.status === "resolved";
                    const isInProgress = comp.status === "in-progress";
                    return (
                      <Card key={`comp-${comp.id}-${index}`} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isResolved ? "bg-emerald-100 text-emerald-600" : isInProgress ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600"
                            }`}>
                              <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Laporan Komplain: {comp.talentName || "Mitra"}</p>
                              <p className="text-xs text-muted-foreground">
                                {comp.createdAt ? new Date(comp.createdAt).toLocaleString("id-ID") : "-"}
                              </p>
                              <p className="text-xs text-foreground/80 mt-1 line-clamp-2 bg-muted/60 p-2 rounded-md max-w-xl">
                                {comp.description}
                              </p>
                              {comp.adminNotes && (
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 font-medium">
                                  Tanggapan Admin: {comp.adminNotes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                            <Badge variant={isResolved ? "success" : isInProgress ? "accent" : "warning"}>
                              {isResolved ? "Selesai Ditangani" : isInProgress ? "Sedang Diproses" : "Menunggu Peninjauan"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 px-2.5 gap-1"
                              onClick={() => {
                                setSelectedComplaint(comp);
                                setShowComplaintDialog(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail Komplain
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  } else if (item.historyType === "chat") {
                    const cs = item as any;
                    return (
                      <Card key={`chat-${cs.id}-${index}`} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={cs.talentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(cs.talentName || "Mitra")}`}
                              alt={cs.talentName}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{cs.talentName}</p>
                              <p className="text-xs text-primary font-medium truncate">{cs.purpose}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                {cs.lastMessage || "Mulai percakapan..."}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {cs.lastMessageTime ? new Date(cs.lastMessageTime).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => navigate(`/chat/${cs.bookingId}`)}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Buka Chat
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  } else {

                    const booking = item as any;
                    const talent = findTalent(booking.talentId);
                    if (!talent) return null;

                    return (
                      <Card key={`booking-${booking.id}-${index}`} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewTransactionDetails(booking)}>
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
                                  booking.approvalStatus === "expired"
                                    ? "destructive"
                                    : booking.status === "completed"
                                    ? "success"
                                    : booking.status === "upcoming" || booking.approvalStatus === "approved"
                                    ? "accent"
                                    : "secondary"
                                }
                              >
                                {booking.approvalStatus === "expired" ? "Kadaluarsa" : booking.status || booking.approvalStatus || "Pending"}
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
                                {(booking.status === "completed" || booking.approvalStatus === "approved" || booking.status === "upcoming") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 font-medium transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setComplaintModal({
                                        isOpen: true,
                                        bookingId: booking.id,
                                        talentName: talent.name,
                                        talentPhoto: talent.photo,
                                        bookingDate: booking.date,
                                        bookingPurpose: booking.purpose,
                                      });
                                    }}
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Komplain
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                })}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Riwayat Aktivitas</h3>
                <p className="text-muted-foreground mb-4">
                  Anda belum memiliki riwayat aktivitas, pemesanan, atau transaksi yang sesuai filter ini.
                </p>
                <Button onClick={() => navigate("/talents")}>
                  Cari Teman Aktivitas
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {/* Filter Chips & Mark All Read */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={notificationCategoryFilter === "all" ? "default" : "outline"}
                  className="h-8 text-xs rounded-full"
                  onClick={() => setNotificationCategoryFilter("all")}
                >
                  Semua ({notifications.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={notificationCategoryFilter === "unread" ? "default" : "outline"}
                  className="h-8 text-xs rounded-full"
                  onClick={() => setNotificationCategoryFilter("unread")}
                >
                  Belum Dibaca ({notifications.filter(n => !n.read).length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={notificationCategoryFilter === "booking" ? "default" : "outline"}
                  className="h-8 text-xs rounded-full"
                  onClick={() => setNotificationCategoryFilter("booking")}
                >
                  Pesanan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={notificationCategoryFilter === "payment" ? "default" : "outline"}
                  className="h-8 text-xs rounded-full"
                  onClick={() => setNotificationCategoryFilter("payment")}
                >
                  Keuangan & Saldo
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground self-end sm:self-auto"
                onClick={() => void handleMarkAllNotificationsRead()}
                disabled={isMarkingAllNotificationsRead || !notifications.some(notification => !notification.read)}
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Tandai semua dibaca
              </Button>
            </div>

            {/* Notification List */}
            {(() => {
              const filteredList = notifications.filter((notif: any) => {
                if (notificationCategoryFilter === "unread") return !notif.read;
                const details = parseNotificationDetails(notif);
                if (notificationCategoryFilter === "booking") {
                  return details.isBookingRejected || details.isBookingApproved || details.isBookingCreated;
                }
                if (notificationCategoryFilter === "payment") {
                  return details.isPaymentVerification || details.isTopUp;
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-orange-200">
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-primary flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Tidak ada notifikasi</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notificationCategoryFilter !== "all" 
                        ? "Tidak ada notifikasi untuk filter yang dipilih." 
                        : "Semua pembaruan pesanan dan saldo akan muncul di sini."}
                    </p>
                  </div>
                );
              }

              return filteredList.map((notif: any) => {
                const details = parseNotificationDetails(notif);

                // ==========================================
                // 1. KARTU KHUSUS STATUS PENOLAKAN (REJECTION)
                // ==========================================
                if (details.variantType === "rejected") {
                  return (
                    <Card
                      key={notif.id}
                      className={`overflow-hidden transition-all duration-300 rounded-2xl border ${
                        !notif.read
                          ? "bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 border-rose-300 shadow-sm shadow-rose-100 ring-1 ring-rose-200/60"
                          : "bg-white hover:bg-rose-50/20 border-rose-200/70 shadow-sm"
                      }`}
                    >
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 ring-4 ring-rose-50 shadow-xs">
                              <AlertTriangle className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-700 border-rose-200 font-semibold px-2.5 py-0.5 text-xs">
                                  {details.categoryLabel}
                                </Badge>
                                {!notif.read && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    Baru
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-base text-gray-900 mt-1">{notif.title}</h4>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/60 px-2.5 py-1 rounded-md">
                            {notif.time}
                          </span>
                        </div>

                        {/* BOX 1: Alasan Penolakan dari Mitra */}
                        {details.rejectionReason && (
                          <div className="rounded-xl border border-rose-200/90 bg-white/95 p-3.5 mb-2.5 shadow-xs">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                              Alasan dari Mitra:
                            </div>
                            <div className="pl-3.5 border-l-2 border-rose-400 py-0.5">
                              <p className="text-sm font-semibold text-gray-800 italic">
                                "{details.rejectionReason}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* BOX 2: Status Pengembalian Dana (Refund) */}
                        {details.refundInfo && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 mb-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                              <Wallet className="w-3.5 h-3.5 text-amber-600" />
                              Status Pengembalian Dana:
                            </div>
                            <div className="pl-3.5 border-l-2 border-amber-400 py-0.5">
                              <p className="text-sm text-amber-900 font-medium">
                                {details.refundInfo}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Pesan default jika bukan format alasan */}
                        {!details.rejectionReason && !details.refundInfo && (
                          <p className="text-sm text-gray-700 mb-4">{notif.message}</p>
                        )}

                        {/* Tombol Aksi Cepat */}
                        <div className="flex items-center justify-between pt-3 border-t border-rose-100 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to="/talents">
                              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 shadow-sm text-xs h-8">
                                <Sparkles className="w-3.5 h-3.5" />
                                Cari Teman Lain
                              </Button>
                            </Link>
                            <Link to="/bookings">
                              <Button size="sm" variant="outline" className="border-rose-200 text-gray-700 hover:bg-rose-50 gap-1.5 text-xs h-8">
                                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                                Cek Pesanan Saya
                              </Button>
                            </Link>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                            onClick={() => void handleNotificationClick(notif)}
                          >
                            {notif.read ? "Sudah dibaca" : "Tandai dibaca"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                }

                // ==========================================
                // 2. KARTU PESANAN DISETUJUI (APPROVED)
                // ==========================================
                if (details.variantType === "approved") {
                  return (
                    <Card
                      key={notif.id}
                      className={`overflow-hidden transition-all duration-300 rounded-2xl border ${
                        !notif.read
                          ? "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-300 shadow-sm ring-1 ring-emerald-200/60"
                          : "bg-white hover:bg-emerald-50/20 border-emerald-200/70 shadow-sm"
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 ring-4 ring-emerald-50 shadow-xs">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold px-2.5 py-0.5 text-xs">
                                  {details.categoryLabel}
                                </Badge>
                                {!notif.read && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    Baru
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-base text-gray-900 mt-1">{notif.title}</h4>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/60 px-2.5 py-1 rounded-md">
                            {notif.time}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-4">{notif.message}</p>

                        <div className="flex items-center justify-between pt-3 border-t border-emerald-100 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Link to="/chat">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-xs h-8">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Buka Percakapan
                              </Button>
                            </Link>
                            <Link to="/bookings">
                              <Button size="sm" variant="outline" className="border-emerald-200 text-gray-700 hover:bg-emerald-50 gap-1.5 text-xs h-8">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                Detail Pesanan
                              </Button>
                            </Link>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                            onClick={() => void handleNotificationClick(notif)}
                          >
                            {notif.read ? "Sudah dibaca" : "Tandai dibaca"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                }

                // ==========================================
                // 3. KARTU LAINNYA (PEMBAYARAN, PESANAN BARU, INFO)
                // ==========================================
                const iconColor = details.variantType === "payment"
                  ? "bg-amber-100 text-amber-600 ring-amber-50"
                  : details.variantType === "created"
                  ? "bg-blue-100 text-blue-600 ring-blue-50"
                  : "bg-orange-100 text-orange-600 ring-orange-50";

                const badgeColor = details.variantType === "payment"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : details.variantType === "created"
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : "bg-orange-100 text-orange-800 border-orange-200";

                return (
                  <Card
                    key={notif.id}
                    className={`overflow-hidden transition-all duration-300 rounded-2xl border ${
                      !notif.read
                        ? "bg-gradient-to-br from-orange-50/40 via-white to-white border-orange-300 shadow-sm ring-1 ring-orange-200/50"
                        : "bg-white hover:bg-muted/20 border-orange-100 shadow-sm"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-4 shadow-xs ${iconColor}`}>
                            {details.variantType === "payment" ? (
                              <Clock className="w-5 h-5" />
                            ) : details.variantType === "created" ? (
                              <Calendar className="w-5 h-5" />
                            ) : (
                              <Bell className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={`font-semibold px-2.5 py-0.5 text-xs hover:bg-transparent ${badgeColor}`}>
                                {details.categoryLabel}
                              </Badge>
                              {!notif.read && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                  Baru
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-base text-gray-900 mt-1">{notif.title}</h4>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/60 px-2.5 py-1 rounded-md">
                          {notif.time}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-4">{notif.message}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-wrap gap-2">
                        <Link to="/bookings">
                          <Button size="sm" variant="outline" className="border-orange-200 hover:bg-orange-50 text-gray-700 gap-1.5 text-xs h-8">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Lihat di Pesanan Saya
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                          onClick={() => void handleNotificationClick(notif)}
                        >
                          {notif.read ? "Sudah dibaca" : "Tandai dibaca"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              });
            })()}
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

        {/* Top Up Modal — 3 Langkah */}
        <Dialog open={isTopUpOpen} onOpenChange={(open) => !open && resetTopUpModal()}>
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
            <div className="p-6 pb-2 shrink-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Isi Saldo Dompet
                </DialogTitle>
              </DialogHeader>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 my-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex-1 h-1.5 rounded-full ${topUpStep >= s ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Langkah {topUpStep} dari 3: {topUpStep === 1 ? "Pilih Nominal" : topUpStep === 2 ? "Upload Bukti Transfer" : "Permintaan Dikirim"}
              </p>
            </div>

            {/* Konten Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              {/* STEP 1: Pilih Nominal */}
              {topUpStep === 1 && (
                <div className="space-y-4">
                  {/* Info Rekening Terpusat QRIS */}
                  <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/70 border border-orange-200 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-orange-950">Pembayaran Terpusat via QRIS</p>
                        <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-800 border-orange-300">
                          1 Rekening Kas
                        </Badge>
                      </div>
                      <p className="text-xs text-orange-800/80 mt-0.5">
                        Penyimpanan dana aman di <strong>QRIS PT TEMAN ACARA INDONESIA</strong>. Mendukung semua m-banking & e-wallet.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground font-medium">Pilih nominal top-up dompet:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TOP_UP_OPTIONS.map((amount) => (
                      <Button
                        key={amount}
                        variant={topUpAmount === amount ? "hero" : "outline"}
                        size="sm"
                        onClick={() => { setTopUpAmount(amount); setTopUpCustomAmount(""); }}
                        className="font-bold text-xs h-9"
                      >
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Atau masukkan nominal lain:</p>
                    <Input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={topUpCustomAmount}
                      onChange={(e) => {
                        setTopUpCustomAmount(e.target.value);
                        setTopUpAmount(Number(e.target.value) || null);
                      }}
                      className="h-10 text-sm font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Tampilkan QRIS Resmi & Upload Bukti Pembayaran */}
              {topUpStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 text-center space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Pembayaran Top-Up</p>
                    <p className="text-2xl font-black text-orange-600 tracking-tight">{formatPrice(topUpAmount || 0)}</p>
                    <p className="text-[11px] text-muted-foreground">Scan QRIS di bawah ini dengan m-Banking atau e-Wallet apa saja</p>
                  </div>

                  {/* Tampilan Barcode QRIS Resmi PT TemanAcara */}
                  <div className="flex flex-col items-center justify-center p-3.5 bg-white border border-orange-100 rounded-2xl shadow-sm text-center">
                    <div className="flex items-center justify-between w-full max-w-[210px] mb-2 px-1">
                      <span className="text-[11px] font-bold text-gray-800 tracking-tight">QRIS STANDAR NASIONAL</span>
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-mono font-bold">GPN</span>
                    </div>
                    <div className="w-44 h-44 p-2 bg-white rounded-xl border-2 border-orange-200 shadow-inner flex items-center justify-center overflow-hidden">
                      <img
                        src={localStorage.getItem("rentmate_admin_qris_code") || "/assets/qris-default.png"}
                        alt="QRIS PT TemanAcara"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-bold text-gray-900">PT TEMAN ACARA INDONESIA</p>
                      <p className="text-[10px] font-mono text-muted-foreground">NMID: ID1020023456789</p>
                    </div>
                  </div>

                  {/* Upload Bukti Pembayaran */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground text-center">Upload Bukti Pembayaran QRIS:</p>
                    <div className="flex flex-col items-center">
                      {topUpProofPreview ? (
                        <div className="relative w-full max-w-[240px]">
                          <img src={topUpProofPreview} alt="Bukti" className="w-full h-32 object-cover rounded-xl border border-orange-200 shadow-sm" />
                          <Button
                            variant="destructive" size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full shadow"
                            onClick={() => { setTopUpProofFile(null); setTopUpProofPreview(null); }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="w-full max-w-[240px] h-24 border-2 border-dashed border-orange-300 bg-orange-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/60 transition-all gap-1.5 text-muted-foreground text-xs">
                          <Camera className="w-5 h-5 text-orange-500" />
                          <span className="font-medium text-foreground">Klik untuk Upload Screenshot</span>
                          <span className="text-[10px] text-muted-foreground">Screenshot bukti bayar m-banking / e-wallet</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleTopUpProofUpload} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Sukses */}
              {topUpStep === 3 && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-lg">Permintaan Terkirim!</h3>
                  <p className="text-sm text-muted-foreground">
                    Permintaan top-up sebesar <strong>{formatPrice(topUpAmount || 0)}</strong> sedang menunggu verifikasi Admin.
                    Saldo akan ditambahkan setelah Admin menyetujui bukti transfer kamu.
                  </p>
                  <p className="text-xs text-muted-foreground">Biasanya diproses dalam 1×24 jam</p>
                </div>
              )}
            </div>

            {/* Pinned Footer di bagian bawah modal */}
            <DialogFooter className="p-4 px-6 border-t shrink-0 bg-background/95 backdrop-blur-sm gap-2">
              {topUpStep === 1 && (
                <>
                  <Button variant="outline" onClick={resetTopUpModal}>Batal</Button>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium"
                    onClick={() => setTopUpStep(2)} 
                    disabled={!topUpAmount || topUpAmount <= 0}
                  >
                    Lanjut →
                  </Button>
                </>
              )}
              {topUpStep === 2 && (
                <>
                  <Button variant="outline" onClick={() => setTopUpStep(1)}>← Kembali</Button>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-md shadow-orange-500/20"
                    onClick={handleSubmitTopUp} 
                    disabled={!topUpProofPreview || isSubmittingTopUp}
                  >
                    {isSubmittingTopUp ? "Mengirim..." : "Kirim Permintaan"}
                  </Button>
                </>
              )}
              {topUpStep === 3 && (
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium" onClick={resetTopUpModal}>
                  Tutup
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Tarik Saldo */}
        {userData && (
          <WithdrawalModal
            isOpen={isWithdrawalOpen}
            onClose={() => setIsWithdrawalOpen(false)}
            currentUser={userData}
            onSuccess={() => {
              loadUserData();
            }}
          />
        )}



        {/* Dialog Detail Transaksi */}
        <Dialog
          open={isNotificationDetailsOpen}
          onOpenChange={(open) => {
            setIsNotificationDetailsOpen(open);
            if (!open) setSelectedNotification(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedNotification?.title || "Detail notifikasi"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">{selectedNotification?.message}</p>
              {selectedNotification?.time && (
                <p className="text-xs text-muted-foreground">{selectedNotification.time}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNotificationDetailsOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
        {/* Modal Ajukan Komplain Pelanggan */}
        <SubmitComplaintModal
          isOpen={complaintModal.isOpen}
          onClose={() => setComplaintModal({ ...complaintModal, isOpen: false })}
          bookingId={complaintModal.bookingId}
          talentName={complaintModal.talentName}
          talentPhoto={complaintModal.talentPhoto}
          bookingDate={complaintModal.bookingDate}
          bookingPurpose={complaintModal.bookingPurpose}
        />
        {/* Modal Detail Notifikasi */}
        <Dialog open={isNotificationDetailsOpen} onOpenChange={setIsNotificationDetailsOpen}>
          <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="sr-only">Detail Notifikasi</DialogTitle>
            </DialogHeader>
            {selectedNotification && (() => {
              const details = parseNotificationDetails(selectedNotification);
              return (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      details.variantType === "rejected"
                        ? "bg-rose-100 text-rose-600"
                        : details.variantType === "approved"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-orange-100 text-orange-600"
                    }`}>
                      {details.variantType === "rejected" ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : details.variantType === "approved" ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Bell className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {details.categoryLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{selectedNotification.time}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedNotification.title}</h3>
                    </div>
                  </div>

                  {details.rejectionReason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1.5">
                        <MessageSquare className="w-4 h-4 text-rose-500" />
                        Alasan dari Mitra:
                      </div>
                      <p className="text-sm font-semibold text-gray-800 italic pl-3 border-l-2 border-rose-400">
                        "{details.rejectionReason}"
                      </p>
                    </div>
                  )}

                  {details.refundInfo && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                        <Wallet className="w-4 h-4 text-amber-600" />
                        Status Pengembalian Dana:
                      </div>
                      <p className="text-sm text-amber-900 font-medium pl-3 border-l-2 border-amber-400">
                        {details.refundInfo}
                      </p>
                    </div>
                  )}

                  {!details.rejectionReason && !details.refundInfo && (
                    <div className="bg-muted/40 rounded-xl p-4 text-sm text-gray-700">
                      {selectedNotification.message}
                    </div>
                  )}

                  <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                    {details.variantType === "rejected" && (
                      <Link to="/talents" className="w-full sm:w-auto" onClick={() => setIsNotificationDetailsOpen(false)}>
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          Cari Teman Lain
                        </Button>
                      </Link>
                    )}
                    {details.variantType === "approved" && (
                      <Link to="/chat" className="w-full sm:w-auto" onClick={() => setIsNotificationDetailsOpen(false)}>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                          <MessageSquare className="w-4 h-4" />
                          Buka Percakapan
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsNotificationDetailsOpen(false)}>
                      Tutup
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Modal Detail Komplain */}
        <Dialog open={showComplaintDialog} onOpenChange={(open) => !open && setShowComplaintDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                Detail Laporan Komplain
              </DialogTitle>
            </DialogHeader>
            {selectedComplaint && (
              <div className="space-y-4 py-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedComplaint.status === "resolved" ? "success" : selectedComplaint.status === "in-progress" ? "accent" : "warning"}>
                    {selectedComplaint.status === "resolved" ? "Selesai Ditangani" : selectedComplaint.status === "in-progress" ? "Sedang Diproses" : "Menunggu Peninjauan"}
                  </Badge>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">Mitra Terkait</span>
                  <span className="font-medium">{selectedComplaint.talentName || "-"}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">ID Booking</span>
                  <span className="font-mono text-xs">{selectedComplaint.bookingId || "-"}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">Waktu Laporan</span>
                  <span>{selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString("id-ID") : "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Isi Keluhan:</span>
                  <div className="bg-muted p-3 rounded-md text-xs whitespace-pre-wrap">{selectedComplaint.description}</div>
                </div>
                {selectedComplaint.adminNotes && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Tanggapan / Solusi Admin:</span>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 p-3 rounded-md text-xs">
                      {selectedComplaint.adminNotes}
                    </div>
                  </div>
                )}
                {selectedComplaint.proofImage && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Bukti Foto:</span>
                    <img src={selectedComplaint.proofImage} alt="Bukti Komplain" className="w-full max-h-48 object-cover rounded-md border" />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" className="w-full" onClick={() => setShowComplaintDialog(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}