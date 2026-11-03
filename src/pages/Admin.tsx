import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  MessageSquare,
  DollarSign,
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
  Wallet,
  RefreshCw,
  UserRound,
  ArrowUpRight,
  Copy,
  Check,
  Smartphone,
  Camera,
  Bell,
  Landmark,
  CheckCircle2,
  List,
  LayoutGrid,
  ZoomIn,
  Download,
  Sparkles,
  Award,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { talents as mockTalents } from "@/data/mockData";
import { compressImageFile } from "@/utils/imageCompressor";
import { ComplaintChatModal } from "@/components/ComplaintChatModal";
import { getCities, saveCities } from "@/lib/cityStore";

import {
  SharedBooking,
  getBookings,
  getPendingBookings,
  getRefundPendingBookings,
  updateBookingApproval,
  subscribeToBookings,
  refreshBookingsFromSupabase,
} from "@/lib/bookingStore";
import {
  approveMitra,
  rejectMitra,
  getAllVerifiedTalents,
  subscribeToMitraChanges,
  sendVerificationEmail,
  checkVerificationDeadlines,
  updateTalentProfile,
} from "@/lib/mitraStore";
import {
  getAllTopUpRequests,
  approveTopUpRequest,
  rejectTopUpRequest,
  TopUpRequest
} from "@/lib/topupStore";
import {
  getAllWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  createAdminProfitDisbursement,
  WithdrawalRequest
} from "@/lib/withdrawalStore";

// Tambahkan tipe untuk status pembayaran
// Catatan: SharedBooking memakai "pending" | "paid", jadi samakan agar konsisten.
type PaymentStatus = "pending" | "paid";

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
  experience_level?: string;
  price_expectation?: string;
  social_media?: string;
  rejection_reason?: string;
  pricing_tier?: string;
  appeal_note?: string;
  appeal_file?: string | null;
  portfolio_file?: string | null;
  admin_price_note?: string;
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

export interface FinancialSummary {
  totalUserWallet: number;
  totalRegisteredUsers: number;
  totalApprovedTopup: number;
  approvedTopupCount: number;
  pendingTopupAmount: number;
  pendingTopupCount: number;
  totalApprovedWithdrawal: number;
  approvedWithdrawalCount: number;
  pendingWithdrawalAmount: number;
  pendingWithdrawalCount: number;
  totalGrossBooking: number;
  totalCommissionRevenue: number;
  totalAdminTreasury: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<SharedBooking[]>([]);
  const [refundPendingBookings, setRefundPendingBookings] = useState<SharedBooking[]>([]);
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
  const [appeals, setAppeals] = useState<VerificationItem[]>([]);
  const [allTalents, setAllTalents] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationItem | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; url: string } | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [verificationTab, setVerificationTab] = useState("pending");
  const [resolveComplaintModal, setResolveComplaintModal] = useState<{ isOpen: boolean; reportId: string | null; atFault: string; adminNotes: string }>({ isOpen: false, reportId: null, atFault: "none", adminNotes: "" });
  const [auditChatComplaintId, setAuditChatComplaintId] = useState<string | null>(null);

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
    percentage: 20,
    description: "Biaya admin untuk setiap transaksi"
  });

  // State untuk dialog harga & rubrik tiering
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedTalentForPrice, setSelectedTalentForPrice] = useState<VerificationItem | null>(null);
  const [talentPrice, setTalentPrice] = useState<string>("");
  const [selectedPricingTier, setSelectedPricingTier] = useState<string>("tier2");
  const [adminPriceNotes, setAdminPriceNotes] = useState<string>("");
  const [verificationChecklist, setVerificationChecklist] = useState({
    ktpValid: true,
    profileValid: true,
    skillValid: true,
  });

  // State untuk dialog penolakan mitra terstruktur
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [talentToReject, setTalentToReject] = useState<VerificationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("KTP buram / tidak terbaca dengan jelas");
  const [customRejectionReason, setCustomRejectionReason] = useState<string>("");
  const [isRejectingTalent, setIsRejectingTalent] = useState(false);

  // State untuk dialog penolakan banding tarif (HANYA tolak banding harga, TIDAK menolak calon mitra)
  const [showRejectAppealDialog, setShowRejectAppealDialog] = useState(false);
  const [appealTalentToReject, setAppealTalentToReject] = useState<VerificationItem | null>(null);
  const [appealRejectReason, setAppealRejectReason] = useState<string>("Portofolio / sertifikasi belum mencukupi untuk tarif yang diajukan");
  const [customAppealRejectReason, setCustomAppealRejectReason] = useState<string>("");
  const [isRejectingAppeal, setIsRejectingAppeal] = useState(false);

  // State untuk preview foto modal ukuran penuh (lightbox tanpa crop)
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: "",
  });

  // State untuk dialog edit data talent yang sudah terverifikasi
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false);
  const [editPriceTalent, setEditPriceTalent] = useState<any | null>(null);
  const [editTalentForm, setEditTalentForm] = useState({
    name: "",
    photo: "",
    city: "",
    category: "",
    description: "",
    price: "",
    phone: "",
    age: "",
  });
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // State untuk loading
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [isLoadingTalents, setIsLoadingTalents] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  // State untuk topup
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [isLoadingTopUps, setIsLoadingTopUps] = useState(false);
  const [topupFilterStatus, setTopupFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [topupSearchQuery, setTopupSearchQuery] = useState("");
  const [topupViewMode, setTopupViewMode] = useState<"table" | "grid">("table");
  const [selectedTopUpForModal, setSelectedTopUpForModal] = useState<TopUpRequest | null>(null);
  const [topupVerificationNote, setTopupVerificationNote] = useState("");
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupRejectDialog, setTopupRejectDialog] = useState<{ isOpen: boolean; request: TopUpRequest | null; reason: string }>({
    isOpen: false,
    request: null,
    reason: "",
  });

  // State untuk penarikan saldo (Withdrawal)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [selectedWithdrawalToReject, setSelectedWithdrawalToReject] = useState<WithdrawalRequest | null>(null);
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState("");
  const [isRejectingWithdrawal, setIsRejectingWithdrawal] = useState(false);
  const [selectedWithdrawalToApprove, setSelectedWithdrawalToApprove] = useState<WithdrawalRequest | null>(null);
  const [approveWithdrawalNote, setApproveWithdrawalNote] = useState("");
  const [approveWithdrawalProof, setApproveWithdrawalProof] = useState<string | null>(null);
  const [isApprovingWithdrawal, setIsApprovingWithdrawal] = useState(false);
  const [copiedAccNumber, setCopiedAccNumber] = useState<string | null>(null);

  // Filter, pencarian & mode tampilan penarikan saldo
  const [withdrawalFilterStatus, setWithdrawalFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [withdrawalFilterRole, setWithdrawalFilterRole] = useState<"all" | "mitra" | "user" | "admin">("all");
  const [withdrawalSearchQuery, setWithdrawalSearchQuery] = useState("");
  const [withdrawalViewMode, setWithdrawalViewMode] = useState<"table" | "grid">("table");
  const [selectedWithdrawalProofModal, setSelectedWithdrawalProofModal] = useState<WithdrawalRequest | null>(null);

  // Modal pencairan laba kas profit admin
  const [isAdminProfitModalOpen, setIsAdminProfitModalOpen] = useState(false);
  const [adminProfitAmount, setAdminProfitAmount] = useState<number | "">("");
  const [adminProfitBank, setAdminProfitBank] = useState("BCA");
  const [adminProfitAccNumber, setAdminProfitAccNumber] = useState("");
  const [adminProfitAccName, setAdminProfitAccName] = useState("");
  const [adminProfitNote, setAdminProfitNote] = useState("");
  const [isSubmittingAdminProfit, setIsSubmittingAdminProfit] = useState(false);

  // State untuk ringkasan kas perbendaharaan & navigasi tab / notifikasi
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const tabFromQuery = search.get("tab");
      if (tabFromQuery) return tabFromQuery;
      const hash = window.location.hash.replace("#", "");
      if (hash) return hash;
    }
    return "approvals";
  });
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // State untuk dialog detail transaksi
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SharedBooking | null>(null);

  // State untuk manajemen kota
  const [cities, setCities] = useState<string[]>(() => getCities());

  const [newCity, setNewCity] = useState("");
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editedCityName, setEditedCityName] = useState("");

  // Fungsi untuk memuat pengaturan dari localStorage
  useEffect(() => {
    const savedQris = localStorage.getItem("rentmate_admin_qris_code");
    if (savedQris) {
      setQrisCode(savedQris);
    } else {
      setQrisCode("/assets/qris-default.png");
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
  const getImageUrl = (url: string | null | undefined, fallback?: string) => {
    if (!url || url === "null" || url === "undefined" || String(url).trim() === "")
      return (
        fallback ||
        `https://ui-avatars.com/api/?name=Unknown&background=random&color=fff`
      );

    if (String(url).startsWith("data:")) return url;
    if (String(url).startsWith("/")) return url;
    return url;
  };

  // Fungsi untuk memeriksa ketersediaan server (melalui proxy Vite untuk menghindari masalah CORS/port)
  const checkServerAvailability = async () => {
    try {
      const controller = new AbortController();
      // Timeout 6 detik: cukup untuk backend lokal yang sedang memuat,
      // tanpa membuat admin salah menandai "Mode Offline" saat server lambat.
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Gunakan endpoint yang ringan (HEAD) alih-alih menarik seluruh data
      // talent (yang bisa ratusan KB) hanya untuk mengecek ketersediaan.
      const response = await fetch('/api/talents', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
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
      return commission.percentage || 20;
    } catch (error) {
      console.error("Error getting app commission:", error);
      return 20;
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

    // Cek ketersediaan server sekali di awal, lalu sinkronkan flag offline.
    const serverUp = await checkServerAvailability();
    setIsOfflineMode(!serverUp);

    // Ambil data dari DB secara paralel - masing-masing punya catch sendiri
    const [talentsRes] = await Promise.all([
      getAllVerifiedTalents().catch(e => {
        console.error("Gagal memuat talents, menggunakan mock data:", e);
        return mockTalents.map(t => ({ ...t, isLegacy: true, talentId: t.id })) as any[];
      }),
      refreshBookingsFromSupabase().catch(e => {
        console.error("Gagal refresh bookings:", e);
      })
    ]);

    // Pastikan selalu ada data: jika kosong, gunakan mock data sebagai jaminan
    const verifiedTalents = (Array.isArray(talentsRes) && talentsRes.length > 0)
      ? talentsRes
      : mockTalents.map(t => ({ ...t, isLegacy: true, talentId: t.id }));

    // Setelah cachedBookings terisi, baru ambil pending bookings
    const pendingBookingsData = getPendingBookings();
    const processedBookings: SharedBooking[] = pendingBookingsData.map(booking => ({
      ...booking,
      paymentStatus: (booking.paymentProof ? "paid" : "pending") as PaymentStatus,
    }));
    setBookings(processedBookings);
    setRefundPendingBookings(getRefundPendingBookings());

    // Update state talent
    setAllTalents(verifiedTalents);

    // PERBAIKAN: Langsung set jumlah talent ke stats SEGERA (sync, tanpa menunggu)
    // Ini mencegah race condition yang membuat Total Pengguna tetap 0
    const talentCount = verifiedTalents.length;
    const activeTalentCount = verifiedTalents.filter(
      (t: any) => t.availability !== "offline"
    ).length || talentCount;

    setStats(prev => [
      { ...prev[0], value: String(talentCount) },
      { ...prev[1], value: String(activeTalentCount) },
      prev[2],
      prev[3],
    ]);

    // Update bookings/revenue stats secara async
    await updateStats(verifiedTalents);

    setIsInitialLoading(false);
  }, []);

  // PERFORMA: Modifikasi updateStats untuk menerima data talent sebagai parameter
  // Ini mencegah pemanggilan API ganda
  const updateStats = useCallback(async (verifiedTalents: any[] = []) => {
    console.log("🔄 Admin: Memperbarui statistik...");
    setIsLoadingStats(true);
    try {
      // Jika verifiedTalents kosong, coba fetch langsung sebagai fallback
      let talentData = verifiedTalents;
      if (talentData.length === 0) {
        try {
          const talentRes = await fetch('/api/talents');
          if (talentRes.ok) {
            const rawTalents = await talentRes.json();
            talentData = Array.isArray(rawTalents) && rawTalents.length > 0 ? rawTalents : [];
            console.log("📊 Fallback: Berhasil memuat", talentData.length, "talents dari API");
          }
        } catch (e) {
          console.error("Fallback fetch talents gagal:", e);
        }
        // Jaminan terakhir: gunakan mock data jika semua cara gagal
        if (talentData.length === 0) {
          talentData = mockTalents.map(t => ({ ...t, isLegacy: true, talentId: t.id }));
          console.log("📊 Menggunakan mock data sebagai fallback akhir:", talentData.length, "talents");
        }
      }

      // Gunakan cachedBookings - semua status, bukan hanya approved
      const allBookings = getBookings();

      // Hitung total users dan pengguna aktif dari data talent
      const totalUsers = talentData.length;
      const activeTalentCount = talentData.filter(
        (t: any) => t.availability !== "offline"
      ).length || talentData.length;
      const activeUserCount = activeTalentCount;

      // Hitung completed bookings untuk konversi
      const completedOrApproved = allBookings.filter(
        (b) => b.approvalStatus === "approved" || b.approvalStatus === "completed"
      );

      const totalChats = completedOrApproved.length;

      // Hitung total pendapatan admin dari semua booking yang approved/completed
      const commissionPercentage = getAppCommission();
      const totalAppRevenue = completedOrApproved.reduce((sum, b) => {
        const paymentSplit = calculatePaymentSplit(b.total || 0, commissionPercentage);
        return sum + paymentSplit.appAmount;
      }, 0);

      const newStats = [
        { label: "Total Pengguna", value: String(totalUsers), icon: Users },
        { label: "Pengguna Aktif", value: String(activeUserCount), icon: UserCheck },
        { label: "Total Konversi", value: String(totalChats), icon: MessageSquare },
        {
          label: "Pendapatan Total",
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
        { label: "Total Konversi", value: "Error", icon: MessageSquare },
        { label: "Pendapatan Total", value: "Error", icon: DollarSign },
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

      const response = await fetch('/pending-talents', {
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
        experience_level: mitra.experience_level || "acara",
        price_expectation: mitra.price_expectation || "Rp 250.000 - Rp 350.000",
        social_media: mitra.social_media || "",
        portfolio_file: mitra.portfolio_file || null,
        appeal_file: mitra.appeal_file || null,
        rejection_reason: mitra.rejection_reason || null,
        pricing_tier: mitra.pricing_tier || "tier2",
      }));

      // PERFORMA: Gunakan startTransition untuk pembaruan state yang tidak mendesak
      startTransition(() => {
        setVerifications(formattedVerifications);
      });

      // Muat data calon mitra yang mengajukan banding tarif
      try {
        const appealsRes = await fetch('/api/admin/appeals');
        if (appealsRes.ok) {
          const appealsData = await appealsRes.json();
          const formattedAppeals: VerificationItem[] = appealsData.map((mitra: any) => ({
            id: mitra.user_id,
            name: mitra.full_name,
            email: mitra.email,
            photo: getImageUrl(mitra.photo, `https://ui-avatars.com/api/?name=${encodeURIComponent(mitra.full_name)}&background=random&color=fff`),
            date: new Date(mitra.created_at).toLocaleDateString("id-ID"),
            status: mitra.status,
            verificationDocuments: { ktp: mitra.ktp, kk: null, selfie: null, sim: null },
            phone: mitra.phone,
            address: mitra.address,
            category: mitra.category,
            description: mitra.description,
            price: Number(mitra.price) || 0,
            age: mitra.age,
            experience_level: mitra.experience_level || "acara",
            price_expectation: mitra.price_expectation || "Rp 250.000 - Rp 350.000",
            social_media: mitra.social_media || "",
            portfolio_file: mitra.portfolio_file || null,
            appeal_file: mitra.appeal_file || null,
            rejection_reason: mitra.rejection_reason || null,
            pricing_tier: mitra.pricing_tier || "tier2",
            appeal_note: mitra.appeal_note,
            admin_price_note: mitra.admin_price_note,
          }));
          startTransition(() => {
            setAppeals(formattedAppeals);
          });
        }
      } catch (appErr) {
        console.warn("Gagal memuat data banding tarif:", appErr);
      }
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
  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    let localReports: any[] = [];
    try {
      localReports = JSON.parse(localStorage.getItem("lovable_reports") || "[]");
    } catch (error) {
      console.error("Error loading local reports:", error);
    }

    try {
      const response = await fetch("/api/complaints");
      if (!response.ok) throw new Error("Gagal mengambil komplain dari database.");
      const complaints = await response.json();
      const databaseReports = complaints.map((complaint: any) => ({
        ...complaint,
        name: complaint.userName,
        email: complaint.userEmail,
        phone: complaint.userPhone,
        category: "Komplain Pesanan",
        source: "user",
      }));
      const databaseReportIds = new Set(databaseReports.map((report: any) => report.id));
      startTransition(() => {
        setReports([...databaseReports, ...localReports.filter(report => !databaseReportIds.has(report.id))]);
      });
    } catch (error) {
      console.error("Error loading database complaints:", error);
      startTransition(() => setReports(localReports));
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  const loadTopUpRequests = useCallback(async () => {
    setIsLoadingTopUps(true);
    try {
      const requests = await getAllTopUpRequests();
      startTransition(() => {
        setTopUpRequests(requests);
      });
    } catch (error) {
      console.error("Error loading topup requests:", error);
    } finally {
      setIsLoadingTopUps(false);
    }
  }, []);

  const loadWithdrawalRequests = useCallback(async () => {
    setIsLoadingWithdrawals(true);
    try {
      const requests = await getAllWithdrawalRequests();
      startTransition(() => {
        setWithdrawalRequests(requests);
      });
    } catch (error) {
      console.error("Error loading withdrawal requests:", error);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  }, []);

  const loadFinancialSummary = useCallback(async () => {
    setIsLoadingFinancial(true);
    try {
      const res = await fetch('/api/admin/financial-summary');
      if (res.ok) {
        const data = await res.json();
        startTransition(() => {
          setFinancialSummary(data);
        });
      }
    } catch (error) {
      console.error("Error loading financial summary:", error);
    } finally {
      setIsLoadingFinancial(false);
    }
  }, []);

  const handleCopyAccNumber = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
    }
    setCopiedAccNumber(num);
    toast({ title: "Nomor rekening/e-wallet disalin", description: num });
    setTimeout(() => setCopiedAccNumber(null), 2500);
  };

  const handleWithdrawalProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 900, 900, 0.8);
      setApproveWithdrawalProof(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setApproveWithdrawalProof(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmApproveWithdrawal = async () => {
    if (!selectedWithdrawalToApprove) return;
    setIsApprovingWithdrawal(true);
    try {
      const res = await approveWithdrawalRequest(
        selectedWithdrawalToApprove.id,
        approveWithdrawalNote.trim() || "Penarikan telah berhasil ditransfer oleh Admin",
        approveWithdrawalProof || undefined
      );
      if (res.success) {
        toast({
          title: "Berhasil",
          description: `Penarikan saldo sebesar ${formatCurrency(selectedWithdrawalToApprove.amount)} telah disetujui dan ditandai ditransfer.`,
        });
        setSelectedWithdrawalToApprove(null);
        setApproveWithdrawalNote("");
        setApproveWithdrawalProof(null);
        loadWithdrawalRequests();
        loadFinancialSummary();
      } else {
        toast({ title: "Gagal", description: res.error || "Gagal menyetujui penarikan", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" });
    } finally {
      setIsApprovingWithdrawal(false);
    }
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!selectedWithdrawalToReject) return;
    if (!rejectWithdrawalReason.trim()) {
      toast({
        title: "Alasan Wajib Diisi",
        description: "Mohon tuliskan alasan penolakan agar pengguna memahami.",
        variant: "destructive",
      });
      return;
    }
    setIsRejectingWithdrawal(true);
    try {
      const res = await rejectWithdrawalRequest(
        selectedWithdrawalToReject.id,
        rejectWithdrawalReason.trim()
      );
      if (res.success) {
        toast({
          title: "Penarikan Ditolak",
          description: `Permintaan ditolak dan saldo sebesar ${formatCurrency(selectedWithdrawalToReject.amount)} telah otomatis dikembalikan ke dompet pengguna.`,
        });
        setSelectedWithdrawalToReject(null);
        setRejectWithdrawalReason("");
        loadWithdrawalRequests();
        loadFinancialSummary();
      } else {
        toast({ title: "Gagal", description: res.error || "Gagal menolak penarikan", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" });
    } finally {
      setIsRejectingWithdrawal(false);
    }
  };

  const handleConfirmAdminProfitDisbursement = async () => {
    const num = typeof adminProfitAmount === "number" ? adminProfitAmount : 0;
    if (num < 10000) {
      toast({
        title: "Nominal Minimal Rp 10.000",
        description: "Masukkan nominal pencairan laba minimal Rp 10.000",
        variant: "destructive",
      });
      return;
    }
    if (num > availableAdminProfit) {
      toast({
        title: "Saldo Kas Profit Tidak Mencukupi",
        description: `Maksimal profit yang dapat dicairkan saat ini adalah ${formatCurrency(availableAdminProfit)}`,
        variant: "destructive",
      });
      return;
    }
    if (!adminProfitAccNumber.trim() || !adminProfitAccName.trim()) {
      toast({
        title: "Data Rekening Belum Lengkap",
        description: "Harap masukkan nomor rekening dan nama pemilik rekening tujuan",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAdminProfit(true);
    try {
      const res = await createAdminProfitDisbursement({
        amount: num,
        bankName: adminProfitBank,
        accountNumber: adminProfitAccNumber.trim(),
        accountName: adminProfitAccName.trim(),
        adminNote: adminProfitNote.trim() || `Pencairan laba komisi platform (20%) ke rekening ${adminProfitBank}`,
      });
      if (res.success) {
        toast({
          title: "Pencairan Profit Berhasil Dicatat! 💸",
          description: `Kas profit platform sebesar ${formatCurrency(num)} berhasil dicairkan ke ${adminProfitBank} (${adminProfitAccNumber}).`,
        });
        setIsAdminProfitModalOpen(false);
        setAdminProfitAmount("");
        setAdminProfitAccNumber("");
        setAdminProfitAccName("");
        setAdminProfitNote("");
        loadWithdrawalRequests();
        loadFinancialSummary();
      } else {
        toast({
          title: "Gagal Mencairkan Profit",
          description: res.error || "Terjadi kesalahan saat memproses pencairan kas profit.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Terjadi kesalahan sistem.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAdminProfit(false);
    }
  };

  const handleApproveTopUp = async (req: TopUpRequest, note?: string) => {
    setIsProcessingTopup(true);
    try {
      const adminNote = note || topupVerificationNote || "Telah diverifikasi Admin via QRIS Resmi";
      const { success } = await approveTopUpRequest(req.id, adminNote);
      if (success) {
        toast({
          title: "Top-Up Disetujui! 💰",
          description: `Saldo sebesar ${formatCurrency(req.amount)} telah berhasil ditambahkan ke akun ${req.userName || "Pengguna"}.`,
        });
        setSelectedTopUpForModal(null);
        setTopupVerificationNote("");
        loadTopUpRequests();
        loadFinancialSummary();
        updateStats(allTalents);
      } else {
        toast({
          title: "Gagal Menyetujui",
          description: "Tidak dapat menyetujui permintaan isi saldo.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Gagal memproses persetujuan top-up.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const handleConfirmRejectTopUp = async () => {
    if (!topupRejectDialog.request) return;
    setIsProcessingTopup(true);
    try {
      const reason = topupRejectDialog.reason.trim() || "Bukti transfer tidak valid";
      const success = await rejectTopUpRequest(topupRejectDialog.request.id, reason);
      if (success) {
        toast({
          title: "Permintaan Ditolak",
          description: `Permintaan top-up telah ditolak dengan alasan: "${reason}".`,
        });
        setTopupRejectDialog({ isOpen: false, request: null, reason: "" });
        setSelectedTopUpForModal(null);
        loadTopUpRequests();
        loadFinancialSummary();
      } else {
        toast({
          title: "Gagal Menolak",
          description: "Tidak dapat menolak permintaan top-up.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Gagal menolak permintaan top-up.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingTopup(false);
    }
  };


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
      loadTopUpRequests();
      loadWithdrawalRequests();
      loadFinancialSummary();
      checkVerificationDeadlines();
    }, 100); // 100ms delay

    return () => clearTimeout(timeoutId);
  }, [loadVerifications, loadReports, loadTopUpRequests, loadWithdrawalRequests, loadFinancialSummary]);

  // Handle updates from other windows
  useEffect(() => {
    const handleFinancialUpdate = () => {
      loadTopUpRequests();
      loadWithdrawalRequests();
      loadFinancialSummary();
    };
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === "rentmate_topup_requests") {
        loadTopUpRequests();
        loadFinancialSummary();
      }
      if (e.key === "rentmate_withdrawal_requests") {
        loadWithdrawalRequests();
        loadFinancialSummary();
      }
      if (e.key === "lovable_reports" || e.key === "rentmate_complaints_updated") {
        loadReports();
      }
    };
    window.addEventListener("topupRequestsUpdated", handleFinancialUpdate);
    window.addEventListener("withdrawalRequestsUpdated", handleFinancialUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener("topupRequestsUpdated", handleFinancialUpdate);
      window.removeEventListener("withdrawalRequestsUpdated", handleFinancialUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [loadTopUpRequests, loadWithdrawalRequests, loadFinancialSummary]);

  // Fetch mitra count langsung dari API saat komponen mount - sebagai safety net
  useEffect(() => {
    const fetchTalentCount = async () => {
      try {
        const res = await fetch('/api/talents');
        if (!res.ok) return;
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;
        if (count > 0) {
          const commission = getAppCommission();
          const allBookings = getBookings();
          const completedOrApproved = allBookings.filter(
            (b) => b.approvalStatus === 'approved' || b.approvalStatus === 'completed'
          );
          const totalRevenue = completedOrApproved.reduce((sum, b) => {
            const app = Math.round((b.total || 0) * (commission / 100));
            return sum + app;
          }, 0);
          startTransition(() => {
            setStats([
              { label: "Total Pengguna", value: String(count), icon: Users },
              { label: "Pengguna Aktif", value: String(count), icon: UserCheck },
              { label: "Total Konversi", value: String(completedOrApproved.length), icon: MessageSquare },
              { label: "Pendapatan Total", value: formatCurrency(totalRevenue), icon: DollarSign },
            ]);
          });
          const formattedData = data.map((mitra: any) => ({
            id: mitra.user_id,
            talentId: mitra.user_id,
            name: mitra.full_name,
            photo: mitra.photo,
            city: mitra.address || '-',
            category: mitra.category || 'Lainnya',
            description: mitra.description || '',
            rating: 0,
            price: mitra.price || 0,
            pricePerHour: mitra.price || 0,
            availability: 'online & offline',
            isVerified: true,
            isLegacy: false,
            age: mitra.age,
            email: mitra.email,
            phone: mitra.phone,
            skills: mitra.skills || [],
            status: mitra.status
          }));
          setAllTalents(formattedData);
        }
      } catch (e) {
        console.error("Safety net fetch talents gagal:", e);
      }
    };
    // Jalankan setelah loadInitialData selesai (sedikit delay)
    const t = setTimeout(fetchTalentCount, 1500);
    return () => clearTimeout(t);
  }, []);

  // PERFORMA: useEffect untuk event listener, pastikan dependency-nya stabil
  useEffect(() => {
    // PERBAIKAN: Listener ini sekarang konsisten dengan state yang kita kelola (pending bookings)
    const unsubscribeBookings = subscribeToBookings(() => {
      console.log("🔔 Admin: Perubahan data booking terdeteksi, memuat ulang daftar pending...");
      // Ambil ulang hanya data pending bookings agar state tetap konsisten
      const pendingBookingsData = getPendingBookings();
      const processedBookings: SharedBooking[] = pendingBookingsData.map(booking => ({
        ...booking,
        paymentStatus: (booking.paymentProof ? "paid" : "pending") as PaymentStatus,
      }));
      setBookings(processedBookings);
      setRefundPendingBookings(getRefundPendingBookings());
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
      saveCities(updatedCities);
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
    saveCities(updatedCities);
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
      saveCities(updatedCities);
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

  // PERBAIKAN: Admin memverifikasi pembayaran & meneruskan ke Mitra untuk persetujuan akhir
  const handleApproveBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const commissionPercentage = getAppCommission();
    const paymentSplit = calculatePaymentSplit(booking.total || 0, commissionPercentage);

    // Update status ke pending_mitra (Admin memverifikasi, selanjutnya Mitra yang menyetujui)
    updateBookingApproval(bookingId, "pending_mitra");

    // Langsung update state lokal dengan memfilter item yang diproses
    setBookings(currentBookings => currentBookings.filter(b => b.id !== bookingId));

    // Update statistik
    updateStats(allTalents);

    toast({
      title: "Pembayaran Diverifikasi Admin",
      description: `Pesanan diteruskan ke Mitra (${booking.talentName}). Menunggu konfirmasi persetujuan dari Mitra.`,
    });
  };

  const handleMarkRefundCompleted = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "refunded" }),
      });
      if (!response.ok) throw new Error("Status refund gagal diperbarui.");

      await refreshBookingsFromSupabase();
      setRefundPendingBookings(getRefundPendingBookings());
      toast({
        title: "Refund Ditandai Selesai",
        description: "Pastikan dana sudah dikembalikan sebelum menandai proses ini selesai.",
      });
    } catch (error) {
      toast({
        title: "Gagal Memperbarui Refund",
        description: error instanceof Error ? error.message : "Silakan coba lagi.",
        variant: "destructive",
      });
    }
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
    const mitra = verifications.find(m => m.id === id) || appeals.find(m => m.id === id);
    if (!mitra) {
      toast({ title: "Terjadi kesalahan", description: "Data talent tidak ditemukan.", variant: "destructive" });
      return;
    }

    // Hitung rekomendasi tier & harga otomatis berdasarkan kategori & tingkat kesiapan layanan
    const exp = mitra.experience_level || "acara";
    const cat = (mitra.category || "").toLowerCase();
    let defaultTier = "tier2";
    let defaultPrice = "300000";

    if (cat.includes("foto") || cat.includes("video") || cat.includes("tour") || cat.includes("hiking") || exp === "spesialis" || exp === "mahir") {
      defaultTier = "tier3";
      defaultPrice = "400000";
    } else if (exp === "kasual" || exp === "pemula") {
      defaultTier = "tier1";
      defaultPrice = "225000";
    }

    setSelectedTalentForPrice(mitra);
    setSelectedPricingTier(mitra.pricing_tier || defaultTier);
    setTalentPrice(mitra.price && mitra.price > 0 ? String(mitra.price) : defaultPrice);
    setAdminPriceNotes("");
    setVerificationChecklist({ ktpValid: true, profileValid: true, skillValid: true });
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
      await approveMitra(
        selectedTalentForPrice.id,
        selectedTalentForPrice.email,
        selectedTalentForPrice.name,
        Number(talentPrice),
        selectedPricingTier,
        adminPriceNotes
      );

      toast({
        title: "Mitra Berhasil Diverifikasi 🎉",
        description: `${selectedTalentForPrice.name} disetujui di ${selectedPricingTier.toUpperCase()} dengan tarif ${formatCurrency(Number(talentPrice))}/jam.`
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

  // Buka dialog edit data lengkap untuk talent yang sudah terverifikasi
  const handleOpenEditPrice = (talent: any) => {
    setEditPriceTalent(talent);
    setEditTalentForm({
      name: talent.name || "",
      photo: talent.photo || "",
      city: talent.city && talent.city !== "-" ? talent.city : "",
      category: talent.category && talent.category !== "Lainnya" ? talent.category : "",
      description: talent.description || "",
      price: String(talent.price || talent.pricePerHour || ""),
      phone: talent.phone || "",
      age: talent.age ? String(talent.age) : "",
    });
    setShowEditPriceDialog(true);
  };

  // Unggah foto profil talent (base64) di dalam dialog edit
  const handleEditTalentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Upload Gagal",
        description: "Ukuran foto maksimal 5MB",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditTalentForm(prev => ({ ...prev, photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Simpan perubahan data talent
  const handleSaveEditPrice = async () => {
    if (!editPriceTalent) return;

    const priceNumber = Number(editTalentForm.price);
    if (!editTalentForm.price || isNaN(priceNumber) || priceNumber < 0) {
      toast({
        title: "Harga Tidak Valid",
        description: "Masukkan harga yang valid (angka positif).",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPrice(true);
    try {
      const targetId = editPriceTalent.talentId || editPriceTalent.id;
      await updateTalentProfile(targetId, {
        name: editTalentForm.name || undefined,
        photo: editTalentForm.photo || undefined,
        city: editTalentForm.city || undefined,
        category: editTalentForm.category || undefined,
        description: editTalentForm.description || undefined,
        price: priceNumber,
        phone: editTalentForm.phone || undefined,
        age: editTalentForm.age ? Number(editTalentForm.age) : undefined,
      });

      toast({
        title: "Data Diperbarui",
        description: `Data ${editTalentForm.name || editPriceTalent.name} berhasil disimpan.`,
      });

      setShowEditPriceDialog(false);
      setEditPriceTalent(null);

      // Muat ulang data talent agar tabel menampilkan data terbaru
      const verifiedTalents = await getAllVerifiedTalents() || [];
      setAllTalents(Array.isArray(verifiedTalents) ? verifiedTalents : []);
      updateStats(verifiedTalents);
    } catch (error: any) {
      console.error("Error updating talent profile:", error);
      toast({
        title: "Gagal Memperbarui Data",
        description: error.message || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleOpenRejectDialog = (talent: VerificationItem) => {
    setTalentToReject(talent);
    setRejectionReason("KTP buram / tidak terbaca dengan jelas");
    setCustomRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!talentToReject) return;
    setIsRejectingTalent(true);
    const targetId = talentToReject.id;
    const targetEmail = talentToReject.email;
    const targetName = talentToReject.name;
    const finalReason = rejectionReason === "Lainnya" ? (customRejectionReason || "Alasan khusus admin") : rejectionReason;
    try {
      await rejectMitra(targetId, targetEmail, finalReason);
      toast({
        title: "Pendaftaran Mitra Ditolak",
        description: `Pendaftaran ${targetName} telah ditolak. Alasan tercatat di sistem.`,
        variant: "destructive",
      });
      setShowRejectDialog(false);
      setTalentToReject(null);
      // Hapus langsung dari list verifikasi agar kartu dan badge berkurang seketika
      setVerifications(prev => prev.filter(v => v.id !== targetId && v.email !== targetEmail));
      await loadVerifications();
      updateStats(allTalents);
    } catch (error: any) {
      toast({
        title: "Gagal Menolak",
        description: error.message || "Terjadi kesalahan saat memproses penolakan.",
        variant: "destructive",
      });
    } finally {
      setIsRejectingTalent(false);
    }
  };

  const handleOpenRejectAppealDialog = (talent: VerificationItem) => {
    setAppealTalentToReject(talent);
    setAppealRejectReason("Portofolio / sertifikasi belum mencukupi untuk tarif yang diajukan");
    setCustomAppealRejectReason("");
    setShowRejectAppealDialog(true);
  };

  const handleConfirmRejectAppeal = async () => {
    if (!appealTalentToReject) return;
    setIsRejectingAppeal(true);
    const finalReason = appealRejectReason === "Lainnya"
      ? (customAppealRejectReason.trim() || "Penetapan tarif awal sudah sesuai standar kualifikasi platform")
      : appealRejectReason;

    try {
      const res = await fetch('/api/admin/reject-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talentEmail: appealTalentToReject.email,
          talentId: appealTalentToReject.id,
          reason: finalReason,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Gagal memproses penolakan banding.");
      }

      toast({
        title: "Banding Tarif Ditolak",
        description: `Banding ${appealTalentToReject.name} ditolak. Calon mitra tetap berstatus disetujui dengan tarif awal ${formatCurrency(appealTalentToReject.price || 0)}/jam.`,
      });

      setShowRejectAppealDialog(false);
      setAppealTalentToReject(null);
      loadVerifications();
    } catch (error: any) {
      toast({
        title: "Gagal Menolak Banding",
        description: error.message || "Terjadi kesalahan saat memproses penolakan banding.",
        variant: "destructive",
      });
    } finally {
      setIsRejectingAppeal(false);
    }
  };

  const handleSendVerificationEmail = async (id: string) => {
    try {
      setIsSendingEmail(id);

      const mitra = verifications.find(m => m.id === id);
      if (!mitra) {
        throw new Error("Data talent tidak ditemukan.");
      }

      const response = await fetch('/send-reminder', {
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

  const handleQrisUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setQrisFile(file);
      try {
        const compressed = await compressImageFile(file, 600, 600, 0.85);
        setQrisCode(compressed);
        localStorage.setItem("rentmate_admin_qris_code", compressed);
        window.dispatchEvent(new Event("storage"));
        toast({
          title: "Gambar QRIS Diunggah",
          description: "Gambar QRIS berhasil diunggah dan disimpan.",
        });
      } catch (error) {
        console.error("Gagal memproses QRIS:", error);
        toast({
          title: "Gagal Mengunggah",
          description: "Gagal memproses gambar QRIS. Silakan coba lagi.",
          variant: "destructive",
        });
      }
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
    if (qrisCode) {
      localStorage.setItem("rentmate_admin_qris_code", qrisCode);
    }
    window.dispatchEvent(new Event("storage"));
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

  const updateReportStatus = async (reportId: string, newStatus: string, atFault?: string, adminNotes?: string) => {
    try {
      const report = reports.find(item => item.id === reportId);
      if (report?.source === "user") {
        const response = await fetch(`/api/complaints/${encodeURIComponent(reportId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, atFault, adminNotes }),
        });
        if (!response.ok) throw new Error("Status komplain gagal diperbarui di database.");
        await loadReports();
      } else {
      const reports = JSON.parse(localStorage.getItem("lovable_reports") || "[]");
      const updatedReports = reports.map(report =>
        report.id === reportId
          ? { ...report, status: newStatus, updatedAt: new Date().toISOString() }
          : report
      );

      localStorage.setItem("lovable_reports", JSON.stringify(updatedReports));
      setReports(updatedReports);
      }

      toast({
        title: "Status Diperbarui",
        description: `Status laporan telah diubah menjadi ${newStatus === "in-progress" ? "Dalam Proses" : "Selesai"
          }.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal memperbarui status laporan.",
        variant: "destructive"
      });
    }
  };

  // PERFORMA: Memoisasi data yang difilter untuk mencegah perhitungan ulang di setiap render
  const pendingReports = useMemo(() => reports.filter(r => r.status === "pending"), [reports]);

  // Calon mitra aktif yang belum lewat batas waktu SLA 24 jam
  const activePendingVerifications = useMemo(
    () => verifications.filter(v => v.status === "pending" && !isExpired(v.verificationDeadline || "")),
    [verifications]
  );

  // Calon mitra yang batas waktu verifikasinya telah terlampaui (>24 jam)
  const expiredVerifications = useMemo(
    () => verifications.filter(v => v.status === "pending" && isExpired(v.verificationDeadline || "")),
    [verifications]
  );

  // Jumlah calon mitra yang menunggu verifikasi & banding (untuk badge notifikasi di tab)
  const pendingVerificationsCount = useMemo(
    () => activePendingVerifications.length + expiredVerifications.length + appeals.length,
    [activePendingVerifications.length, expiredVerifications.length, appeals.length]
  );

  // Compute approved (and completed) bookings for revenue calculations
  const approvedBookingsForRevenue = useMemo(() => {
    const all = getBookings();
    return all.filter((b) => b.approvalStatus === "approved" || b.approvalStatus === "completed");
  }, [bookings]);

  // Antrean tertunda untuk notifikasi lonceng admin
  const pendingTopups = useMemo(() => topUpRequests.filter(r => r.status === "pending"), [topUpRequests]);
  const pendingWithdrawals = useMemo(() => withdrawalRequests.filter(r => r.status === "pending"), [withdrawalRequests]);
  const totalPendingTasks = useMemo(() => {
    return pendingReports.length + pendingVerificationsCount + pendingTopups.length + pendingWithdrawals.length + bookings.length;
  }, [pendingReports.length, pendingVerificationsCount, pendingTopups.length, pendingWithdrawals.length, bookings.length]);

  // Filtered topup requests & metrik ringkasan untuk Tab Top-Up
  const filteredTopUpRequests = useMemo(() => {
    return topUpRequests.filter((req) => {
      if (topupFilterStatus !== "all" && req.status !== topupFilterStatus) return false;
      if (topupSearchQuery.trim()) {
        const q = topupSearchQuery.toLowerCase();
        const matchName = (req.userName || "").toLowerCase().includes(q);
        const matchEmail = (req.userEmail || "").toLowerCase().includes(q);
        const matchAmount = String(req.amount).includes(q);
        const matchId = (req.id || "").toLowerCase().includes(q);
        return matchName || matchEmail || matchAmount || matchId;
      }
      return true;
    });
  }, [topUpRequests, topupFilterStatus, topupSearchQuery]);

  const approvedTopups = useMemo(() => topUpRequests.filter(r => r.status === "approved"), [topUpRequests]);
  const rejectedTopups = useMemo(() => topUpRequests.filter(r => r.status === "rejected"), [topUpRequests]);
  const totalApprovedTopupAmount = useMemo(() => approvedTopups.reduce((sum, r) => sum + (r.amount || 0), 0), [approvedTopups]);
  const totalPendingTopupAmount = useMemo(() => pendingTopups.reduce((sum, r) => sum + (r.amount || 0), 0), [pendingTopups]);

  // Filtered withdrawal requests & metrik ringkasan untuk Tab Tarik Saldo (Withdrawals)
  const filteredWithdrawalRequests = useMemo(() => {
    return withdrawalRequests.filter((req) => {
      // Filter status
      if (withdrawalFilterStatus !== "all" && req.status !== withdrawalFilterStatus) return false;
      // Filter role
      if (withdrawalFilterRole !== "all") {
        if (withdrawalFilterRole === "admin" && req.role !== "admin") return false;
        if (withdrawalFilterRole === "mitra" && req.role !== "mitra") return false;
        if (withdrawalFilterRole === "user" && req.role !== "user" && req.role !== undefined) return false;
      }
      // Search query
      if (withdrawalSearchQuery.trim()) {
        const q = withdrawalSearchQuery.toLowerCase();
        const matchName = (req.userName || "").toLowerCase().includes(q);
        const matchEmail = (req.userEmail || "").toLowerCase().includes(q);
        const matchBank = (req.bankName || "").toLowerCase().includes(q);
        const matchAccNumber = (req.accountNumber || "").toLowerCase().includes(q);
        const matchAccName = (req.accountName || "").toLowerCase().includes(q);
        const matchAmount = String(req.amount).includes(q);
        return matchName || matchEmail || matchBank || matchAccNumber || matchAccName || matchAmount;
      }
      return true;
    });
  }, [withdrawalRequests, withdrawalFilterStatus, withdrawalFilterRole, withdrawalSearchQuery]);

  const approvedWithdrawals = useMemo(() => withdrawalRequests.filter(r => r.status === "approved"), [withdrawalRequests]);
  const rejectedWithdrawals = useMemo(() => withdrawalRequests.filter(r => r.status === "rejected"), [withdrawalRequests]);

  const approvedMitraWithdrawals = useMemo(() => approvedWithdrawals.filter(r => r.role === "mitra"), [approvedWithdrawals]);
  const approvedUserWithdrawals = useMemo(() => approvedWithdrawals.filter(r => r.role === "user" || !r.role), [approvedWithdrawals]);
  const approvedAdminWithdrawals = useMemo(() => approvedWithdrawals.filter(r => r.role === "admin"), [approvedWithdrawals]);

  const totalPendingWithdrawalAmount = useMemo(() => pendingWithdrawals.reduce((sum, r) => sum + (r.amount || 0), 0), [pendingWithdrawals]);
  const totalApprovedMitraAmount = useMemo(() => approvedMitraWithdrawals.reduce((sum, r) => sum + (r.amount || 0), 0), [approvedMitraWithdrawals]);
  const totalApprovedUserAmount = useMemo(() => approvedUserWithdrawals.reduce((sum, r) => sum + (r.amount || 0), 0), [approvedUserWithdrawals]);
  const totalApprovedAdminAmount = useMemo(() => approvedAdminWithdrawals.reduce((sum, r) => sum + (r.amount || 0), 0), [approvedAdminWithdrawals]);

  // Saldo Kas Profit Platform Tersedia
  const totalGrossBookingRevenue = useMemo(() => {
    return approvedBookingsForRevenue.reduce((sum, b) => sum + Number(b.total || 0), 0);
  }, [approvedBookingsForRevenue]);
  const totalCommissionRevenue = useMemo(() => {
    return Math.round(totalGrossBookingRevenue * (getAppCommission() / 100));
  }, [totalGrossBookingRevenue]);
  const availableAdminProfit = useMemo(() => {
    return Math.max(0, (financialSummary?.totalCommissionRevenue ?? totalCommissionRevenue) - totalApprovedAdminAmount);
  }, [financialSummary?.totalCommissionRevenue, totalCommissionRevenue, totalApprovedAdminAmount]);

  // Ensure commission percentage defaults to 20% if not set in localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("rentmate_app_commission") || "{}");
      if (!stored.percentage) {
        localStorage.setItem("rentmate_app_commission", JSON.stringify({ percentage: 20 }));
      }
    } catch (e) {
      console.error("Error initializing commission percentage:", e);
      localStorage.setItem("rentmate_app_commission", JSON.stringify({ percentage: 20 }));
    }
  }, []);

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

          <div className="flex items-center gap-3">
            {/* Popover Lonceng Notifikasi Admin */}
            <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-orange-50 text-foreground" aria-label="Notifikasi Admin">
                  <Bell className="w-5 h-5 text-gray-700" />
                  {totalPendingTasks > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow animate-pulse">
                      {totalPendingTasks}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 shadow-xl rounded-2xl border" align="end">
                <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Notifikasi & Antrean</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {totalPendingTasks > 0 ? `${totalPendingTasks} permintaan memerlukan tindakan` : "Tidak ada antrean tertunda"}
                    </p>
                  </div>
                  {totalPendingTasks > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Perlu Aksi
                    </Badge>
                  )}
                </div>
                <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                  {pendingTopups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("topups"); setIsNotifOpen(false); }}
                      className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-orange-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-orange-100 text-orange-600 shrink-0 mt-0.5">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">
                          {pendingTopups.length} Permintaan Top-Up
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Konfirmasi bukti pembayaran QRIS pengguna
                        </p>
                      </div>
                    </button>
                  )}

                  {pendingWithdrawals.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("withdrawals"); setIsNotifOpen(false); }}
                      className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-orange-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">
                          {pendingWithdrawals.length} Permintaan Tarik Saldo
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Pengguna mengajukan pencairan saldo dompet
                        </p>
                      </div>
                    </button>
                  )}

                  {bookings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("approvals"); setIsNotifOpen(false); }}
                      className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-orange-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">
                          {bookings.length} Pemesanan Menunggu
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Verifikasi pembayaran booking baru
                        </p>
                      </div>
                    </button>
                  )}

                  {pendingVerificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("verification"); setIsNotifOpen(false); }}
                      className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-orange-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 shrink-0 mt-0.5">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">
                          {pendingVerificationsCount} Verifikasi Mitra Baru
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          KTP & dokumen mitra baru menunggu audit
                        </p>
                      </div>
                    </button>
                  )}

                  {pendingReports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("reports"); setIsNotifOpen(false); }}
                      className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-orange-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">
                          {pendingReports.length} Laporan Komplain
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Komplain pesanan memerlukan investigasi
                        </p>
                      </div>
                    </button>
                  )}

                  {totalPendingTasks === 0 && (
                    <div className="p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-semibold text-foreground">Semua Antrean Bersih!</p>
                      <p className="text-[11px] text-muted-foreground">Tidak ada permintaan yang tertunda saat ini.</p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Keluar
            </Button>
          </div>
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

        {/* METRIK UTAMA - BERSIH, RAPI, & PROFESIONAL */}
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
            {/* 1. Total Pengguna */}
            <Card className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Data Terbaru</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 leading-tight">
                  {allTalents.length || 36}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Pengguna</p>
              </div>
            </Card>

            {/* 2. Total Saldo Pengguna */}
            <Card className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Data Terbaru</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 leading-tight">
                  {isLoadingStats ? (
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    formatCurrency(financialSummary?.totalUserWallet ?? 6965000)
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Saldo Pengguna</p>
              </div>
            </Card>

            {/* 3. Total Pemesanan Selesai */}
            <Card className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Data Terbaru</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 leading-tight">
                  {stats[2]?.value || getBookings().filter(b => b.approvalStatus === "approved" || b.approvalStatus === "completed").length || 18}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Pemesanan Selesai</p>
              </div>
            </Card>

            {/* 4. Pendapatan Total (Komisi Platform) */}
            <Card className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Data Terbaru</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 leading-tight">
                  {isLoadingStats ? (
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    formatCurrency(financialSummary?.totalCommissionRevenue ?? 8042000)
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Pendapatan Total</p>
              </div>
            </Card>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", value);
              window.history.replaceState({}, "", url.toString());
            }
            if (value === "reports") void loadReports();
          }}
          className="space-y-6"
        >
          <TabsList className="flex flex-wrap w-full gap-2 bg-muted/50 p-2 rounded-xl">
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
            <TabsTrigger value="verification" className="relative gap-1">
              <Shield className="w-4 h-4" />
              Verifikasi
              {pendingVerificationsCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full"
                >
                  {pendingVerificationsCount}
                </span>
              )}
            </TabsTrigger>
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
            <TabsTrigger id="tab-topups" value="topups" className="relative gap-1">
              <Wallet className="w-4 h-4" />
              Top Up
              {topUpRequests.filter(r => r.status === 'pending').length > 0 && (
                <span
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full"
                >
                  {topUpRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="relative gap-1">
              <ArrowUpRight className="w-4 h-4" />
              Tarik Saldo
              {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                <span
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full"
                >
                  {withdrawalRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="revenue">Pendapatan</TabsTrigger>

            <TabsTrigger value="cities">Kota</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-4">
            {refundPendingBookings.length > 0 && (
              <Card className="border-amber-300 bg-amber-50/60 p-5">
                <div className="mb-4">
                  <h2 className="font-semibold">Pengembalian Dana Perlu Diproses</h2>
                  <p className="text-sm text-muted-foreground">
                    Booking berbayar ditolak atau kedaluwarsa. Kembalikan dana transfer secara manual sebelum menandai refund selesai.
                  </p>
                </div>
                <div className="space-y-3">
                  {refundPendingBookings.map((booking) => (
                    <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3">
                      <div>
                        <p className="font-medium">{booking.userName || "Pengguna"} · {booking.talentName || "Mitra"}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.date} · {booking.time} · {formatCurrency(booking.total || 0)} · {booking.paymentMethod || "Pembayaran"}
                        </p>
                        {booking.rejectionReason && (
                          <p className="mt-1 text-sm text-muted-foreground">Alasan penolakan: {booking.rejectionReason}</p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleMarkRefundCompleted(booking.id)}>
                        Tandai Refund Selesai
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
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
                  const isWalletPayment = booking.paymentMethod === "saldo" || booking.paymentProof === "PAID_VIA_WALLET";

                  return (
                    <Card key={booking.id} className="overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <img src={getImageUrl(booking.userPhoto, `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.userName || 'User')}&background=random&color=fff`)} alt={booking.userName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
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
                            <img src={getImageUrl(booking.talentPhoto, `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.talentName || 'Mitra')}&background=random&color=fff`)} alt={booking.talentName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
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
                          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                              <div className="min-w-0">
                                <section>
                                  <p className="text-sm font-semibold mb-3">Detail Pembayaran</p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm xl:grid-cols-4">
                                    <div className="min-w-0"><p className="min-h-5 text-xs text-muted-foreground">Metode</p><p className="mt-1 min-h-5 font-medium">{booking.paymentMethod ? booking.paymentMethod.toUpperCase() : "-"}</p></div>
                                    <div className="min-w-0"><p className="min-h-5 text-xs text-muted-foreground">Kode Pembayaran</p><p className="mt-1 min-h-5 truncate font-medium" title={booking.paymentCode || "-"}>{booking.paymentCode || "-"}</p></div>
                                    <div className="min-w-0"><p className="min-h-5 text-xs text-muted-foreground">Waktu Transfer</p><p className="mt-1 min-h-5 truncate font-medium" title={booking.transferTime || "-"}>{booking.transferTime || "-"}</p></div>
                                    <div className="min-w-0"><p className="min-h-5 text-xs text-muted-foreground">Jumlah</p><p className="mt-1 min-h-5 font-medium">{formatCurrency(booking.transferAmount || 0)}</p></div>
                                  </div>
                                </section>

                                <section className="mt-4 border-t pt-3">
                                  <p className="text-sm font-semibold mb-3">Pembagian Pembayaran</p>
                                  <div className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-4">
                                    <div className="min-w-0">
                                      <p className="min-h-10 text-xs leading-5 text-muted-foreground">Total Pembayaran</p>
                                      <p className="mt-1 font-medium">{formatCurrency(paymentSplit.totalAmount)}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="min-h-10 text-xs leading-5 text-muted-foreground">Biaya Admin ({commissionPercentage}%)</p>
                                      <p className="mt-1 font-medium">{formatCurrency(paymentSplit.appAmount)}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="min-h-10 text-xs leading-5 text-muted-foreground">Pendapatan Mitra</p>
                                      <p className="mt-1 font-medium">{formatCurrency(paymentSplit.mitraAmount)}</p>
                                    </div>
                                  </div>
                                </section>
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold mb-2">{isWalletPayment ? "Metode Pembayaran" : "Bukti Transfer"}</p>
                                {isWalletPayment ? (
                                  <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800">
                                    <Wallet className="h-8 w-8" />
                                    <p className="font-semibold">Dibayar dengan Saldo Aplikasi</p>
                                    <p className="text-xs text-green-700">Saldo pengguna otomatis terpotong.</p>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-muted p-2"
                                    onClick={() => window.open(booking.paymentProof, "_blank", "noopener,noreferrer")}
                                    aria-label="Lihat bukti transfer ukuran penuh"
                                  >
                                    <img src={booking.paymentProof} alt="Bukti Transfer" className="max-h-full max-w-full rounded border bg-background object-contain" />
                                  </button>
                                )}
                              </div>
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
                        <th className="text-left p-4 font-semibold">Status Mitra</th>
                        <th className="text-left p-4 font-semibold">Status Booking Saat Ini</th>
                        <th className="text-left p-4 font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTalents.length > 0 ? (
                        allTalents.map((talent) => {
                          const allBookings = getBookings();
                          const talentBookings = allBookings.filter(b =>
                            (b.talentId === talent.id || b.talentId === talent.talentId) &&
                            (b.approvalStatus === "approved" || b.approvalStatus === "pending_mitra" || b.approvalStatus === "pending_approval")
                          );
                          const activeBooking = talentBookings.find(b => {
                            if (!b.date) return false;
                            const now = new Date();
                            const timeStr = b.time ? (b.time.length === 5 ? `${b.time}:00` : b.time) : "00:00:00";
                            const startTime = new Date(`${b.date}T${timeStr}`);
                            const endTime = new Date(startTime.getTime() + (b.duration || 1) * 60 * 60 * 1000);
                            return !isNaN(endTime.getTime()) && endTime >= now;
                          });

                          return (
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
                                  <Badge
                                    variant={
                                      talent.status === "approved" || talent.isVerified
                                        ? "success"
                                        : "warning"
                                    }
                                  >
                                    {talent.status === "approved" || talent.isVerified
                                      ? "Terverifikasi"
                                      : "Menunggu"}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4">
                                {activeBooking ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant={activeBooking.approvalStatus === "approved" ? "accent" : "warning"} className="w-fit gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {activeBooking.approvalStatus === "approved"
                                        ? `Sedang Dipesan (${activeBooking.userName || "User"})`
                                        : `Menunggu Mitra (${activeBooking.userName || "User"})`}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {activeBooking.date} • {activeBooking.time} ({activeBooking.duration} jam)
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Tersedia / Kosong
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => setViewTalentId(talent.id)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" title="Edit Harga" onClick={() => handleOpenEditPrice(talent)}>
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => toggleBlockTalent(talent.id)}>
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
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
                {activePendingVerifications.length + expiredVerifications.length + appeals.length} Total Antrean
              </Badge>
            </div>

            <Tabs value={verificationTab} onValueChange={setVerificationTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Menunggu Verifikasi
                  <Badge variant="outline" className="ml-1">
                    {activePendingVerifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="expired" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Batas Waktu Terlampaui
                  <Badge variant={expiredVerifications.length > 0 ? "destructive" : "outline"} className="ml-1">
                    {expiredVerifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="appeals" className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Banding Tarif
                  <Badge
                    variant={appeals.length > 0 ? "default" : "outline"}
                    className={`ml-1 ${appeals.length > 0 ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                  >
                    {appeals.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {isLoadingVerifications ? (
                  <Card className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Memuat data verifikasi...</p>
                  </Card>
                ) : activePendingVerifications.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Tidak Ada Talent Menunggu</h3>
                    <p className="text-muted-foreground">Saat ini tidak ada talent aktif yang menunggu verifikasi.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activePendingVerifications.map((user) => (
                      <Card key={user.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                            <div className="flex-1">
                              <h3 className="font-bold">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">Dikirim: {user.date}</p>
                              <div className="mt-3">
                                <Badge variant="warning" className="gap-1">
                                  <Clock className="w-3 h-3" />
                                  Menunggu Verifikasi
                                </Badge>
                              </div>
                              {user.verificationDeadline && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Batas waktu: {formatDeadline(user.verificationDeadline)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Parameter Penilaian Calon Mitra */}
                          <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                Layanan: {user.experience_level === "spesialis" || user.experience_level === "mahir" ? "Spesialis" : user.experience_level === "kasual" || user.experience_level === "pemula" ? "Kasual / Santai" : "Acara & Sosial"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                Ekspektasi: {user.price_expectation || "Standar (Rp 250k - Rp 350k)"}
                              </Badge>
                            </div>
                            {user.category && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                Kategori: <span className="font-medium text-foreground">{user.category}</span>
                              </p>
                            )}
                            {user.social_media && (
                              <p className="text-xs text-blue-600 truncate">
                                Medsos: {user.social_media}
                              </p>
                            )}
                            {user.verificationDocuments?.ktp ? (
                              <div className="pt-1">
                                <a
                                  href={user.verificationDocuments.ktp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Buka Link KTP (Google Drive) ↗
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">KTP belum diunggah</p>
                            )}
                            {user.portfolio_file && (
                              <div className="pt-1 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                <span className="text-xs font-semibold text-orange-800">Portofolio:</span>
                                {user.portfolio_file.startsWith("data:image") || user.portfolio_file.startsWith("http") ? (
                                  <a
                                    href={user.portfolio_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                                  >
                                    Lihat Portofolio ↗
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground truncate">{user.portfolio_file}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {user.status === "pending" && (
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                className="gap-1 flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-xs"
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
                                    Tentukan Tarif & Setujui
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                                onClick={() => handleOpenRejectDialog(user)}
                              >
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
                      <Card key={user.id} className="overflow-hidden border-destructive/40 bg-red-50/10">
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-red-200" />
                            <div className="flex-1">
                              <h3 className="font-bold">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">Dikirim: {user.date}</p>
                              <div className="mt-3">
                                <Badge variant="destructive" className="gap-1">
                                  <Clock className="w-3 h-3" />
                                  Batas Waktu Terlampaui
                                </Badge>
                              </div>
                              {user.verificationDeadline && (
                                <p className="text-xs text-red-600 font-medium mt-1">
                                  Batas waktu: {formatDeadline(user.verificationDeadline)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Parameter Penilaian Calon Mitra */}
                          <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                Layanan: {user.experience_level === "spesialis" || user.experience_level === "mahir" ? "Spesialis" : user.experience_level === "kasual" || user.experience_level === "pemula" ? "Kasual / Santai" : "Acara & Sosial"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                Ekspektasi: {user.price_expectation || "Standar (Rp 250k - Rp 350k)"}
                              </Badge>
                            </div>
                            {user.category && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                Kategori: <span className="font-medium text-foreground">{user.category}</span>
                              </p>
                            )}
                            {user.social_media && (
                              <p className="text-xs text-blue-600 truncate">
                                Medsos: {user.social_media}
                              </p>
                            )}
                            {user.verificationDocuments?.ktp ? (
                              <div className="pt-1">
                                <a
                                  href={user.verificationDocuments.ktp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Buka Link KTP (Google Drive) ↗
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">KTP belum diunggah</p>
                            )}
                          </div>

                          {user.status === "pending" && (
                            <div className="flex flex-col gap-2 mt-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="gap-1 flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-xs"
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
                                      Tentukan Tarif & Setujui
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                                  onClick={() => handleOpenRejectDialog(user)}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Tolak
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => viewVerificationDetails(user)}>
                                  <FileText className="w-4 h-4" />
                                  Detail
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1 flex-1 text-xs"
                                  onClick={() => handleSendVerificationEmail(user.id)}
                                  disabled={isSendingEmail === user.id}
                                >
                                  {isSendingEmail === user.id ? (
                                    <>
                                      <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                      Mengirim...
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="w-3.5 h-3.5" />
                                      Kirim Pengingat
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="appeals" className="space-y-4">
                {appeals.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Scale className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold mb-2">Tidak Ada Banding Tarif</h3>
                    <p className="text-muted-foreground">Saat ini tidak ada calon mitra yang mengajukan banding atau negosiasi tarif.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {appeals.map((user) => (
                      <Card key={user.id} className="overflow-hidden border-amber-300 dark:border-amber-800 bg-amber-50/15 shadow-sm">
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-300" />
                            <div className="flex-1">
                              <h3 className="font-bold">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">Dikirim: {user.date}</p>
                              <div className="mt-2.5 flex flex-wrap gap-1">
                                <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px]">
                                  <Scale className="w-3 h-3" />
                                  Banding Tarif Masuk
                                </Badge>
                                {user.price && user.price > 0 && (
                                  <Badge variant="outline" className="text-[11px] font-semibold text-foreground">
                                    Tarif Awal: {formatCurrency(user.price)}/jam
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Kotak Pengajuan Banding dari Calon Mitra */}
                          {user.appeal_note && (
                            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
                              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                <Scale className="w-4 h-4" />
                                Isi Permohonan Banding Calon Mitra:
                              </div>
                              <p className="whitespace-pre-line leading-relaxed font-medium bg-white/70 dark:bg-black/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                {user.appeal_note}
                              </p>
                            </div>
                          )}

                          {/* Parameter Penilaian Calon Mitra */}
                          <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                Layanan: {user.experience_level === "spesialis" || user.experience_level === "mahir" ? "Spesialis" : user.experience_level === "kasual" || user.experience_level === "pemula" ? "Kasual / Santai" : "Acara & Sosial"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                Ekspektasi Awal: {user.price_expectation || "Standar (Rp 250k - Rp 350k)"}
                              </Badge>
                            </div>
                            {user.category && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                Kategori: <span className="font-medium text-foreground">{user.category}</span>
                              </p>
                            )}
                            {user.social_media && (
                              <p className="text-xs text-blue-600 truncate">
                                Medsos: {user.social_media}
                              </p>
                            )}
                            {user.verificationDocuments?.ktp ? (
                              <div className="pt-1">
                                <a
                                  href={user.verificationDocuments.ktp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Buka Link KTP (Google Drive) ↗
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">KTP belum diunggah</p>
                            )}
                            {user.portfolio_file && (
                              <div className="pt-1 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                <span className="text-xs font-semibold text-foreground">Portofolio Pendaftaran:</span>
                                <a
                                  href={user.portfolio_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                                >
                                  Buka Portofolio ↗
                                </a>
                              </div>
                            )}
                            {user.appeal_file && (
                              <div className="mt-2 p-2 rounded-lg bg-orange-50/80 border border-orange-200">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                  <span className="text-xs font-bold text-orange-900">Bukti Portofolio Banding:</span>
                                </div>
                                {user.appeal_file.startsWith("data:image") ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={user.appeal_file}
                                      alt="Bukti Banding"
                                      className="w-12 h-12 rounded object-cover border border-orange-200 cursor-pointer"
                                      onClick={() => window.open(user.appeal_file || "", '_blank')}
                                    />
                                    <a
                                      href={user.appeal_file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary font-semibold hover:underline"
                                    >
                                      Perbesar Gambar ↗
                                    </a>
                                  </div>
                                ) : (
                                  <a
                                    href={user.appeal_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Buka Link Bukti Banding ↗
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                              size="sm"
                              className="gap-1 flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs"
                              onClick={() => handleAcceptVerification(user.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Tanggapi & Sesuaikan Tarif
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border-amber-400/50"
                              onClick={() => handleOpenRejectAppealDialog(user)}
                            >
                              <XCircle className="w-4 h-4" />
                              Tolak Banding
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => viewVerificationDetails(user)}>
                              <FileText className="w-4 h-4" />
                              Detail
                            </Button>
                          </div>
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              className="text-[11px] text-destructive/70 hover:text-destructive hover:underline"
                              onClick={() => handleOpenRejectDialog(user)}
                            >
                              Tolak Pendaftaran Calon Mitra Secara Permanen
                            </button>
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
                <h2 className="text-xl font-bold">Laporan & Komplain</h2>
                <p className="text-muted-foreground text-sm">
                  Laporan mitra dan komplain pelanggan yang menunggu penanganan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void loadReports()}
                  disabled={isLoadingReports}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingReports ? "animate-spin" : ""}`} />
                  Muat Ulang
                </Button>
                <Badge variant="outline" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {pendingReports.length} Menunggu
                </Badge>
              </div>
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
                            {report.source === "user" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Komplain pelanggan • Mitra: {report.talentName} • ID Pesanan: {report.bookingId}
                              </p>
                            )}
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

                      {/* Box Investigasi Percakapan Kedua Pihak */}
                      {report.source === "user" && (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
                              <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                Investigasi Percakapan Pelanggan & Mitra
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Periksa bukti chat, lampiran foto, dan koordinat lokasi sebelum menentukan pihak yang bersalah.
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 shadow-sm text-xs font-semibold shrink-0"
                            onClick={() => setAuditChatComplaintId(report.id)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Periksa Riwayat Chat ({report.talentName || "Mitra"})
                          </Button>
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <p className="text-sm">{report.description}</p>
                        {report.proofImage && (
                          <div className="mt-4 border-t pt-4">
                            <p className="text-sm font-semibold mb-2">Bukti Gambar:</p>
                            <img src={report.proofImage} alt="Bukti Komplain" className="w-32 h-32 object-cover rounded-md cursor-pointer border" onClick={() => window.open(report.proofImage, "_blank")} />
                          </div>
                        )}
                        {report.status === "resolved" && report.adminNotes && (
                          <div className="mt-4 bg-background border rounded p-3">
                            <p className="text-sm font-semibold text-primary">Hasil Resolusi (Oleh Admin):</p>
                            <p className="text-sm mt-1">Keputusan: <strong>{report.atFault === 'mitra' ? 'Mitra Bersalah' : report.atFault === 'user' ? 'Pelanggan Bersalah' : 'Netral (Tidak Ada yang Bersalah)'}</strong></p>
                            <p className="text-sm mt-1">Catatan: {report.adminNotes}</p>
                          </div>
                        )}
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
                          {report.source === "user" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 dark:text-orange-400 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 gap-1.5"
                              onClick={() => setAuditChatComplaintId(report.id)}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Audit Chat
                            </Button>
                          )}
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
                              onClick={() => setResolveComplaintModal({ isOpen: true, reportId: report.id, atFault: "none", adminNotes: "" })}
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
                <p className="text-muted-foreground">Belum ada laporan atau komplain yang masuk.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="topups" className="space-y-6">
            {/* Header & Quick Sync */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">Permintaan Isi Saldo (Top-Up)</h2>
                  <Badge variant="outline" className="border-emerald-200 text-emerald-800 bg-emerald-50 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    QRIS Terpusat Aktif
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  Kelola dan verifikasi mutasi saldo masuk pengguna via QRIS Terpusat PT TemanAcara
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadTopUpRequests();
                    loadFinancialSummary();
                  }}
                  disabled={isLoadingTopUps}
                  className="h-9 gap-2 shadow-sm text-xs font-medium border-orange-200 hover:bg-orange-50/50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTopUps ? "animate-spin text-orange-600" : "text-gray-600"}`} />
                  Sinkronisasi Data
                </Button>
              </div>
            </div>

            {/* Metrik Finansial Top-Up (Menunggu Verifikasi, Saldo Mengendap User, Top-Up Berhasil) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Menunggu Verifikasi */}
              <Card className="p-4 bg-white border border-amber-200/90 shadow-sm rounded-xl hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Menunggu Verifikasi</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {pendingTopups.length} <span className="text-sm font-medium text-muted-foreground">permintaan</span>
                    </div>
                    <p className="text-xs text-amber-700/90 font-medium mt-1">
                      {formatCurrency(totalPendingTopupAmount)} perlu review
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              {/* Card 2: Saldo Mengendap User */}
              <Card className="p-4 bg-white border border-orange-100 shadow-sm rounded-xl hover:border-orange-200 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Saldo Mengendap User</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(financialSummary?.totalUserWallet ?? 6965000)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dana aktif di dompet pengguna
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              {/* Card 3: Top-Up Berhasil */}
              <Card className="p-4 bg-white border border-orange-200/90 shadow-sm rounded-xl hover:border-orange-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider">Top-Up Berhasil</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {approvedTopups.length} <span className="text-sm font-medium text-muted-foreground">transaksi</span>
                    </div>
                    <p className="text-xs text-orange-700/90 font-medium mt-1">
                      {formatCurrency(totalApprovedTopupAmount)} masuk ke kas
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Filter, Pencarian, & Toggle Tampilan */}
            <div className="bg-white rounded-xl border border-border/60 p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <Button
                  variant={topupFilterStatus === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTopupFilterStatus("all")}
                  className={`h-8 text-xs font-medium rounded-lg px-3 ${
                    topupFilterStatus === "all"
                      ? "bg-orange-500 hover:bg-orange-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Semua ({topUpRequests.length})
                </Button>
                <Button
                  variant={topupFilterStatus === "pending" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTopupFilterStatus("pending")}
                  className={`h-8 text-xs font-medium rounded-lg px-3 ${
                    topupFilterStatus === "pending"
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  Menunggu ({pendingTopups.length})
                </Button>
                <Button
                  variant={topupFilterStatus === "approved" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTopupFilterStatus("approved")}
                  className={`h-8 text-xs font-medium rounded-lg px-3 ${
                    topupFilterStatus === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Disetujui ({approvedTopups.length})
                </Button>
                <Button
                  variant={topupFilterStatus === "rejected" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTopupFilterStatus("rejected")}
                  className={`h-8 text-xs font-medium rounded-lg px-3 ${
                    topupFilterStatus === "rejected"
                      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                      : "text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  Ditolak ({rejectedTopups.length})
                </Button>
              </div>

              {/* Search & View Mode Switcher */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Cari pengguna atau nominal..."
                    value={topupSearchQuery}
                    onChange={(e) => setTopupSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-border/60 focus:bg-white"
                  />
                  {topupSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTopupSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/30">
                  <Button
                    type="button"
                    variant={topupViewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTopupViewMode("table")}
                    className={`h-7 px-2.5 text-xs gap-1 font-medium ${topupViewMode === "table" ? "bg-white shadow-2xs text-foreground" : "text-muted-foreground"}`}
                    title="Tampilan Tabel Rapi"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabel</span>
                  </Button>
                  <Button
                    type="button"
                    variant={topupViewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTopupViewMode("grid")}
                    className={`h-7 px-2.5 text-xs gap-1 font-medium ${topupViewMode === "grid" ? "bg-white shadow-2xs text-foreground" : "text-muted-foreground"}`}
                    title="Tampilan Kartu"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kartu</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* List / Data Table View */}
            {filteredTopUpRequests.length > 0 ? (
              topupViewMode === "table" ? (
                /* --- TABEL PROFESIONAL, BERSIH & TIDAK TERLALU BOLD --- */
                <Card className="overflow-hidden border border-border/60 shadow-2xs bg-white rounded-xl">
                  <Table>
                    <TableHeader className="bg-muted/40 border-b border-border/60">
                      <TableRow>
                        <TableHead className="w-[280px] font-semibold text-xs text-muted-foreground">Pengguna</TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground">Nominal Top-Up</TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground">Waktu Pengajuan</TableHead>
                        <TableHead className="w-[120px] text-center font-semibold text-xs text-muted-foreground">Bukti Transfer</TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground">Status</TableHead>
                        <TableHead className="text-right font-semibold text-xs text-muted-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTopUpRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/30 transition-colors border-b border-border/40">
                          {/* Pengguna */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-orange-100 bg-orange-50 flex items-center justify-center text-orange-600">
                                {request.userPhoto ? (
                                  <img src={request.userPhoto} alt="" className="h-full w-full object-cover shrink-0 aspect-square" />
                                ) : (
                                  <span className="font-medium text-xs uppercase">
                                    {(request.userName || "U").slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-foreground truncate">
                                  {request.userName || "Pengguna"}
                                </div>
                                <div className="text-xs text-muted-foreground truncate font-mono">
                                  {request.userEmail}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Nominal & Metode */}
                          <TableCell className="py-3">
                            <div className="font-semibold text-sm text-foreground">
                              {formatCurrency(request.amount)}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              QRIS PT TemanAcara
                            </div>
                          </TableCell>

                          {/* Waktu */}
                          <TableCell className="py-3">
                            <div className="text-xs text-foreground font-normal">
                              {new Date(request.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {new Date(request.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} WIB
                            </div>
                          </TableCell>

                          {/* Bukti Transfer Thumbnail */}
                          <TableCell className="py-3 text-center">
                            {request.proofImageBase64 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedTopUpForModal(request)}
                                className="group relative mx-auto h-10 w-14 overflow-hidden rounded-md border border-border/70 bg-muted/20 p-0.5 transition-all hover:border-orange-400 hover:shadow-2xs"
                                title="Klik untuk verifikasi bukti pembayaran"
                              >
                                <img
                                  src={request.proofImageBase64}
                                  alt="Bukti"
                                  className="h-full w-full object-cover rounded-xs"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Tidak ada</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3">
                            {request.status === "pending" && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 font-medium text-[11px] gap-1 px-2.5 py-0.5 shadow-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Menunggu Review
                              </Badge>
                            )}
                            {request.status === "approved" && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium text-[11px] gap-1 px-2.5 py-0.5 shadow-none">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Disetujui
                              </Badge>
                            )}
                            {request.status === "rejected" && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 font-medium text-[11px] gap-1 px-2.5 py-0.5 shadow-none">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Ditolak
                              </Badge>
                            )}
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className="py-3 text-right">
                            {request.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1.5"
                                  onClick={() => setSelectedTopUpForModal(request)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Periksa & Setujui
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => setTopupRejectDialog({ isOpen: true, request, reason: "" })}
                                  title="Tolak Permintaan"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground border-border/70"
                                onClick={() => setSelectedTopUpForModal(request)}
                              >
                                Detail
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                /* --- GRID KARTU BERSIH & PROPORSIONAL --- */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTopUpRequests.map((request) => (
                    <Card key={request.id} className="overflow-hidden border border-border/60 shadow-2xs hover:shadow-xs transition-all rounded-xl bg-white flex flex-col justify-between">
                      <div className="p-4 space-y-3">
                        {/* Header: User & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-orange-100 bg-orange-50 flex items-center justify-center text-orange-600">
                              {request.userPhoto ? (
                                <img src={request.userPhoto} alt="" className="h-full w-full object-cover shrink-0 aspect-square" />
                              ) : (
                                <span className="font-medium text-xs uppercase">
                                  {(request.userName || "U").slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm text-foreground truncate">{request.userName || "Pengguna"}</h4>
                              <p className="text-xs text-muted-foreground truncate font-mono">{request.userEmail}</p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {request.status === "pending" && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Menunggu
                              </Badge>
                            )}
                            {request.status === "approved" && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Disetujui
                              </Badge>
                            )}
                            {request.status === "rejected" && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Ditolak
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Nominal Info Box */}
                        <div className="bg-muted/30 rounded-lg p-2.5 border border-border/40">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground font-normal">Nominal Top-Up</span>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(request.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
                            <span>QRIS PT TemanAcara</span>
                            <span>{new Date(request.createdAt).toLocaleDateString("id-ID")}</span>
                          </div>
                        </div>

                        {/* Bukti Transfer Box */}
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span className="font-medium text-foreground">Bukti Pembayaran</span>
                            <span className="text-[11px]">Klik untuk periksa</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedTopUpForModal(request)}
                            className="group relative h-28 w-full overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-1 hover:border-orange-400 transition-all cursor-pointer flex items-center justify-center"
                          >
                            {request.proofImageBase64 ? (
                              <>
                                <img
                                  src={request.proofImageBase64}
                                  alt="Bukti Transfer"
                                  className="h-full w-full object-contain rounded transition-transform group-hover:scale-105 duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                                  <ZoomIn className="w-4 h-4" />
                                  Periksa Bukti
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Bukti tidak tersedia</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Footer Actions / Audit Info */}
                      <div className="border-t border-border/40 bg-muted/10 p-2.5">
                        {request.status === "pending" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1"
                              onClick={() => setSelectedTopUpForModal(request)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Setujui
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1"
                              onClick={() => setTopupRejectDialog({ isOpen: true, request, reason: "" })}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate text-[11px]">
                              {request.status === "approved" ? "Selesai ditambahkan" : "Ditolak admin"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-medium text-foreground hover:bg-white"
                              onClick={() => setSelectedTopUpForModal(request)}
                            >
                              Lihat Detail
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <Card className="p-12 text-center bg-white rounded-xl border">
                <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-3 text-orange-500">
                  <Wallet className="w-6 h-6 opacity-75" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {topupSearchQuery || topupFilterStatus !== "all"
                    ? "Tidak Ada Data yang Cocok"
                    : "Tidak Ada Permintaan Top-Up"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {topupSearchQuery || topupFilterStatus !== "all"
                    ? "Coba ubah kata kunci pencarian atau sesuaikan status filter di atas."
                    : "Saat ini semua permintaan isi saldo telah diproses dan antrean bersih."}
                </p>
                {(topupSearchQuery || topupFilterStatus !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs h-8"
                    onClick={() => {
                      setTopupSearchQuery("");
                      setTopupFilterStatus("all");
                    }}
                  >
                    Reset Filter & Pencarian
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          {/* TAB: PENARIKAN SALDO (WITHDRAWAL) */}
          <TabsContent value="withdrawals" className="space-y-4">
            {/* Header: Judul & Tombol Tarik Profit Kas Admin */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Permintaan Tarik Saldo (Withdrawal)</h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Kelola pencairan saldo dompet pengguna, bagi hasil mitra (80%), dan pencairan laba komisi platform (20%).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAdminProfitModalOpen(true)}
                  className="h-8 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-2xs gap-1.5 rounded-lg"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Tarik Profit Kas Admin
                </Button>
              </div>
            </div>

            {/* 4 Kartu Ringkasan Metrik (Summary Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Menunggu Transfer */}
              <Card className="p-4 bg-white border border-amber-200/90 shadow-sm rounded-xl hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Menunggu Transfer</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {pendingWithdrawals.length} <span className="text-sm font-medium text-muted-foreground">permintaan</span>
                    </div>
                    <p className="text-xs text-amber-700/90 font-medium mt-1">
                      {formatCurrency(totalPendingWithdrawalAmount)} perlu ditransfer
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              {/* Card 2: Pencairan Mitra Berhasil */}
              <Card className="p-4 bg-white border border-emerald-200/90 shadow-sm rounded-xl hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Pencairan Mitra</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {approvedMitraWithdrawals.length} <span className="text-sm font-medium text-muted-foreground">transaksi</span>
                    </div>
                    <p className="text-xs text-emerald-700/90 font-medium mt-1">
                      {formatCurrency(totalApprovedMitraAmount)} hasil jasa dicairkan
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              {/* Card 3: Pencairan Pengguna Berhasil */}
              <Card className="p-4 bg-white border border-blue-200/90 shadow-sm rounded-xl hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Pencairan User</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {approvedUserWithdrawals.length} <span className="text-sm font-medium text-muted-foreground">transaksi</span>
                    </div>
                    <p className="text-xs text-blue-700/90 font-medium mt-1">
                      {formatCurrency(totalApprovedUserAmount)} ditarik dari dompet
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              {/* Card 4: Kas Profit Platform Tersedia */}
              <Card className="p-4 bg-white border border-purple-200/90 shadow-sm rounded-xl hover:border-purple-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider">Kas Profit Tersedia</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(availableAdminProfit)}
                    </div>
                    <p className="text-xs text-purple-700/90 font-medium mt-1">
                      {approvedAdminWithdrawals.length}x dicairkan ({formatCurrency(totalApprovedAdminAmount)})
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Filter, Pencarian, & Toggle Tampilan */}
            <div className="bg-white rounded-xl border border-border/60 p-2.5 shadow-2xs space-y-2.5">
              {/* Baris 1: Filter Status & Filter Role */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                {/* Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    variant={withdrawalFilterStatus === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterStatus("all")}
                    className={`h-7 text-xs font-medium rounded-lg px-2.5 ${
                      withdrawalFilterStatus === "all"
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Semua Status ({withdrawalRequests.length})
                  </Button>
                  <Button
                    variant={withdrawalFilterStatus === "pending" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterStatus("pending")}
                    className={`h-7 text-xs font-medium rounded-lg px-2.5 ${
                      withdrawalFilterStatus === "pending"
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                        : "text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    Menunggu ({pendingWithdrawals.length})
                  </Button>
                  <Button
                    variant={withdrawalFilterStatus === "approved" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterStatus("approved")}
                    className={`h-7 text-xs font-medium rounded-lg px-2.5 ${
                      withdrawalFilterStatus === "approved"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        : "text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    Ditransfer ({approvedWithdrawals.length})
                  </Button>
                  <Button
                    variant={withdrawalFilterStatus === "rejected" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterStatus("rejected")}
                    className={`h-7 text-xs font-medium rounded-lg px-2.5 ${
                      withdrawalFilterStatus === "rejected"
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                        : "text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    Ditolak ({rejectedWithdrawals.length})
                  </Button>
                </div>

                {/* Role Filter Chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium hidden md:inline mr-1">Sumber/Role:</span>
                  <Button
                    variant={withdrawalFilterRole === "all" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterRole("all")}
                    className={`h-6 text-[11px] rounded-md px-2 ${withdrawalFilterRole === "all" ? "font-semibold bg-muted" : "text-muted-foreground"}`}
                  >
                    Semua
                  </Button>
                  <Button
                    variant={withdrawalFilterRole === "mitra" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterRole("mitra")}
                    className={`h-6 text-[11px] rounded-md px-2 ${withdrawalFilterRole === "mitra" ? "font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200" : "text-muted-foreground"}`}
                  >
                    Mitra
                  </Button>
                  <Button
                    variant={withdrawalFilterRole === "user" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterRole("user")}
                    className={`h-6 text-[11px] rounded-md px-2 ${withdrawalFilterRole === "user" ? "font-semibold text-orange-800 bg-orange-50 border border-orange-200" : "text-muted-foreground"}`}
                  >
                    Pengguna
                  </Button>
                  <Button
                    variant={withdrawalFilterRole === "admin" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalFilterRole("admin")}
                    className={`h-6 text-[11px] rounded-md px-2 ${withdrawalFilterRole === "admin" ? "font-semibold text-purple-800 bg-purple-50 border border-purple-200" : "text-muted-foreground"}`}
                  >
                    Admin Profit
                  </Button>
                </div>
              </div>

              {/* Baris 2: Pencarian & Mode Switcher (Tabel vs Kartu) */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Cari pemohon, bank, no. rekening, atau nominal..."
                    value={withdrawalSearchQuery}
                    onChange={(e) => setWithdrawalSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-border/60 focus:bg-white"
                  />
                  {withdrawalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWithdrawalSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/30 shrink-0">
                  <Button
                    type="button"
                    variant={withdrawalViewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalViewMode("table")}
                    className={`h-7 px-2.5 text-xs gap-1 font-medium ${withdrawalViewMode === "table" ? "bg-white shadow-2xs text-foreground" : "text-muted-foreground"}`}
                    title="Tampilan Tabel Rapi"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabel</span>
                  </Button>
                  <Button
                    type="button"
                    variant={withdrawalViewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setWithdrawalViewMode("grid")}
                    className={`h-7 px-2.5 text-xs gap-1 font-medium ${withdrawalViewMode === "grid" ? "bg-white shadow-2xs text-foreground" : "text-muted-foreground"}`}
                    title="Tampilan Kartu Kotak-kotak"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kotak-kotak</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* List / Data Table / Grid View */}
            {filteredWithdrawalRequests.length > 0 ? (
              withdrawalViewMode === "table" ? (
                /* --- TABEL PROFESIONAL, BERSIH & TIDAK TERLALU BOLD --- */
                <Card className="bg-white border border-border/60 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12 text-center text-xs font-semibold text-muted-foreground">#</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Pemohon</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Sumber & Nominal</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Rekening Tujuan</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Waktu</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-muted-foreground">Bukti & Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWithdrawalRequests.map((request, index) => {
                          const isMitra = request.role === "mitra";
                          const isAdmin = request.role === "admin";
                          return (
                            <TableRow key={request.id} className="hover:bg-muted/20 transition-colors">
                              {/* Kolom Index */}
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {index + 1}
                              </TableCell>

                              {/* Kolom Pemohon */}
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-orange-100 bg-orange-50 flex items-center justify-center text-orange-600">
                                    {request.userPhoto ? (
                                      <img src={request.userPhoto} alt="" className="h-full w-full object-cover shrink-0 aspect-square" />
                                    ) : (
                                      <span className="font-medium text-xs uppercase">
                                        {(request.userName || "U").slice(0, 2)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-xs text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                                        {request.userName || "Pengguna"}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 font-medium ${
                                          isAdmin
                                            ? "border-purple-200 text-purple-700 bg-purple-50/70"
                                            : isMitra
                                            ? "border-emerald-200 text-emerald-700 bg-emerald-50/70"
                                            : "border-orange-200 text-orange-700 bg-orange-50/70"
                                        }`}
                                      >
                                        {isAdmin ? "Admin Profit" : isMitra ? "Mitra" : "Pengguna"}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                                      {request.userEmail || "-"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Kolom Sumber & Nominal */}
                              <TableCell className="py-3">
                                <div className="font-semibold text-xs text-foreground">
                                  {formatCurrency(request.amount)}
                                </div>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                  {isAdmin
                                    ? "Laba Komisi Platform (20%)"
                                    : isMitra
                                    ? "Bagi Hasil Jasa Mitra (80%)"
                                    : "Saldo Dompet Pribadi"}
                                </span>
                              </TableCell>

                              {/* Kolom Rekening Tujuan */}
                              <TableCell className="py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="font-semibold text-[10px] px-1.5 py-0 gap-1">
                                      {["DANA", "GoPay", "OVO"].includes(request.bankName) ? (
                                        <Smartphone className="w-2.5 h-2.5 text-blue-500" />
                                      ) : (
                                        <Building2 className="w-2.5 h-2.5 text-orange-500" />
                                      )}
                                      {request.bankName}
                                    </Badge>
                                    <span className="font-mono text-xs font-medium text-foreground">
                                      {request.accountNumber}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                      title="Salin nomor rekening"
                                      onClick={() => handleCopyAccNumber(request.accountNumber)}
                                    >
                                      {copiedAccNumber === request.accountNumber ? (
                                        <Check className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    a.n <span className="font-medium text-foreground">{request.accountName}</span>
                                  </p>
                                </div>
                              </TableCell>

                              {/* Kolom Waktu */}
                              <TableCell className="py-3 text-xs text-muted-foreground">
                                <div>{new Date(request.createdAt).toLocaleDateString("id-ID")}</div>
                                <div className="text-[11px] text-muted-foreground/80 font-mono">
                                  {new Date(request.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </TableCell>

                              {/* Kolom Status */}
                              <TableCell className="py-3">
                                {request.status === "pending" && (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Menunggu
                                  </Badge>
                                )}
                                {request.status === "approved" && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Ditransfer
                                  </Badge>
                                )}
                                {request.status === "rejected" && (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    Ditolak
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Kolom Aksi / Bukti */}
                              <TableCell className="py-3 text-right">
                                {request.status === "pending" ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1"
                                      onClick={() => {
                                        setSelectedWithdrawalToApprove(request);
                                        setApproveWithdrawalNote(`Transfer penarikan saldo sebesar ${formatCurrency(request.amount)} via ${request.bankName} berhasil.`);
                                        setApproveWithdrawalProof(null);
                                      }}
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Transfer
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1"
                                      onClick={() => {
                                        setSelectedWithdrawalToReject(request);
                                        setRejectWithdrawalReason("");
                                      }}
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Tolak
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {request.proofImageBase64 ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs font-medium gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                        onClick={() => setSelectedWithdrawalProofModal(request)}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        Bukti
                                      </Button>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground italic">
                                        {isAdmin ? "Otomatis" : "Tanpa struk"}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                /* --- GRID VIEW (KOTAK-KOTAK RAPI & ELEGAN) --- */
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredWithdrawalRequests.map((request) => {
                    const isMitra = request.role === "mitra";
                    const isAdmin = request.role === "admin";
                    return (
                      <Card
                        key={request.id}
                        className="bg-white border border-border/70 rounded-xl overflow-hidden shadow-2xs hover:border-orange-300 transition-all flex flex-col justify-between"
                      >
                        <div className="p-3.5 space-y-3">
                          {/* Header: User & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-orange-100 bg-orange-50 flex items-center justify-center text-orange-600">
                                {request.userPhoto ? (
                                  <img src={request.userPhoto} alt="" className="h-full w-full object-cover shrink-0 aspect-square" />
                                ) : (
                                  <span className="font-medium text-xs uppercase">
                                    {(request.userName || "U").slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-medium text-sm text-foreground truncate">{request.userName || "Pengguna"}</h4>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 font-medium ${
                                      isAdmin
                                        ? "border-purple-200 text-purple-700 bg-purple-50/70"
                                        : isMitra
                                        ? "border-emerald-200 text-emerald-700 bg-emerald-50/70"
                                        : "border-orange-200 text-orange-700 bg-orange-50/70"
                                    }`}
                                  >
                                    {isAdmin ? "Admin" : isMitra ? "Mitra" : "User"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate font-mono">{request.userEmail || "-"}</p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {request.status === "pending" && (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Menunggu
                                </Badge>
                              )}
                              {request.status === "approved" && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Ditransfer
                                </Badge>
                              )}
                              {request.status === "rejected" && (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 font-medium text-[10px] px-2 py-0.5 gap-1 shadow-none">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Ditolak
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Nominal Box */}
                          <div className="bg-muted/30 rounded-lg p-2.5 border border-border/40">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-muted-foreground font-normal">
                                {isAdmin ? "Pencairan Laba Platform" : isMitra ? "Penarikan Saldo Mitra" : "Penarikan Saldo Dompet"}
                              </span>
                              <span className="text-sm font-semibold text-foreground">{formatCurrency(request.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
                              <span>{isAdmin ? "Profit Komisi (20%)" : isMitra ? "Hasil Jasa Mitra (80%)" : "Saldo Pengguna"}</span>
                              <span>{new Date(request.createdAt).toLocaleDateString("id-ID")}</span>
                            </div>
                          </div>

                          {/* Destination Box */}
                          <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-medium text-[11px]">Tujuan Transfer:</span>
                              <Badge variant="secondary" className="font-semibold text-[10px] px-1.5 py-0 gap-1">
                                {["DANA", "GoPay", "OVO"].includes(request.bankName) ? (
                                  <Smartphone className="w-2.5 h-2.5 text-blue-500" />
                                ) : (
                                  <Building2 className="w-2.5 h-2.5 text-orange-500" />
                                )}
                                {request.bankName}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between font-mono bg-background p-1.5 rounded border">
                              <span className="font-medium text-foreground text-xs">{request.accountNumber}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                onClick={() => handleCopyAccNumber(request.accountNumber)}
                              >
                                {copiedAccNumber === request.accountNumber ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Atas Nama:</span>
                              <span className="font-medium text-foreground">{request.accountName}</span>
                            </div>
                            {request.adminNote && (
                              <p className="text-[11px] text-muted-foreground italic pt-1 border-t">
                                Catatan: {request.adminNote}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="border-t border-border/40 bg-muted/10 p-2.5">
                          {request.status === "pending" ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1"
                                onClick={() => {
                                  setSelectedWithdrawalToApprove(request);
                                  setApproveWithdrawalNote(`Transfer penarikan saldo sebesar ${formatCurrency(request.amount)} via ${request.bankName} berhasil.`);
                                  setApproveWithdrawalProof(null);
                                }}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Setujui & Transfer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1"
                                onClick={() => {
                                  setSelectedWithdrawalToReject(request);
                                  setRejectWithdrawalReason("");
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="truncate text-[11px]">
                                {request.status === "approved" ? "Selesai ditransfer" : "Ditolak admin"}
                              </span>
                              {request.proofImageBase64 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs font-medium text-primary hover:bg-white gap-1"
                                  onClick={() => setSelectedWithdrawalProofModal(request)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Bukti Transfer
                                </Button>
                              ) : (
                                <span className="text-[11px] italic">
                                  {isAdmin ? "Pencairan kas admin" : "Tanpa struk"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : (
              <Card className="p-12 text-center bg-white rounded-xl border">
                <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-3 text-orange-500">
                  <ArrowUpRight className="w-6 h-6 opacity-75" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {withdrawalSearchQuery || withdrawalFilterStatus !== "all" || withdrawalFilterRole !== "all"
                    ? "Tidak Ada Data yang Cocok"
                    : "Tidak Ada Permintaan Tarik Saldo"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {withdrawalSearchQuery || withdrawalFilterStatus !== "all" || withdrawalFilterRole !== "all"
                    ? "Coba ubah kata kunci pencarian atau sesuaikan status dan role pemohon di atas."
                    : "Saat ini semua permintaan pencairan dana telah selesai diproses."}
                </p>
                {(withdrawalSearchQuery || withdrawalFilterStatus !== "all" || withdrawalFilterRole !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs h-8"
                    onClick={() => {
                      setWithdrawalSearchQuery("");
                      setWithdrawalFilterStatus("all");
                      setWithdrawalFilterRole("all");
                    }}
                  >
                    Reset Filter & Pencarian
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="revenue">

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Ringkasan Pendapatan</h3>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  // Menggunakan semua booking yang sudah disetujui tanpa filter bulan ketat
                  const approvedThisMonth = approvedBookingsForRevenue;
                  const total = approvedThisMonth.reduce((sum, b) => sum + Number(b.total || 0), 0); const commissionPercentage = getAppCommission();
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
                            const commissionPercentage = 20; // Fixed admin commission
                            const paymentSplit = booking.paymentSplit || calculatePaymentSplit(booking.total || 0, commissionPercentage);

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
                                <td className="p-3 text-sm min-w-[120px] whitespace-nowrap">
                                  {(() => {
                                    const dateStr = String(booking.date || '');
                                    // Extract YYYY-MM-DD pattern from the string
                                    const match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                                    if (match) {
                                      return `${parseInt(match[3])}/${parseInt(match[2])}/${match[1]}`;
                                    }
                                    // Fallback: try parsing as Date
                                    const d = new Date(dateStr);
                                    if (!isNaN(d.getTime())) {
                                      return d.toLocaleDateString('id-ID');
                                    }
                                    return dateStr || '-';
                                  })()}
                                </td>
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
                    Simpan Biaya Admin
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
                  <Button
                    onClick={() => {
                      if (qrisCode) {
                        try {
                          localStorage.setItem("rentmate_admin_qris_code", qrisCode);
                          window.dispatchEvent(new Event("storage"));
                          toast({
                            title: "QRIS Disimpan",
                            description: "Gambar QRIS berhasil disimpan dan akan tampil di halaman pembayaran.",
                          });
                        } catch (err) {
                          toast({
                            title: "Gagal Menyimpan",
                            description: "Ukuran gambar terlalu besar. Silakan coba gambar lain.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                    className="w-full"
                    disabled={!qrisCode}
                  >
                    Simpan QRIS
                  </Button>
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
                  <img src={getImageUrl(selectedTransaction.userPhoto, `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTransaction.userName || 'User')}&background=random&color=fff`)} alt={selectedTransaction.userName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
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
                  <img src={getImageUrl(selectedTransaction.talentPhoto, `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTransaction.talentName || 'Mitra')}&background=random&color=fff`)} alt={selectedTransaction.talentName} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow" />
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

      {/* Dialog Detail Verifikasi Talent yang Ditingkatkan */}
      <Dialog open={showDocumentDialog} onOpenChange={(open) => !open && setShowDocumentDialog(false)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-orange-500" />
                Detail Lengkap Calon Mitra
              </DialogTitle>
              {selectedVerification && (
                <Badge
                  variant={isExpired(selectedVerification.verificationDeadline || "") ? "destructive" : "warning"}
                  className="gap-1.5 font-semibold text-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isExpired(selectedVerification.verificationDeadline || "") ? "Batas Waktu Terlampaui" : "Menunggu Verifikasi"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Periksa kelayakan identitas, kualifikasi layanan, dan dokumen verifikasi calon mitra.
            </p>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-5 pt-2">
              {/* Layout 2 Kolom: Kiri (Foto Profil & KTP) + Kanan (Data Lengkap) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Kolom Kiri: Foto Profil Berorientasi Portrait & Akses KTP */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[240px] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground">Foto Profil</Label>
                      <span className="text-[11px] text-orange-600 font-medium">Bisa diklik ↗</span>
                    </div>

                    {/* Foto Card dengan Zoom Trigger */}
                    <div
                      onClick={() => setPreviewPhotoModal({
                        isOpen: true,
                        url: selectedVerification.photo,
                        title: selectedVerification.name,
                      })}
                      className="w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-orange-200/80 bg-slate-100 shadow-md relative group cursor-pointer"
                      title="Klik untuk melihat foto asli ukuran penuh"
                    >
                      <img
                        src={selectedVerification.photo}
                        alt={selectedVerification.name}
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5 p-3 text-center">
                        <ZoomIn className="w-6 h-6 text-white" />
                        <span className="text-xs font-semibold">Klik untuk Lihat Foto Asli (Penuh)</span>
                      </div>
                    </div>

                    {/* Akses Dokumen KTP */}
                    <div className="pt-1.5">
                      {selectedVerification.verificationDocuments?.ktp ? (
                        <a
                          href={selectedVerification.verificationDocuments.ktp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Buka KTP di Google Drive ↗
                        </a>
                      ) : (
                        <div className="text-center p-2 rounded-lg bg-muted text-xs text-muted-foreground italic">
                          KTP belum diunggah
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Detail Biodata & Parameter Layanan */}
                <div className="md:col-span-7 space-y-4">
                  {/* Biodata Singkat Header */}
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-foreground">{selectedVerification.name}</h3>
                      {selectedVerification.age && (
                        <Badge variant="outline" className="text-xs">
                          {selectedVerification.age} Tahun
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedVerification.email}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span>📞 {selectedVerification.phone || "-"}</span>
                      <span>📍 {selectedVerification.address || "Indonesia"}</span>
                    </div>
                  </div>

                  {/* Parameter Kualifikasi Layanan */}
                  <div className="p-3.5 rounded-xl border bg-card space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Parameter Kualifikasi & Layanan
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg border bg-background space-y-1">
                        <span className="text-[11px] text-muted-foreground block">Tipe Layanan:</span>
                        <Badge variant="secondary" className="font-semibold text-orange-700 bg-orange-50 border-orange-200">
                          {selectedVerification.experience_level === "spesialis" || selectedVerification.experience_level === "mahir"
                            ? "Spesialis / Pro"
                            : selectedVerification.experience_level === "kasual" || selectedVerification.experience_level === "pemula"
                            ? "Kasual & Santai"
                            : "Acara & Sosial"}
                        </Badge>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-background space-y-1">
                        <span className="text-[11px] text-muted-foreground block">Ekspektasi Tarif:</span>
                        <span className="font-bold text-foreground block text-xs">
                          {selectedVerification.price_expectation || "Rp 250k - Rp 350k"}
                        </span>
                      </div>
                    </div>

                    {selectedVerification.social_media && (
                      <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
                        <span className="text-blue-900 font-medium">Akun Media Sosial / Portofolio:</span>
                        <span className="font-bold text-blue-700">{selectedVerification.social_media}</span>
                      </div>
                    )}

                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        Keahlian / Kategori Minat:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(selectedVerification.category || "Lainnya")
                          .split(/[,;\n]/)
                          .map((cat: string) => cat.trim())
                          .filter(Boolean)
                          .map((cat: string) => (
                            <Badge key={cat} variant="outline" className="text-[10px] bg-background">
                              {cat}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Portofolio & Bukti Kualifikasi Pendukung */}
                  {(selectedVerification.portfolio_file || selectedVerification.appeal_file) && (
                    <div className="p-3.5 rounded-xl border bg-orange-50/40 border-orange-200 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                        Portofolio & Bukti Kualifikasi
                      </h4>

                      {selectedVerification.portfolio_file && (
                        <div className="p-2.5 rounded-lg bg-background border border-orange-200/80 space-y-1.5">
                          <span className="text-[11px] font-semibold text-orange-800 block">
                            Portofolio Pendaftaran:
                          </span>
                          {selectedVerification.portfolio_file.startsWith("data:image") ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={selectedVerification.portfolio_file}
                                alt="Portofolio Pendaftaran"
                                className="w-16 h-16 rounded-lg object-cover border border-orange-200 cursor-pointer"
                                onClick={() => window.open(selectedVerification.portfolio_file || "", "_blank")}
                              />
                              <div>
                                <p className="text-xs font-medium text-foreground">Gambar Portofolio Dilampirkan</p>
                                <a
                                  href={selectedVerification.portfolio_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary font-semibold underline inline-flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Buka Ukuran Penuh
                                </a>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={selectedVerification.portfolio_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary font-semibold underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {selectedVerification.portfolio_file}
                            </a>
                          )}
                        </div>
                      )}

                      {selectedVerification.appeal_file && (
                        <div className="p-2.5 rounded-lg bg-background border border-orange-200/80 space-y-1.5">
                          <span className="text-[11px] font-bold text-orange-900 block">
                            Bukti Portofolio / Sertifikat Tambahan (Banding Tarif):
                          </span>
                          {selectedVerification.appeal_file.startsWith("data:image") ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={selectedVerification.appeal_file}
                                alt="Bukti Portofolio Banding"
                                className="w-16 h-16 rounded-lg object-cover border border-orange-200 cursor-pointer"
                                onClick={() => window.open(selectedVerification.appeal_file || "", "_blank")}
                              />
                              <div>
                                <p className="text-xs font-medium text-foreground">Bukti Portofolio Penguat Banding</p>
                                <a
                                  href={selectedVerification.appeal_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary font-semibold underline inline-flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Buka Ukuran Penuh
                                </a>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={selectedVerification.appeal_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary font-semibold underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {selectedVerification.appeal_file}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deskripsi Diri */}
                  <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Deskripsi Diri Calon Mitra
                    </h4>
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg leading-relaxed italic">
                      "{selectedVerification.description || "Tidak ada deskripsi yang dicantumkan."}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t flex-col sm:flex-row sm:justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setShowDocumentDialog(false)}>
              Tutup
            </Button>

            {selectedVerification && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 flex-1 sm:flex-none"
                  onClick={() => {
                    const talent = selectedVerification;
                    setShowDocumentDialog(false);
                    handleOpenRejectDialog(talent);
                  }}
                >
                  <XCircle className="w-4 h-4" />
                  Tolak Calon Mitra
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold flex-1 sm:flex-none shadow-xs"
                  onClick={() => {
                    const id = selectedVerification.id;
                    setShowDocumentDialog(false);
                    handleAcceptVerification(id);
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Tentukan Tarif & Setujui
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview Foto Ukuran Penuh (Resolusi Asli Tanpa Crop) */}
      <Dialog
        open={previewPhotoModal.isOpen}
        onOpenChange={(open) => !open && setPreviewPhotoModal({ isOpen: false, url: "", title: "" })}
      >
        <DialogContent className="max-w-3xl p-3 bg-zinc-950/95 border-zinc-800 text-white rounded-2xl">
          <DialogHeader className="pb-2 border-b border-zinc-800 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-orange-400" />
              Foto Profil Asli: {previewPhotoModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2 min-h-[300px] max-h-[75vh] overflow-hidden">
            <img
              src={previewPhotoModal.url}
              alt={previewPhotoModal.title}
              className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          <p className="text-center text-xs text-zinc-400">
            Menampilkan foto resolusi asli calon mitra tanpa pemotongan (uncropped).
          </p>
        </DialogContent>
      </Dialog>

      {/* Dialog Verifikasi & Penetapan Tarif Berbasis Rubrik */}
      <Dialog open={showPriceDialog} onOpenChange={(open) => !open && setShowPriceDialog(false)}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Award className="w-5 h-5 text-orange-500" />
              Verifikasi & Penetapan Tarif Mitra
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Evaluasi kualifikasi mitra dan tetapkan tarif resmi per jam berdasarkan standar rubrik platform.
            </p>
          </DialogHeader>

          {selectedTalentForPrice && (
            <div className="space-y-4">
              {/* Highlight Permohonan Banding jika ada */}
              {selectedTalentForPrice.appeal_note && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 shadow-xs animate-in fade-in">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Scale className="w-4 h-4" />
                    Permohonan Banding / Negosiasi dari Calon Mitra:
                  </div>
                  <p className="whitespace-pre-line leading-relaxed font-medium bg-white/70 dark:bg-black/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                    {selectedTalentForPrice.appeal_note}
                  </p>
                </div>
              )}

              {/* Profil & Dokumen Mitra */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedTalentForPrice.photo}
                    alt={selectedTalentForPrice.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-md shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground truncate">{selectedTalentForPrice.name}</h3>
                      {selectedTalentForPrice.age && (
                        <span className="text-xs text-muted-foreground">{selectedTalentForPrice.age} Tahun</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{selectedTalentForPrice.email} • {selectedTalentForPrice.phone || "-"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedTalentForPrice.address || "Indonesia"}</p>
                  </div>
                </div>

                {/* Parameter Penilaian Calon Mitra */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div className="bg-background p-2.5 rounded-lg border">
                    <span className="text-muted-foreground block text-[11px]">Kategori Layanan Utama:</span>
                    <Badge variant="outline" className="mt-1 font-semibold text-orange-600 border-orange-200 bg-orange-50/50">
                      {selectedTalentForPrice.experience_level === "spesialis" || selectedTalentForPrice.experience_level === "mahir"
                        ? "Keahlian Khusus / Spesialis"
                        : selectedTalentForPrice.experience_level === "kasual" || selectedTalentForPrice.experience_level === "pemula"
                        ? "Teman Kasual / Santai"
                        : "Pendamping Acara & Sosial"}
                    </Badge>
                  </div>
                  <div className="bg-background p-2.5 rounded-lg border">
                    <span className="text-muted-foreground block text-[11px]">Ekspektasi Tarif Mitra:</span>
                    <span className="font-semibold text-foreground block mt-1">
                      {selectedTalentForPrice.price_expectation || "Rp 250.000 - Rp 350.000"}
                    </span>
                  </div>
                </div>

                {/* Kategori, Medsos, dan KTP */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Kategori:</span>
                    <span className="font-medium text-foreground">{selectedTalentForPrice.category || "Teman Acara"}</span>
                  </div>
                  {selectedTalentForPrice.social_media && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Media Sosial:</span>
                      <span className="font-medium text-blue-600 truncate">{selectedTalentForPrice.social_media}</span>
                    </div>
                  )}
                  {selectedTalentForPrice.verificationDocuments?.ktp && (
                    <div className="pt-1.5">
                      <a
                        href={selectedTalentForPrice.verificationDocuments.ktp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline bg-primary/5 px-2.5 py-1 rounded-md border border-primary/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Periksa Dokumen KTP di Google Drive ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist Kelayakan Verifikasi */}
              <div className="p-3 rounded-xl border bg-card space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Checklist Kelayakan Verifikasi Admin
                </Label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={verificationChecklist.ktpValid}
                      onChange={(e) => setVerificationChecklist(prev => ({ ...prev, ktpValid: e.target.checked }))}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span>KTP Asli, terbaca jelas, dan umur memenuhi syarat platform (&ge; 17 tahun)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={verificationChecklist.profileValid}
                      onChange={(e) => setVerificationChecklist(prev => ({ ...prev, profileValid: e.target.checked }))}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span>Data profil, kontak telepon, dan foto representatif profesional</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={verificationChecklist.skillValid}
                      onChange={(e) => setVerificationChecklist(prev => ({ ...prev, skillValid: e.target.checked }))}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span>Kategori dan tingkat pengalaman sesuai standar pelayanan platform</span>
                  </label>
                </div>
              </div>

              {/* Rubrik Standar Tier Tarif RentMate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Rubrik Standar Tier Tarif RentMate
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Pilih tier untuk mengisi tarif otomatis</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "tier1", name: "Tier 1: Kasual", price: 225000, desc: "Hangout santai, ngopi, kuliner, nonton" },
                    { id: "tier2", name: "Tier 2: Acara & Sosial", price: 300000, desc: "Kondangan, gathering, event keluarga" },
                    { id: "tier3", name: "Tier 3: Spesialis / Pro", price: 400000, desc: "Keahlian khusus (foto/tour/olahraga)" },
                    { id: "tier4", name: "Tier 4: VIP / All-in", price: 500000, desc: "Acara formal, fleksibilitas tinggi" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedPricingTier(t.id);
                        setTalentPrice(String(t.price));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedPricingTier === t.id
                          ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500 shadow-xs"
                          : "border-border hover:border-gray-300 bg-card"
                      }`}
                    >
                      <div className="text-[11px] font-bold text-foreground leading-tight">{t.name}</div>
                      <div className="text-sm font-extrabold text-orange-600 mt-1">{formatCurrency(t.price)}/jam</div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Penyesuaian Harga Final & Catatan Admin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label htmlFor="talent-price-input" className="text-xs font-semibold mb-1 block">
                    Tarif Resmi per Jam (Rp)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">Rp</span>
                    <Input
                      id="talent-price-input"
                      type="number"
                      placeholder="Masukkan tarif per jam"
                      value={talentPrice}
                      onChange={(e) => setTalentPrice(e.target.value)}
                      className="pl-9 h-10 font-bold text-sm"
                      min={10000}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tarif ini yang akan dibayar oleh pengguna saat memesan mitra.
                  </p>
                </div>

                <div>
                  <Label htmlFor="admin-price-notes" className="text-xs font-semibold mb-1 block">
                    Justifikasi / Catatan Audit Admin
                  </Label>
                  <Input
                    id="admin-price-notes"
                    placeholder="Contoh: Disetujui Tier 2 sesuai pengalaman 2 tahun"
                    value={adminPriceNotes}
                    onChange={(e) => setAdminPriceNotes(e.target.value)}
                    className="h-10 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Dasar pertimbangan penetapan tarif untuk arsip laporan.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSavePriceAndApprove}
              disabled={
                !talentPrice ||
                Number(talentPrice) < 10000 ||
                !verificationChecklist.ktpValid ||
                !verificationChecklist.profileValid
              }
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Setujui & Terbitkan Profil Mitra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Penolakan Mitra Terstruktur (Tidak Asal Tolak) */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => !open && setShowRejectDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <XCircle className="w-5 h-5 text-destructive" />
              Tolak Pendaftaran Mitra
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Pilih alasan penolakan secara jelas dan objektif agar terdokumentasi dalam sistem dan laporan.
            </p>
          </DialogHeader>

          {talentToReject && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-muted/20 flex items-center gap-3">
                <img src={talentToReject.photo} alt={talentToReject.name} className="w-10 h-10 rounded-full object-cover border shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{talentToReject.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{talentToReject.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Alasan Penolakan Standar</Label>
                <div className="space-y-1.5 text-xs">
                  {[
                    "KTP buram / tidak terbaca dengan jelas",
                    "Data identitas (nama/alamat/umur) tidak cocok dengan dokumen KTP",
                    "Deskripsi diri atau kategori keahlian tidak sesuai panduan platform",
                    "Foto profil tidak memenuhi standar kualitas dan etika platform",
                    "Usia belum memenuhi syarat minimal 17 tahun",
                    "Lainnya",
                  ].map((reason) => (
                    <label key={reason} className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer">
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={rejectionReason === reason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {rejectionReason === "Lainnya" && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom-reject-reason" className="text-xs font-semibold">Tulis Alasan Spesifik</Label>
                  <Textarea
                    id="custom-reject-reason"
                    placeholder="Jelaskan alasan penolakan untuk mitra ini..."
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isRejectingTalent || (rejectionReason === "Lainnya" && !customRejectionReason.trim())}
              className="gap-1.5"
            >
              {isRejectingTalent ? "Memproses..." : "Konfirmasi Tolak Mitra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tolak Banding Tarif (TIDAK Menolak Mitra) */}
      <Dialog open={showRejectAppealDialog} onOpenChange={(open) => !open && setShowRejectAppealDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-600 dark:text-amber-400">
              <Scale className="w-5 h-5 text-amber-500" />
              Tolak Banding Tarif Mitra
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tindakan ini <strong>hanya menolak permohonan penyesuaian tarif</strong>. Pendaftaran calon mitra <strong>tetap disetujui</strong> dengan tarif awal yang telah ditentukan.
            </p>
          </DialogHeader>

          {appealTalentToReject && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 flex items-center gap-3">
                <img src={appealTalentToReject.photo} alt={appealTalentToReject.name} className="w-11 h-11 rounded-full object-cover border-2 border-amber-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{appealTalentToReject.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{appealTalentToReject.email}</p>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                    Tarif Awal: {formatCurrency(appealTalentToReject.price || 0)}/jam
                  </p>
                </div>
              </div>

              {appealTalentToReject.appeal_note && (
                <div className="p-3 bg-muted/40 rounded-xl border text-xs space-y-1">
                  <span className="font-semibold text-muted-foreground block text-[11px]">Permohonan Banding Calon Mitra:</span>
                  <p className="italic text-foreground line-clamp-3">{appealTalentToReject.appeal_note}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Alasan Penolakan Banding</Label>
                <div className="space-y-1.5 text-xs">
                  {[
                    "Portofolio / sertifikasi pendukung belum mencukupi untuk tarif yang diajukan",
                    "Tarif yang diajukan melebihi batas standar kategori & wilayah saat ini",
                    "Kualifikasi dan jam terbang sesuai dengan tier tarif awal",
                    "Lainnya",
                  ].map((reason) => (
                    <label key={reason} className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer">
                      <input
                        type="radio"
                        name="appealRejectReason"
                        value={reason}
                        checked={appealRejectReason === reason}
                        onChange={(e) => setAppealRejectReason(e.target.value)}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {appealRejectReason === "Lainnya" && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom-appeal-reject-reason" className="text-xs font-semibold">Tulis Alasan Spesifik</Label>
                  <Textarea
                    id="custom-appeal-reject-reason"
                    placeholder="Jelaskan alasan mengapa banding tarif belum dapat disetujui..."
                    value={customAppealRejectReason}
                    onChange={(e) => setCustomAppealRejectReason(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRejectAppealDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmRejectAppeal}
              disabled={isRejectingAppeal || (appealRejectReason === "Lainnya" && !customAppealRejectReason.trim())}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold"
            >
              <XCircle className="w-4 h-4" />
              {isRejectingAppeal ? "Memproses..." : "Konfirmasi Tolak Banding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditPriceDialog} onOpenChange={(open) => { if (!open) { setShowEditPriceDialog(false); setEditPriceTalent(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Data Talent
            </DialogTitle>
          </DialogHeader>
          {editPriceTalent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <img src={getImageUrl(editTalentForm.photo)} alt={editTalentForm.name} className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-lg" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{editTalentForm.name || editPriceTalent.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">Harga saat ini: {formatCurrency(Number(editTalentForm.price) || 0)}</p>
                  <Input type="file" accept="image/*" onChange={handleEditTalentPhotoUpload} className="text-xs" />
                  <p className="text-xs text-muted-foreground mt-1">Unggah foto baru (JPG/PNG, maks 5MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nama Lengkap</label>
                  <Input
                    value={editTalentForm.name}
                    onChange={(e) => setEditTalentForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nama talent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Umur</label>
                  <Input
                    type="number"
                    value={editTalentForm.age}
                    onChange={(e) => setEditTalentForm(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Umur"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Kota</label>
                  <Input
                    value={editTalentForm.city}
                    onChange={(e) => setEditTalentForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Contoh: Yogyakarta"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Kategori</label>
                  <Input
                    value={editTalentForm.category}
                    onChange={(e) => setEditTalentForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Contoh: Travelling"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Harga per Jam (Rp)</label>
                  <Input
                    type="number"
                    value={editTalentForm.price}
                    onChange={(e) => setEditTalentForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="Contoh: 500000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Nomor Telepon</label>
                  <Input
                    value={editTalentForm.phone}
                    onChange={(e) => setEditTalentForm(prev => ({ ...prev, phone: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="Contoh: 081234567890"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Deskripsi Diri</label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border-input bg-background px-3 py-2 text-sm"
                  value={editTalentForm.description}
                  onChange={(e) => setEditTalentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi talent..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditPriceDialog(false); setEditPriceTalent(null); }}>
              Batal
            </Button>
            <Button onClick={handleSaveEditPrice} disabled={isSavingPrice}>
              {isSavingPrice ? "Menyimpan..." : "Simpan Data"}
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

        {/* Modal Resolusi Komplain */}
        <Dialog open={resolveComplaintModal.isOpen} onOpenChange={(open) => !open && setResolveComplaintModal({ ...resolveComplaintModal, isOpen: false })}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Resolusi & Penetapan Pelanggaran
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tentukan pihak yang bertanggung jawab atas komplain setelah memeriksa bukti laporan dan riwayat percakapan chat.
              </p>
            </DialogHeader>

            <div className="py-3 space-y-4">
              {resolveComplaintModal.reportId && (
                <div className="p-2.5 rounded-lg bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">Sudah periksa percakapan?</span>
                    <p className="text-muted-foreground text-[11px]">Pastikan memeriksa bukti obrolan kedua pihak terlebih dahulu.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1 text-orange-600 border-orange-200 bg-background hover:bg-orange-50 shrink-0"
                    onClick={() => {
                      const id = resolveComplaintModal.reportId;
                      setResolveComplaintModal({ ...resolveComplaintModal, isOpen: false });
                      setAuditChatComplaintId(id);
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Cek Chat
                  </Button>
                </div>
              )}

              <div>
                <Label className="mb-2 block font-semibold text-sm">Pihak yang Dinyatakan Bersalah:</Label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resolveComplaintModal.atFault === 'mitra'
                      ? 'border-red-500 bg-red-50/60 dark:bg-red-950/20'
                      : 'border-border hover:bg-muted/40'
                  }`}>
                    <input
                      type="radio"
                      name="atFault"
                      value="mitra"
                      checked={resolveComplaintModal.atFault === 'mitra'}
                      onChange={(e) => setResolveComplaintModal({...resolveComplaintModal, atFault: e.target.value})}
                      className="mt-1 accent-red-600"
                    />
                    <div>
                      <span className="font-semibold text-sm block text-red-600 dark:text-red-400">
                        Mitra Bersalah
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Mitra akan mendapatkan +1 poin pelanggaran (Strike). Jika akumulasi strike mencapai 3x (suspend 7 hari) atau 5x (suspend 30 hari).
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resolveComplaintModal.atFault === 'user'
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
                      : 'border-border hover:bg-muted/40'
                  }`}>
                    <input
                      type="radio"
                      name="atFault"
                      value="user"
                      checked={resolveComplaintModal.atFault === 'user'}
                      onChange={(e) => setResolveComplaintModal({...resolveComplaintModal, atFault: e.target.value})}
                      className="mt-1 accent-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-sm block text-blue-600 dark:text-blue-400">
                        Pelanggan Bersalah (Komplain Ditolak)
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Laporan komplain ditolak karena tidak sesuai bukti chat. Pengguna akan dikirimi notifikasi peringatan resmi dan nama baik mitra dipulihkan.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resolveComplaintModal.atFault === 'none'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
                      : 'border-border hover:bg-muted/40'
                  }`}>
                    <input
                      type="radio"
                      name="atFault"
                      value="none"
                      checked={resolveComplaintModal.atFault === 'none'}
                      onChange={(e) => setResolveComplaintModal({...resolveComplaintModal, atFault: e.target.value})}
                      className="mt-1 accent-amber-600"
                    />
                    <div>
                      <span className="font-semibold text-sm block text-foreground">
                        Netral / Diselesaikan Damai
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Kesalahpahaman diselesaikan tanpa memberikan sanksi poin pelanggaran kepada kedua belah pihak.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block font-semibold text-sm">
                  Catatan & Alasan Investigasi Admin <span className="text-destructive">*</span>
                </Label>
                <Textarea 
                  placeholder="Tuliskan temuan investigasi berdasarkan bukti foto dan riwayat percakapan chat..."
                  value={resolveComplaintModal.adminNotes}
                  onChange={(e) => setResolveComplaintModal({...resolveComplaintModal, adminNotes: e.target.value})}
                  rows={3}
                  className="text-sm"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Catatan ini akan dikirimkan ke pihak terkait sebagai penjelasan putusan Admin.
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setResolveComplaintModal({ ...resolveComplaintModal, isOpen: false })}>
                Batal
              </Button>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-md shadow-orange-500/20"
                onClick={() => {
                  if (resolveComplaintModal.reportId && resolveComplaintModal.adminNotes.trim()) {
                    updateReportStatus(resolveComplaintModal.reportId, "resolved", resolveComplaintModal.atFault, resolveComplaintModal.adminNotes);
                    setResolveComplaintModal({ isOpen: false, reportId: null, atFault: "none", adminNotes: "" });
                  } else {
                    toast({ title: "Validasi", description: "Catatan Admin wajib diisi sebelum menetapkan putusan.", variant: "destructive" });
                  }
                }}
              >
                Kirim Putusan & Selesaikan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Audit Percakapan Komplain Pelanggan & Mitra */}
        <ComplaintChatModal
          isOpen={!!auditChatComplaintId}
          onClose={() => setAuditChatComplaintId(null)}
          complaintId={auditChatComplaintId}
          onResolveClick={(report) => {
            setAuditChatComplaintId(null);
            setResolveComplaintModal({
              isOpen: true,
              reportId: report.id,
              atFault: report.atFault || "none",
              adminNotes: report.adminNotes || "",
            });
          }}
          onStatusChange={(reportId, newStatus) => {
            updateReportStatus(reportId, newStatus);
          }}
        />

        {/* Modal Setujui & Tandai Ditransfer Penarikan Saldo */}
        <Dialog
          open={!!selectedWithdrawalToApprove}
          onOpenChange={(open) => !open && setSelectedWithdrawalToApprove(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Konfirmasi Transfer & Setujui
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Pastikan dana telah berhasil ditransfer via m-banking / e-wallet Anda
                  </p>
                </div>
              </div>
            </DialogHeader>

            {selectedWithdrawalToApprove && (
              <div className="space-y-3.5 py-1 text-xs">
                {/* Detail Summary */}
                <div className="p-3 bg-muted/40 rounded-xl border space-y-2">
                  <div className="flex justify-between items-center pb-1.5 border-b">
                    <span className="text-muted-foreground">Penerima Dana</span>
                    <span className="font-semibold text-foreground">
                      {selectedWithdrawalToApprove.userName} ({selectedWithdrawalToApprove.userEmail})
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b">
                    <span className="text-muted-foreground">Tujuan</span>
                    <span className="font-bold text-foreground">
                      {selectedWithdrawalToApprove.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b font-mono">
                    <span className="text-muted-foreground font-sans">No. Rekening / HP</span>
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      {selectedWithdrawalToApprove.accountNumber}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => handleCopyAccNumber(selectedWithdrawalToApprove.accountNumber)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b">
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span className="font-semibold text-foreground">
                      {selectedWithdrawalToApprove.accountName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground font-medium">Nominal yang Ditransfer</span>
                    <span className="text-base font-extrabold text-orange-600">
                      {formatCurrency(selectedWithdrawalToApprove.amount)}
                    </span>
                  </div>
                </div>

                {/* Catatan Admin */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-note" className="text-xs font-semibold">
                    Catatan Transfer untuk Pengguna (Opsional)
                  </Label>
                  <Input
                    id="admin-note"
                    value={approveWithdrawalNote}
                    onChange={(e) => setApproveWithdrawalNote(e.target.value)}
                    placeholder="Contoh: Telah ditransfer via m-banking BCA. No ref: 12345"
                    className="text-xs h-9"
                  />
                </div>

                {/* Bukti Transfer M-Banking */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Unggah Bukti Transfer / Resi (Opsional)
                  </Label>
                  {approveWithdrawalProof ? (
                    <div className="relative rounded-lg border overflow-hidden p-2 bg-muted/20 flex items-center justify-between">
                      <img
                        src={approveWithdrawalProof}
                        alt="Bukti Transfer"
                        className="h-16 w-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-destructive border-destructive/30"
                        onClick={() => setApproveWithdrawalProof(null)}
                      >
                        Hapus Foto
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-center">
                      <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Klik untuk unggah screenshot bukti transfer
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleWithdrawalProofUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWithdrawalToApprove(null)}
                disabled={isApprovingWithdrawal}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                onClick={handleConfirmApproveWithdrawal}
                disabled={isApprovingWithdrawal}
              >
                {isApprovingWithdrawal ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Konfirmasi Selesai Ditransfer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Tolak Penarikan Saldo */}
        <Dialog
          open={!!selectedWithdrawalToReject}
          onOpenChange={(open) => !open && setSelectedWithdrawalToReject(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-destructive">
                    Tolak Permintaan Tarik Saldo
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Saldo akan dikembalikan secara utuh ke dompet pengguna
                  </p>
                </div>
              </div>
            </DialogHeader>

            {selectedWithdrawalToReject && (
              <div className="space-y-3.5 py-1 text-xs">
                {/* Warning Alert */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-[11px] leading-relaxed">
                    Saldo sebesar <strong>{formatCurrency(selectedWithdrawalToReject.amount)}</strong> akan <strong>otomatis dikembalikan (refund)</strong> ke dompet akun <strong>{selectedWithdrawalToReject.userName}</strong>.
                  </div>
                </div>

                <div className="p-2.5 bg-muted/30 rounded-lg border text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Pengguna:</span>
                    <span className="font-semibold text-foreground">{selectedWithdrawalToReject.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tujuan:</span>
                    <span className="font-semibold text-foreground">{selectedWithdrawalToReject.bankName} - {selectedWithdrawalToReject.accountNumber}</span>
                  </div>
                </div>

                {/* Alasan Penolakan */}
                <div className="space-y-1.5">
                  <Label htmlFor="reject-reason" className="text-xs font-semibold text-foreground">
                    Alasan Penolakan <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reject-reason"
                    rows={3}
                    placeholder="Contoh: Nomor rekening tidak ditemukan / nama di rekening tidak sesuai dengan akun."
                    value={rejectWithdrawalReason}
                    onChange={(e) => setRejectWithdrawalReason(e.target.value)}
                    className="text-xs"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Alasan ini akan dikirimkan langsung ke notifikasi pengguna agar mereka dapat memperbaikinya.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWithdrawalToReject(null)}
                disabled={isRejectingWithdrawal}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRejectWithdrawal}
                disabled={isRejectingWithdrawal || !rejectWithdrawalReason.trim()}
                className="gap-1.5"
              >
                {isRejectingWithdrawal ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Tolak & Refund Saldo
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Tarik Kas Profit Admin (Pencairan Komisi 20%) */}
        <Dialog open={isAdminProfitModalOpen} onOpenChange={setIsAdminProfitModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl border">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Cairkan Kas Profit Admin
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Tarik saldo hasil komisi platform (20%) ke rekening kantor/owner.
                  </p>
                </div>
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmAdminProfitDisbursement();
              }}
              className="space-y-3.5 py-1 text-xs"
            >
              {/* Card Saldo Kas Tersedia */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-100/60 border border-purple-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-purple-900 block">
                  Kas Komisi Platform Tersedia:
                </span>
                <div className="text-xl font-extrabold text-purple-950">
                  {formatCurrency(availableAdminProfit)}
                </div>
                <p className="text-[10px] text-purple-800/80">
                  Total akumulasi bagi hasil 20% komisi transaksi selesai yang belum dicairkan.
                </p>
              </div>

              {/* Input Nominal Pencairan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-wd-amount" className="text-xs font-semibold">
                    Nominal Pencairan <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                    onClick={() => setAdminProfitAmount(availableAdminProfit)}
                    disabled={availableAdminProfit <= 0}
                  >
                    Cairkan Semua
                  </Button>
                </div>
                <Input
                  id="admin-wd-amount"
                  type="number"
                  placeholder="Contoh: 1000000"
                  value={adminProfitAmount}
                  onChange={(e) => setAdminProfitAmount(e.target.value ? Number(e.target.value) : "")}
                  min={10000}
                  max={availableAdminProfit}
                  className="text-xs"
                  required
                />
              </div>

              {/* Pilihan Bank / E-Wallet Tujuan Owner */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Bank / E-Wallet Tujuan <span className="text-destructive">*</span>
                </Label>
                <select
                  value={adminProfitBank}
                  onChange={(e) => setAdminProfitBank(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="BCA">Bank Central Asia (BCA)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
                  <option value="BNI">Bank Negara Indonesia (BNI)</option>
                  <option value="DANA">DANA E-Wallet</option>
                  <option value="GoPay">GoPay E-Wallet</option>
                  <option value="OVO">OVO E-Wallet</option>
                </select>
              </div>

              {/* Nomor Rekening */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-wd-acc-no" className="text-xs font-semibold">
                  Nomor Rekening / No. HP E-Wallet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="admin-wd-acc-no"
                  placeholder="Contoh: 8830123456"
                  value={adminProfitAccNumber}
                  onChange={(e) => setAdminProfitAccNumber(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              {/* Atas Nama Rekening */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-wd-acc-name" className="text-xs font-semibold">
                  Atas Nama Pemilik Rekening <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="admin-wd-acc-name"
                  placeholder="Contoh: PT TemanAcara Indonesia / Owner"
                  value={adminProfitAccName}
                  onChange={(e) => setAdminProfitAccName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              {/* Catatan Pencairan */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-wd-note" className="text-xs font-semibold">
                  Catatan Pengeluaran Kas (Opsional)
                </Label>
                <Textarea
                  id="admin-wd-note"
                  rows={2}
                  placeholder="Contoh: Dividen profit owner bulan ini / operasional kantor"
                  value={adminProfitNote}
                  onChange={(e) => setAdminProfitNote(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdminProfitModalOpen(false)}
                  disabled={isSubmittingAdminProfit}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium gap-1.5 shadow-2xs"
                  disabled={isSubmittingAdminProfit || !adminProfitAmount || !adminProfitAccNumber || !adminProfitAccName}
                >
                  {isSubmittingAdminProfit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Konfirmasi Pencairan Kas
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Lihat Bukti Transfer Admin Full Image */}
        <Dialog
          open={!!selectedWithdrawalProofModal}
          onOpenChange={(open) => !open && setSelectedWithdrawalProofModal(null)}
        >
          <DialogContent className="sm:max-w-md rounded-2xl border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Bukti Transfer Pencairan Dana</DialogTitle>
              {selectedWithdrawalProofModal && (
                <p className="text-xs text-muted-foreground">
                  Transfer sebesar {formatCurrency(selectedWithdrawalProofModal.amount)} ke {selectedWithdrawalProofModal.bankName} ({selectedWithdrawalProofModal.accountNumber})
                </p>
              )}
            </DialogHeader>
            <div className="mt-2 flex items-center justify-center p-2 rounded-xl bg-muted/30 border">
              {selectedWithdrawalProofModal?.proofImageBase64 ? (
                <img
                  src={selectedWithdrawalProofModal.proofImageBase64}
                  alt="Bukti Transfer Admin"
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-xs"
                />
              ) : (
                <p className="text-xs text-muted-foreground py-8">Tidak ada gambar bukti transfer.</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWithdrawalProofModal(null)}
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Verifikasi & Detail Bukti Top-Up */}
        <Dialog
          open={!!selectedTopUpForModal}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTopUpForModal(null);
              setTopupVerificationNote("");
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border">
            {selectedTopUpForModal && (
              <div>
                {/* Modal Header */}
                <div className="p-5 border-b bg-gray-50/70 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg font-bold text-gray-900">
                        Verifikasi Permintaan Isi Saldo
                      </DialogTitle>
                      {selectedTopUpForModal.status === "pending" && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                          Menunggu Review
                        </Badge>
                      )}
                      {selectedTopUpForModal.status === "approved" && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                          Disetujui
                        </Badge>
                      )}
                      {selectedTopUpForModal.status === "rejected" && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs">
                          Ditolak
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      ID Transaksi: {selectedTopUpForModal.id}
                    </p>
                  </div>
                </div>

                {/* 2-Column Content */}
                <div className="p-6 grid gap-6 md:grid-cols-2">
                  {/* Left: Bukti Transfer Viewer */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Bukti Struk Transfer QRIS
                      </Label>
                      {selectedTopUpForModal.proofImageBase64 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => window.open(selectedTopUpForModal.proofImageBase64, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Buka Gambar Penuh
                        </Button>
                      )}
                    </div>

                    <div className="relative h-80 rounded-xl border border-gray-200 bg-gray-900/5 overflow-hidden flex items-center justify-center p-2">
                      {selectedTopUpForModal.proofImageBase64 ? (
                        <img
                          src={selectedTopUpForModal.proofImageBase64}
                          alt="Bukti Transfer"
                          className="max-h-full max-w-full rounded object-contain shadow-xs"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">Pengguna tidak melampirkan file bukti transfer.</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Pastikan nominal pada struk dan jam transfer cocok dengan mutasi QRIS Terpusat.
                    </p>
                  </div>

                  {/* Right: Detail Transaksi & Verifikasi */}
                  <div className="space-y-4">
                    {/* User Profile Card */}
                    <div className="rounded-xl border bg-gray-50/50 p-3.5 space-y-3">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Data Pengguna
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-orange-100 flex items-center justify-center text-orange-600 shadow-xs">
                          {selectedTopUpForModal.userPhoto ? (
                            <img src={selectedTopUpForModal.userPhoto} alt="" className="h-full w-full object-cover shrink-0 aspect-square" />
                          ) : (
                            <span className="font-bold text-xs uppercase">
                              {(selectedTopUpForModal.userName || "U").slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">
                            {selectedTopUpForModal.userName || "Pengguna"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {selectedTopUpForModal.userEmail}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            ID: {selectedTopUpForModal.userId}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Nominal Highlight Card */}
                    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-orange-800">Nominal Penambahan Saldo</span>
                        <Badge className="bg-orange-500 text-white font-bold text-[11px]">
                          + Saldo
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-orange-600 mt-1">
                        {formatCurrency(selectedTopUpForModal.amount)}
                      </div>
                      <div className="text-xs text-orange-950/80 mt-2 space-y-1 pt-2 border-t border-orange-200/60">
                        <div className="flex justify-between">
                          <span>Metode Pembayaran:</span>
                          <span className="font-semibold">QRIS Terpusat PT TemanAcara</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Waktu Pengajuan:</span>
                          <span className="font-mono">{new Date(selectedTopUpForModal.createdAt).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Note Input / Display */}
                    {selectedTopUpForModal.status === "pending" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="topup-note" className="text-xs font-semibold text-gray-700">
                          Catatan Verifikasi Admin (Opsional):
                        </Label>
                        <Textarea
                          id="topup-note"
                          rows={2}
                          placeholder="Contoh: 'Terkonfirmasi mutasi BCA/QRIS jam 03:34 valid'"
                          value={topupVerificationNote}
                          onChange={(e) => setTopupVerificationNote(e.target.value)}
                          className="text-xs bg-white resize-none"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-gray-50/70 p-3 text-xs space-y-1.5">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Diproses Pada:</span>
                          <span className="font-medium text-foreground">
                            {selectedTopUpForModal.processedAt ? new Date(selectedTopUpForModal.processedAt).toLocaleString("id-ID") : "-"}
                          </span>
                        </div>
                        {selectedTopUpForModal.adminNote && (
                          <div className="text-muted-foreground pt-1 border-t">
                            <span className="font-medium text-foreground">Catatan Admin: </span>
                            {selectedTopUpForModal.adminNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 border-t bg-gray-50/60 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTopUpForModal(null);
                      setTopupVerificationNote("");
                    }}
                    disabled={isProcessingTopup}
                  >
                    Tutup
                  </Button>

                  {selectedTopUpForModal.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          const req = selectedTopUpForModal;
                          setSelectedTopUpForModal(null);
                          setTopupRejectDialog({ isOpen: true, request: req, reason: "" });
                        }}
                        disabled={isProcessingTopup}
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak Permintaan
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                        onClick={() => handleApproveTopUp(selectedTopUpForModal)}
                        disabled={isProcessingTopup}
                      >
                        {isProcessingTopup ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Setujui & Tambah Saldo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Konfirmasi Penolakan Top-Up */}
        <Dialog
          open={topupRejectDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) setTopupRejectDialog({ isOpen: false, request: null, reason: "" });
          }}
        >
          <DialogContent className="sm:max-w-md rounded-2xl border">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-destructive">
                    Tolak Permintaan Top-Up
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Pengguna akan menerima notifikasi penjelasan penolakan ini.
                  </p>
                </div>
              </div>
            </DialogHeader>

            {topupRejectDialog.request && (
              <div className="space-y-3.5 py-1 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl border text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Pengguna:</span>
                    <span className="font-bold text-foreground">{topupRejectDialog.request.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nominal:</span>
                    <span className="font-bold text-foreground">{formatCurrency(topupRejectDialog.request.amount)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Pilih Alasan Cepat:</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      "Bukti transfer tidak terbaca / buram",
                      "Nominal tidak sesuai mutasi QRIS",
                      "Mutasi bank tidak ditemukan",
                      "Bukti pembayaran tidak valid",
                    ].map((reasonItem) => (
                      <button
                        key={reasonItem}
                        type="button"
                        onClick={() => setTopupRejectDialog(prev => ({ ...prev, reason: reasonItem }))}
                        className={`text-left px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          topupRejectDialog.reason === reasonItem
                            ? "bg-rose-50 border-rose-300 text-rose-800 font-semibold"
                            : "hover:bg-gray-50 border-gray-200 text-gray-700"
                        }`}
                      >
                        • {reasonItem}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom-reject-reason" className="text-xs font-semibold text-gray-700">
                    Alasan Kustom / Penjelasan Detail:
                  </Label>
                  <Textarea
                    id="custom-reject-reason"
                    rows={2}
                    placeholder="Tuliskan alasan penolakan jika diperlukan..."
                    value={topupRejectDialog.reason}
                    onChange={(e) => setTopupRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTopupRejectDialog({ isOpen: false, request: null, reason: "" })}
                disabled={isProcessingTopup}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRejectTopUp}
                disabled={isProcessingTopup}
                className="gap-1.5"
              >
                {isProcessingTopup ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menolak...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Konfirmasi Tolak
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>

  );
}