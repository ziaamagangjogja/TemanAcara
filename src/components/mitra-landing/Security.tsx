import { ShieldCheck, BookOpen, HeadphonesIcon, Lock } from "lucide-react";

const securityPoints = [
  {
    icon: ShieldCheck,
    title: "Verifikasi Mitra",
    desc: "Setiap mitra diverifikasi untuk keamanan",
  },
  {
    icon: BookOpen,
    title: "Aturan Interaksi Jelas",
    desc: "Panduan lengkap untuk interaksi profesional",
  },
  {
    icon: HeadphonesIcon,
    title: "Sistem Laporan & Bantuan",
    desc: "Tim support siap membantu 24/7",
  },
  {
    icon: Lock,
    title: "Perlindungan Data Pribadi",
    desc: "Data kamu terenkripsi dan aman",
  },
];

const Security = () => {
  return (
    <section id="keamanan" className="py-20 bg-secondary text-secondary-foreground">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Aman, Nyaman, dan Profesional
          </h2>
          <p className="text-secondary-foreground/70 max-w-xl mx-auto">
            Keamanan dan kenyamanan mitra adalah prioritas utama kami
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {securityPoints.map((point) => (
            <div
              key={point.title}
              className="text-center p-6 rounded-2xl bg-secondary-foreground/5 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                <point.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
              <p className="text-sm text-secondary-foreground/70">{point.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Security;
