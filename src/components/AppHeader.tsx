import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAppSettings } from "@/lib/appSettingsStore";

export function AppHeader() {
  const [appSettings, setAppSettings] = useState({
    appName: "RentMate",
    appTitle: "Lovable App",
    appLogo: ""
  });

  useEffect(() => {
    // Muat pengaturan aplikasi dari localStorage
    const settings = getAppSettings();
    setAppSettings(settings);
    
    // Perbarui judul tab browser
    document.title = settings.appTitle;
  }, []);

  return (
    <header className="bg-card border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3">
          {appSettings.appLogo ? (
            <img src={appSettings.appLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
          ) : (
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-orange">
              <span className="text-primary-foreground font-bold text-lg">R</span>
            </div>
          )}
          <span className="font-bold text-xl">{appSettings.appName}</span>
        </Link>
        {/* ... bagian lain dari header ... */}
      </div>
    </header>
  );
}