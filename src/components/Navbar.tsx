import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Calendar, MessageCircle, User, Menu, X, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser, subscribeToUser, UserProfile } from "@/lib/userStore";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const displayUser = isAuthPage ? null : user;
  const visibleNavItems = userNavItems.filter(item => !item.requiresAuth || displayUser);

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
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {!isAuthPage && (
              <Link to="/mitra">
                <Button variant="outline" size="sm" className="gap-2">
                  <HeartHandshake className="w-4 h-4" />
                  Jadi Mitra
                </Button>
              </Link>
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
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              {!isAuthPage && (
                <Link to="/mitra" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary">
                    <HeartHandshake className="w-5 h-5" />
                    <span className="font-medium">Jadi Mitra</span>
                  </div>
                </Link>
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
    </>
  );
}