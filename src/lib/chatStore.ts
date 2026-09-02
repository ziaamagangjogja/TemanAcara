// src/lib/chatStore.ts
import { supabase } from "./supabase";
import { getBookings, refreshBookingsFromSupabase, SharedBooking } from "./bookingStore";
import { talents } from "@/data/mockData";

export type MessageStatus = "sent" | "delivered" | "read";

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

const STORAGE_KEY = "rentmate_chats";
const STORAGE_VERSION_KEY = "rentmate_chats_version";
const CURRENT_VERSION = "v3";

function loadChatsFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    // Auto-clear cache if schema version changed
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
      return [];
    }
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persistChatsToStorage(chats: ChatSession[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
  }
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
    const { data: chatRows, error: chatError } = await supabase
      .from("chats")
      .select("*");

    if (chatError) {
      console.error("Error fetching chats:", chatError);
      return cachedChats;
    }
    if (!chatRows || chatRows.length === 0) return cachedChats;

    // Ambil semua pesan sekaligus berdasarkan chat_id
    const chatIds = chatRows.map((row: any) => row.id).filter(Boolean);
    const messagesByChatId: Record<string, any[]> = {};

    if (chatIds.length > 0) {
      const { data: messageRows, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.error("Error fetching messages:", messageError);
      } else if (messageRows) {
        messageRows.forEach((m: any) => {
          if (!messagesByChatId[m.chat_id]) messagesByChatId[m.chat_id] = [];
          messagesByChatId[m.chat_id].push(m);
        });
      }
    }

    // Pastikan bookings ter-load
    let bookings = getBookings();
    if (bookings.length === 0) {
      bookings = await refreshBookingsFromSupabase();
    }

    // Build/update sessions
    chatRows.forEach((row: any) => {
      const booking = bookings.find((b) => b.id === row.booking_id);
      const talent = talents.find((t) => t.id === row.talent_id);
      const existing = cachedChats.find((s) => s.bookingId === row.booking_id);

      // Map messages dari DB
      const dbMessages: ChatMessage[] = (messagesByChatId[row.id] || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        senderType: m.sender_type as "user" | "talent" | "mitra-as-booker",
        message: m.message,
        timestamp: m.created_at,
        status: (m.status as MessageStatus) || "sent",
        readByUser: true,
        readByMitra: true,
        readByMitraAsBooker: true,
        isAutoResponse: false,
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
        talentPhoto: talent?.photo || booking?.talentPhoto || "",
        purpose: booking?.purpose || "",
        duration: booking?.duration || 1,
        date: booking?.date || "",
        time: booking?.time || "",
        type: booking?.type || "offline",
        messages: merged,
        lastMessage:
          row.last_message ||
          (merged.length > 0 ? merged[merged.length - 1].message : ""),
        lastMessageTime:
          row.last_message_time ||
          (merged.length > 0 ? merged[merged.length - 1].timestamp : new Date().toISOString()),
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
    // --- Step 1: Ambil atau buat baris chat ---
    let { data: chatRow } = await supabase
      .from("chats")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!chatRow) {
      const { data: inserted, error: insertErr } = await supabase
        .from("chats")
        .insert({
          booking_id: bookingId,
          user_id: userId,
          talent_id: talentId,
          last_message: lastMsgText,
          last_message_time: lastMsgTime,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error("Error creating chat row:", insertErr);
        return;
      }
      chatRow = inserted;
    } else {
      // Update last_message di baris yang sudah ada
      await supabase
        .from("chats")
        .update({ last_message: lastMsgText, last_message_time: lastMsgTime })
        .eq("id", chatRow.id);
    }

    const chatId = chatRow.id;

    // --- Step 2: Insert pesan ---
    const { error: msgErr } = await supabase.from("messages").insert({
      id: newMessage.id,
      chat_id: chatId,
      sender_id: newMessage.senderId,
      sender_type: newMessage.senderType,
      message: newMessage.message,
      status: newMessage.status,
      created_at: newMessage.timestamp,
    });

    if (msgErr) {
      console.error("Error inserting message:", msgErr);
      return;
    }

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
  if (booking.approvalStatus !== "approved") return null;

  let session = cachedChats.find((s) => s.bookingId === booking.id);
  if (session) return session;

  const talent = talents.find((t) => t.id === booking.talentId);
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
    talentPhoto: talent?.photo || booking.talentPhoto || "",
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
  return cachedChats.filter((s) => s.talentId === talentId);
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

  const channel = supabase
    .channel("public:messages_realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async () => {
        await fetchChatsFromSupabase();
        callback();
      }
    )
    .subscribe();

  const interval = setInterval(async () => {
    await fetchChatsFromSupabase();
    callback();
  }, 3000);

  return () => {
    window.removeEventListener("chatsUpdated", callback);
    supabase.removeChannel(channel);
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