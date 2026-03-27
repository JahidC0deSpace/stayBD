import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useAuthStore } from "../../store/useAuthStore";
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiGrid,
  FiMessageSquare,
  FiSettings,
  FiSearch,
  FiHeart,
  FiHome,
} from "react-icons/fi";

const NavLink = ({ to, children, className = "" }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
        ${active ? "bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100" : "text-gray-600 hover:text-emerald-600 hover:bg-gray-50"}
        ${className}`}
    >
      {children}
    </Link>
  );
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";
  const isHost = user?.role === "host";
  const isServiceProvider = user?.role === "service_provider";

  const rolePath = isAdmin
    ? "/admin"
    : isHost
      ? "/host"
      : isServiceProvider
        ? "/provider"
        : "/guest";

  // Determine what to show for the user's role label
  const getRoleLabel = () => {
    if (!user) return "";
    if (isAdmin) return "Admin";
    if (isHost) return "Host";
    if (isServiceProvider) return "Provider";
    return "Guest";
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await logout();
      setProfileOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container-main max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-10 h-10 rounded-xl flex items-center bg-emerald-600 relative overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <div className="w-5 h-5 bg-red-500 rounded-full ml-[25%]"></div>
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">
              Stay<span className="text-emerald-600">BD</span>
            </span>
          </Link>

          {/* Desktop Nav - Centered */}
          <div className="hidden md:flex items-center gap-2 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
            <NavLink to="/properties">Properties</NavLink>
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/experiences">Experiences</NavLink>
            <NavLink to="/map">Map Search</NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/search")}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-colors"
              title="Search"
            >
              <FiSearch size={20} />
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-full border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-bold text-gray-800 leading-tight">
                      {user?.name?.split(" ")[0] || "User"}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      {getRoleLabel()}
                    </p>
                  </div>
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-emerald-700 font-bold text-sm">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
                    {/* User Profile Header */}
                    <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 m-2 rounded-xl">
                      <p className="font-bold text-gray-900 truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user?.email}
                      </p>

                      {/*Only show Verification Badge for Hosts/Providers/Admins */}
                      {(isHost || isServiceProvider || isAdmin) && (
                        <div className="mt-2 flex items-center">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${user?.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                          >
                            {user?.isVerified
                              ? "✓ Verified Partner"
                              : "Verification Pending"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="px-2 py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <FiUser size={16} className="text-gray-400" /> My
                        Profile
                      </Link>
                      {!(isAdmin || isHost || isServiceProvider) && (
                        <Link
                          to="/guest/dashboard"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <FiHome size={16} className="text-gray-400" /> My
                          Dashboard
                        </Link>
                      )}

                      <Link
                        to="/wishlist"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <FiHeart size={16} className="text-gray-400" /> Wishlist
                      </Link>
                      <Link
                        to="/chat"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <FiMessageSquare size={16} className="text-gray-400" />{" "}
                        Messages
                      </Link>
                      {(isAdmin || isHost || isServiceProvider) && (
                        <Link
                          to={`${rolePath}/my-bookings`} // Dynamic path
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <FiMessageSquare
                            size={16}
                            className="text-gray-400"
                          />
                          My Bookings
                        </Link>
                      )}
                    </div>

                    {/* Role-specific Dashboards */}
                    {(isHost || isAdmin || isServiceProvider) && (
                      <div className="px-2 py-1 border-t border-gray-100 mt-1">
                        <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Management
                        </p>
                        {isHost && (
                          <Link
                            to={
                              user.isApproved
                                ? "/host/dashboard"
                                : "/access-denied"
                            }
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors mb-1"
                            onClick={() => setProfileOpen(false)}
                          >
                            <FiGrid size={16} /> Host Dashboard
                          </Link>
                        )}
                        {isServiceProvider && (
                          <Link
                            to={
                              user.isApproved
                                ? "/provider/dashboard"
                                : "/access-denied"
                            }
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors mb-1"
                            onClick={() => setProfileOpen(false)}
                          >
                            <FiGrid size={16} /> Provider Dashboard
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <FiSettings size={16} /> Admin Panel
                          </Link>
                        )}
                      </div>
                    )}

                    <div className="px-2 pt-1 border-t border-gray-100 mt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiLogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="hidden md:block px-4 py-2 text-sm font-bold text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-bold bg-gray-900 text-white rounded-full hover:bg-emerald-600 transition-all shadow-md hover:shadow-lg"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="md:hidden absolute top-[72px] left-0 right-0 bg-white border-b border-gray-100 shadow-lg px-4 py-4 flex flex-col space-y-2 z-40">
            <Link
              to="/properties"
              className="px-4 py-3 font-semibold text-gray-800 hover:bg-emerald-50 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              Properties
            </Link>
            <Link
              to="/services"
              className="px-4 py-3 font-semibold text-gray-800 hover:bg-emerald-50 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              to="/experiences"
              className="px-4 py-3 font-semibold text-gray-800 hover:bg-emerald-50 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              Experiences
            </Link>
            <Link
              to="/map"
              className="px-4 py-3 font-semibold text-gray-800 hover:bg-emerald-50 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              Map Search
            </Link>

            {!isAuthenticated && (
              <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50 rounded-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-3 text-center font-bold text-white bg-emerald-600 rounded-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backdrop for desktop dropdown */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileOpen(false)}
        />
      )}
    </nav>
  );
}
