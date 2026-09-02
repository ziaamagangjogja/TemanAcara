// src/pages/mitra/MitraBooking.tsx
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { talents, bookingPurposes } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  addBooking,
  getBookingById,
  getBookings,
  subscribeToBookings,
  updateBookingPayment,
  SharedBooking,
  updateBookingRating,
  getCurrentUserOrMitra,
  updateBooking, // PERBAIKAN: Tambahkan import ini
} from "@/lib/bookingStore";
import { getCurrentUser } from "@/lib/userStore";
import { createBooking } from "@/lib/bookings";
import { isTimeSlotBooked } from "@/lib/bookingStore";
import { getAllVerifiedTalents } from "@/lib/mitraStore";

type BookingStatus = "draft" | "pending_payment" | "pending_approval" | "approved" | "completed" | "rejected";

// Pre-generate time slots outside component to avoid recreation
const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
];

// Memoized utility functions
const formatPrice = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
}).format;

const getRandomizedAmount = (amount: number): number => {
  if (amount < 1000) return amount;
  const prefix = Math.floor(amount / 1000);
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return parseInt(`${prefix}${randomSuffix}`);
};

const maskBankAccount = (accountNumber: string): string => {
  if (!accountNumber || accountNumber.length < 3) return accountNumber;
  return accountNumber;
};

// Memoized components
const LoadingSkeleton = memo(() => (
  <div className="min-h-screen bg-gradient-warm pt-16 md:pt-24 pb-8">
    <div className="container max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded mb-2 w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
      </div>
      
      <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse mx-1"></div>
            {i < 4 && <div className="w-16 h-1 bg-gray-200 rounded-full mx-1 animate-pulse"></div>}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg p-6 space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="bg-white rounded-lg p-5 space-y-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-2 w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
));

const ProgressStep = memo(({ 
  num, 
  label, 
  stepCompleted, 
  stepActive, 
  isPending, 
  isRejected, 
  isApproved 
}: {
  num: number;
  label: string;
  stepCompleted: boolean;
  stepActive: boolean;
  isPending: boolean;
  isRejected: boolean;
  isApproved: boolean;
}) => (
  <div className="flex flex-col items-center">
    <div
      className={cn(
        "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold transition-all text-sm",
        stepCompleted || stepActive
          ? "bg-primary text-primary-foreground shadow-orange"
          : "bg-muted text-muted-foreground",
        num === 4 && isApproved && "bg-green-500",
        num === 5 && isApproved && "bg-green-500",
        isRejected && "bg-red-500",
      )}
    >
      {stepCompleted ? (
        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
      ) : isPending ? (
        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
      ) : num === 5 ? (
        <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
      ) : (
        num
      )}
    </div>
    <span className="text-xs mt-1 text-muted-foreground whitespace-nowrap">{label}</span>
  </div>
));

const DurationButton = memo(({ 
  hours, 
  isSelected, 
  onClick 
}: {
  hours: number;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <Button
    variant={isSelected ? "default" : "outline"}
    size="sm"
    onClick={onClick}
  >
    {hours} jam
  </Button>
));

const PurposeButton = memo(({ 
  purpose, 
  isSelected, 
  onClick 
}: {
  purpose: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <Button
    variant={isSelected ? "default" : "outline"}
    size="sm"
    className="justify-start"
    onClick={onClick}
  >
    {purpose}
  </Button>
));

const TimeSlotButton = memo(({ 
  time, 
  isSelected, 
  isBooked, 
  isOutsideWorkingHours, 
  onClick 
}: {
  time: string;
  isSelected: boolean;
  isBooked: boolean;
  isOutsideWorkingHours: boolean;
  onClick: () => void;
}) => (
  <Button
    variant={isSelected ? "default" : "outline"}
    size="sm"
    className={cn(
      "text-xs",
      (isBooked || isOutsideWorkingHours) &&
        "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
    )}
    disabled={isBooked || isOutsideWorkingHours}
    onClick={onClick}
  >
    {time}
  </Button>
));

const PaymentMethodCard = memo(({ 
  method, 
  isSelected, 
  onClick 
}: {
  method: { id: string; icon: any; label: string; description: string };
  isSelected: boolean;
  onClick: () => void;
}) => {
  const Icon = method.icon;
  return (
    <Card
      hover
      className={cn(
        "p-4 text-center cursor-pointer border-2 transition-all",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-input hover:border-primary/50",
      )}
      onClick={onClick}
    >
      <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
      <h4 className="font-semibold text-sm">{method.label}</h4>
      <p className="text-xs text-muted-foreground mt-1">
        {method.description}
      </p>
    </Card>
  );
});

const TalentSummary = memo(({ 
  talent, 
  duration, 
  totalPrice, 
  step, 
  bookingStatus 
}: {
  talent: any;
  duration: number;
  totalPrice: number;
  step: number;
  bookingStatus: BookingStatus;
}) => (
  <Card className="p-5 sticky top-24">
    <div className="flex gap-4 mb-4">
      <img
        src={talent.photo}
        alt={talent.name}
        className="w-20 h-20 rounded-xl object-cover"
        loading="lazy"
      />
      <div>
        <h3 className="font-bold">{talent.name}</h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {talent.city}
        </div>
        <div className="flex gap-1 mt-2">
          {talent.skills?.slice(0, 2).map((skill: string) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t pt-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Harga per jam</span>
        <span className="font-medium">
          {formatPrice(talent.pricePerHour)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Durasi</span>
        <span className="font-medium">{duration} jam</span>
      </div>
      <div className="flex justify-between font-bold pt-3 border-t">
        <span>Total</span>
        <span className="text-primary">{formatPrice(totalPrice)}</span>
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
          bookingStatus === "approved" && "text-green-500 font-medium",
        )}>
          4. Tunggu approval admin {bookingStatus === "approved" && "✓"}
        </li>
        <li className={cn(
          bookingStatus === "approved" && "text-green-500 font-medium",
        )}>
          5. Percakapan aktif {bookingStatus === "approved" && "✓"}
        </li>
      </ol>
    </div>
  </Card>
));

export default function MitraBooking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State declarations
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentBooking, setCurrentBooking] = useState<SharedBooking | null>(null);
  const [isLoadingTalent, setIsLoadingTalent] = useState(true);
  const [allTalents, setAllTalents] = useState<any[]>([]);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("draft");
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [displayTalent, setDisplayTalent] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingData, setBookingData] = useState({
    duration: 2,
    purpose: "",
    type: "offline" as "online" | "offline",
    date: "",
    time: "",
    notes: "",
  });
  const [customPurpose, setCustomPurpose] = useState(""); // State untuk tujuan kustom
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bca" | "bri" | "mandiri" | null>(null);
  const [paymentCode, setPaymentCode] = useState<string>("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<string>("");
  // PERBAIKAN: Ubah nama state untuk pesan admin agar lebih jelas
  const [adminMessage, setAdminMessage] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferTime, setTransferTime] = useState<string>("");
  const [qrisCode, setQrisCode] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState({
    bca: { number: "1234567890", holder: "PT RentMate Indonesia" },
    bri: { number: "9876543210", holder: "PT RentMate Indonesia" },
    mandiri: { number: "5555666677", holder: "PT RentMate Indonesia" },
  });

  // Track if we're in the middle of creating a new booking
  const [isCreatingNewBooking, setIsCreatingNewBooking] = useState(false);

  // Load payment settings
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
  }, []);

  // Load talent data
  useEffect(() => {
    if (!id) {
      navigate("/mitra/talents");
      return;
    }

    const loadTalents = async () => {
      try {
        setIsLoadingTalent(true);
        const talents = await getAllVerifiedTalents();
        setAllTalents(talents);
        const foundTalent = talents.find((t) => t.id === id);
        setDisplayTalent(foundTalent);
        
        if (!foundTalent) {
          navigate("/mitra/talents");
        }
      } catch (error) {
        console.error("Error loading talents:", error);
        navigate("/mitra/talents");
      } finally {
        setIsLoadingTalent(false);
        setIsInitialLoading(false);
      }
    };

    loadTalents();
  }, [id, navigate]);

  // Memoized functions
  const getPaymentCodeStorageKey = useCallback((userId: string, talentId: string, date: string, time: string) => {
    return `rentmate_payment_code_${userId}_${talentId}_${date}_${time}`;
  }, []);

  const getOrCreateStablePaymentCode = useCallback(() => {
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
  }, [id, bookingData.date, bookingData.time, getPaymentCodeStorageKey]);

  // Check existing booking and user status
  useEffect(() => {
    if (!id || isInitialLoading) return;

    const currentUser = getCurrentUserOrMitra();
    if (!currentUser) {
      navigate("/mitra/login");
      return;
    }

    // Don't reset if we're in the middle of creating a new booking
    if (isCreatingNewBooking) return;

    const allBookings = getBookings();
    const now = new Date();
    const userId = currentUser.type === "mitra" ? currentUser.data.talentId : currentUser.data.id;

    const existingBooking = allBookings.find((b) => {
      if (b.userId !== userId || b.talentId !== id || b.approvalStatus === "rejected") {
        return false;
      }

      const startTime = new Date(`${b.date}T${b.time}`);
      const endTime = new Date(startTime.getTime() + b.duration * 60 * 60 * 1000);

      return endTime > now;
    });

    if (!existingBooking) {
      setCurrentBookingId(null);
      setBookingStatus("draft");
      // Only reset step to 1 if we're not already on a higher step
      // This prevents resetting when user is actively filling the form
      if (step === 1) {
        setStep(1);
      }

      const potentialCode = getOrCreateStablePaymentCode();
      setPaymentCode(potentialCode || "");
      return;
    }

    setCurrentBooking(existingBooking);
    setCurrentBookingId(existingBooking.id);
    
    // Check if purpose is a custom one
    if (existingBooking.purpose.startsWith("Lainnya:")) {
      const customText = existingBooking.purpose.replace("Lainnya:", "").trim();
      setCustomPurpose(customText);
    }
    
    // PERBAIKAN: Ambil pesan untuk admin dari notes
    const adminMsg = existingBooking.adminMessage || "";
    setAdminMessage(adminMsg);
    
    setBookingData({
      duration: existingBooking.duration,
      purpose: existingBooking.purpose,
      type: existingBooking.type,
      date: existingBooking.date,
      time: existingBooking.time,
      notes: existingBooking.notes || "",
    });

    setPaymentCode(existingBooking.paymentCode || getOrCreateStablePaymentCode());

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

    if (existingBooking.approvalStatus === "approved") {
      setBookingStatus("approved");
      setStep(5);
      return;
    }

    if (existingBooking.date && existingBooking.time && existingBooking.duration) {
      const startTime = new Date(`${existingBooking.date}T${existingBooking.time}`);
      const endTime = new Date(startTime.getTime() + existingBooking.duration * 60 * 60 * 1000);

      if (endTime < now && existingBooking.approvalStatus === "approved") {
        setBookingStatus("completed");
        setStep(5);
        return;
      }
    }
  }, [id, navigate, isInitialLoading, getOrCreateStablePaymentCode, step, isCreatingNewBooking]);

  // Subscribe to booking updates
  useEffect(() => {
    if (!currentBookingId) return;

    const checkStatus = () => {
      const booking = getBookingById(currentBookingId);
      if (!booking) return;

      setCurrentBooking(booking);

      if (booking.paymentCode && booking.paymentCode !== paymentCode) {
        setPaymentCode(booking.paymentCode);
      }

      if (booking.approvalStatus === "approved" && bookingStatus !== "approved") {
        setBookingStatus("approved");
        setStep(5);
        
        if (booking.id !== currentBookingId) {
          setCurrentBookingId(booking.id);
        }
        
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

  // Memoized calculations
  const talentForDisplay = useMemo(() => {
    return displayTalent || (currentBooking ? {
      id: currentBooking.talentId,
      name: currentBooking.talentName,
      photo: currentBooking.talentPhoto,
      pricePerHour: currentBooking.total / currentBooking.duration,
      city: "Unknown",
      skills: [],
      rating: "0",
    } : null);
  }, [displayTalent, currentBooking]);

  const totalPrice = useMemo(() => {
    return talentForDisplay?.pricePerHour * bookingData.duration || 0;
  }, [talentForDisplay?.pricePerHour, bookingData.duration]);

  const displayAmount = useMemo(() => {
    return getRandomizedAmount(totalPrice);
  }, [totalPrice]);

  const qrisAmount = useMemo(() => {
    if (displayTalent) {
      const totalPrice = displayTalent.pricePerHour * bookingData.duration;
      return getRandomizedAmount(totalPrice);
    }
    return 0;
  }, [displayTalent, bookingData.duration]);

  // Memoized event handlers
  const handleNext = useCallback(() => {
    if (bookingStatus !== "draft") return;
    if (step < 3) {
      setStep(step + 1);
    }
  }, [bookingStatus, step]);

  const handleBack = useCallback(() => {
    if (bookingStatus !== "draft") return;
    if (step <= 1) return;
    setStep(step - 1);
  }, [bookingStatus, step]);

  const handlePayment = useCallback(() => {
    const currentUser = getCurrentUserOrMitra();

    if (!currentUser) {
      toast({
        title: "Error",
        description: "Anda harus login untuk melakukan pemesanan",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingNewBooking(true);

    const newPaymentCode = getOrCreateStablePaymentCode();

    // Use custom purpose if "Lainnya" is selected
    const purposeValue = bookingData.purpose.startsWith("Lainnya:") 
      ? `Lainnya: ${customPurpose}` 
      : bookingData.purpose;

    const booking = addBooking({
      talentId: talentForDisplay.id,
      talentName: talentForDisplay.name,
      talentPhoto: talentForDisplay.photo,
      purpose: purposeValue,
      type: bookingData.type,
      date: bookingData.date,
      time: bookingData.time,
      duration: bookingData.duration,
      total: totalPrice,
      paymentStatus: "pending",
      approvalStatus: "pending_approval",
      paymentCode: newPaymentCode,
      // PERBAIKAN: Tambahkan field adminMessage
      adminMessage: adminMessage,
    });

    setCurrentBookingId(booking.id);
    setPaymentCode(newPaymentCode);
    setBookingStatus("pending_payment");
    setStep(3);
    
    // Reset the flag after a short delay
    setTimeout(() => setIsCreatingNewBooking(false), 1000);
  }, [getOrCreateStablePaymentCode, toast, talentForDisplay, bookingData, totalPrice, customPurpose, adminMessage]);

  // Fungsi untuk menangani upload bukti pembayaran
  const handlePaymentProofUpload = useCallback((file: File) => {
    setPaymentProofFile(file);
    // PERBAIKAN: Hapus bagian yang menampilkan preview gambar
    // Tidak perlu membaca file sebagai base64, hanya simpan nama file
    console.log("File uploaded:", file.name);
  }, []);

  const handleConfirmPayment = useCallback(async () => {
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

      // Perbarui validasi untuk memerlukan bukti pembayaran untuk semua metode
      if (!paymentProofFile) {
        toast({
          title: "Bukti pembayaran wajib diupload",
          variant: "destructive",
        });
        return;
      }

      const currentUser = getCurrentUserOrMitra();
      const autoTransferAmount = totalPrice;
      const autoTransferTime = new Date().toISOString();

      let booking: SharedBooking;

      // Use custom purpose if "Lainnya" is selected
      const purposeValue = bookingData.purpose.startsWith("Lainnya:") 
        ? `Lainnya: ${customPurpose}` 
        : bookingData.purpose;

      if (currentBookingId) {
        // PERBAIKAN: Perbarui booking dengan adminMessage
        const updated = updateBookingPayment(currentBookingId, {
          paymentMethod,
          paymentCode,
          paymentProof,
          transferAmount: autoTransferAmount,
          transferTime: autoTransferTime,
        });

        if (!updated) {
          throw new Error("Booking tidak ditemukan");
        }

        // PERBAIKAN: Simpan pesan admin ke notes
        if (adminMessage.trim()) {
          updateBooking(currentBookingId, { adminMessage: adminMessage });
        }

        booking = updated;
      } else {
        await createBooking({
          user_id: currentUser.data.id,
          talent_id: talentForDisplay.id,
          purpose: purposeValue,
          type: bookingData.type,
          date: bookingData.date,
          time: bookingData.time,
          duration: bookingData.duration,
          total: totalPrice,
          payment_status: "paid",
          approval_status: "pending_approval",
          payment_method: paymentMethod,
          payment_code: paymentCode,
          payment_proof: paymentProof,
          transfer_amount: autoTransferAmount,
          transfer_time: autoTransferTime,
        });

        booking = addBooking({
          userName: currentUser.data.name,
          userPhoto: currentUser.data.photo,
          talentId: talentForDisplay.id,
          talentName: talentForDisplay.name,
          talentPhoto: talentForDisplay.photo,
          purpose: purposeValue,
          type: bookingData.type,
          date: bookingData.date,
          time: bookingData.time,
          duration: bookingData.duration,
          total: totalPrice,
          paymentStatus: "paid",
          approvalStatus: "pending_approval",
          paymentMethod,
          paymentCode,
          paymentProof,
          transferAmount: autoTransferAmount,
          transferTime: autoTransferTime,
          // PERBAIKAN: Tambahkan field adminMessage
          adminMessage: adminMessage,
        });
      }

      setCurrentBookingId(booking.id);
      setBookingStatus("pending_approval");
      setStep(4);

      toast({
        title: "Pembayaran berhasil",
        description: "Menunggu persetujuan admin",
      });
    } catch (error) {
      console.error("CONFIRM PAYMENT ERROR:", error);
      toast({
        title: "Terjadi kesalahan",
        description: "Gagal mengirim bukti pembayaran",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, paymentMethod, paymentProofFile, paymentProof, paymentCode, currentBookingId, talentForDisplay, bookingData, totalPrice, toast, customPurpose, adminMessage]);

  const isStepValid = useCallback(() => {
    switch (step) {
      case 1:
        // Validasi tujuan pemesanan
        if (bookingData.purpose.startsWith("Lainnya:")) {
          // Jika "Lainnya" dipilih, pastikan ada teks kustom
          return bookingData.duration > 0 && customPurpose.trim().length > 0;
        } else {
          // Jika opsi lain dipilih, pastikan tujuan tidak kosong
          return bookingData.duration > 0 && bookingData.purpose.trim().length > 0;
        }
      case 2:
        return bookingData.date && bookingData.time;
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, bookingData, customPurpose]);

  const getStatusBadge = useCallback(() => {
    switch (bookingStatus) {
      case "pending_payment":
        return <Badge variant="warning">Menunggu Pembayaran</Badge>;
      case "pending_approval":
        return <Badge variant="accent">Menunggu Persetujuan Admin</Badge>;
      case "approved":
        return <Badge variant="success">Disetujui</Badge>;
      case "completed":
        return <Badge variant="default">Selesai</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return null;
    }
  }, [bookingStatus]);

  // Memoized UI components
  const stepsData = useMemo(() => [
    { num: 1, label: "Detail" },
    { num: 2, label: "Jadwal" },
    { num: 3, label: "Bayar" },
    { num: 4, label: "Approval" },
    { num: 5, label: "Chat" },
  ], []);

  const durationButtons = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((h) => (
      <DurationButton
        key={h}
        hours={h}
        isSelected={bookingData.duration === h}
        onClick={() => setBookingData({ ...bookingData, duration: h })}
      />
    ));
  }, [bookingData.duration]);

  const purposeButtons = useMemo(() => {
    return bookingPurposes.map((purpose) => (
      <PurposeButton
        key={purpose}
        purpose={purpose}
        isSelected={
          (bookingData.purpose === purpose && purpose !== "Lainnya") || 
          (purpose === "Lainnya" && bookingData.purpose.startsWith("Lainnya:"))
        }
        onClick={() => {
          if (purpose === "Lainnya") {
            setBookingData({ ...bookingData, purpose: "Lainnya:" });
          } else {
            setBookingData({ ...bookingData, purpose });
            setCustomPurpose(""); // Reset custom purpose when selecting predefined option
          }
        }}
      />
    ));
  }, [bookingData.purpose]);

  const timeSlotButtons = useMemo(() => {
    if (!bookingData.date) return null;

    return TIME_SLOTS.map((time) => {
      const isBooked = isTimeSlotBooked(
        id!,
        bookingData.date,
        time,
        bookingData.duration,
      );

      const [hour] = time.split(":").map(Number);
      const isOutsideWorkingHours = hour < 8 || hour >= 22;

      return (
        <TimeSlotButton
          key={time}
          time={time}
          isSelected={bookingData.time === time}
          isBooked={isBooked}
          isOutsideWorkingHours={isOutsideWorkingHours}
          onClick={() => setBookingData({ ...bookingData, time })}
        />
      );
    });
  }, [bookingData.date, bookingData.time, bookingData.duration, id]);

  const paymentMethodCards = useMemo(() => {
    const methods = [
      { id: "qris", icon: QrCode, label: "QRIS", description: "Scan QR Code" },
      { id: "bca", icon: Building2, label: "Bank BCA", description: "Transfer Bank" },
      { id: "bri", icon: Building2, label: "Bank BRI", description: "Transfer Bank" },
      { id: "mandiri", icon: Building2, label: "Bank Mandiri", description: "Transfer Bank" },
    ];

    return methods.map((method) => (
      <PaymentMethodCard
        key={method.id}
        method={method}
        isSelected={paymentMethod === method.id}
        onClick={() => setPaymentMethod(method.id as any)}
      />
    ));
  }, [paymentMethod]);

  // Fix for date selection issue
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    // Update date without triggering a step reset
    setBookingData(prev => ({
      ...prev,
      date: newDate,
      // Don't reset time when date changes
      time: prev.time,
    }));
  }, []);

  // Memoized handler for custom purpose input
  const handleCustomPurposeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomPurpose(value);
    setBookingData({ 
      ...bookingData, 
      purpose: `Lainnya: ${value}` 
    });
  }, [bookingData]);

  // Get display purpose for UI
  const displayPurpose = useMemo(() => {
    if (bookingData.purpose.startsWith("Lainnya:")) {
      return customPurpose || bookingData.purpose;
    }
    return bookingData.purpose;
  }, [bookingData.purpose, customPurpose]);

  // PERBAIKAN: Fungsi untuk mengonversi file ke base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // PERBAIKAN: Fungsi untuk menangani upload bukti pembayaran
  const handlePaymentProofSubmit = useCallback(async (file: File) => {
    if (!file) return;
    
    try {
      setIsProcessing(true);
      // Konversi file ke base64 untuk disimpan
      const base64 = await fileToBase64(file);
      setPaymentProof(base64);
      setPaymentProofFile(file);
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast({
        title: "Error",
        description: "Gagal mengupload bukti pembayaran",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Conditional renders
  if (isInitialLoading) {
    return <LoadingSkeleton />;
  }

  if (!displayTalent && !currentBooking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-warm pt-16 md:pt-24 pb-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Pesan Mitra</h1>
            <p className="text-muted-foreground">Lengkapi detail pemesanan kamu</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {stepsData.map((s, i) => {
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
                <ProgressStep
                  num={s.num}
                  label={s.label}
                  stepCompleted={stepCompleted}
                  stepActive={stepActive}
                  isPending={isPending}
                  isRejected={isRejected}
                  isApproved={isApproved}
                />
                {i < 4 && (
                  <div
                    className={cn(
                      "w-8 md:w-16 h-1 mx-1 md:mx-2 rounded-full transition-all",
                      (step > s.num ||
                        (s.num <= 3 && bookingStatus !== "draft") ||
                        (s.num === 4 && (bookingStatus === "pending_approval" || bookingStatus === "approved" || bookingStatus === "rejected")) ||
                        (s.num === 5 && bookingStatus === "approved"))
                        ? "bg-primary"
                        : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="md:col-span-2">
            <Card className="p-6">
              {step === 1 && bookingStatus === "draft" && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold">Detail Pemesanan</h2>

                  {/* Duration */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Durasi (jam)
                    </label>
                    <div className="flex gap-2">
                      {durationButtons}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Tujuan Pemesanan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {purposeButtons}
                    </div>
                    
                    {/* Tampilkan input teks jika "Lainnya" dipilih */}
                    {bookingData.purpose.startsWith("Lainnya:") && (
                      <div className="mt-3">
                        <Input
                          placeholder="Tuliskan tujuan pemesanan Anda..."
                          value={customPurpose}
                          onChange={handleCustomPurposeChange}
                        />
                      </div>
                    )}
                  </div>

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
                            "border-primary ring-2 ring-primary/20",
                        )}
                        onClick={() =>
                          setBookingData({ ...bookingData, type: "offline" })
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
                            "border-primary ring-2 ring-primary/20",
                        )}
                        onClick={() =>
                          setBookingData({ ...bookingData, type: "online" })
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
                </div>
              )}

              {step === 2 && bookingStatus === "draft" && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold">Jadwal & Waktu</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          onChange={handleDateChange}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Waktu Mulai
                      </label>

                      {!bookingData.date ? (
                        <div className="h-10 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground">
                          Pilih tanggal terlebih dahulu
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl">
                          {timeSlotButtons}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Jam yang dinonaktifkan sudah dipesan atau di luar jam operasional (08.00–22.00).
                  </p>

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
                      <span className="text-muted-foreground">Durasi</span>
                      <span className="font-medium">{bookingData.duration} jam</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tujuan</span>
                      <span className="font-medium">{displayPurpose}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tipe</span>
                      <Badge variant={bookingData.type === "online" ? "accent" : "secondary"}>
                        {bookingData.type === "online" ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Tanggal & Waktu</span>
                      <span className="font-medium">
                        {bookingData.date && new Date(bookingData.date).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        - {bookingData.time}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Harga per jam</span>
                      <span className="font-medium">
                        {formatPrice(talentForDisplay.pricePerHour)}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(totalPrice)}</span>
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

                  <Card className="p-4 bg-muted/50">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Pembayaran</span>
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

                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Pilih Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethodCards}
                    </div>
                  </div>

                  {paymentMethod === "qris" && (
                    <Card className="p-6 bg-accent/50">
                      <h3 className="font-semibold mb-4 text-center">Scan QR Code untuk Pembayaran</h3>

                      {qrisCode ? (
                        <div className="flex justify-center mb-4">
                          <img
                            src={qrisCode}
                            alt="QRIS Payment"
                            className="w-64 h-64 rounded-lg border"
                            loading="lazy"
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

                  {/* PERBAIKAN: Upload Bukti Pembayaran tanpa menampilkan preview */}
                  {paymentMethod && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Upload Bukti Pembayaran <span className="text-red-500">*</span>
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
                              handlePaymentProofSubmit(file);
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
                        {/* PERBAIKAN: Hapus bagian yang menampilkan preview gambar */}
                      </div>

                      {/* PERBAIKAN: Pesan untuk Admin dengan tampilan yang lebih baik */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Pesan untuk Admin
                          <span className="text-xs text-muted-foreground ml-1">(Opsional)</span>
                        </label>
                        <div className="relative">
                          <textarea
                            className="w-full h-24 rounded-xl border-2 border-input bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                            placeholder="Tuliskan pesan atau permintaan khusus untuk admin..."
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                          />
                          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            {adminMessage.length}/200 karakter
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pesan ini akan diteruskan ke admin dan ditampilkan di detail booking.
                        </p>
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
                          setPaymentProofFile(null);
                        }}
                        className="flex-1"
                      >
                        Batal
                      </Button>
                      <Button
                        variant="hero"
                        onClick={handleConfirmPayment}
                        disabled={isProcessing || !paymentProofFile}
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
                </div>
              )}

              {(bookingStatus === "pending_approval" || bookingStatus === "rejected") && (
                <div className="py-8 text-center animate-fade-in">
                  <div className={cn(
                    "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
                    bookingStatus === "rejected"
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-accent",
                  )}>
                    {bookingStatus === "rejected" ? (
                      <ShieldCheck className="w-10 h-10 text-red-500" />
                    ) : (
                      <ShieldCheck className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    {bookingStatus === "rejected" ? "Pemesanan Ditolak" : "Menunggu Persetujuan Admin"}
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {bookingStatus === "rejected"
                      ? "Maaf, admin menolak pemesanan Anda. Silakan hubungi admin untuk informasi lebih lanjut."
                      : "⏳ Menunggu verifikasi pembayaran oleh admin"}
                  </p>

                  <Card className="p-4 bg-muted/50 max-w-sm mx-auto mb-6">
                    <div className="flex items-center gap-3 text-left">
                      <img
                        src={talentForDisplay.photo}
                        alt={talentForDisplay.name}
                        className="w-12 h-12 rounded-full object-cover"
                        loading="lazy"
                      />
                      <div>
                        <p className="font-semibold">{talentForDisplay.name}</p>
                        <p className="text-sm text-muted-foreground">{displayPurpose}</p>
                      </div>
                    </div>
                  </Card>

                  {/* PERBAIKAN: Tampilkan pesan untuk admin jika ada */}
                  {currentBooking && currentBooking.adminMessage && (
                    <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 max-w-sm mx-auto mb-6">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Pesan Anda untuk Admin:
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {currentBooking.adminMessage}
                      </p>
                    </Card>
                  )}

                  {bookingStatus === "pending_approval" && (
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menunggu admin menyetujui pemesanan...</span>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        Kamu akan menerima notifikasi setelah pemesanan disetujui
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
                      onClick={() => navigate('/mitra/dashboard')}
                      className="flex-1"
                    >
                      Kembali ke Dashboard
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

                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="gap-2"
                    onClick={() => {
                      console.log("Navigating to chat with booking ID:", currentBookingId);
                      navigate(`/mitra/chat-as-booker/${currentBookingId}`);
                    }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Buka Percakapan
                  </Button>

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
          <div className="hidden md:block">
            <TalentSummary
              talent={talentForDisplay}
              duration={bookingData.duration}
              totalPrice={totalPrice}
              step={step}
              bookingStatus={bookingStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}