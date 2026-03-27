import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { bookingAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";
import { format, isValid, parseISO } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeDate = (val, fmt = "EEE, MMM dd yyyy") => {
  if (!val) return "—";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  return isValid(d) ? format(d, fmt) : "—";
};

const STATUS_STYLES = {
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    label: "⏳ Pending",
  },
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "✅ Confirmed",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "❌ Cancelled",
  },
  completed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "🏁 Completed",
  },
  early_checkout: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    label: "🚪 Early Checkout",
  },
};

const PAYMENT_STYLES = {
  unpaid: { bg: "bg-gray-50", text: "text-gray-600", label: "Unpaid" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
  refunded: { bg: "bg-blue-50", text: "text-blue-700", label: "Refunded" },
  failed: { bg: "bg-red-50", text: "text-red-700", label: "Failed" },
};

const TYPE_ICONS = { property: "🏠", service: "🔧", experience: "🎨" };

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900 font-semibold text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

function PriceRow({ label, value, bold, currency = "BDT" }) {
  if (!value && value !== 0) return null;
  return (
    <div
      className={`flex justify-between items-center py-2 ${bold ? "border-t border-gray-200 mt-2 pt-4" : ""}`}
    >
      <span
        className={`text-sm ${bold ? "font-bold text-gray-900" : "text-gray-500"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${bold ? "font-bold text-gray-900 text-lg" : "text-gray-800 font-medium"}`}
      >
        ৳{Number(value).toLocaleString()}
        {bold && <span className="text-xs text-gray-400 ml-1">{currency}</span>}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ── Fetch booking ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const res = await bookingAPI.getBookingDetails(id);
        const data = res.data?.data ?? res.data;
        if (!data) throw new Error("Booking not found");
        setBooking(data);
      } catch (err) {
        console.error(err);
        toast.error("Could not load booking details");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id, navigate]);

  // ── Cancel booking ──────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    setCancelling(true);
    try {
      await bookingAPI.cancelBooking(id, cancelReason);
      toast.success("Booking cancelled successfully");
      setShowCancelModal(false);
      const res = await bookingAPI.getBookingDetails(id);
      setBooking(res.data?.data ?? res.data);
    } catch (err) {
      toast.error(err.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!booking) return null;

  // ── Derived values ──────────────────────────────────────────────────────────
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
  const paymentStyle =
    PAYMENT_STYLES[booking.paymentStatus] ?? PAYMENT_STYLES.unpaid;
  const typeIcon = TYPE_ICONS[booking.bookingType] ?? "📋";

  const item =
    booking.property ?? booking.service ?? booking.experience ?? null;
  const itemTitle = item?.title ?? "—";
  const itemImage = item?.images?.[0]?.url ?? null;
  const host = booking.host ?? null;
  const pb = booking.priceBreakdown ?? {};

  const canCancel = ["pending", "confirmed"].includes(booking.status);
  const canChat = ["pending", "confirmed", "completed"].includes(
    booking.status,
  );
  const needsPayment =
    booking.paymentStatus === "unpaid" &&
    ["pending", "confirmed"].includes(booking.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
          <Link to="/" className="hover:text-emerald-600 transition">
            Home
          </Link>
          <span>/</span>
          <Link
            to="/guest/my-bookings"
            className="hover:text-emerald-600 transition"
          >
            My Bookings
          </Link>
          <span>/</span>
          <span className="text-gray-900 truncate">
            {booking.bookingReference ?? id}
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Booking Details
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-mono">
              {booking.bookingReference ?? id}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {statusStyle.label}
            </span>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${paymentStyle.bg} ${paymentStyle.text}`}
            >
              {paymentStyle.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: Main info ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {itemImage && (
                <img
                  src={itemImage}
                  alt={itemTitle}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{typeIcon}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                      {booking.bookingType}
                    </p>
                    <h2 className="text-xl font-bold text-gray-900">
                      {itemTitle}
                    </h2>
                    {item?.location && (
                      <p className="text-sm text-gray-500 mt-1">
                        📍 {item.location.area ?? ""}
                        {item.location.area ? ", " : ""}
                        {item.location.district ?? ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Booking info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Booking Information
              </h3>

              {booking.bookingType === "property" && (
                <>
                  <InfoRow label="Check-in" value={safeDate(booking.checkIn)} />
                  <InfoRow
                    label="Check-out"
                    value={safeDate(booking.checkOut)}
                  />
                  <InfoRow
                    label="Duration"
                    value={
                      booking.stayDuration ??
                      `${booking.totalNights ?? "—"} nights`
                    }
                  />
                </>
              )}

              {booking.bookingType !== "property" && (
                <>
                  <InfoRow
                    label="Date"
                    value={safeDate(booking.bookingDate ?? booking.checkIn)}
                  />
                  <InfoRow
                    label="Start time"
                    value={
                      booking.startTime ??
                      (booking.checkIn
                        ? format(parseISO(booking.checkIn), "h:mm a")
                        : "—")
                    }
                  />
                  <InfoRow
                    label="End time"
                    value={
                      booking.endTime ??
                      (booking.checkOut
                        ? format(parseISO(booking.checkOut), "h:mm a")
                        : "—")
                    }
                  />
                  {booking.totalHours && (
                    <InfoRow
                      label="Duration"
                      value={`${booking.totalHours} hour${booking.totalHours !== 1 ? "s" : ""}`}
                    />
                  )}
                  {booking.bookingType === "service" && (
                    <InfoRow
                      label="Service Address"
                      value={booking.serviceAddress}
                    />
                  )}
                </>
              )}

              <InfoRow
                label={
                  booking.bookingType === "experience"
                    ? "Participants"
                    : "Guests"
                }
                value={booking.guestCount ?? "—"}
              />

              {booking.specialRequests && (
                <div className="pt-3 border-t border-gray-100 mt-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">
                    Special Requests
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {booking.specialRequests}
                  </p>
                </div>
              )}
            </div>

            {/* Host / Provider info */}
            {host && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  {booking.bookingType === "service"
                    ? "Service Provider"
                    : "Host"}
                </h3>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {host.avatar ? (
                      <img
                        src={host.avatar}
                        alt={host.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-700 font-bold text-xl">
                          {host.name?.charAt(0) ?? "H"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{host.name}</p>
                      <p className="text-sm text-gray-500">{host.email}</p>
                      {host.phone && (
                        <p className="text-sm text-gray-500">📞 {host.phone}</p>
                      )}
                    </div>
                  </div>
                  {/* Quick chat button in host card */}
                  {canChat && (
                    <Link
                      to={`/chat/${id}`}
                      className="shrink-0 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      💬 Message
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation info */}
            {booking.status === "cancelled" && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <h3 className="font-bold text-red-700 mb-3">
                  Cancellation Details
                </h3>
                <InfoRow label="Cancelled by" value={booking.cancelledBy} />
                <InfoRow
                  label="Cancelled at"
                  value={safeDate(booking.cancelledAt)}
                />
                {booking.cancellationReason && (
                  <div className="pt-3 border-t border-red-100 mt-1">
                    <p className="text-sm text-red-500 font-medium mb-1">
                      Reason
                    </p>
                    <p className="text-sm text-red-700">
                      {booking.cancellationReason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Price summary + actions ──────────────────────────── */}
          <div className="space-y-6">
            {/* Price breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Price Breakdown</h3>
              <PriceRow label="Base price" value={pb.basePrice} />
              {pb.cleaningFee > 0 && (
                <PriceRow label="Cleaning fee" value={pb.cleaningFee} />
              )}
              {pb.serviceFee > 0 && (
                <PriceRow label="Service fee" value={pb.serviceFee} />
              )}
              {pb.taxes > 0 && <PriceRow label="Taxes" value={pb.taxes} />}
              {pb.discount > 0 && (
                <PriceRow label="Discount" value={-pb.discount} />
              )}
              <PriceRow
                label="Total"
                value={booking.totalAmount}
                bold
                currency={booking.currency ?? "BDT"}
              />
            </div>

            {/* Payment info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Payment</h3>
              <InfoRow label="Status" value={booking.paymentStatus} />
              {booking.paidAt && (
                <InfoRow
                  label="Paid at"
                  value={safeDate(booking.paidAt, "MMM dd yyyy, h:mm a")}
                />
              )}
              {booking.transactionId && (
                <div className="pt-3 border-t border-gray-100 mt-1">
                  <p className="text-xs text-gray-400 font-medium mb-1">
                    Transaction ID
                  </p>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {booking.transactionId}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
              <h3 className="font-bold text-gray-900 mb-4">Actions</h3>

              {/* Complete payment */}
              {needsPayment && (
                <Link
                  to={`/book/${id}`}
                  className="block w-full text-center py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
                >
                  💳 Complete Payment
                </Link>
              )}

              {/* Open chat — shown for pending, confirmed, completed bookings */}
              {canChat && (
                <Link
                  to={`/chat/${id}`}
                  className="block w-full text-center py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
                >
                  💬 Open Chat
                </Link>
              )}

              {/* Cancel booking */}
              {canCancel && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition"
                >
                  Cancel Booking
                </button>
              )}

              <Link
                to="/guest/my-bookings"
                className="block w-full text-center py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
              >
                ← Back to My Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel modal ───────────────────────────────────────────────────── */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCancelModal(false);
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">
              Cancel Booking
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Please tell us why you're cancelling. This cannot be undone.
            </p>
            <textarea
              rows={4}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-red-400 outline-none transition-all mb-6 resize-none text-sm"
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
