import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uiAvatarUrl(name: string, background?: string, color?: string, size?: number) {
  const params = new URLSearchParams({
    name,
    background: background || "EDE9FE",
    color: color || "3730A3",
    size: String(size || 256),
  });
  return `https://ui-avatars.com/api/?${params.toString()}`;
}

export function dicebearAvatar(name: string, gender?: "Wanita" | "Pria", size?: number) {
  const style = gender === "Wanita" ? "lorelei" : "adventurer";
  const seed = encodeURIComponent(name.replace(/\s+/g, ""));
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}${size ? `&size=${size}` : ""}`;
}

/**
 * Avatar inisial (ui-avatars.com) untuk user tanpa foto. Memakai username/nama
 * sebagai sumber inisial, dengan fallback "User" agar tidak pernah kosong
 * (inisial kosong membuat semua user tampil sama).
 */
export function initialsAvatar(source?: string, size?: number) {
  const raw = (source || "").trim();
  const safeName = raw.length > 0 ? raw : "User";
  return uiAvatarUrl(safeName, "f3f4f6", "6b7280", size || 256);
}


export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}