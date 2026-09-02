// src/pages/mitra/MitraTalentDetail.tsx

import { useState, useEffect, useCallback, useMemo } from "react"; // PERFORMA: Tambahkan useMemo dan useCallback
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  BadgeCheck,
  Heart,
  Share2,
  Shield,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import { reviews } from "@/data/mockData";

// PERFORMA: Buat instance Intl.NumberFormat sekali di luar komponen agar tidak dibuat ulang
const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

// PERFORMA: Pindahkan fungsi formatPrice ke luar dan gunakan instance yang sudah dibuat
const formatPrice = (price: number) => priceFormatter.format(price);

export default function MitraTalentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [talent, setTalent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  const loadTalentDetail = useCallback(async () => {
    if (!id) {
      setError("ID Mitra tidak ditemukan.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const allTalents = await getAllVerifiedTalents();
      const foundTalent = Array.isArray(allTalents) ? allTalents.find((t) => t.id === id) : null;
      
      if (foundTalent) {
        setTalent(foundTalent);
      } else {
        setTalent(null);
      }
    } catch (err: any) {
      console.error("Gagal memuat detail mitra:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTalentDetail();
  }, [loadTalentDetail]);

  useEffect(() => {
    if (!isLoading) {
      if (error || !talent) {
        navigate("/mitra/talents");
      }
    }
  }, [isLoading, error, talent, navigate]);

  // PERFORMA: Memoisasi perhitungan ulasan untuk mencegah pembacaan localStorage dan parsing berulang
  const talentReviews = useMemo(() => {
    let userReviews = [];
    try {
      const stored = localStorage.getItem("rentmate_user_reviews");
      if (stored) {
        const arr = JSON.parse(stored) as Array<{ bookingId: string; rating: number; comment: string; talentId: string }>;
        userReviews = arr
          .filter((r) => r.talentId === id)
          .map((r, idx) => ({
            id: `ur_${idx}_${r.bookingId}`,
            talentId: r.talentId,
            userName: "Anda",
            userPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
            rating: r.rating,
            comment: r.comment,
            date: new Date().toISOString(),
          }));
      }
    } catch {
      // Handle error silently
    }
    
    return [...reviews.filter((r) => r.talentId === id), ...userReviews];
  }, [id]); // Hanya dihitung ulang jika id berubah

  // PERFORMA: Bungkus event handler dengan useCallback
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleToggleLike = useCallback(() => {
    setLiked(prev => !prev);
  }, []);

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

  // Jika semua baik, render detail talent
  return (
    <div className="min-h-screen bg-gradient-warm pb-32 md:pb-8">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between p-4">
          {/* PERFORMA: Gunakan handler yang sudah di-memo */}
          <Button variant="ghost" size="icon" onClick={handleGoBack} aria-label="Kembali">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleToggleLike} aria-label={liked ? "Hapus dari favorit" : "Tambah ke favorit"}>
              <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Bagikan">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container pt-16 md:pt-24">
        {/* Desktop Back Button */}
        <div className="hidden md:block mb-6">
          {/* PERFORMA: Gunakan handler yang sudah di-memo */}
          <Button variant="ghost" onClick={handleGoBack} className="gap-2">
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
                  {/* PERFORMA: Gunakan handler yang sudah di-memo */}
                  <Button variant="ghost" size="icon" onClick={handleToggleLike} aria-label={liked ? "Hapus dari favorit" : "Tambah ke favorit"}>
                    <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Bagikan">
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
                  <span className="font-semibold">{talent.rating}</span>
                  <span className="text-muted-foreground">({talent.reviewCount || 0} ulasan)</span>
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
                      {/* PERFORMA: Gunakan formatPrice yang sudah dioptimasi */}
                      {formatPrice(talent.price || talent.pricePerHour || 0)}
                    </span>
                    <span className="text-muted-foreground">/jam</span>
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
              <Link to={`/mitra/booking/${talent.id}`}>
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
              {/* PERFORMA: Gunakan talentReviews yang sudah di-memo */}
              {talentReviews.map((review) => (
                <Card key={review.id} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={review.userPhoto} alt={review.userName} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{review.userName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
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
        </div>
      </div>

      {/* Mobile Fixed CTA */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Mulai dari</p>
            <p className="text-xl font-bold text-primary">
              {/* PERFORMA: Gunakan formatPrice yang sudah dioptimasi */}
              {formatPrice(talent.price || talent.pricePerHour || 0)}
              <span className="text-sm font-normal text-muted-foreground">/jam</span>
            </p>
          </div>
          <Link to={`/mitra/booking/${talent.id}`}>
            <Button variant="hero" size="lg">
              Pesan Sekarang
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}