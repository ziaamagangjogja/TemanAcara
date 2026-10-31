import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertCircle,
  Camera,
  Upload,
  X,
  CheckCircle2,
  Calendar,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImageFile } from "@/utils/imageCompressor";
import { getCurrentUser } from "@/lib/userStore";

interface SubmitComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  talentName: string;
  talentPhoto?: string;
  bookingDate?: string;
  bookingPurpose?: string;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  { label: "Mitra Terlambat", icon: Clock },
  { label: "Tidak Hadir (Ghosting)", icon: X },
  { label: "Tidak Sesuai Kesepakatan", icon: HelpCircle },
  { label: "Perilaku Tidak Sopan", icon: AlertCircle },
  { label: "Lainnya", icon: FileText },
];

export function SubmitComplaintModal({
  isOpen,
  onClose,
  bookingId,
  talentName,
  talentPhoto,
  bookingDate,
  bookingPurpose,
  onSuccess,
}: SubmitComplaintModalProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("Mitra Terlambat");
  const [description, setDescription] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Ukuran Gambar Terlalu Besar",
          description: "Maksimal ukuran foto adalah 10MB.",
          variant: "destructive",
        });
        return;
      }
      try {
        const compressedBase64 = await compressImageFile(file);
        setProofImage(compressedBase64);
      } catch (err) {
        console.error("Error compressing image:", err);
        toast({
          title: "Gagal Membaca Gambar",
          description: "Silakan coba unggah foto dengan format lain (JPG/PNG).",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      toast({
        title: "Deskripsi Wajib Diisi",
        description: "Silakan ceritakan detail masalah yang terjadi.",
        variant: "destructive",
      });
      return;
    }

    const user = await getCurrentUser();
    if (!user || !user.id) {
      toast({
        title: "Perlu Login",
        description: "Silakan login terlebih dahulu untuk mengajukan komplain.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const fullDescription = selectedCategory && selectedCategory !== "Lainnya"
        ? `[Kategori: ${selectedCategory}]\n${trimmedDesc}`
        : trimmedDesc;

      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          bookingId: bookingId,
          talentName: talentName,
          description: fullDescription,
          proofImage: proofImage,
          urgency: "normal",
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan komplain ke database.");
      }

      const report = result.report;
      if (report) {
        window.dispatchEvent(new CustomEvent("newReport", { detail: { report } }));
        localStorage.setItem("rentmate_complaints_updated", report.id);
      }

      toast({
        title: "Laporan Berhasil Dikirim",
        description: "Laporan komplain Anda telah diteruskan ke Admin untuk ditindaklanjuti.",
      });

      setDescription("");
      setProofImage(null);
      setSelectedCategory("Mitra Terlambat");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Gagal mengirim komplain:", error);
      toast({
        title: "Gagal Mengirim Laporan",
        description: error.message || "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setDescription("");
          setProofImage(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b bg-card/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Ajukan Laporan Kendala
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Sampaikan kendala Anda. Admin akan menginvestigasi bukti dan riwayat chat kedua pihak.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Chip Info Pesanan */}
          <div className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-9 h-9 shrink-0 aspect-square rounded-full border border-orange-200 overflow-hidden">
                <AvatarImage src={talentPhoto || ""} className="object-cover w-full h-full aspect-square" />
                <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                  {talentName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Mitra Terkait:</p>
                <p className="text-sm font-semibold truncate text-foreground">{talentName}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              {bookingPurpose && (
                <Badge variant="outline" className="text-[10px] font-normal border-border bg-background">
                  {bookingPurpose}
                </Badge>
              )}
              {bookingDate && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{bookingDate}</p>
              )}
            </div>
          </div>

          {/* Pilihan Kategori Kendala */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Pilih Topik Kendala:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((reason) => {
                const isSelected = selectedCategory === reason.label;
                return (
                  <button
                    key={reason.label}
                    type="button"
                    onClick={() => setSelectedCategory(reason.label)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium ${
                      isSelected
                        ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <reason.icon className={`w-3.5 h-3.5 ${isSelected ? "text-rose-600" : "text-muted-foreground"}`} />
                    {reason.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Deskripsi Masalah */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Ceritakan Detail Masalah <span className="text-rose-500">*</span></span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {description.length} karakter
              </span>
            </label>
            <Textarea
              placeholder="Contoh: Mitra tidak dapat dihubungi saat jam pertemuan, atau tidak datang sesuai jadwal yang telah disepakati di chat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none text-sm p-3 rounded-xl border-input focus-visible:ring-1 focus-visible:ring-orange-500 leading-relaxed bg-background"
            />
          </div>

          {/* Unggah Bukti Gambar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Lampiran Bukti Foto</span>
              <span className="text-[11px] text-muted-foreground font-normal">Opsional</span>
            </label>

            {proofImage ? (
              <div className="relative rounded-xl border bg-muted/20 p-2.5 flex items-center gap-3">
                <img
                  src={proofImage}
                  alt="Pratinjau Bukti"
                  className="w-16 h-16 object-cover rounded-lg border shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">Foto Bukti Berhasil Dipilih</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Foto ini akan dapat dilihat dan diperiksa oleh Admin.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  onClick={() => setProofImage(null)}
                  title="Hapus foto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="border border-dashed border-border hover:border-orange-400 dark:hover:border-orange-500 rounded-xl p-3.5 flex items-center justify-center gap-2.5 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-background border flex items-center justify-center text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground group-hover:text-orange-600 transition-colors">
                    Unggah Tangkapan Layar / Foto Bukti
                  </p>
                  <p className="text-[11px] text-muted-foreground">Format JPG, PNG (Maks 10MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/50">
            ℹ️ <strong>Tips:</strong> Pastikan Anda telah melakukan koordinasi melalui fitur Chat RentMate, karena riwayat obrolan akan dijadikan dasar audit utama oleh tim investigasi.
          </p>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-card/60 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl px-4 gap-1.5 shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              "Kirim Laporan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
