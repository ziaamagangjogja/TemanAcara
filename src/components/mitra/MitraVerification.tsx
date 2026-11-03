import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentMitra, logoutMitra } from '@/lib/mitraStore';
import { saveCurrentMitraSession, getCurrentMitraSession } from '@/lib/storageHelper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Send,
  HelpCircle,
  Award,
  ArrowRight,
  UserCheck,
  Check,
  AlertTriangle,
  Scale,
  FileText,
  Upload,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MitraVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mitra, setMitra] = useState<any>(() => getCurrentMitra() || getCurrentMitraSession());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealPrice, setAppealPrice] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealFile, setAppealFile] = useState<string | null>(null);
  const [appealFileName, setAppealFileName] = useState<string | null>(null);
  const [appealFilePreview, setAppealFilePreview] = useState<string | null>(null);
  const [appealLink, setAppealLink] = useState('');
  const appealFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealSent, setAppealSent] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Fungsi refresh status dari backend
  const fetchLatestStatus = useCallback(async (silent = false) => {
    const current = getCurrentMitra() || getCurrentMitraSession();
    if (!current?.email) return;

    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/mitra/status?email=${encodeURIComponent(current.email)}`);
      if (res.ok) {
        const data = await res.json();
        
        const updatedMitra = {
          ...current,
          ...data,
          name: data.full_name || current.name,
          full_name: data.full_name || current.full_name,
          verificationStatus:
            data.status === 'approved'
              ? 'approved'
              : data.status === 'rejected'
              ? 'rejected'
              : 'pending',
          status: data.status,
          price: data.price ? Number(data.price) : current.price,
          pricing_tier: data.pricing_tier || current.pricing_tier || 'tier2',
          price_accepted: Boolean(data.price_accepted),
          rejection_reason: data.rejection_reason || '',
          appeal_note: data.appeal_note || '',
          appeal_file: data.appeal_file || '',
          portfolio_file: data.portfolio_file || '',
          admin_price_note: data.admin_price_note || '',
        };

        setMitra(updatedMitra);
        saveCurrentMitraSession(updatedMitra);
        
        if (!silent) {
          toast({
            title: "Status Terkini Dimuat",
            description: `Status saat ini: ${updatedMitra.verificationStatus.toUpperCase()}`,
          });
        }
      }
    } catch (err) {
      console.warn("Gagal polling status mitra:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [toast]);

  // Polling otomatis setiap 8 detik agar bila admin menyetujui di tab lain, status langsung berubah!
  useEffect(() => {
    fetchLatestStatus(true);
    const interval = setInterval(() => {
      fetchLatestStatus(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchLatestStatus]);

  // Handle Logout
  const handleLogout = () => {
    logoutMitra();
    toast({
      title: "Berhasil Keluar",
      description: "Anda telah keluar dari akun calon mitra.",
    });
    navigate('/mitra/login');
  };

  // Handle Setujui Tarif
  const handleAcceptPrice = async () => {
    if (!mitra?.email) return;
    setIsAccepting(true);

    try {
      const res = await fetch('/api/mitra/accept-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mitra.email, userId: mitra.id || mitra.user_id }),
      });

      if (!res.ok) {
        throw new Error("Gagal mengonfirmasi tarif di server");
      }

      // Update state & localStorage
      const updatedMitra = {
        ...mitra,
        price_accepted: true,
        verificationStatus: 'approved',
      };
      setMitra(updatedMitra);
      saveCurrentMitraSession(updatedMitra);

      toast({
        title: "Tarif Berhasil Disetujui! 🎉",
        description: "Selamat datang di RentMate! Akun Anda kini aktif.",
      });

      setTimeout(() => {
        navigate('/mitra/dashboard');
      }, 500);
    } catch (err: any) {
      toast({
        title: "Gagal Mengonfirmasi",
        description: err.message || "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Ajukan Banding
  const handleSendAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealPrice || !appealReason.trim()) {
      toast({
        title: "Form Belum Lengkap",
        description: "Masukkan tarif yang diajukan dan alasan banding.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAppeal(true);
    try {
      const finalAppealFile = appealFile || appealLink.trim() || '';
      const res = await fetch('/api/mitra/appeal-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mitra.email,
          userId: mitra.id || mitra.user_id,
          requestedPrice: Number(appealPrice),
          note: appealReason,
          appeal_file: finalAppealFile,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengirim pengajuan banding.");

      setAppealSent(true);
      setShowAppealForm(false);
      setAppealFile(null);
      setAppealFileName(null);
      setAppealFilePreview(null);
      setAppealLink('');

      window.dispatchEvent(new CustomEvent("mitraVerificationUpdated"));
      try {
        const syncChannel = new BroadcastChannel("rentmate_sync");
        syncChannel.postMessage({
          type: "MITRA_APPEAL_SUBMITTED",
          email: mitra?.email,
          name: mitra?.name || mitra?.full_name,
        });
        syncChannel.close();
      } catch (bcErr) {
        console.warn("Gagal mengirim sinyal banding ke Admin:", bcErr);
      }

      toast({
        title: "Banding Tarif Terkirim 📬",
        description: "Admin akan meninjau permohonan penyesuaian tarif beserta bukti portofolio Anda.",
      });
      fetchLatestStatus(true);
    } catch (err: any) {
      toast({
        title: "Gagal Mengirim Banding",
        description: err.message || "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const handleAppealFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Upload Gagal",
          description: "Ukuran berkas pendukung maksimal 10MB",
          variant: "destructive",
        });
        return;
      }
      setAppealFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAppealFile(result);
        if (file.type.startsWith("image/")) {
          setAppealFilePreview(result);
        } else {
          setAppealFilePreview(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAppealFile = () => {
    setAppealFile(null);
    setAppealFileName(null);
    setAppealFilePreview(null);
    if (appealFileRef.current) appealFileRef.current.value = "";
  };

  const status = mitra?.verificationStatus || mitra?.status || 'pending';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isPending = !isApproved && !isRejected;

  const candidatePrice = mitra?.price ? Number(mitra.price) : 250000;
  const pricingTierLabel =
    mitra?.pricing_tier === 'tier3'
      ? 'Tier 3 (Spesialis & Keahlian Khusus)'
      : mitra?.pricing_tier === 'tier1'
      ? 'Tier 1 (Kasual & Santai)'
      : 'Tier 2 (Pendamping Acara & Sosial)';

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 via-background to-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Navbar / Header Bar */}
        <div className="flex items-center justify-between bg-card/90 backdrop-blur border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              RM
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Portal Status Calon Mitra</h2>
              <p className="text-xs text-muted-foreground">RentMate Partner Onboarding</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLatestStatus(false)}
              disabled={isRefreshing}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Status</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1 text-xs text-muted-foreground hover:text-destructive h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>

        {/* Candidate Profile Summary Card */}
        <Card className="p-5 border-primary/20 shadow-sm bg-card/80">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {mitra?.photo ? (
              <img
                src={mitra.photo}
                alt={mitra.name || "Calon Mitra"}
                className="w-20 h-20 rounded-2xl object-cover object-top border-2 border-primary/40 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center shrink-0">
                {(mitra?.name || "M").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-xl font-bold truncate">{mitra?.name || mitra?.full_name || "Calon Mitra"}</h1>
                {isApproved && (
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Disetujui Admin
                  </Badge>
                )}
                {isPending && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 gap-1 text-[11px] animate-pulse">
                    <Clock className="w-3 h-3" /> Dalam Proses Kurasi
                  </Badge>
                )}
                {isRejected && (
                  <Badge variant="destructive" className="gap-1 text-[11px]">
                    <AlertCircle className="w-3 h-3" /> Perlu Perbaikan
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-3">{mitra?.email} • {mitra?.phone || "No HP terdaftar"}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                {mitra?.category && (
                  <span className="bg-muted px-2.5 py-1 rounded-md text-foreground/80 font-medium border">
                    Keahlian: {mitra.category}
                  </span>
                )}
                {mitra?.price_expectation && (
                  <span className="bg-muted px-2.5 py-1 rounded-md text-muted-foreground border">
                    Ekspektasi: {mitra.price_expectation}
                  </span>
                )}
                <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-orange-600" /> KTP Terenkripsi
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Visual Stepper */}
        <Card className="p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Tahapan Pendaftaran & Aktivasi Akun
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/70 border border-orange-200">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-xs text-orange-950">1. Berkas Terkirim</p>
                <p className="text-[11px] text-orange-800 mt-0.5">
                  Formulir pendaftaran dan identitas berhasil diarsipkan.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
              isApproved
                ? 'bg-orange-50/70 border-orange-300'
                : isRejected
                ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20 shadow-sm'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm ${
                isApproved
                  ? 'bg-orange-600 text-white'
                  : isRejected
                  ? 'bg-rose-500 text-white'
                  : 'bg-amber-500 text-white animate-pulse'
              }`}>
                {isApproved ? <Check className="w-4 h-4" /> : isRejected ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-semibold text-xs">2. Kurasi & Penetapan Tarif</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isApproved
                    ? 'Admin telah menyetujui kualifikasi & menetapkan tarif resmi.'
                    : isRejected
                    ? 'Peninjauan berkas ditolak admin.'
                    : 'Admin sedang meninjau data Anda (maks. 1x24 jam).'}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
              isApproved
                ? 'bg-primary/10 border-primary/40 ring-2 ring-primary/20 shadow-sm'
                : 'bg-muted/40 border-border opacity-70'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm ${
                isApproved
                  ? 'bg-primary text-primary-foreground animate-bounce'
                  : 'bg-muted-foreground/30 text-muted-foreground'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-xs">3. Konfirmasi Tarif & Masuk</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isApproved
                    ? 'Tinjau tarif admin lalu buka dashboard Anda!'
                    : 'Menunggu hasil kurasi tarif dari admin.'}
                </p>
              </div>
            </div>

          </div>
        </Card>

        {/* DYNAMIC CARD: CASE A - PENDING */}
        {isPending && (
          <Card className="p-6 md:p-8 border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-card to-card shadow-md">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-bold text-foreground">Berkas Anda Sedang Ditinjau Admin ⏳</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tim kurasi RentMate sedang memverifikasi identitas dan keahlian yang Anda ajukan.
                  Admin akan menetapkan tarif resmi per jam yang paling objektif dan kompetitif untuk profil Anda.
                </p>
                <div className="inline-flex items-center gap-2 bg-amber-100/70 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Estimasi Waktu: Maksimal 1x24 jam kerja (biasanya dalam 1-2 jam)
                </div>
              </div>
            </div>

            <div className="mt-8 border-t pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-muted/40 p-3.5 rounded-xl border">
                <p className="text-muted-foreground font-medium mb-1">Mengapa Admin yang Menentukan Tarif?</p>
                <p className="text-foreground/80 leading-normal">
                  Agar harga transparan, wajar, dan mencegah perang tarif antar mitra. Admin menyesuaikan harga dengan kategori dan standar regional.
                </p>
              </div>
              <div className="bg-muted/40 p-3.5 rounded-xl border">
                <p className="text-muted-foreground font-medium mb-1">Bisa Nego / Ajukan Banding?</p>
                <p className="text-foreground/80 leading-normal">
                  Tentu! Begitu admin menetapkan tarif, Anda diberi pilihan: <strong>Setujui Tarif</strong> atau <strong>Ajukan Banding</strong> jika merasa belum sesuai.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Halaman ini memperbarui status secara otomatis setiap beberapa detik.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLatestStatus(false)}
                disabled={isRefreshing}
                className="gap-2 w-full sm:w-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Periksa Pembaruan Sekarang
              </Button>
            </div>
          </Card>
        )}

        {/* DYNAMIC CARD: CASE B - APPROVED (WAITING FOR TARIFF CONSENSUS) */}
        {isApproved && (
          <Card className="p-6 md:p-8 border-orange-200 bg-gradient-to-br from-orange-50/40 via-card to-card shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center md:text-left space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Selamat, Pendaftaran Anda Telah Disetujui! 🎉
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Admin telah meninjau profil kualifikasi Anda dan menetapkan tarif resmi awal untuk layanan Anda di platform.
                  </p>
                </div>
              </div>

              {/* Notifikasi Jika Banding Tarif Ditolak Admin */}
              {mitra?.admin_price_note?.includes('[BANDING DITOLAK]') && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-200 space-y-2 my-4 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    Pemberitahuan: Permohonan Banding Tarif Anda Belum Disetujui
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Admin telah meninjau pengajuan banding Anda dan memutuskan untuk tetap mempertahankan tarif awal sebesar <strong>Rp {candidatePrice.toLocaleString('id-ID')}/jam</strong>.
                  </p>
                  <div className="p-3 bg-card/90 rounded-xl border border-amber-300 dark:border-amber-800 text-xs space-y-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Alasan Penolakan Banding dari Admin:</p>
                    <p className="italic text-foreground">{mitra.admin_price_note.replace('[BANDING DITOLAK]', '').trim()}</p>
                  </div>
                  <p className="text-xs text-orange-800 font-medium">
                    ✓ Pendaftaran Anda tetap disetujui! Anda dapat langsung menyetujui tarif resmi awal ini di bawah untuk mengaktifkan akun dan mulai menerima order.
                  </p>
                </div>
              )}

              {/* Notifikasi Jika Banding Tarif Masih Dalam Peninjauan Admin */}
              {mitra?.appeal_note && !mitra?.admin_price_note?.includes('[BANDING DITOLAK]') && (
                <div className="p-4 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-950 space-y-2 my-4 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm text-orange-800">
                    <Scale className="w-5 h-5 text-orange-600 shrink-0" />
                    Permohonan Banding Tarif Sedang Ditinjau Admin
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Permohonan penyesuaian tarif Anda sedang dievaluasi oleh tim kurasi. Anda tetap dapat menyetujui tarif awal kapan saja jika ingin langsung mengaktifkan akun.
                  </p>
                  <div className="p-2.5 bg-card/90 rounded-xl border border-orange-200 text-xs italic text-foreground">
                    {mitra.appeal_note}
                  </div>
                  {mitra.appeal_file && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-orange-800 mb-1">Bukti Portofolio Terlampir:</p>
                      {mitra.appeal_file.startsWith('data:image') || mitra.appeal_file.startsWith('http') ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={mitra.appeal_file}
                            alt="Bukti Banding"
                            className="w-12 h-12 rounded object-cover border border-orange-300 cursor-pointer"
                            onClick={() => window.open(mitra.appeal_file, '_blank')}
                          />
                          <a
                            href={mitra.appeal_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Lihat Bukti Portofolio
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{mitra.appeal_file}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Box Tampilan Tarif Resmi */}
              <div className="bg-card border-2 border-orange-400/30 rounded-2xl p-6 shadow-sm my-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-orange-800 bg-orange-100 px-2.5 py-1 rounded-md">
                      Tarif Resmi yang Ditetapkan Admin
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl md:text-4xl font-extrabold text-foreground">
                        Rp {candidatePrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-muted-foreground text-sm font-medium">/ jam</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Award className="w-4 h-4 text-orange-600" />
                      <span>Kategori Kelas: <strong>{pricingTierLabel}</strong></span>
                    </div>
                  </div>

                  <div className="border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 max-w-sm text-xs text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-primary" />
                      Catatan Pertimbangan Admin:
                    </p>
                    <p className="leading-relaxed italic">
                      "{mitra?.admin_price_note?.includes('[BANDING DITOLAK]')
                        ? mitra.admin_price_note.replace('[BANDING DITOLAK]', '').trim()
                        : (mitra?.admin_price_note || `Tarif dihitung berdasarkan kualifikasi ${mitra?.category || 'keahlian yang dipilih'}, kelengkapan portofolio sosial media, dan kesesuaian dengan daya beli klien aktif.`)}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Setujui vs Banding */}
              {!showAppealForm && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Button
                      size="lg"
                      onClick={handleAcceptPrice}
                      disabled={isAccepting}
                      className="w-full sm:flex-1 gap-2 font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 h-12"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {isAccepting ? "Mengaktifkan Akun..." : "Setujui Tarif & Buka Dashboard Mitra ➔"}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowAppealForm(true)}
                      className="w-full sm:w-auto text-xs sm:text-sm h-12 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      {mitra?.admin_price_note?.includes('[BANDING DITOLAK]')
                        ? "Ajukan Banding Ulang"
                        : mitra?.appeal_note
                        ? "Perbarui Pengajuan Banding"
                        : "Ajukan Banding / Negosiasi Tarif"}
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Dengan menyetujui tarif, profil Anda akan langsung tampil di pencarian talent dan siap menerima order booking klien.
                  </p>
                </div>
              )}

              {/* Form Ajukan Banding */}
              {showAppealForm && (
                <form onSubmit={handleSendAppeal} className="mt-4 p-5 bg-muted/40 border border-primary/20 rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" />
                      Formulir Banding / Negosiasi Tarif
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAppealForm(false)}
                      className="text-xs h-7 px-2"
                    >
                      Batal
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tuliskan nominal tarif yang Anda harapkan beserta alasan dan bukti portofolio / sertifikat pendukung sebagai penguat argumen agar admin menyetujui tarif Anda.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="appealPrice" className="text-xs">Nominal Tarif yang Diajukan (Rp / Jam)</Label>
                    <Input
                      id="appealPrice"
                      type="number"
                      placeholder="Contoh: 350000"
                      value={appealPrice}
                      onChange={(e) => setAppealPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appealReason" className="text-xs">Alasan & Penguat Banding</Label>
                    <Textarea
                      id="appealReason"
                      placeholder="Jelaskan sertifikat, jam terbang, portofolio karya, atau alasan spesifik mengapa Anda layak mendapatkan tarif tersebut..."
                      rows={3}
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      required
                    />
                  </div>

                  {/* Upload Berkas Portofolio / Bukti Pendukung Banding */}
                  <div className="space-y-2 p-3 bg-background rounded-xl border border-orange-200">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="appealProofFile" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                        Lampirkan Bukti Portofolio / Sertifikat (Opsional Penguat Banding)
                      </Label>
                      <Badge variant="outline" className="text-[10px]">Opsional</Badge>
                    </div>

                    <Input
                      id="appealProofFile"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleAppealFileUpload}
                      ref={appealFileRef}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appealFileRef.current?.click()}
                        className="gap-1.5 text-xs border-orange-300 hover:bg-orange-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-orange-600" />
                        {appealFileName ? "Ganti Berkas" : "Unggah Bukti Portofolio"}
                      </Button>

                      {appealFileName && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAppealFile}
                          className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2 gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </Button>
                      )}
                    </div>

                    {appealFileName && (
                      <div className="mt-2 p-2 bg-orange-50/60 rounded-lg border border-orange-200 flex items-center gap-2">
                        {appealFilePreview ? (
                          <img
                            src={appealFilePreview}
                            alt="Bukti Portofolio"
                            className="w-12 h-12 rounded object-cover border border-orange-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{appealFileName}</p>
                          <p className="text-[10px] text-orange-700">✓ Bukti siap dilampirkan ke pengajuan banding</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5">
                      <div className="relative">
                        <ExternalLink className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="appealLink"
                          placeholder="Atau masukkan tautan Google Drive / link portofolio online"
                          className="pl-8 text-xs h-8"
                          value={appealLink}
                          onChange={(e) => setAppealLink(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAppealForm(false)}
                    >
                      Tutup
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingAppeal}
                      className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmittingAppeal ? "Mengirim..." : "Kirim Permohonan Banding ke Admin"}
                    </Button>
                  </div>
                </form>
              )}

              {appealSent && (
                <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs">
                  Permohonan banding Anda telah dicatat beserta bukti portofolio. Anda tetap dapat menyetujui tarif saat ini kapan saja jika ingin langsung mulai bekerja.
                </div>
              )}

            </div>
          </Card>
        )}

        {/* DYNAMIC CARD: CASE C - REJECTED */}
        {isRejected && (
          <Card className="p-6 md:p-8 border-rose-300 bg-gradient-to-br from-rose-50/50 via-card to-card shadow-md">
            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-rose-950 dark:text-rose-200">
                  Pendaftaran Belum Dapat Disetujui
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mohon maaf, berkas pengajuan Anda belum memenuhi kriteria verifikasi admin RentMate.
                </p>

                {mitra?.rejection_reason && (
                  <div className="p-4 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-950 mt-3">
                    <p className="font-semibold mb-1">Catatan Peninjauan Admin:</p>
                    <p className="italic">"{mitra.rejection_reason}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/mitra/register')}
                className="w-full sm:w-auto"
              >
                Daftar Ulang dengan Data Baru
              </Button>
            </div>
          </Card>
        )}

        {/* Bottom Help & Navigation Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>Butuh bantuan seputar verifikasi? Hubungi help@rentmate.id</span>
          <Button variant="link" size="sm" onClick={() => navigate('/')} className="text-xs p-0 h-auto">
            Kembali ke Beranda
          </Button>
        </div>

      </div>
    </div>
  );
}