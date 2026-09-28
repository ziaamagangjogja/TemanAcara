// src/lib/bookingStore.ts


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
  approvalStatus: "pending_approval" | "pending_mitra" | "approved" | "rejected" | "completed";

  paymentMethod?: "qris" | "bca" | "bri" | "mandiri" | "saldo";
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
  adminMessage?: string;

  // OPTIONAL: helper fields from app context (not from Supabase)
  talentName?: string;
  talentPhoto?: string;
  userName?: string;
  userPhoto?: string;
  bookerType?: "user" | "mitra";
}

// In-memory cache atau fallback sementara jika offline, tapi utama lewat Supabase
let cachedBookings: SharedBooking[] = [];

function normalizeBookingDate(value: unknown): string {
  const rawValue = String(value || "");
  if (!rawValue.includes("T")) return rawValue.slice(0, 10);

  const date = new Date(rawValue);
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"));
  return parts.join("-");
}

// Fungsi untuk sinkronisasi data dari tabel "bookings" di Supabase
// Join ke tabel users dan mitra_accounts agar userName & talentName selalu terisi
async function fetchBookingsFromSupabase(): Promise<SharedBooking[]> {
  try {
    const response = await fetch('/api/bookings');
    if (!response.ok) {
      console.error("Gagal mengambil data booking dari API");
      return cachedBookings;
    }
    const data = await response.json();

    if (!data || data.length === 0) {
      cachedBookings = [];
      return cachedBookings;
    }

    const userIds = [...new Set(data.map((b: any) => b.user_id).filter(Boolean))] as string[];
    const talentIds = [...new Set(data.map((b: any) => b.talent_id).filter(Boolean))];

    // Fetch data talent/mitra lebih dulu (batch). Ini penting agar kita tahu ID
    // mana yang merupakan mitra — ID mitra TIDAK boleh dicari ke /api/users.
    const talentMap: Record<string, { name: string; photo: string }> = {};
    if (talentIds.length > 0 || userIds.length > 0) {
      const talentsRes = await fetch('/api/talents');
      if (talentsRes.ok) {
        const talents = await talentsRes.json();
        talents.forEach((t: any) => {
          talentMap[t.user_id] = { name: t.full_name || "Talent", photo: t.photo || "" };
        });
      }
    }

    // Fetch data user (batch) HANYA untuk id yang BUKAN mitra.
    // Mencegah 404 berulang saat user_id berisi ID mitra (mitra memesan mitra).
    const userMap: Record<string, { name: string; photo: string }> = {};
    const unknownIds = userIds.filter((id) => !talentMap[id]);
    if (unknownIds.length > 0) {
      const usersPromises = unknownIds.map(id => fetch(`/api/users/id/${encodeURIComponent(id)}`).then(r => r.ok ? r.json() : null));
      const users = await Promise.all(usersPromises);
      if (users) {
        users.forEach((u: any) => {
      if(u) userMap[u.id] = { name: u.name || u.username || "User", photo: u.photo || "" };
        });
      }
    }

    cachedBookings = data.map((item: any) => {
      // Prioritaskan: data live dari API user → user_name dari DB (jika bukan "User") → user_name DB → fallback "User"
      const liveUserName = userMap[item.user_id]?.name;
      const dbUserName = item.user_name;
      const finalUserName = (liveUserName && liveUserName !== "User")
        ? liveUserName
        : (dbUserName && dbUserName !== "User" ? dbUserName : (liveUserName || dbUserName || "User"));

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
        date: normalizeBookingDate(item.date),
        time: String(item.time || "").slice(0, 8),
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
        rating: item.rating === null || item.rating === undefined ? undefined : Number(item.rating),
        ratingComment: item.rating_comment,
        adminMessage: item.admin_message || item.notes || "",
      };
    });

    void checkAndUpdateCompletedBookings();
    
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

  // PERBAIKAN: Jika yang memesan adalah MITRA (login sebagai mitra), ambil identitas
  // dari sesi mitra. Sebelumnya hanya sesi user biasa yang dibaca, sehingga booking
  // mitra tersimpan dengan user_id fallback "user-id" / nama "User" — yang lalu
  // dianggap bentrok jadwal dan membuat pembayaran gagal.
  const mitraSession = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("rentmate_current_mitra") || "null")
    : null;
  const isMitraAuthed = typeof window !== "undefined"
    ? localStorage.getItem("mitraAuthenticated") === "true"
    : false;

  let userId: string;
  let userName: string;
  let userPhoto: string;

  if (isMitraAuthed && mitraSession) {
    userId = mitraSession.talentId || mitraSession.id || mitraSession.user_id || "mitra-id";
    userName = mitraSession.name || mitraSession.user_metadata?.name || mitraSession.full_name || "Mitra";
    userPhoto = mitraSession.photo || booking.userPhoto || "";
  } else {
    // Coba ambil nama dari sesi user - pastikan bukan string kosong
    const rawName = currentUserSession?.name;
    const rawUsername = currentUserSession?.username || currentUsername;
    userId = currentUserSession?.id || currentUserSession?.user_id || currentUsername || "user-id";
    // Nama: pakai name jika ada dan bukan kosong, jika tidak pakai username
    userName = (rawName && rawName.trim()) ? rawName.trim() : (rawUsername || "User");
    userPhoto = currentUserSession?.photo || booking.userPhoto || "";
  }

  // Simpan ke Supabase termasuk kolom user_name yang baru saja kamu buat
  const insertPayload: Record<string, any> = {
    user_id: userId,
    user_name: userName,
    talent_id: booking.talentId,
    purpose: booking.purpose,
    type: booking.type,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    total: booking.total,
    notes: booking.notes || booking.adminMessage || "",
    payment_status: booking.paymentStatus,
    approval_status: booking.approvalStatus,
    payment_code: booking.paymentCode || "",
    created_at: createdAt,
  };

  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(insertPayload)
  });

  if (!response.ok) {
    console.error("Gagal menambah booking ke API");
    throw new Error("Gagal membuat draft pemesanan");
  }
  const data = await response.json();

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
    notes: booking.notes || booking.adminMessage || "",
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
    paymentMethod: "qris" | "bca" | "bri" | "mandiri" | "saldo";
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

      const formData = new FormData();
      formData.append('file', blob, fileName);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        uploadedProofUrl = uploadData.url;
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

  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });

  if (!response.ok) {
    console.error("Gagal update pembayaran di API");
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
      const username = localStorage.getItem("rentmate_current_username") || user.username || "";
      // Gunakan name jika tidak kosong, fallback ke username
      const resolvedName = (user.name && user.name.trim()) ? user.name.trim() : username;
      return {
        type: "user",
        data: {
          ...user,
          id: user.id || user.user_id || user.username,
          name: resolvedName || "User",
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

export async function updateBookingApproval(
  id: string,
  status: "approved" | "rejected" | "pending_mitra"
): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target) return undefined;

  // REFUND LOGIC: Jika ditolak dan bayar pakai saldo, kembalikan saldonya
  if (status === "rejected" && target.paymentMethod === "saldo" && target.paymentStatus === "paid") {
    try {
      const userRes = await fetch(`/api/users/id/${target.userId}`);
      if (userRes.ok) {
        const user = await userRes.json();
        const newWallet = Number(user.wallet || 0) + Number(target.total || 0);
        await fetch(`/api/users/${user.username}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: newWallet })
        });
        
        // Peringatan ke user jika ini sedang login sebagai user tersebut
        const currentUserStr = localStorage.getItem("rentmate_current_username");
        if (currentUserStr === user.username) {
          window.dispatchEvent(new CustomEvent("userUpdated"));
        }
      }
    } catch (e) {
      console.error("Gagal melakukan refund saldo dompet:", e);
    }
  }

  // Hanya update approval_status di database agar aman dari error kolom yang belum ada
  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_status: status })
  });

  if (!response.ok) {
    console.error("Gagal update approval di API");
    alert("Gagal memperbarui status");
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

  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_status: "completed" })
  });

  if (!response.ok) {
    console.error("Gagal menyelesaikan booking di API");
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
  }, 3000);

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

  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, rating_comment: comment })
  });

  if (!response.ok) return undefined;

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
    isTalentMode ? booking.talentId === mitraId : booking.userId === mitraId
  );

  const completedBookings = mitraBookings.filter(isBookingCompleted);

  return completedBookings.reduce((sum, booking) => {
    const totalAmount = booking.total || 0;
    const mitraAmount = Math.round(totalAmount * ((100 - commissionPercentage) / 100));
    return sum + mitraAmount;
  }, 0);
}

export function calculateMitraRating(mitraId: string): number {
  // Gunakan semua booking yang punya rating > 0, tidak perlu menunggu status "completed"
  // karena jika user sudah memberikan rating, berarti booking memang sudah selesai.
  const ratings = cachedBookings
    .filter(booking => booking.talentId === mitraId && typeof booking.rating === "number" && booking.rating > 0)
    .map(booking => Number(booking.rating));

  if (ratings.length === 0) return 0;
  return Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));
}

export function isBookingCompleted(booking: SharedBooking): boolean {
  if (booking.approvalStatus === "completed") return true;
  if (booking.approvalStatus !== "approved") return false;

  const startTime = new Date(`${booking.date}T${booking.time}`);
  if (isNaN(startTime.getTime())) return false;

  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + booking.duration);
  return endTime <= new Date();
}

export function subscribeToCompletedBookings(mitraId: string, callback: () => void, isTalentMode: boolean = true): () => void {
  if (!isBrowser()) return () => {};
  const handleUpdate = () => callback();
  window.addEventListener("bookingsUpdated", handleUpdate);
  return () => window.removeEventListener("bookingsUpdated", handleUpdate);
}

export async function checkAndUpdateCompletedBookings(): Promise<void> {
  const bookingsToComplete = cachedBookings.filter(
    booking => booking.approvalStatus === "approved" && isBookingCompleted(booking)
  );

  if (bookingsToComplete.length === 0) return;

  const results = await Promise.all(
    bookingsToComplete.map(booking =>
      fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: "completed" })
      })
    )
  );

  let changed = false;
  results.forEach((result, index) => {
    if (result.ok) {
      bookingsToComplete[index].approvalStatus = "completed";
      changed = true;
    }
  });

  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }
}

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
  const response = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
  if (!response.ok) return false;

  cachedBookings = cachedBookings.filter(b => b.id !== id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  }
  return true;
}

export async function updateBooking(id: string, data: Partial<SharedBooking>): Promise<SharedBooking | undefined> {
  const target = cachedBookings.find(b => b.id === id);
  if (!target) return undefined;

  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) return undefined;

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
    if (booking.approvalStatus === "rejected") return false;

    // Abaikan booking "hantu"/rusak yang tidak punya waktu valid.
    // Ini mencegah booking lama yang data-nya tidak lengkap memblokir slot.
    if (!booking.date || !booking.time) return false;
    if (!Number(booking.duration)) return false;

    // MySQL dapat mengembalikan DATE sebagai ISO datetime.
    const bookedDate = normalizeBookingDate(booking.date);
    if (bookedDate !== date) return false;

    const bookingStartTime = new Date(`${date}T${String(booking.time).slice(0, 5)}`);
    if (isNaN(bookingStartTime.getTime())) return false;
    const bookingEndTime = new Date(bookingStartTime);
    bookingEndTime.setHours(bookingEndTime.getHours() + booking.duration);

    const newStartTime = new Date(`${date}T${time}`);
    if (isNaN(newStartTime.getTime())) return false;
    const newEndTime = new Date(newStartTime);
    newEndTime.setHours(newEndTime.getHours() + duration);

    return (
      (newStartTime >= bookingStartTime && newStartTime < bookingEndTime) ||
      (newEndTime > bookingStartTime && newEndTime <= bookingEndTime) ||
      (newStartTime <= bookingStartTime && newEndTime >= bookingEndTime)
    );
  });
}

// Cek apakah MITRA PEMESAN (bookerId) sendiri sudah punya jadwal yang bentrok
// pada tanggal & jam tertentu. Dipakai agar mitra tidak memesan mitra lain
// di jam yang bertabrakan dengan jadwal pesanannya sendiri.
// Hanya booking yang valid (bukan rejected) yang dihitung, dan hanya untuk
// booking yang MEMANG dibuat oleh mitra (bookerType === "mitra" atau userId = talentId mitra).
export function isBookerBusy(
  bookerId: string,
  date: string,
  time: string,
  duration: number,
  excludeBookingId?: string,
): boolean {
  if (!bookerId) return false;

  return cachedBookings.some((booking) => {
    if (!booking) return false;
    if (booking.id === excludeBookingId) return false;
    if (booking.approvalStatus === "rejected") return false;

    // Booking ini harus milik mitra pemesan yang sama.
    const bookingOwner =
      booking.userId ||
      (booking as any).user_id ||
      (booking as any).bookerId;
    if (String(bookingOwner) !== String(bookerId)) return false;

    const bookedDate = normalizeBookingDate(booking.date);
    if (bookedDate !== String(date).slice(0, 10)) return false;

    const bookedStart = new Date(`${bookedDate}T${String(booking.time).slice(0, 5)}`);
    if (isNaN(bookedStart.getTime())) return false;
    const bookedEnd = new Date(bookedStart.getTime() + (Number(booking.duration) || 1) * 60 * 60 * 1000);

    const newStart = new Date(`${date}T${time}`);
    if (isNaN(newStart.getTime())) return false;
    const newEnd = new Date(newStart.getTime() + (Number(duration) || 1) * 60 * 60 * 1000);

    // Bentrok jika rentang waktu saling bertabrakan.
    return newStart < bookedEnd && newEnd > bookedStart;
  });
}

export function isTimeSlotInPast(date: string, time: string): boolean {
  const today = new Date();
  const selectedDate = String(date).slice(0, 10);
  const todayDate = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  if (selectedDate !== todayDate) return selectedDate < todayDate;

  const [hour, minute] = String(time).slice(0, 5).split(":").map(Number);
  const slotTime = new Date(today);
  slotTime.setHours(hour, minute, 0, 0);
  return slotTime <= today;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}