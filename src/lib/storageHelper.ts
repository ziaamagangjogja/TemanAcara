/**
 * Utility untuk manajemen penyimpanan browser (localStorage & sessionStorage)
 * yang aman terhadap QuotaExceededError (batas penyimpanan 5MB browser).
 */

const STORAGE_KEY_MITRA = "rentmate_current_mitra";
const STORAGE_KEY_MITRA_AUTH = "mitraAuthenticated";

/**
 * Membersihkan data cache lokal yang membengkak (misalnya bukti transfer base64)
 * agar ruang penyimpanan localStorage kembali lega.
 */
export function cleanupStorageQuota(): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Bersihkan base64 berukuran besar dari 'rentmate_topups'
    const topupsRaw = localStorage.getItem("rentmate_topups");
    if (topupsRaw) {
      try {
        const topups = JSON.parse(topupsRaw);
        if (Array.isArray(topups)) {
          let modified = false;
          const cleaned = topups.map((item: any) => {
            if (item.proof && typeof item.proof === "string" && item.proof.startsWith("data:")) {
              modified = true;
              return { ...item, proof: "" }; // Hilangkan gambar base64 yang sudah ada di DB
            }
            return item;
          });
          if (modified) {
            localStorage.setItem("rentmate_topups", JSON.stringify(cleaned.slice(0, 50)));
          }
        }
      } catch {
        localStorage.removeItem("rentmate_topups");
      }
    }

    // 2. Bersihkan base64 berukuran besar dari 'rentmate_user_topups_*'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("rentmate_user_topups_")) {
        try {
          const raw = localStorage.getItem(key);
          if (raw && raw.length > 50000) {
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
              const cleaned = data.map((item: any) => ({
                ...item,
                proof: item.proof && item.proof.startsWith("data:") ? "" : item.proof,
              }));
              localStorage.setItem(key, JSON.stringify(cleaned.slice(0, 20)));
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }

    // 3. Bersihkan foto berukuran besar dari mock accounts 'rentmate_mitra_accounts'
    const accountsRaw = localStorage.getItem("rentmate_mitra_accounts");
    if (accountsRaw && accountsRaw.length > 100000) {
      try {
        const accounts = JSON.parse(accountsRaw);
        if (Array.isArray(accounts)) {
          const cleaned = accounts.map((acc: any) => {
            if (acc.photo && typeof acc.photo === "string" && acc.photo.startsWith("data:")) {
              return { ...acc, photo: "" };
            }
            return acc;
          });
          localStorage.setItem("rentmate_mitra_accounts", JSON.stringify(cleaned.slice(0, 30)));
        }
      } catch {
        localStorage.removeItem("rentmate_mitra_accounts");
      }
    }

    // 4. Bersihkan laporan lama jika ukurannya besar
    const reportsRaw = localStorage.getItem("lovable_reports");
    if (reportsRaw && reportsRaw.length > 200000) {
      try {
        const reports = JSON.parse(reportsRaw);
        if (Array.isArray(reports)) {
          localStorage.setItem("lovable_reports", JSON.stringify(reports.slice(-20)));
        }
      } catch {
        localStorage.removeItem("lovable_reports");
      }
    }
  } catch (err) {
    console.warn("Error running cleanupStorageQuota:", err);
  }
}

/**
 * Menyimpan data ke localStorage dengan proteksi QuotaExceeded.
 * Jika kuota penuh, fungsi akan melakukan pembersihan cache otomatis,
 * memangkas payload foto base64 jika diperlukan, dan bila perlu fallback ke sessionStorage.
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;

  // Coba penyimpanan normal terlebih dahulu
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`Penyimpanan ${key} ke localStorage gagal (${e?.name || e}), menjalankan penanganan kuota...`);
  }

  // 1. Jalankan pembersihan kuota
  cleanupStorageQuota();

  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // 2. Jika masih gagal dan value adalah JSON, pangkas string base64 yang besar
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) {
        if (parsed.photo && typeof parsed.photo === "string" && parsed.photo.startsWith("data:") && parsed.photo.length > 20000) {
          parsed.photo = ""; // Hilangkan foto base64 lokal yang terlalu besar
        }
        if (parsed.proof && typeof parsed.proof === "string" && parsed.proof.startsWith("data:")) {
          parsed.proof = "";
        }
        const compressedValue = JSON.stringify(parsed);
        localStorage.setItem(key, compressedValue);
        return true;
      }
    } catch {
      // bukan JSON yang bisa dipangkas
    }

    // 3. Fallback terakhir: simpan ke sessionStorage agar sesi pengguna tidak terputus
    try {
      sessionStorage.setItem(key, value);
      console.info(`Berhasil menyimpan ${key} ke sessionStorage sebagai fallback.`);
      return true;
    } catch (sessionErr) {
      console.error(`Gagal menyimpan ${key} baik ke localStorage maupun sessionStorage:`, sessionErr);
      return false;
    }
  }
}

/**
 * Mengambil data dari localStorage dengan fallback ke sessionStorage.
 */
export function safeGetLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

/**
 * Menghapus data dari localStorage dan sessionStorage sekaligus.
 */
export function safeRemoveLocalStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

/**
 * Helper khusus untuk menyimpan data sesi mitra secara aman.
 */
export function saveCurrentMitraSession(mitra: any): boolean {
  if (!mitra) return false;

  // Buat objek sesi bersih
  const sessionData = {
    ...mitra,
    talentId: mitra.talentId || mitra.id || mitra.user_id,
    name: mitra.full_name || mitra.name || "Mitra",
    full_name: mitra.full_name || mitra.name || "Mitra",
    email: mitra.email || "",
    isOnline: true,
    lastActive: new Date().toISOString(),
  };

  safeSetLocalStorage(STORAGE_KEY_MITRA_AUTH, "true");
  return safeSetLocalStorage(STORAGE_KEY_MITRA, JSON.stringify(sessionData));
}

/**
 * Helper khusus untuk mengambil data sesi mitra secara aman.
 */
export function getCurrentMitraSession(): any | null {
  const raw = safeGetLocalStorage(STORAGE_KEY_MITRA);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Helper khusus untuk menghapus data sesi mitra.
 */
export function clearCurrentMitraSession(): void {
  safeRemoveLocalStorage(STORAGE_KEY_MITRA);
  safeRemoveLocalStorage(STORAGE_KEY_MITRA_AUTH);
}
