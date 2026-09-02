import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Home,
  MessageSquare,
  Calendar,
  DollarSign,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentMitra, logoutMitra } from "@/lib/mitraStore";

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "/mitra/dashboard" },
  { id: "chats", label: "Percakapan", icon: MessageSquare, path: "/mitra/chats" },
  { id: "bookings", label: "Pemesanan", icon: Calendar, path: "/mitra/bookings" },
  { id: "earnings", label: "Pendapatan", icon: DollarSign, path: "/mitra/earnings" },
  { id: "profile", label: "Profil Saya", icon: User, path: "/mitra/profile" },
];

export default function MitraLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const currentMitra = getCurrentMitra();

  const handleLogout = () => {
    logoutMitra();
    navigate("/mitra/login");
    toast({ title: "Logout Berhasil", description: "Anda telah keluar." });
  };

  if (!currentMitra) {
    // Jika tidak ada mitra yang login, arahkan ke login. Ini adalah jaga-jaga.
    navigate("/mitra/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar Mitra */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex-shrink-0">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-primary">Portal Mitra</h2>
        </div>
        <nav className="mt-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  isActive ? "bg-primary/10 text-primary border-r-4 border-primary" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full p-6 border-t">
          <div className="flex items-center gap-3 mb-4 p-3">
            <img src={currentMitra.photo} alt={currentMitra.name} className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-medium text-sm">{currentMitra.name}</p>
              <p className="text-xs text-muted-foreground">
                {currentMitra.isOnline ? (
                  <span className="text-green-500">Online</span>
                ) : (
                  <span className="text-gray-500">Offline</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Header Mitra */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold capitalize">
              {sidebarItems.find(item => item.path === location.pathname)?.label || "Dashboard"}
            </h1>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Akun Terverifikasi</span>
            </div>
          </div>
        </header>

        {/* Content dari Halaman Anak akan dirender di sini */}
        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}