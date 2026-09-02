export const cities = [
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

export const hobbies = [
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

export const bookingPurposes = [
  "Nongkrong / Ngobrol",
  "Dinner / Makan Malam",
  "Traveling / Liburan",
  "Event / Acara",
  "Nonton Film",
  "Belanja",
  "Olahraga Bareng",
  "Kerja / Meeting",
  "Pesta / Party",
  "Lainnya",
];

export interface Talent {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: "Pria" | "Wanita";
  photo: string;
  // HAPUS field gallery
  skills: string[];
  bio: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  rules: string[];
  availability: "online" | "offline" | "both";
  verified: boolean;
  email: string; // Tambahkan field email
  password: string; // Tambahkan field password
}

// Foto unik untuk setiap teman - tidak ada duplikasi
export const talents: Talent[] = [
  {
    id: "1",
    name: "Aisyah Putri",
    age: 24,
    city: "Jakarta",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face",
    email: "aisyahrentmate@gmail.com",
    password: "aisyah01",
    skills: ["Traveling", "Kuliner", "Fotografi"],
    bio: "Hai! Aku Aisyah, suka traveling dan eksplor tempat-tempat baru. Senang banget bisa jadi teman jalan kamu!",
    pricePerHour: 400000,
    rating: 4.9,
    reviewCount: 127,
    rules: ["Hanya teman sosial", "Pemesanan minimal 2 jam", "Lokasi publik saja"],
    availability: "both",
    verified: true,
  },
  {
    id: "2",
    name: "Rafi Pratama",
    age: 27,
    city: "Bandung",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&crop=face",
    email: "rafirentmate@gmail.com",
    password: "rafipratama02",
    skills: ["Olahraga", "Gaming", "Musik"],
    bio: "Cowok Bandung yang suka ngobrol santai dan main game. Bisa jadi teman gym atau nongkrong!",
    pricePerHour: 150000,
    rating: 4.7,
    reviewCount: 89,
    rules: ["Hanya teman sosial", "Bisa online atau offline"],
    availability: "both",
    verified: true,
  },
  {
    id: "3",
    name: "Maya Sari",
    age: 23,
    city: "Surabaya",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    email: "mayarentmate@gmail.com",
    password: "mayasari03",
    skills: ["Nonton Film", "Karaoke", "Belanja"],
    bio: "Cewek Surabaya yang fun dan seru! Suka nonton film, karaoke, dan shopping.",
    pricePerHour: 330000,
    rating: 4.8,
    reviewCount: 156,
    rules: ["Hanya teman sosial", "Tidak menerima pemesanan malam hari"],
    availability: "offline",
    verified: true,
  },
  {
    id: "4",
    name: "Dimas Arya",
    age: 26,
    city: "Yogyakarta",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    email: "dimasrentmate@gmail.com",
    password: "dimasarya04",
    skills: ["Seni", "Fotografi", "Traveling"],
    bio: "Seniman Jogja yang suka eksplor budaya dan tempat-tempat unik. Cocok buat jadi guide!",
    pricePerHour: 400000,
    rating: 4.6,
    reviewCount: 72,
    rules: ["Hanya teman sosial", "Pemesanan minimal 3 jam untuk traveling"],
    availability: "offline",
    verified: true,
  },
  {
    id: "5",
    name: "Sinta Dewi",
    age: 25,
    city: "Denpasar",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face",
    email: "sintarentmate@gmail.com",
    password: "sintadewi05",
    skills: ["Yoga", "Hiking", "Kuliner"],
    bio: "Cewek Bali yang aktif dan sehat! Suka yoga, hiking, dan eksplor kuliner.",
    pricePerHour: 340000,
    rating: 4.9,
    reviewCount: 201,
    rules: ["Hanya teman sosial", "Aktivitas outdoor diutamakan"],
    availability: "both",
    verified: true,
  },
  {
    id: "6",
    name: "Andi Wijaya",
    age: 28,
    city: "Jakarta",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face",
    email: "andirentmate@gmail.com",
    password: "andiwijaya06",
    skills: ["Kerja", "Networking", "Kopi"],
    bio: "Teman profesional untuk meeting, event bisnis, atau sekadar ngopi sambil brainstorming.",
    pricePerHour: 300000,
    rating: 4.8,
    reviewCount: 93,
    rules: ["Setting profesional", "Hanya teman sosial"],
    availability: "both",
    verified: true,
  },
  {
    id: "7",
    name: "Dewi Anggraini",
    age: 22,
    city: "Medan",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    email: "dewirentmate@gmail.com",
    password: "dewianggra07",
    skills: ["Kuliner", "Traveling", "Fotografi"],
    bio: "Pecinta kuliner dari Medan! Suka eksplor kuliner nusantara dan traveling ke tempat baru.",
    pricePerHour: 210000,
    rating: 4.7,
    reviewCount: 64,
    rules: ["Hanya teman sosial", "Pemesanan minimal 2 jam", "Lokasi publik"],
    availability: "offline",
    verified: true,
  },
  {
    id: "8",
    name: "Fajar Nugroho",
    age: 29,
    city: "Semarang",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face",
    email: "fajarrentmate@gmail.com",
    password: "fajarnugroho08",
    skills: ["Olahraga", "Musik", "Gaming"],
    bio: "Cowok Semarang yang energik! Suka olahraga, main musik, dan gaming.",
    pricePerHour: 240000,
    rating: 4.5,
    reviewCount: 45,
    rules: ["Hanya teman sosial", "Bisa online atau offline"],
    availability: "both",
    verified: true,
  },
  {
    id: "9",
    name: "Putri Handayani",
    age: 24,
    city: "Makassar",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    email: "putrirentmate@gmail.com",
    password: "putrihandayani09",
    skills: ["Belanja", "Kuliner", "Karaoke"],
    bio: "Cewek Makassar yang ramah! Hobi belanja, makan enak, dan karaoke.",
    pricePerHour: 320000,
    rating: 4.8,
    reviewCount: 88,
    rules: ["Lokasi publik saja", "Hanya teman sosial"],
    availability: "offline",
    verified: true,
  },
  {
    id: "10",
    name: "Rizky Ramadhan",
    age: 25,
    city: "Palembang",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=400&fit=crop&crop=face",
    email: "rizkyrentmate@gmail.com",
    password: "rizkyramadhan10",
    skills: ["Traveling", "Fotografi", "Olahraga"],
    bio: "Cowok Palembang yang adventurous! Suka traveling, foto-foto, dan olahraga outdoor.",
    pricePerHour: 290000,
    rating: 4.6,
    reviewCount: 52,
    rules: ["Hanya teman sosial", "Pemesanan minimal 2 jam"],
    availability: "offline",
    verified: true,
  },
  {
    id: "11",
    name: "Anisa Rahma",
    age: 23,
    city: "Tangerang",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
    email: "anisarentmate@gmail.com",
    password: "anisarahma11",
    skills: ["Nonton Film", "Kopi", "Membaca"],
    bio: "Bookworm yang suka nongkrong di cafe! Teman ngobrol sambil ngopi atau nonton film.",
    pricePerHour:210000,
    rating: 4.7,
    reviewCount: 73,
    rules: ["Hanya teman sosial", "Lokasi cafe atau bioskop"],
    availability: "offline",
    verified: true,
  },
  {
    id: "12",
    name: "Bima Sakti",
    age: 27,
    city: "Depok",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=face",
    email: "bimarentmate@gmail.com",
    password: "bimasakti12",
    skills: ["Gaming", "Musik", "Podcast"],
    bio: "Gamer dan podcaster! Suka ngobrol tentang tech, gaming, dan musik.",
    pricePerHour: 300000,
    rating: 4.5,
    reviewCount: 41,
    rules: ["Hanya teman sosial", "Bisa online atau offline"],
    availability: "both",
    verified: true,
  },
  {
    id: "13",
    name: "Citra Lestari",
    age: 26,
    city: "Bekasi",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=face",
    email: "citrarentmate@gmail.com",
    password: "citralestari13",
    skills: ["Belanja", "Kuliner", "Traveling"],
    bio: "Shopping buddy yang asyik! Suka eksplor mall dan cari hidden gems kuliner.",
    pricePerHour: 130000,
    rating: 4.8,
    reviewCount: 95,
    rules: ["Hanya teman sosial", "Lokasi publik"],
    availability: "offline",
    verified: true,
  },
  {
    id: "14",
    name: "Eko Prasetyo",
    age: 30,
    city: "Malang",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face",
    email: "ekorentmate@gmail.com",
    password: "ekoprasetyo14",
    skills: ["Hiking", "Fotografi", "Kopi"],
    bio: "Local guide Malang! Tau tempat-tempat keren untuk hiking dan cafe aesthetic.",
    pricePerHour: 150000,
    rating: 4.9,
    reviewCount: 112,
    rules: ["Hanya teman sosial", "Aktivitas outdoor"],
    availability: "offline",
    verified: true,
  },
  {
    id: "15",
    name: "Fitri Amalia",
    age: 22,
    city: "Bogor",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face",
    email: "fitrarentmate@gmail.com",
    password: "fitriamalia15",
    skills: ["Kuliner", "Hiking", "Fotografi"],
    bio: "Cewek Bogor yang suka nature! Hiking ke Puncak atau hunting kuliner.",
    pricePerHour: 200000,
    rating: 4.6,
    reviewCount: 58,
    rules: ["Hanya teman sosial", "Aktivitas outdoor"],
    availability: "offline",
    verified: true,
  },
  {
    id: "16",
    name: "Gilang Permana",
    age: 28,
    city: "Batam",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=400&h=400&fit=crop&crop=face",
    email: "gilangrentmate@gmail.com",
    password: "gilangpermana16",
    skills: ["Traveling", "Renang", "Kuliner"],
    bio: "Island hopper dari Batam! Tau semua spot pantai dan island keren.",
    pricePerHour: 140000,
    rating: 4.7,
    reviewCount: 67,
    rules: ["Hanya teman sosial", "Pemesanan minimal 4 jam"],
    availability: "offline",
    verified: true,
  },
  {
    id: "17",
    name: "Hana Safira",
    age: 24,
    city: "Pekanbaru",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
    email: "hanarentmate@gmail.com",
    password: "hanasafira17",
    skills: ["Kuliner", "Belanja", "Karaoke"],
    bio: "Cewek Pekanbaru yang fun! Suka jajan, belanja, dan karaoke.",
    pricePerHour: 205000,
    rating: 4.6,
    reviewCount: 49,
    rules: ["Hanya teman sosial", "Lokasi publik"],
    availability: "offline",
    verified: true,
  },
  {
    id: "18",
    name: "Irfan Hakim",
    age: 26,
    city: "Bandar Lampung",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1553267751-1c148a7280a1?w=400&h=400&fit=crop&crop=face",
    email: "irfanrentmate@gmail.com",
    password: "irfanhakim18",
    skills: ["Olahraga", "Traveling", "Fotografi"],
    bio: "Adventure seeker dari Lampung! Suka explore alam dan olahraga outdoor.",
    pricePerHour: 160000,
    rating: 4.5,
    reviewCount: 38,
    rules: ["Hanya teman sosial", "Aktivitas outdoor"],
    availability: "both",
    verified: true,
  },
  {
    id: "19",
    name: "Julia Puspita",
    age: 25,
    city: "Padang",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    email: "juliarentmate@gmail.com",
    password: "juliapuspita19",
    skills: ["Kuliner", "Traveling", "Seni"],
    bio: "Pecinta kuliner Padang! Tau semua tempat makan enak dan hidden gems.",
    pricePerHour: 200000,
    rating: 4.8,
    reviewCount: 76,
    rules: ["Hanya teman sosial", "Lokasi restoran atau cafe"],
    availability: "offline",
    verified: true,
  },
  {
    id: "20",
    name: "Kevin Susanto",
    age: 27,
    city: "Manado",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face",
    email: "kevinrentmate@gmail.com",
    password: "kevinprasetyo13",
    skills: ["Renang", "Traveling", "Kuliner"],
    bio: "Diving enthusiast dari Manado! Tau spot snorkeling dan diving terbaik.",
    pricePerHour: 150000,
    rating: 4.9,
    reviewCount: 89,
    rules: ["Hanya teman sosial", "Aktivitas air"],
    availability: "offline",
    verified: true,
  },
  {
    id: "21",
    name: "Laras Wulandari",
    age: 23,
    city: "Balikpapan",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face",
    email: "larasrentmate@gmail.com",
    password: "laraswulandari14",
    skills: ["Kopi", "Nonton Film", "Belanja"],
    bio: "Coffee addict dari Balikpapan! Tau semua cafe keren dan bioskop nyaman.",
    pricePerHour: 110000,
    rating: 4.6,
    reviewCount: 54,
    rules: ["Hanya teman sosial", "Cafe atau mall"],
    availability: "offline",
    verified: true,
  },
  {
    id: "22",
    name: " Faisal Algazali",
    age: 29,
    city: "Solo",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=400&h=400&fit=crop&crop=face",
    email: "faisalrentmate@gmail.com",
    password: "faisalgazali15",
    skills: ["Seni", "Musik", "Traveling"],
    bio: "Pecinta budaya Jawa! Expert tentang sejarah Solo, keraton, dan seni tradisional.",
    pricePerHour: 190000,
    rating: 4.8,
    reviewCount: 98,
    rules: ["Hanya teman sosial", "Wisata budaya"],
    availability: "offline",
    verified: true,
  },
  {
    id: "23",
    name: "Nadia Kusuma",
    age: 24,
    city: "Cirebon",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
    email: "nadiarentmate@gmail.com",
    password: "nadiakusuma16",
    skills: ["Kuliner", "Traveling", "Fotografi"],
    bio: "Cirebon food explorer! Tau semua warung legendaris dan spot foto aesthetic.",
    pricePerHour: 320000,
    rating: 4.7,
    reviewCount: 62,
    rules: ["Hanya teman sosial", "Wisata kuliner"],
    availability: "offline",
    verified: true,
  },
  {
    id: "24",
    name: "Oscar Wijaya",
    age: 26,
    city: "Pontianak",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=400&h=400&fit=crop&crop=face",
    email: "oscarrentmate@gmail.com",
    password: "oscarwijaya17",
    skills: ["Traveling", "Kuliner", "Fotografi"],
    bio: "Explorer Kalimantan Barat! Tau tempat-tempat hidden gem dan kuliner autentik.",
    pricePerHour: 100000,
    rating: 4.5,
    reviewCount: 43,
    rules: ["Hanya teman sosial", "Petualangan"],
    availability: "both",
    verified: true,
  },
  {
    id: "25",
    name: "Patricia Angeline",
    age: 22,
    city: "Samarinda",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=400&fit=crop&crop=face",
    email: "patriciarentmate@gmail.com",
    password: "patriciaangeline18",
    skills: ["Belanja", "Karaoke", "Kuliner"],
    bio: "Fun girl dari Samarinda! Suka hangout, karaoke, dan eksplor tempat makan.",
    pricePerHour: 105000,
    rating: 4.6,
    reviewCount: 47,
    rules: ["Hanya teman sosial", "Lokasi publik"],
    availability: "offline",
    verified: true,
  },
  {
    id: "26",
    name: "Qori Akbar",
    age: 28,
    city: "Banjarmasin",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=400&fit=crop&crop=face",
    email: "qorirentmate@gmail.com",
    password: "qorihakbar19",
    skills: ["Traveling", "Fotografi", "Kuliner"],
    bio: "Pasar Terapung expert! Local guide untuk wisata sungai dan kuliner Banjarmasin.",
    pricePerHour: 120000,
    rating: 4.7,
    reviewCount: 56,
    rules: ["Hanya teman sosial", "Wisata sungai"],
    availability: "offline",
    verified: true,
  },
  {
    id: "27",
    name: "Rina Maharani",
    age: 25,
    city: "Jakarta",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=400&fit=crop&crop=face",
    email: "rinarentmate@gmail.com",
    password: "rinamaharani20",
    skills: ["Networking", "Kopi", "Kerja"],
    bio: "Business companion Jakarta! Siap menemani meeting, networking event, atau brainstorming.",
    pricePerHour: 180000,
    rating: 4.9,
    reviewCount: 87,
    rules: ["Setting profesional", "Hanya teman sosial"],
    availability: "both",
    verified: true,
  },
  {
    id: "28",
    name: "Satria Wibowo",
    age: 30,
    city: "Surabaya",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop&crop=face",
    email: "satriarentmate@gmail.com",
    password: "satriawibowo21",
    skills: ["Kerja", "Networking", "Olahraga"],
    bio: "Executive companion Surabaya! Pengalaman menemani meeting bisnis, golf, atau dinner formal.",
    pricePerHour: 220000,
    rating: 4.8,
    reviewCount: 71,
    rules: ["Pakaian formal", "Hanya teman sosial"],
    availability: "both",
    verified: true,
  },
  {
    id: "29",
    name: "Tiara Permatasari",
    age: 23,
    city: "Bandung",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1596215143922-eedeaba0d91c?w=400&h=400&fit=crop&crop=face",
    email: "tiararentmate@gmail.com",
    password: "tiarapermatasari22",
    skills: ["Kopi", "Fotografi", "Musik"],
    bio: "Cafe hopper Bandung! Tau semua cafe aesthetic dan live music venue.",
    pricePerHour: 115000,
    rating: 4.7,
    reviewCount: 83,
    rules: ["Hanya teman sosial", "Cafe setting"],
    availability: "offline",
    verified: true,
  },
  {
    id: "30",
    name: "Umar Farhan",
    age: 27,
    city: "Yogyakarta",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1558222218-b7b54eede3f3?w=400&h=400&fit=crop&crop=face",
    email: "umarrentmate@gmail.com",
    password: "umarfarhan23",
    skills: ["Seni", "Fotografi", "Musik"],
    bio: "Seniman dan musisi Jogja! Bisa jadi guide untuk wisata seni dan galeri.",
    pricePerHour: 190000,
    rating: 4.6,
    reviewCount: 59,
    rules: ["Hanya teman sosial", "Fokus seni & budaya"],
    availability: "both",
    verified: true,
  },
  {
    id: "31",
    name: "Vera Anjani",
    age: 24,
    city: "Denpasar",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=400&h=400&fit=crop&crop=face",
    email: "verarentmate@gmail.com",
    password: "veraanjani24",
    skills: ["Yoga", "Meditasi", "Kuliner"],
    bio: "Wellness companion Bali! Bisa temani yoga, meditasi, atau eksplor healthy cafe.",
    pricePerHour: 135000,
    rating: 4.9,
    reviewCount: 104,
    rules: ["Hanya teman sosial", "Fokus wellness"],
    availability: "both",
    verified: true,
  },
  {
    id: "32",
    name: "Wahyu Pratama",
    age: 26,
    city: "Jakarta",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=400&h=400&fit=crop&crop=face",
    email: "wahyurentmate@gmail.com",
    password: "wahyupratama25",
    skills: ["Gaming", "Nonton Film", "Kuliner"],
    bio: "Gaming buddy Jakarta! Bisa temani main di gaming cafe atau nonton premiere.",
    pricePerHour: 100000,
    rating: 4.5,
    reviewCount: 48,
    rules: ["Hanya teman sosial", "Setting kasual"],
    availability: "both",
    verified: true,
  },
  {
    id: "33",
    name: "Yoga Aditya",
    age: 29,
    city: "Semarang",
    gender: "Pria",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    email: "yogarentmate@gmail.com",
    password: "yogaaaditya26",
    skills: ["Traveling", "Fotografi", "Hiking"],
    bio: "Adventure photographer Semarang! Bisa jadi guide untuk trip ke Dieng atau Karimunjawa.",
    pricePerHour: 105000,
    rating: 4.8,
    reviewCount: 77,
    rules: ["Hanya teman sosial", "Petualangan"],
    availability: "offline",
    verified: true,
  },
  {
    id: "34",
    name: "Zahra Putri",
    age: 25,
    city: "Makassar",
    gender: "Wanita",
    photo: "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=400&h=400&fit=crop&crop=face",
    email: "zahrarentmate@gmail.com",
    password: "zahraputri27",
    skills: ["Kuliner", "Traveling", "Renang"],
    bio: "Seafood hunter Makassar! Expert kuliner laut dan spot pantai tersembunyi.",
    pricePerHour: 125000,
    rating: 4.8,
    reviewCount: 91,
    rules: ["Hanya teman sosial", "Aktivitas pantai"],
    availability: "offline",
    verified: true,
  },
];

export interface Review {
  id: string;
  talentId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  date: string;
}

// Reviews with unique reviewers - different photos and comments
export const reviews: Review[] = [
  {
    id: "r1",
    talentId: "1",
    userName: "Budi Santoso",
    userPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Aisyah sangat ramah dan asik diajak ngobrol. Traveling ke Bali jadi lebih seru!",
    date: "2024-01-15",
  },
  {
    id: "r2",
    talentId: "1",
    userName: "Diana Putri",
    userPhoto: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Teman belanja yang asyik! Recommended banget untuk shopping trip.",
    date: "2024-01-10",
  },
  {
    id: "r3",
    talentId: "2",
    userName: "Rina Melati",
    userPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    comment: "Rafi orangnya seru dan humble, cocok buat teman nongkrong santai!",
    date: "2024-01-12",
  },
  {
    id: "r4",
    talentId: "3",
    userName: "Eko Wijaya",
    userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Maya tau banyak tempat karaoke keren di Surabaya. Seru banget!",
    date: "2024-01-08",
  },
  {
    id: "r5",
    talentId: "4",
    userName: "Sari Dewi",
    userPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Dimas jadi guide wisata budaya yang sangat informatif. Jogja trip jadi berkesan!",
    date: "2024-01-05",
  },
  {
    id: "r6",
    talentId: "5",
    userName: "Andi Prasetyo",
    userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Yoga session sama Sinta bikin refreshing. Tempatnya juga bagus pilihannya!",
    date: "2024-01-03",
  },
  {
    id: "r7",
    talentId: "6",
    userName: "Maya Kusuma",
    userPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Andi sangat professional, menemani meeting bisnis dengan baik.",
    date: "2024-01-02",
  },
  {
    id: "r8",
    talentId: "7",
    userName: "Reza Firmansyah",
    userPhoto: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    comment: "Dewi tau semua hidden gem kuliner Medan. Mantap rekomendasinya!",
    date: "2023-12-28",
  },
  {
    id: "r9",
    talentId: "8",
    userName: "Linda Wati",
    userPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Fajar asik banget diajak ngobrol, teman gym yang supportive!",
    date: "2023-12-25",
  },
  {
    id: "r10",
    talentId: "9",
    userName: "Ahmad Fadli",
    userPhoto: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Putri teman shopping yang tau banyak discount. Super helpful!",
    date: "2023-12-22",
  },
  {
    id: "r11",
    talentId: "10",
    userName: "Dewi Kartika",
    userPhoto: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    comment: "Rizky guide yang sabar dan tau banyak spot foto bagus di Palembang.",
    date: "2023-12-20",
  },
  {
    id: "r12",
    talentId: "11",
    userName: "Faisal Rahman",
    userPhoto: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Anisa teman nonton yang asik, selera filmnya bagus banget!",
    date: "2023-12-18",
  },
  {
    id: "r13",
    talentId: "12",
    userName: "Indah Permata",
    userPhoto: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    comment: "Bima asik diajak diskusi tentang gaming dan tech. Knowledgeable!",
    date: "2023-12-15",
  },
  {
    id: "r14",
    talentId: "13",
    userName: "Joko Susilo",
    userPhoto: "https://images.unsplash.com/photo-1480429370612-2cd0bf98cbfd?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Citra shopping buddy terbaik! Tau semua promo dan tempat bagus.",
    date: "2023-12-12",
  },
  {
    id: "r15",
    talentId: "14",
    userName: "Kartini Dewi",
    userPhoto: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Eko local guide Malang terbaik! Hiking ke Bromo jadi memorable banget.",
    date: "2023-12-10",
  },
];

export interface Testimonial {
  id: string;
  name: string;
  photo: string;
  role: string;
  comment: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Sarah Amelia",
    photo: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=face",
    role: "Pengusaha",
    comment: "RentMate sangat membantu saya mencari teman untuk event bisnis. Professional dan aman!",
  },
  {
    id: "t2",
    name: "Ahmad Fauzi",
    photo: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&crop=face",
    role: "Traveler",
    comment: "Traveling sendirian jadi lebih seru dengan RentMate. Bisa dapat local guide yang asik!",
  },
  {
    id: "t3",
    name: "Lisa Permata",
    photo: "/assets/teman/lisa-permata.jpg",
    role: "Content Creator",
    comment: "Platform yang sangat user-friendly dan teman yang berkualitas. Love it!",
  },
];

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: "user" | "talent";
  message: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

export interface Booking {
  id: string;
  talentId: string;
  userId: string;
  duration: number;
  purpose: string;
  type: "online" | "offline";
  date: string;
  time: string;
  status: "active" | "completed" | "cancelled";
  totalPrice: number;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  bookingId: string;
  talentId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

// Mock bookings - each booking creates a unique chat
export const mockBookings: Booking[] = [
  {
    id: "booking-1",
    talentId: "1",
    userId: "user1",
    duration: 2,
    purpose: "Nongkrong / Ngobrol",
    type: "offline",
    date: "2024-01-20",
    time: "14:00",
    status: "active",
    totalPrice: 300000,
    createdAt: "2024-01-18T10:00:00",
  },
  {
    id: "booking-2",
    talentId: "3",
    userId: "user1",
    duration: 3,
    purpose: "Traveling / Liburan",
    type: "offline",
    date: "2024-01-22",
    time: "10:00",
    status: "active",
    totalPrice: 390000,
    createdAt: "2024-01-19T15:00:00",
  },
  {
    id: "booking-3",
    talentId: "5",
    userId: "user1",
    duration: 2,
    purpose: "Olahraga Bareng",
    type: "offline",
    date: "2024-01-15",
    time: "07:00",
    status: "completed",
    totalPrice: 280000,
    createdAt: "2024-01-10T09:00:00",
  },
];

// Each booking has its own chat room with unique messages
export const mockChatRooms: ChatRoom[] = [
  {
    id: "chat-1",
    bookingId: "booking-1",
    talentId: "1",
    lastMessage: "Siap! Aku tunggu di lobby ya. Sampai ketemu! 😊",
    lastMessageTime: "2024-01-20T10:36:00",
    unreadCount: 2,
    messages: [
      {
        id: "m1-1",
        senderId: "user1",
        senderType: "user",
        message: "Halo Aisyah! Booking saya sudah dikonfirmasi ya?",
        timestamp: "2024-01-20T10:30:00",
        status: "read",
      },
      {
        id: "m1-2",
        senderId: "1",
        senderType: "talent",
        message: "Halo! Iya sudah dikonfirmasi. Kita ketemuan di mana ya?",
        timestamp: "2024-01-20T10:32:00",
        status: "read",
      },
      {
        id: "m1-3",
        senderId: "user1",
        senderType: "user",
        message: "Di Grand Indonesia ya, jam 2 siang. Bisa kan?",
        timestamp: "2024-01-20T10:35:00",
        status: "read",
      },
      {
        id: "m1-4",
        senderId: "1",
        senderType: "talent",
        message: "Siap! Aku tunggu di lobby ya. Sampai ketemu! 😊",
        timestamp: "2024-01-20T10:36:00",
        status: "delivered",
      },
    ],
  },
  {
    id: "chat-2",
    bookingId: "booking-2",
    talentId: "3",
    lastMessage: "Oke, besok ya! Jangan lupa bawa kamera 📸",
    lastMessageTime: "2024-01-19T15:20:00",
    unreadCount: 0,
    messages: [
      {
        id: "m2-1",
        senderId: "user1",
        senderType: "user",
        message: "Hai Maya! Aku booking untuk traveling ke Bromo nih",
        timestamp: "2024-01-19T15:00:00",
        status: "read",
      },
      {
        id: "m2-2",
        senderId: "3",
        senderType: "talent",
        message: "Wah seru banget! Aku udah pernah ke sana, tempatnya keren!",
        timestamp: "2024-01-19T15:05:00",
        status: "read",
      },
      {
        id: "m2-3",
        senderId: "user1",
        senderType: "user",
        message: "Asik! Kita berangkat jam 10 pagi ya dari Surabaya",
        timestamp: "2024-01-19T15:15:00",
        status: "read",
      },
      {
        id: "m2-4",
        senderId: "3",
        senderType: "talent",
        message: "Oke, besok ya! Jangan lupa bawa kamera 📸",
        timestamp: "2024-01-19T15:20:00",
        status: "read",
      },
    ],
  },
  {
    id: "chat-3",
    bookingId: "booking-3",
    talentId: "5",
    lastMessage: "Makasih ya udah yoga bareng! Next time lagi ya 🧘‍♀️",
    lastMessageTime: "2024-01-15T10:00:00",
    unreadCount: 0,
    messages: [
      {
        id: "m3-1",
        senderId: "user1",
        senderType: "user",
        message: "Hai Sinta! Aku mau yoga di pantai besok pagi",
        timestamp: "2024-01-14T20:00:00",
        status: "read",
      },
      {
        id: "m3-2",
        senderId: "5",
        senderType: "talent",
        message: "Perfect! Aku rekomendasiin Sanur Beach, sunrise-nya bagus banget",
        timestamp: "2024-01-14T20:15:00",
        status: "read",
      },
      {
        id: "m3-3",
        senderId: "user1",
        senderType: "user",
        message: "Terima kasih sessionnya tadi! Refreshing banget 😊",
        timestamp: "2024-01-15T09:30:00",
        status: "read",
      },
      {
        id: "m3-4",
        senderId: "5",
        senderType: "talent",
        message: "Makasih ya udah yoga bareng! Next time lagi ya 🧘‍♀️",
        timestamp: "2024-01-15T10:00:00",
        status: "read",
      },
    ],
  },
];

// Contextual chat responses based on message content
export const getContextualResponse = (userMessage: string, talentName: string): string => {
  const message = userMessage.toLowerCase();
  
  // Time/Schedule related
  if (message.includes("jam") || message.includes("waktu") || message.includes("kapan") || message.includes("schedule")) {
    const responses = [
      `Aku available mulai jam 10 pagi sampai jam 8 malam ya. Kamu prefer jam berapa?`,
      `Untuk besok aku free sepanjang hari. Mau ketemuan jam berapa?`,
      `Oke, jam segitu aku bisa. Langsung confirm ya!`,
      `Waktunya pas banget, aku lagi free jam segitu!`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Location related
  if (message.includes("dimana") || message.includes("lokasi") || message.includes("tempat") || message.includes("alamat") || message.includes("ketemu")) {
    const responses = [
      `Aku biasanya prefer ketemuan di tempat publik yang nyaman. Ada preferensi cafe atau mall?`,
      `Gimana kalau kita ketemu di lobby mall aja? Lebih gampang nyarinya`,
      `Aku bisa menyesuaikan dengan lokasimu kok. Kamu lebih prefer di daerah mana?`,
      `Oke, aku cari lokasi yang enak untuk kita hangout ya!`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Price/Payment related
  if (message.includes("harga") || message.includes("bayar") || message.includes("biaya") || message.includes("tarif")) {
    const responses = [
      `Untuk detail harga sudah ada di profil aku ya. Ada yang mau ditanyakan lagi?`,
      `Harga sudah include semua, tidak ada biaya tambahan. Tenang aja!`,
      `Pembayaran bisa langsung lewat platform, aman dan terjamin!`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Activity related
  if (message.includes("ngapain") || message.includes("aktivitas") || message.includes("plan") || message.includes("acara")) {
    const responses = [
      `Kita bisa sesuaikan dengan mood kamu nanti. Mau santai atau eksplor?`,
      `Aku punya beberapa rekomendasi tempat seru! Nanti aku share ya`,
      `Kita bisa ngobrol dulu, terus lanjut ke aktivitas yang kamu mau`,
      `Bebas mau ngapain aja, yang penting kita enjoy bareng! 😊`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Greeting
  if (message.includes("halo") || message.includes("hai") || message.includes("hi") || message.includes("hey")) {
    const responses = [
      `Hai juga! Senang bisa connect sama kamu. Ada yang bisa aku bantu?`,
      `Halo! Makasih udah booking aku. Yuk kita koordinasi untuk ketemuan nanti`,
      `Hey! Excited banget nih buat hangout bareng! 😊`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Thank you
  if (message.includes("terima kasih") || message.includes("makasih") || message.includes("thanks")) {
    const responses = [
      `Sama-sama! Senang bisa bantu 😊`,
      `No problem! Kalau ada yang perlu ditanyain lagi, feel free ya!`,
      `Makasih juga udah percaya sama aku!`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Confirmation
  if (message.includes("oke") || message.includes("ok") || message.includes("siap") || message.includes("deal")) {
    const responses = [
      `Oke siap! Sampai ketemu nanti ya! 👋`,
      `Perfect! Aku tunggu kabar selanjutnya`,
      `Noted! Kalau ada perubahan, langsung kabarin aja ya`,
      `Siap! Excited banget nih! 😊`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Food/Culinary
  if (message.includes("makan") || message.includes("kuliner") || message.includes("resto") || message.includes("cafe")) {
    const responses = [
      `Wah, aku tau beberapa tempat makan enak di sekitar sini! Mau coba?`,
      `Aku punya list cafe aesthetic yang bagus buat foto-foto juga 📸`,
      `Kalau soal kuliner, serahkan sama aku! Aku tau hidden gems-nya`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Default responses
  const defaultResponses = [
    `Oke, noted! Ada lagi yang mau dibahas?`,
    `Sip, aku mengerti. Lanjut ke hal lain?`,
    `Baik, terima kasih infonya!`,
    `Oke, aku catat ya. Kalau ada perubahan, langsung kabarin!`,
    `Got it! Sampai ketemu nanti ya 😊`,
  ];
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

// Legacy export for backward compatibility
export const mockChats: ChatMessage[] = mockChatRooms[0]?.messages || [];