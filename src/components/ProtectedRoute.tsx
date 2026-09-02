import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/userStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  type?: "user" | "mitra";
}

export function ProtectedRoute({ children, type = "user" }: ProtectedRouteProps) {
  let isLoggedIn = false;

  if (type === "user") {
    isLoggedIn = !!localStorage.getItem("rentmate_current_username");
  } else {
    // Fallback jika tipe mitra
    isLoggedIn = !!localStorage.getItem("rentmate_current_username"); 
  }

  if (!isLoggedIn) {
    const loginPath = type === "mitra" ? "/mitra/login" : "/login";
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}