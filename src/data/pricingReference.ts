// src/data/pricingReference.ts
// Acuan rentang rekomendasi harga pasar dan panduan layanan Mitra RentMate

import { normalizeMitraActivities } from "@/data/mitraActivities";

export type ServicePriceUnit = "jam" | "acara" | "paket" | "hari";

export interface MarketPriceGuide {
  id: string;
  category: string;
  unit: ServicePriceUnit;
  unitLabel: string;
  minPrice: number;
  maxPrice: number;
  defaultPrice: number;
  description: string;
  durationHint: string;
}

export interface MitraServiceRate {
  id: string;
  category: string;
  price: number;
  unit: ServicePriceUnit;
  unitLabel: string;
  durationHint?: string;
  description?: string;
  isActive?: boolean;
}

export function parseMitraServiceRates(value: unknown): MitraServiceRate[] {
  let rates = value;
  if (typeof rates === "string") {
    try {
      rates = JSON.parse(rates);
    } catch (error) {
      console.error("Gagal membaca data tarif layanan mitra:", error);
      return [];
    }
  }
  if (!Array.isArray(rates)) return [];

  return rates.filter((rate): rate is MitraServiceRate =>
    Boolean(
      rate &&
      typeof rate === "object" &&
      typeof rate.id === "string" &&
      typeof rate.category === "string" &&
      Number.isFinite(Number(rate.price)) &&
      Number(rate.price) > 0
    )
  ).map((rate) => ({ ...rate, price: Number(rate.price) }));
}

/**
 * Acuan rekomendasi harga awal berdasarkan riset pasar RentMate.
 * Berfungsi sebagai panduan acuan, bukan harga wajib yang kaku.
 */
export const MARKET_PRICE_GUIDE: MarketPriceGuide[] = [
  {
    id: "kuliner",
    category: "Nongkrong / Kuliner",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 30000,
    maxPrice: 75000,
    defaultPrice: 50000,
    description: "Teman ngobrol, ngopi di kafe, kulineran, atau jalan santai",
    durationHint: "Fleksibel per jam",
  },
  {
    id: "olahraga",
    category: "Olahraga",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 50000,
    maxPrice: 100000,
    defaultPrice: 75000,
    description: "Partner gym, jogging, badminton, renang, atau workout",
    durationHint: "Dihitung per jam aktivitas",
  },
  {
    id: "nonton",
    category: "Nonton / Aktivitas Santai",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 30000,
    maxPrice: 75000,
    defaultPrice: 50000,
    description: "Teman nonton bioskop, pameran seni, belanja, atau jalan santai di mall",
    durationHint: "Dihitung per jam",
  },
  {
    id: "game-online",
    category: "Main Game Online",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 30000,
    maxPrice: 75000,
    defaultPrice: 50000,
    description: "Bermain game bersama secara online",
    durationHint: "Dihitung per jam",
  },
  {
    id: "musik-karaoke",
    category: "Musik / Karaoke",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 30000,
    maxPrice: 100000,
    defaultPrice: 50000,
    description: "Teman karaoke atau aktivitas musik",
    durationHint: "Dihitung per jam",
  },
  {
    id: "fotografi",
    category: "Fotografi / Videografi",
    unit: "acara",
    unitLabel: "/ sesi",
    minPrice: 50000,
    maxPrice: 300000,
    defaultPrice: 100000,
    description: "Jasa fotografi atau videografi sesuai portofolio",
    durationHint: "Tarif per sesi, disesuaikan dengan kebutuhan",
  },
  {
    id: "online-session",
    category: "Diskusi / Kerja / Belajar Online",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 30000,
    maxPrice: 75000,
    defaultPrice: 50000,
    description: "Sesi diskusi, kerja, belajar, atau ngobrol online",
    durationHint: "Dihitung per jam",
  },
  {
    id: "aktivitas-lainnya",
    category: "Aktivitas Lainnya",
    unit: "jam",
    unitLabel: "/ jam",
    minPrice: 30000,
    maxPrice: 100000,
    defaultPrice: 50000,
    description: "Aktivitas yang disepakati bersama pengguna",
    durationHint: "Dihitung per jam atau sesuai kesepakatan",
  },
  {
    id: "event",
    category: "Event / Acara",
    unit: "acara",
    unitLabel: "/ acara",
    minPrice: 100000,
    maxPrice: 300000,
    defaultPrice: 200000,
    description: "Pendamping kondangan, wisuda, gathering kantor, reuni, atau pesta",
    durationHint: "Tarif flat per sesi acara umum",
  },
  {
    id: "traveling-lokal",
    category: "Traveling Lokal",
    unit: "paket",
    unitLabel: "/ paket (4–8 jam)",
    minPrice: 150000,
    maxPrice: 300000,
    defaultPrice: 200000,
    description: "Eksplorasi destinasi wisata kota, spot foto menarik, atau keliling kuliner lokal",
    durationHint: "Paket setengah hari (durasi 4 s/d 8 jam)",
  },
  {
    id: "traveling-seharian",
    category: "Traveling Seharian",
    unit: "hari",
    unitLabel: "/ hari (maks. 8 jam)",
    minPrice: 200000,
    maxPrice: 350000,
    defaultPrice: 250000,
    description: "Jalan-jalan atau tur luar kota seharian. Maksimal 8 jam layanan aktif per hari",
    durationHint: "Maksimal 8 jam per hari aktif (bukan 24 jam non-stop)",
  },
];

/**
 * Teks klausul biaya tambahan yang harus selalu disepakati pengguna & mitra.
 */
export const EXTRA_EXPENSES_DISCLAIMER =
  "Biaya makan, tiket masuk (bioskop/wisata), transportasi, akomodasi/penginapan, dan pengeluaran aktivitas lainnya tidak otomatis termasuk dalam honor jasa mitra dan wajib disepakati bersama sebelum pesanan dikonfirmasi.";

/**
 * Mencari panduan harga acuan berdasarkan kategori atau tujuan pemesanan.
 */
export function findPriceGuide(categoryOrPurpose: string): MarketPriceGuide | undefined {
  if (!categoryOrPurpose) return undefined;
  const lower = categoryOrPurpose.toLowerCase();

  if (lower.includes("nongkrong") || lower.includes("kuliner") || lower.includes("makan") || lower.includes("kafe") || lower.includes("kopi")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "kuliner");
  }
  if (lower.includes("olahraga") || lower.includes("gym") || lower.includes("renang") || lower.includes("badminton") || lower.includes("yoga")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "olahraga");
  }
  if (lower.includes("game")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "game-online");
  }
  if (lower.includes("nonton") || lower.includes("film") || lower.includes("bioskop") || lower.includes("belanja") || lower.includes("santai")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "nonton");
  }
  if (lower.includes("event") || lower.includes("acara") || lower.includes("kondangan") || lower.includes("wisuda") || lower.includes("pesta")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "event");
  }
  if (lower.includes("seharian") || lower.includes("hari") || lower.includes("day")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "traveling-seharian");
  }
  if (lower.includes("travel") || lower.includes("liburan") || lower.includes("tour") || lower.includes("wisata") || lower.includes("paket")) {
    return MARKET_PRICE_GUIDE.find((g) => g.id === "traveling-lokal");
  }

  return undefined;
}

/**
 * Menghitung total biaya pemesanan berdasarkan tarif satuan, jenis satuan, dan kuantitas/durasi.
 */
export function calculateServiceTotal(rate: number, unit: ServicePriceUnit, quantity: number): number {
  const q = Math.max(1, quantity || 1);
  return rate * q;
}

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Menghasilkan daftar layanan bawaan mitra dari profil & kategorinya.
 */
export function getDefaultServicesForTalent(talent: any): MitraServiceRate[] {
  if (!talent) return [];

  const savedRates = parseMitraServiceRates(talent.services || talent.service_rates);
  const activityValue = talent.supportedActivities ?? talent.supported_activities;
  const supportedActivities = activityValue == null
    ? null
    : new Set<string>(normalizeMitraActivities(activityValue));
  if (savedRates.length > 0) {
    if (!supportedActivities) return savedRates;

    const activityByService: Record<string, string[]> = {
      kuliner: ["nongkrong", "kuliner", "ngopi"],
      "online-session": ["online-chat", "kerja-belajar"],
      "game-online": ["gaming"],
      olahraga: ["olahraga"],
      nonton: ["nonton", "belanja"],
      event: ["event", "musik"],
      "traveling-lokal": ["traveling", "hiking"],
      "traveling-seharian": ["traveling", "hiking"],
      fotografi: ["fotografi"],
      "musik-karaoke": ["musik"],
      "aktivitas-lainnya": ["lainnya"],
    };

    return savedRates.filter((rate) => {
      const activities = activityByService[rate.id];
      return !activities || activities.some((activity) => supportedActivities.has(activity));
    });
  }

  if (supportedActivities) {
    const rates = new Map<string, MitraServiceRate>();
    const addRate = (
      id: string,
      category: string,
      price: number,
      unit: ServicePriceUnit,
      unitLabel: string,
      description: string,
    ) => {
      rates.set(id, {
        id,
        category,
        price,
        unit,
        unitLabel,
        description,
        isActive: true,
      });
    };

    for (const activity of supportedActivities) {
      if (["nongkrong", "kuliner", "ngopi"].includes(activity)) {
        addRate("kuliner", "Nongkrong / Kuliner", 50000, "jam", "/ jam", "Teman ngobrol, ngopi, atau kulineran");
      } else if (activity === "traveling" || activity === "hiking") {
        addRate("traveling-lokal", "Traveling / Hiking Lokal", 200000, "paket", "/ paket (4–8 jam)", "Pendamping perjalanan atau kegiatan hiking lokal");
      } else if (activity === "event") {
        addRate("event", "Event / Acara", 200000, "acara", "/ acara", "Pendamping kegiatan wisuda, kondangan, atau acara lainnya");
      } else if (activity === "olahraga") {
        addRate("olahraga", "Olahraga Bareng", 75000, "jam", "/ jam", "Partner olahraga sesuai keahlian mitra");
      } else if (activity === "nonton" || activity === "belanja") {
        addRate("nonton", "Nonton / Aktivitas Santai", 50000, "jam", "/ jam", "Teman nonton, belanja, atau aktivitas santai");
      } else if (activity === "musik") {
        addRate("musik-karaoke", "Musik / Karaoke", 50000, "jam", "/ jam", "Teman karaoke atau aktivitas musik");
      } else if (activity === "gaming") {
        addRate("game-online", "Main Game Online", 50000, "jam", "/ jam", "Bermain game bersama secara online");
      } else if (activity === "fotografi") {
        addRate("fotografi", "Fotografi / Videografi", 100000, "acara", "/ sesi", "Jasa fotografi atau videografi sesuai portofolio");
      } else if (activity === "kerja-belajar" || activity === "online-chat") {
        addRate("online-session", "Diskusi / Kerja / Belajar", 50000, "jam", "/ jam", "Sesi diskusi, kerja, atau belajar bersama");
      } else if (activity === "lainnya") {
        addRate("aktivitas-lainnya", "Aktivitas Lainnya", 50000, "jam", "/ jam", "Aktivitas sesuai kesepakatan dengan pengguna");
      }
    }

    // Jika aktivitas kosong / tidak dikenali, lanjut ke fallback
    // berbasis keahlian agar daftar tarif tetap terisi.
    if (rates.size > 0) return [...rates.values()];
  }

  const basePrice = Number(talent.price || talent.pricePerHour || 50000);
  const skillsText = [
    ...(Array.isArray(talent.skills) ? talent.skills : []),
    ...(Array.isArray(talent.specialistSkills) ? talent.specialistSkills : []),
    talent.category || "",
    talent.hobbies || "",
    talent.bio || "",
  ].join(" ").toLowerCase();

  const services: MitraServiceRate[] = [];

  // 1. Nongkrong / Kuliner (selalu tersedia sebagai layanan sosial dasar)
  const kulinerPrice = basePrice >= 30000 && basePrice <= 120000 ? Math.min(basePrice, 75000) : 50000;
  services.push({
    id: "kuliner",
    category: "Nongkrong / Kuliner",
    price: kulinerPrice,
    unit: "jam",
    unitLabel: "/ jam",
    durationHint: "Dihitung per jam",
    description: "Teman ngobrol, ngopi di kafe, dan kulineran santai",
    isActive: true,
  });

  services.push({
    id: "online-session",
    category: "Aktivitas Online (Diskusi / Nonton / Karaoke)",
    price: Math.max(30000, Math.min(basePrice, 75000)),
    unit: "jam",
    unitLabel: "/ jam",
    durationHint: "Dihitung per jam",
    description: "Sesi aktivitas bersama secara online",
    isActive: true,
  });

  if (skillsText.includes("game")) {
    services.push({
      id: "game-online",
      category: "Main Game Online",
      price: Math.max(30000, Math.min(basePrice, 75000)),
      unit: "jam",
      unitLabel: "/ jam",
      durationHint: "Dihitung per jam",
      description: "Bermain game bersama secara online",
      isActive: true,
    });
  }

  // 2. Olahraga (jika memiliki keahlian olahraga)
  if (skillsText.includes("olahraga") || skillsText.includes("gym") || skillsText.includes("renang") || skillsText.includes("badminton") || skillsText.includes("yoga")) {
    services.push({
      id: "olahraga",
      category: "Olahraga Bareng",
      price: Math.max(50000, Math.min(basePrice, 100000)),
      unit: "jam",
      unitLabel: "/ jam",
      durationHint: "Dihitung per jam aktivitas",
      description: "Partner gym, jogging, badminton, atau olahraga lainnya",
      isActive: true,
    });
  }

  // 3. Nonton Film & Santai
  if (skillsText.includes("nonton") || skillsText.includes("film") || skillsText.includes("belanja") || skillsText.includes("karaoke")) {
    services.push({
      id: "nonton",
      category: "Nonton / Aktivitas Santai",
      price: Math.max(30000, Math.min(basePrice, 75000)),
      unit: "jam",
      unitLabel: "/ jam",
      durationHint: "Dihitung per jam",
      description: "Teman nonton bioskop, karaoke, belanja, atau jalan santai",
      isActive: true,
    });
  }

  // 4. Event / Acara (jika ada indikasi event/sosial)
  services.push({
    id: "event",
    category: "Event / Acara",
    price: Math.max(100000, Math.min(basePrice * 3, 300000)),
    unit: "acara",
    unitLabel: "/ acara",
    durationHint: "Tarif flat per acara",
    description: "Partner pendamping kondangan, wisuda, gathering, atau reuni",
    isActive: true,
  });

  // 5. Traveling Lokal (paket 4-8 jam)
  if (skillsText.includes("travel") || skillsText.includes("hiking") || skillsText.includes("jalan") || skillsText.includes("wisata") || skillsText.includes("tour")) {
    services.push({
      id: "traveling-lokal",
      category: "Traveling Lokal (Paket)",
      price: Math.max(150000, Math.min(basePrice * 4, 300000)),
      unit: "paket",
      unitLabel: "/ paket (4–8 jam)",
      durationHint: "Paket setengah hari (4–8 jam)",
      description: "Keliling wisata kota, hunting spot foto & kuliner lokal",
      isActive: true,
    });

    services.push({
      id: "traveling-seharian",
      category: "Traveling Seharian",
      price: Math.max(200000, Math.min(basePrice * 6, 350000)),
      unit: "hari",
      unitLabel: "/ hari (maks. 8 jam)",
      durationHint: "Maksimal 8 jam layanan/hari aktif",
      description: "Perjalanan seharian / tur luar kota (maksimal 8 jam aktif)",
      isActive: true,
    });
  }

  return services;
}

/**
 * Mendapatkan tarif terendah ("Mulai dari") beserta satuan layanannya agar tampilan profil
 * dan kartu talent konsisten dengan daftar layanan yang tersedia.
 */
export function getStartingPriceForTalent(talent: any): { price: number; unitLabel: string } {
  if (!talent) return { price: 50000, unitLabel: "/ jam" };

  const services = getDefaultServicesForTalent(talent);
  if (services && services.length > 0) {
    // Prioritaskan harga per jam terendah (karena standar 'mulai dari' di industri adalah tarif per jam terkecil)
    const hourlyServices = services.filter((s) => s.unit === "jam");
    if (hourlyServices.length > 0) {
      const minHourly = hourlyServices.reduce((min, s) => (s.price < min.price ? s : min), hourlyServices[0]);
      return { price: minHourly.price, unitLabel: minHourly.unitLabel };
    }
    const minService = services.reduce((min, s) => (s.price < min.price ? s : min), services[0]);
    return { price: minService.price, unitLabel: minService.unitLabel };
  }

  const fallback = Number(talent.price || talent.pricePerHour || 50000);
  return { price: fallback, unitLabel: "/ jam" };
}
