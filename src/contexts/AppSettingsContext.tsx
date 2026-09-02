// src/contexts/AppSettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppSettings {
  appName: string;
  appTitle: string;
  appLogo: string;
  appFavicon: string; // Tambahkan field untuk favicon
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  appName: 'RentMate',
  appTitle: 'RentMate - Teman Terpercaya',
  appLogo: '',
  appFavicon: ''
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};

interface AppSettingsProviderProps {
  children: ReactNode;
}

export const AppSettingsProvider: React.FC<AppSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedAppName = localStorage.getItem('rentmate_app_name');
    const savedAppTitle = localStorage.getItem('rentmate_app_title');
    const savedAppLogo = localStorage.getItem('rentmate_app_logo');
    const savedAppFavicon = localStorage.getItem('rentmate_app_favicon'); // Tambahkan loading untuk favicon

    if (savedAppName || savedAppTitle || savedAppLogo || savedAppFavicon) {
      const newSettings = {
        appName: savedAppName || defaultSettings.appName,
        appTitle: savedAppTitle || defaultSettings.appTitle,
        appLogo: savedAppLogo || defaultSettings.appLogo,
        appFavicon: savedAppFavicon || defaultSettings.appFavicon // Tambahkan favicon ke settings
      };
      
      setSettings(newSettings);

      // Update document title if saved
      if (newSettings.appTitle) {
        document.title = newSettings.appTitle;
      }

      // Update favicon if saved
      if (newSettings.appFavicon) {
        updateFavicon(newSettings.appFavicon);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Save to localStorage
    if (newSettings.appName !== undefined) {
      localStorage.setItem('rentmate_app_name', newSettings.appName);
    }
    if (newSettings.appTitle !== undefined) {
      localStorage.setItem('rentmate_app_title', newSettings.appTitle);
      document.title = newSettings.appTitle;
    }
    if (newSettings.appLogo !== undefined) {
      localStorage.setItem('rentmate_app_logo', newSettings.appLogo);
    }
    if (newSettings.appFavicon !== undefined) {
      localStorage.setItem('rentmate_app_favicon', newSettings.appFavicon);
      updateFavicon(newSettings.appFavicon); // Update favicon saat settings berubah
    }
  };

  // Fungsi untuk memperbarui favicon
  const updateFavicon = (faviconUrl: string) => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};