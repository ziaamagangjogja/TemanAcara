import { supabase } from "@/lib/supabase";

export async function getBookingsByTalentId(talentId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createBooking(payload: {
  user_id: string;
  talent_id: string;
  purpose: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  total: number;
  payment_status?: string;
  approval_status?: string;
  payment_method?: string;
  payment_code?: string;
  payment_proof?: string;
  transfer_amount?: number;
  transfer_time?: string;
}) {
  let finalProofUrl = payload.payment_proof;

  // Upload bukti pembayaran ke Supabase Storage (bucket: payment-proofs)
  if (finalProofUrl && finalProofUrl.startsWith("data:")) {
    try {
      const res = await fetch(finalProofUrl);
      const blob = await res.blob();
      const fileName = `proof_${payload.user_id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      finalProofUrl = publicUrlData.publicUrl;
    } catch (err) {
      console.error("Storage upload error:", err);
      throw new Error("Gagal mengunggah bukti pembayaran ke Storage.");
    }
  }

  // Simpan data ke tabel bookings Supabase
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...payload,
      payment_proof: finalProofUrl,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  return data;
}