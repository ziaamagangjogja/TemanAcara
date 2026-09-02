import { supabase } from "./supabase";

export interface BookingPayload {
  user_id: string;
  talent_id: string;
  purpose: string;
  type: "online" | "offline";
  date: string;
  time: string;
  duration: number;
  total: number;
  user_name?: string;
  user_photo?: string;
  talent_name?: string;
  talent_photo?: string;
  notes?: string;
}

// 1. Membuat booking baru ke Supabase
export async function createBooking(payload: BookingPayload) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...payload,
      payment_status: "pending",
      approval_status: "pending_approval",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 2. Mengirim bukti pembayaran & upload foto ke Supabase Storage 'payment-proofs'
export async function updateBookingPayment(
  bookingId: string,
  paymentData: {
    payment_method: "qris" | "bca" | "bri" | "mandiri";
    payment_code: string;
    payment_proof_file?: File | string; // Bisa file atau string data URL
    transfer_amount?: number;
    transfer_time: string;
  }
) {
  let proofUrl = "";

  // Jika ada file bukti pembayaran yang di-upload
  if (paymentData.payment_proof_file) {
    let fileToUpload: File | Blob = paymentData.payment_proof_file as File;

    // Jika bentuknya string base64 / data URL, ubah dulu jadi Blob agar bisa di-upload ke Supabase
    if (typeof paymentData.payment_proof_file === "string" && paymentData.payment_proof_file.startsWith("data:")) {
      const res = await fetch(paymentData.payment_proof_file);
      fileToUpload = await res.blob();
    }

    const fileName = `proof_${bookingId}_${Date.now()}.png`;

    // Upload ke Storage Bucket 'payment-proofs' yang sudah kita buat
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, fileToUpload, { upsert: true });

    if (uploadError) {
      console.error("Gagal upload file ke storage:", uploadError);
      throw new Error("Gagal mengirim bukti pembayaran ke Supabase.");
    }

    // Ambil URL publik dari foto yang baru di-upload
    const { data: publicUrlData } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(fileName);

    proofUrl = publicUrlData.publicUrl;
  }

  // Update status pemesanan di tabel bookings menjadi 'paid' dan 'pending_approval'
  const { data, error } = await supabase
    .from("bookings")
    .update({
      payment_method: paymentData.payment_method,
      payment_code: paymentData.payment_code,
      payment_proof: proofUrl,
      transfer_amount: paymentData.transfer_amount,
      transfer_time: paymentData.transfer_time,
      payment_status: "paid",
      approval_status: "pending_approval",
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Mengambil daftar booking
export async function getBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}