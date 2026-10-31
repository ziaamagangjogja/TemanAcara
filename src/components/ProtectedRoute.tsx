import { Navigate } from "react-router-dom";
import { safeGetLocalStorage } from "@/lib/storageHelper";

interface ProtectedRouteProps {
  children: React.ReactNode;
  type?: "user" | "mitra" | "admin";
}

export function ProtectedRoute({ children, type = "user" }: ProtectedRouteProps) {
  let isLoggedIn = false;

  if (type === "user") {
    isLoggedIn = !!safeGetLocalStorage("rentmate_current_username") &&
      !!safeGetLocalStorage("rentmate_current_user");
  } else if (type === "mitra") {
    isLoggedIn = safeGetLocalStorage("mitraAuthenticated") === "true" &&
      !!safeGetLocalStorage("rentmate_current_mitra");
  } else if (type === "admin") {
    isLoggedIn = sessionStorage.getItem("adminAuthenticated") === "true";
  }

  if (!isLoggedIn) {
    const loginPath = type === "mitra" ? "/mitra/login" : type === "admin" ? "/admin-login" : "/login";
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}