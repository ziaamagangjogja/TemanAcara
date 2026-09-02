import { Scale, User, Users, Calendar, AlertTriangle, Gavel, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TermsConditions() {
  const sections = [
    {
      icon: Scale,
      title: "1. Ketentuan Umum",
      content: [
        "RentMate adalah platform teman profesional untuk kegiatan sosial",
        "RentMate BUKAN layanan kencan, escort, atau layanan seksual dalam bentuk apapun",
        "Semua aktivitas pertemanan bersifat sosial, legal, dan profesional",
        "Dengan menggunakan RentMate, Anda menyetujui seluruh syarat dan ketentuan ini",
      ],
    },
    {
      icon: User,
      title: "2. Akun Pengguna",
      content: [
        "Satu akun hanya untuk satu identitas — tidak boleh berbagi akun",
        "Identitas yang didaftarkan harus asli dan tidak boleh dipalsukan",
        "Pengguna tidak diperbolehkan berpindah role (user/teman) tanpa verifikasi",
        "Pengguna bertanggung jawab penuh atas keamanan akun masing-masing",
      ],
    },
    {
      icon: Users,
      title: "3. Teman",
      content: [
        "Semua teman yang tampil di platform sudah aktif dan terverifikasi",
        "Tidak ada pendaftaran teman baru dari pengguna biasa melalui aplikasi",
        "Identitas dan foto teman adalah asli dan tidak berubah-ubah",
        "Teman wajib menjaga profesionalisme dan etika selama pertemanan",
      ],
    },
    {
      icon: Calendar,
      title: "4. Pemesanan",
      content: [
        "Pemesanan dilakukan per jam sesuai durasi yang dipilih pengguna",
        "Tidak tersedia pemesanan harian, mingguan, atau bulanan",
        "Fitur obrolan hanya aktif setelah pemesanan berhasil dikonfirmasi",
        "Pembatalan pemesanan tunduk pada kebijakan pembatalan yang berlaku",
      ],
    },
    {
      icon: AlertTriangle,
      title: "5. Larangan Keras",
      content: [
        "❌ Menyebarkan atau meminta konten seksual dalam bentuk apapun",
        "❌ Melakukan pelecehan verbal, fisik, atau psikologis",
        "❌ Mengajak atau melakukan aktivitas ilegal",
        "❌ Menyalahgunakan platform untuk tujuan di luar pertemanan sosial",
        "❌ Memberikan informasi palsu atau menyesatkan",
        "❌ Melakukan transaksi di luar sistem RentMate",
      ],
    },
    {
      icon: Gavel,
      title: "6. Sanksi Pelanggaran",
      content: [
        "Peringatan tertulis untuk pelanggaran ringan pertama kali",
        "Suspend sementara (7-30 hari) untuk pelanggaran berulang",
        "Penonaktifan akun permanen untuk pelanggaran berat",
        "Pelaporan ke pihak berwajib untuk tindakan kriminal",
      ],
    },
    {
      icon: ShieldCheck,
      title: "7. Peran Admin",
      content: [
        "Admin hanya bertugas mengelola sistem dan moderasi platform",
        "Admin tidak berpartisipasi dalam obrolan atau pemesanan",
        "Keputusan admin terkait pelanggaran bersifat final",
        "Admin berhak menangguhkan akun tanpa pemberitahuan jika terjadi pelanggaran berat",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Syarat & Ketentuan <span className="text-gradient">RentMate</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dengan menggunakan layanan RentMate, Anda menyetujui untuk mematuhi 
            syarat dan ketentuan yang berlaku di bawah ini.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Terakhir diperbarui: 23 Desember 2024
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.title} 
                className="p-6 md:p-8 animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">{section.title}</h2>
                    <ul className="space-y-3">
                      {section.content.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Agreement Note */}
        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-2">
            <p className="font-medium text-foreground">
              Dengan menggunakan RentMate, Anda menyatakan telah membaca dan menyetujui seluruh syarat dan ketentuan di atas.
            </p>
            <p className="text-muted-foreground text-sm">
              Pertanyaan? Hubungi{" "}
              <a href="mailto:support@rentmate.id" className="text-primary font-medium hover:underline">
                support@rentmate.id
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
