// src/types/mitra.ts

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface MitraAccount {
  id: string;
  /** Stable talent identifier used by bookings and talent routes. */
  talentId?: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string; // Tambahkan field alamat
  age?: number; // Tambahkan field umur
  description?: string;
  category?: string;
  price?: number;
  experience_level?: string; // "pemula" | "menengah" | "mahir"
  price_expectation?: string; // "35k-50k" | "50k-85k" | "85k-130k" | ">130k"
  social_media?: string; // Instagram / LinkedIn
  rejection_reason?: string;
  pricing_tier?: string;
  verificationDocuments?: {
    ktp?: string | null;
    kk?: string | null;
    selfie?: string | null;
    sim?: string | null;
  };
  verificationStatus?: "pending" | "approved" | "rejected";
  verificationDeadline?: string;
  verificationEmailSent?: boolean;
  isLegacyTalent?: boolean;
  isVerified?: boolean;
  isOnline?: boolean;
  lastActive?: string;
  createdAt: string;
}

export interface MitraRegistrationData {
  name: string;
  email: string;
  password: string;
  talentId?: string;
  phone?: string;
  address?: string; // Tambahkan field alamat
  age?: number; // Tambahkan field umur
  description?: string;
  category?: string;
  price?: number;
  photo?: string;
  ktp?: string;
  hobbies?: string;
  experience_level?: string;
  price_expectation?: string;
  social_media?: string;
}

// ================= LOGIN =================
export interface MitraLoginData {
  email: string;
  password: string;
}
