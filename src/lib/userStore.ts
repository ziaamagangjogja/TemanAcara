import { supabase } from "@/lib/supabase";

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
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "payment" | "booking" | "admin";
}

const STORAGE_KEY = "rentmate_current_username";

// Murni mengambil user yang sedang aktif. TIDAK ADA AKUN DEFAULT!
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const username = localStorage.getItem(STORAGE_KEY);
    if (!username) return null; // Benar-benar kosong jika tidak ada yang login

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !data) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

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
      notifications: [],
    };
  } catch {
    return null;
  }
}

export async function updateCurrentUser(updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const username = localStorage.getItem(STORAGE_KEY);
  if (!username) return null;

  const { error } = await supabase
    .from("users")
    .update({
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
    .eq("username", username);

  if (error) return null;

  window.dispatchEvent(new CustomEvent("userUpdated"));
  return await getCurrentUser();
}

export async function markAllNotificationsRead(): Promise<UserProfile | null> {
  return await getCurrentUser();
}

export function getUnreadNotificationCount(): number {
  return 0;
}

export function subscribeToUser(callback: () => void): () => void {
  window.addEventListener("userUpdated", callback);
  return () => window.removeEventListener("userUpdated", callback);
}