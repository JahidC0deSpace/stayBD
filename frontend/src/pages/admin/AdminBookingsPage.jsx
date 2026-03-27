// src/pages/admin/AdminBookingsPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { format, isValid, parseISO } from "date-fns";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiSearch,
  FiArrowLeft,
  FiEye,
  FiCheck,
  FiX,
  FiLogOut,
  FiRefreshCw,
  FiFilter,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeDate = (val, fmt = "MMM dd, yyyy") => {
  if (!val) return "—";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  return isValid(d) ? format(d, fmt) : "—";
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&auto=format&fit=crop";

const STATUS_CONFIG = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
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
  unpaid: { bg: "bg-gray-100", text: "text-gray-500", label: "Unpaid" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Paid" },
  refunded: { bg: "bg-blue-50", text: "text-blue-600", label: "Refunded" },
  failed: { bg: "bg-red-50", text: "text-red-500", label: "Failed" },
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
  { key: "all", label: "All Bookings" },
  { key: "early_checkout_pending", label: "⏳ Early Checkout Requests" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "rejected", label: "Rejected" },
];

const LIMIT = 15;

// ─── Early Checkout Review Modal ──────────────────────────────────────────────
function EarlyCheckoutReviewModal({
  booking,
  onApprove,
  onReject,
  onClose,
  loading,
}) {
  const item = booking?.property ?? booking?.service ?? booking?.experience;
  const guest = booking?.guest;
  const host = booking?.host;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Early Checkout Request
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Review and take action
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition p-1"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Property Info */}
          {item && (
            <div className="flex gap-4 bg-gray-50 rounded-xl p-4">
              <img
                src={item.images?.[0]?.url ?? FALLBACK_IMAGE}
                alt={item.title}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <div>
                <p className="font-bold text-gray-900">{item.title}</p>
                {item.location && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    📍 {item.location.area ? `${item.location.area}, ` : ""}
                    {item.location.district}
                  </p>
                )}
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  #{booking.bookingReference ?? booking._id?.slice(-8)}
                </p>
              </div>
            </div>
          )}

          {/* Dates comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Original Checkout
              </p>
              <p className="text-base font-black text-gray-900">
                {safeDate(booking.checkOut)}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                Requested Checkout
              </p>
              <p className="text-base font-black text-purple-700">
                {safeDate(booking.actualCheckout)}
              </p>
            </div>
          </div>

          {/* Host notes */}
          {booking.earlyCheckoutNotes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                Host's Notes
              </p>
              <p className="text-sm text-amber-900 italic">
                "{booking.earlyCheckoutNotes}"
              </p>
            </div>
          )}

          {/* People info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                Host
              </p>
              <div className="flex items-center gap-2">
                {host?.avatar ? (
                  <img
                    src={host.avatar}
                    className="w-7 h-7 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 text-xs font-bold uppercase">
                      {host?.name?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-800 text-xs">
                    {host?.name ?? "—"}
                  </p>
                  <p className="text-gray-400 text-[10px]">{host?.email}</p>
                </div>
              </div>
            </div>
            <div className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                Guest
              </p>
              <div className="flex items-center gap-2">
                {guest?.avatar ? (
                  <img
                    src={guest.avatar}
                    className="w-7 h-7 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 text-xs font-bold uppercase">
                      {guest?.name?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-800 text-xs">
                    {guest?.name ?? "—"}
                  </p>
                  <p className="text-gray-400 text-[10px]">{guest?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
            <span className="text-gray-500 font-medium">Total Amount</span>
            <span className="font-black text-gray-900 text-base">
              ৳{Number(booking.totalAmount ?? 0).toLocaleString()}
            </span>
          </div>

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            ✅ <strong>Approving</strong> will update the checkout date and free
            up the property calendar for new bookings.
            <br />❌ <strong>Rejecting</strong> will keep the booking as
            confirmed with the original dates.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            Close
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Processing…" : "❌ Reject"}
          </button>
          <button
            onClick={onApprove}
            disabled={loading}
            className="flex-1 py-3 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Processing…" : "✅ Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Row ──────────────────────────────────────────────────────────────
function BookingRow({ booking, onReviewEarlyCheckout }) {
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const paymentCfg =
    PAYMENT_CONFIG[booking.paymentStatus] ?? PAYMENT_CONFIG.unpaid;
  const typeCfg = TYPE_CONFIG[booking.bookingType] ?? TYPE_CONFIG.property;

  const item =
    booking.property ?? booking.service ?? booking.experience ?? null;
  const itemTitle = item?.title ?? "—";
  const guest = booking.guest;
  const host = booking.host;

  const dateDisplay =
    booking.bookingType === "property"
      ? `${safeDate(booking.checkIn)} → ${safeDate(booking.checkOut)}`
      : safeDate(booking.bookingDate ?? booking.checkIn);

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      {/* Booking Info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <img
            src={item?.images?.[0]?.url ?? FALLBACK_IMAGE}
            alt={itemTitle}
            className="w-10 h-10 rounded-xl object-cover shrink-0"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <div>
            <p className="font-semibold text-gray-900 text-sm truncate max-w-[160px]">
              {itemTitle}
            </p>
            <p className="text-[10px] font-mono text-gray-400">
              #{booking.bookingReference ?? booking._id?.slice(-8)}
            </p>
            <span
              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${typeCfg.color}`}
            >
              {typeCfg.icon} {typeCfg.label}
            </span>
          </div>
        </div>
      </td>

      {/* Guest */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {guest?.avatar ? (
            <img
              src={guest.avatar}
              className="w-8 h-8 rounded-full object-cover"
              alt=""
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-primary-600 text-xs font-bold uppercase">
                {guest?.name?.charAt(0) ?? "?"}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[100px]">
              {guest?.name ?? "—"}
            </p>
            <p className="text-[10px] text-gray-400 truncate max-w-[100px]">
              {guest?.email}
            </p>
          </div>
        </div>
      </td>

      {/* Host */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {host?.avatar ? (
            <img
              src={host.avatar}
              className="w-8 h-8 rounded-full object-cover"
              alt=""
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-orange-600 text-xs font-bold uppercase">
                {host?.name?.charAt(0) ?? "?"}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[100px]">
              {host?.name ?? "—"}
            </p>
            <p className="text-[10px] text-gray-400 truncate max-w-[100px]">
              {host?.email}
            </p>
          </div>
        </div>
      </td>

      {/* Dates */}
      <td className="py-4 px-4 text-xs text-gray-600 whitespace-nowrap">
        {dateDisplay}
      </td>

      {/* Amount */}
      <td className="py-4 px-4">
        <p className="font-bold text-gray-900 text-sm">
          ৳{Number(booking.totalAmount ?? 0).toLocaleString()}
        </p>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${paymentCfg.bg} ${paymentCfg.text}`}
        >
          {paymentCfg.label}
        </span>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
        {booking.earlyCheckoutRequested && (
          <span className="mt-1 flex items-center gap-1 text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md w-fit">
            <FiLogOut size={9} /> Early Checkout Pending
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Link
            to={`/bookings/${booking._id}`}
            className="p-2 bg-gray-50 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition border border-gray-200 hover:border-primary-100"
            title="View Booking"
          >
            <FiEye size={15} />
          </Link>
          {booking.earlyCheckoutRequested && (
            <button
              onClick={() => onReviewEarlyCheckout(booking)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition"
              title="Review Early Checkout"
            >
              <FiLogOut size={12} /> Review
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [reviewModal, setReviewModal] = useState(null); // booking
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      // typeFilter is applied client-side on fetched data (see filteredBookings)

      const res = await api
        .get("/admin/bookings", { params })
        .catch(() =>
          api.get("/bookings", { params: { ...params, viewAs: "admin" } }),
        );

      const data = res.data?.data ?? res.data;
      setBookings(data?.bookings ?? data ?? []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      toast.error("Failed to load bookings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ── Early Checkout Actions ───────────────────────────────────────────────────
  const handleApproveEarlyCheckout = async () => {
    if (!reviewModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${reviewModal._id}/early-checkout-approve`);
      toast.success("Early checkout approved! Property dates have been freed.");
      setReviewModal(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to approve.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectEarlyCheckout = async () => {
    if (!reviewModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${reviewModal._id}/early-checkout-reject`);
      toast.success(
        "Early checkout request rejected. Booking stays confirmed.",
      );
      setReviewModal(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to reject.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const earlyCheckoutPendingCount = bookings.filter(
    (b) => b.earlyCheckoutRequested,
  ).length;

  // Apply type filter client-side on top of tab/status filter
  const filteredBookings = (() => {
    let list = bookings;
    if (activeTab === "early_checkout_pending")
      list = list.filter((b) => b.earlyCheckoutRequested);
    else if (activeTab !== "all")
      list = list.filter((b) => b.status === activeTab);
    if (typeFilter) list = list.filter((b) => b.bookingType === typeFilter);
    return list;
  })();

  const tabCounts = {
    all: bookings.length,
    early_checkout_pending: earlyCheckoutPendingCount,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    rejected: bookings.filter((b) => b.status === "rejected").length,
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition mb-2 group"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Booking Management
          </h1>
          <p className="text-gray-500 text-sm">{total} total bookings found</p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition"
        >
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Early Checkout Alert Banner */}
      {earlyCheckoutPendingCount > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4">
          <FiLogOut className="text-purple-500 shrink-0" size={20} />
          <div>
            <p className="text-sm font-bold text-purple-800">
              {earlyCheckoutPendingCount} early checkout request
              {earlyCheckoutPendingCount !== 1 ? "s" : ""} waiting for your
              review
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              Hosts have reported guests leaving early. Approve to free up
              property dates.
            </p>
          </div>
          <button
            onClick={() => setActiveTab("early_checkout_pending")}
            className="ml-auto shrink-0 px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition"
          >
            Review Now →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={search}
            placeholder="Search booking ref, guest name..."
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                fetchBookings();
              }
            }}
            className="input-field pl-10 py-2 text-sm w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input-field py-2 text-sm w-44"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="early_checkout">Early Checkout</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="input-field py-2 text-sm w-44"
        >
          <option value="">All Types</option>
          <option value="property">Property</option>
          <option value="service">Service</option>
          <option value="experience">Experience</option>
        </select>
        <button
          onClick={() => {
            setPage(1);
            fetchBookings();
          }}
          className="btn-primary px-6 py-2 text-sm"
        >
          <FiFilter size={14} className="inline mr-1" /> Filter
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => {
          const count = tabCounts[tab.key] ?? 0;
          const isEarlyCheckout = tab.key === "early_checkout_pending";
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                activeTab === tab.key
                  ? isEarlyCheckout
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-primary-600 text-white shadow-sm"
                  : isEarlyCheckout && count > 0
                    ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : isEarlyCheckout && count > 0
                        ? "bg-purple-200 text-purple-700"
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

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">
              {activeTab === "early_checkout_pending" ? "🎉" : "🗓️"}
            </p>
            <p className="font-bold text-gray-700 text-lg">
              {activeTab === "early_checkout_pending"
                ? "No pending early checkout requests"
                : "No bookings found"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === "early_checkout_pending"
                ? "All early checkout requests have been handled."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    "Booking",
                    "Guest",
                    "Host",
                    "Dates",
                    "Amount",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.map((booking) => (
                  <BookingRow
                    key={booking._id}
                    booking={booking}
                    onReviewEarlyCheckout={setReviewModal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Early Checkout Review Modal */}
      {reviewModal && (
        <EarlyCheckoutReviewModal
          booking={reviewModal}
          onApprove={handleApproveEarlyCheckout}
          onReject={handleRejectEarlyCheckout}
          onClose={() => setReviewModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
