import { Heart, Shield, Users } from "lucide-react";
import aboutProfessional from "@/assets/mitra-landing/about-professional.jpg";

const About = () => {
  return (
    <section id="tentang" className="py-20 bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Text content */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Jadi Mitra{" "}
              <span className="text-gradient">Teman Profesional</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              FriendShip membuka kesempatan bagi siapa saja untuk menjadi mitra teman profesional.
              Kamu akan menemani pengguna dalam berbagai aktivitas sosial secara sopan, aman, dan transparan.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Heart,
                  title: "Profesional",
                  desc: "Layanan berkualitas tinggi",
                },
                {
                  icon: Shield,
                  title: "Aman",
                  desc: "Terverifikasi & terpercaya",
                },
                {
                  icon: Users,
                  title: "Sopan",
                  desc: "Interaksi yang terhormat",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl bg-card shadow-card border border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center mx-auto lg:mx-0 mb-3">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Photo */}
          <div className="relative hidden lg:flex justify-center">
            <div className="relative">
              {/* Main photo */}
              <div className="w-[380px] h-[480px] rounded-3xl overflow-hidden shadow-card">
                <img 
                  src={aboutProfessional} 
                  alt="Mitra profesional tersenyum" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-accent/40 rounded-full blur-2xl" />
              
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-card shadow-lg rounded-2xl px-5 py-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Terverifikasi</p>
                    <p className="text-xs text-muted-foreground">Mitra Terpercaya</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;