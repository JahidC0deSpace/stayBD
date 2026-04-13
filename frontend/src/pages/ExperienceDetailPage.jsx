// src/pages/ExperienceDetailPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { experienceAPI, reviewAPI } from "../services/api";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuthStore } from "../store/useAuthStore";
import { useReviewStore } from "../store/useReviewStore";
import toast from "react-hot-toast";
import { format, isValid, parseISO } from "date-fns";
import DashboardHeader from "../components/common/DashboardHeader";
import { FiStar } from "react-icons/fi";

// ─── Safe date formatter ───────────────────────────────────────────────────────
const safeFormatDate = (dateValue, fmt = "EEE, MMM dd") => {
  if (!dateValue) return "Date TBA";
  const d =
    typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
  return isValid(d) ? format(d, fmt) : "Date TBA";
};

// ─── Safe number coercion ──────────────────────────────────────────────────────
const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
};

// ─── Past-date check ───────────────────────────────────────────────────────────
const isDatePast = (dateValue) => {
  if (!dateValue) return false;
  const d =
    typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
  return isValid(d) && d < new Date();
};

// ─── Fallbacks ────────────────────────────────────────────────────────────────
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop";
const FALLBACK_AVATAR =
  "https://ui-avatars.com/api/?background=7c3aed&color=fff&size=96&name=Host";

// ─── StarRating (read-only display) ──────────────────────────────────────────
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

const formatReviewDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function ExperienceDetailPage() {
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

  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ── Review state ───────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [eligibility, setEligibility] = useState({
    isEligible: false,
    bookingId: null,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // ── Fetch experience ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchExperience = async () => {
      try {
        setLoading(true);
        const res = await experienceAPI.getById(id);
        const data = res.data?.data?.experience ?? res.data?.experience ?? null;
        if (!data) throw new Error("No experience data in response");
        setExperience(data);
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Experience not found");
      } finally {
        setLoading(false);
      }
    };
    fetchExperience();
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
      const res = await reviewAPI.getByTarget("experience", id, {
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
      const res = await api.get("/bookings/my-bookings", {
        params: { status: "completed", limit: 50 },
      });
      const bookings =
        res.data?.data?.bookings ?? res.data?.bookings ?? res.data?.data ?? [];
      const match = bookings.find(
        (b) =>
          (b.experience?._id === id || b.experience === id) &&
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

  // ── Review handlers ────────────────────────────────────────────────────────
  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setEligibility({ isEligible: false, bookingId: null });
    loadReviews();
  };

  // ── Image navigation ───────────────────────────────────────────────────────
  const images = experience?.images ?? [];
  const imgCount = images.length;

  const nextImage = useCallback(() => {
    if (imgCount < 2) return;
    setImgIdx((p) => (p + 1) % imgCount);
  }, [imgCount]);

  const prevImage = useCallback(() => {
    if (imgCount < 2) return;
    setImgIdx((p) => (p - 1 + imgCount) % imgCount);
  }, [imgCount]);

  // ── Contact handler ────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`Message sent to ${experience?.host?.name ?? "the host"}!`);
      setIsContactModalOpen(false);
      setMessage("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // re-validate before navigating ───────────
  const handleReserve = () => {
    if (!user) {
      toast.error("Please log in to book this experience");
      return navigate("/login");
    }

    // availability at click time to prevent stale-state bypass
    const schedule = Array.isArray(experience?.schedule)
      ? experience.schedule
      : [];
    const maxPax = safeNum(experience?.maxParticipants, 1);

    const stillAvailable = schedule.some((slot) => {
      if (!slot) return false;
      const slotMax = safeNum(slot.maxParticipants, maxPax);
      const current = safeNum(slot.currentParticipants, 0);
      // ── reject past-dated slots here too ──
      return !isDatePast(slot.date) && current < slotMax;
    });

    if (!stillAvailable) {
      toast.error("No available slots for this experience.");
      return;
    }

    navigate(`/book/${id}?type=experience`);
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const price = safeNum(experience?.pricePerPerson);
  const maxPax = safeNum(experience?.maxParticipants, 1);
  const schedule = Array.isArray(experience?.schedule)
    ? experience.schedule
    : [];
  const hostName = experience?.host?.name ?? "Host";
  const hostAvatar = experience?.host?.avatar ?? FALLBACK_AVATAR;
  const hostBio = experience?.host?.bio ?? "Experienced local guide";
  const district = experience?.location?.district ?? "";
  const duration = safeNum(experience?.durationHours);
  const currentImage = images[imgIdx]?.url ?? FALLBACK_IMAGE;
  const averageRating = safeNum(experience?.averageRating);

  const hasAvailableSlots = schedule.some((slot) => {
    if (!slot) return false;
    const slotMax = safeNum(slot.maxParticipants, maxPax);
    const current = safeNum(slot.currentParticipants, 0);
    return !isDatePast(slot.date) && current < slotMax;
  });

  // ── Loading / not-found states ─────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" />
      </div>
    );

  if (!experience)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Experience not found
        </h2>
        <p className="text-gray-500 mb-6">
          It may have been removed or the link is incorrect.
        </p>
        <Link
          to="/experiences"
          className="px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition"
        >
          Browse Experiences
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
                to="/experiences"
                className="hover:text-emerald-600 transition"
              >
                Experiences
              </Link>
              <span>/</span>
              <span className="text-gray-900 truncate max-w-[200px]">
                {experience.title}
              </span>
            </nav>

            {/* Gallery */}
            <div className="space-y-4">
              <div className="relative group bg-white rounded-2xl overflow-hidden shadow-sm border">
                <img
                  src={currentImage}
                  className="w-full aspect-video object-cover transition-all duration-500"
                  alt={experience.title}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                {imgCount > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      aria-label="Previous image"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <span className="text-gray-800 font-bold">←</span>
                    </button>
                    <button
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <span className="text-gray-800 font-bold">→</span>
                    </button>
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
                      {imgIdx + 1} / {imgCount}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {imgCount > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setImgIdx(index)}
                      aria-label={`View image ${index + 1}`}
                      className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        imgIdx === index
                          ? "border-violet-600 ring-2 ring-violet-100 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.url ?? FALLBACK_IMAGE}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                {experience.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-gray-500 text-sm mb-6 font-medium">
                {district && (
                  <span className="flex items-center gap-1">📍 {district}</span>
                )}
                {duration > 0 && (
                  <span className="flex items-center gap-1">
                    ⏱️ {duration} hr{duration !== 1 ? "s" : ""}
                  </span>
                )}
                {maxPax > 0 && (
                  <span className="flex items-center gap-1">
                    👥 Max {maxPax} spots
                  </span>
                )}
              </div>
              {experience.description && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-line border-t pt-6">
                  {experience.description}
                </p>
              )}
            </div>

            {/* Host card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-base font-bold text-gray-900 mb-6">
                About the Host
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative shrink-0">
                  <img
                    src={hostAvatar}
                    className="w-24 h-24 rounded-2xl object-cover shadow-md"
                    alt={hostName}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_AVATAR;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-white" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {hostName}
                  </h3>
                  <p className="text-gray-500 italic mb-4">{hostBio}</p>
                </div>
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="px-6 py-2.5 border-2 border-violet-600 text-violet-600 font-bold rounded-xl hover:bg-violet-50 transition-all"
                >
                  Contact
                </button>
              </div>
            </div>

            {/* ── Reviews Section ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              {/* Rating header */}
              <div className="flex items-center gap-3 mb-6">
                <FiStar className="text-amber-500 fill-amber-500 text-2xl" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {averageRating > 0
                    ? averageRating.toFixed(1)
                    : "No ratings yet"}
                </h3>
                {experience.totalReviews > 0 && (
                  <span className="text-gray-500 font-medium">
                    · {experience.totalReviews} review
                    {experience.totalReviews !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Write a Review Banner — only for eligible users */}
              {user && eligibility.isEligible && (
                <div className="mb-8 bg-violet-50 border border-violet-100 rounded-2xl p-5">
                  {!showReviewForm ? (
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-gray-700 font-medium">
                        You attended this experience — share your thoughts!
                      </p>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="shrink-0 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
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
                        placeholder="Tell others about this experience (min. 10 characters)..."
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            submitReview(
                              "experience",
                              id,
                              eligibility.bookingId,
                              handleReviewSuccess,
                            )
                          }
                          disabled={isSubmitting}
                          className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 transition disabled:opacity-60"
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
                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden shrink-0">
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
                            <span className="text-violet-700 font-bold text-lg">
                              {review.reviewer?.name?.charAt(0) ?? "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {review.reviewer?.name ?? "Anonymous"}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {formatReviewDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                      <p className="text-gray-700 text-sm mt-3 leading-relaxed">
                        {review.comment}
                      </p>
                      {review.providerResponse?.comment && (
                        <div className="mt-3 pl-3 border-l-2 border-violet-200 bg-white rounded-r-xl p-3">
                          <p className="text-xs font-bold text-violet-700 mb-1">
                            Host responded:
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
                  No reviews yet. Be the first to review after your experience!
                </p>
              )}
            </div>
          </div>

          {/* ── Booking sidebar ───────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-xl border sticky top-6">
              {/* Price */}
              <div className="mb-6">
                {price > 0 ? (
                  <>
                    <span className="text-3xl font-black text-violet-700">
                      ৳{price.toLocaleString()}
                    </span>
                    <span className="text-gray-400 font-medium"> /person</span>
                  </>
                ) : (
                  <span className="text-3xl font-black text-violet-700">
                    Free
                  </span>
                )}
              </div>

              {/* Schedule preview */}
              <div className="mb-6">
                <label className="text-[10px] font-black text-gray-400 block mb-3 uppercase tracking-widest">
                  Available Schedules
                </label>
                {schedule.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No schedules available yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {schedule.map((slot, i) => {
                      if (!slot) return null;
                      const slotMax = safeNum(slot.maxParticipants, maxPax);
                      const current = safeNum(slot.currentParticipants, 0);
                      const spotsLeft = Math.max(0, slotMax - current);
                      const isFull = spotsLeft <= 0;
                      const isPast = isDatePast(slot.date);
                      const isUnavailable = isFull || isPast;

                      return (
                        <div
                          key={i}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            isUnavailable
                              ? "opacity-50 grayscale border-gray-100"
                              : "border-gray-100 hover:border-violet-200"
                          }`}
                        >
                          <div className="font-bold text-gray-800">
                            {safeFormatDate(slot.date)}
                          </div>
                          <div className="text-xs text-gray-500 flex justify-between mt-1">
                            <span>
                              {slot.startTime || "—"} – {slot.endTime || "—"}
                            </span>
                            <span
                              className={
                                isPast
                                  ? "text-gray-400"
                                  : isFull
                                    ? "text-red-500"
                                    : "text-emerald-600"
                              }
                            >
                              {isPast
                                ? "Expired"
                                : isFull
                                  ? "Sold out"
                                  : `${spotsLeft} left`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reserve button */}
              <button
                onClick={handleReserve}
                disabled={!hasAvailableSlots}
                className="w-full py-4 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600"
              >
                {!user
                  ? "Sign in to Book"
                  : !hasAvailableSlots
                    ? "No Slots Available"
                    : "Reserve Now"}
              </button>

              {!user && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  <Link
                    to="/login"
                    className="text-violet-600 font-semibold hover:underline"
                  >
                    Log in
                  </Link>{" "}
                  to complete your booking
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact modal ──────────────────────────────────────────────────── */}
      {isContactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsContactModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">Message {hostName}</h2>
            <p className="text-gray-500 text-sm mb-6">
              Ask anything about this experience.
            </p>
            <form onSubmit={handleSendMessage}>
              <textarea
                required
                rows={4}
                className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-violet-500 outline-none transition-all mb-6 resize-none"
                placeholder="Type your message here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
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
                  className="flex-1 py-3 font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
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
