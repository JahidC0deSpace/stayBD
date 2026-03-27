// src/components/property/PropertyCard.jsx
// Updated: heart button now syncs with useWishlistStore (persisted to backend)
import { Link } from "react-router-dom";
import {
  FiStar,
  FiMapPin,
  FiUsers,
  FiHeart,
  FiClock,
  FiBriefcase,
} from "react-icons/fi";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function PropertyCard({ property = {}, type = "properties" }) {
  const { isAuthenticated } = useAuthStore();
  const { isWishlisted, toggleWishlist } = useWishlistStore();
  const navigate = useNavigate();

  // ─── DYNAMIC DATA EXTRACTION ──────────────────────────────────────────
  const isService = type === "services";
  const isExperience = type === "experiences";

  const id = property._id;
  const title = property.title || "Untitled";
  const averageRating = property.averageRating || 0;
  const totalReviews = property.totalReviews || 0;

  // Only properties support wishlist for now (User model uses ref: "Property")
  const supportsWishlist = !isService && !isExperience;
  const liked = supportsWishlist && isWishlisted(id);

  const owner = property.host || property.provider;

  // ─── DYNAMIC PRICING ───
  let displayPrice = 0;
  let priceLabel = "";

  if (isService) {
    displayPrice = property.pricePerHour || 0;
    priceLabel = "/ hr";
  } else if (isExperience) {
    displayPrice = property.pricePerPerson || 0;
    priceLabel = "/ person";
  } else {
    const isLongTerm = property.rentalType === "long_term";
    displayPrice = isLongTerm ? property.pricePerMonth : property.pricePerNight;
    displayPrice = displayPrice || 0;
    priceLabel = isLongTerm ? "/ mo" : "/ night";
  }

  // ─── DYNAMIC LOCATION ───
  let displayLocation = "Unknown Location";
  if (isService && property.serviceArea?.districts?.length > 0) {
    displayLocation = property.serviceArea.districts[0];
  } else if (property.location) {
    displayLocation = [property.location.area, property.location.district]
      .filter(Boolean)
      .join(", ");
  }

  // ─── FALLBACK IMAGE ───
  const primaryImage =
    property.images?.find((i) => i.isPrimary)?.url || property.images?.[0]?.url;
  const imageSource =
    primaryImage || "https://placehold.co/400x300/e2e8f0/64748b?text=No+Image";

  // ─── WISHLIST HANDLER ──────────────────────────────────────────────────
  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast("Sign in to save listings", {
        icon: "🔒",
        duration: 2500,
      });
      navigate("/login");
      return;
    }

    try {
      const added = await toggleWishlist(id);
      toast.success(added ? "Saved to wishlist" : "Removed from wishlist", {
        icon: added ? "❤️" : "💔",
        duration: 1800,
      });
    } catch {
      toast.error("Could not update wishlist");
    }
  };

  return (
    <div className="group relative bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col h-full">
      {/* ─── WISHLIST BUTTON (Absolute) ─── */}
      {supportsWishlist && (
        <button
          onClick={handleWishlistToggle}
          className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full hover:bg-white hover:scale-110 transition-all z-20 shadow-sm"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        >
          <FiHeart
            size={18}
            className={`transition-colors duration-300 ${
              liked
                ? "fill-rose-500 text-rose-500"
                : "text-gray-400 hover:text-rose-500"
            }`}
          />
        </button>
      )}

      <Link
        to={`/${type}/${id}`}
        className="no-underline text-inherit flex flex-col h-full"
      >
        {/* ─── IMAGE SECTION ─── */}
        <div className="relative h-56 w-full overflow-hidden bg-gray-50">
          <img
            src={imageSource}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
            loading="lazy"
          />

          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {!isService && !isExperience && property.rentalType && (
              <span className="text-[10px] uppercase tracking-wider font-black px-3 py-1.5 rounded-full shadow-md text-white bg-emerald-600/90 backdrop-blur-sm">
                {String(property.rentalType).replace(/_/g, " ")}
              </span>
            )}
            {(isService || isExperience) && property.category && (
              <span className="text-[10px] uppercase tracking-wider font-black px-3 py-1.5 rounded-full shadow-md text-white bg-blue-600/90 backdrop-blur-sm">
                {String(property.category).replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* ─── CONTENT SECTION ─── */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wide mb-2">
            <FiMapPin size={12} className="text-emerald-500 flex-shrink-0" />
            <span className="truncate">{displayLocation}</span>
          </div>

          <h3 className="font-bold text-gray-900 line-clamp-2 text-lg leading-tight mb-3 group-hover:text-emerald-600 transition-colors">
            {title}
          </h3>

          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50 mt-auto">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
              <FiStar size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-gray-800">
                {averageRating > 0 ? averageRating.toFixed(1) : "New"}
              </span>
              {totalReviews > 0 && (
                <span className="text-gray-400 text-xs font-medium">
                  ({totalReviews})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold bg-gray-50 px-2 py-1 rounded-lg">
              {!isService && !isExperience && (
                <>
                  <FiUsers size={14} className="text-emerald-500" />
                  <span>Up to {property.guestCapacity || 1}</span>
                </>
              )}
              {isExperience && (
                <>
                  <FiClock size={14} className="text-blue-500" />
                  <span>{property.durationHours || 1} hrs</span>
                </>
              )}
              {isService && (
                <>
                  <FiBriefcase size={14} className="text-purple-500" />
                  <span>Verified</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-gray-900">
                ৳{Number(displayPrice).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-gray-400">
                {priceLabel}
              </span>
            </div>

            {owner && (
              <div
                className="flex items-center gap-2"
                title={owner.name || "Owner"}
              >
                <span className="text-xs font-bold text-gray-400 max-w-[70px] truncate text-right">
                  {owner.name || "Owner"}
                </span>
                {owner.avatar ? (
                  <img
                    src={owner.avatar}
                    alt={owner.name || "Owner Avatar"}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm">
                    <span className="text-emerald-700 text-xs font-black">
                      {owner.name ? owner.name.charAt(0).toUpperCase() : "O"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
