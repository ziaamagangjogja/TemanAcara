import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Menu, X } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext"; // <-- TAMBAHKAN INI

const navLinks = [
  { label: "Tentang", to: "/mitra/tentang" },
  { label: "Aktivitas", to: "/mitra/aktivitas" },
  { label: "Keuntungan", to: "/mitra/keuntungan" },
  { label: "Cara Bergabung", to: "/mitra/cara-bergabung" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useAppSettings(); // <-- TAMBAHKAN INI UNTUK MENGAMBIL PENGATURAN

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center justify-between h-16">

          {/* Logo - SUDAH DIPERBAIKI */}
          <Link to="/" className="flex items-center gap-2">
            {settings.appLogo ? ( // <-- JIKA ADA LOGO DI PENGATURAN...
              <img 
                src={settings.appLogo} 
                alt="Logo" 
                className="w-9 h-9 rounded-lg object-contain" 
              />
            ) : ( // <-- JIKA TIDAK, PAKAI LOGO DEFAULT...
              <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
            )}
            {/* Nama Aplikasi - SUDAH DIPERBAIKI */}
            <span className="text-lg font-bold">{settings.appName || "Lovable"}</span>
          </Link>

          {/* Desktop */}
          <nav className="hidden md:flex gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="block py-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;