import { UserPlus, FileText, MousePointer, Banknote } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Daftar Sebagai Mitra",
    desc: "Daftar dan lengkapi profil kamu dengan informasi yang menarik",
  },
  {
    icon: FileText,
    step: "02",
    title: "Profil Tampil di Katalog",
    desc: "Profil kamu akan ditampilkan di katalog mitra untuk dilihat pengguna",
  },
  {
    icon: MousePointer,
    step: "03",
    title: "Pengguna Memilih Kamu",
    desc: "Pengguna memilih mitra dan melakukan pemesanan langsung",
  },
  {
    icon: Banknote,
    step: "04",
    title: "Mulai & Dapatkan Penghasilan",
    desc: "Lakukan aktivitas sesuai kesepakatan dan terima pembayaran",
  },
];

const HowToJoin = () => {
  return (
    <section id="cara-bergabung" className="py-20 gradient-hero-soft">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Cara Menjadi Mitra
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Proses mudah untuk mulai bergabung sebagai mitra
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, index) => (
              <div
                key={item.step}
                className="relative text-center p-6"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
                
                {/* Step circle */}
                <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-4 shadow-button">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Step number */}
                <span className="inline-block text-xs font-bold text-primary bg-accent px-3 py-1 rounded-full mb-3">
                  Langkah {item.step}
                </span>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowToJoin;