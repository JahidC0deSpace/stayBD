// src/pages/WishlistPage.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiHeart,
  FiMapPin,
  FiStar,
  FiTrash2,
  FiSearch,
  FiArrowRight,
} from "react-icons/fi";
import { useWishlistStore } from "../store/useWishlistStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import DashboardHeader from "../components/common/DashboardHeader";

// ─── Individual saved item card ──────────────────────────────────────────────
function WishlistCard({ property, onRemove }) {
  const id = property._id;
  const title = property.title || "Untitled Listing";
  const averageRating = property.averageRating || 0;
  const totalReviews = property.totalReviews || 0;

  const isLongTerm = property.rentalType === "long_term";
  const displayPrice = isLongTerm
    ? property.pricePerMonth
    : property.pricePerNight;
  const priceLabel = isLongTerm ? "/ mo" : "/ night";

  const displayLocation = [property.location?.area, property.location?.district]
    .filter(Boolean)
    .join(", ");

  const primaryImage =
    property.images?.find((i) => i.isPrimary)?.url || property.images?.[0]?.url;
  const imageSource =
    primaryImage || "https://placehold.co/400x300/e2e8f0/64748b?text=No+Image";

  return (
    <div className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col">
      {/* Remove button */}
      <button
        onClick={() => onRemove(id, title)}
        className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-red-50 hover:scale-110 transition-all"
        aria-label="Remove from wishlist"
        title="Remove from wishlist"
      >
        <FiTrash2
          size={16}
          className="text-gray-400 group-hover:text-red-500 transition-colors"
        />
      </button>

      <Link
        to={`/properties/${id}`}
        className="no-underline text-inherit flex flex-col flex-grow"
      >
        {/* Image */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-50">
          <img
            src={imageSource}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
            loading="lazy"
          />
          {property.rentalType && (
            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider font-black px-3 py-1.5 rounded-full text-white bg-emerald-600/90 backdrop-blur-sm">
              {String(property.rentalType).replace(/_/g, " ")}
            </span>
          )}
          {/* Saved heart badge */}
          <div className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full shadow-sm">
            <FiHeart size={16} className="fill-rose-500 text-rose-500" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {displayLocation && (
            <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wide mb-1.5">
              <FiMapPin size={11} className="text-emerald-500 flex-shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          )}

          <h3 className="font-bold text-gray-900 line-clamp-2 text-base leading-snug mb-3 group-hover:text-emerald-600 transition-colors flex-grow">
            {title}
          </h3>

          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            {/* Rating */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
              <FiStar size={13} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-gray-800">
                {averageRating > 0 ? averageRating.toFixed(1) : "New"}
              </span>
              {totalReviews > 0 && (
                <span className="text-gray-400 text-xs">({totalReviews})</span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-gray-900">
                ৳{Number(displayPrice || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-gray-400">
                {priceLabel}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyWishlist() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
        <FiHeart size={36} className="text-rose-300" />
      </div>
      <DashboardHeader />
      <h2 className="text-2xl font-black text-gray-900 mb-3">
        Your wishlist is empty
      </h2>
      <p className="text-gray-500 text-base max-w-sm mb-8 leading-relaxed">
        Save properties you love by tapping the heart icon while browsing.
        They'll all appear here.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/properties"
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-full hover:bg-emerald-700 transition-colors no-underline"
        >
          Browse Properties <FiArrowRight size={16} />
        </Link>
        <Link
          to="/search"
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-full hover:bg-gray-200 transition-colors no-underline"
        >
          <FiSearch size={16} /> Search Listings
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WishlistPage() {
  const { user } = useAuthStore();
  const { items, isLoading, fetchWishlist, toggleWishlist } =
    useWishlistStore();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (itemId, title) => {
    try {
      await toggleWishlist(itemId);
      toast.success(`Removed "${title}" from wishlist`);
    } catch {
      toast.error("Could not update wishlist. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
              <FiHeart size={20} className="fill-rose-500 text-rose-500" />
            </div>
            <div>
              <DashboardHeader />
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                My Wishlist
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {user?.name
                  ? `${user.name.split(" ")[0]}'s saved listings`
                  : "Your saved listings"}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <p className="mt-4 text-sm text-gray-400 font-medium">
              {items.length} saved{" "}
              {items.length === 1 ? "property" : "properties"}
            </p>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          // Skeleton loader
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
              >
                <div className="h-48 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                  <div className="flex justify-between pt-2">
                    <div className="h-6 bg-gray-100 rounded-lg w-16" />
                    <div className="h-6 bg-gray-100 rounded-full w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyWishlist />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((property) => (
              <WishlistCard
                key={property._id}
                property={property}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
