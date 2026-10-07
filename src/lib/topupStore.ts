// src/lib/topupStore.ts
// Mengelola permintaan top-up / isi saldo via API backend (dengan localStorage fallback)

export interface TopUpRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  amount: number;
  proofImageBase64: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  processedAt?: string;
  adminNote?: string;
}

const LOCAL_KEY = "rentmate_topup_requests";

// ============================================================
// Helper: localStorage fallback
// ============================================================
export function getTopUpFromLocalFallback(): TopUpRequest[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTopUpToLocal(request: TopUpRequest) {
  try {
    const existing = getTopUpFromLocalFallback();
    const idx = existing.findIndex(r => r.id === request.id);
    if (idx !== -1) {
      existing[idx] = request;
    } else {
      existing.unshift(request);
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.slice(0, 200)));
    window.dispatchEvent(new CustomEvent("topupRequestsUpdated"));
  } catch (e) {
    console.error("Gagal menyimpan top-up ke localStorage:", e);
  }
}

function updateTopUpStatusInLocal(requestId: string, status: "approved" | "rejected", adminNote?: string) {
  try {
    const existing = getTopUpFromLocalFallback();
    const idx = existing.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      existing[idx].status = status;
      existing[idx].processedAt = new Date().toISOString();
      if (adminNote) existing[idx].adminNote = adminNote;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("topupRequestsUpdated"));
    }
  } catch (e) {
    console.error("Gagal mengupdate status top-up di localStorage:", e);
  }
}

// ============================================================
// Ambil semua permintaan top-up (untuk Admin)
// ============================================================
export async function getAllTopUpRequests(): Promise<TopUpRequest[]> {
  try {
    const res = await fetch("/api/topup-requests");
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : getTopUpFromLocalFallback();
    }
  } catch {
    // API tidak tersedia, gunakan localStorage
  }
  return getTopUpFromLocalFallback();
}

// ============================================================
// Ambil permintaan top-up milik satu user
// ============================================================
export async function getUserTopUpRequests(userId: string): Promise<TopUpRequest[]> {
  const all = await getAllTopUpRequests();
  return all.filter(r => r.userId === userId);
}

// ============================================================
// Buat permintaan top-up baru (dari User)
// ============================================================
export async function createTopUpRequest(
  userId: string,
  userName: string,
  userEmail: string,
  amount: number,
  proofImageBase64: string,
  userPhoto?: string
): Promise<TopUpRequest | null> {
  const newRequest: TopUpRequest = {
    id: `topup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    userName,
    userEmail,
    userPhoto,
    amount,
    proofImageBase64,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/topup-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRequest),
    });
    if (res.ok) {
      const saved = await res.json();
      saveTopUpToLocal(saved);
      return saved;
    }
  } catch {
    // API tidak tersedia
  }

  // Fallback: simpan ke localStorage
  saveTopUpToLocal(newRequest);
  return newRequest;
}

// ============================================================
// Admin: Setujui permintaan top-up & tambah saldo user
// ============================================================
export async function approveTopUpRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; request?: TopUpRequest }> {
  // Permintaan dari API tidak selalu ada di localStorage admin. Jangan
  // menggagalkan approval hanya karena data tersebut dibuat di browser user.
  const request = getTopUpFromLocalFallback().find(r => r.id === requestId);

  try {
    const res = await fetch(`/api/topup-requests/${requestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote }),
    });
    if (res.ok) {
      updateTopUpStatusInLocal(requestId, "approved", adminNote);
      // Backend sudah mengubah saldo dan membuat notifikasi. Jangan ulangi
      // perubahan saldo di sini karena admin bisa sedang memakai browser lain.
      return { success: true, request };
    }
  } catch {
    // API tidak tersedia, lakukan secara lokal bila data memang ada.
  }

  // Fallback offline hanya bisa dilakukan jika request tersimpan lokal.
  if (!request) return { success: false };
  updateTopUpStatusInLocal(requestId, "approved", adminNote);
  await addWalletToUser(request.userId, request.amount, request.userName);
  return { success: true, request };
}

// ============================================================
// Admin: Tolak permintaan top-up
// ============================================================
export async function rejectTopUpRequest(
  requestId: string,
  adminNote?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/topup-requests/${requestId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote }),
    });
    if (res.ok) {
      updateTopUpStatusInLocal(requestId, "rejected", adminNote);
      return true;
    }
  } catch {
    // API tidak tersedia
  }

  updateTopUpStatusInLocal(requestId, "rejected", adminNote);
  return true;
}

// ============================================================
// Helper: Tambah saldo user di backend
// ============================================================
async function addWalletToUser(userId: string, amount: number, userName: string) {
  try {
    // Coba via username dulu
    const username = userName.toLowerCase().replace(/\s+/g, "_");
    const userRes = await fetch(`/api/users/id/${userId}`);
    if (userRes.ok) {
      const user = await userRes.json();
      const newWallet = Number(user.wallet || 0) + amount;
      await fetch(`/api/users/${user.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: newWallet }),
      });
      window.dispatchEvent(new CustomEvent("userUpdated"));
      // Kirim notifikasi ke user
      addTopUpNotification(userId, amount);
    }
  } catch (e) {
    console.error("Gagal menambah saldo user:", e);
  }
}

// ============================================================
// Helper: Notifikasi top-up disetujui — simpan ke DB
// ============================================================
function addTopUpNotification(userId: string, amount: number) {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      title: "Saldo Berhasil Ditambahkan! 💰",
      message: `Permintaan isi saldo sebesar ${fmt(amount)} telah disetujui oleh Admin. Saldo kamu sudah diperbarui!`,
      type: "payment"
    })
  }).catch(() => {
    // Fallback: localStorage
    try {
      const key = `rentmate_notifications_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.unshift({ id: Date.now(), title: "Saldo Berhasil Ditambahkan! 💰", message: `Permintaan isi saldo sebesar ${fmt(amount)} telah disetujui oleh Admin. Saldo kamu sudah diperbarui!`, time: new Date().toLocaleString("id-ID"), read: false, type: "payment" });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
    } catch {}
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    window.dispatchEvent(new CustomEvent("userUpdated"));
  }
}
