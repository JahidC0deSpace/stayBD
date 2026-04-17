/**
 * Home Page
 * src/pages/HomePage.jsx
 * Landing page with search, featured sliders (properties/services/experiences), and recommendations
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  propertyAPI,
  serviceAPI,
  experienceAPI,
  feedAPI,
} from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import PropertyCard from "../components/property/PropertyCard";
import { ALL_DISTRICTS, RENTAL_TYPES } from "../utils/bdLocations";
import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiHome,
  FiServer,
  FiStar,
  FiSun,
  FiTool,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

// ─── ICONS ─────────────────────────────────────────────────────────────────────
const StarIcon = () => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    style={{ width: 13, height: 13 }}
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);
const MapPinIcon = () => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    style={{ width: 12, height: 12, flexShrink: 0 }}
  >
    <path
      fillRule="evenodd"
      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
      clipRule="evenodd"
    />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    style={{ width: 18, height: 18 }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    style={{ width: 18, height: 18 }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 8l4 4m0 0l-4 4m4-4H3"
    />
  </svg>
);

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const getImage = (item) => {
  const raw =
    item.images?.[0] || item.thumbnail || item.coverImage || item.image || null;
  if (!raw) return null;
  // If it's an object with a url property (common in Cloudinary setups)
  if (typeof raw === "object") return raw.url || raw.secure_url || null;
  return raw;
};

const getLocation = (item) =>
  item.location?.city ||
  item.location?.district ||
  (typeof item.location === "string" ? item.location : null) ||
  "Bangladesh";

const getRating = (item) => item.averageRating ?? item.rating ?? 0;
const getReviewCount = (item) =>
  item.reviewCount ?? item.totalReviews ?? item.numReviews ?? 0;

const TYPE_CONFIG = {
  property: {
    accent: "#059669",
    tag: <FiHome size={14} />,
    label: "Property",
    getPrice: (i) =>
      i.pricePerNight ? `৳${i.pricePerNight.toLocaleString()}/night` : null,
    getExtra: (i) => i.propertyType || null,
    listPath: "/properties",
  },
  service: {
    accent: "#d97706",
    tag: <FiServer size={14} />,
    label: "Service",
    getPrice: (i) => (i.price ? `৳${i.price.toLocaleString()}` : null),
    getExtra: (i) => i.category || null,
    listPath: "/services",
  },
  experience: {
    accent: "#7c3aed",
    tag: <FiActivity size={14} />,
    label: "Experience",
    getPrice: (i) =>
      i.pricePerPerson ? `৳${i.pricePerPerson.toLocaleString()}/person` : null,
    getExtra: (i) => (i.duration ? `⏱ ${i.duration}` : null),
    listPath: "/experiences",
  },
};

const CARD_W = 272; // px
const CARD_GAP = 18; // px

// ─── SINGLE CARD ───────────────────────────────────────────────────────────────
function SliderCard({ item, type, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const cfg = TYPE_CONFIG[type];
  const image = getImage(item);
  const price = cfg.getPrice(item);
  const extra = cfg.getExtra(item);
  const rating = getRating(item);
  const reviews = getReviewCount(item);

  return (
    <button
      onClick={onClick}
      style={{
        flex: `0 0 ${CARD_W}px`,
        scrollSnapAlign: "start",
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #f0f0f0",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        position: "relative",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        "--accent": cfg.accent,
      }}
      className="slider-card"
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          height: 176,
          background: "#f3f4f6",
          overflow: "hidden",
        }}
      >
        {image && !imgErr ? (
          <img
            src={image}
            alt={item.title || item.name}
            onError={() => setImgErr(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
            className="slider-card-img"
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg,#ecfdf5,#eff6ff)",
              fontSize: 36,
            }}
          >
            {cfg.tag}
          </div>
        )}

        {/* Price badge */}
        {price && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "rgba(17,24,39,0.78)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 20,
              backdropFilter: "blur(4px)",
              letterSpacing: "0.02em",
            }}
          >
            {price}
          </span>
        )}

        {/* Hot badge */}
        {(item.bookingCount > 0 || item.totalBookings > 0) && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(220,38,38,0.85)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 20,
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FiTrendingUp size={12} /> {item.bookingCount || item.totalBookings}
            + booked
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 700,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.title || item.name}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
            fontSize: 11.5,
            color: "#6b7280",
            overflow: "hidden",
          }}
        >
          <span style={{ color: "#9ca3af" }}>
            <MapPinIcon />
          </span>
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {getLocation(item)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ color: "#f59e0b" }}>
              <StarIcon />
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
              {rating ? rating.toFixed(1) : "New"}
            </span>
            {reviews > 0 && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                ({reviews})
              </span>
            )}
          </div>

          {/* Extra tag */}
          {extra && (
            <span
              style={{
                fontSize: 10.5,
                background: "#f3f4f6",
                color: "#4b5563",
                padding: "2px 8px",
                borderRadius: 20,
                fontWeight: 600,
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {extra}
            </span>
          )}
        </div>
      </div>

      {/* Accent border on hover — applied via CSS class */}
      <style>{`
        .slider-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.12) !important; }
        .slider-card:hover .slider-card-img { transform: scale(1.05); }
      `}</style>
    </button>
  );
}

// ─── SECTION CAROUSEL ──────────────────────────────────────────────────────────
function FeaturedSection({ title, icon, viewAllPath, items, type, loading }) {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const total = items.length;

  const scrollTo = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(next, total - 1));
      setIdx(clamped);
      trackRef.current?.scrollTo({
        left: clamped * (CARD_W + CARD_GAP),
        behavior: "smooth",
      });
    },
    [total],
  );

  // Auto-play
  const startTimer = useCallback(() => {
    if (total < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((prev) => {
        const next = (prev + 1) % total;
        trackRef.current?.scrollTo({
          left: next * (CARD_W + CARD_GAP),
          behavior: "smooth",
        });
        return next;
      });
    }, 3800);
  }, [total]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const skeletons = Array.from({ length: 4 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(1.1rem,2.5vw,1.4rem)",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            {title}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Prev / Next */}
          <button
            onClick={() => scrollTo(idx - 1)}
            disabled={idx === 0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              cursor: idx === 0 ? "default" : "pointer",
              opacity: idx === 0 ? 0.3 : 1,
              transition: "all 0.15s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
            aria-label="Previous"
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={() => scrollTo(idx + 1)}
            disabled={idx >= total - 1}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              cursor: idx >= total - 1 ? "default" : "pointer",
              opacity: idx >= total - 1 ? 0.3 : 1,
              transition: "all 0.15s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
            aria-label="Next"
          >
            <ChevronRightIcon />
          </button>
          {/* View all */}
          <button
            onClick={() => navigate(viewAllPath)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 13,
              fontWeight: 700,
              color: "#059669",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 2px",
            }}
          >
            View All <ArrowRightIcon />
          </button>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onMouseEnter={() => clearInterval(timerRef.current)}
        onMouseLeave={startTimer}
        style={{
          display: "flex",
          gap: CARD_GAP,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 6,
        }}
      >
        {loading
          ? skeletons.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: `0 0 ${CARD_W}px`,
                  height: 260,
                  borderRadius: 16,
                  background:
                    "linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }}
              />
            ))
          : items.map((item, i) => (
              <SliderCard
                key={item._id || i}
                item={item}
                type={type}
                onClick={() =>
                  navigate(
                    `/${type === "property" ? "properties" : type === "service" ? "services" : "experiences"}/${item._id}`,
                  )
                }
              />
            ))}
      </div>

      {/* Dots */}
      {!loading && total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === idx ? 20 : 7,
                height: 7,
                borderRadius: i === idx ? 4 : "50%",
                background: i === idx ? "#059669" : "#d1d5db",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.22s ease",
              }}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

// ─── HOME PAGE ─────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  // Search
  const [searchDistrict, setSearchDistrict] = useState("");
  const [searchRentalType, setSearchRentalType] = useState("");

  // Featured grid (most booked properties — existing logic)
  const [featured, setFeatured] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [gridLoading, setGridLoading] = useState(true);

  // Slider data
  const [sliderData, setSliderData] = useState({
    properties: [],
    services: [],
    experiences: [],
  });
  const [sliderLoading, setSliderLoading] = useState({
    properties: true,
    services: true,
    experiences: true,
  });

  // ── Fetch featured grid (existing) ──
  useEffect(() => {
    const fetchHomeData = async () => {
      setGridLoading(true);
      try {
        const [popularRes, recsRes] = await Promise.all([
          propertyAPI.getAll({
            limit: 6,
            sortBy: "totalBookings",
            sortOrder: "desc",
          }),
          feedAPI.getRecommendations(),
        ]);
        setFeatured(popularRes.data.data.properties || []);
        setRecommendations(recsRes.data.data.properties || []);
      } catch (err) {
        console.error("Failed to load homepage data:", err);
      } finally {
        setGridLoading(false);
      }
    };
    fetchHomeData();
  }, [isAuthenticated]);

  // ── Fetch slider data ──
  useEffect(() => {
    // Properties slider — most reviewed / popular
    propertyAPI
      .getAll({ limit: 10, sortBy: "averageRating", sortOrder: "desc" })
      .then((res) => {
        const list = res.data?.data?.properties || res.data?.data || [];
        setSliderData((d) => ({ ...d, properties: list }));
      })
      .catch(() => {})
      .finally(() => setSliderLoading((l) => ({ ...l, properties: false })));

    // Services slider — uses /search?type=services
    serviceAPI
      .getAll({ limit: 10, sortBy: "averageRating", sortOrder: "desc" })
      .then((res) => {
        // /search endpoint wraps in res.data.data.results or res.data.data.services
        const list =
          res.data?.data?.results ||
          res.data?.data?.services ||
          res.data?.data ||
          [];
        setSliderData((d) => ({ ...d, services: list }));
      })
      .catch(() => {})
      .finally(() => setSliderLoading((l) => ({ ...l, services: false })));

    // Experiences slider — uses /search?type=experiences
    experienceAPI
      .getAll({ limit: 10, sortBy: "averageRating", sortOrder: "desc" })
      .then((res) => {
        const list =
          res.data?.data?.results ||
          res.data?.data?.experiences ||
          res.data?.data ||
          [];
        setSliderData((d) => ({ ...d, experiences: list }));
      })
      .catch(() => {})
      .finally(() => setSliderLoading((l) => ({ ...l, experiences: false })));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchDistrict) params.set("district", searchDistrict);
    if (searchRentalType) params.set("rentalType", searchRentalType);
    navigate(`/search?${params.toString()}`);
  };
  getImage;
  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse"
        >
          <div className="h-48 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <span className="text-xl font-bold tracking-tight">𝐒𝐭𝐚𝐲𝐁𝐃</span>
            <span className="text-sm font-medium text-emerald-100 border-l border-white/20 pl-2">
              Bangladesh's Premier Marketplace
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Find Your Perfect
            <br />
            <span className="text-emerald-300">Stay in Bangladesh</span>
          </h1>
          <p className="text-lg md:text-xl text-emerald-100 mb-12 max-w-2xl mx-auto">
            Discover verified properties and unique experiences across all 64
            districts. Your journey starts here.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-3 max-w-4xl mx-auto flex flex-col md:flex-row gap-3"
          >
            <div className="flex-1">
              <select
                value={searchDistrict}
                onChange={(e) => setSearchDistrict(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select District</option>
                {ALL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:w-56">
              <select
                value={searchRentalType}
                onChange={(e) => setSearchRentalType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Types</option>
                {RENTAL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="md:w-40 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/20"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>Explore</span>
            </button>
          </form>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 text-emerald-100">
            {[
              ["1k+", "Listings"],
              ["64", "Districts"],
              ["24/7", "Support"],
              ["Secure", "Payments"],
            ].map(([num, label]) => (
              <div key={label} className="text-center group cursor-default">
                <div className="text-2xl font-bold text-white group-hover:scale-110 transition-transform">
                  {num}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-80">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED SLIDERS ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        {/* Section intro */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900">
            Discover the Best of Bangladesh
          </h2>
          <p className="text-gray-500 mt-2 text-lg">
            Top-rated properties, services & experiences — all in one place
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          <FeaturedSection
            title="Top Properties"
            icon={<FiHome className="text-[#059669]" />}
            viewAllPath="/properties"
            items={sliderData.properties}
            type="property"
            loading={sliderLoading.properties}
          />

          <FeaturedSection
            title="Popular Services"
            icon={<FiTool className="text-[#d97706]" />}
            viewAllPath="/services"
            items={sliderData.services}
            type="service"
            loading={sliderLoading.services}
          />

          <FeaturedSection
            title="Trending Experiences"
            icon={<FiZap className="text-[#7c3aed]" />}
            viewAllPath="/experiences"
            items={sliderData.experiences}
            type="experience"
            loading={sliderLoading.experiences}
          />
        </div>
      </section>

      {/* ─── POPULAR PROPERTIES GRID (existing) ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16 border-t border-gray-100">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Popular Stays</h2>
            <p className="text-gray-500 mt-2 text-lg">
              Most loved properties by our community
            </p>
          </div>
          <button
            onClick={() => navigate("/search")}
            className="hidden md:flex items-center space-x-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
          >
            <span>See Everything</span>
            <ArrowRightIcon />
          </button>
        </div>
        {gridLoading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featured.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* ─── RECOMMENDATIONS ───────────────────────────────────────────── */}
      {!gridLoading && recommendations.length > 0 && (
        <section className="bg-emerald-50/50 py-20 border-y border-emerald-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900">
                {isAuthenticated
                  ? `Handpicked for you, ${user?.name?.split(" ")[0]}`
                  : "Trending Now"}
              </h2>
              <p className="text-gray-500 mt-2 text-lg">
                Based on location and top-rated preferences
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recommendations.slice(0, 6).map((property) => (
                <PropertyCard key={property._id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CATEGORIES ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
          Quick Navigation
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              icon: <FiClock size={18} />,
              label: "Short Term",
              link: "/search?rentalType=short_term",
            },
            {
              icon: <FiCalendar size={18} />,
              label: "Monthly Stay",
              link: "/search?rentalType=long_term",
            },
            {
              icon: <FiStar size={18} />,
              label: "Featured",
              link: "/search?sort=popular",
            },
            {
              icon: <FiSun size={18} />,
              label: "Resorts",
              link: "/search?propertyType=resort",
            },
          ].map(({ icon, label, link }) => (
            <button
              key={label}
              onClick={() => navigate(link)}
              className="flex flex-col items-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {icon}
              </span>
              <span className="font-bold text-gray-800 group-hover:text-emerald-600">
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── HOST CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="bg-emerald-900 rounded-[3rem] p-8 md:p-16 relative overflow-hidden text-center text-white">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              {user?.role === "host"
                ? "Review Your Listings"
                : "List Your Property"}
            </h2>
            <p className="text-emerald-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              {user?.role === "host"
                ? "Manage your calendar, track your earnings, and welcome your next guest."
                : "Join our community of hosts. Turn your extra space into extra income easily."}
            </p>
            <button
              onClick={() =>
                navigate(
                  user?.role === "host" ? "/host/dashboard" : "/register",
                )
              }
              className="bg-white text-emerald-900 font-black px-10 py-4 rounded-2xl hover:bg-emerald-50 transition-all text-lg shadow-xl"
            >
              {user?.role === "host" ? "Go to Dashboard" : "Get Started Now"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
