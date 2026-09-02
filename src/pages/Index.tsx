import { Link } from "react-router-dom";
import { Shield, Lock, Scale, Star, ArrowRight, Heart, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { testimonials, talents } from "@/data/mockData";
import { TalentCard } from "@/components/TalentCard";

export default function Index() {
  const features = [
    {
      icon: Shield,
      title: "Keamanan Terjamin",
      description: "Semua teman terverifikasi dan melalui proses screening ketat",
    },
    {
      icon: Lock,
      title: "Privasi Terlindungi",
      description: "Data pribadi Anda aman dan tidak dibagikan ke pihak ketiga",
    },
    {
      icon: Scale,
      title: "100% Legal",
      description: "Platform profesional dengan aturan jelas dan transparan",
    },
  ];

  const stats = [
    { value: "10K+", label: "Pengguna Aktif" },
    { value: "500+", label: "Teman Terverifikasi" },
    { value: "25+", label: "Kota di Indonesia" },
    { value: "4.8", label: "Penilaian Rata-rata" },
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left animate-fade-up">
              <Badge variant="accent" className="text-sm px-4 py-1.5">
                <Heart className="w-4 h-4 mr-1 fill-current" />
                Platform Teman #1 di Indonesia
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                Teman Jalan, Ngobrol & <span className="text-gradient">RentMate</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Temukan teman yang asyik untuk menemani aktivitas kamu. Profesional, aman, dan legal!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/talents">
                  <Button variant="hero" size="xl" className="group">
                    Pilih Teman
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="xl">
                    Masuk / Daftar
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Images */}
            <div className="relative hidden lg:block">
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden shadow-card animate-float">
                    <img
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=500&fit=crop"
                      alt="Teman ngobrol di cafe"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-card animate-float" style={{ animationDelay: "0.5s" }}>
                    <img
                      src="https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400&h=300&fit=crop"
                      alt="Traveling bersama teman"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-3xl overflow-hidden shadow-card animate-float" style={{ animationDelay: "0.3s" }}>
                    <img
                      src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&h=300&fit=crop"
                      alt="Ngopi bareng teman"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-card animate-float" style={{ animationDelay: "0.7s" }}>
                    <img
                      src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=500&fit=crop"
                      alt="Hangout bersama"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Kenapa Pilih <span className="text-gradient">RentMate?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Platform terpercaya untuk menemukan teman profesional
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="p-8 text-center group hover:border-primary/30 transition-colors"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary group-hover:shadow-orange transition-all">
                    <Icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Teman */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Teman <span className="text-gradient">Unggulan</span>
              </h2>
              <p className="text-muted-foreground">Temukan teman terbaik untuk aktivitasmu</p>
            </div>
            <Link to="/talents" className="hidden md:block">
              <Button variant="outline" className="group">
                Lihat Semua
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {talents.slice(0, 3).map((talent, index) => (
              <div key={talent.id} style={{ animationDelay: `${index * 0.1}s` }} className="animate-fade-up">
                <TalentCard talent={talent} />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link to="/talents">
              <Button variant="outline" className="group">
                Lihat Semua Teman
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Apa Kata <span className="text-gradient">Mereka?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Pengalaman nyata dari pengguna RentMate
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.id}
                className="p-6 animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.photo}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20"
                  />
                  <div>
                    <h4 className="font-bold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground italic">"{testimonial.comment}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <Card className="relative overflow-hidden bg-gradient-hero p-8 md:p-16 text-center text-primary-foreground">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Siap Menemukan Teman Baru?
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                Bergabung dengan ribuan pengguna yang sudah merasakan pengalaman seru bersama RentMate
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/talents">
                  <Button variant="secondary" size="lg" className="text-foreground">
                    Pilih Teman Sekarang
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    Masuk Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-orange">
                  <span className="text-primary-foreground font-bold text-lg">R</span>
                </div>
                <span className="font-bold text-xl">RentMate</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Platform teman profesional #1 di Indonesia
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Navigasi</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/talents" className="hover:text-primary transition-colors">Pilih Teman</Link></li>
                <li><Link to="/bookings" className="hover:text-primary transition-colors">Pemesanan Saya</Link></li>
                <li><Link to="/chat" className="hover:text-primary transition-colors">Percakapan</Link></li>
                <li><Link to="/profile" className="hover:text-primary transition-colors">Profil</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Bantuan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link to="/syarat-ketentuan" className="hover:text-primary transition-colors">Syarat & Ketentuan</Link></li>
                <li><Link to="/kebijakan-privasi" className="hover:text-primary transition-colors">Kebijakan Privasi</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Kontak</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>support@rentmate.id</li>
                <li>+62 812 3456 7890</li>
                <li>Jakarta, Indonesia</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 RentMate. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
