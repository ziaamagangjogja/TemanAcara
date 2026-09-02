import { Heart, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="px-4 sm:px-6 py-12 bg-secondary text-secondary-foreground">
      
      {/* GRID UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        {/* KOLOM 1 — LOGO & DESKRIPSI */}
        <div className="flex flex-col items-start space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-xl font-bold">RentMate</span>
          </div>

          <p className="text-sm text-secondary-foreground/70 max-w-xs">
            Platform teman profesional #1 di Indonesia
          </p>
        </div>

        {/* KOLOM 2 — NAVIGASI + FAQ */}
        <div className="flex flex-col items-start space-y-3">
          <h4 className="font-semibold">Navigasi</h4>
          <nav className="flex flex-col space-y-2 text-sm">
            <a
              href="/mitra/about"
              className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              Tentang Kami
            </a>
            <a
              href="/mitra/terms"
              className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              Syarat & Ketentuan
            </a>
            <a
              href="/mitra/privacy"
              className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              Kebijakan Privasi
            </a>
            <a
              href="/mitra/help"
              className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>
        </div>

        {/* KOLOM 3 — KONTAK */}
        <div className="flex flex-col items-start space-y-3 text-sm">
          <h4 className="font-semibold">Kontak</h4>

          <div className="flex items-center gap-2 text-secondary-foreground/70">
            <Mail className="w-4 h-4" />
            <a
              href="mailto:support@lovable.id"
              className="hover:text-secondary-foreground transition-colors"
            >
              support@RentMate.id
            </a>
          </div>

          <div className="flex items-center gap-2 text-secondary-foreground/70">
            <Phone className="w-4 h-4" />
            <span>+62 812-3456-7890</span>
          </div>

          <div className="flex items-center gap-2 text-secondary-foreground/70">
            <MapPin className="w-4 h-4" />
            <span>Jakarta, Indonesia</span>
          </div>
        </div>
      </div>

      {/* GARIS & COPYRIGHT */}
      <div className="border-t border-secondary-foreground/20 pt-6">
        <p className="text-sm text-secondary-foreground/50 text-center">
          © {new Date().getFullYear()} RentMate. Platform Teman Profesional Indonesia.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
