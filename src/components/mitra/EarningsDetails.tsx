import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { calculateMitraEarnings, getBookings, isBookingCompleted } from "@/lib/bookingStore";
import { getAppCommission } from "@/lib/paymentUtils";
import { getCurrentMitra } from "@/lib/mitraStore";

interface EarningsDetailsProps {
  isTalentMode: boolean;
}

export function EarningsDetails({ isTalentMode }: EarningsDetailsProps) {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [recentEarnings, setRecentEarnings] = useState<Array<{
    id: string;
    date: string;
    amount: number;
    commission: number;
    netAmount: number;
    userName: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentMitra = getCurrentMitra();
    if (!currentMitra || !currentMitra.id) {
      setIsLoading(false);
      return;
    }

    // Hitung total pendapatan menggunakan fungsi dari bookingStore
    const earnings = calculateMitraEarnings(currentMitra.talentId, isTalentMode);
    setTotalEarnings(earnings);

    // Ambil detail pendapatan terbaru
    const allBookings = getBookings();
    let mitraBookings = [];
    
    if (isTalentMode) {
      mitraBookings = allBookings.filter(
        (booking) => booking.talentId === currentMitra.talentId && isBookingCompleted(booking)
      );
    } else {
      mitraBookings = allBookings.filter(
        (booking) => 
          booking.userId === currentMitra.talentId && 
          isBookingCompleted(booking)
      );
    }
    
    // Ambil 5 booking terbaru yang sudah selesai
    const recent = mitraBookings
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(booking => {
        const totalAmount = booking.total || 0;
        const commissionPercentage = getAppCommission();
        const commissionAmount = Math.round(totalAmount * (commissionPercentage / 100));
        const netAmount = totalAmount - commissionAmount;
        
        return {
          id: booking.id,
          date: booking.date,
          amount: totalAmount,
          commission: commissionAmount,
          netAmount,
          userName: booking.userName, // Tambahkan userName untuk ditampilkan
        };
      });
    
    setRecentEarnings(recent);
    setIsLoading(false);
  }, [isTalentMode]);

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
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Total Pendapatan</h3>
        <div className="text-3xl font-bold text-primary">{formatPrice(totalEarnings)}</div>
        <p className="text-sm text-muted-foreground mt-2">
          {isTalentMode 
            ? "Total pendapatan Anda sebagai talent setelah dipotong komisi" 
            : "Total pengeluaran Anda sebagai booker"}
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Pendapatan Terbaru</h3>
        {recentEarnings.length > 0 ? (
          <div className="space-y-4">
            {recentEarnings.map((earning) => (
              <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{earning.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(earning.date).toLocaleDateString("id-ID", { 
                      weekday: "long", 
                      year: "numeric", 
                      month: "long", 
                      day: "numeric" 
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatPrice(earning.amount)} - Komisi: {formatPrice(earning.commission)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(earning.netAmount)}</p>
                  <Badge variant="outline" className="text-xs">
                    {isTalentMode ? "Diterima" : "Dibayarkan"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {isTalentMode 
                ? "Belum ada pendapatan dari booking yang selesai" 
                : "Belum ada pengeluaran dari booking yang selesai"}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}