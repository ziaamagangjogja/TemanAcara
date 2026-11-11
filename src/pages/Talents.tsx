import { useState, useMemo, useEffect, useCallback } from "react";
import {
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  ArrowRight,
  ArrowLeft,
  X,
  Dumbbell,
  Compass,
  Utensils,
  Film,
  PartyPopper,
  Music,
  Gamepad2,
  Camera,
  MessageCircle,
  ShoppingBag,
  BookOpen,
  Coffee,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import activityEvent from "@/assets/mitra-landing/activity-event.jpg";
import activityChat from "@/assets/mitra-landing/activity-chat.jpg";
import activityDining from "@/assets/mitra-landing/activity-dining.jpg";
import activityVirtual from "@/assets/mitra-landing/activity-virtual.jpg";
import heroGroupHangout from "@/assets/mitra-landing/hero-group-hangout.jpg";
import heroWorkTogether from "@/assets/mitra-landing/hero-work-together.jpg";
import activityTravel from "@/assets/activity-cards/travel.jpg";
import activitySports from "@/assets/activity-cards/sports.jpg";
import activityPhotography from "@/assets/activity-cards/photography.jpg";
import activityShopping from "@/assets/activity-cards/shopping.jpg";
import activityCinema from "@/assets/activity-cards/cinema.jpg";
import activityMusic from "@/assets/activity-cards/music.jpg";
import activityGaming from "@/assets/activity-cards/gaming.jpg";
import activityFood from "@/assets/activity-cards/food.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TalentCard } from "@/components/TalentCard";
import { FilterModal } from "@/components/FilterModal";
import { getAllVerifiedTalents } from "@/lib/mitraStore";
import { getTalentReviewStats } from "@/lib/bookingStore";
import { getCurrentUser } from "@/lib/userStore";
import { inferLegacyMitraActivities, normalizeMitraActivities } from "@/data/mitraActivities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityCategoryItem {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
  description: string;
  image: string;
  detailDescription: string;
  activities: string[];
  specialistSkills: string[];
}

const ACTIVITY_CATEGORIES: ActivityCategoryItem[] = [
  { id: "nongkrong", label: "Nongkrong", icon: MessageCircle, keywords: ["nongkrong", "ngobrol", "kopi", "kafe", "cafe", "teman ngobrol", "podcast"], description: "Ngobrol santai dan menghabiskan waktu bareng.", image: activityChat, detailDescription: "Pilih teman untuk ngobrol santai, ngafe, atau duduk bareng di tempat favorit.", activities: ["Ngobrol santai", "Ngopi di kafe", "Cari tempat nongkrong", "Teman makan"], specialistSkills: [] },
  { id: "traveling", label: "Traveling", icon: Compass, keywords: ["traveling", "travelling", "liburan", "jalan-jalan", "wisata", "hiking", "pemandu", "tour", "trip", "tour guide"], description: "Jalan-jalan, liburan, atau menjelajahi tempat baru.", image: activityTravel, detailDescription: "Pilih teman untuk menemani perjalanan. Jika ingin dipandu, cari mitra yang mencantumkan keahlian Tour Guide / Pemandu dan cek portofolionya.", activities: ["Jalan-jalan keliling kota", "Liburan ke tempat wisata", "Hiking atau aktivitas alam", "Mengunjungi kuliner lokal"], specialistSkills: ["Tour Guide / Pemandu"] },
  { id: "event", label: "Acara", icon: PartyPopper, keywords: ["event", "acara", "pesta", "party", "kondangan", "pernikahan", "wedding", "wisuda", "kelulusan", "ulang tahun", "birthday", "seminar", "konferensi", "conference", "gathering", "reuni", "konser", "festival", "kantor", "pameran", "launching", "lamaran", "networking", "mc", "host"], description: "Wisuda, kondangan, ulang tahun, dan acara lainnya.", image: activityEvent, detailDescription: "Cari teman untuk menghadiri acara bersama. Mitra yang juga mendukung hobi terkait acara, seperti ngopi, fotografi, atau musik, bisa muncul di sini.", activities: ["Wisuda atau kelulusan", "Pernikahan atau kondangan", "Ulang tahun atau pesta", "Seminar, konser, gathering, atau reuni"], specialistSkills: ["MC / Host Acara"] },
  { id: "olahraga", label: "Olahraga", icon: Dumbbell, keywords: ["olahraga", "gym", "fitness", "yoga", "renang", "basket", "badminton", "sepak bola", "lari", "workout", "pelatih", "trainer", "coach"], description: "Gym, lari, yoga, atau olahraga favorit lainnya.", image: activitySports, detailDescription: "Temukan teman berolahraga atau, bila membutuhkan arahan latihan, mitra dengan keahlian Pelatih Gym / Fitness. Tinjau kualifikasi dan portofolio di profil.", activities: ["Gym atau fitness", "Lari atau jalan pagi", "Yoga atau renang", "Badminton, basket, atau olahraga lain"], specialistSkills: ["Pelatih Gym / Fitness"] },
  { id: "kuliner", label: "Kuliner", icon: Utensils, keywords: ["kuliner", "makan", "memasak", "cooking", "food", "dinner", "resto", "restaurant", "chef", "barista"], description: "Makan bareng dan mencoba tempat baru.", image: activityFood, detailDescription: "Pilih teman untuk makan, mencoba restoran, atau menjelajahi tempat kuliner.", activities: ["Makan siang atau malam", "Mencoba restoran baru", "Wisata kuliner", "Ngopi dan ngobrol"], specialistSkills: [] },
  { id: "nonton", label: "Nonton Film", icon: Film, keywords: ["nonton", "film", "bioskop", "movie", "cinema", "series", "drakor"], description: "Nonton film, serial, atau hiburan bareng.", image: activityCinema, detailDescription: "Cari teman untuk menonton film atau serial bersama, di bioskop atau secara online.", activities: ["Nonton di bioskop", "Nonton serial atau drakor", "Nonton bareng online"], specialistSkills: [] },
  { id: "belanja", label: "Belanja", icon: ShoppingBag, keywords: ["belanja", "shopping", "mall", "fashion"], description: "Keliling mall atau mencari barang yang kamu suka.", image: activityShopping, detailDescription: "Temukan teman untuk menemani belanja, window shopping, atau mencari kebutuhan.", activities: ["Keliling mall", "Belanja kebutuhan", "Cari pakaian atau hadiah", "Window shopping"], specialistSkills: [] },
  { id: "musik", label: "Musik & Karaoke", icon: Music, keywords: ["musik", "music", "karaoke", "konser", "vokalis", "gitar", "band", "musisi", "penyanyi"], description: "Karaoke, dengar musik, atau nonton konser.", image: activityMusic, detailDescription: "Pilih teman karaoke atau menonton konser. Untuk penampilan musik, lihat mitra dengan keahlian Musisi / Vokalis.", activities: ["Karaoke bareng", "Menonton konser", "Berbagi rekomendasi musik"], specialistSkills: ["Musisi / Vokalis"] },
  { id: "gaming", label: "Gaming", icon: Gamepad2, keywords: ["gaming", "game", "gamer", "mabar", "esport", "coach", "pelatih"], description: "Mabar dan seru-seruan main game.", image: activityGaming, detailDescription: "Cari teman mabar online. Jika mencari latihan atau coaching, pilih mitra Pro Gamer / Coach dan cek profilnya.", activities: ["Mabar online", "Main game kasual", "Diskusi game"], specialistSkills: ["Pro Gamer / Coach"] },
  { id: "fotografi", label: "Fotografi", icon: Camera, keywords: ["fotografi", "fotografer", "photography", "foto", "hunting foto", "videografer", "editor"], description: "Jalan-jalan sambil hunting foto dan mengabadikan momen.", image: activityPhotography, detailDescription: "Pilih teman untuk hunting foto. Jika membutuhkan hasil foto profesional, cari Fotografer Pro atau Videografer dan lihat contoh karya di portofolio.", activities: ["Hunting foto di kota atau alam", "Foto untuk kenangan pribadi", "Membuat video perjalanan"], specialistSkills: ["Fotografer Pro", "Videografer & Editor"] },
  { id: "kerja-belajar", label: "Kerja & Belajar", icon: BookOpen, keywords: ["kerja", "meeting", "belajar", "diskusi", "networking", "membaca", "penerjemah", "bahasa"], description: "Kerja, belajar, atau diskusi bareng.", image: heroWorkTogether, detailDescription: "Temukan teman untuk co-working, belajar mandiri, atau diskusi. Keahlian profesional khusus dapat dilihat pada profil mitra.", activities: ["Co-working di kafe", "Belajar mandiri", "Diskusi santai", "Networking"], specialistSkills: ["Penerjemah Bahasa"] },
  { id: "ngopi", label: "Ngafe", icon: Coffee, keywords: ["kopi", "kafe", "cafe", "coffee", "kuliner"], description: "Mencari kafe baru dan ngopi bareng.", image: activityDining, detailDescription: "Ajak teman mencoba kafe, menikmati kopi, atau bekerja santai dari kafe.", activities: ["Ngopi di kafe", "Mencoba coffee shop baru", "Kerja santai dari kafe"], specialistSkills: [] },
  { id: "online-chat", label: "Ngobrol Online", icon: MessageCircle, keywords: ["online", "chat", "ngobrol", "video call", "diskusi"], description: "Ngobrol atau video call dari mana saja.", image: activityVirtual, detailDescription: "Temukan teman untuk ngobrol jarak jauh lewat chat atau video call.", activities: ["Video call santai", "Diskusi ringan", "Teman ngobrol online"], specialistSkills: [] },
  { id: "lainnya", label: "Lainnya", icon: Sparkles, keywords: [], description: "Aktivitas lain yang ingin kamu lakukan.", image: heroGroupHangout, detailDescription: "Ceritakan kebutuhanmu dan cari mitra yang punya hobi atau keahlian paling sesuai.", activities: ["Aktivitas sesuai kebutuhanmu", "Jelajahi semua mitra"], specialistSkills: [] },
];

export default function Talents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return ACTIVITY_CATEGORIES.some((category) => category.id === params.get("category"))
      ? (params.get("category") || "all")
      : "all";
  });
  const [sortBy, setSortBy] = useState("rating");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    cities: [] as string[],
    hobbies: [] as string[],
    gender: "",
    minAge: 18,
    maxAge: 40,
    availability: [] as string[], // Tambahkan properti availability
  });

  // State pengguna aktif yang sedang login untuk mencegah booking diri sendiri
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("rentmate_current_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) setCurrentUser(u);
    });
    const handleUserUpdated = () => {
      getCurrentUser().then((u) => {
        if (u) setCurrentUser(u);
      });
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, []);

  const [allTalents, setAllTalents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Tambahkan loading state
  
  // 🔥 PERBAIKAN: Tambahkan state untuk melacak apakah user sudah melakukan pencarian/filter
  const [hasSearched, setHasSearched] = useState(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    return ACTIVITY_CATEGORIES.some((item) => item.id === category);
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Tambahkan state untuk menandai load awal
  
  // 🔥 PERBAIKAN KRUSIAL: Tambahkan state untuk melacak talent yang diblokir
  const [blockedTalents, setBlockedTalents] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("rentmate_blocked_talents") || "[]");
    } catch {
      return [];
    }
  });

  // 🔥 PERBAIKAN: Buat fungsi async untuk memuat data dengan loading state
  const loadTalents = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await getAllVerifiedTalents();
      const list = Array.isArray(data) ? data : [];
      setAllTalents(list);
    } catch (err: any) {
      console.error("Gagal memuat data talent:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data.");
      setAllTalents([]);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false); // Tandai bahwa load awal sudah selesai
    }
  }, []);

  // 🔥 PERBAIKAN: Gunakan satu useEffect yang lebih efisien
  useEffect(() => {
    // Panggil data pertama kali
    loadTalents();

    // 🔥 PERBAIKAN: Pindahkan definisi fungsi listener ke dalam useEffect
    // untuk mencegah re-render yang tidak perlu
    const handleTalentListUpdated = () => {
      console.log("Event 'talentListUpdated' terpicu, memuat ulang data...");
      loadTalents();
    };
    
    // 🔥 PERBAIKAN KRUSIAL: Tambahkan listener untuk perubahan pada blockedTalents
    const handleBlockedTalentsUpdated = () => {
      console.log("Event 'blockedTalentsUpdated' terpicu, memperbarui daftar talent yang diblokir...");
      try {
        const blocked = JSON.parse(localStorage.getItem("rentmate_blocked_talents") || "[]");
        setBlockedTalents(blocked);
      } catch (error) {
        console.error("Error updating blocked talents:", error);
      }
    };

    // 🔥 PERBAIKAN: Hanya dengarkan event yang paling krusial
    window.addEventListener("talentListUpdated", handleTalentListUpdated);
    window.addEventListener("blockedTalentsUpdated", handleBlockedTalentsUpdated);
    
    // Cleanup
    return () => {
      window.removeEventListener("talentListUpdated", handleTalentListUpdated);
      window.removeEventListener("blockedTalentsUpdated", handleBlockedTalentsUpdated);
    };
  }, [loadTalents]);


  // 🔥 PERBAIKAN: Track kapan user melakukan pencarian
  useEffect(() => {
    // Jika searchQuery tidak kosong atau ada filter aktif, tandai bahwa user sudah mencari
    const hasActiveFilters = searchQuery.trim() || 
      selectedCategory !== "all" ||
      filters.cities.length > 0 || 
      filters.hobbies.length > 0 || 
      filters.availability.length > 0 || // Tambahkan filter availability
      filters.gender || 
      filters.minAge !== 18 || 
      filters.maxAge !== 40;
    
    setHasSearched(Boolean(hasActiveFilters));
  }, [searchQuery, selectedCategory, filters]);

  // Memo untuk filter dan sorting talent agar tidak dihitung ulang setiap render
  const filteredTalents = useMemo(() => {
    if (error) {
      return [];
    }

    let result = [...allTalents];
    
    // 🔥 PERBAIKAN KRUSIAL: Filter untuk mengecualikan talent yang diblokir admin
    result = result.filter((t) => !t.isBlocked && !t.blocked && t.status !== "blocked" && !blockedTalents.includes(t.id));
    
    // 🔥 Pengecualian profil diri sendiri: Pengguna tidak bisa melihat/mem-booking akun dirinya sendiri
    if (currentUser) {
      const userEmail = (currentUser.email || "").trim().toLowerCase();
      const userName = (currentUser.username || currentUser.name || "").trim().toLowerCase();
      const userId = currentUser.id || "";

      result = result.filter((t) => {
        // Cek ID pengguna yang sama
        if (userId && (t.id === userId || t.talentId === userId)) {
          return false;
        }
        // Cek Email yang sama (apabila akun pengguna mendaftar sebagai mitra dengan email yang sama)
        if (userEmail && t.email && t.email.trim().toLowerCase() === userEmail) {
          return false;
        }
        // Cek Username / Nama Akun yang persis sama
        if (userName && (
          (t.username && t.username.trim().toLowerCase() === userName) ||
          (t.name && t.name.trim().toLowerCase() === userName)
        )) {
          return false;
        }
        return true;
      });
    }

    // Filter berdasarkan aktivitas yang didaftarkan, atau aktivitas yang bisa disimpulkan dari profil mitra lama.
    const getActivities = (talent: any): string[] => {
      const stored = talent.supportedActivities ?? talent.supported_activities;
      const explicitlySelected = stored != null ? normalizeMitraActivities(stored) : [];
      const inferred = inferLegacyMitraActivities(
        talent.category,
        talent.skills,
        talent.hobbies,
        talent.specialistSkills ?? talent.specialist_skills,
        talent.description,
        talent.bio,
      );
      return [...new Set([...explicitlySelected, ...inferred])];
    };
    const getProfileKeywords = (talent: any): string => {
      const values = [talent.specialistSkills, talent.specialist_skills, talent.skills, talent.hobbies, talent.category, talent.description, talent.bio];
      return values.flatMap((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value !== "string") return [];
        try {
          const parsed: unknown = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* profiles before the new registration form store text lists */ }
        return [value];
      }).filter((value): value is string => typeof value === "string").join(" ").toLocaleLowerCase();
    };
    const selectedActivityForSort = ACTIVITY_CATEGORIES.find((category) => category.id === selectedCategory);
    const matchesCategory = (talent: any) => {
      const activities = getActivities(talent);
      if (activities.includes(selectedCategory) || (selectedCategory === "traveling" && activities.includes("hiking"))) return true;
      const keywords = selectedActivityForSort?.keywords || [];
      const profileText = getProfileKeywords(talent);
      return keywords.some((keyword) => profileText.includes(keyword.toLocaleLowerCase()));
    };
    if (selectedCategory !== "all") {
      result = result.filter(matchesCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => {
        const name = t.name?.toLowerCase() || "";
        const city = t.city?.toLowerCase() || "";
        const hobbies = t.hobbies?.toLowerCase() || "";
        const category = t.category?.toLowerCase() || "";
        const skills = Array.isArray(t.skills) ? t.skills.join(" ").toLowerCase() : "";
        return (
          name.includes(query) ||
          city.includes(query) ||
          hobbies.includes(query) ||
          category.includes(query) ||
          skills.includes(query)
        );
      });
    }

    if (filters.cities.length > 0) {
      result = result.filter((t) => t.city && filters.cities.includes(t.city));
    }

    if (filters.hobbies.length > 0) {
      result = result.filter((t) => {
        const hobbiesFromString = t.hobbies ? t.hobbies.split(",").map((h: string) => h.trim()) : [];
        const skills = Array.isArray(t.skills) ? t.skills : [];
        const combined = [...hobbiesFromString, ...skills];
        return filters.hobbies.some((hobby) => combined.includes(hobby));
      });
    }

    // 🔥 PERBAIKAN: Tambahkan filter untuk availability
    if (filters.availability.length > 0) {
      result = result.filter((t) => {
        // Jika "both" dipilih, tampilkan semua talent
        if (filters.availability.includes("both")) {
          return true;
        }
        
        // Jika hanya "online" dipilih
        if (filters.availability.includes("online") && !filters.availability.includes("offline")) {
          return t.availability === "online" || t.availability === "both";
        }
        
        // Jika hanya "offline" dipilih
        if (filters.availability.includes("offline" ) && !filters.availability.includes("online")) {
          return t.availability === "offline" || t.availability === "both";
        }
        
        // Jika keduanya dipilih
        if (filters.availability.includes("online") && filters.availability.includes("offline")) {
          return true; // Tampilkan semua talent
        }
        
        return false;
      });
    }

    if (filters.gender) {
      result = result.filter((t) => t.gender === filters.gender);
    }

    result = result.filter((t) => {
      const age = typeof t.age === "number" ? t.age : 0;
      return age >= filters.minAge && age <= filters.maxAge;
    });

    const activityPriority = (talent: any) => {
      if (selectedCategory === "all") return 0;
      const stored = talent.supportedActivities ?? talent.supported_activities;
      if (stored == null) return matchesCategory(talent) ? 1 : 0;
      const activities = normalizeMitraActivities(stored);
      return activities.includes(selectedCategory) || (selectedCategory === "traveling" && activities.includes("hiking")) ? 2 : 0;
    };
    const compareRating = (a: any, b: any) => {
      const statsA = getTalentReviewStats(a);
      const statsB = getTalentReviewStats(b);
      if (statsB.rating !== statsA.rating) return statsB.rating - statsA.rating;
      if (statsB.reviewCount !== statsA.reviewCount) return statsB.reviewCount - statsA.reviewCount;
      return (a.name || "").localeCompare(b.name || "");
    };
    const comparePrice = (a: any, b: any) => {
      const priceA = a.price || a.pricePerHour || 0;
      const priceB = b.price || b.pricePerHour || 0;
      return sortBy === "price-high" ? priceB - priceA : priceA - priceB;
    };
    const compareByPreference = (a: any, b: any) => {
      const priorityDifference = activityPriority(b) - activityPriority(a);
      if (priorityDifference !== 0) return priorityDifference;
      return sortBy === "rating" ? compareRating(a, b) : comparePrice(a, b);
    };
    result.sort(compareByPreference);

    return result;
  }, [searchQuery, selectedCategory, filters, sortBy, allTalents, error, blockedTalents, currentUser]);

  const activeFiltersCount =
    filters.cities.length +
    filters.hobbies.length +
    filters.availability.length + // Tambahkan filter availability ke hitungan
    (selectedCategory !== "all" ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    (filters.minAge !== 18 || filters.maxAge !== 40 ? 1 : 0);

  const isChoosingActivity =
    selectedCategory === "all" &&
    !searchQuery.trim() &&
    !hasSearched;
  const selectedActivity = ACTIVITY_CATEGORIES.find((category) => category.id === selectedCategory);

  const clearFilters = () => {
    setFilters({
      cities: [],
      hobbies: [],
      gender: "",
      minAge: 18,
      maxAge: 40,
      availability: [], // Reset availability
    });
    setSelectedCategory("all");
    setSearchQuery("");
    setHasSearched(false);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("category");
    window.history.replaceState(window.history.state, "", nextUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-24 pt-20 md:pb-8 md:pt-24">
      <div className="container mx-auto w-full px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Mau ditemani <span className="text-gradient">melakukan apa?</span>
          </h1>
          <p className="text-muted-foreground">
            {isChoosingActivity
              ? "Pilih kebutuhanmu dulu. Kami akan mencarikan mitra dengan keahlian yang sesuai."
              : !error && !isLoading && `${filteredTalents.length} mitra cocok untuk aktivitasmu`}
            {error && "Gagal memuat data"}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={isChoosingActivity ? "Cari kebutuhan, misalnya traveling atau wisuda..." : "Cari nama mitra, kota, atau keahlian..."}
              className="pl-12 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {!isChoosingActivity && <div className="flex gap-2 sm:gap-3 flex-wrap">
            <Button
              variant={activeFiltersCount > 0 ? "default" : "outline"}
              className="gap-2 h-12"
              onClick={() => setFilterModalOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 bg-primary-foreground text-primary">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[195px] h-12">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Keahlian, lalu rating</SelectItem>
                <SelectItem value="price-low">Keahlian, lalu harga terendah</SelectItem>
                <SelectItem value="price-high">Keahlian, lalu harga tertinggi</SelectItem>
              </SelectContent>
            </Select>
          </div>}
        </div>

        {isChoosingActivity ? (
          <section aria-label="Pilih kategori aktivitas" className="mb-8 w-full">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Pilih kategori aktivitas</h2>
                <p className="text-sm text-muted-foreground">
                  Cari teman aktivitas atau mitra spesialis. Cocokkan hobi dan keahliannya, lalu cek portofolio di profil.
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ACTIVITY_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setHasSearched(true);
                      const nextUrl = new URL(window.location.href);
                      nextUrl.searchParams.set("category", category.id);
                      window.history.replaceState(window.history.state, "", nextUrl);
                    }}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Cari teman untuk ${category.label}`}
                  >
                    <div className="relative h-40 shrink-0 overflow-hidden sm:h-44">
                      <img src={category.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-foreground">
                        <Icon className="h-4 w-4 text-primary" />
                        {category.label}
                      </span>
                    </div>
                    <div className="flex min-h-[96px] flex-1 items-center justify-between gap-3 p-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">{category.description}</p>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
        <>
        {selectedActivity && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Kebutuhan terpilih</p>
                <h2 className="mt-1 text-lg font-bold">{selectedActivity.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedActivity.detailDescription}</p>
              </div>
              <Button variant="outline" className="shrink-0 gap-2" onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
                setHasSearched(false);
                const nextUrl = new URL(window.location.href);
                nextUrl.searchParams.delete("category");
                window.history.replaceState(window.history.state, "", nextUrl);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}>
                <ArrowLeft className="h-4 w-4" />
                Kembali ke kategori
              </Button>
            </div>
            <div className="mt-4 grid gap-4 border-t border-primary/10 pt-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold">Contoh aktivitas</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {selectedActivity.activities.map((activity) => (
                    <li key={activity} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Keahlian mitra terkait</h3>
                {selectedActivity.specialistSkills.length > 0 ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">Buka profil mitra untuk melihat kualifikasi dan portofolionya.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedActivity.specialistSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Pilih mitra berdasarkan hobi dan minat yang tercantum di profilnya.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1 bg-primary/10 text-primary border-primary/20">
                Aktivitas: {ACTIVITY_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                <button type="button" onClick={() => {
                  setSelectedCategory("all");
                  setHasSearched(false);
                  const nextUrl = new URL(window.location.href);
                  nextUrl.searchParams.delete("category");
                  window.history.replaceState(window.history.state, "", nextUrl);
                }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.cities.map((city) => (
              <Badge key={city} variant="secondary" className="gap-1 pr-1">
                {city}
                <button onClick={() => setFilters({ ...filters, cities: filters.cities.filter((c) => c !== city) })}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filters.hobbies.map((hobby) => (
              <Badge key={hobby} variant="secondary" className="gap-1 pr-1">
                {hobby}
                <button onClick={() => setFilters({ ...filters, hobbies: filters.hobbies.filter((h) => h !== hobby) })}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {/* Tambahkan tampilan untuk filter availability */}
            {filters.availability.map((availability) => {
              const label = availability === "online" ? "Online" : 
                           availability === "offline" ? "Offline" : "Online & Offline";
              return (
                <Badge key={availability} variant="secondary" className="gap-1 pr-1">
                  {label}
                  <button onClick={() => setFilters({ ...filters, availability: filters.availability.filter((a) => a !== availability) })}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            {filters.gender && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {filters.gender}
                <button onClick={() => setFilters({ ...filters, gender: "" })}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Hapus Semua
            </Button>
          </div>
        )}

        {/* Talent Grid */}
        {error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={loadTalents}>Coba Lagi</Button>
          </div>
        ) : (
          <>
            {/* 🔥 PERBAIKAN: Tampilkan skeleton loading saat pertama kali membuka halaman tanpa teks "Memuat data" */}
            {isLoading && (
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="h-full animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                      <div className="relative aspect-[4/5] bg-gray-200 animate-pulse"></div>
                      <div className="p-4">
                        <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && filteredTalents.length > 0 && (
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {filteredTalents.map((talent, index) => (
                  <div key={talent.id} className="h-full animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <TalentCard talent={talent} />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && filteredTalents.length === 0 && hasSearched && (
              // 🔥 PERBAIKAN: Hanya tampilkan "Tidak Ada Hasil" jika user sudah melakukan pencarian/filter
              <div className="text-center py-16">
                <Search className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Tidak Ada Hasil</h3>
                <p className="text-muted-foreground">Coba ubah filter atau kata kunci pencarian Anda</p>
              </div>
            )}
            
            {!isLoading && filteredTalents.length === 0 && !hasSearched && !isInitialLoad && (
              // 🔥 PERBAIKAN: Tampilkan pesan jika tidak ada data talent sama sekali (setelah load awal selesai)
              <div className="text-center py-16">
                <p className="text-muted-foreground">Tidak ada talent yang tersedia saat ini</p>
              </div>
            )}
          </>
        )}
        </>
        )}

        {/* Filter Modal */}
        <FilterModal
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={filters}
          onApply={setFilters}
        />
      </div>
    </div>
  );
}