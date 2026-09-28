import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Ilustrasi angka 404 */}
        <div className="relative mb-8">
          <div className="text-9xl font-extrabold text-primary/10 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-gradient-hero rounded-full flex items-center justify-center shadow-orange animate-bounce-soft">
              <Search className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Pesan */}
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Oops! Halaman yang kamu cari tidak ada atau sudah dipindahkan.
          Mungkin kamu salah ketik URL?
        </p>

        {/* Tombol aksi */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="w-5 h-5" />
            Kembali ke Beranda
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Halaman Sebelumnya
          </Button>
        </div>

        {/* Tautan cepat */}
        <div className="mt-10 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">Atau pergi ke:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/talents")}>
              Cari Teman
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")}>
              Pemesanan Saya
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/faq")}>
              FAQ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
