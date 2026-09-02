import { HelpCircle, MessageCircle, Shield, Users, Calendar, Ban, CreditCard, HeadphonesIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

export default function FAQ() {
  const faqCategories = [
    {
      icon: HelpCircle,
      title: "Umum",
      faqs: [
        {
          question: "Apa itu RentMate?",
          answer: "RentMate adalah platform teman profesional yang menghubungkan Anda dengan teman terverifikasi untuk berbagai aktivitas sosial seperti menemani makan, traveling, menghadiri acara, atau sekadar ngobrol. RentMate adalah layanan NON-SEKSUAL dan 100% legal.",
        },
        {
          question: "Apakah RentMate layanan kencan?",
          answer: "Tidak. RentMate BUKAN layanan kencan atau escort. RentMate adalah platform teman profesional yang murni bersifat sosial. Semua bentuk aktivitas romantis atau seksual dilarang keras dan akan mengakibatkan suspend akun.",
        },
        {
          question: "Apakah aman menggunakan RentMate?",
          answer: "Ya, keamanan adalah prioritas utama kami. Semua teman melalui proses verifikasi ketat, data pengguna dilindungi dengan enkripsi tinggi, dan kami memiliki tim moderasi yang aktif memantau aktivitas di platform.",
        },
      ],
    },
    {
      icon: Users,
      title: "Teman",
      faqs: [
        {
          question: "Bagaimana cara memilih Teman?",
          answer: "Anda bisa menjelajahi daftar teman di halaman Teman, menggunakan filter berdasarkan kota, hobi, gender, dan rentang usia. Klik profil teman untuk melihat detail lengkap termasuk bio, galeri foto, dan ulasan dari pengguna lain.",
        },
        {
          question: "Apakah teman bisa diganti setelah pemesanan?",
          answer: "Tidak. Setiap teman memiliki identitas unik dan tidak dapat diganti setelah pemesanan dikonfirmasi. Pastikan Anda memilih teman dengan cermat sebelum melakukan pemesanan.",
        },
        {
          question: "Apakah semua teman sudah terverifikasi?",
          answer: "Ya, semua teman yang tampil di RentMate sudah melalui proses verifikasi identitas dan screening. Kami memastikan setiap teman adalah orang yang profesional dan dapat dipercaya.",
        },
      ],
    },
    {
      icon: Calendar,
      title: "Pemesanan",
      faqs: [
        {
          question: "Bagaimana cara melakukan pemesanan?",
          answer: "Pilih teman yang Anda inginkan, klik 'Pesan Sekarang', tentukan durasi, tujuan, dan tipe teman (online/offline). Setelah pembayaran dikonfirmasi, pemesanan akan aktif dan Anda bisa mulai berkomunikasi melalui obrolan.",
        },
        {
          question: "Berapa durasi minimum pemesanan?",
          answer: "Durasi minimum pemesanan adalah 1 jam. Anda bisa memilih durasi yang lebih panjang sesuai kebutuhan. Harga dihitung per jam berdasarkan tarif masing-masing teman.",
        },
        {
          question: "Apakah bisa membatalkan pemesanan?",
          answer: "Pembatalan pemesanan dapat dilakukan dengan ketentuan tertentu. Pembatalan lebih dari 24 jam sebelum jadwal akan mendapat refund penuh. Pembatalan kurang dari 24 jam akan dikenakan biaya pembatalan. Hubungi customer service untuk bantuan lebih lanjut.",
        },
      ],
    },
    {
      icon: MessageCircle,
      title: "Obrolan",
      faqs: [
        {
          question: "Kapan obrolan bisa digunakan?",
          answer: "Fitur obrolan hanya aktif setelah pemesanan berhasil dikonfirmasi. Anda dapat menggunakan obrolan untuk berkoordinasi dengan teman mengenai waktu, lokasi, dan detail aktivitas yang akan dilakukan.",
        },
        {
          question: "Apakah obrolan bersifat privat?",
          answer: "Ya, obrolan antara Anda dan teman bersifat privat. Namun, tim moderasi dapat mengakses riwayat obrolan jika terjadi laporan pelanggaran atau untuk keperluan keamanan platform.",
        },
        {
          question: "Apa yang terjadi jika ada pelanggaran dalam obrolan?",
          answer: "Jika ditemukan pelanggaran seperti konten tidak pantas, pelecehan, atau permintaan di luar aturan, akun pelanggar akan dikenakan sanksi mulai dari peringatan hingga suspend permanen.",
        },
      ],
    },
    {
      icon: Ban,
      title: "Aturan & Larangan",
      faqs: [
        {
          question: "Apakah ada kontak fisik saat bertemu?",
          answer: "Tidak. Teman RentMate bersifat sosial dan profesional. Tidak ada kontak fisik romantis atau seksual. Pelanggaran terhadap aturan ini akan mengakibatkan suspend akun permanen.",
        },
        {
          question: "Apa saja yang dilarang di RentMate?",
          answer: "Dilarang keras: konten/aktivitas seksual, pelecehan, aktivitas ilegal, penipuan, memberikan informasi palsu, dan transaksi di luar sistem RentMate. Pelanggaran akan berujung pada sanksi hingga penonaktifan akun.",
        },
        {
          question: "Apa yang terjadi jika saya melanggar aturan?",
          answer: "Pelanggaran ringan akan mendapat peringatan. Pelanggaran berulang akan dikenakan suspend sementara (7-30 hari). Pelanggaran berat akan mengakibatkan penonaktifan akun permanen dan dapat dilaporkan ke pihak berwajib.",
        },
      ],
    },
    {
      icon: CreditCard,
      title: "Pembayaran",
      faqs: [
        {
          question: "Metode pembayaran apa saja yang tersedia?",
          answer: "RentMate menerima berbagai metode pembayaran termasuk transfer bank, e-wallet (GoPay, OVO, Dana, LinkAja), dan kartu kredit/debit. Semua transaksi diproses melalui payment gateway yang aman.",
        },
        {
          question: "Apakah harga sudah final?",
          answer: "Harga yang tertera adalah harga per jam untuk layanan pertemanan. Tidak ada biaya tersembunyi. Biaya tambahan seperti makan, transportasi, atau tiket acara ditanggung sesuai kesepakatan dengan teman.",
        },
        {
          question: "Bagaimana proses refund?",
          answer: "Refund akan diproses sesuai kebijakan pembatalan yang berlaku. Refund akan dikembalikan ke metode pembayaran asal dalam waktu 3-7 hari kerja setelah persetujuan.",
        },
      ],
    },
    {
      icon: HeadphonesIcon,
      title: "Bantuan",
      faqs: [
        {
          question: "Bagaimana cara menghubungi customer service?",
          answer: "Anda dapat menghubungi tim customer service kami melalui email support@rentmate.id atau WhatsApp di +62 812 3456 7890. Tim kami siap membantu 24/7.",
        },
        {
          question: "Bagaimana cara melaporkan masalah atau pelanggaran?",
          answer: "Jika Anda mengalami masalah atau menemukan pelanggaran, segera laporkan melalui email support@rentmate.id dengan menyertakan detail kejadian, screenshot (jika ada), dan ID pemesanan. Tim kami akan menindaklanjuti dalam 24 jam.",
        },
        {
          question: "Apakah ada jaminan kepuasan?",
          answer: "Kami berkomitmen untuk memberikan pengalaman terbaik. Jika Anda tidak puas dengan layanan yang diterima karena kesalahan dari pihak teman, silakan hubungi customer service untuk penyelesaian yang adil.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Pertanyaan yang Sering <span className="text-gradient">Diajukan</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Temukan jawaban untuk pertanyaan umum seputar layanan RentMate. 
            Tidak menemukan jawaban? Hubungi tim kami.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.title} 
                className="p-6 animate-fade-up"
                style={{ animationDelay: `${categoryIndex * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">{category.title}</h2>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, faqIndex) => (
                    <AccordionItem 
                      key={faqIndex} 
                      value={`${category.title}-${faqIndex}`}
                      className="border-b border-border/50 last:border-0"
                    >
                      <AccordionTrigger className="text-left hover:text-primary hover:no-underline py-4">
                        <span className="font-medium">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            );
          })}
        </div>

        {/* Contact CTA */}
        <Card className="mt-8 p-8 bg-gradient-hero text-primary-foreground text-center">
          <h3 className="text-xl font-bold mb-2">Masih punya pertanyaan?</h3>
          <p className="opacity-90 mb-4">
            Tim customer service kami siap membantu Anda 24/7
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@rentmate.id" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              support@rentmate.id
            </a>
            <a 
              href="tel:+6281234567890" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <HeadphonesIcon className="w-5 h-5" />
              +62 812 3456 7890
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
