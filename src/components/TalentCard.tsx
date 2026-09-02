// src/components/TalentCard.tsx

import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Clock, BadgeCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Talent } from "@/data/mockData";

interface TalentCardProps {
  talent: Talent;
}

// Pindahkan fungsi formatPrice ke luar komponen
const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});
const formatPrice = (price: number) => priceFormatter.format(price);

const isValidTalent = (talent: Talent): boolean => {
  return !!(
    talent &&
    talent.id &&
    talent.name &&
    talent.name.trim() !== "" &&
    talent.photo &&
    talent.photo.trim() !== "" &&
    talent.city &&
    talent.age >= 18 &&
    talent.age <= 40
  );
};

// Gunakan React.memo untuk mencegah re-render yang tidak perlu
export const TalentCard = memo<TalentCardProps>(({ talent }) => {
  const [imageError, setImageError] = useState(false);

  if (!talent || !isValidTalent(talent)) {
    return (
      <Card hover className="overflow-hidden group opacity-50">
        <div className="w-full aspect-[4/5] bg-muted flex flex-col items-center justify-center">
          <User className="w-16 h-16 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Data tidak valid</p>
        </div>
        <div className="p-4">
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
          <Button variant="hero" className="w-full" disabled>
            Tidak Tersedia
          </Button>
        </div>
      </Card>
    );
  }

  // Kalkulasi langsung tanpa useMemo untuk kesederhanaan
  const talentPhoto = talent.photo;
  const formattedPrice = formatPrice(talent.pricePerHour || talent.price || 0);
  
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" | "accent" | "success" = "secondary";
  let badgeText = "Offline";
  if (talent.availability === "online") {
    badgeVariant = "accent";
    badgeText = "Online";
  } else if (talent.availability === "both") {
    badgeVariant = "success";
    badgeText = "Online & Offline";
  }

  const displayedSkills = (talent.skills || []).slice(0, 3);

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
            src={talentPhoto}
            alt={`Foto ${talent.name}`}
            className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy" // Optimasi gambar tetap penting
            onError={() => setImageError(true)} // Fungsi sederhana
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        
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
            <span>{talent.rating || 0}</span>
            <span className="opacity-70">({talent.reviewCount || 0})</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {displayedSkills.map((skill) => (
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
            <span>{formattedPrice}</span>
            <span className="text-muted-foreground font-normal text-sm">/jam</span>
          </div>
          <Badge variant={badgeVariant}>
            {badgeText}
          </Badge>
        </div>

        <Link to={`/talent/${talent.id}`}>
          <Button variant="hero" className="w-full">
            Pilih Teman
          </Button>
        </Link>
      </div>
    </Card>
  );
});

TalentCard.displayName = 'TalentCard';