import { Shield, Lock, MessageSquare, UserCheck, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const sections = [
    {
      icon: UserCheck,
      title: "1. Informasi yang Kami Kumpulkan",
      content: [
        "Nama lengkap, alamat email, dan foto profil yang Anda berikan saat mendaftar",
        "Data pemesanan termasuk riwayat, durasi, dan tujuan pertemanan",
        "Riwayat obrolan yang disimpan untuk keamanan dan moderasi platform",
        "Informasi perangkat secara umum untuk keperluan keamanan akun",
      ],
    },
    {
      icon: Shield,
      title: "2. Penggunaan Informasi",
      content: [
        "Untuk menjalankan dan meningkatkan layanan RentMate",
        "Untuk mencocokkan pengguna dengan teman yang sesuai",
        "Untuk keamanan, verifikasi identitas, dan pencegahan penyalahgunaan",
        "Untuk mengirimkan notifikasi terkait pemesanan dan layanan",
      ],
    },
    {
      icon: Lock,
      title: "3. Perlindungan Data",
      content: [
        "Data pengguna tidak diperjualbelikan kepada pihak ketiga manapun",
        "Data disimpan dengan standar keamanan tinggi dan enkripsi",
        "Akses data terbatas hanya untuk kebutuhan sistem dan moderasi",
        "Kami melakukan audit keamanan secara berkala untuk melindungi data Anda",
      ],
    },
    {
      icon: MessageSquare,
      title: "4. Privasi Obrolan",
      content: [
        "Obrolan antara pengguna dan teman bersifat privat",
        "Konten obrolan tidak dipublikasikan atau dibagikan ke pihak luar",
        "Tim moderasi dapat mengakses obrolan jika terjadi pelanggaran aturan",
        "Riwayat obrolan dapat dihapus atas permintaan pengguna sesuai ketentuan",
      ],
    },
    {
      icon: AlertCircle,
      title: "5. Konten & Etika",
      content: [
        "RentMate adalah platform NON-SEKSUAL untuk teman profesional",
        "Dilarang keras menyebarkan konten pornografi, erotis, atau ajakan seksual",
        "Pelanggaran etika dapat mengakibatkan peringatan hingga suspend akun permanen",
        "Pengguna wajib menjaga komunikasi yang sopan dan profesional",
      ],
    },
    {
      icon: RefreshCw,
      title: "6. Perubahan Kebijakan",
      content: [
        "Kebijakan privasi ini dapat diperbarui sewaktu-waktu sesuai kebutuhan",
        "Perubahan signifikan akan diinformasikan melalui notifikasi di aplikasi",
        "Pengguna disarankan untuk membaca kebijakan ini secara berkala",
        "Penggunaan berkelanjutan setelah perubahan dianggap sebagai persetujuan",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Kebijakan Privasi <span className="text-gradient">RentMate</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Kami menghargai dan melindungi privasi setiap pengguna RentMate. 
            Dokumen ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.
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

        {/* Footer Note */}
        <Card className="mt-8 p-6 bg-accent/50 border-primary/20">
          <div className="text-center">
            <p className="text-muted-foreground">
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, silakan hubungi kami di{" "}
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
