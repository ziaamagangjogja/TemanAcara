// src/lib/cityStore.ts

export const DEFAULT_CITIES = [
  "Jakarta",
  "Surabaya",
  "Bandung",
  "Medan",
  "Semarang",
  "Makassar",
  "Palembang",
  "Tangerang",
  "Depok",
  "Bekasi",
  "Yogyakarta",
  "Denpasar",
  "Malang",
  "Bogor",
  "Batam",
  "Pekanbaru",
  "Bandar Lampung",
  "Padang",
  "Manado",
  "Balikpapan",
  "Solo",
  "Cirebon",
  "Pontianak",
  "Samarinda",
  "Banjarmasin",
];

const STORAGE_KEY = "rentmate_cities";

/**
 * Mengambil daftar kota aktif dari localStorage atau default
 */
export function getCities(): string[] {
  if (typeof window === "undefined") return DEFAULT_CITIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Gagal membaca daftar kota dari localStorage:", err);
  }
  return DEFAULT_CITIES;
}

/**
 * Menyimpan daftar kota ke localStorage dan memberitahu komponen lain
 */
export function saveCities(cities: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
    window.dispatchEvent(new CustomEvent("citiesUpdated", { detail: { cities } }));
  } catch (err) {
    console.error("Gagal menyimpan daftar kota ke localStorage:", err);
  }
}

/**
 * Berlangganan perubahan daftar kota (misal saat admin menambah/mengedit/menghapus kota)
 */
export function subscribeToCities(callback: (cities: string[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    callback(getCities());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getCities());
    }
  };

  window.addEventListener("citiesUpdated", handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("citiesUpdated", handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
