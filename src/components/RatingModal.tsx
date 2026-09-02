// src/components/RatingModal.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  talentName: string;
  talentPhoto: string;
  bookingId: string;
  onSubmit: (rating: number, comment: string) => void;
}

// ⭐️ INI ADALAH BAGIAN YANG PALING PENTING ⭐️
// Gunakan 'export function' agar bisa diimpor dengan 'import { RatingModal }'
export function RatingModal({
  isOpen,
  onClose,
  talentName,
  talentPhoto,
  onSubmit,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment);
      onClose();
      // Reset state untuk penggunaan selanjutnya
      setRating(0);
      setComment("");
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state saat modal ditutup
    setRating(0);
    setComment("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Beri Ulasan untuk {talentName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <img
            src={talentPhoto}
            alt={talentName}
            className="w-20 h-20 rounded-full object-cover mb-4"
          />
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-8 h-8 cursor-pointer transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
              />
            ))}
          </div>
          <Textarea
            placeholder="Tulis ulasan Anda (opsional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0}>
            Kirim Ulasan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}