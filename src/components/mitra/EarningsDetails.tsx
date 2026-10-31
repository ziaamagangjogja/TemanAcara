import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Smartphone,
  Eye,
  Wallet,
  Receipt,
  Sparkles,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { calculateMitraEarnings, getBookings, isBookingCompleted } from "@/lib/bookingStore";
import { getAppCommission } from "@/lib/paymentUtils";
import { getCurrentMitra } from "@/lib/mitraStore";
import {
  getUserWithdrawalRequests,
  WithdrawalRequest,
} from "@/lib/withdrawalStore";
import { WithdrawalModal } from "@/components/WithdrawalModal";

interface EarningsDetailsProps {
  isTalentMode: boolean;
}

export function EarningsDetails({ isTalentMode }: EarningsDetailsProps) {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [recentEarnings, setRecentEarnings] = useState<
    Array<{
      id: string;
      date: string;
      amount: number;
      commission: number;
      netAmount: number;
      userName: string;
    }>
  >([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);
  const [currentMitra, setCurrentMitra] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const mitra = getCurrentMitra();
    if (!mitra || !mitra.id) {
      setIsLoading(false);
      return;
    }
    setCurrentMitra(mitra);

    // Hitung total pendapatan menggunakan fungsi dari bookingStore
    const earnings = calculateMitraEarnings(mitra.talentId, isTalentMode);
    setTotalEarnings(earnings);

    // Ambil detail pendapatan booking terbaru
    const allBookings = getBookings();
    let mitraBookings = [];

    if (isTalentMode) {
      mitraBookings = allBookings.filter(
        (booking) =>
          booking.talentId === mitra.talentId && isBookingCompleted(booking)
      );
    } else {
      mitraBookings = allBookings.filter(
        (booking) =>
          booking.userId === mitra.talentId && isBookingCompleted(booking)
      );
    }

    const recent = mitraBookings
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((booking) => {
        const totalAmount = booking.total || 0;
        const commissionPercentage = getAppCommission();
        const commissionAmount = Math.round(
          totalAmount * (commissionPercentage / 100)
        );
        const netAmount = totalAmount - commissionAmount;

        return {
          id: booking.id,
          date: booking.date,
          amount: totalAmount,
          commission: commissionAmount,
          netAmount,
          userName: booking.userName,
        };
      });

    setRecentEarnings(recent);

    // Ambil riwayat penarikan dana mitra
    try {
      const wdData = await getUserWithdrawalRequests(mitra.talentId);
      setWithdrawals(wdData);
    } catch {
      // fallback
    }

    setIsLoading(false);
  }, [isTalentMode]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("withdrawalRequestsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("withdrawalRequestsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadData]);

  // Perhitungan saldo ditarik & tersedia
  const pendingWithdrawalAmount = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const approvedWithdrawalAmount = withdrawals
    .filter((w) => w.status === "approved")
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const availableToWithdraw = Math.max(
    0,
    totalEarnings - pendingWithdrawalAmount - approvedWithdrawalAmount
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kartu Dompet & Ringkasan Pencairan Mitra - Clean Luxury Style dengan Aksen Garis Oranye di Samping */}
      <Card className="p-6 bg-card border border-border/80 border-l-[6px] border-l-orange-500 rounded-2xl shadow-md shadow-orange-500/5 relative overflow-hidden transition-all hover:shadow-lg hover:shadow-orange-500/10">
        {/* Soft subtle warm ambient glow in the top-right corner */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100/80 text-orange-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Saldo Pendapatan Tersedia
              </span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/80 text-[10px] px-2 py-0.5 font-medium">
                Siap Dicairkan
              </Badge>
            </div>
            
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {formatPrice(availableToWithdraw)}
            </div>
            
            <p className="text-xs text-muted-foreground max-w-md">
              Penghasilan bersih dari pemesanan selesai yang dapat langsung kamu tarik ke rekening bank atau e-wallet.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setIsWithdrawModalOpen(true)}
              disabled={availableToWithdraw < 10000}
              className="h-10 px-5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs gap-2 rounded-xl transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Tarik Saldo Pendapatan
            </Button>
          </div>
        </div>

        {/* Breakdown baris kecil */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border/60 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Total Penghasilan</span>
            <span className="font-bold text-sm text-foreground mt-0.5 block">{formatPrice(totalEarnings)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Sedang Diproses</span>
            <span className="font-bold text-sm text-amber-600 mt-0.5 block">
              {formatPrice(pendingWithdrawalAmount)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Sudah Ditransfer</span>
            <span className="font-bold text-sm text-emerald-600 mt-0.5 block">
              {formatPrice(approvedWithdrawalAmount)}
            </span>
          </div>
        </div>
      </Card>

      {/* Riwayat Penarikan Saldo Mitra */}
      <Card className="p-5 md:p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Riwayat Penarikan Dana</h3>
            <p className="text-xs text-muted-foreground">
              Catatan transfer pencairan dana ke rekening bank / e-wallet kamu
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {withdrawals.length} Penarikan
          </Badge>
        </div>

        {withdrawals.length > 0 ? (
          <div className="space-y-3">
            {withdrawals.map((wd) => (
              <div
                key={wd.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      wd.status === "approved"
                        ? "bg-emerald-100 text-emerald-600"
                        : wd.status === "pending"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {wd.status === "approved" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : wd.status === "pending" ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {formatPrice(wd.amount)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-medium gap-1"
                      >
                        {["DANA", "GoPay", "OVO"].includes(wd.bankName) ? (
                          <Smartphone className="w-2.5 h-2.5 text-blue-500" />
                        ) : (
                          <Building2 className="w-2.5 h-2.5 text-orange-500" />
                        )}
                        {wd.bankName}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ke: <span className="font-mono text-foreground">{wd.accountNumber}</span> a.n{" "}
                      <span className="font-medium text-foreground">{wd.accountName}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Diajukan: {new Date(wd.createdAt).toLocaleString("id-ID")}
                    </p>
                    {wd.adminNote && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic bg-background p-1.5 rounded border">
                        Catatan Admin: {wd.adminNote}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0">
                  {wd.status === "pending" && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-medium text-[11px]">
                      Menunggu Transfer
                    </Badge>
                  )}
                  {wd.status === "approved" && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-[11px]">
                      Selesai Ditransfer
                    </Badge>
                  )}
                  {wd.status === "rejected" && (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-medium text-[11px]">
                      Ditolak & Dikembalikan
                    </Badge>
                  )}

                  {wd.proofImageBase64 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary gap-1"
                      onClick={() => setSelectedProofImage(wd.proofImageBase64 || null)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Bukti Transfer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed rounded-xl">
            <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">
              Belum ada riwayat penarikan dana. Klik tombol "Tarik Saldo Pendapatan" di atas jika saldo mencukupi.
            </p>
          </div>
        )}
      </Card>

      {/* Rincian Pendapatan Pemesanan Terbaru */}
      <Card className="p-5 md:p-6 rounded-2xl border shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4">
          Pemesanan Selesai Terbaru
        </h3>
        {recentEarnings.length > 0 ? (
          <div className="space-y-3">
            {recentEarnings.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between p-3.5 border rounded-xl bg-card hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">{earning.userName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(earning.date).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total: {formatPrice(earning.amount)} - Komisi Platform (20%):{" "}
                    {formatPrice(earning.commission)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-sm text-orange-600">
                    +{formatPrice(earning.netAmount)}
                  </p>
                  <Badge variant="outline" className="text-[10px] mt-0.5 border-orange-200 bg-orange-50/60 text-orange-700">
                    Bersih (80%)
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {isTalentMode
                ? "Belum ada pendapatan dari booking yang selesai"
                : "Belum ada pengeluaran dari booking yang selesai"}
            </p>
          </div>
        )}
      </Card>

      {/* Modal Penarikan Saldo Mitra */}
      {currentMitra && (
        <WithdrawalModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          currentUser={{
            id: currentMitra.talentId,
            name: currentMitra.name || "Mitra",
            email: currentMitra.email || "",
            photo: currentMitra.photo,
            wallet: availableToWithdraw,
            role: "mitra",
          }}
          balanceLabel="Saldo Pendapatan Tersedia"
          mitraTotalEarnings={totalEarnings}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal Preview Bukti Transfer Admin */}
      <Dialog
        open={!!selectedProofImage}
        onOpenChange={(open) => !open && setSelectedProofImage(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Bukti Transfer Admin</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex items-center justify-center p-2 rounded-xl bg-muted/30 border">
            {selectedProofImage && (
              <img
                src={selectedProofImage}
                alt="Bukti Transfer Admin"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}