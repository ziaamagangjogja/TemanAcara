// src/pages/mitra/privacy.jsx

import { Shield, Eye, Database, Lock, FileText, AlertCircle, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Privacy() {
  const sections = [
    {
      icon: Shield,
      title: "1. Informasi yang Kami Kumpulkan",
      content: [
        "Data Identitas: Nama lengkap, tanggal lahir, dan informasi verifikasi (KTP).",
        "Data Kontak: Nomor telepon, alamat email, dan domisili.",
        "Data Finansial: Informasi rekening bank untuk proses pembayaran.",
        "Data Profil: Foto, bio, dan preferensi yang Anda tampilkan di platform.",
        "Data Penggunaan: Log aktivitas, jadwal, dan riwayat pertemuan."
      ],
    },
    {
      icon: Eye,
      title: "2. Bagaimana Informasi Ditampilkan",
      content: [
        "Nama depan, usia, dan kota Anda akan terlihat oleh pengguna yang potensial.",
        "Foto profil dan bio adalah publik untuk membantu pengguna memilih.",
        "Informasi pribadi seperti nomor telepon dan KTP TIDAK akan pernah dibagikan kepada pengguna.",
        "Hanya tim verifikasi Lovable yang memiliki akses ke data identitas lengkap Anda."
      ],
    },
    {
      icon: Database,
      title: "3. Penggunaan Data Anda",
      content: [
        "Untuk memverifikasi identitas dan menjaga keamanan platform.",
        "Untuk memproses pembayaran dan komisi Anda.",
        "Untuk menghubungkan Anda dengan pengguna yang sesuai.",
        "Untuk analisis internal guna meningkatkan kualitas layanan.",
        "Untuk komunikasi terkait jadwal, pembaruan, dan dukungan."
      ],
    },
    {
      icon: Lock,
      title: "4. Keamanan Data Anda",
      content: [
        "Semua data pribadi dienkripsi menggunakan teknologi terkini.",
        "Akses ke data sangat terbatas dan hanya untuk staf yang berwenang.",
        "Kami menggunakan firewall dan sistem monitoring untuk mencegah akses tidak sah.",
        "Data Anda disimpan di server cloud yang aman dan bersertifikat."
      ],
    },
    {
      icon: UserCheck,
      title: "5. Hak Anda sebagai Mitra",
      content: [
        "Hak untuk mengakses, memperbarui, atau menghapus data pribadi Anda kapan saja.",
        "Hak untuk mengetahui data apa yang kami simpan tentang Anda.",
        "Hak untuk menonaktifkan akun, yang akan mengarsipkan data Anda.",
        "Hak untuk menarik persetujuan penggunaan data tertentu."
      ],
    },
    {
      icon: AlertCircle,
      title: "6. Berbagi Data dengan Pihak Ketiga",
      content: [
        "Kami TIDAK menjual data pribadi Anda kepada pihak ketiga.",
        "Data mungkin dibagikan dengan penyedia layanan pembayaran yang tepercaya.",
        "Data dapat diungkapkan jika diwajibkan oleh hukum atau perintah pengadilan.",
        "Data anonim mungkin digunakan untuk penelitian internal dan pengembangan produk."
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
            Kebijakan Privasi <span className="text-gradient">Mitra Lovable</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Privasi Anda adalah prioritas kami. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda sebagai mitra.
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

        {/* Contact Information */}
        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-2">
            <p className="font-medium text-foreground">
              Pertanyaan tentang privasi data Anda? Kami siap membantu.
            </p>
            <p className="text-muted-foreground text-sm">
              Hubungi Tim Privasi kami di{" "}
              <a href="mailto:privacy@lovable.id" className="text-primary font-medium hover:underline">
                privacy@lovable.id
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}