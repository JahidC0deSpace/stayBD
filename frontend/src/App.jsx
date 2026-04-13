import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import { useAuthStore } from "./store/useAuthStore";
import { useWishlistStore } from "./store/useWishlistStore";
import api from "./services/api";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ServiceListPage from "./pages/ServiceListPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import ExperienceListPage from "./pages/ExperienceListPage";
import ExperienceDetailPage from "./pages/ExperienceDetailPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import PropertyListPage from "./pages/PropertyListPage";
import SearchPage from "./pages/SearchPage";
import AccessDenied from "./components/common/AccessDenied";
import UnauthorizedPage from "./components/common/UnauthorizedPage";
import MapSearchPage from "./pages/MapSearchPage";
import WishlistPage from "./pages/WishlistPage";
import NotFoundPage from "./components/common/NotFoundPage";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoadingScreen from "./components/common/LoadingScreen";
import MainLayout from "./components/common/MainLayout";
import DashboardLayout from "./components/common/DashboardLayout";

//Profile
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/chat/ChatPage";
import ConversationsPage from "./pages/chat/ConversationsPage";

// Bookings
import MyBookingsPage from "./pages/bookings/MyBookingsPage";
import BookingPage from "./pages/bookings/BookingPage";
import BookingSuccessPage from "./pages/bookings/BookingSuccessPage";
import BookingCancelPage from "./pages/bookings/BookingCancelPage";
import BookingDetailPage from "./pages/bookings/BookingDetailPage";

// Guest
import GuestDashboard from "./pages/GuestDashboard";

// Host
import HostDashboardPage from "./pages/host/HostDashboardPage";
import MyListingsPage from "./pages/host/MyListingsPage";
import CreateListingPage from "./pages/host/CreateListingPage";
import EditListingPage from "./pages/host/EditListingPage";
import HostAnalyticsPage from "./pages/host/HostAnalyticsPage";
import HostEarningsPage from "./pages/host/HostEarningsPage";
import HostBookingsPage from "./pages/host/HostBookingsPage";

//service-provider
import ProviderDashboardPage from "./pages/service-provider/ProviderDashboardPage";
import MyServicesPage from "./pages/service-provider/MyServicesPage";
import MyExperiencesPage from "./pages/service-provider/MyExperiencesPage";
import EditExperiencePage from "./pages/service-provider/EditExperiencePage";
import EditServicePage from "./pages/service-provider/EditServicePage";

// Admin
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPropertiesPage from "./pages/admin/AdminPropertiesPage";
import AdminServicesPage from "./pages/admin/AdminServicesPage";
import CreateServicePage from "./pages/service-provider/CreateServicePage";
import CreateExperiencePage from "./pages/service-provider/CreateExperiencePage";
import PendingPage from "./pages/admin/PendingPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import ProviderBookingsPage from "./pages/service-provider/ProviderBookingsPage";
import ProviderAnalyticsPage from "./pages/service-provider/ProviderAnalyticsPage";

function App() {
  // Use the selectors for better stability
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          const fallbackUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
            avatar: { url: firebaseUser.photoURL || "" },
            role: "user",
          };

          try {
            const response = await api.get("/users/me");
            const dbUser = response.data.data;
            //ban check
            if (dbUser.isBanned) {
              alert("Your account has been banned. Please contact support.");
              logout();
              return;
            }

            login({ ...fallbackUser, ...dbUser }, token);
            useWishlistStore.getState().hydrate(dbUser?.wishlist ?? []);
          } catch (dbError) {
            console.warn(
              "Could not fetch from MongoDB, using Firebase data:",
              dbError,
            );

            login(fallbackUser, token);
          }
        } catch (error) {
          console.error("Critical Auth Error:", error);
          logout();
        }
      } else {
        logout();
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [isHydrated, login, logout, setAuthLoading]);

  if (!isHydrated || isAuthLoading) {
    return <LoadingScreen />;
  }
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/properties" element={<PropertyListPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/services" element={<ServiceListPage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/experiences" element={<ExperienceListPage />} />
        <Route path="/experiences/:id" element={<ExperienceDetailPage />} />
        <Route path="/map" element={<MapSearchPage />} />
        <Route path="*" element={<NotFoundPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ConversationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:bookingId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book/:id"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id/success"
          element={
            <ProtectedRoute>
              <BookingSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id/cancel"
          element={
            <ProtectedRoute>
              <BookingCancelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Guest Routes */}
        <Route
          path="/guest"
          element={
            <ProtectedRoute allowedRoles={["guest"]}>
              <DashboardLayout role="guest" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<GuestDashboard />} />
          <Route path="my-bookings" element={<MyBookingsPage />} />
        </Route>
        {/* Host Routes */}
        <Route
          path="/host"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <DashboardLayout role="host" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<HostDashboardPage />} />
          <Route path="my-bookings" element={<MyBookingsPage />} />
          <Route path="bookings" element={<HostBookingsPage />} />
        </Route>

        <Route
          path="/host/listings"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <MyListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/analytics"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <HostAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/earnings"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <HostEarningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/listings/new"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <CreateListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/listings/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <EditListingPage />
            </ProtectedRoute>
          }
        />
        {/* Service Provider Routes */}
        <Route
          path="/provider"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <DashboardLayout role="service_provider" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ProviderDashboardPage />} />
          <Route path="my-bookings" element={<MyBookingsPage />} />
          <Route path="bookings" element={<ProviderBookingsPage />} />
        </Route>
        <Route
          path="/provider/analytics"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <ProviderAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/services"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <MyServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/services/new"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <CreateServicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/services/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <EditServicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/experiences"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <MyExperiencesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/experiences/new"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <CreateExperiencePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/experiences/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["service_provider"]}>
              <EditExperiencePage />
            </ProtectedRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="my-bookings" element={<MyBookingsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
        </Route>
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/properties"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPropertiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pending"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <PendingPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
