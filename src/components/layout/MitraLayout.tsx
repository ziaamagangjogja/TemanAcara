import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Heart, LayoutDashboard, ChevronLeft, ArrowLeft } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { getCurrentMitra } from "@/lib/mitraStore";
import { Button } from "@/components/ui/button";

// Cek sesi mitra yang sudah login tanpa efek samping
function hasActiveMitraSession(): boolean {
  try {
    return (
      localStorage.getItem("mitraAuthenticated") === "true" &&
      !!localStorage.getItem("rentmate_current_mitra")
    );
  } catch {
    return false;
  }
}

// Halaman yang punya navbar sendiri atau tidak butuh navbar apapun
const NO_DASHBOARD_NAVBAR_PATHS = [
  "/mitra",
  "/mitra/tentang",
  "/mitra/aktivitas",
  "/mitra/keuntungan",
  "/mitra/cara-bergabung",
  "/mitra/login",
  "/mitra/register",
  "/mitra/claim-profile",
  "/mitra/terms",
  "/mitra/about",
  "/mitra/privacy",
  "/mitra/help",
  // Halaman berikut punya navbar/header sendiri yang lengkap
  "/mitra/dashboard",
];

// Halaman publik (landing) yang tampilkan LandingNavbar
const PUBLIC_MITRA_PATHS = [
  "/mitra",
  "/mitra/tentang",
  "/mitra/aktivitas",
  "/mitra/keuntungan",
  "/mitra/cara-bergabung",
  "/mitra/login",
  "/mitra/register",
  "/mitra/claim-profile",
  "/mitra/terms",
  "/mitra/about",
  "/mitra/privacy",
  "/mitra/help",
];

// Navbar untuk halaman publik mitra (landing, login, dsb)
function LandingNavbar() {
  const { settings } = useAppSettings();
  const navigate = useNavigate();

  // Deteksi apakah user sedang login sebagai user biasa (baca sesi dari localStorage
  // secara sinkron) agar tombol kembali mengarah ke halaman yang tepat.
  let hasUserSession = false;
  try {
    hasUserSession = !!localStorage.getItem("rentmate_current_username");
  } catch {
    hasUserSession = false;
  }

  const isMitraLoggedIn = hasActiveMitraSession();
  const backLabel = hasUserSession ? "Kembali ke Aplikasi" : "Kembali ke Beranda";

  const navLinks = [
    { label: "Tentang", to: "/mitra/tentang" },
    { label: "Aktivitas", to: "/mitra/aktivitas" },
    { label: "Keuntungan", to: "/mitra/keuntungan" },
    { label: "Cara Bergabung", to: "/mitra/cara-bergabung" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/mitra" className="flex items-center gap-2">
              {settings.appLogo ? (
                <img
                  src={settings.appLogo}
                  alt="Logo"
                  className="w-9 h-9 rounded-lg object-contain"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white fill-current" />
                </div>
              )}
              <span className="text-lg font-bold">{settings.appName || "RentMate"}</span>
            </Link>
          </div>

          <nav className="hidden md:flex gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Jika mitra sudah login, beri pintasan langsung ke dashboard */}
            {isMitraLoggedIn && (
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => navigate("/mitra/dashboard")}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard Mitra</span>
              </Button>
            )}

            {/* Tombol kembali ke aplikasi user agar tidak terjebak di halaman mitra */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate(hasUserSession ? "/profile" : "/")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Navbar untuk halaman dashboard mitra (sudah login)
function DashboardNavbar() {
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const currentMitra = getCurrentMitra();

  const isDashboard = location.pathname === "/mitra/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Kiri: Logo + (tombol kembali jika bukan di dashboard) */}
          <div className="flex items-center gap-3">
            <Link to="/mitra/dashboard" className="flex items-center gap-2">
              {settings.appLogo ? (
                <img
                  src={settings.appLogo}
                  alt="Logo"
                  className="w-9 h-9 rounded-lg object-contain"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white fill-current" />
                </div>
              )}
              <span className="text-lg font-bold">{settings.appName || "RentMate"}</span>
            </Link>

            {!isDashboard && (
              <span className="text-muted-foreground text-sm hidden sm:inline">
                — Portal Mitra
              </span>
            )}
          </div>

          {/* Kanan: Tombol kembali ke dashboard (hanya jika bukan di dashboard) */}
          <div className="flex items-center gap-3">
            {currentMitra && (
              <span className="hidden md:block text-sm text-muted-foreground">
                Halo, <span className="font-semibold text-foreground">{currentMitra.name}</span>
              </span>
            )}
            {!isDashboard && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => navigate("/mitra/dashboard")}
              >
                <ChevronLeft className="w-4 h-4" />
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Kembali ke Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function MitraLayout() {
  const location = useLocation();
  const currentMitra = getCurrentMitra();

  // Tentukan jenis navbar yang ditampilkan
  const isPublicPage = PUBLIC_MITRA_PATHS.some(
    (path) => location.pathname === path
  );
  const hasOwnNavbar = NO_DASHBOARD_NAVBAR_PATHS.some(
    (path) => location.pathname === path
  );

  // Jika sudah login, bukan halaman publik, dan tidak punya navbar sendiri → DashboardNavbar
  // Jika halaman publik → LandingNavbar
  // Jika sudah login tapi punya navbar sendiri (misal dashboard) → tidak ada navbar dari layout
  const showDashboardNavbar = currentMitra && !isPublicPage && !hasOwnNavbar;
  const showLandingNavbar = isPublicPage || !currentMitra;

  return (
    <>
      {showDashboardNavbar ? <DashboardNavbar /> : showLandingNavbar ? <LandingNavbar /> : null}
      <Outlet />
    </>
  );
}
