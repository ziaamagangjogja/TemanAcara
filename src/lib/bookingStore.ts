// src/lib/bookingStore.ts

import { supabase } from "./supabase";
import { getOrCreateChatSession } from "./chatStore";
import { getCurrentMitra } from "./mitraStore";
import { getCurrentUser } from "./userStore";
import { getAppCommission, calculatePaymentSplit } from "./paymentUtils";

export interface SharedBooking {
  id: string;
  userId: string;
  talentId: string;

  purpose: string;
  type: "online" | "offline";
  date: string;
  time: string;
  duration: number;
  total: number;
  notes?: string;

  paymentStatus: "pending" | "paid";
  approvalStatus: "pending_approval" | "approved" | "rejected" | "completed";

  paymentMethod?: "qris" | "bca" | "bri" | "mandiri";
  paymentCode?: string;
  paymentProof?: string;
  transferAmount?: number;
  transferTime?: string;

  paymentSplit?: {
    appAmount: number;
    mitraAmount: number;
    totalAmount: number;
    commissionPercentage: number;
  };

  createdAt: string;

  rating?: number;
  ratingComment?: string;
  
  // OPTIONAL: helper fields from app context (not from Supabase)
  talentName?: string;
  talentPhoto?: string;
  userName?: string;
  userPhoto?: string;
  bookerType?: "user" | "mitra";
}

// In-memory cache atau fallback sementara jika offline, tapi utama lewat Supabase
let cachedBookings: SharedBooking[] = [];

// Fungsi untuk sinkronisasi data dari tabel "bookings" di Supabase
// Join ke tabel users dan mitra_accounts agar userName & talentName selalu terisi
async function fetchBookingsFromSupabase(): Promise<SharedBooking[]> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil data booking dari Supabase:", error);
      return cachedBookings;
    }

    if (!data || data.length === 0) {
      cachedBookings = [];
      return cachedBookings;
    }

    // Kumpulkan semua user_id dan talent_id yang unik untuk batch fetch
    const userIds = [...new Set(data.map((b: any) => b.user_id).filter(Boolean))];
    const talentIds = [...new Set(data.map((b: any) => b.talent_id).filter(Boolean))];

    // Fetch data user sekaligus (batch)
    const userMap: Record<string, { name: string; photo: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, photo")
        .in("id", userIds);
      if (users) {
        users.forEach((u: any) => {
          userMap[u.id] = { name: u.name || "Ziaa", photo: u.photo || "" };
        });
      }
    }

    // Fetch data talent/mitra sekaligus (batch) - dari tabel mitra_accounts
    const talentMap: Record<string, { name: string; photo: string }> = {};
    if (talentIds.length > 0) {
      const { data: talents } = await supabase
        .from("mitra_accounts")
        .select("id, name, photo")
        .in("id", talentIds);
      if (talents) {
        talents.forEach((t: any) => {
          talentMap[t.id] = { name: t.name || "Talent", photo: t.photo || "" };
        });
      }
    }

    cachedBookings = data.map((item: any) => {
      // Prioritaskan membaca dari kolom user_name di database Supabase
      const finalUserName = item.user_name || userMap[item.user_id]?.name || "User";

      const user = { name: finalUserName, photo: userMap[item.user_id]?.photo || item.user_photo || "" };
      const talent = talentMap[item.talent_id] || { name: item.talent_name || "Talent", photo: item.talent_photo || "" };

      return {
        id: item.id,
        userId: item.user_id || "",
        talentId: item.talent_id || "",
        userName: user.name,
        userPhoto: user.photo,
        talentName: talent.name,
        talentPhoto: talent.photo,
        purpose: item.purpose || "",
        type: item.type || "offline",
        date: item.date || "",
        time: item.time || "",
        duration: item.duration || 1,
        total: item.total || 0,
        notes: item.notes || "",
        paymentStatus: item.payment_status || "pending",
        approvalStatus: item.approval_status || "pending_approval",
        paymentMethod: item.payment_method,
        paymentCode: item.payment_code,
        paymentProof: item.payment_proof,
        transferAmount: item.transfer_amount,
        transferTime: item.transfer_time,
        paymentSplit: item.payment_split,
        createdAt: item.created_at,
        rating: item.rating,
        ratingComment: item.rating_comment,
      };
    });
    
    return cachedBookings;
  } catch (err) {
    console.error("Error koneksi Supabase:", err);
    return cachedBookings;
  }
}

// Jalankan fetch awal jika di browser
if (typeof window !== "undefined") {
  fetchBookingsFromSupabase();
}

/* ======================
   PUBLIC API (Disesuaikan ke Supabase)
====================== */

export async function refreshBookingsFromSupabase(): Promise<SharedBooking[]> {
  const fresh = await fetchBookingsFromSupabase();
  return fresh;
}

export function getBookings(): SharedBooking[] {
  if (cachedBookings.length === 0 && typeof window !== "undefined") {
    void fetchBookingsFromSupabase();
  }
  return cachedBookings;
}

export function getBookingById(id: string): SharedBooking | undefined {
  return cachedBookings.find(b => b.id === id);
}

export async function addBooking(
  booking: Omit<SharedBooking, "id" | "createdAt" | "paymentSplit" | "userId">
): Promise<SharedBooking> {
  const createdAt = new Date().toISOString();

  const currentUserSession = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("rentmate_current_user") || "null")
    : null;

  const currentUsername = typeof window !== "undefined" 
    ? localStorage.getItem("rentmate_current_username") 
    : null;

  const userId = currentUserSession?.id || currentUserSession?.user_id || currentUsername || "user-id";
  const userName = currentUserSession?.name || currentUserSession?.username || currentUsername || "User";
  const userPhoto = currentUserSession?.photo || booking.userPhoto || "";

  // Simpan ke Supabase termasuk kolom user_name yang baru saja kamu buat
  const insertPayload: Record<string, any> = {
    user_id: userId,
    user_name: userName, // <-- KOLOM BARU DIKIRIM KE SUPABASE
    talent_id: booking.talentId,
    purpose: booking.purpose,
    type: booking.type,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    total: booking.total,
    payment_status: booking.paymentStatus,
    approval_status: booking.approvalStatus,
    payment_code: booking.paymentCode || "",
    created_at: createdAt,
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert([insertPayload])
    .select("id, user_id, user_name, talent_id, purpose, type, date, time, duration, total, payment_status, approval_status, payment_code, created_at")
    .single();

  if (error) {
    console.error("Gagal menambah booking ke Supabase:", error);
    throw new Error(error.message || "Gagal membuat draft pemesanan");
  }

  const newBooking: SharedBooking = {
    id: data.id,
    userId: userId,
    talentId: booking.talentId,
    purpose: booking.purpose,
    type: booking.type,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    total: booking.total,
    paymentStatus: booking.paymentStatus,
    approvalStatus: booking.approvalStatus,
    paymentCode: booking.paymentCode,
    createdAt: data.created_at || createdAt,
    userName: userName,
    userPhoto: userPhoto,
    talentName: booking.talentName,
    talentPhoto: booking.talentPhoto,
  };

  await fetchBookingsFromSupabase();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }

  return newBooking;
}

// USER PAYMENT SUBMIT (Dilengkapi Upload Foto ke Supabase Storage Bucket 'payment-proofs')
export async function updateBookingPayment(
  id: string,
  data: {
    paymentMethod: "qris" | "bca" | "bri" | "mandiri";
    paymentCode: string;
    paymentProof?: string; 
    transferAmount?: number;
    transferTime: string;
  }
): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target) return undefined;

  let uploadedProofUrl = data.paymentProof;

  if (data.paymentProof && data.paymentProof.startsWith("data:")) {
    try {
      const res = await fetch(data.paymentProof);
      const blob = await res.blob();
      const fileName = `proof_${id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, blob, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          uploadedProofUrl = publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn("Gagal upload ke storage, menggunakan fallback string:", err);
    }
  }

  const updatePayload = {
    payment_method: data.paymentMethod,
    payment_code: data.paymentCode,
    payment_proof: uploadedProofUrl,
    transfer_amount: data.transferAmount || target.total,
    transfer_time: data.transferTime,
    payment_status: "paid",
    approval_status: "pending_approval",
  };

  const { error } = await supabase
    .from("bookings")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Gagal update pembayaran di Supabase:", error);
    return undefined;
  }

  target.paymentMethod = data.paymentMethod;
  target.paymentCode = data.paymentCode;
  target.paymentProof = uploadedProofUrl;
  target.transferAmount = data.transferAmount || target.total;
  target.transferTime = data.transferTime;
  target.paymentStatus = "paid";
  target.approvalStatus = "pending_approval";

  await fetchBookingsFromSupabase();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }

  return cachedBookings.find(b => b.id === id) || target;
}

// FUNGSI MENDAPATKAN USER / MITRA YANG LOGIN SECARA SINKRON
export function getCurrentUserOrMitra() {
  const isMitraAuthenticated = localStorage.getItem("mitraAuthenticated");
  const currentMitra = getCurrentMitra();
  const isMitraRoute = typeof window !== "undefined" && window.location.pathname.startsWith('/mitra');

  const userData = localStorage.getItem("rentmate_current_user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return {
        type: "user",
        data: {
          ...user,
          id: user.id || user.user_id || user.username,
          name: user.name || "Ziaa",
        },
      };
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }

  if (isMitraAuthenticated && currentMitra && isMitraRoute) {
    return { type: "mitra", data: currentMitra };
  }

  if (isMitraAuthenticated && currentMitra) {
    return { type: "mitra", data: currentMitra };
  }

  return null;
}

// UPDATE BOOKING APPROVAL (Admin / Mitra menyetujui - Diperbaiki agar tidak error)
export async function updateBookingApproval(
  id: string,
  status: "approved" | "rejected"
): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target) return undefined;

  // Hanya update approval_status di database agar aman dari error kolom yang belum ada
  const { error } = await supabase
    .from("bookings")
    .update({
      approval_status: status,
    })
    .eq("id", id);

  if (error) {
    console.error("Gagal update approval di Supabase:", error);
    alert("Gagal memperbarui status: " + error.message);
    return undefined;
  }

  target.approvalStatus = status;

  await fetchBookingsFromSupabase();
  const refreshedBooking = cachedBookings.find(b => b.id === id) || target;

  if (status === "approved") {
    getOrCreateChatSession(refreshedBooking);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("bookingApproved", {
          detail: { booking: refreshedBooking, timestamp: new Date().toISOString() },
        })
      );
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }

  return refreshedBooking;
}

// MARK AS COMPLETED
export async function markBookingAsCompleted(id: string): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target || target.approvalStatus !== "approved") return undefined;

  const { error } = await supabase
    .from("bookings")
    .update({ approval_status: "completed" })
    .eq("id", id);

  if (error) {
    console.error("Gagal menyelesaikan booking di Supabase:", error);
    return undefined;
  }

  target.approvalStatus = "completed";

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("bookingCompleted", {
        detail: { booking: target, timestamp: new Date().toISOString() },
      })
    );
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }

  return target;
}

// GETTERS PENDUKUNG LAINNYA
export function getPendingBookings(): SharedBooking[] {
  return cachedBookings.filter(
    b => b.paymentStatus === "paid" && b.approvalStatus === "pending_approval"
  );
}

export function getActiveBookingByTalent(talentId: string): SharedBooking | undefined {
  const now = new Date();
  return cachedBookings.find(b => {
    if (b.talentId !== talentId || b.approvalStatus !== "approved") return false;
    const t = new Date(`${b.date}T${b.time}`);
    return t > now;
  });
}

export function subscribeToBookings(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("bookingsUpdated", cb);
  
  const interval = setInterval(async () => {
    await fetchBookingsFromSupabase();
    cb();
  }, 10000);

  return () => {
    window.removeEventListener("bookingsUpdated", cb);
    clearInterval(interval);
  };
}

export async function updateBookingRating(
  id: string,
  rating: number,
  comment?: string
): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target) return undefined;

  const { error } = await supabase
    .from("bookings")
    .update({
      rating,
      rating_comment: comment,
    })
    .eq("id", id);

  if (error) return undefined;

  target.rating = rating;
  target.ratingComment = comment;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }

  return target;
}

export function calculateMitraEarnings(mitraId: string, isTalentMode: boolean = true): number {
  const commissionPercentage = getAppCommission();
  const mitraBookings = cachedBookings.filter(booking => 
    booking.talentId === mitraId
  );

  const completedBookings = mitraBookings.filter(b => b.approvalStatus === "completed");

  return completedBookings.reduce((sum, booking) => {
    const totalAmount = booking.total || 0;
    const mitraAmount = Math.round(totalAmount * ((100 - commissionPercentage) / 100));
    return sum + mitraAmount;
  }, 0);
}

export function subscribeToCompletedBookings(mitraId: string, callback: () => void, isTalentMode: boolean = true): () => void {
  if (!isBrowser()) return () => {};
  const handleUpdate = () => callback();
  window.addEventListener("bookingsUpdated", handleUpdate);
  return () => window.removeEventListener("bookingsUpdated", handleUpdate);
}

export function checkAndUpdateCompletedBookings(): void {}

export function getBookingByUserAndTalent(userId: string, talentId: string): SharedBooking | undefined {
  return cachedBookings.find(b => b.userId === userId && b.talentId === talentId);
}

export function getBookingsByUser(userId: string): SharedBooking[] {
  return cachedBookings.filter(b => b.userId === userId);
}

export function getMitraBookings(mitraId: string): SharedBooking[] {
  return cachedBookings.filter(b => b.talentId === mitraId);
}

export function getCompletedBookings(): SharedBooking[] {
  return cachedBookings.filter(b => b.approvalStatus === "completed");
}

export function getActiveBookings(): SharedBooking[] {
  const now = new Date();
  return cachedBookings.filter(b => {
    if (b.approvalStatus !== "approved") return false;
    const startTime = new Date(`${b.date}T${b.time}`);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + b.duration);
    return startTime <= now && now < endTime;
  });
}

export function getPendingPaymentBookings(): SharedBooking[] {
  return cachedBookings.filter(b => b.paymentStatus === "pending");
}

export function getPendingApprovalBookings(): SharedBooking[] {
  return cachedBookings.filter(b => b.approvalStatus === "pending_approval");
}

export async function deleteBooking(id: string): Promise<boolean> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return false;

  cachedBookings = cachedBookings.filter(b => b.id !== id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }
  return true;
}

export async function updateBooking(id: string, data: Partial<SharedBooking>): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target) return undefined;

  const { error } = await supabase.from("bookings").update(data).eq("id", id);
  if (error) return undefined;

  Object.assign(target, data);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }
  return target;
}

export function isTimeSlotBooked(talentId: string, date: string, time: string, duration: number, excludeBookingId?: string): boolean {
  return cachedBookings.some(booking => {
    if (booking.id === excludeBookingId) return false;
    if (booking.talentId !== talentId) return false;
    if (booking.approvalStatus !== "approved") return false;
    if (booking.date !== date) return false;

    const bookingStartTime = new Date(`${date}T${booking.time}`);
    const bookingEndTime = new Date(bookingStartTime);
    bookingEndTime.setHours(bookingEndTime.getHours() + booking.duration);

    const newStartTime = new Date(`${date}T${time}`);
    const newEndTime = new Date(newStartTime);
    newEndTime.setHours(newEndTime.getHours() + duration);

    return (
      (newStartTime >= bookingStartTime && newStartTime < bookingEndTime) ||
      (newEndTime > bookingStartTime && newEndTime <= bookingEndTime) ||
      (newStartTime <= bookingStartTime && newEndTime >= bookingEndTime)
    );
  });
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}