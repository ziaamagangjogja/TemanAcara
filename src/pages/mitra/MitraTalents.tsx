// src/pages/mitra/MitraTalents.tsx
import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { SlidersHorizontal, Search, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MitraTalentCard } from "@/components/MitraTalentCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllVerifiedTalents, getCurrentMitra } from "@/lib/mitraStore";

// Import FilterModal secara langsung untuk menghindari error lazy loading
import { FilterModal } from "@/components/FilterModal";

// Pre-generate options untuk sorting
const SORT_OPTIONS = [
  { value: "rating", label: "Penilaian Tertinggi" },
  { value: "price-low", label: "Harga Terendah" },
  { value: "price-high", label: "Harga Tertinggi" },
  { value: "reviews", label: "Ulasan Terbanyak" },
] as const;

// Pre-generate availability labels
const AVAILABILITY_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  both: "Online & Offline",
};

// Optimized skeleton component
const TalentCardSkeleton = memo(({ index }: { index: number }) => (
  <div 
    className="animate-fade-up opacity-0" 
    style={{ 
      animationDelay: `${index * 0.05}s`,
      animationFillMode: "forwards"
    }}
  >
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
));

// Memoized filter badge component
const FilterBadge = memo(({ 
  label, 
  onRemove 
}: { 
  label: string; 
  onRemove: () => void; 
}) => (
  <Badge variant="secondary" className="gap-1 pr-1">
    {label}
    <button 
      onClick={onRemove}
      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
      aria-label={`Remove ${label} filter`}
    >
      <X className="w-3 h-3" />
    </button>
  </Badge>
));

// Memoized empty state component
const EmptyState = memo(({ 
  hasSearched, 
  isInitialLoad 
}: { 
  hasSearched: boolean; 
  isInitialLoad: boolean; 
}) => {
  if (hasSearched) {
    return (
      <div className="text-center py-16">
        <Search className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">Tidak Ada Hasil</h3>
        <p className="text-muted-foreground">Coba ubah filter atau kata kunci pencarian Anda</p>
      </div>
    );
  }
  
  if (!isInitialLoad) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Tidak ada mitra yang tersedia saat ini</p>
      </div>
    );
  }
  
  return null;
});

// Memoized error state component
const ErrorState = memo(({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void; 
}) => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <X className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Terjadi Kesalahan</h3>
      <p className="text-red-500 mb-4">{error}</p>
      <Button onClick={onRetry} variant="outline">
        Coba Lagi
      </Button>
    </div>
  </div>
));

export default function MitraTalents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    cities: [] as string[],
    hobbies: [] as string[],
    gender: "",
    minAge: 18,
    maxAge: 40,
    availability: [] as string[],
  });

  const [currentMitra, setCurrentMitra] = useState<any>(null);
  const [allTalents, setAllTalents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [blockedTalents, setBlockedTalents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("rentmate_blocked_talents");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Refs for optimization
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const talentsListRef = useRef<HTMLDivElement>(null);

  // Memoized functions for loading data
  const loadBlockedTalents = useCallback(() => {
    try {
      const stored = localStorage.getItem("rentmate_blocked_talents");
      const blocked = stored ? JSON.parse(stored) : [];
      setBlockedTalents(blocked);
    } catch (error) {
      console.error("Error loading blocked talents:", error);
      setBlockedTalents([]);
    }
  }, []);

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
      setIsInitialLoad(false);
    }
  }, []);

  // Optimized event listeners
  useEffect(() => {
    loadTalents();
    loadBlockedTalents();

    const handleTalentListUpdated = () => {
      console.log("Event 'talentListUpdated' terpicu, memuat ulang data...");
      loadTalents();
    };
    
    const handleBlockedTalentsUpdated = () => {
      console.log("Event 'blockedTalentsUpdated' terpicu, memuat ulang daftar talent yang diblokir...");
      loadBlockedTalents();
    };

    window.addEventListener("talentListUpdated", handleTalentListUpdated);
    window.addEventListener("blockedTalentsUpdated", handleBlockedTalentsUpdated);
    
    return () => {
      window.removeEventListener("talentListUpdated", handleTalentListUpdated);
      window.removeEventListener("blockedTalentsUpdated", handleBlockedTalentsUpdated);
    };
  }, [loadTalents, loadBlockedTalents]);

  useEffect(() => {
    const mitra = getCurrentMitra();
    setCurrentMitra(mitra);
  }, []);

  // Optimized debounce with cleanup
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Optimized hasSearched check
  useEffect(() => {
    const hasActiveFilters = 
      debouncedSearchQuery.trim() || 
      filters.cities.length > 0 || 
      filters.hobbies.length > 0 || 
      filters.availability.length > 0 ||
      filters.gender || 
      filters.minAge !== 18 || 
      filters.maxAge !== 40;
    
    setHasSearched(hasActiveFilters);
  }, [debouncedSearchQuery, filters]);

  // Optimized filtering function
  const filterTalents = useCallback((talents: any[], query: string, filters: any, currentMitra: any, blockedTalents: string[]) => {
    let result = [...talents];
    
    // Filter out current mitra and blocked talents
    if (currentMitra?.id) {
      result = result.filter((t) => t.id !== currentMitra.id);
    }
    result = result.filter((t) => !blockedTalents.includes(t.id));

    // Apply search filter
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase();
      result = result.filter((t) => {
        const name = t.name?.toLowerCase() || "";
        const city = t.city?.toLowerCase() || "";
        const hobbies = t.hobbies?.toLowerCase() || "";
        const category = t.category?.toLowerCase() || "";
        const skills = Array.isArray(t.skills) ? t.skills.join(" ").toLowerCase() : "";
        return (
          name.includes(lowercaseQuery) ||
          city.includes(lowercaseQuery) ||
          hobbies.includes(lowercaseQuery) ||
          category.includes(lowercaseQuery) ||
          skills.includes(lowercaseQuery)
        );
      });
    }

    // Apply city filter
    if (filters.cities.length > 0) {
      result = result.filter((t) => t.city && filters.cities.includes(t.city));
    }

    // Apply hobbies filter
    if (filters.hobbies.length > 0) {
      result = result.filter((t) => {
        const hobbiesFromString = t.hobbies ? t.hobbies.split(",").map((h: string) => h.trim()) : [];
        const skills = Array.isArray(t.skills) ? t.skills : [];
        const combined = [...hobbiesFromString, ...skills];
        return filters.hobbies.some((hobby) => combined.includes(hobby));
      });
    }

    // Apply availability filter
    if (filters.availability.length > 0) {
      result = result.filter((t) => {
        if (filters.availability.includes("both")) return true;
        if (filters.availability.includes("online") && !filters.availability.includes("offline")) {
          return t.availability === "online" || t.availability === "both";
        }
        if (filters.availability.includes("offline") && !filters.availability.includes("online")) {
          return t.availability === "offline" || t.availability === "both";
        }
        if (filters.availability.includes("online") && filters.availability.includes("offline")) {
          return true;
        }
        return false;
      });
    }

    // Apply gender filter
    if (filters.gender) {
      result = result.filter((t) => t.gender === filters.gender);
    }

    // Apply age filter
    result = result.filter((t) => {
      const age = typeof t.age === "number" ? t.age : parseInt(t.age) || 0;
      return age >= filters.minAge && age <= filters.maxAge;
    });

    return result;
  }, []);

  // Optimized sorting function
  const sortTalents = useCallback((talents: any[], sortBy: string) => {
    const sortedTalents = [...talents];
    
    switch (sortBy) {
      case "rating":
        sortedTalents.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price-low":
        sortedTalents.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        sortedTalents.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "reviews":
        sortedTalents.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
    }
    
    return sortedTalents;
  }, []);

  // Memoized filtered and sorted talents
  const filteredTalents = useMemo(() => {
    if (error) return [];
    
    const filtered = filterTalents(allTalents, debouncedSearchQuery, filters, currentMitra, blockedTalents);
    return sortTalents(filtered, sortBy);
  }, [allTalents, debouncedSearchQuery, filters, currentMitra, blockedTalents, sortBy, error, filterTalents, sortTalents]);

  // Memoized active filters count
  const activeFiltersCount = useMemo(() => 
    filters.cities.length +
    filters.hobbies.length +
    filters.availability.length +
    (filters.gender ? 1 : 0) +
    (filters.minAge !== 18 || filters.maxAge !== 40 ? 1 : 0),
    [filters]
  );

  // Memoized filter actions
  const clearFilters = useCallback(() => {
    setFilters({
      cities: [],
      hobbies: [],
      gender: "",
      minAge: 18,
      maxAge: 40,
      availability: [],
    });
    setSearchQuery("");
    
    // Focus back to search input after clearing filters
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const removeCityFilter = useCallback((city: string) => {
    setFilters(prev => ({ ...prev, cities: prev.cities.filter(c => c !== city) }));
  }, []);

  const removeHobbyFilter = useCallback((hobby: string) => {
    setFilters(prev => ({ ...prev, hobbies: prev.hobbies.filter(h => h !== hobby) }));
  }, []);
  
  const removeAvailabilityFilter = useCallback((availability: string) => {
    setFilters(prev => ({ ...prev, availability: prev.availability.filter(a => a !== availability) }));
  }, []);

  const removeGenderFilter = useCallback(() => {
    setFilters(prev => ({ ...prev, gender: "" }));
  }, []);

  // Optimized scroll to top when filters change
  useEffect(() => {
    if (talentsListRef.current && !isLoading) {
      talentsListRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [debouncedSearchQuery, filters, sortBy, isLoading]);

  // Memoized skeleton components
  const skeletonComponents = useMemo(() => 
    Array.from({ length: 8 }).map((_, index) => (
      <TalentCardSkeleton key={`skeleton-${index}`} index={index} />
    )),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 md:pt-24 pb-24 md:pb-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Temukan <span className="text-gradient">Mitra Lain</span>
          </h1>
          <p className="text-muted-foreground">
            {!error && !isLoading && `${filteredTalents.length} mitra tersedia untuk diajak kerja sama`}
            {error && "Gagal memuat data"}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
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
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.cities.map((city) => (
              <FilterBadge 
                key={city} 
                label={city}
                onRemove={() => removeCityFilter(city)}
              />
            ))}
            {filters.hobbies.map((hobby) => (
              <FilterBadge 
                key={hobby} 
                label={hobby}
                onRemove={() => removeHobbyFilter(hobby)}
              />
            ))}
            {filters.availability.map((availability) => (
              <FilterBadge 
                key={availability} 
                label={AVAILABILITY_LABELS[availability] || availability}
                onRemove={() => removeAvailabilityFilter(availability)}
              />
            ))}
            {filters.gender && (
              <FilterBadge 
                label={filters.gender}
                onRemove={removeGenderFilter}
              />
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Hapus Semua
            </Button>
          </div>
        )}

        {/* Content */}
        <div ref={talentsListRef}>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {skeletonComponents}
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={loadTalents} />
          ) : (
            <>
              {filteredTalents.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredTalents.map((talent, index) => (
                    <div 
                      key={talent.id} 
                      className="animate-fade-up opacity-0" 
                      style={{ 
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: "forwards"
                      }}
                    >
                      <MitraTalentCard talent={talent} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState hasSearched={hasSearched} isInitialLoad={isInitialLoad} />
              )}
            </>
          )}
        </div>

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