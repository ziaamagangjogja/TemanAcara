import { Navigate } from "react-router-dom";
interface ProtectedRouteProps {
  children: React.ReactNode;
  type?: "user" | "mitra" | "admin";
}

export function ProtectedRoute({ children, type = "user" }: ProtectedRouteProps) {
  let isLoggedIn = false;

  if (type === "user") {
    isLoggedIn = !!localStorage.getItem("rentmate_current_username") &&
      !!localStorage.getItem("rentmate_current_user");
  } else if (type === "mitra") {
    isLoggedIn = !!localStorage.getItem("mitraAuthenticated") &&
      !!localStorage.getItem("rentmate_current_mitra");
  } else if (type === "admin") {
    isLoggedIn = sessionStorage.getItem("adminAuthenticated") === "true";
  }

  if (!isLoggedIn) {
    const loginPath = type === "mitra" ? "/mitra/login" : type === "admin" ? "/admin-login" : "/login";
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}