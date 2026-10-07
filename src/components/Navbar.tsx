import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Calendar, MessageCircle, User, Menu, X, HeartHandshake, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getCurrentUser, subscribeToUser, UserProfile } from "@/lib/userStore";
import { getBookings, subscribeToBookings } from "@/lib/bookingStore";
import { useAppSettings } from "@/contexts/AppSettingsContext";

const userNavItems = [
  { label: "Beranda", path: "/", icon: Home, requiresAuth: false },
  { label: "Teman", path: "/talents", icon: Users, requiresAuth: false },
  { label: "Pemesanan", path: "/bookings", icon: Calendar, requiresAuth: true },
  { label: "Percakapan", path: "/chat", icon: MessageCircle, requiresAuth: true },
  { label: "Profil", path: "/profile", icon: User, requiresAuth: true },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [activeBookingCount, setActiveBookingCount] = useState(0);
  const [user, setUser] = useState<UserProfile | null>(null);
  const { settings } = useAppSettings();

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };

    void loadUser();
    const unsubscribe = subscribeToUser(() => {
      void loadUser();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveBookingCount(0);
      return;
    }

    const updateActiveBookings = () => {
      const now = new Date();
      const activeBookings = getBookings().filter((booking) => {
        if (booking.userId !== user.id || booking.approvalStatus === "completed" || booking.approvalStatus === "rejected") {
          return false;
        }

        if (booking.date) {
          const timeStr = booking.time ? (booking.time.length === 5 ? `${booking.time}:00` : booking.time) : "00:00:00";
          const startTime = new Date(`${booking.date}T${timeStr}`);
          const endTime = new Date(startTime.getTime() + (booking.duration || 1) * 60 * 60 * 1000);
          if (!isNaN(endTime.getTime()) && endTime < now) return false;
        }

        return booking.paymentStatus === "pending" ||
          booking.approvalStatus === "pending_approval" ||
          booking.approvalStatus === "pending_mitra" ||
          booking.approvalStatus === "approved";
      });
      setActiveBookingCount(activeBookings.length);
    };

    updateActiveBookings();
    const unsubscribe = subscribeToBookings(updateActiveBookings);
    return unsubscribe;
  }, [user]);

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const displayUser = isAuthPage ? null : user;
  const visibleNavItems = userNavItems.filter(item => !item.requiresAuth || displayUser);
  const unreadNotifications = displayUser?.notifications?.filter((notification) => !notification.read).length || 0;

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("rentmate_current_username");
    localStorage.removeItem("rentmate_current_user");
    window.dispatchEvent(new CustomEvent("userUpdated"));
    setUser(null);
    setIsLogoutDialogOpen(false);
    setMobileMenuOpen(false);
    navigate("/login");
  };

  if (location.pathname === "/admin" || location.pathname === "/admin-login") {
    return null;
  }

  return (
    <>
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-orange">
              <span className="text-primary-foreground font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-xl text-foreground">RentMate</span>
          </Link>

          <div className="flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "soft" : "ghost"}
                    size="sm"
                    className={cn("gap-2", isActive && "text-primary font-semibold")}
                  >
                    <span className="relative">
                      <Icon className="w-4 h-4" />
                      {item.path === "/bookings" && activeBookingCount > 0 && (
                        <span className="absolute -right-3 -top-3 min-w-4 h-4 px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {activeBookingCount}/5
                        </span>
                      )}
                    </span>
                    {item.label}
                    {item.path === "/bookings" && activeBookingCount > 0 && (
                      <span className="hidden lg:inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Aktif {activeBookingCount}/5
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {displayUser && !isAuthPage && (
              <Link to="/profile?tab=notifications" aria-label="Notifikasi" className="relative">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            {!isAuthPage && (
              <Link to="/mitra">
                <Button variant="outline" size="sm" className="gap-2">
                  <HeartHandshake className="w-4 h-4" />
                  Jadi Mitra
                </Button>
              </Link>
            )}
            {displayUser && !isAuthPage && (
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Keluar
              </Button>
            )}
            {!displayUser && !isAuthPage && (
              <Link to="/login">
                <Button variant="hero" size="sm">
                  Masuk
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold text-lg text-foreground">RentMate</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-card border-b shadow-lg animate-slide-up">
            <div className="p-4 space-y-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <div className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors", isActive ? "bg-accent text-primary" : "hover:bg-secondary")}>
                      <span className="relative">
                        <Icon className="w-5 h-5" />
                        {item.path === "/bookings" && activeBookingCount > 0 && (
                          <span className="absolute -right-3 -top-2 min-w-4 h-4 px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {activeBookingCount}/5
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{item.label}</span>
                      {item.path === "/bookings" && activeBookingCount > 0 && (
                        <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Aktif {activeBookingCount}/5</span>
                      )}
                    </div>
                  </Link>
                );
              })}
              {displayUser && !isAuthPage && (
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary">
                    <Bell className="w-5 h-5" />
                    <span className="font-medium">Notifikasi</span>
                    {unreadNotifications > 0 && <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
                  </div>
                </Link>
              )}
              {!isAuthPage && (
                <Link to="/mitra" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary">
                    <HeartHandshake className="w-5 h-5" />
                    <span className="font-medium">Jadi Mitra</span>
                  </div>
                </Link>
              )}
              {displayUser && !isAuthPage && (
                <button type="button" onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="flex w-full items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary text-left">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Keluar</span>
                </button>
              )}
              {!displayUser && !isAuthPage && (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="hero" className="w-full mt-2">
                    Masuk
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px]", isActive ? "text-primary" : "text-muted-foreground")}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin ingin keluar?</AlertDialogTitle>
            <AlertDialogDescription>
              Sesi kamu akan diakhiri dan kamu perlu masuk kembali untuk mengakses fitur akun.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>Ya, Keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}