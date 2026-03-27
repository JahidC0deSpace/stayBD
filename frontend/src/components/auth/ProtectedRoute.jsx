import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingScreen from "../common/LoadingScreen";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isAuthLoading } = useAuthStore();
  const location = useLocation();

  // 1. Loading State
  if (isAuthLoading) return <LoadingScreen />;

  // 2. Authentication Check
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Approval Check (Host/Provider)
  const isBusinessRole = ["host", "service_provider"].includes(user.role);
  if (isBusinessRole && !user.isApproved) {
    // Prevent redirect loop if already on access-denied
    return location.pathname === "/access-denied" ? (
      children
    ) : (
      <Navigate to="/access-denied" replace />
    );
  }

  // 4. Role-Based Authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, send to a neutral "Unauthorized" page or Home
    // Avoid complex logic here to prevent redirect loops
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
