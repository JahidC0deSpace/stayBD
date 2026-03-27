// src/pages/ServiceDetailPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { reviewAPI } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuthStore } from "../store/useAuthStore";
import { useReviewStore } from "../store/useReviewStore";
import toast from "react-hot-toast";
import { SERVICE_CATEGORIES } from "../utils/bdLocations";
import DashboardHeader from "../components/common/DashboardHeader";
import { FiStar } from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
};

const getAvailableDays = (availability) => {
  if (!availability) return [];
  if (Array.isArray(availability)) {
    return availability.filter((d) => typeof d === "string");
  }
  if (typeof availability === "object") {
    return Object.entries(availability)
      .filter(([, val]) => val?.available === true)
      .map(([day]) => day);
  }
  return [];
};

const ALL_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const getScheduleSlots = (availability) => {
  if (
    !availability ||
    typeof availability !== "object" ||
    Array.isArray(availability)
  )
    return [];
  const result = [];
  for (const day of ALL_DAYS) {
    const entry = availability[day];
    if (!entry?.available || !Array.isArray(entry.slots)) continue;
    for (const slot of entry.slots) {
      if (slot?.from && slot?.to)
        result.push({ day, from: slot.from, to: slot.to });
    }
  }
  return result;
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Inline StarRating (read-only display, matches PropertyDetailPage) ────────
const StarRating = ({ rating, max = 5 }) => (
  <div className="flex gap-0.5">
    {[...Array(max)].map((_, i) => (
      <FiStar
        key={i}
        size={14}
        className={
          i < Math.round(rating)
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-200"
        }
      />
    ))}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const {
    rating,
    comment,
    isSubmitting,
    setRating,
    setComment,
    submitReview,
    resetForm,
  } = useReviewStore();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ── Review state (mirrors PropertyDetailPage exactly) ─────────────────────
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [eligibility, setEligibility] = useState({
    isEligible: false,
    bookingId: null,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // ── Fetch service ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchService = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/services/${id}`);
        const data =
          res.data?.data?.service ?? res.data?.data ?? res.data ?? null;
        if (!data || typeof data !== "object" || !data.title) {
          throw new Error("Invalid service data in response");
        }
        setService(data);
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Service not found");
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

  // ── On id change: reset form, load reviews, reset image ───────────────────
  useEffect(() => {
    if (id) {
      resetForm();
      loadReviews();
      setImgIdx(0);
    }
  }, [id]);

  // ── Re-check eligibility if user logs in mid-session ──────────────────────
  useEffect(() => {
    if (id && user) loadEligibility();
  }, [id, user]);

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const res = await reviewAPI.getByTarget("service", id, {
        limit: 6,
        sortBy: "createdAt",
        order: "desc",
      });
      setReviews(res.data?.data?.reviews ?? res.data?.reviews ?? []);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadEligibility = async () => {
    try {
      // Find a completed service booking for this specific service
      const res = await api.get("/bookings/my-bookings", {
        params: { status: "completed", limit: 50 },
      });
      const bookings =
        res.data?.data?.bookings ?? res.data?.bookings ?? res.data?.data ?? [];
      const match = bookings.find(
        (b) =>
          (b.service?._id === id || b.service === id) &&
          b.status === "completed",
      );
      setEligibility({
        isEligible: !!match,
        bookingId: match?._id ?? null,
      });
    } catch {
      setEligibility({ isEligible: false, bookingId: null });
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const images = service?.images?.length
    ? service.images
    : [{ url: FALLBACK_IMAGE }];
  const imgCount = images.length;
  const currentImgUrl = images[imgIdx]?.url ?? images[imgIdx] ?? FALLBACK_IMAGE;

  const categoryLabel =
    SERVICE_CATEGORIES.find((c) => c.value === service?.category)?.label ??
    service?.category ??
    "Service";

  const displayLocation =
    [
      ...(service?.serviceArea?.districts ?? []),
      ...(service?.serviceArea?.areas ?? []),
    ]
      .filter(Boolean)
      .join(", ") ||
    service?.location?.district ||
    "Dhaka";

  const displayPrice = safeNum(service?.pricePerHour ?? service?.hourlyRate);
  const averageRating = safeNum(service?.averageRating);

  const displayProvider = service?.provider ?? service?.host ?? null;
  const providerName = displayProvider?.name ?? "Provider";
  const providerAvatar =
    displayProvider?.profileImage ??
    displayProvider?.avatar ??
    `https://ui-avatars.com/api/?background=059669&color=fff&size=96&name=${encodeURIComponent(providerName)}`;
  const providerBio =
    displayProvider?.bio ?? "Committed to delivering professional excellence.";

  const availableDays = getAvailableDays(service?.availability);
  const scheduleSlots = getScheduleSlots(service?.availability);
  const hasSchedule = availableDays.length > 0;

  // ── Image navigation ───────────────────────────────────────────────────────
  const nextImage = useCallback(() => {
    if (imgCount < 2) return;
    setImgIdx((p) => (p + 1) % imgCount);
  }, [imgCount]);

  const prevImage = useCallback(() => {
    if (imgCount < 2) return;
    setImgIdx((p) => (p - 1 + imgCount) % imgCount);
  }, [imgCount]);

  // ── Contact ────────────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in first");
      navigate("/login");
      return;
    }
    if (!message.trim()) return;
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`Message sent to ${providerName}!`);
      setIsContactModalOpen(false);
      setMessage("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── Book ───────────────────────────────────────────────────────────────────
  const handleBook = () => {
    if (!user) {
      toast.error("Please log in to book a service");
      return navigate("/login");
    }
    navigate(`/book/${id}?type=service`);
  };

  // ── Review handlers ────────────────────────────────────────────────────────
  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setEligibility({ isEligible: false, bookingId: null });
    loadReviews();
  };

  // ── Loading / not-found ────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" />
      </div>
    );

  if (!service)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Service not found
        </h2>
        <p className="text-gray-500 mb-6">
          It may have been removed or the link is incorrect.
        </p>
        <Link
          to="/services"
          className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
        >
          Browse Services
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Breadcrumb */}
            <DashboardHeader />
            <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Link to="/" className="hover:text-emerald-600 transition">
                Home
              </Link>
              <span>/</span>
              <Link
                to="/services"
                className="hover:text-emerald-600 transition"
              >
                Services
              </Link>
              <span>/</span>
              <span className="text-gray-900 truncate max-w-[200px]">
                {service.title}
              </span>
            </nav>

            {/* Gallery */}
            <div className="space-y-4">
              <div className="relative group bg-white rounded-2xl overflow-hidden shadow-sm border p-2">
                <img
                  src={currentImgUrl}
                  className="w-full aspect-video object-cover rounded-xl transition-all duration-500"
                  alt={service.title}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                {imgCount > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      aria-label="Previous image"
                      className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <span className="text-gray-800 font-bold">←</span>
                    </button>
                    <button
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <span className="text-gray-800 font-bold">→</span>
                    </button>
                    <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
                      {imgIdx + 1} / {imgCount}
                    </div>
                  </>
                )}
              </div>

              {imgCount > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        i === imgIdx
                          ? "border-emerald-600 ring-2 ring-emerald-100 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.url ?? img ?? FALLBACK_IMAGE}
                        className="w-full h-full object-cover"
                        alt={`Thumbnail ${i + 1}`}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Service details card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex justify-between items-start mb-4 gap-4">
                <div>
                  <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-md mb-2 uppercase tracking-widest">
                    {categoryLabel}
                  </span>
                  <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
                    {service.title}
                  </h1>
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <FiStar
                      className="text-amber-500 fill-amber-500"
                      size={16}
                    />
                    <span className="font-bold text-gray-900">
                      {averageRating.toFixed(1)}
                    </span>
                    {service.totalReviews > 0 && (
                      <span className="text-gray-500 text-sm">
                        · {service.totalReviews} review
                        {service.totalReviews !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-gray-500 text-sm mb-6 font-medium">
                {displayLocation && (
                  <span className="flex items-center gap-1">
                    📍 {displayLocation}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  ⏱️ {hasSchedule ? "Flexible Schedule" : "By Appointment"}
                </span>
                {service.minimumHours > 1 && (
                  <span className="flex items-center gap-1">
                    🕐 Min {service.minimumHours} hr
                    {service.minimumHours !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {service.description && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-line border-t pt-6 text-base">
                  {service.description}
                </p>
              )}

              {Array.isArray(service.skills) && service.skills.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {service.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Provider card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-base font-bold text-gray-900 mb-6">
                About the Provider
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative shrink-0">
                  <img
                    src={providerAvatar}
                    className="w-24 h-24 rounded-2xl object-cover shadow-md"
                    alt={providerName}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?background=059669&color=fff&size=96&name=P`;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-white" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {providerName}
                  </h3>
                  <p className="text-gray-500 italic mb-4">{providerBio}</p>
                </div>
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="px-6 py-2.5 border-2 border-emerald-600 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all active:scale-95"
                >
                  Contact
                </button>
              </div>
            </div>

            {/* ── Reviews Section — identical structure to PropertyDetailPage ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              {/* Rating header */}
              <div className="flex items-center gap-3 mb-6">
                <FiStar className="text-amber-500 fill-amber-500 text-2xl" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {averageRating > 0
                    ? averageRating.toFixed(1)
                    : "No ratings yet"}
                </h3>
                {service.totalReviews > 0 && (
                  <span className="text-gray-500 font-medium">
                    · {service.totalReviews} review
                    {service.totalReviews !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Write a Review Banner — only shown after a completed booking */}
              {user && eligibility.isEligible && (
                <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  {!showReviewForm ? (
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-gray-700 font-medium">
                        You used this service — share your experience!
                      </p>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="shrink-0 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                      >
                        Write a Review
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 text-lg">
                        Your Review
                      </h4>

                      {/* Star picker */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                          >
                            <FiStar
                              size={28}
                              className={
                                star <= rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-gray-300"
                              }
                            />
                          </button>
                        ))}
                      </div>

                      {/* Comment textarea */}
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder="Tell others about this service (min. 10 characters)..."
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            submitReview(
                              "service",
                              id,
                              eligibility.bookingId,
                              handleReviewSuccess,
                            )
                          }
                          disabled={isSubmitting}
                          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-60"
                        >
                          {isSubmitting ? "Submitting..." : "Submit Review"}
                        </button>
                        <button
                          onClick={() => setShowReviewForm(false)}
                          className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews grid */}
              {reviewsLoading ? (
                <LoadingSpinner />
              ) : reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="bg-gray-50 rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                          {review.reviewer?.profileImage ||
                          review.reviewer?.avatar ? (
                            <img
                              src={
                                review.reviewer.profileImage ??
                                review.reviewer.avatar
                              }
                              alt={review.reviewer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-emerald-700 font-bold text-lg">
                              {review.reviewer?.name?.charAt(0) ?? "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {review.reviewer?.name ?? "Anonymous"}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                      <p className="text-gray-700 text-sm mt-3 leading-relaxed">
                        {review.comment}
                      </p>
                      {review.providerResponse?.comment && (
                        <div className="mt-3 pl-3 border-l-2 border-emerald-200 bg-white rounded-r-xl p-3">
                          <p className="text-xs font-bold text-emerald-700 mb-1">
                            Provider responded:
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {review.providerResponse.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 text-center font-medium">
                  No reviews yet. Be the first to review after your booking!
                </p>
              )}
            </div>
          </div>

          {/* ── Booking sidebar ───────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-xl border sticky top-6 space-y-5">
              {/* Price */}
              <div>
                <span className="text-3xl font-black text-emerald-600">
                  ৳{displayPrice > 0 ? displayPrice.toLocaleString() : "—"}
                </span>
                <span className="text-gray-400 font-medium"> /hour</span>
              </div>

              {/* Service area */}
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">
                  Service Area
                </span>
                <span className="font-bold text-gray-800 text-xs text-right max-w-[140px]">
                  {displayLocation}
                </span>
              </div>

              {/* Available days */}
              {availableDays.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wider block">
                    Available Days
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {availableDays.map((day) => (
                      <span
                        key={day}
                        className="text-[10px] bg-white px-2 py-0.5 rounded border font-bold text-emerald-600"
                      >
                        {capitalize(day).slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time slots */}
              {scheduleSlots.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wider block">
                    Time Slots
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {scheduleSlots.map((s, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border text-xs"
                      >
                        <span className="font-bold text-gray-600 w-20 shrink-0">
                          {capitalize(s.day).slice(0, 3)}
                        </span>
                        <span className="text-emerald-600 font-semibold">
                          {s.from} – {s.to}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasSchedule && (
                <p className="text-xs text-gray-400 text-center py-1">
                  Contact the provider to arrange a time
                </p>
              )}

              <button
                onClick={handleBook}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
              >
                {!user ? "Log In to Book" : "Book Service"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact modal ──────────────────────────────────────────────────── */}
      {isContactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsContactModalOpen(false);
              setMessage("");
            }
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">Message {providerName}</h2>
            <p className="text-gray-500 text-sm mb-6">
              Ask about availability or specific requirements.
            </p>
            <form onSubmit={handleSendMessage}>
              <textarea
                required
                rows={4}
                maxLength={1000}
                className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-emerald-500 outline-none transition-all mb-2 resize-none"
                placeholder="How can this provider help you?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-gray-400 text-right mb-4">
                {message.length}/1000
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsContactModalOpen(false);
                    setMessage("");
                  }}
                  className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
