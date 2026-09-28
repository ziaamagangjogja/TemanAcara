import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Star,
  BadgeCheck,
  Heart,
  Share2,
  Shield,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import { refreshBookingsFromSupabase } from "@/lib/bookingStore";

// Bentuk data talent yang benar-benar dipakai halaman ini. Field dari API
// (getAllVerifiedTalents) bersifat opsional karena talent legacy memakai field
// yang berbeda (bio, pricePerHour, verified, dst).
interface TalentView {
  id: string;
  talentId?: string;
  name: string;
  photo?: string;
  city?: string;
  age?: number;
  gender?: string;
  price?: number;
  pricePerHour?: number;
  availability?: "online" | "offline" | "both";
  bio?: string;
  description?: string;
  hobbies?: string;
  skills?: string[];
  rules?: string[];
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  verified?: boolean;
}

interface TalentReview {
  id: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment?: string;
  date?: string;
  /** true untuk ulasan pengisi (demo), false/undefined untuk ulasan nyata. */
  isDemo?: boolean;
}



export default function TalentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [talent, setTalent] = useState<TalentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [userReviews, setUserReviews] = useState<TalentReview[]>([]);

  // Pagination ulasan: hanya render sebagian dulu agar halaman tidak berat saat
  // reviewCount besar (ratusan). User bisa klik untuk menampilkan sisanya.
  const REVIEWS_PAGE_SIZE = 6;
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEWS_PAGE_SIZE);

  // Reset jumlah ulasan yang tampil setiap kali pindah ke talent lain.
  useEffect(() => {
    setVisibleReviewCount(REVIEWS_PAGE_SIZE);
  }, [id]);

  const loadTalentDetail = useCallback(async () => {
    if (!id) {
      setError("ID Talent tidak ditemukan.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const allTalents = await getAllVerifiedTalents();
      // Cocokkan berdasarkan id ATAU talentId, karena getMerchants mengembalikan
      // keduanya dan keduanya bisa jadi sumber rute yang berbeda.
      const foundTalent = Array.isArray(allTalents)
        ? allTalents.find((t) => t.id === id || t.talentId === id)
        : null;

      if (foundTalent) {
        setTalent(foundTalent as TalentView);
      } else {
        navigate("/talents");
        return;
      }
    } catch (err) {
    console.error("Gagal memuat detail talent:", err);
    setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadTalentDetail();
  }, [loadTalentDetail]);

  useEffect(() => {
    if (!id) return;

    const loadUserReviews = async () => {
      try {
        const bookings = await refreshBookingsFromSupabase();
        const ratedBookings = bookings.filter(
          (booking) => booking.talentId === id && typeof booking.rating === "number"
        );

        const reviewsWithUsers = await Promise.all(
          ratedBookings.map(async (booking) => {
            let userName = booking.userName || "User";
            let userPhoto = booking.userPhoto || "";

            try {
              const response = await fetch(`/api/users/id/${encodeURIComponent(booking.userId)}`);
              if (response.ok) {
                const user = await response.json();
                userName = user.name || user.username || userName;
                userPhoto = user.photo || userPhoto;
              }
            } catch {
              // Gunakan data snapshot booking jika profil user tidak tersedia.
            }

            return {
              id: `booking_review_${booking.id}`,
              talentId: booking.talentId,
              userName,
              userPhoto,
              rating: booking.rating,
              comment: booking.ratingComment || "",
              date: booking.createdAt,
            };
          })
        );

        setUserReviews(reviewsWithUsers);
      } catch (error) {
        console.error("Gagal memuat ulasan user:", error);
        setUserReviews([]);
      }
    };

    void loadUserReviews();
  }, [id]);

  const talentReviews = userReviews;
  const reviewCount = talentReviews.length;
  const calculatedRating = useMemo(() => {
    if (talentReviews.length === 0) return 0;
    const sum = talentReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return Number((sum / talentReviews.length).toFixed(1));
  }, [talentReviews]);

  // Header & daftar ulasan memakai SATU sumber angka (talentReviews) agar
  // tidak mungkin berbeda. displayReviewCount selalu == talentReviews.length.
  const displayRating = reviewCount > 0 ? calculatedRating : talent?.rating ?? 0;
  const displayReviewCount = reviewCount;

  // Hanya sebagian ulasan yang dirender pada awalnya (performa).
  const visibleReviews = useMemo(
    () => talentReviews.slice(0, visibleReviewCount),
    [talentReviews, visibleReviewCount]
  );
  const hasMoreReviews = visibleReviewCount < talentReviews.length;
  const remainingReviewCount = talentReviews.length - visibleReviewCount;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format tanggal aman: string tanpa jam (YYYY-MM-DD) di-parse sebagai UTC oleh
  // JS sehingga bisa geser 1 hari di zona WIB. Tanggal tak valid ditampilkan ".".
  const formatReviewDate = (value?: string) => {
    if (!value) return "";
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Harga efektif; hindari menampilkan "Rp 0" saat data harga tidak tersedia.
  const talentPrice =
    (typeof talent?.price === "number" && talent.price > 0 ? talent.price : undefined) ??
    (typeof talent?.pricePerHour === "number" && talent.pricePerHour > 0 ? talent.pricePerHour : undefined);

  // Link booking memakai talentId bila tersedia (konsisten dengan store lain).
  const bookingId = talent?.talentId || talent?.id;

  const handleShare = useCallback(async () => {
    if (!talent) return;
    const shareData = {
      title: `${talent.name} di Teman Acara`,
      text: `Kenalan dengan ${talent.name}${talent.city ? ` dari ${talent.city}` : ""}!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Tautan disalin",
          description: "Bagikan tautan profil ini ke temanmu.",
        });
      }
    } catch (err) {
      // Pembatalan share oleh user (AbortError) bukan error yang perlu ditampilkan.
      if ((err as Error)?.name !== "AbortError") {
        console.error("Gagal membagikan profil talent:", err);
      }
    }
  }, [talent, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm pb-32 md:pb-8">
        <div className="container pt-16 md:pt-24">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-card bg-gray-200 animate-pulse"></div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="h-10 bg-gray-200 rounded mb-2 w-3/4 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded mb-3 w-1/2 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate("/talents")}>Kembali ke Daftar Teman</Button>
        </div>
      </div>
    );
  }

  if (!talent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-warm pb-32 md:pb-8">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Kembali">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLiked(!liked)} aria-label={liked ? "Hapus dari favorit" : "Tambah ke favorit"}>
              <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Bagikan">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container pt-16 md:pt-24">
        {/* Desktop Back Button */}
        <div className="hidden md:block mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="space-y-4">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-card">
              <img src={talent.photo} alt={talent.name} className="w-full h-full object-cover" />
              {(talent.isVerified || talent.verified) && (
                <div className="absolute top-4 left-4">
                  <Badge className="gap-1">
                    <BadgeCheck className="w-4 h-4" />
                    Terverifikasi
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Talent Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">{talent.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <span>{talent.age} tahun</span>
                    <span>•</span>
                    <span>{talent.gender}</span>
                  </div>
                </div>
                <div className="hidden md:flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setLiked(!liked)} aria-label={liked ? "Hapus dari favorit" : "Tambah ke favorit"}>
                    <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Bagikan">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{talent.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{displayRating}</span>
                  <span className="text-muted-foreground">({displayReviewCount} ulasan)</span>
                </div>
              </div>
            </div>

            {/* Price Card */}
            <Card className="p-6 bg-accent/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mulai dari</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-primary">
                      {talentPrice ? formatPrice(talentPrice) : "Harga belum tersedia"}
                    </span>
                    {talentPrice && <span className="text-muted-foreground">/jam</span>}
                  </div>
                </div>
                <Badge variant={talent.availability === "online" ? "accent" : talent.availability === "offline" ? "secondary" : "success"} className="text-sm px-4 py-2">
                  {talent.availability === "online" ? "Hanya Online" : talent.availability === "offline" ? "Hanya Offline" : "Online & Offline"}
                </Badge>
              </div>
            </Card>

            {/* Skills/Hobbies */}
            {talent.hobbies && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" /> Hobi & Keahlian
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{talent.hobbies}</p>
              </div>
            )}

            {!talent.hobbies && talent.skills && (
              <div>
                <h3 className="font-semibold mb-3">Keahlian</h3>
                <div className="flex flex-wrap gap-2">
                  {(talent.skills || []).map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="px-4 py-2">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            <div>
              <h3 className="font-semibold mb-3">Tentang Saya</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{talent.bio || talent.description || "Tidak ada deskripsi."}</p>
            </div>

            {/* Rules */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Aturan & Preferensi
              </h3>
              <ul className="space-y-2">
                {(talent.rules || []).map((rule: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="hidden md:block">
              <Link to={`/booking/${bookingId}`}>
                <Button variant="hero" size="xl" className="w-full">
                  Pesan Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Ulasan */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Ulasan ({talentReviews.length})</h2>
          {talentReviews.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {visibleReviews.map((review) => (
                <Card key={review.id} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={review.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=f3f4f6&color=6b7280`}
                      alt={review.userName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{review.userName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatReviewDate(review.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Belum ada ulasan</p>
            </Card>
          )}

          {/* Tombol untuk memuat lebih banyak ulasan */}
          {hasMoreReviews && (
            <div className="mt-6 flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Menampilkan {visibleReviews.length} dari {talentReviews.length} ulasan
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setVisibleReviewCount((c) => c + 6)}
                >
                  Tampilkan 6 lagi ({remainingReviewCount} sisa)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setVisibleReviewCount(talentReviews.length)}
                >
                  Lihat semua ulasan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Fixed CTA */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Mulai dari</p>
            <p className="text-xl font-bold text-primary">
              {talentPrice ? formatPrice(talentPrice) : "- -"}
              {talentPrice && <span className="text-sm font-normal text-muted-foreground">/jam</span>}
            </p>
          </div>
          <Link to={`/booking/${bookingId}`}>
            <Button variant="hero" size="lg">
              Pesan Sekarang
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}