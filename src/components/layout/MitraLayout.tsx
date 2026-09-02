import { Outlet } from "react-router-dom";
import Navbar from "@/components/mitra-landing/Navbar";

export default function MitraLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
