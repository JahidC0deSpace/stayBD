// src/pages/guest/GuestDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookingAPI } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { format, isValid, parseISO, isPast, isFuture } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeDate = (val, fmt = "MMM dd, yyyy") => {
  if (!val) return "—";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  return isValid(d) ? format(d, fmt) : "—";
};

const STATUS_CONFIG = {
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-400",
    label: "Pending",
  },
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Confirmed",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-400",
    label: "Cancelled",
  },
  completed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "Completed",
  },
  early_checkout: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-400",
    label: "Early Checkout",
  },
  rejected: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    dot: "bg-gray-400",
    label: "Rejected",
  },
};

const TYPE_CONFIG = {
  property: { icon: "🏠", label: "Property" },
  service: { icon: "🔧", label: "Service" },
  experience: { icon: "🎨", label: "Experience" },
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&auto=format&fit=crop";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-sm font-bold text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Upcoming booking card ────────────────────────────────────────────────────
function UpcomingCard({ booking }) {
  const item =
    booking.property ?? booking.service ?? booking.experience ?? null;
  const title = item?.title ?? "Booking";
  const image = item?.images?.[0]?.url ?? FALLBACK_IMAGE;
  const loc = item?.location
    ? `${item.location.area ?? ""}${item.location.area ? ", " : ""}${item.location.district ?? ""}`
    : null;

  const typeCfg = TYPE_CONFIG[booking.bookingType] ?? TYPE_CONFIG.property;
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

  const dateLabel =
    booking.bookingType === "property"
      ? `${safeDate(booking.checkIn)} → ${safeDate(booking.checkOut)}`
      : safeDate(booking.bookingDate ?? booking.checkIn);

  return (
    <Link
      to={`/bookings/${booking._id}`}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition group"
    >
      <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <span className="absolute bottom-0.5 right-0.5 text-sm">
          {typeCfg.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate">{title}</p>
        {loc && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {loc}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">📅 {dateLabel}</p>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
        <p className="text-xs font-bold text-gray-700 mt-1.5">
          ৳{Number(booking.totalAmount ?? 0).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────
function QuickAction({ to, icon, label, sub, color }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed transition hover:border-solid hover:shadow-sm ${color}`}
    >
      <span className="text-3xl">{icon}</span>
      <div className="text-center">
        <p className="text-sm font-bold">{label}</p>
        {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      </div>
    </Link>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function GuestDashboard() {
  const user = useAuthStore((state) => state.user);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await bookingAPI.getUserBookings({ viewAs: "guest" });
        const data =
          res.data?.data?.bookings ??
          res.data?.bookings ??
          res.data?.data ??
          [];
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const total = bookings.length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  // Upcoming = confirmed bookings with future checkIn/bookingDate
  const upcoming = bookings
    .filter((b) => {
      if (!["confirmed", "pending"].includes(b.status)) return false;
      const date = b.checkIn ?? b.bookingDate;
      if (!date) return false;
      const d = typeof date === "string" ? parseISO(date) : new Date(date);
      return isValid(d) && isFuture(d);
    })
    .sort((a, b) => {
      const da = new Date(a.checkIn ?? a.bookingDate);
      const db = new Date(b.checkIn ?? b.bookingDate);
      return da - db;
    })
    .slice(0, 4);

  // Recent = last 3 bookings
  const recent = [...bookings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Welcome banner ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 right-16 w-24 h-24 bg-white/10 rounded-full" />

          <div className="relative">
            <p className="text-emerald-100 text-sm font-medium mb-1">
              {greeting},
            </p>
            <h1 className="text-2xl sm:text-3xl font-black mb-3">
              {firstName} 👋
            </h1>
            {upcoming.length > 0 ? (
              <p className="text-emerald-100 text-sm">
                You have{" "}
                <span className="text-white font-bold">{upcoming.length}</span>{" "}
                upcoming booking{upcoming.length !== 1 ? "s" : ""}.
              </p>
            ) : (
              <p className="text-emerald-100 text-sm">
                Ready to explore? Find your next stay or experience.
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <Link
                to="/properties"
                className="px-4 py-2 bg-white text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-50 transition"
              >
                Browse Properties
              </Link>
              <Link
                to="/guest/my-bookings"
                className="px-4 py-2 bg-white/20 text-white font-bold text-sm rounded-xl hover:bg-white/30 transition border border-white/30"
              >
                My Bookings
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stats grid ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon="📋"
                label="Total Bookings"
                value={total}
                color="text-gray-900"
              />
              <StatCard
                icon="✅"
                label="Confirmed"
                value={confirmed}
                color="text-emerald-600"
              />
              <StatCard
                icon="⏳"
                label="Pending"
                value={pending}
                color="text-yellow-600"
              />
              <StatCard
                icon="💰"
                label="Total Spent"
                value={`৳${totalSpent.toLocaleString()}`}
                sub="from paid bookings"
                color="text-gray-900"
              />
            </div>

            {/* ── Upcoming bookings ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Upcoming Bookings
                </h2>
                <Link
                  to="/guest/my-bookings"
                  className="text-sm font-bold text-emerald-600 hover:underline"
                >
                  View all →
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-3xl mb-2">🗓️</p>
                  <p className="font-bold text-gray-700">
                    No upcoming bookings
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your confirmed upcoming stays will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((b) => (
                    <UpcomingCard key={b._id} booking={b} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Recent activity ───────────────────────────────────────── */}
            {recent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Recent Activity
                  </h2>
                  <Link
                    to="/guest/my-bookings"
                    className="text-sm font-bold text-emerald-600 hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recent.map((b) => (
                    <UpcomingCard key={b._id} booking={b} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Quick actions ─────────────────────────────────────────── */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Explore</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickAction
                  to="/properties"
                  icon="🏠"
                  label="Browse Properties"
                  sub="Find your next stay"
                  color="border-amber-200 text-amber-700 hover:bg-amber-50"
                />
                <QuickAction
                  to="/services"
                  icon="🔧"
                  label="Book a Service"
                  sub="Home cleaning, repairs & more"
                  color="border-teal-200 text-teal-700 hover:bg-teal-50"
                />
                <QuickAction
                  to="/experiences"
                  icon="🎨"
                  label="Try an Experience"
                  sub="Local activities & workshops"
                  color="border-violet-200 text-violet-700 hover:bg-violet-50"
                />
              </div>
            </div>

            {/* ── Profile completion nudge ──────────────────────────────── */}
            {!user?.phone && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-amber-800">
                    Complete your profile
                  </p>
                  <p className="text-sm text-amber-600 mt-0.5">
                    Add your phone number and address to book faster.
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="shrink-0 px-4 py-2 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition"
                >
                  Update Profile
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
