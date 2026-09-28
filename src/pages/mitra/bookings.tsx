import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';

import { getCurrentMitra } from '@/lib/mitraStore';
import { getMitraBookings, SharedBooking, refreshBookingsFromSupabase } from '@/lib/bookingStore';
import { getOrCreateChatSession } from '@/lib/chatStore';

export default function MitraBookingsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<SharedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mitra = getCurrentMitra();
    if (!mitra) {
      navigate('/');
      return;
    }

    const loadBookings = async () => {
      setLoading(true);
      try {
        await refreshBookingsFromSupabase();
      } catch (e) {
        console.error("Gagal refresh bookings:", e);
      }
      
      // Ambil berdasarkan mitra.id atau mitra.talentId agar fleksibel
      const all = getMitraBookings(mitra.id);
      const byTalent = mitra.talentId ? getMitraBookings(mitra.talentId) : [];
      
      // Gabungkan dan hilangkan duplikat
      const combined = [...all, ...byTalent];
      const unique = Array.from(new Set(combined.map(b => b.id)))
        .map(id => combined.find(b => b.id === id)!);

      // Urutkan dari yang terbaru
      unique.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setBookings(unique);
      setLoading(false);
    };

    loadBookings();

    // Listener agar data langsung ter-update otomatis saat ada user yang booking
    window.addEventListener("bookingsUpdated", loadBookings);
    return () => {
      window.removeEventListener("bookingsUpdated", loadBookings);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Booking Saya</h1>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Belum ada booking masuk.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {booking.userName}
                </CardTitle>
                <Badge>
                  {booking.approvalStatus === 'approved'
                    ? 'Disetujui'
                    : booking.approvalStatus === 'pending_approval'
                    ? 'Menunggu'
                    : booking.approvalStatus === 'completed'
                    ? 'Selesai'
                    : 'Ditolak'}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="text-sm"><b>Keperluan:</b> {booking.purpose}</p>
                <p className="text-sm"><b>Durasi:</b> {booking.duration} jam</p>
                <p className="text-sm">
                  <b>Tanggal:</b> {booking.date} — {booking.time}
                </p>

                {booking.approvalStatus === 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      getOrCreateChatSession(booking);
                      navigate(`/mitra/chat/${booking.id}`);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Buka Chat
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}