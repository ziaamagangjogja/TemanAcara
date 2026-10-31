// src/lib/mitraStore.ts


import {
  MitraAccount,
  MitraRegistrationData,
  MitraLoginData,
} from "@/types/mitra";
import { talents } from "@/data/mockData";
import { getBookings, getTalentReviewStats } from "@/lib/bookingStore";
import { getCurrentUser } from "@/lib/userStore";
import {
  saveCurrentMitraSession,
  getCurrentMitraSession,
  clearCurrentMitraSession,
  safeGetLocalStorage,
  safeSetLocalStorage,
  cleanupStorageQuota,
} from "./storageHelper";

/* ================= STATE ================= */
let mitraAccounts: MitraAccount[] = [];
let currentMitra: MitraAccount | null = null;
let listeners: (() => void)[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/* ================= STORAGE ================= */
function load() {
  try {
    const raw = localStorage.getItem("rentmate_mitra_accounts");
    mitraAccounts = raw ? JSON.parse(raw) : [];
  } catch {
    mitraAccounts = [];
  }
}

function save() {
  localStorage.setItem(
    "rentmate_mitra_accounts",
    JSON.stringify(mitraAccounts)
  );
  // Trigger event untuk notifikasi
  window.dispatchEvent(new CustomEvent("mitraVerificationUpdated"));
  window.dispatchEvent(new CustomEvent("talentListUpdated"));
  window.dispatchEvent(new CustomEvent("userCountUpdated"));
}

load();

/* ================= SUBSCRIBE ================= */
export function subscribeToMitraChanges(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter(l => l !== cb);
  };
}

function notify() {
  listeners.forEach(cb => cb());
}

/* ================= GETTERS ================= */
export function getMitraAccounts() {
  return [...mitraAccounts];
}

export function getCurrentMitra() {
  if (!isBrowser()) return null;
  try {
    const mitraData = safeGetLocalStorage("rentmate_current_mitra");
    if (!mitraData) return null;
    
    const mitra = JSON.parse(mitraData);
    
    // Nama: prioritaskan nama asli. `full_name` berasal dari tabel profiles DB.
    // Jangan pakai email sebagai nama tampilan.
    const userName =
      mitra.user_metadata?.name ||
      mitra.name ||
      mitra.full_name ||
      'Mitra';
    
    const isAuthenticated = safeGetLocalStorage("mitraAuthenticated");
    if (!isAuthenticated) {
      return null;
    }
    
    const talentId = mitra.talentId || mitra.id || mitra.user_id;
    
    if (!talentId) {
      console.error("MitraDashboard: No talentId found for current mitra:", mitra);
      return null;
    }
    
    // Normalisasi status verifikasi agar konsisten.
    // Data lama mungkin belum punya `verificationStatus`; pakai `status` sebagai fallback.
    const rawStatus = mitra.verificationStatus || mitra.status;
    const verificationStatus =
      rawStatus === "approved"
        ? "approved"
        : rawStatus === "rejected"
        ? "rejected"
        : "pending";

    return {
      ...mitra,
      name: userName,
      talentId,
      verificationStatus,
      isVerified: verificationStatus === "approved",
    };
  } catch (error) {
    console.error("Error getting current mitra:", error);
    return null;
  }
}

// TAMBAHKAN FUNGSI INI
export function getCurrentUserOrMitra() {
  // Cek apakah user adalah mitra
  const mitraData = safeGetLocalStorage("rentmate_current_mitra");
  if (mitraData) {
    try {
      const mitra = JSON.parse(mitraData);
      const isAuthenticated = safeGetLocalStorage("mitraAuthenticated");
      if (isAuthenticated) {
        const talentId = mitra.talentId || mitra.id || mitra.user_id;
        if (talentId) {
          return { 
            type: "mitra", 
            data: { 
              ...mitra, 
              name: mitra.user_metadata?.name || mitra.name || mitra.email || 'Mitra',
              id: talentId 
            } 
          };
        }
      }
    } catch (error) {
      console.error("Error parsing mitra data:", error);
    }
  }
  
  // Cek apakah user adalah regular user
  const userData = localStorage.getItem("rentmate_user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return { 
        type: "user", 
        data: { 
          ...user,
          id: user.id 
        } 
      };
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }
  
  return null;
}

export function getMitraByTalentId(talentId: string) {
  return (
    mitraAccounts.find(
      m =>
        m.talentId === talentId &&
        m.verificationStatus === "approved"
    ) || null
  );
}

/* ================= VERIFICATION ================= */
export function getAllPendingVerifications(): MitraAccount[] {
  return mitraAccounts.filter(
    m =>
      m.verificationStatus === "pending" &&
      !m.isLegacyTalent
  );
}

export function getPendingVerifications(): MitraAccount[] {
  return getAllPendingVerifications();
}

export function updateMitraVerification(mitraId: string, documents: any) {
  const mitra = mitraAccounts.find(m => m.id === mitraId);
  if (!mitra) return false;
  
  mitra.verificationDocuments = documents;
  mitra.verificationStatus = "pending";
  
  save();
  notify();
  return true;
}

/* ================= ADMIN REJECT ================= */
export async function rejectMitra(mitraId: string, email?: string, reason?: string): Promise<boolean> {
  const mitra = mitraAccounts.find(m => m.id === mitraId || m.talentId === mitraId || (email && m.email === email));
  if (mitra) {
    if (mitra.isLegacyTalent) return true;
    mitra.verificationStatus = "rejected";
    mitra.isVerified = false;
    if (reason) mitra.rejection_reason = reason;
    save();
    notify();
  }

  // Panggil endpoint backend agar status ter-update di database
  const targetEmail = email || mitra?.email;
  const payload = {
    talentId: mitraId,
    talentEmail: targetEmail,
    reason: reason || 'Dokumen belum memenuhi persyaratan verifikasi.'
  };

  try {
    let res = await fetch('/api/reject-talent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      res = await fetch('/reject-talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Gagal menolak talent (Status: ${res.status})`);
    }
  } catch (err: any) {
    console.error('Error rejecting talent in backend:', err);
    throw err;
  }

  window.dispatchEvent(new CustomEvent("mitraVerificationUpdated"));
  return true;
}

/* ================= TALENT DISPLAY ================= */
export async function getAllVerifiedTalents() {
  try {
    const response = await fetch('/api/talents');
    if (!response.ok) {
      console.error("Error fetching approved talents from API");
      return talents.map(t => ({ ...t, isLegacy: true, talentId: t.id }));
    }
    const approvedTalents = await response.json();

    const formattedNewTalents = (Array.isArray(approvedTalents) ? approvedTalents : [])
      .filter((mitra: any) => mitra.status === 'approved' && (mitra.price_accepted === 1 || mitra.price_accepted === true))
      .map((mitra: any) => {
      const targetId = mitra.user_id || mitra.id;
      const mockTalent = talents.find(t => t.id === targetId || t.email === mitra.email);
      const stats = getTalentReviewStats({ id: targetId, talentId: targetId });

      return {
        id: targetId,
        talentId: targetId,
        name: mitra.full_name || mitra.name || mockTalent?.name || 'Mitra Baru',
        photo: mitra.photo || mockTalent?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mitra.full_name || mitra.name || 'Talent')}`,
        city: mitra.address || mockTalent?.city || 'Indonesia',
        category: mitra.category || mockTalent?.skills?.[0] || 'Teman Acara',
        description: mitra.description || mockTalent?.bio || 'Siap menemani acara kamu.',
        rating: stats.reviewCount > 0 ? stats.rating : 0,
        reviewCount: stats.reviewCount,
        price: (mitra.price && Number(mitra.price) > 0) ? Number(mitra.price) : (mockTalent?.pricePerHour || 250000),
        pricePerHour: (mitra.price && Number(mitra.price) > 0) ? Number(mitra.price) : (mockTalent?.pricePerHour || 250000),
        availability: 'both',
        isVerified: true,
        isLegacy: false,
        age: (mitra.age && Number(mitra.age) > 0) ? Number(mitra.age) : (mockTalent?.age || 23),
        email: mitra.email,
        phone: mitra.phone || '',
        skills: (mitra.category && mitra.category.trim())
          ? mitra.category.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (mockTalent?.skills || ['Teman Acara']),
        status: mitra.status || 'approved',
      };
    });

    if (formattedNewTalents.length > 0) {
      return formattedNewTalents;
    }

    return talents.map(t => {
      const stats = getTalentReviewStats({ id: t.id, talentId: t.id });
      return { 
        ...t, 
        isLegacy: true,
        talentId: t.id,
        email: t.email,
        skills: t.skills || [],
        rating: stats.reviewCount > 0 ? stats.rating : 0,
        reviewCount: stats.reviewCount,
      };
    });

  } catch (error) {
    console.error("Gagal memuat data talent:", error);
    return talents.map(t => {
      const stats = getTalentReviewStats({ id: t.id, talentId: t.id });
      return { ...t, isLegacy: true, talentId: t.id, email: t.email, skills: t.skills || [], rating: stats.reviewCount > 0 ? stats.rating : 0, reviewCount: stats.reviewCount };
    });
  }
}

// src/lib/mitraStore.ts

/* ================= REGISTER ================= */
export async function registerMitra(
  data: MitraRegistrationData
): Promise<void> {
  console.log('Mengirim data pendaftaran ke server:', data);
  try {
    const response = await fetch('/register-talent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        address: data.address,
        description: data.description,
        price: data.price,
        category: data.category,
        photo: data.photo,
        ktp: data.ktp,
        age: data.age,
        experience_level: data.experience_level || 'menengah',
        price_expectation: data.price_expectation || 'Rp 50.000 - Rp 85.000',
        social_media: data.social_media || '',
        portfolio_file: data.portfolio_file || '',
      }),
    });
    console.log('Response dari server diterima:', response);

    if (!response.ok) {
      let errorMessage = 'Pendaftaran gagal'; // Pesan default
      const contentType = response.headers.get("content-type");
      
      // Coba parsing sebagai JSON hanya jika Content-Type-nya application/json
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Gagal parsing error response sebagai JSON:", e);
        }
      } else {
        // Jika bukan JSON, ambil sebagai teks
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (e) {
          console.error("Gagal mengambil error response sebagai teks:", e);
        }
      }
      
      // Lempar error dengan pesan yang lebih informatif
      throw new Error(`Server Error (${response.status}): ${errorMessage}`);
    }

    // Jika berhasil, Anda mungkin juga ingin mem-parsing respons sukses
    const result = await response.json(); // Asumsikan respons sukses selalu JSON
    console.log('Pendaftaran berhasil di server:', result);

  } catch (error: any) {
    console.error('Terjadi error di registerMitra:', error);
    // Lembar error agar dapat ditangkap oleh komponen yang memanggilnya
    throw new Error(error.message || 'Gagal terhubung ke server. Pastikan server Anda berjalan.');
  }
}

/* ================= LOGIN ================= */
export async function loginMitra(data: MitraLoginData): Promise<any> {
  const email = data.email.trim().toLowerCase();
  console.log('Mencoba login dengan email:', email);
  
  try {
    const oldTalent = talents.find(t => t.email === email);
    
    if (oldTalent) {
      console.log('Login dengan talent lama:', oldTalent.name);
      
      if (oldTalent.password !== data.password) {
        throw new Error('Email atau password salah');
      }
      
      const formattedOldTalent = {
        id: oldTalent.id,
        talentId: oldTalent.id,
        email: oldTalent.email,
        name: oldTalent.name,
        photo: oldTalent.photo,
        user_metadata: {
          name: oldTalent.name
        },
        verificationStatus: 'approved',
        isLegacyTalent: true,
        isOnline: true,
        lastActive: new Date().toISOString(),
      };
      
      saveCurrentMitraSession(formattedOldTalent);
      
      window.dispatchEvent(new CustomEvent("mitraLoggedIn", { detail: { user: formattedOldTalent } }));
      
      return formattedOldTalent;
    }
    
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: data.password,
      }),
    });
    
    console.log('Response dari server diterima:', response);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login gagal');
    }
    
    const result = await response.json();
    
    const userWithTalentId = {
      ...result.user,
      talentId: result.user.talentId || result.user.id || result.user.user_id,
      name: result.user?.full_name || result.user?.name || "Mitra",
      full_name: result.user?.full_name || result.user?.name || "Mitra",
      email: result.user?.email || "",
      photo: result.user?.photo || "",
      city: result.user?.address || result.user?.city || "",
      isOnline: true,
      lastActive: new Date().toISOString(),
      isLegacyTalent: false,
      price: result.user?.price ? Number(result.user.price) : 0,
      pricing_tier: result.user?.pricing_tier || 'tier2',
      price_accepted: Boolean(result.user?.price_accepted),
      rejection_reason: result.user?.rejection_reason || '',
      appeal_note: result.user?.appeal_note || '',
      category: result.user?.category || '',
      experience_level: result.user?.experience_level || 'menengah',
      price_expectation: result.user?.price_expectation || '',
      social_media: result.user?.social_media || '',
      verificationStatus:
        result.user?.status === "approved"
          ? "approved"
          : result.user?.status === "rejected"
          ? "rejected"
          : "pending",
      isVerified: result.user?.status === "approved",
    };
    
    saveCurrentMitraSession(userWithTalentId);
    window.dispatchEvent(new CustomEvent("mitraLoggedIn", { detail: { user: userWithTalentId } }));
    
    return userWithTalentId;
  } catch (error: any) {
    console.error('Terjadi error di loginMitra:', error);
    throw new Error(error.message || 'Gagal terhubung ke server. Pastikan server Anda berjalan.');
  }
}

/* ================= LOGOUT ================= */
export function logoutMitra() {
  if (currentMitra) {
    currentMitra.isOnline = false;
    currentMitra.lastActive = new Date().toISOString();
  }
  clearCurrentMitraSession();
  currentMitra = null;
  save();
  notify();
}

/* ================= APPROVE ================= */
export async function approveMitra(mitraId: string, mitraEmail: string, mitraName: string, price?: number, pricingTier?: string, adminPriceNote?: string) {
  console.log(`Menyetujui mitra ${mitraEmail} dan mengirim email.`);
  try {
    const response = await fetch('/send-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        talentEmail: mitraEmail,
        talentName: mitraName,
        price,
        pricing_tier: pricingTier || 'tier2',
        admin_price_note: adminPriceNote || null,
        loginLink: `${window.location.origin}/mitra/login`
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Gagal menyetujui talent');
    }
    console.log('Talent berhasil disetujui dan email telah dikirim.');
    
    window.dispatchEvent(new CustomEvent("talentApproved"));
    window.dispatchEvent(new CustomEvent("talentListUpdated"));
    
    return true;
  } catch (error: any) {
    console.error('Error approving mitra:', error);
    throw new Error(error.message || 'Gagal menghubungi server untuk persetujuan.');
  }
}

/* ================= UPDATE TALENT PRICE (ADMIN) ================= */
export async function updateTalentPrice(talentId: string, price: number): Promise<boolean> {
  return updateTalentProfile(talentId, { price });
}

/* ================= UPDATE TALENT PROFILE (ADMIN) ================= */
export async function updateTalentProfile(
  talentId: string,
  data: {
    name?: string;
    photo?: string;
    city?: string;
    category?: string;
    description?: string;
    price?: number;
    phone?: string;
    age?: number;
  }
): Promise<boolean> {
  try {
    // Kirim hanya field yang terisi (tidak undefined) agar field lain tidak terhapus.
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.full_name = data.name;
    if (data.photo !== undefined) payload.photo = data.photo;
    if (data.city !== undefined) payload.address = data.city;
    if (data.category !== undefined) payload.category = data.category;
    if (data.description !== undefined) payload.description = data.description;
    if (data.price !== undefined) payload.price = data.price;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.age !== undefined) payload.age = data.age;

    const response = await fetch(`/api/talents/${talentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Gagal memperbarui data talent.');
    }
    window.dispatchEvent(new CustomEvent('talentListUpdated'));
    window.dispatchEvent(new CustomEvent('mitraVerificationUpdated'));
    return true;
  } catch (error) {
    console.error('Error updating talent profile:', error);
    throw error;
  }
}

/* ================= VERIFICATION EMAIL ================= */
export async function sendVerificationEmail(mitraId: string) {
  const mitra = mitraAccounts.find(m => m.id === mitraId);
  if (!mitra || mitra.verificationEmailSent) return false;
  try {
    const response = await fetch('/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        talentEmail: mitra.email,
        talentName: mitra.name,
        confirmationLink: `${window.location.origin}/mitra/confirm/${mitra.id}`
      }),
    });
    if (response.ok) {
      mitra.verificationEmailSent = true;
      save();
      notify();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/* ================= CHECK VERIFICATION DEADLINE ================= */
export function checkVerificationDeadlines() {
  const allMitra = getMitraAccounts();
  const now = new Date();
  const expiredMitra = allMitra.filter(m => 
    m.verificationStatus === "pending" &&
    m.verificationDeadline &&
    new Date(m.verificationDeadline) < now &&
    !m.verificationEmailSent
  );
  expiredMitra.forEach(m => {
    sendVerificationEmail(m.id);
    window.dispatchEvent(new CustomEvent("verificationDeadlinePassed", { detail: { mitra: m } }));
  });
  return expiredMitra.length;
}

/* ================= BOOKINGS ================= */
export const getMitraBookings = (mitraId: string) => {
  try {
    const allBookings = getBookings();
    return allBookings.filter((booking: any) => booking.talentId === mitraId);
  } catch (error) {
    console.error("Error getting mitra bookings:", error);
    return [];
  }
};

/* ================= TOTAL USERS ================= */
export async function getTotalUsers() {
  const allTalents = await getAllVerifiedTalents();
  const currentUser = getCurrentUser();
  return (Array.isArray(allTalents) ? allTalents.length : 0) + (currentUser ? 1 : 0);
}

/* ================= UPDATE MITRA PROFILE ================= */
export async function updateMitraProfile(data: {
  name?: string;
  photo?: string;
  city?: string;
  category?: string;
  description?: string;
  price?: number;
  availability?: string;
}) {
  try {
    const currentMitra = getCurrentMitra();
    if (!currentMitra) {
      throw new Error('Tidak ada mitra yang login');
    }

    const updatedMitra = {
      ...currentMitra,
      ...data
    };
    
    saveCurrentMitraSession(updatedMitra);
    
    if (!currentMitra.isLegacyTalent) {
      // Bangun payload hanya dari field yang benar-benar diisi (partial update),
      // agar field lain di database tidak tertimpa menjadi kosong.
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.full_name = data.name;
      if (data.photo !== undefined) payload.photo = data.photo;
      if (data.city !== undefined) payload.address = data.city;
      if (data.category !== undefined) payload.category = data.category;
      if (data.description !== undefined) payload.description = data.description;
      if (data.price !== undefined) payload.price = data.price;

      const response = await fetch(`/api/talents/${currentMitra.talentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
        
      if (!response.ok) {
        throw new Error('Gagal update profile di server');
      }
    }
    
    window.dispatchEvent(new CustomEvent("mitraProfileUpdated", { detail: { mitra: updatedMitra } }));
    
    return updatedMitra;
  } catch (error: any) {
    console.error('Error updating mitra profile:', error);
    throw new Error(error.message || 'Gagal memperbarui profil mitra');
  }
}

/* ================= UPDATE ONLINE STATUS ================= */
export function updateMitraOnlineStatus(isOnline: boolean) {
  const currentMitra = getCurrentMitra();
  if (!currentMitra) return;
  
  const updatedMitra = {
    ...currentMitra,
    isOnline,
    lastActive: new Date().toISOString()
  };
  
  saveCurrentMitraSession(updatedMitra);
  
  window.dispatchEvent(new CustomEvent("mitraStatusUpdated", { detail: { mitra: updatedMitra } }));
}
