// src/pages/mitra/about.jsx

import { Heart, Users, Shield, Award, Globe, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function About() {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Penghasilan Fleksibel",
      description: "Atur jadwal sendiri dan dapatkan penghasilan tambahan yang menjanjikan sebagai teman profesional."
    },
    {
      icon: Users,
      title: "Komunitas Profesional",
      description: "Bergabung dengan jaringan mitra terverifikasi dan bangun relasi yang positif."
    },
    {
      icon: Shield,
      title: "Keamanan Prioritas",
      description: "Sistem keamanan canggih dengan pelacakan lokasi dan tim dukungan 24/7 untuk melindungi Anda."
    },
    {
      icon: Award,
      title: "Pengembangan Diri",
      description: "Tingkatkan soft skill, komunikasi, dan dapatkan pengalaman berharga."
    },
    {
      icon: Globe,
      title: "Jangkauan Luas",
      description: "Terhubung dengan pengguna dari berbagai kota di seluruh Indonesia."
    },
    {
      icon: Target,
      title: "Misi Positif",
      description: "Bantu mengatasi kesepian dan ciptakan dampak sosial yang bermakna."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Tentang <span className="text-gradient">Mitra RentMate</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Bergabunglah dengan komunitas mitra profesional RentMate dan menjadi bagian dari solusi untuk menciptakan koneksi sosial yang sehat dan bermakna di Indonesia.
          </p>
        </div>

        {/* About Section */}
        <Card className="p-8 mb-8 animate-fade-up">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Apa itu Mitra RentMate?</h2>
            <p className="text-muted-foreground">
              Mitra RentMate adalah individu terverifikasi yang memberikan layanan pertemanan profesional melalui platform kami. Sebagai mitra, Anda berkesempatan untuk menemani pengguna dalam berbagai aktivitas sosial—dari sekadar ngobrol, jalan-jalan, hingga menghadiri acara—semua dalam lingkungan yang aman, terstruktur, dan positif.
            </p>
            <p className="text-muted-foreground">
              Kami percaya bahwa setiap orang berhak merasakan koneksi sosial yang hangat. Melalui program ini, Anda tidak hanya mendapatkan penghasilan, tetapi juga menjadi pahlawan bagi mereka yang membutuhkan teman.
            </p>
          </div>
        </Card>

        {/* Benefits Grid */}
        <h2 className="text-2xl font-bold mb-6 text-center">Mengapa Bergabung Menjadi Mitra?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card 
                key={benefit.title} 
                className="p-6 animate-fade-up hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 w-14 h-14 bg-accent rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <Card className="p-8 bg-primary/5 border-primary/20 animate-fade-up">
          <h2 className="text-2xl font-bold mb-6 text-center">RentMate dalam Angka</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">5000+</div>
              <div className="text-sm text-muted-foreground">Mitra Aktif</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">50,000+</div>
              <div className="text-sm text-muted-foreground">Pertemuan Sukses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">25+</div>
              <div className="text-sm text-muted-foreground">Kota Terjangkau</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">4.9/5</div>
              <div className="text-sm text-muted-foreground">Rating Rata-rata</div>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <Card className="mt-8 p-8 text-center animate-fade-up">
          <h2 className="text-2xl font-bold mb-4">Siap Bergabung dan Menciptakan Dampak?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Jadilah bagian dari gerakan positif untuk mengatasi kesepian sambil mengembangkan diri dan mendapatkan penghasilan.
          </p>
          <a href="/mitra/register" className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Daftar Sebagai Mitra Sekarang
          </a>
        </Card>
      </div>
    </div>
  );
}