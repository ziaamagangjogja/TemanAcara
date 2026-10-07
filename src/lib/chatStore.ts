// src/lib/chatStore.ts

import { getBookings, refreshBookingsFromSupabase, SharedBooking } from "./bookingStore";
import { talents } from "@/data/mockData";

// Cache foto terbaru dari API agar foto yang sudah diperbarui admin langsung terpakai
let latestTalentPhotoMap: Record<string, string> = {};
async function refreshTalentPhotoMap() {
  try {
    const res = await fetch('/api/talents');
    if (!res.ok) return;
    const data = await res.json();
    data.forEach((t: any) => {
      if (t.user_id && t.photo) latestTalentPhotoMap[t.user_id] = t.photo;
    });
  } catch { /* silent */ }
}
if (typeof window !== 'undefined') void refreshTalentPhotoMap();

export type MessageStatus = "sent" | "delivered" | "read";

// Server MySQL memakai opsi `dateStrings: true`, sehingga kolom DATETIME
// dikembalikan sebagai string tanpa info timezone, contoh: "2026-09-19 06:22:00".
// String tersebut sebenarnya waktu UTC. `new Date("2026-09-19 06:22:00")` di
// browser dianggap waktu LOKAL, sehingga jam tampil meleset (mis. -7 jam untuk WIB).
// Helper ini menormalkan string DB agar di-parse sebagai UTC.
export function parseServerDate(value: string | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const str = String(value).trim();
  // Sudah punya info timezone (ISO dengan Z atau offset) -> biarkan apa adanya.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
  // Format "YYYY-MM-DD HH:mm:ss" (kemungkinan UTC dari MySQL) -> paksa UTC.
  const normalized = str.replace(" ", "T") + "Z";
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date(str) : parsed;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: "user" | "talent" | "mitra-as-booker";
  message: string;
  timestamp: string;
  status: MessageStatus;
  readByUser: boolean;
  readByMitra: boolean;
  readByMitraAsBooker?: boolean;
  readByTalent?: boolean;
  readAt?: string;
  isAutoResponse?: boolean;
}

export interface ChatSession {
  id: string;
  bookingId: string;
  userName: string;
  userPhoto: string;
  userId: string;
  talentId: string;
  talentName: string;
  talentPhoto: string;
  purpose: string;
  duration: number;
  date: string;
  time: string;
  type: "online" | "offline";
  messages: ChatMessage[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  unreadCountForUser?: number;
  unreadCountForMitra?: number;
  unreadCountForMitraAsBooker?: number;
  isUserTyping?: boolean;
  isTalentTyping?: boolean;
}

export function isChatSessionActive(session: ChatSession | null): boolean {
  if (!session) return false;
  try {
    const startStr = `${session.date}T${session.time}`;
    const startTime = new Date(startStr);
    
    // Add duration (hours) + 1 hour padding
    const endTime = new Date(startTime.getTime());
    endTime.setHours(endTime.getHours() + session.duration + 1);
    
    // Compare with current time
    return new Date() <= endTime;
  } catch (e) {
    return true; // fail open if parse error
  }
}

const STORAGE_KEY = "rentmate_chats";
const STORAGE_VERSION_KEY = "rentmate_chats_version";
const CURRENT_VERSION = "v4";

function loadChatsFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    // We are deprecating localStorage for chats because it exceeds quota.
    // Clear existing data to free up space.
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

function persistChatsToStorage(chats: ChatSession[]) {
  // Deprecated: Do not save to localStorage to prevent QuotaExceededError
  // We only rely on in-memory `cachedChats` and Supabase DB
}

let cachedChats: ChatSession[] = loadChatsFromStorage();

function ensureChatsFresh() {
  void fetchChatsFromSupabase();
}

// ============================================================
// 1. Fetch semua chat + pesan dari Supabase
// ============================================================
export async function fetchChatsFromSupabase(): Promise<ChatSession[]> {
  try {
    const response = await fetch('/api/chats');
    if (!response.ok) return cachedChats;
    const { chats: chatRows, messages: messageRows } = await response.json();

    if (!chatRows || chatRows.length === 0) return cachedChats;

    const messagesByChatId: Record<string, any[]> = {};
    if (messageRows) {
      messageRows.forEach((m: any) => {
        if (!messagesByChatId[m.chat_id]) messagesByChatId[m.chat_id] = [];
        messagesByChatId[m.chat_id].push(m);
      });
    }

    // Pastikan bookings ter-load
    let bookings = getBookings();
    if (bookings.length === 0) {
      bookings = await refreshBookingsFromSupabase();
    }

    // Build/update sessions
    chatRows
      .filter((row: any) => {
        const booking = bookings.find((b) => b.id === row.booking_id);
          return booking && (booking.approvalStatus === "approved" || booking.approvalStatus === "completed");
      })
      .forEach((row: any) => {
      const booking = bookings.find((b) => b.id === row.booking_id);
      const talent = talents.find((t) => t.id === row.talent_id);
      const existing = cachedChats.find((s) => s.bookingId === row.booking_id);
      // Gunakan foto terbaru dari API jika tersedia
      const freshTalentPhoto = latestTalentPhotoMap[row.talent_id];

      // Map messages dari DB
      const dbMessages: ChatMessage[] = (messagesByChatId[row.id] || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        senderType: m.sender_type as "user" | "talent" | "mitra-as-booker",
        message: m.message,
        // created_at dari MySQL (UTC, tanpa timezone) -> normalkan agar di-parse UTC.
        timestamp: parseServerDate(m.created_at).toISOString(),
        status: (m.status as MessageStatus) || "sent",
        readByUser: true,
        readByMitra: true,
        readByMitraAsBooker: true,
        isAutoResponse:
          m.is_auto_response === 1 ||
          (m.sender_type === "talent" && m.message.startsWith("Halo! Terima kasih sudah booking untuk ")),
      }));

      // Gabungkan dengan pesan lokal yang belum tersimpan ke DB
      const existingLocal = existing?.messages || [];
      const pendingLocal = existingLocal.filter(
        (lm) => !dbMessages.some((dm) => dm.id === lm.id) &&
          !dbMessages.some(
            (dm) =>
              dm.message === lm.message &&
              dm.senderId === lm.senderId &&
              Math.abs(new Date(dm.timestamp).getTime() - new Date(lm.timestamp).getTime()) < 30000
          )
      );

      const merged = [...dbMessages, ...pendingLocal].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const updatedSession: ChatSession = {
        id: row.booking_id,
        bookingId: row.booking_id,
        userId: row.user_id,
        userName: booking?.userName || "User",
        userPhoto: booking?.userPhoto || "",
        talentId: row.talent_id,
        talentName: talent?.name || booking?.talentName || "Talent",
        talentPhoto: freshTalentPhoto || talent?.photo || booking?.talentPhoto || "",
        purpose: booking?.purpose || "",
        duration: booking?.duration || 1,
        date: booking?.date || "",
        time: booking?.time || "",
        type: booking?.type || "offline",
        messages: merged,
        lastMessage:
          row.last_message ||
          (merged.length > 0 ? merged[merged.length - 1].message : ""),
        lastMessageTime: row.last_message_time
          ? parseServerDate(row.last_message_time).toISOString()
          : merged.length > 0
            ? merged[merged.length - 1].timestamp
            : new Date().toISOString(),
        unreadCount: existing?.unreadCount ?? 0,
        unreadCountForUser: existing?.unreadCountForUser ?? 0,
        unreadCountForMitra: existing?.unreadCountForMitra ?? 0,
      };

      const idx = cachedChats.findIndex((s) => s.bookingId === row.booking_id);
      if (idx !== -1) {
        cachedChats[idx] = updatedSession;
      } else {
        cachedChats.push(updatedSession);
      }
    });

    persistChatsToStorage(cachedChats);
    return cachedChats;
  } catch (err) {
    console.error("fetchChatsFromSupabase error:", err);
    return cachedChats;
  }
}

if (typeof window !== "undefined") {
  void fetchChatsFromSupabase();
}

// ============================================================
// 2. Simpan satu pesan baru ke Supabase
// ============================================================
async function saveMessageToSupabase(
  bookingId: string,
  userId: string,
  talentId: string,
  newMessage: ChatMessage,
  lastMsgText: string,
  lastMsgTime: string
) {
  try {
    // --- Step 1 & 2: Update/Create Chat and Insert Message ---
    const chatRes = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingId,
        user_id: userId,
        talent_id: talentId,
        last_message: lastMsgText,
        last_message_time: lastMsgTime
      })
    });
    if (!chatRes.ok) return;
    const chatData = await chatRes.json();
    const chatId = chatData.id;

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newMessage.id,
        chat_id: chatId,
        sender_id: newMessage.senderId,
        sender_type: newMessage.senderType,
        message: newMessage.message,
        is_auto_response: newMessage.isAutoResponse === true,
        status: newMessage.status,
        created_at: newMessage.timestamp
      })
    });

    // --- Step 3: Refresh cache dan broadcast ---
    await fetchChatsFromSupabase();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chatsUpdated"));
      window.dispatchEvent(new CustomEvent("mitraAsBookerChatsUpdated"));
    }
  } catch (e) {
    console.error("saveMessageToSupabase error:", e);
  }
}

// ============================================================
// 3. getOrCreateChatSession
// ============================================================
export function getOrCreateChatSession(booking: SharedBooking): ChatSession | null {
  if (booking.approvalStatus !== "approved" && booking.approvalStatus !== "completed") return null;

  let session = cachedChats.find((s) => s.bookingId === booking.id);
  if (session) return session;

  const talent = talents.find((t) => t.id === booking.talentId);
  const freshPhoto = latestTalentPhotoMap[booking.talentId];
  const welcomeMessage = `Halo! Terima kasih sudah booking untuk ${booking.purpose}. Yuk kita koordinasi 😊`;
  const now = new Date().toISOString();
  const msgId = crypto.randomUUID();

  session = {
    id: booking.id,
    bookingId: booking.id,
    userId: booking.userId,
    userName: booking.userName || "User",
    userPhoto: booking.userPhoto || "",
    talentId: booking.talentId,
    talentName: talent?.name || booking.talentName || "Talent",
    talentPhoto: freshPhoto || talent?.photo || booking.talentPhoto || "",
    purpose: booking.purpose,
    duration: booking.duration,
    date: booking.date,
    time: booking.time,
    type: booking.type,
    messages: [
      {
        id: msgId,
        senderId: booking.talentId,
        senderType: "talent",
        message: welcomeMessage,
        timestamp: now,
        status: "delivered",
        readByUser: false,
        readByMitra: true,
        readByMitraAsBooker: true,
        isAutoResponse: true,
      },
    ],
    lastMessage: welcomeMessage,
    lastMessageTime: now,
    unreadCount: 1,
    unreadCountForUser: 1,
    unreadCountForMitra: 0,
    unreadCountForMitraAsBooker: 0,
  };

  cachedChats.push(session);
  persistChatsToStorage(cachedChats);

  // Simpan ke Supabase tanpa menunggu booking dari store
  void saveMessageToSupabase(
    booking.id,
    booking.userId,
    booking.talentId,
    session.messages[0],
    welcomeMessage,
    now
  );

  return session;
}

// ============================================================
// 4. getChatSessionByBookingId
// ============================================================
export function getChatSessionByBookingId(bookingId: string): ChatSession | null {
  ensureChatsFresh();
  let session = cachedChats.find((s) => s.bookingId === bookingId);
  if (!session) {
    const booking = getBookings().find((b) => b.id === bookingId);
    if (booking) return getOrCreateChatSession(booking);
  }
  return session || null;
}

// ============================================================
// 5. getChatSessionsForTalent (halaman mitra)
// ============================================================
export function getChatSessionsForTalent(talentId: string): ChatSession[] {
  if (!talentId) return [];
  const bookings = getBookings();

  // Setiap booking approved harus memiliki percakapan, meskipun sesi chat
  // belum pernah dibuka atau belum tersimpan di cache browser.
  bookings
    .filter((booking) =>
      booking.talentId === talentId &&
      (booking.approvalStatus === "approved" || booking.approvalStatus === "completed")
    )
    .forEach((booking) => getOrCreateChatSession(booking));

  return cachedChats.filter((s) =>
    s.talentId === talentId &&
    bookings.some((booking) =>
      booking.id === s.bookingId &&
      (booking.approvalStatus === "approved" || booking.approvalStatus === "completed")
    )
  );
}

export function getChatSessionsForMitraAsBooker(mitraId: string): ChatSession[] {
  if (!mitraId) return [];
  return cachedChats.filter((session) => {
    const booking = getBookings().find(
      (b) => b.userId === mitraId && b.talentId === session.talentId
    );
    return booking !== undefined;
  });
}

// ============================================================
// 6. sendMitraMessage
// ============================================================
export function sendMitraMessage(bookingId: string, message: string) {
  let session = cachedChats.find((s) => s.bookingId === bookingId);
  if (!session) {
    const booking = getBookings().find((b) => b.id === bookingId);
    if (booking) session = getOrCreateChatSession(booking) || undefined;
  }
  if (!session) return null;

  const now = new Date().toISOString();
  const newMsg: ChatMessage = {
    id: crypto.randomUUID(),
    senderId: session.talentId,
    senderType: "talent",
    message,
    timestamp: now,
    status: "sent",
    readByUser: false,
    readByMitra: true,
    readByMitraAsBooker: true,
  };

  session.messages = [...(session.messages || []), newMsg];
  session.lastMessage = message;
  session.lastMessageTime = now;
  session.unreadCountForMitra = 0;
  session.unreadCountForUser = (session.unreadCountForUser || 0) + 1;
  session.unreadCount = session.unreadCountForUser;

  persistChatsToStorage(cachedChats);

  void saveMessageToSupabase(
    bookingId,
    session.userId,
    session.talentId,
    newMsg,
    message,
    now
  );

  return newMsg;
}

// ============================================================
// 7. sendUserMessage
// ============================================================
export function sendUserMessage(
  userId: string,
  message: string,
  bookingId: string,
  senderType?: "user" | "talent" | "mitra-as-booker"
) {
  let session = cachedChats.find((s) => s.bookingId === bookingId);
  if (!session) {
    const booking = getBookings().find((b) => b.id === bookingId);
    if (booking) session = getOrCreateChatSession(booking) || undefined;
  }
  if (!session) return null;

  const finalSenderType = senderType || "user";
  const now = new Date().toISOString();

  const newMsg: ChatMessage = {
    id: crypto.randomUUID(),
    senderId: userId,
    senderType: finalSenderType,
    message,
    timestamp: now,
    status: "sent",
    readByUser: finalSenderType === "user" || finalSenderType === "mitra-as-booker",
    readByMitra: false,
    readByMitraAsBooker: finalSenderType === "mitra-as-booker",
  };

  session.messages = [...(session.messages || []), newMsg];
  session.lastMessage = message;
  session.lastMessageTime = now;
  session.unreadCountForMitra = (session.unreadCountForMitra || 0) + 1;
  session.unreadCount = session.unreadCountForMitra;

  persistChatsToStorage(cachedChats);

  // Broadcast lokal agar pesan yang baru dikirim langsung tampil (optimistic UI),
  // tidak perlu menunggu polling 3 detik.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("chatsUpdated"));
  }

  void saveMessageToSupabase(
    bookingId,
    session.userId,
    session.talentId,
    newMsg,
    message,
    now
  );

  return newMsg;
}

export function sendMitraAsBookerMessage(
  mitraId: string,
  message: string,
  bookingId: string
): ChatMessage | null {
  return sendUserMessage(mitraId, message, bookingId, "mitra-as-booker");
}

// ============================================================
// 8. Mark as read
// ============================================================
export function markMessagesAsReadByMitra(bookingId: string) {
  const session = cachedChats.find((s) => s.bookingId === bookingId);
  if (!session) return;
  session.unreadCountForMitra = 0;
  session.unreadCount = 0;
}

export function markMessagesAsReadByUser(bookingId: string) {
  const session = cachedChats.find((s) => s.bookingId === bookingId);
  if (!session) return;
  session.unreadCountForUser = 0;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("chatsUpdated"));
  }
}

export function setUserTyping(_bookingId: string, _isTyping: boolean) {}
export function setTalentTyping(_bookingId: string, _isTyping: boolean) {}

// ============================================================
// 9. subscribeToChats — realtime + polling
// ============================================================
export function subscribeToChats(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  void fetchChatsFromSupabase().then(callback);

  window.addEventListener("chatsUpdated", callback);

  // Polling ringan untuk pesan masuk dari lawan bicara.
  // Pesan yang kita kirim sendiri tampil instan lewat event "chatsUpdated".
  const interval = setInterval(async () => {
    await fetchChatsFromSupabase();
    callback();
  }, 1500);

  return () => {
    window.removeEventListener("chatsUpdated", callback);
    clearInterval(interval);
  };
}

// ============================================================
// 10. getActiveChatSessions — hanya untuk user yg login
// ============================================================
export function getActiveChatSessions(): ChatSession[] {
  let userId = "";
  if (typeof window !== "undefined") {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("rentmate_current_user") || "null"
      );
      userId = currentUser?.id || currentUser?.user_id || currentUser?.username || "";
    } catch {
      userId = "";
    }
  }

  // Buat session untuk booking yang sudah approved milik user ini
  const approved = getBookings().filter(
    (b) => b.approvalStatus === "approved" && (!userId || b.userId === userId)
  );
  approved.forEach((b) => getOrCreateChatSession(b));

  const userChats = userId
    ? cachedChats.filter((s) => s.userId === userId)
    : cachedChats;

  return userChats.sort(
    (a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );
}

export function getChatSessionsByMitraId(mitraId: string): ChatSession[] {
  if (!mitraId) return [];
  return cachedChats.filter((s) => s.talentId === mitraId);
}