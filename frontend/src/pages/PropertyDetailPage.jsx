// src/pages/PropertyDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useProperty } from "../hooks/useProperties";
import { reviewAPI, searchAPI, bookingAPI } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { useReviewStore } from "../store/useReviewStore";
import { useWishlistStore } from "../store/useWishlistStore";
import PropertyCard from "../components/property/PropertyCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { differenceInDays } from "date-fns";
import {
  FiStar,
  FiMapPin,
  FiUsers,
  FiCheck,
  FiShare2,
  FiHeart,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { formatCurrency, formatDate } from "../utils/bdLocations";
import toast from "react-hot-toast";
import DashboardHeader from "../components/common/DashboardHeader";

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

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canBook = user?.isVerified !== false;
  const { isWishlisted, toggleWishlist } = useWishlistStore();
  const wishlisted = isWishlisted(id);
  const { property, loading, error } = useProperty(id);
  const coordinates = property?.location?.coordinates?.coordinates;
  const mapPosition =
    coordinates?.length === 2 ? [coordinates[1], coordinates[0]] : null;

  // ── Review Store ─────────────────────────────────────────────────────────
  const {
    rating,
    comment,
    isSubmitting,
    setRating,
    setComment,
    submitReview,
    resetForm,
  } = useReviewStore();

  // ── Local State ──────────────────────────────────────────────────────────
  const [activeImg, setActiveImg] = useState(0);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [eligibility, setEligibility] = useState({
    isEligible: false,
    bookingId: null,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────
  // In the useEffect:
  useEffect(() => {
    if (id) {
      resetForm(); // ← clears leftover rating/comment from prior visit
      loadReviews();
      loadSimilar();
      setCheckIn(null);
      setCheckOut(null);
      setGuests(1);
    }
  }, [id]);

  // Separate effect so eligibility re-fires if user logs in mid-session
  useEffect(() => {
    if (id && user) loadEligibility();
  }, [id, user]);
  // ── Data Loaders ─────────────────────────────────────────────────────────
  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const res = await reviewAPI.getByTarget("Property", id, {
        limit: 6,
        sortBy: "createdAt",
        order: "desc",
      });
      setReviews(res.data.data?.reviews || []);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadSimilar = async () => {
    try {
      const res = await searchAPI.recommendations({ propertyId: id });
      setSimilar(res.data.data?.similar || []);
    } catch {}
  };

  const loadEligibility = async () => {
    try {
      const res = await bookingAPI.checkEligibility(id);
      setEligibility(res.data.data);
    } catch {}
  };

  // ── Pricing ───────────────────────────────────────────────────────────────
  const nights =
    checkIn && checkOut ? Math.max(1, differenceInDays(checkOut, checkIn)) : 0;

  const subtotal = property
    ? property.rentalType === "long_term"
      ? property.pricePerMonth * Math.ceil(nights / 30)
      : property.pricePerNight * nights
    : 0;

  const cleaningFee = property?.cleaningFee || 0;
  const serviceFee = Math.round(subtotal * 0.03);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal > 0 ? subtotal + cleaningFee + serviceFee + taxes : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleBook = () => {
    if (!user) {
      toast.error("Please log in to book this property");
      return navigate("/login", { state: { from: `/properties/${id}` } });
    }
    if (!canBook) return toast.error("Your account must be verified to book");
    navigate(`/book/${id}?type=property`);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setEligibility({ isEligible: false, bookingId: null });
    loadReviews();
  };
  // replace the two useState-less buttons with this:

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if (err.name !== "AbortError") toast.error("Could not share");
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.error("Please log in to save properties");
      return navigate("/login", { state: { from: `/properties/${id}` } });
    }
    try {
      await toggleWishlist(id);
      toast.success(wishlisted ? "Removed from saved" : "Saved to wishlist!");
    } catch {
      toast.error("Something went wrong");
    }
  };
  // ── Render Guards ─────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex justify-center items-center py-32 text-emerald-600">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (error || !property)
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🏠</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Property not found
        </h2>
        <p className="text-gray-500 mb-6">
          {error || "This property might have been removed or doesn't exist."}
        </p>
        <Link
          to="/properties"
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition inline-block"
        >
          Browse Properties
        </Link>
      </div>
    );

  const images = property.images || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <DashboardHeader />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
        <Link to="/" className="hover:text-emerald-600 transition">
          Home
        </Link>
        <span>/</span>
        <Link to="/properties" className="hover:text-emerald-600 transition">
          Properties
        </Link>
        <span>/</span>
        <span className="text-gray-900 truncate">{property.title}</span>
      </nav>

      {/* Title Row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            {property.title}
          </h1>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {property.averageRating > 0 && (
              <div className="flex items-center gap-1.5">
                <FiStar className="text-amber-500 fill-amber-500" size={16} />
                <span className="font-bold text-gray-900">
                  {property.averageRating.toFixed(1)}
                </span>
                <span className="text-gray-500 underline decoration-gray-300 cursor-pointer">
                  {property.totalReviews} reviews
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
              <FiMapPin size={16} className="text-emerald-600" />
              {property.location?.area}, {property.location?.district}
            </div>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium text-gray-700"
          >
            <FiShare2 size={18} />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleWishlist}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium text-gray-700"
          >
            <FiHeart
              size={18}
              className={wishlisted ? "text-red-500 fill-red-500" : ""}
            />
            <span className="hidden sm:inline">
              {wishlisted ? "Saved" : "Save"}
            </span>
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative mb-12 rounded-2xl overflow-hidden bg-gray-100 h-[40vh] md:h-[60vh] shadow-sm group">
        {images.length > 0 ? (
          <img
            src={images[activeImg]?.url}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 bg-gray-50">
            🏠
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setActiveImg((i) => (i - 1 + images.length) % images.length)
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 text-gray-800 rounded-full shadow-lg hover:bg-white hover:scale-105 transition opacity-0 group-hover:opacity-100"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={() => setActiveImg((i) => (i + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 text-gray-800 rounded-full shadow-lg hover:bg-white hover:scale-105 transition opacity-0 group-hover:opacity-100"
            >
              <FiChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/20 px-3 py-2 rounded-full backdrop-blur-sm">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeImg ? "bg-white w-6" : "bg-white/60 w-2 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* ── Left: Details ── */}
        <div className="lg:col-span-2 space-y-10">
          {/* Host + Quick stats */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Hosted by {property.host?.name || "a verified user"}
              </h2>
              <div className="flex gap-2 sm:gap-4 mt-2 text-sm text-gray-600 font-medium flex-wrap">
                <span>{property.guestCapacity} guests</span>
                <span>·</span>
                <span>
                  {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>
                  {property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {property.host?.avatar ? (
              <img
                src={property.host.avatar}
                alt={property.host.name}
                className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-emerald-50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                <span className="text-emerald-700 font-bold text-2xl">
                  {property.host?.name?.charAt(0) || "U"}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="pb-6 border-b border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              About this place
            </h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="pb-6 border-b border-gray-200">
              <h3 className="text-xl font-bold mb-5 text-gray-900">
                What this place offers
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {property.amenities.map((amenity, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-gray-700"
                  >
                    <FiCheck size={20} className="text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      {amenity.name || amenity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {mapPosition && (
            <div className="py-10 border-b border-gray-200 animate-fadeIn">
              <h3 className="text-xl font-bold mb-5 text-gray-900">
                Where you'll be
              </h3>
              <div className="relative w-full h-80 bg-gray-100 rounded-3xl overflow-hidden shadow-inner group border border-gray-200">
                <div className="absolute inset-0 z-0">
                  <MapContainer
                    center={mapPosition}
                    zoom={14}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Circle
                      center={mapPosition}
                      pathOptions={{
                        fillColor: "#10b981",
                        color: "#059669",
                        fillOpacity: 0.3,
                      }}
                      radius={600}
                    />
                  </MapContainer>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative mt-12 transition-transform group-hover:-translate-y-1">
                    <div className="relative bg-white/95 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-emerald-100 flex items-center gap-3">
                      <div className="bg-emerald-600 p-2 rounded-xl text-white">
                        <FiMapPin size={20} />
                      </div>
                      <div className="pr-2">
                        <p className="text-xs font-bold text-gray-500 uppercase leading-none mb-1">
                          Exact location
                        </p>
                        <p className="text-sm font-bold text-gray-900 leading-none">
                          Provided after booking
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3">
                <div className="mt-1 text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                  <FiMapPin size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 leading-tight">
                    {property.location?.area}, {property.location?.district}
                  </h4>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed max-w-xl">
                    {property.location?.fullAddress ||
                      "Located in a safe and quiet neighborhood with easy access to main roads and public transport."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* House Rules */}
          {property.houseRules && (
            <div className="pb-6 border-b border-gray-200">
              <h3 className="text-xl font-bold mb-5 text-gray-900">
                House Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 font-medium">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🕐</span> Check-in:{" "}
                  {property.houseRules.checkInTime || "Flexible"}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🕙</span> Check-out:{" "}
                  {property.houseRules.checkOutTime || "11:00 AM"}
                </div>
                <div
                  className={`flex items-center gap-3 ${!property.houseRules.smokingAllowed && "text-gray-500"}`}
                >
                  <span className="text-xl">🚬</span>{" "}
                  {property.houseRules.smokingAllowed
                    ? "Smoking allowed"
                    : "No smoking"}
                </div>
                <div
                  className={`flex items-center gap-3 ${!property.houseRules.petsAllowed && "text-gray-500"}`}
                >
                  <span className="text-xl">🐾</span>{" "}
                  {property.houseRules.petsAllowed ? "Pets allowed" : "No pets"}
                </div>
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <FiStar className="text-amber-500 fill-amber-500 text-2xl" />
              <h3 className="text-2xl font-bold text-gray-900">
                {property.averageRating > 0
                  ? property.averageRating.toFixed(1)
                  : "No ratings yet"}
              </h3>
              {property.totalReviews > 0 && (
                <span className="text-gray-500 font-medium">
                  · {property.totalReviews} review
                  {property.totalReviews !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Write a Review Banner */}
            {user && eligibility.isEligible && (
              <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                {!showReviewForm ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-gray-700 font-medium">
                      You stayed here — share your experience!
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

                    {/* Star Picker */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRating(star)}>
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

                    {/* Comment */}
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      placeholder="Tell others about your stay (min. 10 characters)..."
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          submitReview(
                            "Property",
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

            {/* Existing Reviews List */}
            {reviewsLoading ? (
              <LoadingSpinner />
            ) : reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review._id} className="bg-gray-50 rounded-2xl p-5">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                        {review.reviewer?.avatar ? (
                          <img
                            src={review.reviewer.avatar}
                            alt={review.reviewer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-emerald-700 font-bold text-lg">
                            {review.reviewer?.name?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {review.reviewer?.name}
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 text-center font-medium">
                No reviews yet. Be the first to review after your stay!
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Booking Card ── */}
        <div className="lg:col-span-1 relative">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-28">
            {/* Price Header */}
            <div className="mb-6">
              {property.rentalType !== "long_term" && (
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(property.pricePerNight)}
                  <span className="text-base font-normal text-gray-500">
                    {" "}
                    / night
                  </span>
                </p>
              )}
              {property.rentalType !== "short_term" && (
                <p
                  className={`${property.rentalType === "both" ? "text-lg text-gray-500 mt-1" : "text-3xl font-bold text-gray-900"}`}
                >
                  {formatCurrency(property.pricePerMonth)}
                  <span className="text-base font-normal"> / month</span>
                </p>
              )}
            </div>

            {/* Date Pickers */}
            <div className="border border-gray-300 rounded-xl mb-4 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
              <div className="flex">
                <div className="flex-1 p-3 border-r border-gray-300">
                  <label className="block text-[10px] font-bold uppercase text-gray-900 mb-1">
                    Check-in
                  </label>
                  <DatePicker
                    selected={checkIn}
                    onChange={(d) => {
                      setCheckIn(d);
                      if (checkOut && d >= checkOut) setCheckOut(null);
                    }}
                    minDate={new Date()}
                    placeholderText="Add date"
                    className="w-full outline-none text-sm text-gray-900 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex-1 p-3">
                  <label className="block text-[10px] font-bold uppercase text-gray-900 mb-1">
                    Check-out
                  </label>
                  <DatePicker
                    selected={checkOut}
                    onChange={setCheckOut}
                    minDate={
                      checkIn
                        ? new Date(checkIn.getTime() + 86400000)
                        : new Date()
                    }
                    placeholderText="Add date"
                    className="w-full outline-none text-sm text-gray-900 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
              <div className="p-3 border-t border-gray-300">
                <label className="block text-[10px] font-bold uppercase text-gray-900 mb-1">
                  Guests
                </label>
                <div className="flex items-center gap-2">
                  <FiUsers className="text-gray-500" />
                  <input
                    type="number"
                    min={1}
                    max={property.guestCapacity}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="flex-1 outline-none text-sm text-gray-900 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleBook}
              className="w-full bg-emerald-600 text-white font-bold text-lg py-3.5 rounded-xl hover:bg-emerald-700 transition shadow-md shadow-emerald-200 mb-4"
            >
              {!user ? "Sign in to Book" : "Reserve Now"}
            </button>
            <p className="text-center text-sm text-gray-500 mb-6 font-medium">
              You won't be charged yet
            </p>

            {/* Price Breakdown */}
            {nights > 0 && (
              <div className="space-y-4 text-gray-600 pb-4">
                <div className="flex justify-between">
                  <span className="underline decoration-gray-300">
                    {property.rentalType === "long_term"
                      ? `${formatCurrency(property.pricePerMonth)} × ${Math.ceil(nights / 30)} month(s)`
                      : `${formatCurrency(property.pricePerNight)} × ${nights} night${nights !== 1 ? "s" : ""}`}
                  </span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span className="underline decoration-gray-300">
                      Cleaning fee
                    </span>
                    <span>{formatCurrency(cleaningFee)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="underline decoration-gray-300">
                    StayBD service fee
                  </span>
                  <span>{formatCurrency(serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="underline decoration-gray-300">Taxes</span>
                  <span>{formatCurrency(taxes)}</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between font-bold text-gray-900 text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar Properties */}
      {similar.length > 0 && (
        <section className="mt-20 pt-10 border-t border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Similar Properties
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similar.map((p) => (
              <PropertyCard key={p._id} property={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
