// src/lib/mitraStore.ts

import { supabase } from "@/lib/supabase";
import {
  MitraAccount,
  MitraRegistrationData,
  MitraLoginData,
} from "@/types/mitra";
import { talents } from "@/data/mockData";
import { getBookings } from "@/lib/bookingStore";
import { getCurrentUser } from "@/lib/userStore";

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
    const mitraData = localStorage.getItem("rentmate_current_mitra");
    if (!mitraData) return null;
    
    const mitra = JSON.parse(mitraData);
    
    const userName = mitra.user_metadata?.name || mitra.name || mitra.email || 'Mitra';
    
    const isAuthenticated = localStorage.getItem("mitraAuthenticated");
    if (!isAuthenticated) {
      return null;
    }
    
    const talentId = mitra.talentId || mitra.id || mitra.user_id;
    
    if (!talentId) {
      console.error("MitraDashboard: No talentId found for current mitra:", mitra);
      return null;
    }
    
    return { ...mitra, name: userName, talentId };
  } catch (error) {
    console.error("Error getting current mitra:", error);
    return null;
  }
}

// TAMBAHKAN FUNGSI INI
export function getCurrentUserOrMitra() {
  // Cek apakah user adalah mitra
  const mitraData = localStorage.getItem("rentmate_current_mitra");
  if (mitraData) {
    try {
      const mitra = JSON.parse(mitraData);
      const isAuthenticated = localStorage.getItem("mitraAuthenticated");
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
export function rejectMitra(mitraId: string) {
  const mitra = mitraAccounts.find(m => m.id === mitraId);
  if (!mitra) return false;

  if (mitra.isLegacyTalent) return true;

  mitra.verificationStatus = "rejected";
  mitra.isVerified = false;

  save();
  notify();
  return true;
}

/* ================= TALENT DISPLAY ================= */
export async function getAllVerifiedTalents() {
  try {
    const { data: approvedTalents, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'approved');

    if (error) {
      console.error("Error fetching approved talents from Supabase:", error);
      return talents.map(t => ({ ...t, isLegacy: true, talentId: t.id }));
    }

    const formattedNewTalents = approvedTalents.map((mitra: any) => ({
      id: mitra.user_id,
      talentId: mitra.user_id,
      name: mitra.full_name,
      photo: mitra.photo,
      city: mitra.address || 'Tidak diketahui',
      category: mitra.category || 'Lainnya',
      description: mitra.description || '',
      rating: 0,
      price: mitra.price || 0,
      pricePerHour: mitra.price || 0,
      availability: 'online & offline',
      isVerified: true,
      isLegacy: false,
      age: mitra.age,
      email: mitra.email,
      phone: mitra.phone,
      skills: mitra.skills || [],
    }));

    const formattedLegacyTalents = talents.map(t => ({ 
      ...t, 
      isLegacy: true,
      talentId: t.id,
      email: t.email,
      skills: t.skills || [],
    }));

    return [...formattedNewTalents, ...formattedLegacyTalents];

  } catch (error) {
    console.error("Gagal memuat data talent:", error);
    return talents.map(t => ({ ...t, isLegacy: true, talentId: t.id, email: t.email, skills: t.skills || [] }));
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
      
      localStorage.setItem("rentmate_current_mitra", JSON.stringify(formattedOldTalent));
      localStorage.setItem("mitraAuthenticated", "true");
      
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
      isOnline: true,
      lastActive: new Date().toISOString(),
      isLegacyTalent: false,
    };
    
    localStorage.setItem("rentmate_current_mitra", JSON.stringify(userWithTalentId));
    localStorage.setItem("mitraAuthenticated", "true");
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
  localStorage.removeItem("rentmate_current_mitra");
  localStorage.removeItem("mitraAuthenticated");
  currentMitra = null;
  save();
  notify();
}

/* ================= APPROVE ================= */
export async function approveMitra(mitraId: string, mitraEmail: string, mitraName: string) {
  console.log(`Menyetujui mitra ${mitraEmail} dan mengirim email.`);
  try {
    const response = await fetch('/send-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        talentEmail: mitraEmail,
        talentName: mitraName,
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
export function getTotalUsers() {
  const allTalents = getAllVerifiedTalents();
  const currentUser = getCurrentUser();
  return allTalents.length + (currentUser ? 1 : 0);
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
    
    localStorage.setItem("rentmate_current_mitra", JSON.stringify(updatedMitra));
    
    if (!currentMitra.isLegacyTalent) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          photo: data.photo,
          address: data.city,
          category: data.category,
          description: data.description,
          price: data.price,
        })
        .eq('user_id', currentMitra.talentId);
        
      if (error) {
        throw error;
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
  
  localStorage.setItem("rentmate_current_mitra", JSON.stringify(updatedMitra));
  
  window.dispatchEvent(new CustomEvent("mitraStatusUpdated", { detail: { mitra: updatedMitra } }));
}