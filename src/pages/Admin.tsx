import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Shield,
  Ban,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  LogOut,
  QrCode,
  Building2,
  FileText,
  Mail,
  UserPlus,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/contexts/AppSettingsContext";

import {
  SharedBooking,
  getBookings,
  getPendingBookings,
  updateBookingApproval,
  subscribeToBookings,
} from "@/lib/bookingStore";
import { getCurrentUser } from "@/lib/userStore";
import {
  getMitraAccounts,
  approveMitra,
  rejectMitra,
  getAllVerifiedTalents,
  subscribeToMitraChanges,
  getTotalUsers,
  sendVerificationEmail,
  checkVerificationDeadlines,
} from "@/lib/mitraStore";

// Tambahkan tipe untuk status pembayaran
type PaymentStatus = "paid" | "unpaid";

type StatItem = { label: string; value: string; icon: any; change?: string };
type VerificationItem = { 
  id: string; 
  name: string; 
  email: string; 
  photo: string; 
  date: string; 
  status: "pending" | "approved" | "rejected";
  verificationDocuments: {
    ktp: string | null;
    kk: string | null;
    selfie: string | null;
    sim: string | null;
  };
  verificationDeadline?: string;
  verificationEmailSent?: boolean;
  isLegacyTalent?: boolean;
  phone?: string;
  address?: string;
  category?: string;
  description?: string;
  price?: number;
  age?: number;
};

// Interface untuk pembagian pembayaran
interface PaymentSplit {
  appAmount: number;
  mitraAmount: number;
  totalAmount: number;
  commissionPercentage: number;
}

// Interface untuk pengaturan komisi
interface AppCommission {
  percentage: number;
  description: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppSettings(); 
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<SharedBooking[]>([]);
  const { toast } = useToast();
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total Pengguna", value: "0", icon: Users },
    { label: "Pengguna Aktif", value: "0", icon: UserCheck },
    { label: "Total Percakapan", value: "0", icon: MessageSquare },
    { label: "Total Pendapatan", value: "Rp0", icon: DollarSign },
  ]);
  const [viewTalentId, setViewTalentId] = useState<string | null>(null);
  const [blockedTalents, setBlockedTalents] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("rentmate_blocked_talents") || "[]");
    } catch {
      return [];
    }
  });
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [expiredVerifications, setExpiredVerifications] = useState<VerificationItem[]>([]);
  const [allTalents, setAllTalents] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationItem | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; url: string } | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [verificationTab, setVerificationTab] = useState("pending");
  
  // State untuk pengaturan
  const [qrisCode, setQrisCode] = useState<string>("");
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState({
    bca: { number: "1234567890", holder: "PT RentMate Indonesia" },
    bri: { number: "9876543210", holder: "PT RentMate Indonesia" },
    mandiri: { number: "5555666677", holder: "PT RentMate Indonesia" },
  });
  
  // State untuk komisi aplikasi
  const [appCommission, setAppCommission] = useState<AppCommission>({
    percentage: 50,
    description: "Biaya admin untuk setiap transaksi"
  });
  
  // State untuk dialog harga
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedTalentForPrice, setSelectedTalentForPrice] = useState<VerificationItem | null>(null);
  const [talentPrice, setTalentPrice] = useState<string>("");
  
  // State untuk loading
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [isLoadingTalents, setIsLoadingTalents] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  
  // State untuk dialog detail transaksi
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SharedBooking | null>(null);

  // State untuk manajemen kota
  const [cities, setCities] = useState<string[]>(() => {
    try {
      // Coba ambil dari localStorage, jika tidak ada gunakan default
      const savedCities = localStorage.getItem("rentmate_cities");
      if (savedCities) {
        return JSON.parse(savedCities);
      }
      
      // Default cities jika tidak ada di localStorage
      return [
        "Jakarta",
        "Surabaya",
        "Bandung",
        "Medan",
        "Semarang",
        "Makassar",
        "Palembang",
        "Tangerang",
        "Depok",
        "Bekasi",
        "Yogyakarta",
        "Denpasar",
        "Malang",
        "Bogor",
        "Batam",
        "Pekanbaru",
        "Bandar Lampung",
        "Padang",
        "Manado",
        "Balikpapan",
        "Solo",
        "Cirebon",
        "Pontianak",
        "Samarinda",
        "Banjarmasin",
      ];
    } catch (error) {
      console.error("Error loading cities from localStorage:", error);
      return [];
    }
  });

  const [newCity, setNewCity] = useState("");
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editedCityName, setEditedCityName] = useState("");

  // Fungsi untuk memuat pengaturan dari localStorage
  useEffect(() => {
    const savedQris = localStorage.getItem("rentmate_admin_qris_code");
    if (savedQris) {
      setQrisCode(savedQris);
    }

    const savedBanks = localStorage.getItem("rentmate_bank_accounts");
    if (savedBanks) {
      try {
        setBankAccounts(JSON.parse(savedBanks));
      } catch (error) {
        console.error("Failed to parse bank accounts from localStorage:", error);
      }
    }

    const savedCommission = localStorage.getItem("rentmate_app_commission");
    if (savedCommission) {
      try {
        setAppCommission(JSON.parse(savedCommission));
      } catch (error) {
        console.error("Failed to parse app commission from localStorage:", error);
      }
    }
  }, []);

  // Fungsi untuk menangani URL gambar dengan aman
  const getImageUrl = (url: string | null, fallback?: string) => {
    if (!url)
      return (
        fallback ||
        `https://ui-avatars.com/api/?name=Unknown&background=random&color=fff`
      );

    if (url.startsWith("data:")) return url;
    if (url.startsWith("/")) return url;
    return url;
  };

  // Fungsi untuk memeriksa ketersediaan server
  const checkServerAvailability = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log("Server tidak tersedia:", error);
      return false;
    }
  };

  // Fungsi untuk menghitung pembagian pembayaran
  const calculatePaymentSplit = (totalAmount: number, commissionPercentage: number): PaymentSplit => {
    const appAmount = Math.round(totalAmount * (commissionPercentage / 100));
    const mitraAmount = totalAmount - appAmount;
    
    return {
      appAmount,
      mitraAmount,
      totalAmount,
      commissionPercentage
    };
  };

  // Fungsi untuk mendapatkan persentase komisi aplikasi
  const getAppCommission = (): number => {
    try {
      const commission = JSON.parse(localStorage.getItem("rentmate_app_commission") || "{}");
      return commission.percentage || 50;
    } catch (error) {
      console.error("Error getting app commission:", error);
      return 50;
    }
  };

  // Fungsi untuk memformat mata uang
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // PERFORMA: Pisahkan fungsi untuk memuat data awal (kritis) dan data tambahan (non-kritis)
  const loadInitialData = useCallback(async () => {
    console.log("🔄 Admin: Memuat data awal...");
    setIsInitialLoading(true);
    
    // PERBAIKAN: Langsung ambil data pending bookings di sini
    const pendingBookingsData = getPendingBookings();
    const processedBookings = pendingBookingsData.map(booking => ({
      ...booking,
      paymentStatus: (booking.paymentProof ? "paid" : "unpaid") as PaymentStatus,
    }));
    setBookings(processedBookings);

    // Muat data talent sekali, lalu gunakan hasilnya untuk update stats
    try {
      const verifiedTalents = await getAllVerifiedTalents() || [];
      setAllTalents(Array.isArray(verifiedTalents) ? verifiedTalents : []);
      updateStats(verifiedTalents); // Kirim data talent ke updateStats
    } catch (error) {
      console.error("Gagal memuat data talent:", error);
      setAllTalents([]);
      updateStats([]); // Kirim array kosong jika gagal
    }

    setIsInitialLoading(false);
  }, []);

  // PERFORMA: Modifikasi updateStats untuk menerima data talent sebagai parameter
  // Ini mencegah pemanggilan API ganda
  const updateStats = useCallback((verifiedTalents: any[] = []) => {
    console.log("🔄 Admin: Memperbarui statistik...");
    setIsLoadingStats(true);
    try {
      const allBookings = getBookings();

      let totalUsers = 0;
      
      try {
        const usersFromStore = getTotalUsers();
        if (usersFromStore && !isNaN(usersFromStore) && usersFromStore > 0) {
          totalUsers = usersFromStore;
        }
      } catch (e) {
        console.error("Error getting total users from store:", e);
      }
      
      if (totalUsers <= 0 && verifiedTalents.length > 0) {
        totalUsers = verifiedTalents.length + 1;
        console.log("🔢 Menghitung total pengguna dari data talent:", totalUsers);
      }
      
      const activeTalentCount = verifiedTalents.filter(
        (t) => t.availability !== "offline"
      ).length;

      // Note: currentUser check removed as getCurrentUser() is async
      const activeUserCount = activeTalentCount;

      const approved = allBookings.filter(
        (b) => b.approvalStatus === "approved"
      );

      const totalChats = approved.length;
      
      const commissionPercentage = getAppCommission();
      const totalAppRevenue = approved.reduce((sum, b) => {
        const paymentSplit = calculatePaymentSplit(b.total || 0, commissionPercentage);
        return sum + paymentSplit.appAmount;
      }, 0);

      const newStats = [
        { label: "Total Pengguna", value: String(totalUsers), icon: Users },
        { label: "Pengguna Aktif", value: String(activeUserCount), icon: UserCheck },
        { label: "Total Percakapan", value: String(totalChats), icon: MessageSquare },
        {
          label: "Total Pendapatan",
          value: formatCurrency(totalAppRevenue),
          icon: DollarSign,
        },
      ];
      
      console.log("✅ Statistik baru dihitung:", newStats);
      
      // PERFORMA: Gunakan startTransition untuk pembaruan state yang tidak mendesak
      startTransition(() => {
        setStats(newStats);
      });

    } catch (err) {
      console.error("❌ Error saat memperbarui statistik:", err);
      setStats([
        { label: "Total Pengguna", value: "Error", icon: Users },
        { label: "Pengguna Aktif", value: "Error", icon: UserCheck },
        { label: "Total Percakapan", value: "Error", icon: MessageSquare },
        { label: "Total Pendapatan", value: "Error", icon: DollarSign },
      ]);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fungsi untuk memuat verifikasi (dipisah)
  const loadVerifications = useCallback(async () => {
    setIsLoadingVerifications(true);
    try {
      const isServerAvailable = await checkServerAvailability();
      
      if (!isServerAvailable) {
        console.warn("Server tidak tersedia, melewati pemuatan data verifikasi");
        setIsOfflineMode(true);
        setVerifications([]);
        return;
      }
      
      setIsOfflineMode(false);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://localhost:3001/pending-talents', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Server mengembalikan error: ' + response.status);
      }
      
      const data = await response.json();
      
      const formattedVerifications: VerificationItem[] = data.map((mitra: any) => ({
        id: mitra.user_id,
        name: mitra.full_name,
        email: mitra.email,
        photo: getImageUrl(mitra.photo, `https://ui-avatars.com/api/?name=${encodeURIComponent(mitra.full_name)}&background=random&color=fff`),
        date: new Date(mitra.created_at).toLocaleDateString("id-ID"),
        status: mitra.status,
        verificationDocuments: { ktp: mitra.ktp, kk: null, selfie: null, sim: null },
        verificationDeadline: new Date(new Date(mitra.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        verificationEmailSent: false,
        isLegacyTalent: false,
        phone: mitra.phone,
        address: mitra.address,
        category: mitra.category,
        description: mitra.description,
        price: mitra.price,
        age: mitra.age,
      }));
      
      // PERFORMA: Gunakan startTransition untuk pembaruan state yang tidak mendesak
      startTransition(() => {
        setVerifications(formattedVerifications);
      });
    } catch (error: any) {
      console.error("Error fetching verifications:", error);
      
      if (error.name === 'AbortError') {
        toast({ 
          title: "Timeout", 
          description: "Server tidak merespon. Pastikan server backend berjalan.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error Koneksi", 
          description: "Tidak dapat terhubung ke server. Beberapa fitur mungkin tidak berfungsi.", 
          variant: "destructive" 
        });
      }
      
      setVerifications([]);
      setIsOfflineMode(true);
    } finally {
      setIsLoadingVerifications(false);
    }
  }, [toast]);

  // Fungsi untuk memuat laporan (dipisah)
  const loadReports = useCallback(() => {
    try {
      const savedReports = JSON.parse(localStorage.getItem("lovable_reports") || "[]");
      // PERFORMA: Gunakan startTransition untuk pembaruan state yang tidak mendesak
      startTransition(() => {
        setReports(savedReports);
      });
    } catch (error) {
      console.error("Error loading reports:", error);
      setReports([]);
    }
  }, []);

  // PERFORMA: useEffect utama hanya memuat data awal
  useEffect(() => {
    const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated");
    if (!isAdminAuthenticated) {
      navigate("/admin-login");
      return;
    }
    loadInitialData();
  }, [navigate, loadInitialData]);

  // PERFORMA: useEffect terpisah untuk data yang bisa dimuat belakangan
  // Ini tidak akan memblokir render pertama
  useEffect(() => {
    // Gunakan setTimeout kecil untuk memastikan rendering pertama sudah selesai
    const timeoutId = setTimeout(() => {
      loadVerifications();
      loadReports();
      checkVerificationDeadlines();
    }, 100); // 100ms delay

    return () => clearTimeout(timeoutId);
  }, [loadVerifications, loadReports]);
  
  // PERFORMA: useEffect untuk event listener, pastikan dependency-nya stabil
  useEffect(() => {
    // PERBAIKAN: Listener ini sekarang konsisten dengan state yang kita kelola (pending bookings)
    const unsubscribeBookings = subscribeToBookings(() => {
      console.log("🔔 Admin: Perubahan data booking terdeteksi, memuat ulang daftar pending...");
      // Ambil ulang hanya data pending bookings agar state tetap konsisten
      const pendingBookingsData = getPendingBookings();
      const processedBookings = pendingBookingsData.map(booking => ({
        ...booking,
        paymentStatus: (booking.paymentProof ? "paid" : "unpaid") as PaymentStatus,
      }));
      setBookings(processedBookings);
    });

    const unsubscribeMitra = subscribeToMitraChanges(async () => {
      console.log("🔔 Admin: Perubahan data mitra terdeteksi, memuat ulang...");
      try {
        const verifiedTalents = await getAllVerifiedTalents() || [];
        setAllTalents(Array.isArray(verifiedTalents) ? verifiedTalents : []);
        updateStats(verifiedTalents);
      } catch (error) {
        console.error("Gagal memuat ulang data talent:", error);
      }
    });
    
    const handleVerificationUpdate = () => {
      loadVerifications();
    };
    
    const handleUserCountUpdate = () => {
      // updateStats() akan dipanggil oleh unsubscribeMitra jika ada perubahan
    };
    
    const handleNewVerification = (e: any) => {
      loadVerifications();
      toast({
        title: "Pendaftaran Baru",
        description: `${e.detail.mitra.name} telah mendaftar sebagai talent baru.`,
      });
    };
    
    const handleDeadlinePassed = (e: any) => {
      loadVerifications();
      toast({
        title: "Batas Waktu Verifikasi",
        description: `Batas waktu verifikasi untuk ${e.detail.mitra.name} telah terlampaui.`,
        variant: "destructive",
      });
    };
    
    const handlePaymentUpdate = () => {
      updateStats(allTalents);
    };

    const handleNewReport = (e: any) => {
      loadReports();
      toast({
        title: "Laporan Baru",
        description: `${e.detail.report.name} telah mengirim laporan baru.`,
      });
    };
    
    window.addEventListener("mitraVerificationUpdated", handleVerificationUpdate);
    window.addEventListener("userCountUpdated", handleUserCountUpdate);
    window.addEventListener("newTalentRegistration", handleNewVerification);
    window.addEventListener("verificationDeadlinePassed", handleDeadlinePassed);
    window.addEventListener("paymentCompleted", handlePaymentUpdate);
    window.addEventListener("newReport", handleNewReport);
    
    return () => {
      unsubscribeBookings();
      unsubscribeMitra();
      window.removeEventListener("mitraVerificationUpdated", handleVerificationUpdate);
      window.removeEventListener("userCountUpdated", handleUserCountUpdate);
      window.removeEventListener("newTalentRegistration", handleNewVerification);
      window.removeEventListener("verificationDeadlinePassed", handleDeadlinePassed);
      window.removeEventListener("paymentCompleted", handlePaymentUpdate);
      window.removeEventListener("newReport", handleNewReport);
    };
  }, [updateStats, loadVerifications, loadReports, allTalents, toast]);

  // Fungsi untuk mengelola kota
  const handleAddCity = useCallback(() => {
    if (newCity.trim() && !cities.includes(newCity.trim())) {
      const updatedCities = [...cities, newCity.trim()];
      setCities(updatedCities);
      localStorage.setItem("rentmate_cities", JSON.stringify(updatedCities));
      setNewCity("");
      toast({
        title: "Kota Ditambahkan",
        description: `${newCity.trim()} telah ditambahkan ke daftar kota.`,
      });
    } else if (cities.includes(newCity.trim())) {
      toast({
        title: "Kota Sudah Ada",
        description: `${newCity.trim()} sudah ada dalam daftar kota.`,
        variant: "destructive",
      });
    }
  }, [newCity, cities, toast]);

  const handleDeleteCity = useCallback((city: string) => {
    const updatedCities = cities.filter(c => c !== city);
    setCities(updatedCities);
    localStorage.setItem("rentmate_cities", JSON.stringify(updatedCities));
    toast({
      title: "Kota Dihapus",
      description: `${city} telah dihapus dari daftar kota.`,
    });
  }, [cities, toast]);

  const handleEditCity = useCallback((city: string) => {
    setEditingCity(city);
    setEditedCityName(city);
  }, []);

  const handleSaveEditCity = useCallback(() => {
    if (editedCityName.trim() && !cities.includes(editedCityName.trim()) && editedCityName.trim() !== editingCity) {
      const updatedCities = cities.map(c => c === editingCity ? editedCityName.trim() : c);
      setCities(updatedCities);
      localStorage.setItem("rentmate_cities", JSON.stringify(updatedCities));
      setEditingCity(null);
      setEditedCityName("");
      toast({
        title: "Kota Diperbarui",
        description: `Kota telah diperbarui menjadi ${editedCityName.trim()}.`,
      });
    } else if (cities.includes(editedCityName.trim()) && editedCityName.trim() !== editingCity) {
      toast({
        title: "Kota Sudah Ada",
        description: `${editedCityName.trim()} sudah ada dalam daftar kota.`,
        variant: "destructive",
      });
    } else {
      setEditingCity(null);
      setEditedCityName("");
    }
  }, [editedCityName, editingCity, cities, toast]);

  const handleCancelEdit = useCallback(() => {
    setEditingCity(null);
    setEditedCityName("");
  }, []);

  // PERFORMA: Memoisasi data kota untuk mencegah perhitungan ulang
  const memoizedCities = useMemo(() => cities, [cities]);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    toast({
      title: "Logout Berhasil",
      description: "Anda telah keluar dari Admin Dashboard",
    });
    navigate("/admin-login");
  };

  // PERBAIKAN: Fungsi handleApproveBooking yang diperbaiki
  const handleApproveBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const commissionPercentage = getAppCommission();
    const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);
    
    // 1. Update status di penyimpanan
    updateBookingApproval(bookingId, "approved");
    
    // 2. PERBAIKAN: Langsung update state lokal dengan memfilter item yang diproses
    // Ini jauh lebih cepat dan andal dari pada loadBookings()
    setBookings(currentBookings => currentBookings.filter(b => b.id !== bookingId));
    
    // 3. Update statistik
    updateStats(allTalents);
    
    toast({
      title: "Pemesanan Disetujui",
      description: `Percakapan aktif. Biaya Admin: ${formatCurrency(paymentSplit.appAmount)}, Pendapatan mitra: ${formatCurrency(paymentSplit.mitraAmount)}`,
    });
  };

  // PERBAIKAN: Fungsi handleRejectBooking yang diperbaiki
  const handleRejectBooking = (bookingId: string) => {
    // 1. Update status di penyimpanan
    updateBookingApproval(bookingId, "rejected");
    
    // 2. PERBAIKAN: Langsung update state lokal dengan memfilter item yang diproses
    setBookings(currentBookings => currentBookings.filter(b => b.id !== bookingId));
    
    // 3. Update statistik
    updateStats(allTalents);

    toast({
      title: "Pemesanan Ditolak",
      description: "Pengguna akan menerima notifikasi penolakan",
      variant: "destructive",
    });
  };

  // Fungsi untuk menampilkan detail transaksi
  const handleViewTransaction = (transactionId: string) => {
    const allBookings = getBookings();
    const transaction = allBookings.find(b => b.id === transactionId);
    if (transaction) {
      setSelectedTransaction(transaction);
      setShowTransactionDialog(true);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ appLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ appFavicon: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedTalent = viewTalentId ? allTalents.find((t) => t.id === viewTalentId) : null;
  
  const toggleBlockTalent = (id: string) => {
    setBlockedTalents((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];

      try {
        localStorage.setItem(
          "rentmate_blocked_talents",
          JSON.stringify(next)
        );
        
        window.dispatchEvent(new Event("blockedTalentsUpdated"));
      } catch (error) {
        console.error("Error saving blocked talents:", error);
      }

      return next;
    });

    toast({
      title: blockedTalents.includes(id)
        ? "Blokir dibatalkan"
        : "Pengguna berhasil diblokir",
      description: blockedTalents.includes(id)
        ? "Pengguna kembali aktif"
        : "Pengguna tidak akan dihitung sebagai aktif",
      variant: blockedTalents.includes(id)
        ? "default"
        : "destructive",
    });
  };

  const handleAcceptVerification = (id: string) => {
    const mitra = verifications.find(m => m.id === id);
    if (!mitra) {
      toast({ title: "Terjadi kesalahan", description: "Data talent tidak ditemukan.", variant: "destructive" });
      return;
    }

    setSelectedTalentForPrice(mitra);
    setTalentPrice(mitra.price ? String(mitra.price) : "");
    setShowPriceDialog(true);
  };

  const handleSavePriceAndApprove = async () => {
    if (!selectedTalentForPrice) return;
    
    if (!talentPrice || isNaN(Number(talentPrice)) || Number(talentPrice) < 0) {
      toast({ 
        title: "Harga Tidak Valid", 
        description: "Masukkan harga yang valid (angka positif).", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const updatedTalent = {
        ...selectedTalentForPrice,
        price: Number(talentPrice)
      };
      
      await approveMitra(
        updatedTalent.id, 
        updatedTalent.email, 
        updatedTalent.name,
        updatedTalent.price
      );
      
      toast({ 
        title: "Pengguna berhasil diverifikasi", 
        description: `Talent telah ditambahkan ke platform dengan harga ${formatCurrency(Number(talentPrice))} per jam.` 
      });
      
      setShowPriceDialog(false);
      setSelectedTalentForPrice(null);
      setTalentPrice("");
      
      loadVerifications();
      const verifiedTalents = await getAllVerifiedTalents() || [];
      setAllTalents(Array.isArray(verifiedTalents) ? verifiedTalents : []);
      updateStats(verifiedTalents);
      
    } catch (error: any) {
      console.error("Error approving verification:", error);
      toast({ 
        title: "Persetujuan Gagal",
        description: error.message || "Gagal memverifikasi pengguna. Silakan coba lagi.",
        variant: "destructive" 
      });
    }
  };

  const handleRejectVerification = (id: string) => {
    if (rejectMitra(id)) {
      toast({ title: "Verifikasi pengguna ditolak", variant: "destructive" });
      loadVerifications();
      updateStats(allTalents);
    } else {
      toast({ 
        title: "Terjadi kesalahan", 
        description: "Gagal menolak verifikasi pengguna.",
        variant: "destructive"
      });
    }
  };

  const handleSendVerificationEmail = async (id: string) => {
    try {
      setIsSendingEmail(id);
      
      const mitra = verifications.find(m => m.id === id);
      if (!mitra) {
        throw new Error("Data talent tidak ditemukan.");
      }

      const response = await fetch('http://localhost:3001/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talentEmail: mitra.email,
          talentName: mitra.name,
          reminderType: 'verification'
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim email verifikasi.");
      }

      console.log("Email pengingat verifikasi berhasil dikirim ke:", mitra.email);
      toast({ 
        title: "Email Terkirim", 
        description: "Email pengingat verifikasi berhasil dikirim." 
      });
    } catch (error: any) {
      console.error("Error sending verification reminder email:", error);
      toast({ 
        title: "Gagal Mengirim Email", 
        description: error.message || "Terjadi kesalahan saat mengirim email. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(null);
    }
  };
  
  const viewVerificationDetails = (verification: VerificationItem) => {
    setSelectedVerification(verification);
    setShowDocumentDialog(true);
  };

  const viewDocument = (type: string, url: string) => {
    setSelectedDocument({ type, url });
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const handleQrisUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setQrisFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrisCode(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCommission = () => {
    localStorage.setItem("rentmate_app_commission", JSON.stringify(appCommission));
    toast({
      title: "Biaya Admin Disimpan",
      description: `Biaya admin telah diatur menjadi ${appCommission.percentage}%`,
    });
    updateStats(allTalents);
  };

  const handleSaveSettings = () => {
    localStorage.setItem("rentmate_admin_qris_code", qrisCode);
    localStorage.setItem("rentmate_bank_accounts", JSON.stringify(bankAccounts));
    localStorage.setItem("rentmate_app_commission", JSON.stringify(appCommission));
    
    if (settings.appName) {
      localStorage.setItem("rentmate_app_name", settings.appName);
    }
    if (settings.appTitle) {
      localStorage.setItem("rentmate_app_title", settings.appTitle);
      document.title = settings.appTitle;
    }
    if (settings.appLogo) {
      localStorage.setItem("rentmate_app_logo", settings.appLogo);
    }
    if (settings.appFavicon) {
      localStorage.setItem("rentmate_app_favicon", settings.appFavicon);
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.appFavicon;
    }

    toast({
      title: "Pengaturan Disimpan",
      description: "QRIS, informasi rekening, pengaturan aplikasi, dan komisi berhasil diperbarui.",
    });
  };

  const updateReportStatus = (reportId: string, newStatus: string) => {
    try {
      const reports = JSON.parse(localStorage.getItem("lovable_reports") || "[]");
      const updatedReports = reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus, updatedAt: new Date().toISOString() }
          : report
      );
      
      localStorage.setItem("lovable_reports", JSON.stringify(updatedReports));
      setReports(updatedReports);
      
      toast({
        title: "Status Diperbarui",
        description: `Status laporan telah diubah menjadi ${
          newStatus === "in-progress" ? "Dalam Proses" : "Selesai"
        }.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);
      toast({
        title: "Error",
        description: "Gagal memperbarui status laporan.",
        variant: "destructive"
      });
    }
  };

  // PERFORMA: Memoisasi data yang difilter untuk mencegah perhitungan ulang di setiap render
  const pendingReports = useMemo(() => reports.filter(r => r.status === "pending"), [reports]);
  const approvedBookingsForRevenue = useMemo(() => getBookings().filter(b => b.approvalStatus === "approved"), [bookings]);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="bg-card border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {settings.appLogo ? (
              <img src={settings.appLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
            ) : (
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-orange">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="font-bold text-xl">{settings.appName} Admin</span>
              <p className="text-xs text-muted-foreground">Panel Administrasi</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Keluar
          </Button>
        </div>
      </div>

      <div className="container pt-8 pb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
        <p className="text-muted-foreground mb-8">Kelola platform {settings.appName} - Khusus Administrator</p>

        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Mode Admin Aktif</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sebagai admin, Anda hanya dapat mengelola platform. Admin tidak dapat memesan, membayar, atau menggunakan fitur percakapan.
              </p>
            </div>
          </div>
        </Card>

        {isOfflineMode && (
          <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Mode Offline</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Server backend tidak tersedia. Beberapa fitur mungkin tidak berfungsi dengan baik.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* PERFORMA: Tampilkan skeleton loader saat data awal dimuat */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="w-11 h-11 rounded-xl bg-gray-200 mb-5"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-orange-500" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Data Terbaru
                      </span>
                    </div>

                    <div className="text-3xl font-bold text-gray-900 leading-tight">
                      {isLoadingStats ? (
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        stat.value
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stat.label}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full max-w-xl">
            <TabsTrigger value="approvals" className="relative gap-1">
              <Clock className="w-4 h-4" />
              Persetujuan
              {bookings.length > 0 && (
                <span 
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full"
                >
                  {bookings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Pengguna</TabsTrigger>
            <TabsTrigger value="verification">Verifikasi</TabsTrigger>
            <TabsTrigger value="reports" className="relative gap-1">
              <FileText className="w-4 h-4" />
              Laporan
              {/* PERFORMA: Gunakan data yang sudah di-memoisasi */}
              {pendingReports.length > 0 && (
                <span 
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full"
                >
                  {pendingReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="revenue">Pendapatan</TabsTrigger>
            <TabsTrigger value="cities">Kota</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Pemesanan Menunggu Persetujuan</h2>
                <p className="text-muted-foreground text-sm">
                  Pemesanan yang sudah dibayar dan menunggu persetujuan admin
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {bookings.length} Menunggu
              </Badge>
            </div>
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const commissionPercentage = getAppCommission();
                  const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);
                  
                  return (
                    <Card key={booking.id} className="overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <img src={booking.userPhoto} alt={booking.userName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
                            <div>
                              <p className="text-xs text-muted-foreground">Pengguna</p>
                              <h3 className="font-bold">{booking.userName}</h3>
                            </div>
                          </div>
                          <div className="text-center text-muted-foreground">
                            <div className="w-8 h-[2px] bg-border mx-auto mb-1" />
                            <span className="text-xs">memesan</span>
                            <div className="w-8 h-[2px] bg-border mx-auto mt-1" />
                          </div>
                          <div className="flex items-center gap-3 flex-1 justify-end">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Mitra</p>
                              <h3 className="font-bold">{booking.talentName}</h3>
                            </div>
                            <img src={booking.talentPhoto} alt={booking.talentName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div><p className="text-xs text-muted-foreground mb-1">Tujuan</p><p className="font-medium">{booking.purpose}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-1">Tanggal</p><p className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(booking.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-1">Waktu & Durasi</p><p className="font-medium flex items-center gap-1"><Clock className="w-3 h-3" />{booking.time} • {booking.duration} jam</p></div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Status Pembayaran</p>
                              <Badge variant={booking.paymentStatus === "paid" ? "success" : "warning"} className="text-xs">
                                {booking.paymentStatus === "paid" ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />Sudah Dibayar
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />Menunggu Pembayaran
                                  </>
                                )}
                              </Badge>
                            </div>
                            <div><p className="text-xs text-muted-foreground mb-1">Total Pembayaran</p><p className="font-bold text-primary text-lg">{formatCurrency(booking.total)}</p></div>
                          </div>
                        </div>
                        {booking.paymentProof && (
                          <div className="mt-4 border rounded-lg p-4 bg-muted/30">
                            <p className="text-sm font-semibold mb-2">Detail Pembayaran</p>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              <div><p className="text-muted-foreground">Metode</p><p className="font-medium">{booking.paymentMethod ? booking.paymentMethod.toUpperCase() : "-"}</p></div>
                              <div><p className="text-muted-foreground">Kode Pembayaran</p><p className="font-medium">{booking.paymentCode}</p></div>
                              <div><p className="text-muted-foreground">Waktu Transfer</p><p className="font-medium">{booking.transferTime}</p></div>
                              <div><p className="text-muted-foreground">Jumlah</p><p className="font-medium">{formatCurrency(booking.transferAmount)}</p></div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-semibold mb-2">Pembagian Pembayaran</p>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Total Pembayaran</p>
                                  <p className="font-medium">{formatCurrency(paymentSplit.totalAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Biaya Admin ({commissionPercentage}%)</p>
                                  <p className="font-medium">{formatCurrency(paymentSplit.appAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Pendapatan Mitra</p>
                                  <p className="font-medium">{formatCurrency(paymentSplit.mitraAmount)}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <p className="text-muted-foreground text-sm mb-1">Bukti Transfer</p>
                              <img src={booking.paymentProof} alt="Bukti Transfer" className="w-48 rounded-lg border shadow cursor-pointer" onClick={() => window.open(booking.paymentProof, "_blank")} />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant="accent" className="gap-1"><Clock className="w-3 h-3" />Menunggu Persetujuan Admin</Badge>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRejectBooking(booking.id)}><XCircle className="w-4 h-4" />Tolak Pemesanan</Button>
                            <Button 
                              size="sm" 
                              className="gap-1" 
                              disabled={booking.paymentStatus !== "paid"}
                              onClick={() => handleApproveBooking(booking.id)}
                            >
                              <CheckCircle className="w-4 h-4" />Setujui Pemesanan
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Semua Pemesanan Sudah Diproses</h3>
                <p className="text-muted-foreground">Tidak ada pemesanan yang menunggu persetujuan saat ini</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
             <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Cari pengguna atau teman..." 
                  className="pl-12" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>
            
            {isLoadingTalents ? (
              <Card className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data talent...</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-semibold">Teman</th>
                        <th className="text-left p-4 font-semibold">Kota</th>
                        <th className="text-left p-4 font-semibold">Penilaian</th>
                        <th className="text-left p-4 font-semibold">Harga</th>
                        <th className="text-left p-4 font-semibold">Status</th>
                        <th className="text-left p-4 font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTalents.length > 0 ? (
                        allTalents.map((talent) => (
                          <tr key={talent.id} className="border-t hover:bg-muted/30">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img src={getImageUrl(talent.photo)} alt={talent.name} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                  <p className="font-semibold">{talent.name}</p>
                                  <p className="text-sm text-muted-foreground">{talent.age || '-'} thn</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">{talent.city || '-'}</td>
                            <td className="p-4">{talent.rating}</td>
                            <td className="p-4">{formatCurrency(talent.price || talent.pricePerHour || 0)}</td>
                            <td className="p-4">
                              {blockedTalents.includes(talent.id) ? (
                                <Badge variant="destructive">Diblokir</Badge>
                              ) : (
                                <Badge variant={(talent.price || talent.pricePerHour) > 0 && talent.photo ? "success" : "warning"}>
                                  {(talent.price || talent.pricePerHour) > 0 && talent.photo ? "Terverifikasi" : "Menunggu"}
                                </Badge>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setViewTalentId(talent.id)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => toggleBlockTalent(talent.id)}>
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center">
                            <p className="text-muted-foreground">Tidak ada data talent yang tersedia.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Verifikasi Pengguna</h2>
                <p className="text-muted-foreground text-sm">
                  Pengguna yang mendaftar sebagai talent dan menunggu verifikasi
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                {verifications.filter(v => v.status === "pending").length} Menunggu
              </Badge>
            </div>
            
            <Tabs value={verificationTab} onValueChange={setVerificationTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Menunggu Verifikasi
                  <Badge variant="outline" className="ml-1">
                    {verifications.filter(v => v.status === "pending").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="expired" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Batas Waktu Terlampaui
                  <Badge variant="outline" className="ml-1">
                    {expiredVerifications.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="space-y-4">
                {isLoadingVerifications ? (
                  <Card className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Memuat data verifikasi...</p>
                  </Card>
                ) : verifications.filter(v => v.status === "pending").length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Tidak Ada Talent Menunggu</h3>
                    <p className="text-muted-foreground">Saat ini tidak ada talent yang menunggu verifikasi.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {verifications.filter(v => v.status === "pending").map((user) => (
                      <Card key={user.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                            <div className="flex-1">
                              <h3 className="font-bold">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">Dikirim: {user.date}</p>
                              <div className="mt-3">
                                <Badge variant={isExpired(user.verificationDeadline || "") ? "destructive" : "warning"} className="gap-1">
                                  <Clock className="w-3 h-3" />
                                  {isExpired(user.verificationDeadline || "") ? "Batas Waktu Terlampaui" : "Menunggu Verifikasi"}
                                </Badge>
                              </div>
                              {user.verificationDeadline && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Batas waktu: {formatDeadline(user.verificationDeadline)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium">Dokumen:</p>
                            <div className="flex gap-2 flex-wrap">
                              {user.verificationDocuments.ktp && (
                                <div className="w-12 h-12 rounded border overflow-hidden flex items-center justify-center bg-muted">
                                  <FileText className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">KTP akan ditampilkan sebagai link Google Drive</p>
                          </div>
                          
                          {user.status === "pending" && (
                            <div className="flex gap-2 mt-4">
                              <Button 
                                size="sm" 
                                className="gap-1 flex-1" 
                                onClick={() => handleAcceptVerification(user.id)}
                                disabled={isSendingEmail === user.id}
                              >
                                {isSendingEmail === user.id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Memproses...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Terima
                                  </>
                                )}
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handleRejectVerification(user.id)}>
                                <XCircle className="w-4 h-4" />
                                Tolak
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => viewVerificationDetails(user)}>
                                <FileText className="w-4 h-4" />
                                Detail
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="expired" className="space-y-4">
                {expiredVerifications.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold mb-2">Tidak Ada Talent Terlambat</h3>
                    <p className="text-muted-foreground">Tidak ada talent yang melewati batas waktu verifikasi.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {expiredVerifications.map((user) => (
                      <Card key={user.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                            <div className="flex-1">
                              <h3 className="font-bold">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">Dikirim: {user.date}</p>
                              <Badge variant="destructive" className="gap-1 mt-3">
                                <Clock className="w-3 h-3" />
                                Terlambat
                              </Badge>
                              {user.verificationDeadline && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Batas waktu: {formatDeadline(user.verificationDeadline)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium">Dokumen:</p>
                            <div className="flex gap-2 flex-wrap">
                              {user.verificationDocuments.ktp && (
                                <div className="w-12 h-12 rounded border overflow-hidden flex items-center justify-center bg-muted">
                                  <FileText className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">KTP akan ditampilkan sebagai link Google Drive</p>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => viewVerificationDetails(user)}>
                              <FileText className="w-4 h-4" />
                              Detail
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="gap-1 flex-1" 
                              onClick={() => handleSendVerificationEmail(user.id)}
                              disabled={isSendingEmail === user.id}
                            >
                              {isSendingEmail === user.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Mengirim...
                                </>
                              ) : (
                                <>
                                  <Mail className="w-4 h-4" />
                                  Kirim Email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Laporan Mitra</h2>
                <p className="text-muted-foreground text-sm">
                  Laporan yang dikirim oleh mitra dan menunggu penanganan
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <FileText className="w-3 h-3" />
                {pendingReports.length} Menunggu
              </Badge>
            </div>
            
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold">{report.subject}</h3>
                            <p className="text-sm text-muted-foreground">Dari: {report.name} ({report.email})</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Kategori: {report.category} • {new Date(report.createdAt).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            report.status === "pending" ? "warning" : 
                            report.status === "in-progress" ? "default" : 
                            "success"
                          }
                          className="gap-1"
                        >
                          {report.status === "pending" && <Clock className="w-3 h-3" />}
                          {report.status === "in-progress" && <AlertTriangle className="w-3 h-3" />}
                          {report.status === "resolved" && <CheckCircle className="w-3 h-3" />}
                          {report.status === "pending" ? "Menunggu" : 
                           report.status === "in-progress" ? "Dalam Proses" : 
                           "Selesai"}
                        </Badge>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <p className="text-sm">{report.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Tingkat urgensi:</span>
                          <Badge 
                            variant={
                              report.urgency === "critical" ? "destructive" : 
                              report.urgency === "high" ? "warning" : 
                              report.urgency === "normal" ? "default" : 
                              "secondary"
                            }
                            className="text-xs"
                          >
                            {report.urgency === "critical" ? "Kritis" : 
                             report.urgency === "high" ? "Tinggi" : 
                             report.urgency === "normal" ? "Normal" : 
                             "Rendah"}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          {report.status === "pending" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateReportStatus(report.id, "in-progress")}
                            >
                              Proses
                            </Button>
                          )}
                          {report.status === "in-progress" && (
                            <Button 
                              size="sm"
                              onClick={() => updateReportStatus(report.id, "resolved")}
                            >
                              Selesaikan
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.open(`mailto:${report.email}`, '_blank')}
                          >
                            Balas Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Tidak Ada Laporan</h3>
                <p className="text-muted-foreground">Belum ada laporan yang dikirim oleh mitra.</p>
              </Card>
            )}
          </TabsContent>

<TabsContent value="revenue">
  <Card className="p-6">
    <h3 className="text-xl font-bold mb-4">Ringkasan Pendapatan</h3>
    <div className="grid md:grid-cols-4 gap-4 mb-6">
      {(() => { 
        const now = new Date(); 
        const approvedThisMonth = approvedBookingsForRevenue.filter((b) => { 
          const d = new Date(b.date); 
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); 
        }); 
        const total = approvedThisMonth.reduce((sum, b) => sum + (b.total || 0), 0); 
        const commissionPercentage = getAppCommission();
        const appCommission = Math.round(total * (commissionPercentage / 100));
        const mitraEarnings = total - appCommission;
        const txCount = approvedThisMonth.length; 
        const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n); 
        return (
          <>
            <div className="p-4 bg-accent rounded-xl">
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
              <p className="text-2xl font-bold text-primary">{fmt(total)}</p>
            </div>
            <div className="p-4 bg-accent rounded-xl">
              <p className="text-sm text-muted-foreground">Biaya Admin ({commissionPercentage}%)</p>
              <p className="text-2xl font-bold text-primary">{fmt(appCommission)}</p>
            </div>
            <div className="p-4 bg-accent rounded-xl">
              <p className="text-sm text-muted-foreground">Pendapatan Talent</p>
              <p className="text-2xl font-bold text-primary">{fmt(mitraEarnings)}</p>
            </div>
            <div className="p-4 bg-accent rounded-xl">
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
              <p className="text-2xl font-bold text-primary">{txCount}</p>
            </div>
          </>
        ); 
      })()}
    </div>
    
    <div className="mt-6">
      <h4 className="text-lg font-semibold mb-3">Detail Pembagian Pembayaran</h4>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-3 font-semibold min-w-[200px]">ID Transaksi</th>
                <th className="text-left p-3 font-semibold min-w-[120px]">Tanggal</th>
                <th className="text-left p-3 font-semibold min-w-[120px]">Total</th>
                <th className="text-left p-3 font-semibold min-w-[120px]">Biaya Admin</th>
                <th className="text-left p-3 font-semibold min-w-[120px]">Pendapatan Mitra</th>
              </tr>
            </thead>
            <tbody>
              {approvedBookingsForRevenue.length > 0 ? (
                approvedBookingsForRevenue.slice(0, 10).map(booking => {
                  const commissionPercentage = getAppCommission();
                  const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);
                  
                  // Fungsi untuk memotong ID transaksi
                  const truncateId = (id: string, maxLength: number = 20) => {
                    if (id.length <= maxLength) return id;
                    return id.substring(0, maxLength) + "...";
                  };
                  
                  return (
                    <tr key={booking.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 pr-2">
                        <div className="relative group">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium text-left truncate block max-w-[180px]"
                            onClick={() => handleViewTransaction(booking.id)}
                            title={booking.id}
                          >
                            {truncateId(booking.id)}
                          </button>
                          <div className="absolute hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded p-2 -top-8 left-0 whitespace-nowrap">
                            {booking.id}
                            <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -bottom-1 left-4"></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm min-w-[120px]">{new Date(booking.date).toLocaleDateString("id-ID")}</td>
                      <td className="p-3 text-sm font-medium min-w-[120px]">{formatCurrency(paymentSplit.totalAmount)}</td>
                      <td className="p-3 text-sm font-medium min-w-[120px]">{formatCurrency(paymentSplit.appAmount)}</td>
                      <td className="p-3 text-sm font-medium min-w-[120px]">{formatCurrency(paymentSplit.mitraAmount)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Tidak ada transaksi yang disetujui bulan ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Card>
</TabsContent>

          {/* TAB KOTA */}
          <TabsContent value="cities" className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Manajemen Kota</h2>
              <p className="text-muted-foreground text-sm">
                Tambah, edit, atau hapus kota yang tersedia untuk filter pencarian
              </p>
            </div>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tambah Kota Baru</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Nama kota"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddCity()}
                />
                <Button onClick={handleAddCity}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Daftar Kota</h3>
                <Badge variant="outline">{memoizedCities.length} kota</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memoizedCities.map((city) => (
                  <div key={city} className="flex items-center justify-between p-3 border rounded-lg">
                    {editingCity === city ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editedCityName}
                          onChange={(e) => setEditedCityName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSaveEditCity}>Simpan</Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Batal</Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{city}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditCity(city)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCity(city)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {memoizedCities.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada kota yang ditambahkan. Tambahkan kota untuk memulai.
                </p>
              )}
            </Card>
            
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Informasi Penting</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Perubahan pada daftar kota akan langsung tersedia untuk filter pencarian di aplikasi. 
                    Pastikan untuk mengeja nama kota dengan benar dan konsisten.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
             <div>
              <h2 className="text-xl font-bold mb-4">Pengaturan Aplikasi</h2>
              <p className="text-muted-foreground text-sm">Atur nama aplikasi, judul tab browser, logo, dan informasi pembayaran.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Pengaturan Aplikasi
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nama Aplikasi</label>
                    <Input 
                      value={settings.appName} 
                      onChange={(e) => updateSettings({ appName: e.target.value })} 
                      placeholder="Masukkan nama aplikasi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Judul Tab Browser</label>
                    <Input 
                      value={settings.appTitle} 
                      onChange={(e) => updateSettings({ appTitle: e.target.value })} 
                      placeholder="Masukkan judul untuk tab browser"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Logo Aplikasi</label>
                    {settings.appLogo && (
                      <div className="pr-4">
                        <img src={settings.appLogo} alt="Logo Preview" className="w-20 h-20 rounded-lg border object-contain" />
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Favicon (Logo Tab Browser)</label>
                    {settings.appFavicon && (
                      <div className="pr-4">
                        <img src={settings.appFavicon} alt="Favicon Preview" className="w-12 h-12 rounded border object-contain" />
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={handleFaviconUpload} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Disarankan menggunakan gambar persegi dengan ukuran minimal 32x32 piksel
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Biaya Admin
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Persentase (%)</label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[appCommission.percentage]}
                        onValueChange={(value) => setAppCommission(prev => ({ ...prev, percentage: value[0] }))}
                        max={100}
                        min={0}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium">{appCommission.percentage}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Persentase dari total pembayaran yang akan diterima oleh aplikasi
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Deskripsi Biaya Admin</label>
                    <Input 
                      value={appCommission.description} 
                      onChange={(e) => setAppCommission(prev => ({ ...prev, description: e.target.value }))} 
                      placeholder="Deskripsi komisi aplikasi"
                    />
                  </div>
                  <Button onClick={handleSaveCommission} className="w-full">
                    Simpan Pengaturan 
                  </Button>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Kode QRIS
                </h3>
                <div className="space-y-4">
                  {qrisCode && (
                    <div className="flex justify-center">
                      <img src={qrisCode} alt="QRIS Preview" className="w-32 h-32 rounded-lg border" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload Gambar QRIS Baru</label>
                    <Input type="file" accept="image/*" onChange={handleQrisUpload} />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informasi Rekening
                </h3>
                <div className="space-y-4">
                  {Object.entries(bankAccounts).map(([bank, details]) => (
                    <div key={bank} className="space-y-2">
                      <h4 className="font-medium text-sm uppercase">{bank}</h4>
                      <Input 
                        placeholder="Nomor Rekening" 
                        value={details.number} 
                        onChange={(e) => setBankAccounts((prev) => ({ 
                          ...prev, 
                          [bank]: { ...prev[bank as keyof typeof prev], number: e.target.value } 
                        }))} 
                      />
                      <Input 
                        placeholder="Nama Pemegang Rekening" 
                        value={details.holder} 
                        onChange={(e) => setBankAccounts((prev) => ({ 
                          ...prev, 
                          [bank]: { ...prev[bank as keyof typeof prev], holder: e.target.value } 
                        }))} 
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings}>Simpan Semua Pengaturan</Button>
            </div>
          </TabsContent>
        </Tabs>
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
            <img src={selectedTransaction.userPhoto} alt={selectedTransaction.userName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
            <div>
              <p className="text-xs text-muted-foreground">Pengguna</p>
              <h3 className="font-bold">{selectedTransaction.userName}</h3>
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
              <h3 className="font-bold">{selectedTransaction.talentName}</h3>
            </div>
            <img src={selectedTransaction.talentPhoto} alt={selectedTransaction.talentName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
          </div>
        </div>
        
        {/* PERBAIKAN: Layout yang lebih baik untuk ID Transaksi yang panjang */}
        <div className="bg-muted/50 rounded-lg p-4">
          {/* ID Transaksi dipisah untuk memberikan ruang lebih */}
          <div className="mb-4 pb-4 border-b">
            <p className="text-xs text-muted-foreground mb-2">ID Transaksi</p>
            <div className="bg-background rounded p-3 border">
              <p className="font-mono text-sm break-all">{selectedTransaction.id}</p>
            </div>
          </div>
          
          {/* Informasi lainnya dalam grid */}
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
              <p className="font-bold text-primary text-lg">{formatCurrency(selectedTransaction.total)}</p>
            </div>
          </div>
        </div>
              
              {selectedTransaction.paymentProof && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-semibold mb-2">Detail Pembayaran</p>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Metode</p><p className="font-medium">{selectedTransaction.paymentMethod ? selectedTransaction.paymentMethod.toUpperCase() : "-"}</p></div>
                    <div><p className="text-muted-foreground">Kode Pembayaran</p><p className="font-medium">{selectedTransaction.paymentCode}</p></div>
                    <div><p className="text-muted-foreground">Waktu Transfer</p><p className="font-medium">{selectedTransaction.transferTime}</p></div>
                    <div><p className="text-muted-foreground">Jumlah</p><p className="font-medium">{formatCurrency(selectedTransaction.transferAmount)}</p></div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-semibold mb-2">Pembagian Pembayaran</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Pembayaran</p>
                        <p className="font-medium">{formatCurrency(selectedTransaction.total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Biaya Admin ({getAppCommission()}%)</p>
                        <p className="font-medium">{formatCurrency(calculatePaymentSplit(selectedTransaction.total || 0, getAppCommission()).appAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pendapatan Mitra</p>
                        <p className="font-medium">{formatCurrency(calculatePaymentSplit(selectedTransaction.total || 0, getAppCommission()).mitraAmount)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted-foreground text-sm mb-1">Bukti Transfer</p>
                    <img src={selectedTransaction.paymentProof} alt="Bukti Transfer" className="w-48 rounded-lg border shadow cursor-pointer" onClick={() => window.open(selectedTransaction.paymentProof, "_blank")} />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ... Semua Dialog lainnya tetap sama */}
      <Dialog open={Boolean(viewTalentId)} onOpenChange={(open) => !open && setViewTalentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
          </DialogHeader>
          {selectedTalent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={getImageUrl(selectedTalent.photo)} alt={selectedTalent.name} className="w-16 h-16 rounded-full object-cover" />
                <div>
                  <h3 className="font-bold">{selectedTalent.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTalent.city || 'Tidak diketahui'}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">Tidak tersedia</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Umur</p>
                  <p className="font-medium">{selectedTalent.age || '-'} tahun</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Gender</p>
                  <p className="font-medium">{selectedTalent.gender || 'Tidak diketahui'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedTalent.availability !== "offline" ? "success" : "secondary"}>
                    {selectedTalent.availability === "online" ? "Online" : selectedTalent.availability === "both" ? "Online & Offline" : "Offline"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status Verifikasi</p>
                  <Badge variant={selectedTalent.isVerified ? "success" : "warning"}>
                    {selectedTalent.isVerified ? "Terverifikasi" : "Menunggu"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTalentId(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentDialog} onOpenChange={(open) => !open && setShowDocumentDialog(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detail Verifikasi Talent
            </DialogTitle>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <img src={selectedVerification.photo} alt={selectedVerification.name} className="w-20 h-20 rounded-full object-cover border-2 border-background shadow-lg" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedVerification.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedVerification.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Dikirim:</span> {selectedVerification.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Umur:</span> {selectedVerification.age || '-'} tahun
                    </p>
                    {selectedVerification.verificationDeadline && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Batas Waktu:</span> {formatDeadline(selectedVerification.verificationDeadline)}
                      </p>
                    )}
                  </div>
                  <Badge variant={isExpired(selectedVerification.verificationDeadline || "") ? "destructive" : "warning"} className="gap-1 mt-2">
                    <Clock className="w-3 h-3" />
                    {isExpired(selectedVerification.verificationDeadline || "") ? "Batas Waktu Terlampaui" : "Menunggu Verifikasi"}
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Informasi Pribadi
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama Lengkap:</span>
                      <span className="font-medium">{selectedVerification.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedVerification.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Umur:</span>
                      <span className="font-medium">{selectedVerification.age || '-'} tahun</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nomor Telepon:</span>
                      <span className="font-medium">{selectedVerification.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alamat:</span>
                      <span className="font-medium">{selectedVerification.address || "Tidak diisi"}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Informasi Talent
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kategori:</span>
                      <Badge variant="secondary">{selectedVerification.category || "Tidak diisi"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Harga per Jam:</span>
                      <span className="font-medium">{formatCurrency(selectedVerification.price || 0)}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Deskripsi Diri:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded min-h-[60px]">
                      {selectedVerification.description || "Tidak ada deskripsi."}
                    </p>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Dokumen Verifikasi
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Foto Profil</p>
                    <img 
                      src={selectedVerification.photo} 
                      alt="Profile" 
                      className="w-full h-32 object-cover rounded border" 
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">KTP (Google Drive)</p>
                    <a 
                      href={selectedVerification.verificationDocuments.ktp} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka KTP di Google Drive
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceDialog} onOpenChange={(open) => !open && setShowPriceDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Tentukan Harga Talent
            </DialogTitle>
          </DialogHeader>
          {selectedTalentForPrice && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <img src={selectedTalentForPrice.photo} alt={selectedTalentForPrice.name} className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-lg" />
                <div>
                  <h3 className="text-lg font-bold">{selectedTalentForPrice.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTalentForPrice.email}</p>
                  <p className="text-sm text-muted-foreground">Kategori: {selectedTalentForPrice.category || "Tidak diisi"}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Harga per Jam (Rp)</label>
                <Input 
                  type="number" 
                  placeholder="Masukkan harga per jam" 
                  value={talentPrice} 
                  onChange={(e) => setTalentPrice(e.target.value)} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tentukan harga yang sesuai untuk talent ini. Harga akan ditampilkan di halaman utama setelah talent disetujui.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSavePriceAndApprove}>
              Simpan & Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedDocument)} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dokumen: {selectedDocument?.type}</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="flex justify-center">
              <img 
                src={getImageUrl(selectedDocument.url)} 
                alt={selectedDocument.type} 
                className="max-w-full h-auto rounded border" 
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocument(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}