import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// PERUBAHAN: Ambil kota dari localStorage atau gunakan default
const cities = (() => {
  try {
    const savedCities = localStorage.getItem("rentmate_cities");
    if (savedCities) {
      return JSON.parse(savedCities);
    }
    
    // Default cities jika tidak ada di localStorage
    return [
      "Jakarta",
      "Surabaya",
      "Bandung",
      "Medan",
      "Semarang",
      "Makassar",
      "Palembang",
      "Tangerang",
      "Depok",
      "Bekasi",
      "Yogyakarta",
      "Denpasar",
      "Malang",
      "Bogor",
      "Batam",
      "Pekanbaru",
      "Bandar Lampung",
      "Padang",
      "Manado",
      "Balikpapan",
      "Solo",
      "Cirebon",
      "Pontianak",
      "Samarinda",
      "Banjarmasin",
    ];
  } catch (error) {
    console.error("Error loading cities from localStorage:", error);
    return [];
  }
})();

const hobbies = [
  "Traveling",
  "Nonton Film",
  "Kuliner",
  "Fotografi",
  "Gaming",
  "Musik",
  "Olahraga",
  "Membaca",
  "Seni",
  "Memasak",
  "Hiking",
  "Yoga",
  "Renang",
  "Basket",
  "Badminton",
  "Sepak Bola",
  "Karaoke",
  "Belanja",
  "Kopi",
  "Podcast",
];

// Tambahkan opsi untuk ketersediaan
const AVAILABILITY_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "both", label: "Online & Offline" }
];

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    cities: string[];
    hobbies: string[];
    gender: string;
    minAge: number;
    maxAge: number;
    availability: string[];
  };
  onApply: (filters: any) => void;
}

export function FilterModal({ isOpen, onClose, filters, onApply }: FilterModalProps) {
  // Buat local state untuk mengelola perubahan filter di modal
  const [localFilters, setLocalFilters] = useState({
    cities: [],
    hobbies: [],
    gender: "",
    minAge: 18,
    maxAge: 40,
    availability: [], // Tambahkan default value untuk availability
    ...filters // Spread operator untuk menimpa dengan nilai dari props
  });

  // PERUBAHAN: State untuk menyimpan daftar kota dari localStorage
  const [availableCities, setAvailableCities] = useState<string[]>(cities);

  // Reset local filters ketika modal dibuka dengan props terbaru
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
      // PERUBAHAN: Perbarui daftar kota dari localStorage setiap kali modal dibuka
      try {
        const savedCities = localStorage.getItem("rentmate_cities");
        if (savedCities) {
          setAvailableCities(JSON.parse(savedCities));
        }
      } catch (error) {
        console.error("Error loading cities from localStorage:", error);
      }
    }
  }, [isOpen, filters]);

  const handleCityChange = (city: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      cities: checked
        ? [...prev.cities, city]
        : prev.cities.filter(c => c !== city)
    }));
  };

  const handleHobbyChange = (hobby: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      hobbies: checked
        ? [...prev.hobbies, hobby]
        : prev.hobbies.filter(h => h !== hobby)
    }));
  };

  // Tambahkan fungsi untuk menangani perubahan availability
  const handleAvailabilityChange = (availability: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      availability: checked
        ? [...prev.availability, availability]
        : prev.availability.filter(a => a !== availability)
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters = {
      cities: [],
      hobbies: [],
      gender: "",
      minAge: 18,
      maxAge: 40,
      availability: [],
    };
    setLocalFilters(defaultFilters);
  };

  // 🔥 PERBAIKAN: Tambahkan fungsi untuk menghitung jumlah filter yang aktif
  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.cities && localFilters.cities.length > 0) count++;
    if (localFilters.hobbies && localFilters.hobbies.length > 0) count++;
    if (localFilters.gender) count++;
    if (localFilters.minAge !== 18 || localFilters.maxAge !== 40) count++;
    if (localFilters.availability && localFilters.availability.length > 0) count++;
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Filter Pencarian</DialogTitle>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFiltersCount()} filter aktif
            </Badge>
          )}
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Gender Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">Gender</Label>
            <div className="flex gap-3">
              {["Pria", "Wanita"].map((gender) => (
                <label key={gender} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.gender === gender}
                    onCheckedChange={(checked) => {
                      setLocalFilters(prev => ({
                        ...prev,
                        gender: checked ? gender : ""
                      }));
                    }}
                  />
                  <span className="text-sm">{gender}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Age Range Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Rentang Usia: {localFilters.minAge} - {localFilters.maxAge} tahun
            </Label>
            <Slider
              value={[localFilters.minAge, localFilters.maxAge]}
              onValueChange={(value) => {
                setLocalFilters(prev => ({
                  ...prev,
                  minAge: value[0],
                  maxAge: value[1],
                }));
              }}
              max={65}
              min={17}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>17</span>
              <span>65</span>
            </div>
          </div>

          {/* Availability Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">Ketersediaan</Label>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.availability.includes(option.value)}
                    onCheckedChange={(checked) => handleAvailabilityChange(option.value, checked as boolean)}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* City Filter - PERUBAHAN: Gunakan availableCities dari state */}
          <div>
            <Label className="text-base font-medium mb-3 block">Kota</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableCities.map((city) => (
                <label key={city} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.cities.includes(city)}
                    onCheckedChange={(checked) => handleCityChange(city, checked as boolean)}
                  />
                  <span className="text-sm">{city}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hobby Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">Hobi / Skill</Label>
            <div className="grid grid-cols-2 gap-2">
              {hobbies.map((hobby) => (
                <label key={hobby} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.hobbies.includes(hobby)}
                    onCheckedChange={(checked) => handleHobbyChange(hobby, checked as boolean)}
                  />
                  <span className="text-sm">{hobby}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleApply}>
              Terapkan Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}