import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const BanGuard = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const location = useLocation();

  const isBanned = isAuthenticated && user?.isBanned;

  useEffect(() => {
    if (isBanned) {
      logout();
    }
  }, [isBanned, logout]);

  // CRITICAL: If they are banned, do NOT return {children}.
  // This stops the rest of the app from ever loading/mounting.
  if (isBanned) {
    // If they are already on /register, show nothing (or a loader)
    // until logout() finishes and isAuthenticated becomes false.
    if (location.pathname === "/register") {
      return null;
    }
    return <Navigate to="/register" replace />;
  }

  return children;
};

export default BanGuard;
