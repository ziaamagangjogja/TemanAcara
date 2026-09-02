import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ctaBackground from "@/assets/mitra-landing/cta-background.jpg";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img 
          src={ctaBackground} 
          alt="" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/85 to-primary/90" />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>


      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Siap Jadi Mitra Teman Profesional?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-10 max-w-xl mx-auto">
            Gabung sekarang dan mulai pengalaman baru sebagai mitra di platform teman profesional terpercaya.
          </p>
         <Link to="/mitra/register">
  <Button
    size="xl"
    className="
      h-14 px-10
      rounded-2xl
      bg-white
      text-orange-500
      text-lg font-semibold
      shadow-[0_8px_30px_rgba(255,255,255,0.35)]
      hover:bg-white/90
      hover:scale-[1.03]
      transition-all duration-300
      gap-2
    "
  >
    Daftar Jadi Mitra Sekarang
    <ArrowRight className="w-5 h-5" />
  </Button>
</Link>

        </div>
      </div>
    </section>
  );
};

export default CTA;
