// src/pages/bookings/MyBookingsPage.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { format, isValid, parseISO } from "date-fns";
import { useMyBookingsStore } from "../../store/useMyBookingsStore";

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
    dot: "bg-purple-500",
    label: "Early Checkout",
  },
  rejected: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    dot: "bg-gray-400",
    label: "Rejected",
  },
};

const PAYMENT_CONFIG = {
  unpaid: { text: "text-gray-400", label: "Unpaid" },
  paid: { text: "text-emerald-600", label: "Paid ✓" },
  refunded: { text: "text-blue-600", label: "Refunded" },
  failed: { text: "text-red-500", label: "Failed" },
};

const TYPE_CONFIG = {
  property: {
    icon: "🏠",
    color: "bg-amber-50 text-amber-700",
    label: "Property",
  },
  service: { icon: "🔧", color: "bg-teal-50 text-teal-700", label: "Service" },
  experience: {
    icon: "🎨",
    color: "bg-violet-50 text-violet-700",
    label: "Experience",
  },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "rejected", label: "Rejected" },
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&auto=format&fit=crop";

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onCancel }) {
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const paymentCfg =
    PAYMENT_CONFIG[booking.paymentStatus] ?? PAYMENT_CONFIG.unpaid;
  const typeCfg = TYPE_CONFIG[booking.bookingType] ?? TYPE_CONFIG.property;

  const item =
    booking.property ?? booking.service ?? booking.experience ?? null;
  const itemTitle = item?.title ?? "Booking";
  const itemImage = item?.images?.[0]?.url ?? FALLBACK_IMAGE;
  const location = item?.location
    ? `${item.location.area ?? ""}${item.location.area ? ", " : ""}${item.location.district ?? ""}`
    : null;

  const dateDisplay =
    booking.bookingType === "property"
      ? `${safeDate(booking.checkIn)} → ${safeDate(booking.checkOut)}`
      : safeDate(booking.bookingDate ?? booking.checkIn);

  const canCancel = ["pending", "confirmed"].includes(booking.status);
  const needsPayment =
    booking.paymentStatus === "unpaid" &&
    ["pending", "confirmed"].includes(booking.status);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col sm:flex-row">
      <div className="sm:w-44 sm:shrink-0 h-40 sm:h-auto relative overflow-hidden">
        <img
          src={itemImage}
          alt={itemTitle}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${typeCfg.color}`}
        >
          {typeCfg.icon} {typeCfg.label}
        </span>
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">
                {itemTitle}
              </h3>
              {location && (
                <p className="text-xs text-gray-400 mt-1">📍 {location}</p>
              )}
            </div>
            <span
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
            <span>📅 {dateDisplay}</span>
            {booking.guestCount > 0 && (
              <span>
                👥 {booking.guestCount}{" "}
                {booking.bookingType === "experience" ? "participant" : "guest"}
                {booking.guestCount !== 1 ? "s" : ""}
              </span>
            )}
            {booking.totalHours && <span>⏱️ {booking.totalHours}h</span>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div>
            <span className="text-lg font-black text-gray-900">
              ৳{Number(booking.totalAmount ?? 0).toLocaleString()}
            </span>
            <span className={`ml-2 text-xs font-bold ${paymentCfg.text}`}>
              {paymentCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {needsPayment && (
              <Link
                to={`/book/${booking._id}`}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
              >
                Pay Now
              </Link>
            )}
            <Link
              to={`/bookings/${booking._id}`}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition"
            >
              View Details
            </Link>
            {canCancel && (
              <button
                onClick={() => onCancel(booking)}
                className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ activeTab }) {
  const messages = {
    all: {
      emoji: "🗓️",
      text: "No bookings yet",
      sub: "Your bookings will appear here once you make one.",
    },
    pending: {
      emoji: "⏳",
      text: "No pending bookings",
      sub: "Bookings awaiting confirmation will show here.",
    },
    confirmed: {
      emoji: "✅",
      text: "No confirmed bookings",
      sub: "Once a host confirms your booking, it'll show here.",
    },
    completed: {
      emoji: "🏁",
      text: "No completed bookings",
      sub: "Your past completed stays and services appear here.",
    },
    cancelled: {
      emoji: "❌",
      text: "No cancelled bookings",
      sub: "You haven't cancelled any bookings.",
    },
  };
  const { emoji, text, sub } = messages[activeTab] ?? messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">{emoji}</p>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{text}</h3>
      <p className="text-gray-400 text-sm max-w-xs mb-6">{sub}</p>
      <Link
        to="/"
        className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-sm"
      >
        Explore Listings
      </Link>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({
  booking,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  loading,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-1 text-gray-900">
          Cancel Booking
        </h2>
        <p className="text-gray-500 text-sm mb-5">
          Cancel{" "}
          <strong>
            {booking.property?.title ??
              booking.service?.title ??
              booking.experience?.title ??
              "this booking"}
          </strong>
          ? This cannot be undone.
        </p>
        <textarea
          rows={3}
          className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-red-300 outline-none transition-all mb-5 resize-none text-sm"
          placeholder="Reason for cancellation..."
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          maxLength={500}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            Keep It
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const {
    bookings,
    loading,
    activeTab,
    cancelTarget,
    cancelReason,
    cancelling,
    fetchBookings,
    setActiveTab,
    openCancelModal,
    closeCancelModal,
    setCancelReason,
    confirmCancel,
  } = useMyBookingsStore();

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ── Derived State ───────────────────────────────────────────────────────────
  const filtered =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    spent: bookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track and manage all your bookings
          </p>
        </div>

        {/* Stats row */}
        {!loading && bookings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total", value: stats.total, color: "text-gray-900" },
              {
                label: "Confirmed",
                value: stats.confirmed,
                color: "text-emerald-600",
              },
              {
                label: "Pending",
                value: stats.pending,
                color: "text-yellow-600",
              },
              {
                label: "Total Spent",
                value: `৳${stats.spent.toLocaleString()}`,
                color: "text-gray-900",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center"
              >
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? bookings.length
                : bookings.filter((b) => b.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeTab === tab.key
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-black ${activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState activeTab={activeTab} />
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onCancel={openCancelModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          onConfirm={confirmCancel}
          onClose={closeCancelModal}
          loading={cancelling}
        />
      )}
    </div>
  );
}
