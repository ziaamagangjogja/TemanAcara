import { 
  Clock, 
  Wallet, 
  Users, 
  CreditCard, 
  Shield,
  Eye,
  Check
} from "lucide-react";
import benefitsFlexible from "@/assets/mitra-landing/benefits-flexible.jpg"

const benefits = [
  {
    icon: Clock,
    title: "Bebas Mengatur Jadwal",
    desc: "Tentukan sendiri kapan kamu mau aktif",
  },
  {
    icon: Wallet,
    title: "Penghasilan Fleksibel",
    desc: "Tambahan income sesuai waktu luangmu",
  },
  {
    icon: Users,
    title: "Tidak Ada Sistem Match",
    desc: "Dipilih langsung oleh pengguna dari katalog",
  },
  {
    icon: CreditCard,
    title: "Pembayaran Aman",
    desc: "Sistem pembayaran yang terjamin",
  },
  {
    icon: Shield,
    title: "Privasi Terjaga",
    desc: "Data pribadi kamu aman terlindungi",
  },
  {
    icon: Eye,
    title: "Profil Tampil di Katalog",
    desc: "Ditampilkan ke ribuan pengguna aktif",
  },
];

const Benefits = () => {
  return (
    <section id="keuntungan" className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Kenapa Bergabung Jadi Mitra?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Keuntungan yang kamu dapatkan sebagai mitra FriendShip
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Benefits list */}
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-soft transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-gradient-hero flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right side - Photo */}
          <div className="relative hidden lg:flex justify-center">
            <div className="relative">
              {/* Main photo */}
              <div className="w-[400px] h-[500px] rounded-3xl overflow-hidden shadow-card">
                <img 
                  src={benefitsFlexible} 
                  alt="Bekerja fleksibel sebagai mitra" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/40 rounded-full blur-2xl" />
              
              {/* Floating badge */}
              <div className="absolute top-6 -left-8 bg-card shadow-lg rounded-2xl px-4 py-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Fleksibel & Modern</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;