export const MITRA_ACTIVITIES = [
  { id: "nongkrong", label: "Nongkrong / Ngobrol" },
  { id: "traveling", label: "Traveling / Liburan" },
  { id: "hiking", label: "Hiking" },
  { id: "event", label: "Acara / Event" },
  { id: "olahraga", label: "Olahraga" },
  { id: "kuliner", label: "Kuliner / Makan" },
  { id: "nonton", label: "Nonton Film" },
  { id: "belanja", label: "Belanja" },
  { id: "musik", label: "Musik / Karaoke" },
  { id: "gaming", label: "Gaming" },
  { id: "fotografi", label: "Fotografi" },
  { id: "kerja-belajar", label: "Kerja / Belajar" },
  { id: "ngopi", label: "Ngafe" },
  { id: "online-chat", label: "Ngobrol Online" },
  { id: "lainnya", label: "Aktivitas Lainnya" },
] as const;

export type MitraActivityId = (typeof MITRA_ACTIVITIES)[number]["id"];

const VALID_ACTIVITY_IDS = new Set<string>(MITRA_ACTIVITIES.map(({ id }) => id));

export const BOOKING_PURPOSE_ACTIVITIES: Record<string, MitraActivityId[]> = {
  "Nongkrong / Ngobrol": ["nongkrong", "ngopi", "online-chat"],
  "Dinner / Makan Malam": ["kuliner", "ngopi", "nongkrong"],
  "Traveling / Liburan": ["traveling"],
  "Hiking": ["hiking"],
  "Event / Acara": ["event", "nongkrong", "ngopi", "kuliner", "musik", "fotografi", "gaming", "belanja", "nonton", "olahraga", "traveling", "hiking"],
  "Event / Wisuda atau Kelulusan": ["event", "nongkrong", "ngopi", "kuliner", "fotografi", "belanja"],
  "Event / Pernikahan atau Kondangan": ["event", "nongkrong", "ngopi", "kuliner", "fotografi", "musik", "belanja"],
  "Event / Ulang Tahun": ["event", "nongkrong", "ngopi", "kuliner", "fotografi", "musik", "gaming"],
  "Event / Seminar atau Konferensi": ["event", "kerja-belajar", "nongkrong", "ngopi"],
  "Event / Gathering atau Reuni": ["event", "nongkrong", "ngopi", "kuliner", "musik", "gaming"],
  "Event / Konser atau Festival": ["event", "musik", "nongkrong"],
  "Event / Acara Kantor": ["event", "kerja-belajar", "nongkrong", "ngopi", "kuliner"],
  "Event / Acara Lainnya": ["event", "nongkrong", "ngopi", "kuliner", "musik", "fotografi", "gaming", "belanja", "nonton", "olahraga", "traveling", "hiking"],
  "Nonton Film": ["nonton"],
  "Belanja": ["belanja"],
  "Olahraga Bareng": ["olahraga"],
  "Kerja / Meeting": ["kerja-belajar"],
  "Pesta / Party": ["event", "musik"],
  "Jasa Fotografi": ["fotografi"],
  "Lainnya": ["lainnya"],
  "Main Game Online": ["gaming"],
  "Nonton Bareng Online": ["nonton"],
  "Karaoke Online": ["musik"],
  "Belajar / Diskusi": ["kerja-belajar", "online-chat"],
};

export function normalizeMitraActivities(value: unknown): MitraActivityId[] {
  let activities: unknown = value;
  if (typeof activities === "string") {
    try {
      activities = JSON.parse(activities);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(activities)) return [];
  return [...new Set(activities.filter(
    (activity): activity is MitraActivityId =>
      typeof activity === "string" && VALID_ACTIVITY_IDS.has(activity),
  ))];
}

function legacyText(value: unknown): string {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(" ");
  if (typeof value !== "string") return "";
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string").join(" ");
    }
  } catch {
    // Older profiles may store comma-separated interests.
  }
  return value;
}

const LEGACY_ACTIVITY_KEYWORDS: Record<MitraActivityId, string[]> = {
  nongkrong: ["nongkrong", "ngobrol", "teman ngobrol", "teman sosial"],
  traveling: ["traveling", "travelling", "travel", "liburan", "wisata", "tour guide", "pemandu", "jalan jalan", "trip"],
  hiking: ["hiking", "mendaki", "pendakian", "naik gunung"],
  event: ["event", "acara", "kondangan", "wisuda", "pernikahan", "wedding", "ulang tahun", "seminar", "konferensi", "gathering", "reuni", "konser", "festival", "pesta", "party", "mc", "host acara"],
  olahraga: ["olahraga", "gym", "fitness", "yoga", "renang", "basket", "badminton", "sepak bola", "lari", "workout", "pelatih"],
  kuliner: ["kuliner", "makan", "memasak", "masak", "cooking", "chef", "barista", "food"],
  nonton: ["nonton", "film", "bioskop", "movie", "cinema", "series", "drakor"],
  belanja: ["belanja", "shopping", "mall", "fashion"],
  musik: ["musik", "music", "karaoke", "konser", "vokalis", "gitar", "musisi", "penyanyi"],
  gaming: ["gaming", "game", "gamer", "mabar", "esport"],
  fotografi: ["fotografi", "fotografer", "photography", "foto", "videografer", "editor"],
  "kerja-belajar": ["kerja", "meeting", "belajar", "diskusi", "networking", "membaca", "penerjemah"],
  ngopi: ["kopi", "kafe", "cafe", "coffee", "ngafe"],
  "online-chat": ["online", "video call", "chat", "daring"],
  lainnya: [],
};

function normalizeLegacyText(value: unknown): string {
  return legacyText(value)
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function inferLegacyMitraActivities(...values: unknown[]): MitraActivityId[] {
  const text = normalizeLegacyText(values.map(legacyText).join(" "));
  if (!text) return ["nongkrong"];

  const matched = MITRA_ACTIVITIES
    .filter(({ id }) => LEGACY_ACTIVITY_KEYWORDS[id].some((keyword) =>
      text.includes(normalizeLegacyText(keyword)),
    ))
    .map(({ id }) => id);

  return matched.length > 0 ? matched : ["nongkrong"];
}

export function getMitraActivityLabels(value: unknown): string[] {
  const selectedIds = new Set(normalizeMitraActivities(value));
  return MITRA_ACTIVITIES
    .filter(({ id }) => selectedIds.has(id))
    .map(({ label }) => label);
}

export function getAvailableBookingPurposes(
  activities: unknown,
  purposes: string[],
): string[] {
  const selectedIds = new Set(normalizeMitraActivities(activities));
  return purposes.filter((purpose) =>
    (BOOKING_PURPOSE_ACTIVITIES[purpose] || []).some((id) => selectedIds.has(id)),
  );
}
