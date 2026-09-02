import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

import heroCafeChat from "@/assets/mitra-landing/hero-cafe-chat.jpg";
import heroWorkTogether from "@/assets/mitra-landing/hero-work-together.jpg";
import heroGroupHangout from "@/assets/mitra-landing/hero-group-hangout.jpg";
import heroSocialEvent from "@/assets/mitra-landing/hero-social-event.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gradient-hero-soft">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* ================= LEFT CONTENT ================= */}
          <div className="text-center lg:text-left">
            {/* Label */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6 animate-fade-in">
              <Heart className="w-4 h-4 fill-current" />
              <span>Platform Teman Profesional di Indonesia</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6 animate-slide-up">
              Teman Jalan, Ngobrol &{" "}
              <span className="text-gradient">RentMate</span>
            </h1>

            {/* Description */}
            <p
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-10 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Jadi mitra dan dapatkan penghasilan dengan menemani aktivitas
              pengguna secara profesional, aman, dan sesuai aturan.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <Link to="/mitra/register">
                <Button variant="hero" size="xl" className="gap-2">
                  Daftar Jadi Mitra
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>

              <Link to="/mitra/login">
                <Button variant="outline" size="xl" className="gap-2 border-2">
                  <LogIn className="w-5 h-5" />
                  Masuk 
                </Button>
              </Link>
            </div>
          </div>
          {/* ============== END LEFT CONTENT ============== */}

          {/* ================= RIGHT IMAGES ================= */}
          <div
            className="relative hidden lg:block animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="relative w-full h-[500px]">
              {/* Main image */}
              <div className="absolute top-0 left-0 w-[55%] h-[60%] rounded-3xl overflow-hidden shadow-card z-10">
                <img
                  src={heroCafeChat}
                  alt="Teman ngobrol di kafe"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Top right */}
              <div className="absolute top-4 right-0 w-[40%] h-[45%] rounded-2xl overflow-hidden shadow-card z-20">
                <img
                  src={heroWorkTogether}
                  alt="Bekerja bersama"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Bottom left */}
              <div className="absolute bottom-0 left-8 w-[45%] h-[35%] rounded-2xl overflow-hidden shadow-card z-30">
                <img
                  src={heroGroupHangout}
                  alt="Nongkrong bersama"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Bottom right */}
              <div className="absolute bottom-8 right-4 w-[42%] h-[40%] rounded-3xl overflow-hidden shadow-card z-20">
                <img
                  src={heroSocialEvent}
                  alt="Menghadiri acara"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Decorations */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent/40 rounded-full blur-2xl" />
            </div>
          </div>
          {/* ============== END RIGHT IMAGES ============== */}

        </div>
      </div>
    </section>
  );
};

export default Hero;