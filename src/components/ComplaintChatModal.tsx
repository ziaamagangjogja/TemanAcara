import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  MapPin,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Sparkles,
  RefreshCw,
  ImageIcon,
  Calendar,
  DollarSign,
  Gavel,
  Eye,
  X,
} from "lucide-react";

interface ComplaintChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string | null;
  onResolveClick: (report: any) => void;
  onStatusChange?: (reportId: string, newStatus: string) => void;
}

export function ComplaintChatModal({
  isOpen,
  onClose,
  complaintId,
  onResolveClick,
  onStatusChange,
}: ComplaintChatModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchChatData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/complaints/${encodeURIComponent(id)}/chat`);
      if (!response.ok) {
        throw new Error("Gagal mengambil data riwayat percakapan.");
      }
      const resJson = await response.json();
      setData(resJson);
    } catch (err: any) {
      console.error("Error fetching complaint chat:", err);
      setError(err.message || "Terjadi kesalahan saat memuat chat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && complaintId) {
      fetchChatData(complaintId);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, complaintId]);

  if (!isOpen) return null;

  const complaint = data?.complaint;
  const booking = data?.booking;
  const user = data?.user;
  const talent = data?.talent;
  const messages: any[] = data?.messages || [];

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (val?: number | string) => {
    if (!val) return "Rp0";
    return `Rp${Number(val).toLocaleString("id-ID")}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 border-b bg-card/60 backdrop-blur sticky top-0 z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Audit Investigasi Komplain & Riwayat Chat
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Periksa bukti laporan dan riwayat percakapan kedua belah pihak untuk menetapkan pihak yang bersalah.
                  </DialogDescription>
                </div>
              </div>

              {complaint && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      complaint.status === "pending"
                        ? "outline"
                        : complaint.status === "in-progress"
                        ? "default"
                        : "secondary"
                    }
                    className={`text-xs px-2.5 py-1 gap-1.5 ${
                      complaint.status === "pending"
                        ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                        : complaint.status === "in-progress"
                        ? "bg-blue-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {complaint.status === "pending" && <Clock className="w-3 h-3" />}
                    {complaint.status === "in-progress" && <AlertTriangle className="w-3 h-3" />}
                    {complaint.status === "resolved" && <CheckCircle className="w-3 h-3" />}
                    {complaint.status === "pending"
                      ? "Menunggu Pemeriksaan"
                      : complaint.status === "in-progress"
                      ? "Sedang Diselidiki"
                      : "Selesai Diputuskan"}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => complaintId && fetchChatData(complaintId)}
                    disabled={isLoading}
                    title="Muat Ulang Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mb-3 text-orange-500" />
                <p className="text-sm font-medium">Memuat rekaman percakapan & berkas komplain...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => complaintId && fetchChatData(complaintId)}
                >
                  Coba Lagi
                </Button>
              </div>
            ) : !complaint ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Data komplain tidak ditemukan.</p>
              </div>
            ) : (
              <>
                {/* Ringkasan Pihak Terlibat & Pesanan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Pelanggan */}
                  <div className="p-4 rounded-xl border bg-card/40 flex items-start gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <Avatar className="w-12 h-12 shrink-0 aspect-square rounded-full border border-blue-200 shadow-sm overflow-hidden">
                      <AvatarImage src={user?.photo || ""} className="object-cover w-full h-full aspect-square" />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                        {user?.name?.slice(0, 2)?.toUpperCase() || "PL"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          Pelanggan (Pelapor)
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm truncate mt-1 text-foreground">
                        {user?.name || complaint.userName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || complaint.userEmail}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{user?.phone || complaint.userPhone || "-"}</p>
                    </div>
                  </div>

                  {/* Card Mitra */}
                  <div className="p-4 rounded-xl border bg-card/40 flex items-start gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                    <Avatar className="w-12 h-12 shrink-0 aspect-square rounded-full border border-orange-200 shadow-sm overflow-hidden">
                      <AvatarImage src={talent?.photo || ""} className="object-cover w-full h-full aspect-square" />
                      <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                        {talent?.full_name?.slice(0, 2)?.toUpperCase() || "MT"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                          Mitra (Terlapor)
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm truncate mt-1 text-foreground">
                        {talent?.full_name || complaint.talentName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">{talent?.category || "Mitra RentMate"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{talent?.phone || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Informasi Pesanan Terkait */}
                {booking && (
                  <div className="p-3.5 rounded-xl border bg-muted/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Jadwal Pesanan:</span>
                      <span className="text-muted-foreground">
                        {booking.date || "-"} ({booking.start_time || "-"} - {booking.end_time || "-"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Nilai Transaksi:</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(booking.total_price || booking.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">ID Pesanan:</span>
                      <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">
                        {complaint.bookingId}
                      </code>
                    </div>
                  </div>
                )}

                {/* Detail Laporan & Bukti Gambar Komplain dari User */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Isi Keluhan Pelanggan ({formatDateTime(complaint.createdAt)})
                      </h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                      Urgensi: {complaint.urgency?.toUpperCase() || "NORMAL"}
                    </Badge>
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-background/80 p-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    "{complaint.description}"
                  </p>

                  {complaint.proofImage && (
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                      <span className="text-xs font-medium text-muted-foreground block mb-2">
                        Lampiran Bukti Foto dari Pelanggan:
                      </span>
                      <div className="inline-block relative group">
                        <img
                          src={complaint.proofImage}
                          alt="Bukti Komplain"
                          className="w-36 h-36 object-cover rounded-lg border border-border shadow-sm cursor-pointer transition-transform group-hover:scale-[1.02]"
                          onClick={() => setPreviewImage(complaint.proofImage)}
                        />
                        <div
                          className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                          onClick={() => setPreviewImage(complaint.proofImage)}
                        >
                          <Eye className="w-5 h-5 mr-1" />
                          <span className="text-xs font-medium">Perbesar</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Keputusan Admin Jika Sudah Selesai */}
                {complaint.status === "resolved" && (
                  <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle className="w-4 h-4" />
                      Hasil Putusan Admin (Kasus Selesai)
                    </div>
                    <p className="text-sm font-semibold">
                      Pihak Bersalah:{" "}
                      <span className="text-primary font-bold">
                        {complaint.atFault === "mitra"
                          ? "Mitra Bersalah (+1 Strike Pelanggaran)"
                          : complaint.atFault === "user"
                          ? "Pelanggan Bersalah (Laporan Ditolak)"
                          : "Netral / Tidak Ada Pihak yang Bersalah"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground bg-background/90 p-3 rounded-lg border">
                      <strong>Catatan Investigasi Admin:</strong> {complaint.adminNotes || "Tidak ada catatan khusus."}
                    </p>
                  </div>
                )}

                {/* Section Riwayat Percakapan (Chat Feed) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      <h4 className="font-bold text-sm text-foreground">
                        Rekaman Riwayat Chat ({messages.length} pesan)
                      </h4>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Ditampilkan kronologis dari pesan pertama sampai terakhir
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/15 min-h-[220px] max-h-[380px] overflow-y-auto space-y-3">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm font-medium">Belum ada riwayat pesan antara kedua pihak untuk pesanan ini.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Kedua pihak mungkin tidak melakukan percakapan di aplikasi sebelum mengajukan komplain.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, index) => {
                        const isUserSender = msg.sender_type === "user";
                        const isTalentSender = msg.sender_type === "talent";

                        return (
                          <div
                            key={msg.id || index}
                            className={`flex flex-col ${
                              isUserSender ? "items-end" : "items-start"
                            }`}
                          >
                            {/* Sender label & Timestamp */}
                            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                              {isUserSender ? (
                                <>
                                  <span>{formatDateTime(msg.created_at)}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    Pelanggan ({user?.name || "User"})
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200"
                                  >
                                    Mitra ({talent?.full_name || "Mitra"})
                                  </Badge>
                                  <span>{formatDateTime(msg.created_at)}</span>
                                </>
                              )}
                            </div>

                            {/* Message Bubble */}
                            <div
                              className={`max-w-[78%] rounded-2xl p-3.5 shadow-sm text-sm ${
                                isUserSender
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-card border border-border text-foreground rounded-tl-none"
                              }`}
                            >
                              {/* Text message */}
                              {msg.message && (
                                <p className="whitespace-pre-wrap leading-relaxed break-words">
                                  {msg.message}
                                </p>
                              )}

                              {/* Image Attachment (Photos/Kamera) */}
                              {msg.attachment_type === "image" && msg.attachment_url && (
                                <div className="mt-2">
                                  <img
                                    src={msg.attachment_url}
                                    alt="Lampiran Chat"
                                    className="max-h-56 max-w-full rounded-xl object-cover cursor-pointer border border-black/10 hover:opacity-90 transition-opacity"
                                    onClick={() => setPreviewImage(msg.attachment_url)}
                                  />
                                  <span
                                    className={`text-[10px] mt-1 flex items-center gap-1 cursor-pointer underline ${
                                      isUserSender ? "text-blue-100" : "text-muted-foreground"
                                    }`}
                                    onClick={() => setPreviewImage(msg.attachment_url)}
                                  >
                                    <ImageIcon className="w-3 h-3" /> Klik untuk melihat foto resolusi penuh
                                  </span>
                                </div>
                              )}

                              {/* Location Attachment (GPS Share) */}
                              {msg.attachment_type === "location" && (
                                <div
                                  className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                    isUserSender
                                      ? "bg-blue-700/60 border-blue-500 text-white"
                                      : "bg-muted/50 border-border text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                                    <div>
                                      <p className="font-semibold text-xs">Lokasi Dibagikan</p>
                                      <p className="text-[10px] opacity-80">
                                        Lat: {msg.latitude}, Lon: {msg.longitude}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-xs px-2.5 gap-1 shrink-0"
                                    onClick={() =>
                                      window.open(
                                        `https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`,
                                        "_blank"
                                      )
                                    }
                                  >
                                    <ExternalLink className="w-3 h-3" /> Peta
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t bg-card/60 backdrop-blur flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup Audit
            </Button>

            <div className="flex items-center gap-2">
              {complaint && complaint.status === "pending" && onStatusChange && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onStatusChange(complaint.id, "in-progress");
                    fetchChatData(complaint.id);
                  }}
                  className="gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Tandai Sedang Diperiksa
                </Button>
              )}

              {complaint && complaint.status !== "resolved" && (
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 font-medium shadow-md shadow-orange-500/20"
                  onClick={() => {
                    onResolveClick(complaint);
                  }}
                >
                  <Gavel className="w-4 h-4" />
                  Tetapkan Putusan & Sanksi
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-none text-white">
            <div className="relative flex flex-col items-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <img
                src={previewImage}
                alt="Pratinjau Foto"
                className="max-h-[80vh] w-auto rounded-lg object-contain mt-6"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs gap-1.5"
                  onClick={() => window.open(previewImage, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
