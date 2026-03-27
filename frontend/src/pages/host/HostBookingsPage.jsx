// src/pages/host/HostBookingsPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { format, isValid, parseISO } from "date-fns";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiX,
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiRefreshCw,
  FiEye,
  FiLogOut,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeDate = (val, fmt = "MMM dd, yyyy") => {
  if (!val) return "—";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  return isValid(d) ? format(d, fmt) : "—";
};

const toDateInputValue = (val) => {
  if (!val) return "";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&auto=format&fit=crop";

const STATUS_CONFIG = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-400",
    label: "Pending",
  },
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    label: "Confirmed",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    dot: "bg-red-400",
    label: "Cancelled",
  },
  completed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    label: "Completed",
  },
  early_checkout: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
    label: "Early Checkout",
  },
};

const PAYMENT_CONFIG = {
  unpaid: { text: "text-gray-400", label: "Unpaid" },
  paid: { text: "text-emerald-600", label: "Paid ✓" },
  refunded: { text: "text-blue-500", label: "Refunded" },
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
];

// ─── Standard Action Modal ────────────────────────────────────────────────────
function ActionModal({ action, booking, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState("");

  const config = {
    confirm: {
      title: "Approve Booking",
      desc: "This will confirm the reservation and notify the guest.",
      confirmLabel: "Yes, Approve",
      confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      emoji: "✅",
      needsReason: false,
    },
    reject: {
      title: "Reject Booking",
      desc: "The guest will be notified. Please provide a reason.",
      confirmLabel: "Reject Booking",
      confirmClass: "bg-red-500 hover:bg-red-600 text-white",
      emoji: "❌",
      needsReason: true,
    },
    complete: {
      title: "Mark as Completed",
      desc: "Confirm the stay is finished and the guest has checked out.",
      confirmLabel: "Mark Completed",
      confirmClass: "bg-blue-600 hover:bg-blue-700 text-white",
      emoji: "🏁",
      needsReason: false,
    },
    cancel: {
      title: "Cancel Booking",
      desc: "This will cancel the booking. The guest will be notified.",
      confirmLabel: "Cancel Booking",
      confirmClass: "bg-red-500 hover:bg-red-600 text-white",
      emoji: "🚫",
      needsReason: true,
    },
  };

  const cfg = config[action];
  if (!cfg) return null;
  const item = booking?.property ?? booking?.service ?? booking?.experience;
  const canSubmit = cfg.needsReason ? reason.trim().length > 0 : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="text-4xl mb-3">{cfg.emoji}</div>
        <h2 className="text-2xl font-bold mb-1 text-gray-900">{cfg.title}</h2>
        <p className="text-gray-500 text-sm mb-1">{cfg.desc}</p>
        {item?.title && (
          <p className="text-sm font-semibold text-gray-700 mb-5 bg-gray-50 px-3 py-2 rounded-xl">
            {item.title}
          </p>
        )}
        {cfg.needsReason && (
          <textarea
            rows={3}
            className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-primary-300 outline-none transition-all mb-5 resize-none text-sm"
            placeholder="Reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            Go Back
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !canSubmit}
            className={`flex-1 py-3 font-bold rounded-xl transition disabled:opacity-50 ${cfg.confirmClass}`}
          >
            {loading ? "Processing…" : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Early Checkout Request Modal ─────────────────────────────────────────────
function EarlyCheckoutModal({ booking, onConfirm, onClose, loading }) {
  const item = booking?.property ?? booking?.service ?? booking?.experience;

  const checkInDate = booking?.checkIn ? new Date(booking.checkIn) : new Date();
  const checkOutDate = booking?.checkOut
    ? new Date(booking.checkOut)
    : new Date();

  const minDate = toDateInputValue(
    new Date(Math.max(Date.now(), checkInDate.getTime() + 86400000)),
  );
  const maxDate = toDateInputValue(new Date(checkOutDate.getTime() - 86400000));

  const [actualCheckout, setActualCheckout] = useState(minDate);
  const [notes, setNotes] = useState("");
  const canSubmit = actualCheckout.length > 0 && notes.trim().length > 0;

  // Already submitted — show pending status view
  if (booking?.earlyCheckoutRequested) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
          <div className="text-4xl mb-3">⏳</div>
          <h2 className="text-2xl font-bold mb-1 text-gray-900">
            Request Pending
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Your early checkout request for <strong>{item?.title}</strong> has
            been submitted and is awaiting admin approval. The property dates
            will be freed once approved.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-amber-800">
            <p className="font-bold mb-1">📋 Request Details</p>
            <p>Submitted: {safeDate(booking.earlyCheckoutRequestedAt)}</p>
            {booking.earlyCheckoutNotes && (
              <p className="mt-1 text-amber-700 italic">
                "{booking.earlyCheckoutNotes}"
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="text-4xl mb-3">🚪</div>
        <h2 className="text-2xl font-bold mb-1 text-gray-900">
          Early Checkout Request
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          Guest left early? Submit a request to admin to update the checkout
          date and free up the property.
        </p>

        {/* Booking summary */}
        {item?.title && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-sm">
            <p className="font-bold text-gray-800">{item.title}</p>
            <p className="text-gray-500 mt-1">
              Original: {safeDate(booking.checkIn)} →{" "}
              {safeDate(booking.checkOut)}
            </p>
            <p className="text-gray-500">Guest: {booking.guest?.name ?? "—"}</p>
          </div>
        )}

        {/* Actual checkout date */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Actual Checkout Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={actualCheckout}
            onChange={(e) => setActualCheckout(e.target.value)}
            className="w-full p-3 rounded-2xl border-2 border-gray-100 focus:border-primary-300 outline-none transition text-sm font-medium"
          />
          <p className="text-xs text-gray-400 mt-1">
            Must be before original checkout ({safeDate(booking.checkOut)})
          </p>
        </div>

        {/* Notes for admin */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Notes for Admin <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-primary-300 outline-none transition-all resize-none text-sm"
            placeholder="e.g. Guest checked out on Dec 10th morning due to personal reasons..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-xs text-blue-700">
          ℹ️ The property stays blocked until admin approves. You'll be notified
          once done.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ actualCheckout, notes })}
            disabled={loading || !canSubmit}
            className="flex-1 py-3 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onAction, onEarlyCheckout }) {
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

  const guest = booking.guest;
  const guestName = guest?.name ?? "Guest";
  const guestAvatar = guest?.avatar;

  const dateDisplay =
    booking.bookingType === "property"
      ? `${safeDate(booking.checkIn)} → ${safeDate(booking.checkOut)}`
      : safeDate(booking.bookingDate ?? booking.checkIn);

  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";
  const canCancel = ["pending", "confirmed"].includes(booking.status);
  const canRequestEarlyCheckout =
    isConfirmed &&
    booking.bookingType === "property" &&
    booking.paymentStatus === "paid";
  const earlyCheckoutPending = booking.earlyCheckoutRequested === true;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${statusCfg.border}`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
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
          {earlyCheckoutPending && (
            <span className="absolute bottom-2 left-0 right-0 mx-2 text-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white">
              ⏳ Early Checkout Pending
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between gap-3">
          <div>
            {/* Title + Status */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-1">
                  {itemTitle}
                </h3>
                {location && (
                  <p className="text-xs text-gray-400 mt-0.5">📍 {location}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  #{booking.bookingReference ?? booking._id?.slice(-8)}
                </p>
              </div>
              <span
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            </div>

            {/* Guest Info */}
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 rounded-xl">
              {guestAvatar ? (
                <img
                  src={guestAvatar}
                  alt={guestName}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 text-xs font-bold uppercase">
                    {guestName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-800">{guestName}</p>
                {guest?.email && (
                  <p className="text-[10px] text-gray-400">{guest.email}</p>
                )}
              </div>
              {guest?.phone && (
                <p className="ml-auto text-[10px] text-gray-400">
                  {guest.phone}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
              <span>📅 {dateDisplay}</span>
              {booking.guestCount > 0 && (
                <span>
                  👥 {booking.guestCount} guest
                  {booking.guestCount !== 1 ? "s" : ""}
                </span>
              )}
              {booking.totalHours && <span>⏱️ {booking.totalHours}h</span>}
              <span>🗓️ Booked {safeDate(booking.createdAt)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div>
              <span className="text-lg font-black text-gray-900">
                ৳{Number(booking.totalAmount ?? 0).toLocaleString()}
              </span>
              <span className={`ml-2 text-xs font-bold ${paymentCfg.text}`}>
                {paymentCfg.label}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Link
                to={`/bookings/${booking._id}`}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition"
              >
                <FiEye size={12} /> View
              </Link>

              {booking.chatRoomId && (
                <Link
                  to={`/chat/${booking._id}`}
                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-200 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition"
                >
                  <FiMessageSquare size={12} /> Message
                </Link>
              )}

              {isPending && (
                <button
                  onClick={() => onAction("confirm", booking)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  <FiCheck size={12} /> Approve
                </button>
              )}

              {isPending && (
                <button
                  onClick={() => onAction("reject", booking)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition"
                >
                  <FiX size={12} /> Reject
                </button>
              )}

              {isConfirmed && (
                <button
                  onClick={() => onAction("complete", booking)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  <FiCheckCircle size={12} /> Complete
                </button>
              )}

              {/* Early Checkout button — shows "Requested" if already pending */}
              {canRequestEarlyCheckout && (
                <button
                  onClick={() => onEarlyCheckout(booking)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition
                    ${
                      earlyCheckoutPending
                        ? "bg-purple-50 text-purple-500 border border-purple-200"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                >
                  <FiLogOut size={12} />
                  {earlyCheckoutPending ? "Requested" : "Early Checkout"}
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => onAction("cancel", booking)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition"
                >
                  <FiX size={12} /> Cancel
                </button>
              )}
            </div>
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
      sub: "When guests book your property, they'll appear here.",
    },
    pending: {
      emoji: "⏳",
      text: "No pending requests",
      sub: "New booking requests will show up here.",
    },
    confirmed: {
      emoji: "✅",
      text: "No confirmed bookings",
      sub: "Approved bookings will appear here.",
    },
    completed: {
      emoji: "🏁",
      text: "No completed stays",
      sub: "Completed bookings will show here.",
    },
    cancelled: {
      emoji: "❌",
      text: "No cancelled bookings",
      sub: "Cancelled bookings will appear here.",
    },
  };
  const { emoji, text, sub } = messages[activeTab] ?? messages.all;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">{emoji}</p>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{text}</h3>
      <p className="text-gray-400 text-sm max-w-xs mb-6">{sub}</p>
      <Link
        to="/host/listings"
        className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition text-sm"
      >
        View My Listings
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HostBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [earlyCheckoutModal, setEarlyCheckoutModal] = useState(null);
  const [earlyCheckoutLoading, setEarlyCheckoutLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings/host/my-bookings", {
        params: { viewAs: "host", limit: 100 },
      });
      const data = res.data?.data ?? res.data;
      setBookings(data?.bookings ?? data ?? []);
    } catch (err) {
      toast.error("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleAction = (action, booking) => setActionModal({ action, booking });

  const handleConfirmAction = async (reason) => {
    if (!actionModal) return;
    const { action, booking } = actionModal;
    setActionLoading(true);
    try {
      if (action === "confirm" || action === "reject") {
        await api.patch(`/bookings/${booking._id}/status`, {
          status: action === "confirm" ? "confirmed" : "rejected",
        });
        toast.success(
          `Booking ${action === "confirm" ? "approved" : "rejected"}.`,
        );
      } else if (action === "complete") {
        await api.patch(`/bookings/${booking._id}/complete`);
        toast.success("Booking marked as completed.");
      } else if (action === "cancel") {
        await api.patch(`/bookings/${booking._id}/cancel`, { reason });
        toast.success("Booking cancelled.");
      }
      setActionModal(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEarlyCheckoutSubmit = async ({ actualCheckout, notes }) => {
    if (!earlyCheckoutModal) return;
    setEarlyCheckoutLoading(true);
    try {
      await api.post(
        `/bookings/${earlyCheckoutModal._id}/early-checkout-request`,
        {
          actualCheckout,
          notes,
        },
      );
      toast.success(
        "Early checkout request submitted! Admin will review it shortly.",
      );
      setEarlyCheckoutModal(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to submit request.");
    } finally {
      setEarlyCheckoutLoading(false);
    }
  };

  const filtered =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    revenue: bookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((s, b) => s + (b.totalAmount ?? 0), 0),
    earlyCheckoutPending: bookings.filter((b) => b.earlyCheckoutRequested)
      .length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Bookings
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Review and manage reservations for your properties
            </p>
          </div>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        {!loading && bookings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, color: "text-gray-900" },
              {
                label: "Pending",
                value: stats.pending,
                color: "text-amber-600",
              },
              {
                label: "Confirmed",
                value: stats.confirmed,
                color: "text-emerald-600",
              },
              {
                label: "Completed",
                value: stats.completed,
                color: "text-blue-600",
              },
              {
                label: "Cancelled",
                value: stats.cancelled,
                color: "text-red-500",
              },
              {
                label: "Revenue",
                value: `৳${stats.revenue.toLocaleString()}`,
                color: "text-gray-900",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center"
              >
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Pending bookings alert */}
        {!loading && stats.pending > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 mb-4">
            <FiClock className="text-amber-500 shrink-0" size={18} />
            <p className="text-sm font-bold text-amber-700">
              {stats.pending} pending booking{stats.pending !== 1 ? "s" : ""}{" "}
              waiting for your approval.
            </p>
            <button
              onClick={() => setActiveTab("pending")}
              className="ml-auto text-xs font-black text-amber-700 underline underline-offset-2 hover:text-amber-900 shrink-0"
            >
              Review Now →
            </button>
          </div>
        )}

        {/* Early checkout pending alert */}
        {!loading && stats.earlyCheckoutPending > 0 && (
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-3.5 mb-4">
            <FiLogOut className="text-purple-500 shrink-0" size={18} />
            <p className="text-sm font-bold text-purple-700">
              {stats.earlyCheckoutPending} early checkout request
              {stats.earlyCheckoutPending !== 1 ? "s are" : " is"} awaiting
              admin approval.
            </p>
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
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
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
                onAction={handleAction}
                onEarlyCheckout={setEarlyCheckoutModal}
              />
            ))}
          </div>
        )}
      </div>

      {actionModal && (
        <ActionModal
          action={actionModal.action}
          booking={actionModal.booking}
          onConfirm={handleConfirmAction}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
        />
      )}

      {earlyCheckoutModal && (
        <EarlyCheckoutModal
          booking={earlyCheckoutModal}
          onConfirm={handleEarlyCheckoutSubmit}
          onClose={() => setEarlyCheckoutModal(null)}
          loading={earlyCheckoutLoading}
        />
      )}
    </div>
  );
}
