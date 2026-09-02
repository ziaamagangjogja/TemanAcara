import { HelpCircle, MessageCircle, Phone, Mail, Book, AlertCircle, Clock, DollarSign, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from 'react';
import { Link } from "react-router-dom";

export default function Help() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Bagaimana cara mendaftar menjadi Mitra RentMate?",
      answer: "Unduh aplikasi RentMate, pilih 'Menjadi Mitra', lengkapi data diri, unggah dokumen verifikasi (KTP & foto selfie), dan tunggu proses verifikasi 1-3 hari kerja."
    },
    {
      question: "Kapan dan bagaimana saya menerima pembayaran?",
      answer: "Pembayaran diproses setiap minggu. Anda akan menerima 80% dari total pendapatan (setelah dipotong komisi 20%) yang ditransfer ke rekening yang Anda daftarkan."
    },
    {
      question: "Apa yang harus saya lakukan jika pengguna meminta kontak pribadi?",
      answer: "Jangan berikan informasi kontak pribadi Anda. Sopan tegaskan bahwa semua komunikasi harus melalui aplikasi untuk keamanan bersama. Laporkan pengguna jika permintaan berlanjut."
    },
    {
      question: "Bagaimana jika saya harus membatalkan pertemuan yang sudah disetujui?",
      answer: "Anda dapat membatalkan melalui aplikasi. Namun, pembatalan kurang dari 4 jam sebelum pertemuan dapat mengurangi rating Anda. Usahakan untuk membatalkan sesegera mungkin."
    },
    {
      question: "Saya merasa tidak aman selama pertemuan, apa yang harus dilakukan?",
      answer: "Prioritaskan keselamatan Anda. Akhiri pertemuan dengan alasan yang sopan, segera tinggalkan lokasi, dan gunakan fitur 'Laporkan Darurat' di aplikasi. Hubungi tim dukungan kami."
    },
    {
      question: "Bagaimana cara meningkatkan visibilitas profil saya?",
      answer: "Pertahankan rating tinggi dengan layanan yang baik, responsif terhadap permintaan, perbarui jadwal secara rutin, dan lengkapi profil Anda dengan foto dan bio yang menarik."
    }
  ];

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Pusat Bantuan <span className="text-gradient">Mitra Lovable</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Temukan jawaban untuk pertanyaan umum dan dapatkan dukungan yang Anda butuhkan sebagai mitra kami.
          </p>
        </div>

        {/* Quick Contact */}
        <Card className="p-6 mb-8 animate-fade-up">
          <h2 className="text-xl font-bold mb-4">Butuh Bantuan Segera?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="tel:+6281234567890" className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Telepon Darurat</div>
                <div className="text-sm text-muted-foreground">+62 812-3456-7890</div>
              </div>
            </a>
            <a href="mailto:support@RentMate.id" className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Email Support</div>
                <div className="text-sm text-muted-foreground">support@RentMate.id</div>
              </div>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
              <MessageCircle className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Live Chat</div>
                <div className="text-sm text-muted-foreground">Senin - Sabtu, 08:00 - 20:00</div>
              </div>
            </a>
          </div>
        </Card>

        {/* FAQs */}
        <h2 className="text-2xl font-bold mb-6">Pertanyaan yang Sering Diajukan (FAQ)</h2>
        <div className="space-y-4 mb-8">
          {faqs.map((faq, index) => (
            <Card 
              key={index} 
              className="animate-fade-up overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-accent/30 transition-colors"
              >
                <h3 className="font-semibold">{faq.question}</h3>
                <span className={`transform transition-transform ${activeIndex === index ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {activeIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Guides */}
        <h2 className="text-2xl font-bold mb-6">Panduan Lengkap</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="p-6 flex items-center gap-4 animate-fade-up hover:shadow-md transition-shadow">
            <Book className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-bold">Panduan Sukses Menjadi Mitra</h3>
              <p className="text-sm text-muted-foreground">Tips & trik untuk memaksimalkan pengalaman Anda.</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 animate-fade-up hover:shadow-md transition-shadow">
            <Shield className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-bold">Protokol Keamanan</h3>
              <p className="text-sm text-muted-foreground">Langkah-langkah menjaga keselamatan selama bertugas.</p>
            </div>
          </Card>
        </div>

        {/* Report Issue */}
        <Card className="p-6 bg-primary/5 border-primary/20 animate-fade-up">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-2">Laporkan Masalah</h2>
              <p className="text-muted-foreground mb-4">
                Mengalami masalah teknis atau perilaku pengguna yang tidak pantas? Laporkan kepada kami segera agar dapat ditindaklanjuti.
              </p>
              <Link 
                to="/mitra/report" 
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Buat Laporan
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}