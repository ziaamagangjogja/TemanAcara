import { Users, UserCheck, MapPin, Star } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "10K+",
    label: "Pengguna Aktif",
  },
  {
    icon: UserCheck,
    value: "500+",
    label: "Mitra Terverifikasi",
  },
  {
    icon: MapPin,
    value: "25+",
    label: "Kota di Indonesia",
  },
  {
    icon: Star,
    value: "4.8",
    label: "Penilaian Rata-rata",
  },
];

const Stats = () => {
  return (
    <section className="py-8 bg-card border-y border-border">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center animate-count-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
                <stat.icon className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
