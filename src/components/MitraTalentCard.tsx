import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Clock, BadgeCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Talent } from "@/data/mockData";
import { getBookings, getTalentReviewStats } from "@/lib/bookingStore";

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
  const [currentImg, setCurrentImg] = useState(() => talent?.photo || "");

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(talent?.name || "Talent")}&background=f97316&color=ffffff&size=500&bold=true`;
  const photoToDisplay = currentImg || fallbackAvatar;

  const handleImageError = () => {
    if (currentImg !== fallbackAvatar) {
      setCurrentImg(fallbackAvatar);
    } else {
      setImageError(true);
    }
  };

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

  return (
    <Card hover className="overflow-hidden group">
      <div className="relative">
        {imageError ? (
          <div className="w-full aspect-[4/5] bg-gradient-to-br from-orange-400 to-amber-600 flex flex-col items-center justify-center text-white">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl mb-2 backdrop-blur-sm">
              {(talent.name || "T").charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-medium text-white/80">Foto tidak tersedia</p>
          </div>
        ) : (
          <img
            src={photoToDisplay}
            alt={`Foto ${talent.name}`}
            className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent pointer-events-none" />
        
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
              const { reviewCount, formattedRating } = getTalentReviewStats(talent);
              return (
                <>
                  <span>{formattedRating}</span>
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