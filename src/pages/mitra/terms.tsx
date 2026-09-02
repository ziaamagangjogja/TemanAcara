import { Scale, User, Users, Calendar, AlertTriangle, Gavel, ShieldCheck, Clock, DollarSign, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

// Nama komponen diubah menjadi huruf kapital
export default function MitraTermsConditions() {
  const sections = [
    {
      icon: Scale,
      title: "1. Ketentuan Umum Mitra",
      content: [
        "FriendShip adalah platform teman profesional untuk kegiatan sosial",
        "FriendShip BUKAN layanan kencan, escort, atau layanan seksual dalam bentuk apapun",
        "Sebagai mitra, Anda menyediakan layanan pertemanan profesional yang bersifat sosial, legal, dan aman",
        "Dengan mendaftar sebagai mitra, Anda menyetujui seluruh syarat dan ketentuan ini",
      ],
    },
    {
      icon: User,
      title: "2. Pendaftaran & Verifikasi Mitra",
      content: [
        "Mitra harus melalui proses verifikasi identitas yang ketat sebelum dapat aktif di platform",
        "Data pribadi yang diberikan harus asli dan dapat diverifikasi",
        "Mitra wajib mengunggah foto terbaru yang jelas dan tidak diedit secara berlebihan",
        "Satu akun mitra hanya untuk satu orang dan tidak boleh diwakilkan",
      ],
    },
    {
      icon: Users,
      title: "3. Kewajiban Mitra",
      content: [
        "Mitra wajib menjaga sikap profesional dan etika selama pertemuan dengan pengguna",
        "Mitra harus tepat waktu sesuai dengan jadwal yang telah disepakati",
        "Mitra tidak diperbolehkan meminta atau menerima pembayaran di luar platform",
        "Mitra harus menghormati batasan pribadi dan menjaga interaksi tetap profesional",
      ],
    },
    {
      icon: Calendar,
      title: "4. Jadwal & Ketersediaan",
      content: [
        "Mitra wajib memperbarui jadwal ketersediaan secara akurat",
        "Mitra harus merespons permintaan pertemuan dalam waktu 24 jam",
        "Pembatalan dari pihak mitra harus dilakukan minimal 4 jam sebelum waktu pertemuan",
        "Pembatalan mendadak dapat mengurangi rating dan kredibilitas mitra",
      ],
    },
    {
      icon: DollarSign,
      title: "5. Pembayaran & Komisi",
      content: [
        "Semua pembayaran dilakukan melalui sistem FriendShip",
        "Mitra akan menerima 80% dari total biaya pertemuan setelah dipotong komisi platform",
        "Pembayaran akan diproses setiap minggu ke rekening yang terdaftar",
        "Tarif layanan ditentukan oleh platform dan tidak dapat dinegosiasi langsung dengan pengguna",
      ],
    },
    {
      icon: AlertTriangle,
      title: "6. Larangan Keras untuk Mitra",
      content: [
        "❌ Menawarkan atau melakukan layanan seksual dalam bentuk apapun",
        "❌ Meminta atau menerima pembayaran di luar sistem FriendShip",
        "❌ Memberikan informasi kontak pribadi kepada pengguna",
        "❌ Melakukan pertemuan di luar lokasi yang disetujui sistem",
        "❌ Menggunakan identitas atau foto orang lain",
        "❌ Melanggar hukum atau melakukan aktivitas ilegal",
      ],
    },
    {
      icon: Gavel,
      title: "7. Sanksi Pelanggaran",
      content: [
        "Peringatan sistem untuk pelanggaran ringan pertama kali",
        "Penurunan visibilitas profil untuk pelanggaran berulang",
        "Suspend akun sementara (7-30 hari) untuk pelanggaran sedang",
        "Penonaktifan akun permanen dan blacklist untuk pelanggaran berat",
        "Pelaporan ke pihak berwajib untuk tindakan kriminal",
      ],
    },
    {
      icon: ShieldCheck,
      title: "8. Perlindungan Mitra",
      content: [
        "FriendShip menyediakan sistem keamanan dan pelacakan lokasi selama pertemuan",
        "Mitra berhak menolak permintaan yang tidak sesuai dengan ketentuan",
        "Mitra dapat melaporkan pengguna yang melanggar ketentuan platform",
        "FriendShip tidak bertanggung jawab atas kejadian di luar platform atau pelanggaran yang dilakukan mitra",
      ],
    },
    {
      icon: Star,
      title: "9. Rating & Review",
      content: [
        "Pengguna dapat memberikan rating dan review setelah pertemuan",
        "Rating mempengaruhi visibilitas dan jumlah permintaan pertemuan",
        "Mitra dapat merespons review dari pengguna",
        "Manipulasi rating dapat mengakibatkan penonaktifan akun",
      ],
    },
    {
      icon: Clock,
      title: "10. Durasi & Batas Pertemuan",
      content: [
        "Durasi minimum pertemuan adalah 1 jam",
        "Maksimal durasi pertemuan adalah 8 jam per hari",
        "Mitra tidak diperbolehkan melakukan pertemuan lebih dari 40 jam per minggu",
        "Perpanjangan waktu pertemuan harus melalui sistem aplikasi",
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
            Syarat & Ketentuan <span className="text-gradient">Mitra FriendShip</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dengan mendaftar sebagai mitra FriendShip, Anda menyetujui untuk mematuhi 
            syarat dan ketentuan yang berlaku di bawah ini.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
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
              Dengan mendaftar sebagai mitra FriendShip, Anda menyatakan telah membaca dan menyetujui seluruh syarat dan ketentuan di atas.
            </p>
            <p className="text-muted-foreground text-sm">
              Pertanyaan? Hubungi{" "}
              <a href="mailto:partner@lovable.id" className="text-primary font-medium hover:underline">
                partner@lovable.id
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}