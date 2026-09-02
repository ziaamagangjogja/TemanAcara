// Fungsi untuk mendapatkan pengaturan aplikasi
export const getAppSettings = () => {
  const appName = localStorage.getItem("rentmate_app_name") || "RentMate";
  const appTitle = localStorage.getItem("rentmate_app_title") || "Lovable App";
  const appLogo = localStorage.getItem("rentmate_app_logo") || "";
  
  return {
    appName,
    appTitle,
    appLogo
  };
};

// Fungsi untuk memperbarui judul tab browser
export const updateAppTitle = (title: string) => {
  localStorage.setItem("rentmate_app_title", title);
  document.title = title;
};