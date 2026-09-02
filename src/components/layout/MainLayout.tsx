import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

export default function MainLayout() {
  return (
    <>
      <Navbar />

      {/* Konten halaman */}
      <main className="pt-16 pb-16">
        <Outlet />
      </main>
    </>
  );
}
