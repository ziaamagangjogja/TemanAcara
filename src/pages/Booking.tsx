import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Video,
  Users,
  Calendar,
  CreditCard,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  MessageCircle,
  QrCode,
  Building2,
  Upload,
  Wallet,
  AlertCircle,
  AlertTriangle,
  Info,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { talents, bookingPurposes } from "@/data/mockData";
import { BOOKING_PURPOSE_ACTIVITIES, getAvailableBookingPurposes, getMitraActivityLabels, inferLegacyMitraActivities, normalizeMitraActivities } from "@/data/mitraActivities";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  addBooking,
  getBookingById,
  getBookings,
  refreshBookingsFromSupabase,
  subscribeToBookings,
  updateBookingPayment,
  SharedBooking,
  updateBookingRating,
  updateBooking,
  getCurrentUserOrMitra,
  addNotificationForUser,
  getBookingTimeDetails,
  getLatestStartTimeForDuration,
  isTimeSlotExceedingOperatingHours,
} from "@/lib/bookingStore";
import { getCurrentUser, updateCurrentUser } from "@/lib/userStore";
import { isTimeSlotBooked, isTimeSlotInPast } from '@/lib/bookingStore';
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import {
  findPriceGuide,
  calculateServiceTotal,
  EXTRA_EXPENSES_DISCLAIMER,
  formatRupiah,
  getDefaultServicesForTalent,
  type ServicePriceUnit
} from "@/data/pricingReference";

type BookingStatus = "draft" | "pending_payment" | "pending_approval" | "pending_mitra" | "approved" | "completed" | "rejected";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getRandomizedAmount = (amount: number): number => {
  const amountStr = amount.toString();
  if (amount < 1000) return amount;
  const prefix = amountStr.slice(0, -3);
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return parseInt(prefix + randomSuffix);
};

const offlineOnlyPurposes = [
  "Dinner / Makan Malam",
  "Traveling / Liburan",
  "Hiking",
  "Event / Acara",
  "Event / Wisuda atau Kelulusan",
  "Event / Pernikahan atau Kondangan",
  "Event / Ulang Tahun",
  "Event / Seminar atau Konferensi",
  "Event / Gathering atau Reuni",
  "Event / Konser atau Festival",
  "Event / Acara Kantor",
  "Event / Acara Lainnya",
  "Jasa Fotografi",
  "Nonton Film",
  "Belanja",
  "Olahraga Bareng",
  "Pesta / Party",
];

const onlineOnlyPurposes = [
  "Main Game Online",
  "Nonton Bareng Online",
  "Karaoke Online",
  "Belajar / Diskusi",
];

const getLocalDateInputValue = () => {
  const today = new Date();
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
};


const maskBankAccount = (accountNumber: string): string => {
  if (!accountNumber || accountNumber.length < 3) return accountNumber;
  return accountNumber;
};

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State untuk menyimpan data booking saat ini
  const [currentBooking, setCurrentBooking] = useState<SharedBooking | null>(null);

  // State untuk loading talent
  const [isLoadingTalent, setIsLoadingTalent] = useState(true);
  const [allTalents, setAllTalents] = useState<any[]>([]);

  // Pindahkan deklarasi bookingStatus ke atas
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("draft");
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);

  // State untuk data talent yang akan ditampilkan
  const [displayTalent, setDisplayTalent] = useState<any>(null);

  // State untuk menangani apakah data sedang dimuat
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [, setBookingRefreshKey] = useState(0);

  // State untuk tujuan kustom
  const [customPurpose, setCustomPurpose] = useState("");

  // Load semua talent saat komponen dimuat
  useEffect(() => {
    const loadTalents = async () => {
      try {
        const verifiedTalents = await getAllVerifiedTalents();
        const talentList = Array.isArray(verifiedTalents) ? verifiedTalents : [];
        setAllTalents(talentList);

        const matchTalent = (t: any) =>
          t &&
          (String(t.id) === String(id) ||
           String(t.talentId) === String(id) ||
           String(t.user_id) === String(id) ||
           (t.email && String(t.email).toLowerCase() === String(id).toLowerCase()));

        let foundTalent = talentList.find(matchTalent);
        if (!foundTalent) {
          foundTalent = talents.find(matchTalent);
        }
        setDisplayTalent(foundTalent || null);
      } catch (error) {
        console.error("Error loading talents:", error);
        // Fallback ke mock data jika gagal
        const matchTalent = (t: any) =>
          t &&
          (String(t.id) === String(id) ||
           String(t.talentId) === String(id) ||
           String(t.user_id) === String(id) ||
           (t.email && String(t.email).toLowerCase() === String(id).toLowerCase()));
        const foundTalent = talents.find(matchTalent);
        setDisplayTalent(foundTalent || null);
      } finally {
        setIsLoadingTalent(false);
        setIsInitialLoading(false);
      }
    };

    if (id) {
      loadTalents();
    } else {
      setIsInitialLoading(false);
    }
  }, [id]);

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMeetingLocationDialogOpen, setIsMeetingLocationDialogOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    duration: 2,
    purpose: "",
    type: "offline" as "online" | "offline",
    meetingCity: "",
    date: "",
    time: "",
    notes: "",
    packageOption: "paket-lokal" as "paket-lokal" | "paket-seharian",
  });

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bca" | "bri" | "mandiri" | "saldo" | null>(null);
  const [paymentCode, setPaymentCode] = useState<string>("");
  // Saldo dompet user (untuk metode pembayaran "Saldo Dompet").
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferTime, setTransferTime] = useState<string>("");

  // State for admin-configured payment settings
  const [qrisCode, setQrisCode] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState({
    bca: { number: "1234567890", holder: "PT RentMate Indonesia" },
    bri: { number: "9876543210", holder: "PT RentMate Indonesia" },
    mandiri: { number: "5555666677", holder: "PT RentMate Indonesia" },
  });

  // Muat saldo dompet user yang sedang login (untuk metode pembayaran "Saldo Dompet")
  useEffect(() => {
    let isMounted = true;

    const loadWallet = async () => {
      const current = getCurrentUserOrMitra();
      // Mitra tidak memiliki dompet saldo, hanya user.
      if (!current || current.type !== "user") {
        if (isMounted) setWalletBalance(0);
        return;
      }
      const profile = await getCurrentUser();
      if (isMounted) setWalletBalance(profile?.wallet ?? 0);
    };

    loadWallet();
    window.addEventListener("userUpdated", loadWallet);
    return () => {
      isMounted = false;
      window.removeEventListener("userUpdated", loadWallet);
    };
  }, []);

  // Fallback QRIS default
  const DEFAULT_QRIS = "/assets/qris-default.png";
  const staticQrisUrl = import.meta.env.VITE_STATIC_QRIS_URL;

  // QRIS yang benar-benar ditampilkan: prioritas QRIS dari state/admin, jika kosong pakai fallback statis/default.
  const activeQrisCode = qrisCode || localStorage.getItem("rentmate_admin_qris_code") || staticQrisUrl || DEFAULT_QRIS;

  // Load payment settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      const savedQris = localStorage.getItem("rentmate_admin_qris_code");
      if (savedQris) {
        setQrisCode(savedQris);
      } else {
        setQrisCode(DEFAULT_QRIS);
      }

      const savedBanks = localStorage.getItem("rentmate_bank_accounts");
      if (savedBanks) {
        try {
          setBankAccounts(JSON.parse(savedBanks));
        } catch (error) {
          console.error("Failed to parse bank accounts from localStorage:", error);
        }
      }
    };

    loadSettings();
    window.addEventListener("storage", loadSettings);
    return () => {
      window.removeEventListener("storage", loadSettings);
    };
  }, []);

  // Fungsi untuk membuat kunci localStorage yang unik
  const getPaymentCodeStorageKey = (userId: string, talentId: string, date: string, time: string) => {
    return `rentmate_payment_code_${userId}_${talentId}_${date}_${time}`;
  };

  // Fungsi untuk mendapatkan atau membuat payment code yang stabil
  const getOrCreateStablePaymentCode = () => {
    const currentUser = getCurrentUserOrMitra();
    if (!currentUser || !id || !bookingData.date || !bookingData.time) {
      return "";
    }

    const storageKey = getPaymentCodeStorageKey(currentUser.data.id, id, bookingData.date, bookingData.time);
    let code = localStorage.getItem(storageKey);
    if (!code) {
      const year = new Date().getFullYear();
      const random = Math.random().toString(36).substr(2, 5).toUpperCase();
      code = `PAY-${year}-${random}`;
      localStorage.setItem(storageKey, code);
    }

    return code;
  };

  const generateTimeSlots = () => {
    const slots = [];

    // Pagi (08:00 - 11:00)
    for (let hour = 8; hour < 12; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }


    for (let hour = 12; hour < 15; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }

    for (let hour = 15; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }

    for (let hour = 18; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }

    return slots;
  };


  useEffect(() => {
    if (!id) return;

    const currentUser = getCurrentUserOrMitra();
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // --- TAMBAHAN KODE: Mencegah Mitra booking diri sendiri ---
    if (currentUser.type === "mitra" && (currentUser.data.id === id || currentUser.data.talentId === id)) {
      toast({
        title: "Pemesanan Ditolak",
        description: "Kamu tidak bisa mem-booking dirimu sendiri.",
        variant: "destructive",
      });
      navigate("/talents");
      return;
    }
    // ----------------------------------------------------------

    const allBookings = getBookings();
    const now = new Date();
    const userId = currentUser.type === "mitra" ? currentUser.data.talentId : currentUser.data.id;

    // Cari booking yang masih "menggantung" (belum approved/completed)
    const existingBooking = allBookings.find((b) => {
      // 1. Pastikan booking ini milik user dan talent yang bersangkutan
      if (b.userId !== userId || b.talentId !== id) {
        return false;
      }

      // 2. Jangan resume pesanan yang sudah terminal atau menunggu refund.
      // karena user mungkin ingin membuat pesanan BARU.
      if (
        b.approvalStatus === "approved" ||
        b.approvalStatus === "completed" ||
        b.approvalStatus === "rejected" ||
        b.approvalStatus === "expired" ||
        b.paymentStatus === "refund_pending" ||
        b.paymentStatus === "refunded"
      ) {
        return false;
      }

      // 3. Jika statusnya masih draft, pending_payment, pending_approval, kita resume ini.
      return true;
    });

    if (!existingBooking) {
      // Reset state jika tidak ada booking aktif
      setCurrentBookingId(null);
      setBookingStatus("draft");
      setStep(1);

      // Coba ambil kode dari localStorage untuk booking yang sedang dibuat
      const potentialCode = getOrCreateStablePaymentCode();
      if (potentialCode) {
        setPaymentCode(potentialCode);
      } else {
        setPaymentCode("");
      }
      return;
    }

    // Simpan data booking untuk digunakan saat rating
    setCurrentBooking(existingBooking);
    setCurrentBookingId(existingBooking.id);
    setBookingData({
       duration: existingBooking.duration,
       purpose: existingBooking.purpose,
       type: existingBooking.type,
       meetingCity: existingBooking.meetingCity || "",
       date: existingBooking.date,
       time: existingBooking.time,
       notes: existingBooking.notes || "",
     });

    // Gunakan payment code yang sudah ada dari booking
    if (existingBooking.paymentCode) {
      setPaymentCode(existingBooking.paymentCode);
    } else {
      const fallbackCode = getOrCreateStablePaymentCode();
      setPaymentCode(fallbackCode);
    }

    // Prioritaskan status pembayaran dan persetujuan
    if (existingBooking.paymentStatus === "pending" && !existingBooking.paymentProof) {
      setBookingStatus("pending_payment");
      setStep(3);
      return;
    }

    if (existingBooking.approvalStatus === "pending_approval") {
      setBookingStatus("pending_approval");
      setStep(4);
      return;
    }

    if (existingBooking.approvalStatus === "pending_mitra") {
      setBookingStatus("pending_mitra");
      setStep(4);
      return;
    }

    // Jika statusnya approved, langsung ke step 5 (Chat)
    if (existingBooking.approvalStatus === "approved") {
      setBookingStatus("approved");
      setStep(5); // Langsung ke step 5 (Chat)
      return;
    }

    // Hapus blok pengecekan endTime yang merubah status menjadi completed,
    // karena kita sekarang mengizinkan booking baru untuk dibuat,
    // pengecekan completed ditangani di tempat lain (chat/history)

  }, [id]); // Dependency tetap [id]

  useEffect(() => {
    if (!id) return;

    const refreshSlotAvailability = () => setBookingRefreshKey((value) => value + 1);
    const unsubscribe = subscribeToBookings(refreshSlotAvailability);
    void refreshBookingsFromSupabase().then(refreshSlotAvailability);

    return unsubscribe;
  }, [id]);

  // Bersihkan localStorage jika status berubah atau booking dibatalkan
  useEffect(() => {
    const currentUser = getCurrentUserOrMitra();
    if (!currentUser || !id || !bookingData.date || !bookingData.time) return;

    const storageKey = getPaymentCodeStorageKey(currentUser.data.id, id, bookingData.date, bookingData.time);

    // Jika booking selesai, ditolak, atau pengguna kembali ke draft dari status yang lebih tinggi
    if (bookingStatus === 'completed' || bookingStatus === 'rejected' || (bookingStatus === 'draft' && currentBookingId)) {
      localStorage.removeItem(storageKey);
    }
  }, [bookingStatus, currentBookingId, id, bookingData.date, bookingData.time]);

  // Perbaiki logika subscribe to booking updates
  useEffect(() => {
    if (!currentBookingId) return;

    const checkStatus = () => {
      const booking = getBookingById(currentBookingId);
      if (!booking) return;

      // Update current booking data
      setCurrentBooking(booking);

      // Pastikan payment code tidak berubah
      if (booking.paymentCode && booking.paymentCode !== paymentCode) {
        setPaymentCode(booking.paymentCode);
      }

      if (booking.approvalStatus === "pending_mitra" && bookingStatus !== "pending_mitra") {
        setBookingStatus("pending_mitra");
        setStep(4);
        toast({
          title: "Pembayaran Diverifikasi",
          description: "Pesanan diteruskan ke mitra dan menunggu persetujuannya.",
        });
      }

      // Pastikan status approved langsung ke step 5 (Chat)
      if (booking.approvalStatus === "approved" && bookingStatus !== "approved") {
        setBookingStatus("approved");
        setStep(5); // Langsung ke step 5 (Chat)
        toast({
          title: "Pemesanan Disetujui!",
          description: "Admin menyetujui pemesanan. Anda sekarang dapat mengobrol dengan talent.",
        });
      }

      if (booking.approvalStatus === "rejected" && bookingStatus !== "rejected") {
        setBookingStatus("rejected");
        setStep(4);
        toast({
          title: "Pemesanan Ditolak",
          description: "Admin menolak pemesanan Anda.",
          variant: "destructive",
        });
      }
    };

    const unsubscribe = subscribeToBookings(checkStatus);
    checkStatus();

    return () => {
      unsubscribe();
    };
  }, [currentBookingId, bookingStatus, paymentCode, toast]);

  // State untuk QRIS amount sesuai total harga pemesanan
  const [qrisAmount, setQrisAmount] = useState<number>(0);

  // Gunakan data dari currentBooking jika displayTalent tidak tersedia
  const talentForDisplay = displayTalent || (currentBooking ? {
    id: currentBooking.talentId,
    name: currentBooking.talentName,
    photo: currentBooking.talentPhoto,
    pricePerHour: currentBooking.total / currentBooking.duration,
    city: "Unknown",
    skills: [],
    rating: "0"
  } : null);

  // Periksa apakah user memesan akun profil sendiri
  const activeUserSession = useMemo(() => getCurrentUserOrMitra(), []);
  const isSelf = useMemo(() => {
    if (!activeUserSession?.data || !talentForDisplay) return false;
    const sessionData = activeUserSession.data;
    const sessionId = sessionData.id || sessionData.talentId || sessionData.user_id;
    const sessionEmail = (sessionData.email || "").trim().toLowerCase();
    const sessionUsername = (sessionData.username || "").trim().toLowerCase();

    const talentId = talentForDisplay.id || talentForDisplay.talentId || (talentForDisplay as any).user_id;
    const talentEmail = (talentForDisplay.email || "").trim().toLowerCase();
    const talentUsername = ((talentForDisplay as any).username || "").trim().toLowerCase();

    // 1. Cek kecocokan ID akun
    if (sessionId && talentId && String(sessionId) === String(talentId)) return true;

    // 2. Cek kecocokan Email akun (jika user mendaftar sebagai mitra dengan email yang sama)
    if (sessionEmail && talentEmail && sessionEmail === talentEmail) return true;

    // 3. Cek username akun (jika kedua sisi memiliki username yang identik)
    if (sessionUsername && talentUsername && sessionUsername === talentUsername) return true;

    return false;
  }, [activeUserSession, talentForDisplay]);

  useEffect(() => {
    if (!isInitialLoading && isSelf) {
      toast({
        title: "Pemesanan Tidak Diizinkan",
        description: "Kamu tidak bisa memesan akun profil milikmu sendiri.",
        variant: "destructive",
      });
    }
  }, [isInitialLoading, isSelf, toast]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Deteksi layanan dan tarif aktif berdasarkan tujuan pemesanan
  const talentServices = useMemo(() => {
    return getDefaultServicesForTalent(talentForDisplay);
  }, [talentForDisplay]);

  const activeService = useMemo(() => {
    if (!talentServices || talentServices.length === 0) return null;
    const purpose = (bookingData.purpose || "").toLowerCase();

    if (bookingData.type === "online") {
      if (purpose.includes("game")) {
        return talentServices.find((service) => service.id === "game-online") || talentServices.find((service) => service.id === "online-session") || talentServices[0];
      }
      return talentServices.find((service) => service.id === "online-session") || talentServices[0];
    }

    if (purpose.includes("travel") || purpose.includes("liburan") || purpose.includes("hiking")) {
      if (bookingData.packageOption === "paket-seharian") {
        return talentServices.find((s) => s.id === "traveling-seharian" || s.unit === "hari") || talentServices.find((s) => s.id === "traveling-lokal") || talentServices[0];
      }
      return talentServices.find((s) => s.id === "traveling-lokal" || s.unit === "paket") || talentServices.find((s) => s.id === "traveling-seharian") || talentServices[0];
    }
    if (purpose.includes("event") || purpose.includes("acara") || purpose.includes("pesta")) {
      return talentServices.find((s) => s.id === "event" || s.unit === "acara") || talentServices[0];
    }
    if (purpose.includes("olahraga")) {
      return talentServices.find((s) => s.id === "olahraga") || talentServices[0];
    }
    if (purpose.includes("nonton")) {
      return talentServices.find((s) => s.id === "nonton") || talentServices[0];
    }
    return talentServices.find((s) => s.id === "kuliner") || talentServices[0];
  }, [talentServices, bookingData.purpose, bookingData.packageOption, bookingData.type]);

  const activeUnitRate = activeService ? activeService.price : (talentForDisplay?.pricePerHour || talentForDisplay?.price || 50000);
  const activeUnit: ServicePriceUnit = activeService ? activeService.unit : "jam";
  const activeUnitLabel = activeService ? activeService.unitLabel : "/ jam";
  const rawSupportedActivities = displayTalent?.supportedActivities ?? displayTalent?.supported_activities;
  const supportedActivityIds = rawSupportedActivities != null
    ? normalizeMitraActivities(rawSupportedActivities)
    : inferLegacyMitraActivities(
        displayTalent?.category,
        displayTalent?.skills,
        displayTalent?.hobbies,
        displayTalent?.specialistSkills,
        displayTalent?.description,
        displayTalent?.bio,
      );
  const supportedActivityLabels = getMitraActivityLabels(supportedActivityIds);
  const purposesForMeetingType = bookingData.type === "online"
    ? [...bookingPurposes.filter((purpose) => !offlineOnlyPurposes.includes(purpose)), ...onlineOnlyPurposes]
    : bookingPurposes;
  const availableBookingPurposes = getAvailableBookingPurposes(
    supportedActivityIds,
    purposesForMeetingType,
  );
  const eventPurposes = availableBookingPurposes.filter((purpose) => purpose.startsWith("Event /") && purpose !== "Event / Acara");
  const nonEventPurposes = availableBookingPurposes.filter((purpose) => !purpose.startsWith("Event /") && purpose !== "Pesta / Party");
  const eventActivityPurposes = purposesForMeetingType.filter((purpose) =>
    purpose.startsWith("Event /") && purpose !== "Event / Acara" &&
    (BOOKING_PURPOSE_ACTIVITIES[purpose] || []).some((activityId) => supportedActivityIds.includes(activityId)),
  );
  const isCustomPurpose = bookingData.purpose.startsWith("Lainnya:") || bookingData.purpose.startsWith("Event lainnya:") || bookingData.purpose.startsWith("Event / Acara Lainnya:");
  const isEventSelected = bookingData.purpose === "Event / Acara" || eventPurposes.includes(bookingData.purpose) || bookingData.purpose.startsWith("Event / Acara Lainnya:");
  const hasSupportedActivities = supportedActivityIds.length > 0;

  // Perhitungan total harga sesuai rumus: Tarif Satuan × Durasi/Kuantitas
  const totalPrice = calculateServiceTotal(activeUnitRate, activeUnit, bookingData.duration);
  const displayAmount = totalPrice;

  useEffect(() => {
    if (totalPrice > 0) {
      setQrisAmount(totalPrice);
    }
  }, [totalPrice]);

  // True jika saldo dompet user kurang dari total pembayaran.
  const saldoInsufficient = walletBalance < totalPrice;

  // Render loading state secara aman setelah semua hook terpanggil
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm pt-16 md:pt-24 pb-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (isSelf) {
    return (
      <div className="min-h-screen bg-gradient-warm pt-20 md:pt-28 pb-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-lg border-primary/20">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pemesanan Tidak Diizinkan</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Kamu sedang membuka halaman pemesanan untuk profil akunmu sendiri. Pengguna atau mitra tidak dapat memesan layanannya sendiri.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="hero" onClick={() => navigate("/talents")}>
              Cari Teman Lain
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Ke Beranda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!id || !talentForDisplay) {
    return (
      <div className="min-h-screen bg-gradient-warm pt-20 md:pt-28 pb-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-lg border-dashed">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Mitra Tidak Ditemukan</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Data mitra yang ingin kamu pesan tidak ditemukan atau layanannya sedang tidak aktif. Silakan pilih mitra lain di halaman Cari Teman.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="hero" onClick={() => navigate("/talents")}>
              Cari Teman Aktivitas
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Ke Beranda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleNext = () => {
    if (bookingStatus !== "draft") return;
    if (step === 1 && bookingData.type === "offline") {
      if (!talentForDisplay?.city) {
        toast({
          title: "Lokasi mitra belum tersedia",
          description: "Pemesanan offline belum bisa dilanjutkan karena kota mitra belum terdata.",
          variant: "destructive",
        });
        return;
      }
      setIsMeetingLocationDialogOpen(true);
      return;
    }
    if (step === 2) {
      if (!bookingData.time) {
        toast({
          title: "Waktu belum dipilih",
          description: "Silakan pilih waktu mulai pemesanan terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }
      const effectiveHours = activeUnit === "hari" ? 8 : activeUnit === "paket" ? 6 : activeUnit === "acara" ? 4 : bookingData.duration;
      if (isTimeSlotExceedingOperatingHours(bookingData.time, effectiveHours)) {
        const details = getBookingTimeDetails(bookingData.time, effectiveHours);
        const latestStart = getLatestStartTimeForDuration(effectiveHours);
        toast({
          title: "Waktu Tidak Mencukupi",
          description: `Pemesanan mulai pukul ${bookingData.time} akan selesai pukul ${details.formattedEndTime} WIB (melebihi jam operasional mitra 22:00 WIB). Batas waktu mulai maksimal adalah pukul ${latestStart} WIB.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const confirmMeetingLocation = () => {
    setIsMeetingLocationDialogOpen(false);
    setStep(step + 1);
  };

  const handleBack = () => {
    if (bookingStatus === "pending_payment") {
      setBookingStatus("draft");
      setStep(2);
      return;
    }
    if (bookingStatus !== "draft") return;
    if (step <= 1) return;
    setStep(step - 1);
  };

const handlePayment = async () => {
    const currentUser = getCurrentUserOrMitra();

    if (!currentUser) {
      toast({
        title: "Error",
        description: "Anda harus login untuk melakukan pemesanan",
        variant: "destructive",
      });
      return;
    }

    if (isProcessing) return;

    if (isTimeSlotExceedingOperatingHours(bookingData.time, bookingData.duration)) {
      const details = getBookingTimeDetails(bookingData.time, bookingData.duration);
      const latestStart = getLatestStartTimeForDuration(bookingData.duration);
      toast({
        title: "Waktu Tidak Mencukupi",
        description: `Pemesanan ${bookingData.duration} jam mulai pukul ${bookingData.time} akan selesai pukul ${details.formattedEndTime} WIB (melebihi jam operasional mitra 22:00 WIB). Batas waktu mulai maksimal adalah pukul ${latestStart} WIB.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Validasi maksimal 5 pesanan aktif
    const myActiveBookings = getBookings().filter(b =>
      b.userId === currentUser.data.id &&
      b.approvalStatus !== "rejected" &&
      b.approvalStatus !== "completed" &&
      b.approvalStatus !== "expired" &&
      b.paymentStatus !== "refund_pending" &&
      b.paymentStatus !== "refunded" &&
      b.id !== currentBookingId
    );

    if (myActiveBookings.length >= 5) {
      toast({
        title: "Batas Pemesanan",
        description: "Kamu tidak bisa memiliki lebih dari 5 pesanan aktif dalam waktu bersamaan. Selesaikan pesanan sebelumnya.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    try {
      const newPaymentCode = getOrCreateStablePaymentCode();

      // Validasi mode layanan dan lokasi sebelum proses pembayaran.
      const talentAvailability = String(talentForDisplay.availability || "both").toLowerCase();
      const supportsSelectedMode = talentAvailability === "both" || talentAvailability.includes(bookingData.type);
      if (!supportsSelectedMode) {
        toast({
          title: "Mode layanan tidak tersedia",
          description: `Mitra ini hanya menerima layanan ${talentAvailability === "online" ? "online" : "offline"}. Silakan pilih mode yang sesuai.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Untuk offline, yang menentukan adalah kota tujuan pertemuan,
      // bukan lokasi user saat ini. User bisa sedang di Jogja dan memesan
      // mitra Jakarta untuk jadwal besok di Jakarta. Kota mitra menjadi
      // lokasi offline yang harus dituju; online tetap bebas kota.
      if (bookingData.type === "offline" && !talentForDisplay.city) {
        toast({
          title: "Lokasi mitra belum tersedia",
          description: "Pemesanan offline belum bisa dilanjutkan karena kota mitra belum terdata.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Ambil data terbaru sebelum validasi agar slot tidak lolos karena cache lama.
      await refreshBookingsFromSupabase();

      // Validasi bentrok jadwal sebelum booking disimpan
      const isConflict = isTimeSlotBooked(
        talentForDisplay.id,
        bookingData.date,
        bookingData.time,
        bookingData.duration
      );

      if (isConflict) {
        toast({
          title: "Jadwal Bentrok!",
          description: "Maaf, talent ini sudah memiliki jadwal yang disetujui pada waktu tersebut. Silakan pilih waktu lain.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (currentBookingId) {
        // UPDATE EXISTING BOOKING
        const updated = await updateBooking(currentBookingId, {
          purpose: bookingData.purpose,
          type: bookingData.type,
          date: bookingData.date,
          time: bookingData.time,
          duration: bookingData.duration,
          total: totalPrice,
          notes: bookingData.notes,
          paymentCode: newPaymentCode,
        });
        if (!updated) {
          throw new Error("Gagal menyimpan perubahan pesanan.");
        }
      } else {
        // CREATE NEW BOOKING
        const booking = await addBooking({
          talentId: talentForDisplay.id,
          talentName: talentForDisplay.name,
          talentPhoto: talentForDisplay.photo,
          purpose: bookingData.purpose,
          type: bookingData.type,
          meetingCity: bookingData.type === "offline" ? talentForDisplay.city : "Online",
          date: bookingData.date,
          time: bookingData.time,
          duration: bookingData.duration,
          total: totalPrice,
          notes: bookingData.notes,
          paymentStatus: "pending",
          approvalStatus: "pending_approval",
          paymentCode: newPaymentCode,
        });
        setCurrentBookingId(booking.id);
      }

      setPaymentCode(newPaymentCode);
      setBookingStatus("pending_payment");
      setStep(3);
    } catch (error: any) {
      console.error("Gagal lanjut ke pembayaran:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      const isNetworkError = /failed to fetch|network|fetch/i.test(errorMessage);
      toast({
        title: isNetworkError ? "Koneksi Bermasalah" : "Pemesanan Tidak Dapat Dilanjutkan",
        description: isNetworkError
          ? "Periksa koneksi lalu cek Pemesanan Saya sebelum mencoba lagi."
          : errorMessage || "Silakan coba kembali beberapa saat lagi.",
        variant: isNetworkError ? "default" : "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


const handleConfirmPayment = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (!paymentMethod) {
        toast({
          title: "Pilih metode pembayaran",
          variant: "destructive",
        });
        return;
      }

      if (
        (paymentMethod === "bca" ||
          paymentMethod === "bri" ||
          paymentMethod === "mandiri" ||
          paymentMethod === "qris") &&
        !paymentProof
      ) {
        toast({
          title: "Bukti transfer wajib diupload",
          description: "Silakan unggah bukti pembayaran terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }

      const currentUser = getCurrentUserOrMitra();
      if (!currentUser) {
        toast({
          title: "Error",
          description: "Sesi login tidak ditemukan, silakan login ulang.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Pembayaran via Saldo Dompet: potong saldo user (tidak perlu bukti transfer).
      if (paymentMethod === "saldo") {
        if (currentUser.type !== "user") {
          toast({
            title: "Saldo dompet tidak tersedia",
            description: "Metode saldo dompet hanya untuk akun pengguna.",
            variant: "destructive",
          });
          return;
        }

        const profile = await getCurrentUser();
        const currentBalance = profile?.wallet ?? walletBalance;

        if (currentBalance < totalPrice) {
          toast({
            title: "Saldo tidak cukup",
            description: `Saldo dompet kamu ${formatPrice(currentBalance)}, butuh ${formatPrice(totalPrice)}.`,
            variant: "destructive",
          });
          return;
        }

        const deducted = await updateCurrentUser({ wallet: currentBalance - totalPrice });
        if (!deducted) {
          throw new Error("Gagal memotong saldo dompet");
        }
        setWalletBalance(deducted.wallet);
      }

      const autoTransferAmount = totalPrice;
      const autoTransferTime = new Date().toISOString();

      if (!currentBookingId) {
        throw new Error("ID Booking tidak ditemukan");
      }

      // UPDATE DATA PEMESANAN YANG SUDAH ADA
      const updated = await updateBookingPayment(currentBookingId, {
        paymentMethod: paymentMethod as "qris" | "bca" | "bri" | "mandiri" | "saldo",
        paymentCode: paymentCode,
        // Metode saldo dompet tidak memerlukan bukti transfer.
        paymentProof: paymentMethod === "saldo" ? "PAID_VIA_WALLET" : paymentProof,
        transferAmount: autoTransferAmount,
        transferTime: autoTransferTime,
      });

      if (!updated) {
        throw new Error("Gagal mengupdate pembayaran ke Supabase");
      }

      setBookingStatus("pending_approval");
      setStep(4);

      // Notifikasi untuk pemesan
      addNotificationForUser(currentUser.data.id, {
        title: "Pembayaran Pemesanan Berhasil",
        message: `Pembayaran kamu untuk mitra ${talentForDisplay.name} sedang diverifikasi oleh admin.`,
        type: "payment"
      });

      // Notifikasi untuk mitra juga harus dikirim setelah pembayaran masuk.
      // Sebelumnya hanya pemesan yang mendapat notifikasi, sehingga mitra
      // hanya melihat perubahan dari kartu dashboard tanpa pemberitahuan baru.
      addNotificationForUser(currentBookingId ? getBookingById(currentBookingId)?.talentId || talentForDisplay.id : talentForDisplay.id, {
        title: "Permintaan Pemesanan Baru 📅",
        message: `${currentUser.data.name || "Seorang pengguna"} mengirim pemesanan ${talentForDisplay.name} untuk "${getBookingById(currentBookingId || "")?.purpose || "layanan"}". Silakan cek dan berikan persetujuan.`,
        type: "booking"
      });

      toast({
        title: "Pembayaran Berhasil Dikirim! 🎉",
        description: "Menunggu persetujuan admin & mitra.",
      });
    } catch (error: any) {
      console.error("CONFIRM PAYMENT ERROR (SUPABASE):", error);

      toast({
        title: "ERROR SUPABASE",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentProofUpload = async (file: File) => {
    setPaymentProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        // Validasi tujuan pemesanan
        if (isCustomPurpose) {
          return bookingData.duration > 0 && customPurpose.trim().length > 0;
        }
        if (bookingData.purpose === "Event / Acara") return false;
        return bookingData.duration > 0 && bookingData.purpose.trim().length > 0;
      case 2:
        return (
          Boolean(bookingData.date) &&
          Boolean(bookingData.time) &&
          !isTimeSlotExceedingOperatingHours(bookingData.time, bookingData.duration)
        );
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getStatusBadge = () => {
    switch (bookingStatus) {
      case "pending_payment":
        return <Badge variant="warning">Menunggu Pembayaran</Badge>;
      case "pending_approval":
        return <Badge variant="accent">Menunggu Persetujuan Admin</Badge>;
      case "pending_mitra":
        return <Badge variant="accent">Menunggu Persetujuan Mitra</Badge>;
      case "approved":
        return <Badge variant="success">Disetujui</Badge>;
      case "completed":
        return <Badge variant="default">Selesai</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm pt-16 md:pt-24 pb-8">
      <div className="container max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Pesan Teman</h1>
            <p className="text-muted-foreground">Lengkapi detail pemesanan kamu</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress Steps - HANYA 5 STEP */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {[
            { num: 1, label: "Detail" },
            { num: 2, label: "Jadwal" },
            { num: 3, label: "Bayar" },
            { num: 4, label: "Approval" },
            { num: 5, label: "Chat" },
          ].map((s, i) => {
            const stepCompleted =
              step > s.num ||
              (s.num <= 3 && bookingStatus !== "draft") ||
              (s.num === 4 && (bookingStatus === "pending_approval" || bookingStatus === "approved" || bookingStatus === "rejected")) ||
              (s.num === 5 && bookingStatus === "approved");

            const stepActive =
              step === s.num ||
              (s.num === 4 && (bookingStatus === "pending_approval" || bookingStatus === "rejected")) ||
              (s.num === 5 && bookingStatus === "approved");

            const isPending = s.num === 4 && bookingStatus === "pending_approval";
            const isRejected = s.num === 4 && bookingStatus === "rejected";
            const isApproved = bookingStatus === "approved";

            return (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold transition-all text-sm",
                      stepCompleted || stepActive
                        ? "bg-primary text-primary-foreground shadow-orange"
                        : "bg-muted text-muted-foreground",
                      s.num === 4 && isApproved && "bg-green-500",
                      s.num === 5 && isApproved && "bg-green-500",
                      isRejected && "bg-red-500"
                    )}
                  >
                    {stepCompleted ? (
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                    ) : isPending ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    ) : s.num === 5 ? (
                      <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      s.num
                    )}
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground whitespace-nowrap">{s.label}</span>
                </div>
                {i < 4 && (
                  <div
                    className={cn(
                      "w-8 md:w-16 h-1 mx-1 md:mx-2 rounded-full transition-all",
                      (step > s.num ||
                       (s.num <= 3 && bookingStatus !== "draft") ||
                       (s.num === 4 && (bookingStatus === "pending_approval" || bookingStatus === "approved" || bookingStatus === "rejected")) ||
                       (s.num === 5 && bookingStatus === "approved"))
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          {/* Form Section */}
          <div className="min-w-0">
            <Card className="p-4 sm:p-6">
              {step === 1 && bookingStatus === "draft" && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold">Detail Pemesanan</h2>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Tipe Pertemuan
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer",
                          bookingData.type === "offline" &&
                            "border-primary ring-2 ring-primary/20"
                        )}
                        onClick={() =>
                          setBookingData({
                            ...bookingData,
                            type: "offline",
                            purpose: onlineOnlyPurposes.includes(bookingData.purpose) ? "" : bookingData.purpose,
                          })
                        }
                      >
                        <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold">Offline</h4>
                        <p className="text-xs text-muted-foreground">
                          Bertemu langsung
                        </p>
                      </Card>
                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer",
                          bookingData.type === "online" &&
                            "border-primary ring-2 ring-primary/20"
                        )}
                        onClick={() =>
                          setBookingData({
                            ...bookingData,
                            type: "online",
                            purpose: offlineOnlyPurposes.includes(bookingData.purpose) ? "" : bookingData.purpose,
                          })
                        }
                      >
                        <Video className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold">Online</h4>
                        <p className="text-xs text-muted-foreground">
                          Video call
                        </p>
                      </Card>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <div className="mb-3">
                      <label className="text-sm font-semibold block">
                        Tujuan Pemesanan / Aktivitas
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {bookingData.type === "online"
                          ? "Pilih aktivitas yang bisa dilakukan secara online"
                          : "Pilih aktivitas yang dilakukan dengan bertemu langsung"}
                      </span>
                    </div>

                    {!hasSupportedActivities && (
                      <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        {displayTalent?.name || "Mitra ini"} belum memperbarui daftar aktivitas layanannya.
                      </p>
                    )}

                    {hasSupportedActivities && availableBookingPurposes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nonEventPurposes.map((purpose) => {
                          const isSelected = purpose === "Lainnya" ? bookingData.purpose.startsWith("Lainnya:") : bookingData.purpose === purpose;
                          return <Button key={purpose} type="button" variant={isSelected ? "default" : "outline"} size="sm" className={cn("h-11 justify-start whitespace-normal text-left", !isSelected && "border-orange-200 bg-orange-50/30 hover:bg-orange-50")} onClick={() => {
                            if (purpose === "Lainnya") {
                              setBookingData({ ...bookingData, purpose: "Lainnya:", duration: 2 });
                              setCustomPurpose("");
                            } else {
                              const isTravel = purpose.includes("Traveling") || purpose.includes("Hiking");
                              setBookingData({ ...bookingData, purpose, duration: isTravel ? 1 : 2, packageOption: isTravel ? "paket-lokal" : undefined });
                              setCustomPurpose("");
                            }
                          }}>{purpose}</Button>;
                        })}
                        {eventPurposes.length > 0 && (
                          <Button type="button" variant={isEventSelected ? "default" : "outline"} size="sm" className={cn("h-11 justify-start whitespace-normal text-left", !isEventSelected && "border-orange-200 bg-orange-50/30 hover:bg-orange-50")} onClick={() => {
                            setBookingData({ ...bookingData, purpose: isEventSelected ? "" : "Event / Acara", duration: 1 });
                            setCustomPurpose("");
                          }}>Event / Acara</Button>
                        )}
                      </div>
                    ) : (
                      <p className="rounded-lg border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Mitra belum menyediakan aktivitas untuk metode pertemuan ini.</p>
                    )}
                    {isEventSelected && (
                      <div className="mt-3 space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
                        <div>
                          <p className="text-sm font-semibold">Pilih jenis acara</p>
                          <p className="text-xs text-muted-foreground">Pilih acara yang sesuai dengan kegiatan dan keahlian mitra.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {eventActivityPurposes.map((purpose) => {
                            const isOtherEvent = purpose === "Event / Acara Lainnya";
                            const isSelected = isOtherEvent ? bookingData.purpose.startsWith("Event / Acara Lainnya:") : bookingData.purpose === purpose;
                            return (
                              <Button key={purpose} type="button" variant={isSelected ? "default" : "outline"} size="sm" className={cn("h-11 justify-start whitespace-normal text-left", !isSelected && "border-orange-200 bg-white hover:bg-orange-50")} onClick={() => {
                                setBookingData({ ...bookingData, purpose: isOtherEvent ? "Event / Acara Lainnya:" : purpose, duration: 1 });
                                setCustomPurpose("");
                              }}>{purpose === "Event / Acara Lainnya" ? "Acara lainnya" : purpose.replace("Event / ", "")}</Button>
                            );
                          })}
                        </div>
                        {bookingData.purpose.startsWith("Event / Acara Lainnya:") && (
                          <div className="space-y-1.5">
                            <label htmlFor="custom-event-purpose" className="text-sm font-medium">Tulis acara kamu</label>
                            <Input id="custom-event-purpose" placeholder="Contoh: acara tunangan, bukber..." value={customPurpose} onChange={(e) => {
                              setCustomPurpose(e.target.value);
                              setBookingData({ ...bookingData, purpose: `Event / Acara Lainnya: ${e.target.value}` });
                            }} />
                          </div>
                        )}
                      </div>
                    )}
                    {bookingData.purpose.startsWith("Lainnya:") && (
                      <div className="mt-3 space-y-1.5">
                        <label htmlFor="custom-activity-purpose" className="text-sm font-medium">Tuliskan aktivitas</label>
                        <Input id="custom-activity-purpose" placeholder="Tuliskan tujuan pemesanan..." value={customPurpose} onChange={(e) => {
                          setCustomPurpose(e.target.value);
                          setBookingData({ ...bookingData, purpose: `Lainnya: ${e.target.value}` });
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Duration / Package Selection based on Purpose */}
                  <div>
                    {bookingData.purpose.includes("Traveling") || bookingData.purpose.includes("Hiking") ? (
                      <div className="space-y-3">
                        <label className="text-sm font-medium block">
                          Pilihan Paket Wisata
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={bookingData.packageOption === "paket-lokal" ? "default" : "outline"}
                            className="h-auto py-2.5 px-3 flex flex-col items-start text-left"
                            onClick={() =>
                              setBookingData({ ...bookingData, packageOption: "paket-lokal", duration: 1 })
                            }
                          >
                            <span className="font-semibold text-xs">Paket Lokal (4–8 jam)</span>
                            <span className="text-[10px] opacity-80 mt-0.5">Eksplorasi spot kota / setengah hari</span>
                          </Button>

                          <Button
                            type="button"
                            variant={bookingData.packageOption === "paket-seharian" ? "default" : "outline"}
                            className="h-auto py-2.5 px-3 flex flex-col items-start text-left"
                            onClick={() =>
                              setBookingData({ ...bookingData, packageOption: "paket-seharian", duration: 1 })
                            }
                          >
                            <span className="font-semibold text-xs">Paket Seharian (Maks. 8 jam/hari)</span>
                            <span className="text-[10px] opacity-80 mt-0.5">Keliling wisata seharian</span>
                          </Button>
                        </div>

                        {bookingData.packageOption === "paket-seharian" && (
                          <div className="pt-2">
                            <label className="text-xs font-medium mb-1.5 block">Jumlah Hari Layanan:</label>
                            <div className="flex gap-2">
                              {[1, 2, 3].map((d) => (
                                <Button
                                  key={d}
                                  type="button"
                                  variant={bookingData.duration === d ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setBookingData({ ...bookingData, duration: d })}
                                >
                                  {d} Hari
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-muted/60 border text-[11px] text-muted-foreground leading-relaxed">
                          ⚠️ <strong>Batas Durasi Layanan:</strong> Paket harian dibatasi maksimal 8 jam layanan aktif per hari (bukan 24 jam non-stop) demi keamanan dan kenyamanan bersama.
                        </div>
                      </div>
                    ) : bookingData.purpose.includes("Event") || bookingData.purpose.includes("Pesta") ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium block">
                          Durasi Layanan Event
                        </label>
                        <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold">Paket Pendamping Acara (1 Sesi)</span>
                            <p className="text-muted-foreground text-[11px]">Tarif flat pendamping kondangan, gathering, wisuda, atau pesta.</p>
                          </div>
                          <Badge variant="secondary" className="font-bold">1 Acara</Badge>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Durasi Layanan (jam)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6].map((h) => (
                            <Button
                              key={h}
                              variant={bookingData.duration === h ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                setBookingData({ ...bookingData, duration: h })
                              }
                            >
                              {h} jam
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transparansi Rincian Biaya & Klausul Biaya Tambahan */}
                  <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-orange-500" />
                        Rincian Perhitungan Biaya Jasa Mitra
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white border-orange-200 text-orange-800">
                        Transparan & Jelas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-background/80 border border-orange-200/50">
                        <span className="text-muted-foreground block text-[11px]">Tarif Satuan Layanan:</span>
                        <span className="font-bold text-foreground text-sm">
                          {formatPrice(activeUnitRate)} <span className="text-xs font-normal text-muted-foreground">{activeUnitLabel}</span>
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-background/80 border border-orange-200/50">
                        <span className="text-muted-foreground block text-[11px]">Durasi / Kuantitas:</span>
                        <span className="font-bold text-foreground text-sm">
                          {bookingData.duration} {activeUnit}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-orange-100/70 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-800 flex items-center justify-between text-xs">
                      <span className="font-medium text-orange-950 dark:text-orange-200">
                        Perhitungan: <strong className="font-bold">{formatPrice(activeUnitRate)} × {bookingData.duration} {activeUnit}</strong>
                      </span>
                      <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">
                        = {formatPrice(totalPrice)}
                      </span>
                    </div>

                    <div className="text-[11px] text-orange-900 dark:text-orange-300 leading-relaxed bg-background/70 p-2.5 rounded-lg border border-orange-200/60">
                      <strong>⚠️ Biaya Tambahan:</strong> {EXTRA_EXPENSES_DISCLAIMER}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Kota / lokasi pertemuan</label>
                    <Input
                      value={bookingData.type === "offline" ? talentForDisplay.city || bookingData.meetingCity : "Online"}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {bookingData.type === "offline"
                        ? "Lokasi otomatis mengikuti kota mitra. Kamu tetap bisa memesan meski sedang berada di kota lain."
                        : "Pertemuan online tidak terikat kota."}
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && bookingStatus === "draft" && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold">Jadwal & Waktu</h2>

                  {/* Operational Hours Informational Banner */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Ketentuan Jam Operasional (08:00 – 22:00 WIB)</p>
                      <p className="leading-relaxed">
                        Layanan mitra beroperasi mulai pukul <strong className="font-semibold">08:00 WIB</strong> hingga maksimal selesai pukul <strong className="font-semibold">22:00 WIB</strong>.
                        Untuk layanan ini (<strong className="font-semibold">{bookingData.duration} {activeUnit}</strong>), batas waktu mulai maksimal adalah pukul <strong className="font-semibold underline text-primary">{getLatestStartTimeForDuration(activeUnit === "hari" ? 8 : activeUnit === "paket" ? 6 : activeUnit === "acara" ? 4 : bookingData.duration)} WIB</strong> agar layanan selesai tepat waktu sebelum jam operasional berakhir.
                      </p>
                    </div>
                  </div>

                  {/* DATE + TIME SIDE BY SIDE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TANGGAL */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Tanggal
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          className="pl-11"
                          value={bookingData.date}
                          onChange={(e) => {
                            setBookingData({
                              ...bookingData,
                              date: e.target.value,
                              time: "", // reset waktu saat tanggal berubah
                            });
                          }}
                          min={getLocalDateInputValue()}
                        />
                      </div>
                    </div>

                    {/* WAKTU */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium block">
                          Waktu Mulai
                        </label>
                        <span className="text-xs text-muted-foreground">
                          Maks. mulai: <strong className="text-primary">{getLatestStartTimeForDuration(bookingData.duration)} WIB</strong>
                        </span>
                      </div>

                      {!bookingData.date ? (
                        <div className="h-10 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground">
                          Pilih tanggal terlebih dahulu
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl">
                          {generateTimeSlots().map((time) => {
                            const isBooked = isTimeSlotBooked(
                              id!,
                              bookingData.date,
                              time,
                              bookingData.duration,
                              currentBookingId || undefined
                            );

                            const [hour] = time.split(":").map(Number);
                            const isOutsideWorkingHours = hour < 8 || hour >= 22;
                            const isPast = isTimeSlotInPast(bookingData.date, time);
                            const timeDetails = getBookingTimeDetails(time, bookingData.duration);
                            const isExceeding = timeDetails.exceedsOperational;
                            const isUnavailable = isBooked || isOutsideWorkingHours || isPast || isExceeding;
                            const latestStart = getLatestStartTimeForDuration(bookingData.duration);

                            return (
                              <Button
                                key={time}
                                type="button"
                                variant={bookingData.time === time ? "default" : "outline"}
                                size="sm"
                                title={
                                  isExceeding
                                    ? `Waktu tidak mencukupi: Pemesanan ${bookingData.duration} jam akan selesai pukul ${timeDetails.formattedEndTime} WIB (melebihi jam operasional 22:00 WIB)`
                                    : isBooked
                                    ? "Sudah dipesan"
                                    : isPast
                                    ? "Waktu sudah lewat"
                                    : `Selesai pukul ${timeDetails.formattedEndTime} WIB`
                                }
                                className={cn(
                                  "text-xs relative transition-all",
                                  (isBooked || isPast || isOutsideWorkingHours) &&
                                    "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                                  isExceeding && !isBooked && !isPast &&
                                    "opacity-60 bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 line-through decoration-amber-500/70"
                                )}
                                disabled={isBooked || isPast || isOutsideWorkingHours}
                                onClick={() => {
                                  if (isExceeding) {
                                    toast({
                                      title: "Waktu Tidak Mencukupi",
                                      description: `Pemesanan ${bookingData.duration} jam mulai pukul ${time} akan selesai pukul ${timeDetails.formattedEndTime} WIB (melebihi jam operasional 22:00 WIB). Batas waktu mulai maksimal adalah pukul ${latestStart} WIB.`,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (isUnavailable) return;
                                  setBookingData({ ...bookingData, time });
                                }}
                              >
                                {time}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Keterangan Status / Alert Waktu Terpilih */}
                  {bookingData.time && (() => {
                    const selectedDetails = getBookingTimeDetails(bookingData.time, bookingData.duration);
                    const latestStart = getLatestStartTimeForDuration(bookingData.duration);

                    if (selectedDetails.exceedsOperational) {
                      return (
                        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-3.5 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                          <div>
                            <p className="font-bold text-sm">Waktu Pemesanan Melebihi Jam Operasional!</p>
                            <p className="mt-1 leading-relaxed">
                              Pemesanan mulai pukul <strong className="font-semibold">{bookingData.time} WIB</strong> selama <strong className="font-semibold">{bookingData.duration} jam</strong> akan selesai pada pukul <strong className="font-semibold">{selectedDetails.formattedEndTime} WIB</strong>. Jam operasional mitra hanya sampai pukul 22:00 WIB. Silakan pilih jam mulai sebelum atau tepat pukul <strong className="font-bold underline">{latestStart} WIB</strong>.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            Estimasi Waktu: <strong className="font-bold">{bookingData.time} – {selectedDetails.formattedEndTime} WIB</strong> ({bookingData.duration} jam)
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 text-[10px]">
                          ✓ Sesuai Jam Operasional
                        </Badge>
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                    <span className="font-medium">Keterangan:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border bg-background inline-block"></span>
                      <span>Tersedia</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-primary inline-block"></span>
                      <span>Dipilih</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-muted opacity-50 inline-block"></span>
                      <span>Sudah Dipesan / Lewat</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/40 inline-block"></span>
                      <span>Waktu Tidak Cukup (&gt;22:00)</span>
                    </div>
                  </div>

                  {/* CATATAN */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Catatan Tambahan (opsional)
                    </label>
                    <textarea
                      className="w-full h-24 rounded-xl border-2 border-input bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                      placeholder="Tuliskan catatan atau permintaan khusus..."
                      value={bookingData.notes}
                      onChange={(e) =>
                        setBookingData({ ...bookingData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {step === 3 && bookingStatus === "draft" && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold">Konfirmasi & Pembayaran</h2>

                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Durasi / Kuantitas</span>
                      <span className="font-medium">{bookingData.duration} {activeUnit}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tujuan</span>
                      <span className="font-medium">
                        {isCustomPurpose
                          ? customPurpose || bookingData.purpose
                          : bookingData.purpose.replace("Event / ", "")}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tipe</span>
                      <Badge variant={bookingData.type === "online" ? "accent" : "secondary"}>
                        {bookingData.type === "online" ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tanggal & Waktu</span>
                      <span className="font-medium text-right">
                        {bookingData.date && new Date(bookingData.date).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        <br />
                        <span className="text-sm text-primary font-semibold">
                          {bookingData.time} – {getBookingTimeDetails(bookingData.time, bookingData.duration).formattedEndTime} WIB ({bookingData.duration} {activeUnit})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tarif Satuan Layanan</span>
                      <span className="font-medium">
                        {formatPrice(activeUnitRate)} {activeUnitLabel}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 text-xs">
                      <div className="text-muted-foreground">Rincian Perhitungan Biaya:</div>
                      <div className="font-bold text-orange-950 dark:text-orange-200 text-sm mt-0.5">
                        {formatPrice(activeUnitRate)} × {bookingData.duration} {activeUnit} = {formatPrice(totalPrice)}
                      </div>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold">
                      <span>Total Biaya Jasa Mitra</span>
                      <span className="text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-300 dark:border-amber-900/50 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong>Ketentuan Biaya Aktivitas:</strong> {EXTRA_EXPENSES_DISCLAIMER}
                      </div>
                    </div>
                  </div>

                  <Card className="p-4 bg-accent/50 flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">Metode Pembayaran</p>
                      <p className="text-sm text-muted-foreground">
                        Transfer Bank / E-Wallet
                      </p>
                    </div>
                  </Card>
                </div>
              )}

              {bookingStatus === "pending_payment" && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold">Metode Pembayaran</h2>

                  {/* Payment Summary */}
                  <Card className="p-4 bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-muted-foreground block text-sm">Total Pembayaran</span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatPrice(activeUnitRate)} × {bookingData.duration} {activeUnit}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                    {paymentCode && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Kode Konfirmasi</span>
                          <span className="text-sm font-mono font-semibold">{paymentCode}</span>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Pilih Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer border-2 transition-all",
                          paymentMethod === "qris"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-input hover:border-primary/50"
                        )}
                        onClick={() => setPaymentMethod("qris")}
                      >
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold text-sm">QRIS</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Scan QR Code
                        </p>
                      </Card>

                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer border-2 transition-all",
                          paymentMethod === "bca"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-input hover:border-primary/50"
                        )}
                        onClick={() => setPaymentMethod("bca")}
                      >
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold text-sm">Bank BCA</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Transfer Bank
                        </p>
                      </Card>

                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer border-2 transition-all",
                          paymentMethod === "bri"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-input hover:border-primary/50"
                        )}
                        onClick={() => setPaymentMethod("bri")}
                      >
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold text-sm">Bank BRI</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Transfer Bank
                        </p>
                      </Card>

                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer border-2 transition-all",
                          paymentMethod === "mandiri"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-input hover:border-primary/50"
                        )}
                        onClick={() => setPaymentMethod("mandiri")}
                      >
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold text-sm">Bank Mandiri</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Transfer Bank
                        </p>
                      </Card>

                      {/* Metode pembayaran: Saldo Dompet */}
                      <Card
                        hover
                        className={cn(
                          "p-4 text-center cursor-pointer border-2 transition-all col-span-2",
                          paymentMethod === "saldo"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-input hover:border-primary/50"
                        )}
                        onClick={() => setPaymentMethod("saldo")}
                      >
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold text-sm">Saldo Dompet</h4>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            saldoInsufficient ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          Saldo: {formatPrice(walletBalance)}
                          {saldoInsufficient && " (tidak cukup)"}
                        </p>
                      </Card>
                    </div>
                  </div>

                  {/* Saldo Dompet Payment Details */}
                  {paymentMethod === "saldo" && (
                    <Card className="p-6 bg-accent/50">
                      <h3 className="font-semibold mb-4 text-center">Pembayaran dengan Saldo Dompet</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Saldo kamu</span>
                          <span className="font-medium">{formatPrice(walletBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Pembayaran</span>
                          <span className="font-medium">{formatPrice(totalPrice)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Sisa Saldo</span>
                          <span
                            className={cn(
                              "font-semibold",
                              walletBalance >= totalPrice ? "text-green-600" : "text-red-500"
                            )}
                          >
                            {formatPrice(walletBalance - totalPrice)}
                          </span>
                        </div>
                      </div>

                      {walletBalance < totalPrice ? (
                        <p className="text-xs text-red-500 text-center mt-4">
                          Saldo tidak cukup. Silakan isi saldo dompet terlebih dahulu atau pilih metode lain.
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 text-center mt-4">
                          Saldo cukup. Pembayaran akan langsung dipotong dari dompet kamu.
                        </p>
                      )}
                    </Card>
                  )}

                  {/* QRIS Payment Details */}
                 {paymentMethod === "qris" && (
                      <Card className="p-6 bg-accent/50">
                        <h3 className="font-semibold mb-4 text-center">Scan QR Code untuk Pembayaran</h3>

                        {activeQrisCode ? (
                          <div className="flex justify-center mb-4">
                            <img
                              src={activeQrisCode}
                              alt="QRIS Payment"
                              className="w-72 h-72 md:w-80 md:h-80 rounded-lg border max-w-sm md:max-w-md bg-white p-2 object-contain shadow-sm"
                            />
                          </div>
                        ) : (
                          <div className="text-center text-sm text-red-500">
                            QRIS Code belum diset oleh admin.
                          </div>
                        )}

                        <div className="bg-background rounded-lg p-4 mb-4 border">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total Pembayaran</span>
                            <span className="text-xl font-bold text-primary">{formatPrice(qrisAmount)}</span>
                          </div>
                        </div>

                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium">Kode Konfirmasi Pembayaran</p>
                          <p className="text-lg font-mono font-bold text-primary">{paymentCode}</p>
                          <p className="text-xs text-muted-foreground">
                            Gunakan kode ini untuk pembayaran.
                          </p>
                        </div>
                      </Card>
                    )}
                  {(paymentMethod === "bca" || paymentMethod === "bri" || paymentMethod === "mandiri") && (
                    <Card className="p-6 bg-accent/50">
                      <h3 className="font-semibold mb-4 text-center">Informasi Rekening</h3>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Nama Bank</span>
                          <span className="font-semibold">
                            {paymentMethod === "bca" && "Bank BCA"}
                            {paymentMethod === "bri" && "Bank BRI"}
                            {paymentMethod === "mandiri" && "Bank Mandiri"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Nomor Rekening</span>
                          <span className="font-mono font-semibold">
                            {paymentMethod === "bca" && maskBankAccount(bankAccounts.bca.number)}
                            {paymentMethod === "bri" && maskBankAccount(bankAccounts.bri.number)}
                            {paymentMethod === "mandiri" && maskBankAccount(bankAccounts.mandiri.number)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Nama Penerima</span>
                          <span className="font-semibold">
                            {paymentMethod === "bca" && bankAccounts.bca.holder}
                            {paymentMethod === "bri" && bankAccounts.bri.holder}
                            {paymentMethod === "mandiri" && bankAccounts.mandiri.holder}
                          </span>
                        </div>
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Nominal Transfer</p>
                          <p className="text-lg font-bold text-primary text-center">{formatPrice(displayAmount)}</p>
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            Nominal ini akan tercatat otomatis saat Anda konfirmasi pembayaran
                          </p>
                        </div>
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Kode Konfirmasi Pembayaran</p>
                          <p className="text-lg font-mono font-bold text-primary text-center">{paymentCode}</p>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Cantumkan kode ini saat transfer.
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {paymentMethod && paymentMethod !== "saldo" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Upload Bukti Pembayaran
                          {(paymentMethod === "bca" || paymentMethod === "bri" || paymentMethod === "mandiri" || paymentMethod === "qris") && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <div className="border-2 border-dashed border-input rounded-lg p-6 text-center">
                          <input
                            type="file"
                            id="payment-proof"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              setPaymentProofFile(file);

                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setPaymentProof(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <label
                            htmlFor="payment-proof"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {paymentProofFile ? paymentProofFile.name : "Klik untuk upload gambar"}
                            </span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Pesan untuk Admin (Opsional)
                        </label>
                        <textarea
                          className="w-full h-24 rounded-xl border-2 border-input bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary resize-none"
                          placeholder="Tuliskan catatan tambahan untuk admin..."
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBookingStatus("draft");
                          setPaymentMethod(null);
                          setTransferAmount(0);
                          setTransferTime("");
                          setPaymentProof("");
                        }}
                        className="flex-1"
                      >
                        Batal
                      </Button>
                      <Button
                          variant="hero"
                          onClick={handleConfirmPayment}
                          disabled={isProcessing ||
                            ((paymentMethod === "bca" || paymentMethod === "bri" || paymentMethod === "mandiri" || paymentMethod === "qris") && !paymentProof) ||
                            (paymentMethod === "saldo" && saldoInsufficient)
                          }
                          className="flex-1"
                        >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          "Saya Sudah Transfer"
                        )}
                      </Button>
                    </div>
                  )}

                  {!paymentMethod && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        className="flex-1"
                      >
                        Kembali / Edit Pesanan
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(bookingStatus === "pending_approval" || bookingStatus === "pending_mitra" || bookingStatus === "rejected") && (
                <div className="py-8 text-center animate-fade-in">
                  <div className={cn(
                    "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
                    bookingStatus === "rejected"
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-accent"
                  )}>
                    {bookingStatus === "rejected" ? (
                      <ShieldCheck className="w-10 h-10 text-red-500" />
                    ) : (
                      <ShieldCheck className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    {bookingStatus === "rejected"
                      ? "Pemesanan Ditolak"
                      : bookingStatus === "pending_mitra"
                        ? "Menunggu Persetujuan Mitra"
                        : "Menunggu Persetujuan Admin"}
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {bookingStatus === "rejected"
                      ? "Maaf, admin menolak pemesanan Anda. Silakan hubungi admin untuk informasi lebih lanjut."
                      : bookingStatus === "pending_mitra"
                        ? "Pembayaran sudah diverifikasi admin. Mitra sedang diminta menyetujui jadwal ini."
                        : "Menunggu verifikasi pembayaran oleh admin."}
                  </p>

                  <Card className="p-4 bg-muted/50 max-w-sm mx-auto mb-6">
                    <div className="flex items-center gap-3 text-left">
                      <img
                        src={talentForDisplay.photo}
                        alt={talentForDisplay.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">{talentForDisplay.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {isCustomPurpose
                            ? customPurpose || bookingData.purpose
                            : bookingData.purpose.replace("Event / ", "")}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {(bookingStatus === "pending_approval" || bookingStatus === "pending_mitra") && (
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {bookingStatus === "pending_mitra"
                            ? "Menunggu mitra menyetujui pemesanan..."
                            : "Menunggu admin memverifikasi pemesanan..."}
                        </span>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        Kamu akan menerima notifikasi saat status pemesanan berubah.
                      </p>
                    </div>
                  )}

                  {bookingStatus === "rejected" && (
                    <div className="border-t pt-6">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                          Informasi Refund
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Jika pembayaran sudah dilakukan, dana akan dikembalikan dalam 1-3 hari kerja.
                          Silakan hubungi admin untuk informasi lebih lanjut.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/bookings')}
                      className="flex-1"
                    >
                      Lihat Pemesanan Saya
                    </Button>
                  </div>
                </div>
              )}

              {bookingStatus === "approved" && currentBookingId && step === 5 && (
                <div className="py-8 text-center animate-fade-in">
                  <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Pemesanan Disetujui!</h2>
                  <p className="text-muted-foreground mb-6">
                    Percakapan dengan {talentForDisplay.name} sudah aktif
                  </p>

                  <Link to={`/chat/${currentBookingId}`}>
                    <Button variant="hero" size="lg" className="gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Buka Percakapan
                    </Button>
                  </Link>

                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ Langkah 5: Percakapan Aktif - Kamu bisa mulai ngobrol sekarang!
                    </p>
                  </div>
                </div>
              )}

              {bookingStatus === "draft" && (
                <div className="flex gap-3 mt-8">
                  {step > 1 && (
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      Kembali
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button
                      variant="hero"
                      onClick={handleNext}
                      disabled={!isStepValid()}
                      className="flex-1"
                    >
                      Lanjutkan
                    </Button>
                  ) : (
                    <Button
                      variant="hero"
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        "Bayar Sekarang"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Talent Summary */}
          <aside className="hidden lg:block min-w-0">
            <Card className="p-5 sticky top-24 overflow-hidden">
              <div className="flex items-start gap-3 mb-4">
                <img
                  src={talentForDisplay.photo}
                  alt={talentForDisplay.name}
                  className="w-16 h-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold leading-snug break-words">{talentForDisplay.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {talentForDisplay.city}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {talentForDisplay.skills?.slice(0, 2).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="max-w-full text-[10px] whitespace-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                {bookingData.purpose && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">Aktivitas dipilih</p>
                    <p className="text-sm font-medium break-words">{isCustomPurpose ? customPurpose || bookingData.purpose.replace(/^(Event \/ Acara Lainnya:|Event lainnya:|Lainnya:)\s*/, "") || "Acara lainnya" : bookingData.purpose.replace("Event / ", "")}</p>
                  </div>
                )}
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Tarif Satuan</span>
                  <span className="font-medium">
                    {formatPrice(activeUnitRate)} {activeUnitLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Kuantitas / Durasi</span>
                  <span className="font-medium">{bookingData.duration} {activeUnit}</span>
                </div>
                <div className="rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 p-3 text-xs">
                  <div className="text-[11px] text-muted-foreground">Rincian Perhitungan</div>
                  <div className="font-bold text-orange-950 dark:text-orange-200 mt-0.5 break-words">
                    {formatPrice(activeUnitRate)} × {bookingData.duration} {activeUnit} = {formatPrice(totalPrice)}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3 font-bold pt-3 border-t">
                  <span>Total Biaya</span>
                  <span className="text-primary text-lg text-right leading-tight">{formatPrice(totalPrice)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight pt-1">
                  * Biaya makan, tiket masuk, transportasi, atau akomodasi tidak termasuk dan disepakati terpisah.
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium mb-2">Alur Pemesanan:</p>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li className={cn(step >= 1 && "text-primary font-medium")}>1. Pilih detail</li>
                  <li className={cn(step >= 2 && "text-primary font-medium")}>2. Atur jadwal</li>
                  <li className={cn(step >= 3 && "text-primary font-medium")}>3. Bayar</li>
                  <li className={cn(
                    bookingStatus === "pending_approval" && "text-primary font-medium",
                    bookingStatus === "approved" && "text-green-500 font-medium"
                  )}>
                    4. Tunggu approval admin {bookingStatus === "approved" && "✓"}
                  </li>
                  <li className={cn(
                    bookingStatus === "approved" && "text-green-500 font-medium"
                  )}>
                    5. Percakapan aktif {bookingStatus === "approved" && "✓"}
                  </li>
                </ol>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <AlertDialog open={isMeetingLocationDialogOpen} onOpenChange={setIsMeetingLocationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi lokasi pertemuan</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu memilih pertemuan offline dengan {talentForDisplay?.name}. Titik pertemuan akan berada di kota {talentForDisplay?.city}. Pastikan kamu dapat hadir di kota tersebut pada tanggal yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMeetingLocation}>Ya, lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}