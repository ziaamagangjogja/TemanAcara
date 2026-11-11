// src/components/TalentCard.tsx

import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Clock, BadgeCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Talent } from "@/data/mockData";
import { getBookings, getTalentReviewStats } from "@/lib/bookingStore";
import { getStartingPriceForTalent } from "@/data/pricingReference";

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
    talent.name.trim() !== ""
  );
};

export const TalentCard = memo<TalentCardProps>(({ talent }) => {
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
  const talentPhoto = talent.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(talent.name)}`;
  const talentCity = talent.city || 'Indonesia';
  const talentAge = (talent.age && talent.age > 0) ? talent.age : 22;
  const startingRate = getStartingPriceForTalent(talent);
  const formattedPrice = formatPrice(startingRate.price);
  const talentUnitLabel = startingRate.unitLabel;
  
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" | "accent" | "success" = "secondary";
  let badgeText = "Offline";
  if (talent.availability === "online") {
    badgeVariant = "accent";
    badgeText = "Online";
  } else if (talent.availability === "both" || !talent.availability) {
    badgeVariant = "success";
    badgeText = "Online & Offline";
  }

  const profileSkills = [
    ...(Array.isArray((talent as any).specialistSkills) ? (talent as any).specialistSkills : []),
    ...(Array.isArray(talent.skills) ? talent.skills : []),
  ];
  const displayedSkills = [...new Set(profileSkills)].slice(0, 3);

  const { reviewCount: talentReviewCount, formattedRating: talentRating } = getTalentReviewStats(talent);

  return (
    <Card hover className="flex h-full flex-col overflow-hidden group">
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
            <span className="text-sm opacity-80">{talentAge} thn</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{talentCity}</span>
            <span className="mx-1">•</span>
            <Star className="w-3 h-3 fill-current text-amber-400" />
            <span>{talentRating}</span>
            <span className="opacity-70">({talentReviewCount})</span>
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

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex flex-1 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Mulai dari</span>
            <div className="flex flex-wrap items-center gap-1 text-primary font-bold">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="break-words">{formattedPrice}</span>
              <span className="text-muted-foreground font-normal text-xs">{talentUnitLabel}</span>
            </div>
          </div>
          <Badge className="shrink-0 whitespace-nowrap" variant={badgeVariant}>
            {badgeText}
          </Badge>
        </div>

        <Link to={`/talent/${talent.id}`} className="mt-auto block">
          <Button variant="hero" className="w-full">
            Pilih Teman
          </Button>
        </Link>
      </div>
    </Card>
  );
});

TalentCard.displayName = 'TalentCard';