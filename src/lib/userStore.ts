

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  city: string;
  hobbies: string;
  preference: "online" | "offline" | "both";
  photo: string;
  joinDate: string;
  wallet: number;
  notifications?: NotificationItem[];
}

export interface NotificationItem {
  id: string | number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "payment" | "booking" | "admin";
}

function deduplicateRecentNotifications(notifications: NotificationItem[]): NotificationItem[] {
  const deduplicated: NotificationItem[] = [];
  const recentByKey = new Map<string, { index: number; timestamp: number }>();

  for (const notification of notifications) {
    const id = String(notification.id);
    const timestamp = /^\d{13}$/.test(id) ? Number(id) : Number.NaN;
    const key = `${notification.type}\u0000${notification.title}\u0000${notification.message}`;
    const previous = recentByKey.get(key);

    if (Number.isFinite(timestamp) && previous && Math.abs(previous.timestamp - timestamp) <= 10_000) {
      const existing = deduplicated[previous.index];
      deduplicated[previous.index] = { ...existing, read: existing.read && notification.read };
      continue;
    }

    deduplicated.push(notification);
    if (Number.isFinite(timestamp)) {
      recentByKey.set(key, { index: deduplicated.length - 1, timestamp });
    }
  }

  return deduplicated.slice(0, 50);
}

const STORAGE_KEY = "rentmate_current_username";

// ============================================================
// Load notifications from DB (with localStorage fallback/merge)
// ============================================================
async function loadNotificationsForUser(userId: string): Promise<NotificationItem[]> {
  try {
    const res = await fetch(`/api/notifications/${userId}`);
    if (res.ok) {
      const dbNotifs: NotificationItem[] = await res.json();
      // Merge with localStorage (in case some were written locally before DB was available)
      const localKey = `rentmate_notifications_${userId}`;
      let localNotifs: NotificationItem[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) localNotifs = JSON.parse(raw);
      } catch {}
      
      // Get IDs already in DB
      const dbIds = new Set(dbNotifs.map(n => String(n.id)));
      // Filter local-only notifs
      const localOnly = localNotifs.filter(n => !dbIds.has(String(n.id)));
      
      // Persist local-only ones to DB for next time
      for (const notif of localOnly) {
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: String(notif.id), userId, title: notif.title, message: notif.message, type: notif.type })
          });
        } catch {}
      }
      
      // Clear localStorage now that DB is source of truth
      localStorage.removeItem(localKey);
      
      // Return merged, sorted by newest first
      return deduplicateRecentNotifications([...dbNotifs, ...localOnly]);
    }
  } catch (e) {
    console.warn("DB notifications unavailable, using localStorage fallback", e);
  }
  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(`rentmate_notifications_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Murni mengambil user yang sedang aktif. TIDAK ADA AKUN DEFAULT!
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const username = localStorage.getItem(STORAGE_KEY);
    if (!username) return null;

    const response = await fetch(`/api/users/${username}`);
    if (!response.ok) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const data = await response.json();
    
    const notifications = await loadNotificationsForUser(data.id);

    return {
      id: data.id,
      name: data.name || "",
      username: data.username || "",
      email: data.email || "",
      phone: data.phone || "",
      bio: data.bio || "",
      city: data.city || "",
      hobbies: data.hobbies || "",
      preference: data.preference || "both",
      photo: data.photo || "",
      joinDate: data.created_at || new Date().toISOString(),
      wallet: Number(data.wallet) || 0,
      notifications,
    };
  } catch {
    return null;
  }
}

export async function updateCurrentUser(updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const username = localStorage.getItem(STORAGE_KEY);
  if (!username) return null;

  const response = await fetch(`/api/users/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      bio: updates.bio,
      city: updates.city,
      hobbies: updates.hobbies,
      preference: updates.preference,
      photo: updates.photo,
      wallet: updates.wallet,
    })
  });

  if (!response.ok) return null;

  window.dispatchEvent(new CustomEvent("userUpdated"));
  return await getCurrentUser();
}

export async function markAllNotificationsRead(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return user;
  
  try {
    // Mark all read in DB
    const response = await fetch(`/api/notifications/${user.id}/read-all`, { method: 'PUT' });
    if (!response.ok) throw new Error("Gagal memperbarui status notifikasi");
    // Also clear localStorage
    localStorage.removeItem(`rentmate_notifications_${user.id}`);
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    window.dispatchEvent(new CustomEvent("userUpdated"));
  } catch (e) {
    // Fallback localStorage
    const updatedNotifs = (user.notifications || []).map(n => ({ ...n, read: true }));
    localStorage.setItem(`rentmate_notifications_${user.id}`, JSON.stringify(updatedNotifs));
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  }
  
  const updated = user.notifications?.map(n => ({ ...n, read: true })) || [];
  return { ...user, notifications: updated };
}

export async function markNotificationRead(notificationId: string | number): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return user;

  const updatedNotifications = (user.notifications || []).map(notification =>
    String(notification.id) === String(notificationId)
      ? { ...notification, read: true }
      : notification
  );

  try {
    const response = await fetch(
      `/api/notifications/${encodeURIComponent(user.id)}/${encodeURIComponent(String(notificationId))}/read`,
      { method: "PUT" }
    );
    if (!response.ok) throw new Error("Gagal memperbarui status notifikasi");
  } catch {
    localStorage.setItem(`rentmate_notifications_${user.id}`, JSON.stringify(updatedNotifications));
  }

  window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  window.dispatchEvent(new CustomEvent("userUpdated"));
  return { ...user, notifications: updatedNotifications };
}

export function getUnreadNotificationCount(user: UserProfile | null): number {
  if (!user || !user.notifications) return 0;
  return user.notifications.filter(n => !n.read).length;
}

export function subscribeToUser(callback: () => void): () => void {
  window.addEventListener("userUpdated", callback);
  window.addEventListener("notificationsUpdated", callback);
  return () => {
    window.removeEventListener("userUpdated", callback);
    window.removeEventListener("notificationsUpdated", callback);
  };
}