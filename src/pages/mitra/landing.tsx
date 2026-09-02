import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Hero from "@/components/mitra-landing/Hero";
import Stats from "@/components/mitra-landing/Stats";
import About from "@/components/mitra-landing/About";
import Activities from "@/components/mitra-landing/Activities";
import Benefits from "@/components/mitra-landing/Benefits";
import HowToJoin from "@/components/mitra-landing/HowToJoin";
import Security from "@/components/mitra-landing/Security";
import CTA from "@/components/mitra-landing/CTA";
import Footer from "@/components/mitra-landing/Footer";

export default function MitraLandingPage() {
  const location = useLocation();

  useEffect(() => {
    const section = location.pathname.replace("/mitra/", "");

    // kalau /mitra → scroll ke atas
    if (!section || section === "mitra") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [location.pathname]);

  return (
    <div className="mitra-landing min-h-screen bg-[#FFF7F0] overflow-x-hidden">
      <Hero />
      <Stats />
      <About />
      <Activities />
      <Benefits />
      <HowToJoin />
      <Security />
      <CTA />
      <Footer />
    </div>
  );
}
