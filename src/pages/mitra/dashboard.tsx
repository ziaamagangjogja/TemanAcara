// src/pages/mitra/MitraDashboard.tsx

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  LogOut,
  User,
  Search,
  Settings,
  Bell,
  Star,
  CheckCircle,
  XCircle,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  SharedBooking,
  getBookings,
  updateBooking,
  subscribeToBookings,
  refreshBookingsFromSupabase,
  calculateMitraEarnings, // PERBAIKAN: Import fungsi baru
  calculateMitraRating,
  subscribeToCompletedBookings, // PERBAIKAN: Import fungsi baru
  isBookingCompleted,
} from "@/lib/bookingStore";
import { getCurrentMitra, updateMitraProfile, subscribeToMitraChanges } from "@/lib/mitraStore";
import {
  getChatSessionByBookingId,
  sendMitraMessage,
  subscribeToChats,
  ChatMessage,
  sendUserMessage,
} from "@/lib/chatStore";
import { formatPrice } from "@/lib/utils";

// --- TIPE DATA ---
type MitraRole = "talent" | "booker";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
};

type Chat = {
  id: string;
  bookingId: string;
  userName: string;
  userPhoto: string;
  lastMessage: string;
  lastMessageTime: Date;
  messages: Message[];
  bookingStatus: "pending" | "pending_mitra" | "approved" | "completed" | "cancelled" | "active" | "rejected";
  bookingDate: string;
  bookingTime: string;
  bookingDuration: number;
  bookingPurpose: string;
  bookingTotal: number;
  isUnread: boolean;
};

export default function MitraDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- STATE UNTUK MODE GANDA ---
  const [activeMode, setActiveMode] = useState<MitraRole>("talent");
  const [mitraAsTalent, setMitraAsTalent] = useState(getCurrentMitra());
  const [mitraAsBooker, setMitraAsBooker] = useState(getCurrentMitra());

  // --- STATE LAINNYA ---
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<SharedBooking[]>([]);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const [pendingBookingIds, setPendingBookingIds] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [earnings, setEarnings] = useState(0); // PERBAIKAN: State khusus untuk pendapatan
  const [stats, setStats] = useState([
    { label: "Total Chat", value: "0", icon: MessageSquare },
    { label: "Pendapatan", value: "Rp 0", icon: DollarSign },
    { label: "Rating", value: "0.0", icon: Star },
    { label: "Tingkat Respons", value: "0%", icon: TrendingUp },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper untuk mendapatkan data mitra berdasarkan mode
  const currentMitra = activeMode === "talent" ? mitraAsTalent : mitraAsBooker;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // --- FUNGSI YANG DIPERBAIKI & DIOPTIMASI ---

  const loadBookings = useCallback(async (mode: MitraRole = "talent") => {
    try {
      const currentMitraData = mode === "talent" ? mitraAsTalent : mitraAsBooker;
      if (!currentMitraData || !currentMitraData.id) {
        console.log(`MitraDashboard: No current mitra for mode ${mode}, cannot load bookings.`);
        setBookings([]);
        setChats([]);
        return;
      }

      console.log(`MitraDashboard: Loading bookings for mode: ${mode}`);
      const allBookings = await refreshBookingsFromSupabase();

      const pendingBookings = mode === "talent"
        ? allBookings.filter(
            (booking) =>
              booking.talentId === currentMitraData.talentId &&
              booking.approvalStatus === "pending_approval"
          )
        : [];
      const pendingIds = pendingBookings.map((booking) => booking.id);
      const seenPendingIds = JSON.parse(localStorage.getItem("rentmate_seen_mitra_orders") || "[]") as string[];
      setPendingBookingIds(pendingIds);
      setPendingBookingCount(pendingIds.filter((bookingId) => !seenPendingIds.includes(bookingId)).length);

      let mitraBookings: SharedBooking[] = [];
      if (mode === "talent") {
        mitraBookings = allBookings.filter(
          (booking) => booking.talentId === currentMitraData.talentId
        );
      } else {
        mitraBookings = allBookings.filter(
          (booking) =>
            booking.userId === currentMitraData.talentId
        );
      }

      const transformedChats: Chat[] = mitraBookings.map((booking) => {
        const chatSession = getChatSessionByBookingId(booking.id);

        const mappedMessages = (chatSession?.messages || []).map(msg => {
          let isFromMe = false;

          if (mode === "talent") {
            isFromMe = msg.senderType === "talent";
          } else {
            isFromMe =
              (msg.senderType === "user" && msg.senderId === currentMitraData.talentId) ||
              (msg.senderType === 'mitra-as-booker' && msg.senderId === currentMitraData.talentId);
          }

          let senderName = currentMitraData?.name || "Saya";
          let senderPhoto = currentMitraData?.photo || "";
          if (!isFromMe) {
            if (mode === "talent") {
              senderName = booking.userName;
              senderPhoto = booking.userPhoto;
            } else {
              senderName = booking.talentName;
              senderPhoto = booking.talentPhoto;
            }
          }

          return {
            id: msg.id,
            senderId: msg.senderId,
            senderName,
            senderPhoto,
            content: msg.message,
            timestamp: new Date(msg.timestamp),
            isFromMe,
          };
        });

        const bookingStartTime = new Date(`${booking.date}T${booking.time}`);
        const bookingEndTime = new Date(bookingStartTime);
        bookingEndTime.setHours(bookingEndTime.getHours() + booking.duration);
        const now = new Date();

        let status: "pending" | "pending_mitra" | "approved" | "completed" | "cancelled" | "active" | "rejected";
        if (booking.approvalStatus === "rejected") {
          status = "rejected";
        } else if (booking.approvalStatus === "pending_mitra") {
          // Admin sudah verifikasi; kini giliran Mitra menyetujui/menolak.
          status = "pending_mitra";
        } else if (booking.approvalStatus === "pending_approval") {
          status = "pending";
        } else if (bookingEndTime < now) {
          status = "completed";
        } else if (bookingStartTime <= now && now < bookingEndTime) {
          status = "active";
        } else {
          status = "approved";
        }

        let otherPartyName, otherPartyPhoto;
        if (mode === "talent") {
          otherPartyName = booking.userName;
          otherPartyPhoto = booking.userPhoto;
        } else {
          otherPartyName = booking.talentName;
          otherPartyPhoto = booking.talentPhoto;
        }
        
        return {
          id: `chat-${booking.id}`,
          bookingId: booking.id,
          userName: otherPartyName,
          userPhoto: otherPartyPhoto,
          lastMessage: chatSession?.messages?.length > 0 
            ? chatSession.messages[chatSession.messages.length - 1].message 
            : "Mulai percakapan...",
          lastMessageTime: chatSession?.messages?.length > 0 
            ? new Date(chatSession.messages[chatSession.messages.length - 1].timestamp)
            : new Date(booking.createdAt),
          messages: mappedMessages,
          bookingStatus: status,
          bookingDate: booking.date,
          bookingTime: booking.time,
          bookingDuration: booking.duration,
          bookingPurpose: booking.purpose,
          bookingTotal: booking.total,
          isUnread: chatSession?.messages?.some(
            (msg) => {
              let isUnreadByMe = false;
              if (mode === "talent") {
                isUnreadByMe = !msg.readByTalent && msg.senderType === "user";
              } else {
                isUnreadByMe = !msg.readByUser && msg.senderType === "talent";
              }
              return isUnreadByMe;
            }
          ) || false,
        };
      });

      transformedChats.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setChats(transformedChats);
      setBookings(mitraBookings);
      setLastUpdateTime(Date.now());
      localStorage.setItem("rentmate_last_data_update", Date.now().toString());
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data booking. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  }, [toast, mitraAsTalent, mitraAsBooker]);

  const updateStats = useCallback(async (forceRefresh = false) => {
    try {
      const currentMitraData = activeMode === "talent" ? mitraAsTalent : mitraAsBooker;
      if (!currentMitraData || !currentMitraData.id) {
        return;
      }

      // PERBAIKAN cross-tab: Refresh data dari Supabase agar rating yang diberikan
      // di tab/browser lain (oleh user) langsung ter-sinkron ke cache mitra ini.
      if (forceRefresh) {
        await refreshBookingsFromSupabase();
      }

      // PERBAIKAN: Gunakan fungsi baru untuk menghitung pendapatan
      const totalRevenue = calculateMitraEarnings(currentMitraData.talentId, activeMode === "talent");
      setEarnings(totalRevenue);
      
      const allBookings = getBookings();
      let mitraBookings: SharedBooking[] = [];

      if (activeMode === "talent") {
        mitraBookings = allBookings.filter(b => b.talentId === currentMitraData.talentId);
      } else {
        mitraBookings = allBookings.filter(b => 
          b.userId === currentMitraData.talentId
        );
      }
      
      const completedBookings = mitraBookings.filter((booking) => {
        return isBookingCompleted(booking);
      });
    
      const chatBookings = mitraBookings.filter(
        (booking) => booking.approvalStatus === "approved" || booking.approvalStatus === "completed"
      );
      const totalChats = chatBookings.length;
      
      const avgRating = calculateMitraRating(currentMitraData.talentId).toFixed(1);

      const respondedChats = chatBookings.filter(
        (booking) => {
          const chatSession = getChatSessionByBookingId(booking.id);
          return chatSession && chatSession.messages.some(msg => 
            (activeMode === "talent" && msg.senderType === "talent") ||
            (activeMode === "booker" && (msg.senderType === "user" || msg.senderType === "mitra-as-booker"))
          );
        }
      ).length;
      const responseRate = totalChats > 0 ? Math.round((respondedChats / totalChats) * 100) : 0;

      setStats([
        { label: "Total Chat", value: `${totalChats}`, icon: MessageSquare },
        { label: "Pendapatan", value: formatPrice(totalRevenue), icon: DollarSign },
        { label: "Rating", value: avgRating, icon: Star },
        { label: "Tingkat Respons", value: `${responseRate}%`, icon: TrendingUp },
      ]);
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  }, [activeMode, mitraAsTalent, mitraAsBooker]);

  const handleRefresh = useCallback(() => {
    if (!isOnline) {
      toast({ title: "Tidak Ada Koneksi", description: "Tidak dapat memperbarui data saat offline.", variant: "destructive" });
      return;
    }
    setIsRefreshing(true);
    localStorage.removeItem("rentmate_chats");
    localStorage.removeItem("rentmate_bookings");
    localStorage.setItem("rentmate_last_data_update", Date.now().toString());
    
    loadBookings(activeMode).then(() => {
      updateStats();
      setIsRefreshing(false);
      toast({ title: "Data Diperbarui", description: "Data percakapan berhasil diperbarui" });
    });
  }, [isOnline, toast, loadBookings, updateStats, activeMode]);

  const markMessagesAsRead = useCallback((bookingId: string) => {
    console.log("MitraDashboard: Marking messages as read for booking:", bookingId);
    // Implementasi penandaan pesan telah dibaca
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mitraAuthenticated");
    localStorage.removeItem("rentmate_current_mitra");
    toast({ title: "Logout Berhasil", description: "Anda telah keluar dari Dashboard Mitra" });
    navigate("/mitra/login");
  };

  const markPendingBookingsAsSeen = () => {
    const seenPendingIds = JSON.parse(localStorage.getItem("rentmate_seen_mitra_orders") || "[]") as string[];
    const mergedIds = [...new Set([...seenPendingIds, ...pendingBookingIds])];
    localStorage.setItem("rentmate_seen_mitra_orders", JSON.stringify(mergedIds));
    setPendingBookingCount(0);
  };

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedChat) return;
    const text = messageInput.trim();
    const bookingId = selectedChat.bookingId;

    let addedMessage;
    if (activeMode === "talent") {
      addedMessage = sendMitraMessage(bookingId, text);
    } else {
      addedMessage = sendUserMessage(currentMitra?.talentId || '', text, bookingId, 'mitra-as-booker');
    }

    if (addedMessage) {
      setMessageInput("");
      console.log("MitraDashboard: Pesan berhasil dikirim.");
      setTimeout(() => {
        loadBookings(activeMode);
      }, 500);
    } else {
      console.error("MitraDashboard: Gagal mengirim pesan.");
      toast({ title: "Gagal Mengirim", description: "Pesan tidak terkirim. Silakan refresh halaman.", variant: "destructive" });
    }
  }, [messageInput, selectedChat, activeMode, currentMitra, loadBookings, toast]);
  
  // --- EFFECT HOOKS ---

  useEffect(() => {
    const checkAuthStatus = () => {
      const isMitraAuthenticated = localStorage.getItem("mitraAuthenticated");
      const currentMitra = getCurrentMitra();
      if (!isMitraAuthenticated || !currentMitra) {
        navigate("/mitra/login");
        return false;
      }
      return true;
    };
    if (!checkAuthStatus()) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mitraAuthenticated" && e.newValue === null) navigate("/mitra/login");
    };
    const handleOnlineStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        console.log("MitraDashboard: Back online, refreshing data...");
        loadBookings(activeMode);
        updateStats();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("online", handleOnlineStatusChange);
    window.addEventListener("offline", handleOnlineStatusChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("online", handleOnlineStatusChange);
      window.removeEventListener("offline", handleOnlineStatusChange);
    };
  }, [navigate, toast, activeMode, loadBookings, updateStats]);

  // Effect untuk memuat data awal dan saat mode berubah
  useEffect(() => {
    console.log(`MitraDashboard: Active mode changed to ${activeMode}. Reloading data.`);
    setIsLoading(true);
    loadBookings(activeMode).then(() => {
      updateStats(true); // force refresh Supabase agar rating terbaru dari user ter-sinkron
      setIsLoading(false);
    });
  }, [activeMode, loadBookings, updateStats]);

  // PERBAIKAN: useEffect untuk berlangganan booking yang selesai
  useEffect(() => {
    const currentMitraData = activeMode === "talent" ? mitraAsTalent : mitraAsBooker;
    if (!currentMitraData || !currentMitraData.id) return;
    
    const unsubscribeCompleted = subscribeToCompletedBookings(
      currentMitraData.talentId, 
      () => {
        console.log("MitraDashboard: Booking completed, updating earnings...");
        updateStats();
        toast({ 
          title: "Pendapatan Diperbarui", 
          description: "Ada booking yang baru saja selesai. Pendapatan Anda telah diperbarui." 
        });
      },
      activeMode === "talent"
    );
    
    return () => {
      unsubscribeCompleted();
    };
  }, [activeMode, mitraAsTalent, mitraAsBooker, updateStats, toast]);

  // OPTIMASI: useEffect utama dengan interval yang lebih baik
  useEffect(() => {
    const unsubscribeBookings = subscribeToBookings(() => {
      console.log("MitraDashboard: Bookings updated, reloading...");
      loadBookings(activeMode);
      updateStats();
    });
    const unsubscribeMitra = subscribeToMitraChanges(() => {
      const updatedMitra = getCurrentMitra();
      if (updatedMitra?.id === mitraAsTalent?.id) {
        setMitraAsTalent(updatedMitra);
        setMitraAsBooker(updatedMitra);
      }
    });
    
    const handleAnyChatUpdate = () => {
      console.log("MitraDashboard: Event chat update diterima, memuat ulang...");
      loadBookings(activeMode);
    };
    window.addEventListener("chatsUpdated", handleAnyChatUpdate);
    window.addEventListener("chatMessageAdded", handleAnyChatUpdate);
    window.addEventListener("chatSessionsUpdated", handleAnyChatUpdate);
    
    const handleBookingApproved = (e: any) => {
      const currentMitraData = activeMode === "talent" ? mitraAsTalent : mitraAsBooker;
      if (e.detail && e.detail.talentId === currentMitraData?.talentId) {
        console.log("MitraDashboard: Booking approved for this mitra, reloading...");
        loadBookings(activeMode);
        toast({ title: "Booking Baru Disetujui!", description: `Booking dari ${e.detail.userName} telah disetujui.` });
      }
    };
    window.addEventListener("bookingApproved", handleBookingApproved);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("MitraDashboard: Tab is hidden, stopping polling.");
      } else {
        console.log("MitraDashboard: Tab is visible, starting polling.");
        if (isOnline) {
          void loadBookings(activeMode);
          void updateStats(true);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      unsubscribeBookings();
      unsubscribeMitra();
      window.removeEventListener("chatsUpdated", handleAnyChatUpdate);
      window.removeEventListener("chatMessageAdded", handleAnyChatUpdate);
      window.removeEventListener("chatSessionsUpdated", handleAnyChatUpdate);
      window.removeEventListener("bookingApproved", handleBookingApproved);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadBookings, updateStats, activeMode, mitraAsTalent, mitraAsBooker, toast, isOnline]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      markMessagesAsRead(selectedChat.bookingId);
    }
  }, [selectedChat, markMessagesAsRead]);
  
  // --- HELPER FUNCTIONS ---
  // Ambil inisial dari nama untuk fallback avatar (maks 2 huruf).
  const getInitials = (name?: string) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return new Date(date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Kemarin";
    if (days < 7) return `${days} hari lalu`;
    return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const getBookingEndTime = (chat: Chat) => {
    const start = new Date(`${String(chat.bookingDate).slice(0, 10)}T${String(chat.bookingTime).slice(0, 8)}`);
    if (Number.isNaN(start.getTime())) return null;
    return new Date(start.getTime() + chat.bookingDuration * 60 * 60 * 1000);
  };

  const formatRemainingTime = (chat: Chat) => {
    const endTime = getBookingEndTime(chat);
    if (!endTime) return "";

    const remainingSeconds = Math.max(0, Math.floor((endTime.getTime() - currentTime) / 1000));
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    if (hours > 0) return `${hours}j ${String(minutes).padStart(2, "0")}m`;
    return `${minutes}m ${String(seconds).padStart(2, "0")}d`;
  };

  const formatBookingDate = (date: string) => {
    const parsedDate = new Date(String(date).slice(0, 10));
    return Number.isNaN(parsedDate.getTime())
      ? String(date)
      : parsedDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  // OPTIMASI: Menggunakan useMemo untuk daftar chat yang difilter
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => 
      chat.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Navbar dengan Mode Switcher */}
      <div className="bg-card border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-orange">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-xl">Dashboard Mitra</span>
              <p className="text-xs text-muted-foreground">Mode: <span className="font-semibold text-primary">{activeMode === "talent" ? "Talent" : "Sebagai Pemesan"}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button variant={activeMode === "talent" ? "default" : "ghost"} size="sm" onClick={() => setActiveMode("talent")} className="px-3">
                <User className="w-4 h-4 mr-1" /> Talent
              </Button>
              <Button variant={activeMode === "booker" ? "default" : "ghost"} size="sm" onClick={() => setActiveMode("booker")} className="px-3">
                <Calendar className="w-4 h-4 mr-1" /> Pemesan
              </Button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{currentMitra?.name || "Mitra"}</span>
            </div>
            
            
            <div className="relative" ref={dropdownRef}>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <Settings className="w-4 h-4" />
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </Button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background rounded-lg shadow-lg border border-border py-1 z-50">
                  <Link to="/mitra/pengaturan" onClick={() => { markPendingBookingsAsSeen(); setIsDropdownOpen(false); }} className="flex items-center justify-between gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                    <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Pengaturan</span>
                    {pendingBookingCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 px-1 justify-center text-[10px]">{pendingBookingCount}</Badge>}
                  </Link>
                  <hr className="my-1 border-border" />
                  <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container pt-8 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Selamat datang, {currentMitra?.name || "Mitra"}</h1>
            <p className="text-muted-foreground">Kelola percakapan dan jadwal Anda sebagai <span className="font-semibold">{activeMode === "talent" ? "Talent" : "Pemesan"}</span></p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">Terakhir diperbarui: {new Date(lastUpdateTime).toLocaleTimeString("id-ID")}</p>
              {!isOnline && <Badge variant="destructive" className="text-xs">Offline</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={currentMitra?.isOnline ? "success" : "secondary"} className="gap-1">
              <div className={`w-2 h-2 rounded-full ${currentMitra?.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
              {currentMitra?.isOnline ? "Online" : "Offline"}
            </Badge>
            {currentMitra?.isLegacyTalent && <Badge variant="outline" className="gap-1"><User className="w-3 h-3" /> Legacy Talent</Badge>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => { const Icon = stat.icon; return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Data Terbaru</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          );})}
        </div>

        {activeMode === "talent" && pendingBookingCount > 0 && (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">Ada pesanan baru</h2>
                  <p className="text-sm text-muted-foreground">
                    {pendingBookingCount} pesanan menunggu persetujuan Anda.
                  </p>
                </div>
              </div>
              <Link to="/mitra/pengaturan" className="shrink-0" onClick={markPendingBookingsAsSeen}>
                <Button size="sm" className="gap-2">
                  Lihat Pesanan <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Pelanggan & Percakapan</h2>
                <Badge variant="outline">{chats.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari percakapan..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-y-auto h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : chats.length > 0 ? (
                <div className="divide-y">
                  {/* PERBAIKAN: Gunakan filteredChats yang sudah dioptimasi */}
                  {filteredChats.map((chat) => (
                    <div key={chat.id} className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedChat?.id === chat.id ? "bg-muted/50" : ""}`} onClick={() => (chat.bookingStatus === "pending" || chat.bookingStatus === "pending_mitra") ? navigate("/mitra/pengaturan") : setSelectedChat(chat)}>
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          {chat.userPhoto && <AvatarImage src={chat.userPhoto} alt={chat.userName} className="object-cover" />}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(chat.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium truncate">{chat.userName}</h3>
                            <span className="text-xs text-muted-foreground">{formatTime(chat.lastMessageTime)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={chat.bookingStatus === "completed" ? "success" : chat.bookingStatus === "cancelled" || chat.bookingStatus === "rejected" ? "destructive" : chat.bookingStatus === "active" ? "default" : chat.bookingStatus === "pending_mitra" ? "warning" : "outline"} className="text-xs">
                              {chat.bookingStatus === "completed" ? "Selesai" : chat.bookingStatus === "cancelled" ? "Dibatalkan" : chat.bookingStatus === "rejected" ? "Ditolak" : chat.bookingStatus === "pending_mitra" ? "Perlu persetujuan Anda" : chat.bookingStatus === "pending" ? "Menunggu admin" : chat.bookingStatus === "active" ? "Sedang Berlangsung" : "Disetujui"}
                            </Badge>
                            {chat.bookingStatus === "active" && (
                              <Badge variant="default" className="text-xs gap-1">
                                <Clock className="w-3 h-3" /> {formatRemainingTime(chat)}
                              </Badge>
                            )}
                            {chat.isUnread && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Anda belum memiliki chat</h3>
                  <p className="text-muted-foreground text-sm">
                    {activeMode === "talent"
                      ? "Tunggu hingga ada klien yang melakukan booking"
                      : "Tunggu hingga ada chat dengan talent yang Anda pesan"}
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Kembali ke Beranda</Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 overflow-hidden">
            {selectedChat ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {selectedChat.userPhoto && <AvatarImage src={selectedChat.userPhoto} alt={selectedChat.userName} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(selectedChat.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedChat.userName}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedChat.bookingStatus === "completed" ? "success" : selectedChat.bookingStatus === "cancelled" ? "destructive" : selectedChat.bookingStatus === "active" ? "default" : "outline"} className="text-xs">
                          {selectedChat.bookingStatus === "completed" ? "Selesai" : selectedChat.bookingStatus === "cancelled" ? "Dibatalkan" : selectedChat.bookingStatus === "active" ? "Sedang Berlangsung" : "Aktif"}
                        </Badge>
                        {selectedChat.bookingStatus === "active" && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Clock className="w-3 h-3" /> Sisa {formatRemainingTime(selectedChat)}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{formatBookingDate(selectedChat.bookingDate)}, {selectedChat.bookingTime.slice(0, 5)} ({selectedChat.bookingDuration} jam)</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {selectedChat.messages.length > 0 ? (
                    selectedChat.messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${message.isFromMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${message.isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatTime(message.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Belum ada pesan</p></div>
                  )}
                </div>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input placeholder="Ketik pesan..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }} disabled={!isOnline} />
                    <Button onClick={handleSendMessage} disabled={!messageInput.trim() || !isOnline}>Kirim</Button>
                  </div>
                  {!isOnline && <p className="text-xs text-red-500 mt-1">Tidak dapat mengirim pesan saat offline</p>}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Pilih percakapan</h3>
                <p className="text-muted-foreground">Pilih percakapan dari daftar di sebelah kiri untuk melihat detailnya.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}