// src/components/CitySelect.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, ChevronDown, Check, Search, PlusCircle, X } from "lucide-react";
import { getCities, subscribeToCities } from "@/lib/cityStore";
import { Badge } from "@/components/ui/badge";

interface CitySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CitySelect({
  id = "citySelect",
  value,
  onChange,
  placeholder = "Pilih atau cari kota domisili...",
  required = false,
  disabled = false,
  className = "",
}: CitySelectProps) {
  const [cities, setCities] = useState<string[]>(() => getCities());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Subscribe ke perubahan kota dari Admin
  useEffect(() => {
    const unsubscribe = subscribeToCities((updatedCities) => {
      setCities(updatedCities);
    });
    return unsubscribe;
  }, []);

  // Tutup dropdown saat klik di luar komponen
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fokuskan input pencarian saat dropdown terbuka
  useEffect(() => {
    if (isOpen && !isCustomMode) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isCustomMode]);

  // Filter daftar kota berdasarkan kata kunci pencarian
  const filteredCities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cities;
    return cities.filter((city) => city.toLowerCase().includes(query));
  }, [cities, searchQuery]);

  // Periksa apakah query yang diketik sudah sama persis dengan salah satu kota di daftar
  const exactMatch = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return cities.find((city) => city.toLowerCase() === query);
  }, [cities, searchQuery]);

  const handleSelectCity = (city: string) => {
    onChange(city);
    setSearchQuery("");
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleUseCustomQuery = (customCity: string) => {
    const trimmed = customCity.trim();
    if (trimmed) {
      // Format huruf kapital awal setiap kata
      const formatted = trimmed
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      onChange(formatted);
      setSearchQuery("");
      setIsOpen(false);
      setIsCustomMode(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input untuk integrasi form HTML validasi required */}
      <input
        type="text"
        tabIndex={-1}
        className="sr-only"
        required={required}
        value={value || ""}
        onChange={() => {}}
      />

      {/* Trigger Button / Input Tampilan */}
      <div
        id={id}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-background border rounded-lg transition-all cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed bg-muted" : "hover:border-orange-400"
        } ${
          isOpen
            ? "border-orange-500 ring-2 ring-orange-500/20 shadow-xs"
            : "border-input"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1">
          <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
          {value ? (
            <span className="font-medium text-foreground truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180 text-orange-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-orange-200/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {!isCustomMode ? (
            <div className="flex flex-col max-h-80">
              {/* Kolom Pencarian */}
              <div className="p-2 border-b bg-orange-50/40">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama kota... (mis: Padang, Palembang)"
                    className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-background border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredCities.length > 0) {
                          handleSelectCity(filteredCities[0]);
                        } else if (searchQuery.trim()) {
                          handleUseCustomQuery(searchQuery);
                        }
                      } else if (e.key === "Escape") {
                        setIsOpen(false);
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-muted-foreground">
                  <span>
                    {filteredCities.length > 0
                      ? `${filteredCities.length} kota cocok`
                      : "Tidak ada kota di daftar"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-normal border-orange-200 text-orange-800">
                    {cities.length} Kota Tersedia
                  </Badge>
                </div>
              </div>

              {/* Opsi khusus jika yang diketik belum ada di daftar */}
              {searchQuery.trim() && !exactMatch && (
                <div className="p-1.5 border-b bg-orange-50/70">
                  <button
                    type="button"
                    onClick={() => handleUseCustomQuery(searchQuery)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-orange-900 bg-orange-100/80 hover:bg-orange-200/80 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="truncate">
                      Gunakan &ldquo;<strong>{searchQuery.trim()}</strong>&rdquo; (Kota Lainnya)
                    </span>
                  </button>
                </div>
              )}

              {/* Daftar Kota Hasil Filter */}
              <div className="overflow-y-auto flex-1 divide-y divide-border/40 max-h-52 p-1">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => {
                    const isSelected = value.toLowerCase() === city.toLowerCase();
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-orange-50 font-semibold text-orange-900"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-orange-600" : "text-muted-foreground"}`} />
                          {city}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <p>Kota &ldquo;{searchQuery}&rdquo; belum ada di daftar resmi.</p>
                    <p className="mt-1 text-orange-700 font-medium">
                      Klik tombol &ldquo;Gunakan {searchQuery}&rdquo; di atas untuk tetap menggunakannya.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Aksi Tambahan: Ketik Manual Kota Lainnya */}
              <div className="p-2 border-t bg-muted/30 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setTimeout(() => customInputRef.current?.focus(), 50);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-orange-700 hover:text-orange-900 font-medium hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Kota tidak ada di daftar? Ketik manual
                </button>
              </div>
            </div>
          ) : (
            /* Mode Ketik Manual Kota Lainnya */
            <div className="p-3 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-600" />
                  Ketik Nama Kota Lainnya
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Kembali ke Daftar
                </button>
              </div>

              <div className="space-y-1.5">
                <input
                  ref={customInputRef}
                  type="text"
                  placeholder="Contoh: Purwokerto, Tarakan, Gorontalo..."
                  defaultValue={value || ""}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-orange-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUseCustomQuery(e.currentTarget.value);
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Masukkan nama kota tempat tinggal atau domisili layanan Anda jika belum terdaftar.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (customInputRef.current) {
                      handleUseCustomQuery(customInputRef.current.value);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 shadow-xs"
                >
                  Simpan Kota
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
