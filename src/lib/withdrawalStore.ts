// src/lib/withdrawalStore.ts
// Mengelola permintaan penarikan saldo (Withdrawal) via API backend (dengan localStorage fallback)

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  role: "user" | "mitra" | "admin";
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "pending" | "approved" | "rejected";
  proofImageBase64?: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
  mitraTotalEarnings?: number;
}

const LOCAL_KEY = "rentmate_withdrawal_requests";

// ============================================================
// Helper: localStorage fallback
// ============================================================
export function getWithdrawalFromLocalFallback(): WithdrawalRequest[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWithdrawalToLocal(request: WithdrawalRequest) {
  try {
    const existing = getWithdrawalFromLocalFallback();
    const idx = existing.findIndex(r => r.id === request.id);
    if (idx !== -1) {
      existing[idx] = request;
    } else {
      existing.unshift(request);
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.slice(0, 200)));
    window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
  } catch (e) {
    console.error("Gagal menyimpan penarikan ke localStorage:", e);
  }
}

function updateWithdrawalStatusInLocal(
  requestId: string,
  status: "approved" | "rejected",
  adminNote?: string,
  proofImageBase64?: string
) {
  try {
    const existing = getWithdrawalFromLocalFallback();
    const idx = existing.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      existing[idx].status = status;
      existing[idx].processedAt = new Date().toISOString();
      if (adminNote) existing[idx].adminNote = adminNote;
      if (proofImageBase64) existing[idx].proofImageBase64 = proofImageBase64;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
    }
  } catch (e) {
    console.error("Gagal mengupdate status penarikan di localStorage:", e);
  }
}

// ============================================================
// Ambil semua permintaan penarikan (untuk Admin)
// ============================================================
export async function getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  try {
    const res = await fetch("/api/withdrawal-requests");
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : getWithdrawalFromLocalFallback();
    }
  } catch {
    // API tidak tersedia, gunakan localStorage
  }
  return getWithdrawalFromLocalFallback();
}

// ============================================================
// Ambil permintaan penarikan milik satu user / mitra
// ============================================================
export async function getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
  try {
    const res = await fetch(`/api/withdrawal-requests/user/${userId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {
    // API tidak tersedia, fallback ke local
  }
  const all = getWithdrawalFromLocalFallback();
  return all.filter(r => r.userId === userId);
}

// ============================================================
// Helper: Hitung ringkasan penarikan saldo mitra
// ============================================================
export function getMitraWithdrawalSummary(mitraId: string, totalEarnings: number) {
  const all = getWithdrawalFromLocalFallback();
  const mitraWds = all.filter(r => r.userId === mitraId && r.role === "mitra");
  
  const pendingAmount = mitraWds
    .filter(r => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const approvedAmount = mitraWds
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const availableEarnings = Math.max(0, totalEarnings - pendingAmount - approvedAmount);

  return {
    requests: mitraWds,
    pendingAmount,
    approvedAmount,
    availableEarnings,
  };
}

// ============================================================
// Buat permintaan penarikan baru (dari User / Mitra)
// ============================================================
export async function createWithdrawalRequest(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  role?: "user" | "mitra" | "admin";
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  mitraTotalEarnings?: number;
}): Promise<{ success: boolean; data?: WithdrawalRequest; error?: string }> {
  const newRequest: WithdrawalRequest = {
    id: `wd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userPhoto: params.userPhoto,
    role: params.role || "user",
    amount: params.amount,
    bankName: params.bankName,
    accountNumber: params.accountNumber,
    accountName: params.accountName,
    status: params.role === "admin" ? "approved" : "pending",
    createdAt: new Date().toISOString(),
    processedAt: params.role === "admin" ? new Date().toISOString() : undefined,
    adminNote: params.role === "admin" ? "Pencairan kas profit komisi admin" : undefined,
    mitraTotalEarnings: params.mitraTotalEarnings,
  };

  try {
    const res = await fetch("/api/withdrawal-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRequest),
    });
    if (res.ok) {
      const saved = await res.json();
      saveWithdrawalToLocal(saved);
      window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
      window.dispatchEvent(new CustomEvent("userUpdated"));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
      return { success: true, data: saved };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || "Gagal mengajukan penarikan" };
    }
  } catch (err: any) {
    // API tidak tersedia, fallback lokal
    saveWithdrawalToLocal(newRequest);
    window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
    window.dispatchEvent(new CustomEvent("userUpdated"));
    return { success: true, data: newRequest };
  }
}

// ============================================================
// Admin: Pencairan Profit Kas Platform (Langsung Disetujui)
// ============================================================
export async function createAdminProfitDisbursement(params: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  adminNote?: string;
}): Promise<{ success: boolean; data?: WithdrawalRequest; error?: string }> {
  const newRequest: WithdrawalRequest = {
    id: `wd_admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: "admin_treasury",
    userName: "Admin Kas (PT TemanAcara)",
    userEmail: "admin@rentmate.id",
    userPhoto: "/favicon.ico",
    role: "admin",
    amount: params.amount,
    bankName: params.bankName,
    accountNumber: params.accountNumber,
    accountName: params.accountName,
    status: "approved",
    adminNote: params.adminNote || "Pencairan profit bagi hasil 20% komisi platform ke rekening owner/perusahaan",
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/withdrawal-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRequest),
    });
    if (res.ok) {
      const saved = await res.json();
      saveWithdrawalToLocal(saved);
      window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
      return { success: true, data: saved };
    }
  } catch {
    // offline fallback
  }

  saveWithdrawalToLocal(newRequest);
  window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
  return { success: true, data: newRequest };
}

// ============================================================
// Admin: Setujui & Konfirmasi transfer penarikan
// ============================================================
export async function approveWithdrawalRequest(
  requestId: string,
  adminNote?: string,
  proofImageBase64?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/withdrawal-requests/${requestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote, proofImageBase64 }),
    });
    if (res.ok) {
      updateWithdrawalStatusInLocal(requestId, "approved", adminNote, proofImageBase64);
      window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
      return { success: true };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || "Gagal menyetujui penarikan" };
    }
  } catch {
    // Offline fallback
    updateWithdrawalStatusInLocal(requestId, "approved", adminNote, proofImageBase64);
    window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
    return { success: true };
  }
}

// ============================================================
// Admin: Tolak penarikan (kembalikan saldo ke user)
// ============================================================
export async function rejectWithdrawalRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/withdrawal-requests/${requestId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote }),
    });
    if (res.ok) {
      updateWithdrawalStatusInLocal(requestId, "rejected", adminNote);
      window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
      window.dispatchEvent(new CustomEvent("userUpdated"));
      return { success: true };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || "Gagal menolak penarikan" };
    }
  } catch {
    // Offline fallback
    updateWithdrawalStatusInLocal(requestId, "rejected", adminNote);
    window.dispatchEvent(new CustomEvent("withdrawalRequestsUpdated"));
    return { success: true };
  }
}
