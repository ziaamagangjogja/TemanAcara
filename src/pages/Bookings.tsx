import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, MessageCircle, Star, ChevronRight, Lock, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { talents } from "@/data/mockData";
import { getBookings, refreshBookingsFromSupabase, SharedBooking, deleteBooking } from "@/lib/bookingStore";
import { getCurrentUser } from "@/lib/userStore";
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BookingStatus = "pending_payment" | "pending_approval" | "approved" | "completed" | "cancelled";

export default function Bookings() {
  const [bookings, setBookings] = useState<SharedBooking[]>([]);
  const [allTalents, setAllTalents] = useState<any[]>(talents);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      const [allBookings, loadedTalents] = await Promise.all([
        refreshBookingsFromSupabase(),
        getAllVerifiedTalents(),
      ]);
      setAllTalents(loadedTalents);
      const currentUser = await getCurrentUser();

      if (currentUser) {
        const userBookings = allBookings.filter(b => b.userId === currentUser.id);
        setBookings(userBookings);
      } else {
        setBookings([]);
      }
      setIsLoading(false);
    };

    fetchBookings();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getBookingStatus = (booking: SharedBooking): BookingStatus | "pending_mitra" => {
    if (booking.approvalStatus === "completed") return "completed";
    if (booking.approvalStatus === "rejected") return "cancelled";

    // Pengecekan tanggal/jam: jika tanggal booking sudah lewat dari sekarang, otomatis "completed"
    if (booking.date) {
      const now = new Date();
      const timeStr = booking.time ? (booking.time.length === 5 ? `${booking.time}:00` : booking.time) : "00:00:00";
      const startTime = new Date(`${booking.date}T${timeStr}`);
      const durationHours = booking.duration || 1;
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

      if (!isNaN(endTime.getTime()) && endTime < now) {
        return "completed";
      }
    }

    if (booking.paymentStatus === "pending") return "pending_payment";
    if ((booking.approvalStatus as string) === "pending_mitra") return "pending_mitra";
    if (booking.approvalStatus === "pending_approval") return "pending_approval";
    if (booking.approvalStatus === "approved") return "approved";

    return "completed";
  };

  const getStatusBadge = (status: BookingStatus | "pending_mitra") => {
    switch (status) {
      case "pending_payment":
        return <Badge variant="warning">Menunggu Pembayaran</Badge>;
      case "pending_approval":
        return <Badge variant="accent">Menunggu Persetujuan Admin</Badge>;
      case "pending_mitra":
        return <Badge variant="accent">Menunggu Persetujuan Mitra</Badge>;
      case "approved":
        return <Badge variant="success">Disetujui</Badge>;
      case "completed":
        return <Badge variant="secondary">Selesai</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return null;
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const ok = await deleteBooking(bookingId);
    if (ok) {
      setBookings(prevBookings => prevBookings.filter(booking => booking.id !== bookingId));
    }
  };

  const activeBookings = bookings.filter((b) => {
    const status = getBookingStatus(b);
    return status === "approved" || status === "pending_approval" || status === "pending_mitra" || status === "pending_payment";
  });

  const completedBookings = bookings.filter((b) => {
    const status = getBookingStatus(b);
    return status === "completed" || status === "cancelled";
  });

  const BookingCard = ({ booking }: { booking: SharedBooking }) => {
    const talent = allTalents.find(
      (item) => item.id === booking.talentId || item.talentId === booking.talentId
    );
    const talentName = talent?.name || booking.talentName || "Talent";
    const talentPhoto = talent?.photo || booking.talentPhoto || "";
    const talentCity = talent?.city || "Tidak diketahui";
    const canChat = getBookingStatus(booking) === "approved";
    const bookingStatus = getBookingStatus(booking);
    const canDelete = bookingStatus === "pending_payment" || bookingStatus === "pending_approval";

    return (
      <Card hover className="overflow-hidden">
        <div className="flex">
          <img
            src={talentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(talentName)}&background=f3f4f6&color=6b7280`}
            alt={talentName}
            className="w-28 md:w-36 object-cover"
          />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold">{talentName}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {talentCity}
                </div>
              </div>
              {getStatusBadge(bookingStatus)}
            </div>

            <p className="text-sm text-primary font-medium mb-2">
              {booking.purpose}
            </p>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(booking.date).toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {booking.time} • {booking.duration} jam
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-bold text-primary">
                {formatPrice(booking.total)}
              </span>
              <div className="flex gap-2">
                {bookingStatus === "pending_payment" && (
                  <Link to={`/booking/${booking.talentId}`}>
                    <Button size="sm" variant="hero" className="gap-1">
                      Bayar Sekarang
                    </Button>
                  </Link>
                )}
                {bookingStatus === "pending_approval" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span>Percakapan belum aktif</span>
                  </div>
                )}
                {canChat && (
                  <Link to={`/chat/${booking.id}`}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <MessageCircle className="w-4 h-4" />
                      Percakapan
                    </Button>
                  </Link>
                )}
                {bookingStatus === "completed" && (
                  <Link to={`/booking/${booking.talentId}`}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Star className="w-4 h-4" />
                      Beri Ulasan
                    </Button>
                  </Link>
                )}
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pemesanan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus pemesanan dengan {talentName}? 
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Link to={`/talent/${booking.talentId}`}>
                  <Button size="sm" variant="ghost" className="gap-1">
                    Detail
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm pt-20 md:pt-24 pb-24 md:pb-8 flex items-center justify-center">
        <p>Memuat pemesanan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 md:pt-24 pb-24 md:pb-8">
      <div className="container max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Pesanan Saya</h1>

        <Card className="p-4 mb-6 bg-accent/30 border-primary/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Alur Pemesanan RentMate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pilih Teman → Bayar → Tunggu Persetujuan Admin → Percakapan Aktif
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="active">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="active" className="gap-2">
              Aktif
              {activeBookings.length > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeBookings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Selesai</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeBookings.length > 0 ? (
              activeBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            ) : (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Belum Ada Pemesanan</h3>
                <p className="text-muted-foreground mb-6">
                  Kamu belum memiliki pemesanan yang aktif
                </p>
                <Link to="/talents">
                  <Button variant="hero">Pilih Teman</Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length > 0 ? (
              completedBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            ) : (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Belum Ada Riwayat</h3>
                <p className="text-muted-foreground">
                  Pemesanan yang sudah selesai akan muncul di sini
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}