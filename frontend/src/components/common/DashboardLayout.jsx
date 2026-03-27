import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { auth } from "../../services/firebase";
import { signOut } from "firebase/auth";

import {
  FiGrid,
  FiHome,
  FiCalendar,
  FiBarChart2,
  FiDollarSign,
  FiUsers,
  FiBriefcase,
  FiStar,
  FiMessageSquare,
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi";
import { MdApartment } from "react-icons/md";

// --- LINK DEFINITIONS ---

const guestLinks = [
  { to: "/profile", icon: FiUser, label: "Profile" },
  { to: "/guest/dashboard", icon: FiGrid, label: "Dashboard" },
  { to: "/wishlist", icon: FiStar, label: "Saved Properties" },
  { to: "/chat", icon: FiMessageSquare, label: "Messages" },
];

const hostLinks = [
  { to: "/profile", icon: FiUser, label: "Profile" },
  { to: "/host/dashboard", icon: FiGrid, label: "Dashboard" },
  { to: "/host/listings", icon: MdApartment, label: "My Listings" },
  { to: "/host/bookings", icon: FiCalendar, label: "Bookings" },
  { to: "/host/analytics", icon: FiBarChart2, label: "Analytics" },
  { to: "/host/earnings", icon: FiDollarSign, label: "Earnings" },
  { to: "/host/my-bookings", icon: FiCalendar, label: "My Bookings" },
  { to: "/chat", icon: FiMessageSquare, label: "Messages" },
];

const providerLinks = [
  { to: "/profile", icon: FiUser, label: "Profile" },
  { to: "/provider/dashboard", icon: FiGrid, label: "Dashboard" },
  { to: "/provider/services", icon: FiBriefcase, label: "My Services" },
  {
    to: "/provider/experiences",
    icon: HiOutlineSparkles,
    label: "My Experiences",
  },
  { to: "/provider/bookings", icon: FiCalendar, label: "Bookings" },
  { to: "/provider/my-bookings", icon: FiCalendar, label: "My Bookings" },
  { to: "/provider/analytics", icon: FiBarChart2, label: "Analytics" },
  { to: "/chat", icon: FiMessageSquare, label: "Messages" },
];

const adminLinks = [
  { to: "/profile", icon: FiUser, label: "Profile" },
  { to: "/admin/dashboard", icon: FiGrid, label: "Dashboard" },
  { to: "/admin/users", icon: FiUsers, label: "Users" },
  { to: "/admin/properties", icon: MdApartment, label: "Properties" },
  { to: "/admin/services", icon: FiBriefcase, label: "Services" },
  { to: "/admin/bookings", icon: FiCalendar, label: "Bookings" },
  { to: "/admin/analytics", icon: FiBarChart2, label: "Analytics" },
  { to: "/admin/my-bookings", icon: FiCalendar, label: "My Bookings" },
];

const sidebarLinksMap = {
  guest: guestLinks,
  host: hostLinks,
  service_provider: providerLinks,
  admin: adminLinks,
};

// --- COMPONENT ---

export default function DashboardLayout({ role }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  // Default to guest links if role isn't found
  const links = sidebarLinksMap[role?.toLowerCase()] || guestLinks;

  const handleLogout = async () => {
    try {
      await signOut(auth); // Clear Firebase session
      logout(); // Clear Zustand state
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Helper for badge colors
  const getBadgeColor = (userRole) => {
    switch (userRole) {
      case "admin":
        return "badge-blue";
      case "host":
        return "badge-orange";
      case "service_provider":
        return "badge-purple";
      default:
        return "badge-green"; // Guest
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 h-full z-30 shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 no-underline group"
          >
            {/* Logo Icon (Bangladesh Flag Style) */}
            <div className="w-10 h-10 rounded-xl flex items-center bg-emerald-600 relative overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <div className="w-5 h-5 bg-red-500 rounded-full ml-[25%]"></div>
            </div>

            {/* Brand Name */}
            <span className="text-2xl font-black tracking-tight text-gray-900">
              Stay<span className="text-emerald-600">BD</span>
            </span>
          </NavLink>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-bold uppercase">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-sm text-gray-900 truncate w-32">
                {user?.name || "User"}
              </p>
              <span
                className={`badge ${getBadgeColor(role)} text-xs capitalize`}
              >
                {role?.replace("_", " ") || "Guest"}
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline
                 ${
                   isActive
                     ? "bg-primary-50 text-primary-600"
                     : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                 }`
              }
            >
              <link.icon size={17} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom links */}
        <div className="p-3 border-t border-gray-100 space-y-1">
          <NavLink
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 no-underline"
          >
            <FiHome size={17} /> Go to Site
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50"
          >
            <FiLogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6 md:p-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
