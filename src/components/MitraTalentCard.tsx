import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Clock, BadgeCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Talent } from "@/data/mockData";
import { getBookings } from "@/lib/bookingStore";

interface MitraTalentCardProps {
  talent: Talent;
}

// Validasi data mitra
const isValidMitra = (talent: Talent): boolean => {
  return !!(
    talent.id &&
    talent.name &&
    talent.name.trim() !== "" &&
    talent.photo && // Hanya menggunakan satu foto
    talent.photo.trim() !== "" &&
    talent.city &&
    talent.age >= 18 &&
    talent.age <= 40
  );
};

export function MitraTalentCard({ talent }: MitraTalentCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Jangan render kartu jika data tidak valid
  if (!isValidMitra(talent)) {
    return null;
  }

  // Pastikan hanya menggunakan foto utama
  const mitraPhoto = talent.photo; // Hanya gunakan foto utama

  return (
    <Card hover className="overflow-hidden group">
      <div className="relative">
        {imageError ? (
          <div className="w-full aspect-[4/5] bg-muted flex flex-col items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Foto tidak tersedia</p>
          </div>
        ) : (
          <img
            src={mitraPhoto} // Gunakan variabel yang sudah didefinisikan
            alt={`Foto ${talent.name}`}
            className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        
        {/* 🔥 PERBAIKAN: Perbaiki logika verifikasi untuk mitra baru dan lama */}
        {(talent.isVerified || talent.verified) && (
          <div className="absolute top-3 right-3">
            <Badge variant="default" className="gap-1">
              <BadgeCheck className="w-3 h-3" />
              Terverifikasi
            </Badge>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg">{talent.name}</h3>
            <span className="text-sm opacity-80">{talent.age} thn</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{talent.city}</span>
            <span className="mx-1">•</span>
            <Star className="w-3 h-3 fill-current text-amber-400" />
            {/* 🔥 PERBAIKAN: Hitung rating dan jumlah review asli */}
            {(() => {
              const bookings = getBookings();
              const ratedBookings = bookings.filter((b: any) => (b.talentId === talent.id || b.talentId === talent.talentId) && typeof b.rating === "number" && b.rating > 0);
              const reviewCount = ratedBookings.length;
              const rating = reviewCount > 0 
                ? (ratedBookings.reduce((sum: number, b: any) => sum + Number(b.rating), 0) / reviewCount).toFixed(1) 
                : "0.0";
              
              return (
                <>
                  <span>{rating}</span>
                  <span className="opacity-70">({reviewCount})</span>
                </>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-1">
            {/* 🔥 PERBAIKAN KRUSIAL: Berikan array kosong sebagai default jika skills undefined */}
            {(talent.skills || []).slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 text-primary font-bold">
            <Clock className="w-4 h-4" />
            <span>{formatPrice(talent.pricePerHour)}</span>
            <span className="text-muted-foreground font-normal text-sm">/jam</span>
          </div>
          <Badge variant={talent.availability === "online" ? "accent" : talent.availability === "offline" ? "secondary" : "success"}>
            {talent.availability === "online" ? "Online" : talent.availability === "offline" ? "Offline" : "Online & Offline"}
          </Badge>
        </div>

        {/* 🔥 PERUBAHAN KRUSIAL: Link ke halaman mitra/talents dan ubah teks tombol */}
        <Link to={`/mitra/talents/${talent.id}`}>
          <Button variant="hero" className="w-full">
            Pilih Mitra
          </Button>
        </Link>
      </div>
    </Card>
  );
}