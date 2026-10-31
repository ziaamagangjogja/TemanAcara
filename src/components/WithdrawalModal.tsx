import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Wallet,
  ArrowUpRight,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { createWithdrawalRequest } from "@/lib/withdrawalStore";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
    photo?: string;
    wallet: number;
    role?: "user" | "mitra" | "admin";
  };
  balanceLabel?: string;
  mitraTotalEarnings?: number;
  onSuccess?: () => void;
}

interface DestinationOption {
  id: string;
  name: string;
  fullName: string;
  type: "bank" | "ewallet";
  short: string;
  badgeBg: string;
  badgeText: string;
}

const DESTINATION_OPTIONS: DestinationOption[] = [
  // Bank
  { id: "BCA", name: "BCA", fullName: "Bank Central Asia (BCA)", type: "bank", short: "BCA", badgeBg: "bg-blue-100 border-blue-200", badgeText: "text-blue-700" },
  { id: "Mandiri", name: "Bank Mandiri", fullName: "Bank Mandiri", type: "bank", short: "MANDIRI", badgeBg: "bg-amber-100 border-amber-200", badgeText: "text-amber-800" },
  { id: "BRI", name: "BRI", fullName: "Bank Rakyat Indonesia (BRI)", type: "bank", short: "BRI", badgeBg: "bg-sky-100 border-sky-200", badgeText: "text-sky-800" },
  { id: "BNI", name: "BNI", fullName: "Bank Negara Indonesia (BNI)", type: "bank", short: "BNI", badgeBg: "bg-teal-100 border-teal-200", badgeText: "text-teal-800" },
  { id: "BSI", name: "BSI", fullName: "Bank Syariah Indonesia (BSI)", type: "bank", short: "BSI", badgeBg: "bg-emerald-100 border-emerald-200", badgeText: "text-emerald-800" },
  { id: "CIMB", name: "CIMB Niaga", fullName: "Bank CIMB Niaga", type: "bank", short: "CIMB", badgeBg: "bg-rose-100 border-rose-200", badgeText: "text-rose-800" },
  { id: "Permata", name: "Permata", fullName: "Bank Permata", type: "bank", short: "PERMATA", badgeBg: "bg-purple-100 border-purple-200", badgeText: "text-purple-800" },
  // E-Wallet
  { id: "GoPay", name: "GoPay", fullName: "GoPay (Gojek)", type: "ewallet", short: "GOPAY", badgeBg: "bg-sky-100 border-sky-200", badgeText: "text-sky-700" },
  { id: "DANA", name: "DANA", fullName: "DANA E-Wallet", type: "ewallet", short: "DANA", badgeBg: "bg-blue-100 border-blue-200", badgeText: "text-blue-700" },
  { id: "OVO", name: "OVO", fullName: "OVO Payment", type: "ewallet", short: "OVO", badgeBg: "bg-purple-100 border-purple-200", badgeText: "text-purple-700" },
  { id: "ShopeePay", name: "ShopeePay", fullName: "ShopeePay", type: "ewallet", short: "SHOPEEPAY", badgeBg: "bg-orange-100 border-orange-200", badgeText: "text-orange-700" },
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  balanceLabel,
  mitraTotalEarnings,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDestination, setSelectedDestination] = useState<string>("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill dari riwayat penarikan terakhir agar proses cepat (tanpa perlu ketik ulang)
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem("rentmate_last_withdrawal_account");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.bank) setSelectedDestination(parsed.bank);
          if (parsed.accountNumber && !accountNumber) setAccountNumber(parsed.accountNumber);
          if (parsed.accountName && !accountName) setAccountName(parsed.accountName);
        } else if (currentUser.name && !accountName) {
          setAccountName(currentUser.name);
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen, currentUser]);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const numAmount = typeof amount === "number" ? amount : 0;
  const isInsufficient = numAmount > currentUser.wallet;
  const isBelowMin = numAmount > 0 && numAmount < 10000;
  const isValid =
    numAmount >= 10000 &&
    numAmount <= currentUser.wallet &&
    accountNumber.trim().length >= 4 &&
    accountName.trim().length >= 2;

  const handleQuickAmount = (val: number) => {
    if (val <= currentUser.wallet) {
      setAmount(val);
    } else {
      setAmount(currentUser.wallet);
    }
  };

  const handleWithdrawAll = () => {
    setAmount(currentUser.wallet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Simpan rekening terakhir untuk kemudahan penarikan cepat berikutnya
      localStorage.setItem(
        "rentmate_last_withdrawal_account",
        JSON.stringify({
          bank: selectedDestination,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        })
      );

      const res = await createWithdrawalRequest({
        userId: currentUser.id,
        userName: currentUser.name || (currentUser.role === "mitra" ? "Mitra" : "Pengguna"),
        userEmail: currentUser.email || "",
        userPhoto: currentUser.photo,
        role: currentUser.role || "user",
        amount: numAmount,
        bankName: selectedDestObj ? `${selectedDestObj.name} (${selectedDestObj.type.toUpperCase()})` : selectedDestination,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        mitraTotalEarnings,
      });

      if (res.success) {
        setStep(2);
        toast({
          title: "Permintaan Penarikan Terkirim! ⏳",
          description: `Permintaan penarikan saldo ${formatPrice(numAmount)} sedang diproses oleh admin.`,
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Gagal Mengajukan Penarikan",
          description: res.error || "Terjadi kesalahan saat memproses penarikan saldo.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Gagal Mengajukan Penarikan",
        description: err.message || "Terjadi kesalahan jaringan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setAmount("");
    onClose();
  };

  const selectedDestObj = DESTINATION_OPTIONS.find(
    (d) => d.id === selectedDestination
  ) || DESTINATION_OPTIONS[0];

  const isMitra = currentUser.role === "mitra";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-6 rounded-2xl">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 border border-orange-100 text-orange-600">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {isMitra ? "Cairkan Pendapatan Mitra" : "Tarik Saldo Dompet"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Transfer saldo langsung ke rekening bank atau akun e-wallet Anda
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Saldo info card - Elevated Luxury Style dengan Aksen Garis Oranye & Shadow */}
            <div className="p-4 rounded-2xl flex items-center justify-between border border-border/80 border-l-[5px] border-l-orange-500 bg-card shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {balanceLabel || (isMitra ? "Saldo Pendapatan Tersedia" : "Saldo Dompet")}
                  </span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 font-medium">
                    Siap Tarik
                  </Badge>
                </div>
                <p className="text-2xl font-extrabold text-foreground tracking-tight">
                  {formatPrice(currentUser.wallet)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleWithdrawAll}
                disabled={currentUser.wallet <= 0}
                className="relative z-10 text-xs h-8 px-3.5 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold rounded-xl transition-colors"
              >
                Tarik Semua
              </Button>
            </div>

            {/* Pilihan Bank / E-Wallet via Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Tujuan Rekening / E-Wallet
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Pilih Bank / Dompet Digital
                </span>
              </Label>

              <Select
                value={selectedDestination}
                onValueChange={(val) => setSelectedDestination(val)}
              >
                <SelectTrigger className="w-full h-11 text-sm bg-background border-input rounded-xl px-3 hover:border-gray-400 focus:ring-1 transition-all">
                  <div className="flex items-center gap-2.5 truncate w-full text-left">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${selectedDestObj.badgeBg} ${selectedDestObj.badgeText}`}>
                      {selectedDestObj.short}
                    </span>
                    <span className="font-semibold text-foreground text-sm truncate">
                      {selectedDestObj.fullName}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-medium ml-auto shrink-0 ${
                        selectedDestObj.type === "bank"
                          ? "border-blue-200 bg-blue-50/60 text-blue-700"
                          : "border-emerald-200 bg-emerald-50/60 text-emerald-700"
                      }`}
                    >
                      {selectedDestObj.type === "bank" ? "Transfer Bank" : "E-Wallet"}
                    </Badge>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectGroup>
                    <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" /> Transfer Rekening Bank
                    </SelectLabel>
                    {DESTINATION_OPTIONS.filter((d) => d.type === "bank").map((dest) => (
                      <SelectItem key={dest.id} value={dest.id} className="py-2 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${dest.badgeBg} ${dest.badgeText}`}>
                            {dest.short}
                          </span>
                          <span className="text-sm font-medium text-foreground">{dest.fullName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Dompet Digital (E-Wallet)
                    </SelectLabel>
                    {DESTINATION_OPTIONS.filter((d) => d.type === "ewallet").map((dest) => (
                      <SelectItem key={dest.id} value={dest.id} className="py-2 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${dest.badgeBg} ${dest.badgeText}`}>
                            {dest.short}
                          </span>
                          <span className="text-sm font-medium text-foreground">{dest.fullName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Input Rekening & Nama Pemilik Berjajar 2 Kolom - Rapi & Menghemat Ruang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-number" className="text-xs font-semibold text-foreground">
                  {selectedDestObj.type === "ewallet" ? "Nomor HP E-Wallet" : "Nomor Rekening"}
                </Label>
                <Input
                  id="acc-number"
                  placeholder={
                    selectedDestObj.type === "ewallet"
                      ? "Contoh: 081234567890"
                      : "Nomor rekening bank"
                  }
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="h-10 text-sm font-mono rounded-xl bg-background border-input focus-visible:ring-orange-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-name" className="text-xs font-semibold text-foreground">
                  Nama Pemilik Rekening
                </Label>
                <Input
                  id="acc-name"
                  placeholder="Nama sesuai buku tabungan"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="h-10 text-sm rounded-xl bg-background border-input focus-visible:ring-orange-500"
                  required
                />
              </div>
            </div>

            {/* Nominal Penarikan */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="amount" className="text-xs font-semibold text-foreground">
                  Nominal Penarikan
                </Label>
                {numAmount > 0 && !isInsufficient && (
                  <span className="text-[11px] text-muted-foreground">
                    Sisa saldo: <strong className="text-foreground">{formatPrice(currentUser.wallet - numAmount)}</strong>
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value ? Number(e.target.value) : "")
                  }
                  className="pl-11 h-11 text-base font-extrabold rounded-xl bg-background border-input focus-visible:ring-orange-500"
                  min={10000}
                  max={currentUser.wallet}
                  required
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={currentUser.wallet < val}
                    className={`text-xs py-1.5 px-3 rounded-xl border font-medium transition-all ${
                      amount === val
                        ? "border-orange-500 bg-orange-500 text-white font-semibold shadow-xs"
                        : "border-border text-foreground hover:border-orange-300 hover:bg-orange-50/40 bg-background"
                    } disabled:opacity-40 disabled:pointer-events-none`}
                  >
                    {formatPrice(val)}
                  </button>
                ))}
              </div>

              {/* Validation Alerts */}
              {isInsufficient && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Saldo tidak mencukupi. Saldo tersedia hanya{" "}
                    <strong>{formatPrice(currentUser.wallet)}</strong>.
                  </span>
                </div>
              )}
              {isBelowMin && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Minimal penarikan saldo adalah Rp 10.000.</span>
                </div>
              )}
            </div>

            {/* Info Transparansi Modern & Elegan (Menggantikan Kotak Disclaimer yang Kaku) */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground">Biaya Admin:</span>
                <span className="font-bold text-emerald-600">Gratis (Rp 0)</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Proses 1×24 Jam Kerja</span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-10 px-4 text-xs font-medium rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="h-10 px-6 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xs gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    {numAmount > 0 ? `Cairkan ${formatPrice(numAmount)}` : "Konfirmasi Penarikan"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Step 2: Sukses */
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-orange-100 text-orange-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                Permintaan Tarik Saldo Terkirim!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Permintaan penarikan saldo kamu telah dicatat dalam sistem dan sedang menunggu proses transfer dari tim admin.
              </DialogDescription>
            </div>

            <Card className="p-4 bg-muted/40 border text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Jumlah Penarikan</span>
                <span className="font-extrabold text-base text-orange-600">
                  {formatPrice(numAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tujuan</span>
                <span className="font-semibold text-foreground">
                  {selectedDestObj?.fullName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">No. Rekening / Akun</span>
                <span className="font-mono font-medium text-foreground">
                  {accountNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nama Penerima</span>
                <span className="font-semibold text-foreground">
                  {accountName}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                  <Clock className="w-3 h-3 mr-1" /> Menunggu Transfer Admin
                </Badge>
              </div>
            </Card>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Kamu akan menerima notifikasi otomatis ketika Admin telah mentransfer dana ke rekening kamu. Status penarikan juga dapat dipantau di riwayat penarikan kamu.
            </p>

            <DialogFooter className="pt-2">
              <Button
                className="w-full text-white bg-orange-500 hover:bg-orange-600 font-semibold"
                onClick={handleClose}
              >
                Selesai & Tutup
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
