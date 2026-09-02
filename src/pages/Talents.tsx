import { useState, useMemo, useEffect, useCallback } from "react";
import { SlidersHorizontal, Search, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TalentCard } from "@/components/TalentCard";
import { FilterModal } from "@/components/FilterModal";
import { getAllVerifiedTalents, getCurrentMitra } from "@/lib/mitraStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Talents() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const [currentMitra, setCurrentMitra] = useState<any>(null);
  
  const [allTalents, setAllTalents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Tambahkan loading state
  
  // 🔥 PERBAIKAN: Tambahkan state untuk melacak apakah user sudah melakukan pencarian/filter
  const [hasSearched, setHasSearched] = useState(false);
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
      setAllTalents(Array.isArray(data) ? data : []);
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

  // 🔥 PERBAIKAN: TAMBAKAN useEffect untuk memeriksa apakah user adalah mitra
  useEffect(() => {
    const mitra = getCurrentMitra();
    setCurrentMitra(mitra);
  }, []);

  // 🔥 PERBAIKAN: Track kapan user melakukan pencarian
  useEffect(() => {
    // Jika searchQuery tidak kosong atau ada filter aktif, tandai bahwa user sudah mencari
    const hasActiveFilters = searchQuery.trim() || 
      filters.cities.length > 0 || 
      filters.hobbies.length > 0 || 
      filters.availability.length > 0 || // Tambahkan filter availability
      filters.gender || 
      filters.minAge !== 18 || 
      filters.maxAge !== 40;
    
    setHasSearched(hasActiveFilters);
  }, [searchQuery, filters]);

  // Memo untuk filter dan sorting talent agar tidak dihitung ulang setiap render
  const filteredTalents = useMemo(() => {
    if (error) {
      return [];
    }

    let result = [...allTalents];
    
    // 🔥 PERBAIKAN KRUSIAL: Filter untuk mengecualikan talent yang diblokir admin
    result = result.filter((t) => !t.isBlocked && !t.blocked && t.status !== "blocked" && !blockedTalents.includes(t.id));
    
    // 🔥 PERBAIKAN: Jika currentMitra ada, filter untuk mengecualikan diri sendiri
    if (currentMitra) {
      result = result.filter((t) => t.id !== currentMitra.id);
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

    switch (sortBy) {
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price-low":
        result.sort((a, b) => (a.price || a.pricePerHour || 0) - (b.price || b.pricePerHour || 0));
        break;
      case "price-high":
        result.sort((a, b) => (b.price || b.pricePerHour || 0) - (a.price || a.pricePerHour || 0));
        break;
      case "reviews":
        result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
    }

    return result;
  }, [searchQuery, filters, sortBy, allTalents, error, currentMitra, blockedTalents]); // 🔥 PERBAIKAN: Tambahkan blockedTalents ke dependency

  const activeFiltersCount =
    filters.cities.length +
    filters.hobbies.length +
    filters.availability.length + // Tambahkan filter availability ke hitungan
    (filters.gender ? 1 : 0) +
    (filters.minAge !== 18 || filters.maxAge !== 40 ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      cities: [],
      hobbies: [],
      gender: "",
      minAge: 18,
      maxAge: 40,
      availability: [], // Reset availability
    });
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 md:pt-24 pb-24 md:pb-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Temukan <span className="text-gradient">Teman</span>
          </h1>
          <p className="text-muted-foreground">
            {!error && !isLoading && `${filteredTalents.length} teman tersedia untuk menemani kamu`}
            {error && "Gagal memuat data"}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cari nama, kota, atau skill..."
              className="pl-12 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
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
              <SelectTrigger className="w-[180px] h-12">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Penilaian Tertinggi</SelectItem>
                <SelectItem value="price-low">Harga Terendah</SelectItem>
                <SelectItem value="price-high">Harga Tertinggi</SelectItem>
                <SelectItem value="reviews">Ulasan Terbanyak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTalents.map((talent, index) => (
                  <div key={talent.id} className="animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
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