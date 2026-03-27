// src/pages/MapSearchPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import {
  FiFilter,
  FiX,
  FiMapPin,
  FiStar,
  FiSearch,
  FiHome,
  FiSliders,
  FiChevronRight,
  FiUsers,
} from "react-icons/fi";

import api from "../services/api";
import { formatCurrency } from "../utils/bdLocations";
import { PROPERTY_TYPES } from "../utils/bdLocations";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuthStore } from "../store/useAuthStore";

// ─── Inline map API call (no need to add to api.js) ───────────────────────────
const getPropertiesForMap = (params, options) =>
  api.get("/properties/map", { params, ...options });

// ─── Custom marker icon ────────────────────────────────────────────────────────
const createPriceIcon = (price, isSelected = false, rentalType = "") => {
  const isLongTerm = rentalType === "long_term";
  const bg = isSelected ? "#0f172a" : isLongTerm ? "#0ea5e9" : "#f97316";
  const scale = isSelected ? "scale(1.25)" : "scale(1)";

  return L.divIcon({
    className: "",
    html: `<div style="
      background:${bg};
      color:#fff;
      padding:5px 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 12px rgba(0,0,0,0.25);
      border:2px solid #fff;
      transform:${scale};
      transition:transform 0.15s ease;
      font-family:'DM Sans',sans-serif;
    ">৳${Math.round(price / 1000)}K</div>`,
    iconAnchor: [32, 16],
    popupAnchor: [0, -18],
  });
};

// ─── Bounds watcher — fires callback only on moveend/zoomend ─────────────────
function BoundsWatcher({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(getBounds(map)),
    zoomend: () => onBoundsChange(getBounds(map)),
  });
  return null;
}

function getBounds(map) {
  const b = map.getBounds();
  return {
    swLng: b.getSouthWest().lng,
    swLat: b.getSouthWest().lat,
    neLng: b.getNorthEast().lng,
    neLat: b.getNorthEast().lat,
  };
}

// ─── Filter chip component ────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapSearchPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false); // "Search this area" pending
  const [bounds, setBounds] = useState(null);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    rentalType: "",
    propertyType: "",
    minRating: "",
    guestCapacity: "",
  });

  const abortRef = useRef(null);
  const center = [23.8103, 90.4125];

  // ── Active filter count badge ──────────────────────────────────────────
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── Search function ────────────────────────────────────────────────────
  const doSearch = useCallback(
    async (b) => {
      if (!b) return;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setPendingSearch(false);
      try {
        const res = await getPropertiesForMap(
          {
            ...b,
            minPrice: filters.minPrice || undefined,
            maxPrice: filters.maxPrice || undefined,
            rentalType: filters.rentalType || undefined,
            propertyType: filters.propertyType || undefined,
            minRating: filters.minRating || undefined,
            guestCapacity: filters.guestCapacity || undefined,
          },
          { signal: controller.signal },
        );
        setProperties(res.data?.data?.properties || []);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError")
          console.error("Map search error:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  // ── On map move: show "Search this area" button instead of auto-searching
  const handleBoundsChange = (newBounds) => {
    setBounds(newBounds);
    // Only show pending if we already have results (first load searches immediately)
    if (properties.length > 0) {
      setPendingSearch(true);
    } else {
      doSearch(newBounds);
    }
  };

  // ── Search when filters change (if bounds already set) ─────────────────
  useEffect(() => {
    if (bounds) doSearch(bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => () => abortRef.current?.abort(), []);

  const clearFilters = () =>
    setFilters({
      minPrice: "",
      maxPrice: "",
      rentalType: "",
      propertyType: "",
      minRating: "",
      guestCapacity: "",
    });

  return (
    <div className="relative flex" style={{ height: "calc(100vh - 64px)" }}>
      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsWatcher onBoundsChange={handleBoundsChange} />

          {properties.map((prop) => {
            const coords = prop.location?.coordinates?.coordinates;
            if (!coords || coords.length < 2) return null;
            const [lng, lat] = coords;
            const price = prop.pricePerNight || prop.pricePerMonth;
            const isSelected = selected?._id === prop._id;

            return (
              <Marker
                key={prop._id}
                position={[lat, lng]}
                icon={createPriceIcon(price, isSelected, prop.rentalType)}
                eventHandlers={{ click: () => setSelected(prop) }}
              >
                <Popup>
                  <div className="w-52 p-1">
                    {prop.images?.[0]?.url && (
                      <img
                        src={prop.images[0].url}
                        alt={prop.title}
                        className="w-full h-28 object-cover rounded-lg mb-2"
                      />
                    )}
                    <p className="font-semibold text-sm leading-tight mb-1">
                      {prop.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <FiMapPin size={10} /> {prop.location?.area}
                    </div>
                    {prop.averageRating > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                        <FiStar size={10} className="text-yellow-400" />
                        {prop.averageRating.toFixed(1)} · {prop.totalReviews}{" "}
                        reviews
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-primary-600">
                        {formatCurrency(price)}
                        <span className="text-gray-400 font-normal text-xs">
                          /{prop.rentalType === "long_term" ? "mo" : "night"}
                        </span>
                      </p>
                      <button
                        onClick={() => navigate(`/properties/${prop._id}`)}
                        className="text-xs bg-gray-900 text-white px-3 py-1 rounded-lg hover:bg-gray-700"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* ── Top Bar ────────────────────────────────────────────────── */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
          {/* Search this area button */}
          {pendingSearch && !loading && (
            <button
              onClick={() => doSearch(bounds)}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold hover:bg-gray-700 transition-all animate-bounce-once"
            >
              <FiSearch size={14} />
              Search this area
            </button>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-xl">
              <LoadingSpinner size="sm" />
              <span className="text-sm font-medium text-gray-700">
                Searching…
              </span>
            </div>
          )}

          {/* Results count (when not loading or pending) */}
          {!loading && !pendingSearch && properties.length > 0 && (
            <div className="bg-white rounded-full px-4 py-2.5 shadow-lg">
              <span className="text-sm font-semibold text-gray-800">
                {properties.length} properties in view
              </span>
            </div>
          )}

          {/* No results */}
          {!loading && !pendingSearch && properties.length === 0 && bounds && (
            <div className="bg-white rounded-full px-4 py-2.5 shadow-lg">
              <span className="text-sm text-gray-500">
                No properties here — try zooming out
              </span>
            </div>
          )}
        </div>

        {/* ── Quick filter chips (rental type) ───────────────────────── */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-2">
          <FilterChip
            label="All"
            active={!filters.rentalType}
            onClick={() => setFilters((f) => ({ ...f, rentalType: "" }))}
          />
          <FilterChip
            label="🌙 Per Night"
            active={filters.rentalType === "short_term"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                rentalType:
                  filters.rentalType === "short_term" ? "" : "short_term",
              }))
            }
          />
          <FilterChip
            label="📅 Per Month"
            active={filters.rentalType === "long_term"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                rentalType:
                  filters.rentalType === "long_term" ? "" : "long_term",
              }))
            }
          />
        </div>

        {/* ── Filter button ───────────────────────────────────────────── */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="absolute top-4 right-4 z-[1000] bg-white rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FiSliders size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* ── Legend ─────────────────────────────────────────────────── */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            Short-term
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
            Long-term
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-900 inline-block" />
            Selected
          </span>
        </div>

        {/* ── Filter Panel ────────────────────────────────────────────── */}
        {showFilter && (
          <div className="absolute top-14 right-4 z-[1000] bg-white rounded-2xl shadow-2xl p-5 w-72 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900">Filters</h3>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-gray-400">
                    {activeFilterCount} active
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowFilter(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Property Type */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Property Type
                </label>
                <select
                  value={filters.propertyType}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, propertyType: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">All Types</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Price Range (৳)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, minPrice: e.target.value }))
                    }
                    placeholder="Min"
                    className="w-1/2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                    }
                    placeholder="Max"
                    className="w-1/2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Guest Capacity */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Min Guests
                </label>
                <div className="flex gap-2">
                  {[1, 2, 4, 6, 8].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          guestCapacity:
                            f.guestCapacity === String(n) ? "" : String(n),
                        }))
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        filters.guestCapacity === String(n)
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {n}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Rating */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Min Rating
                </label>
                <div className="flex gap-2">
                  {[3, 3.5, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          minRating: f.minRating === String(r) ? "" : String(r),
                        }))
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        filters.minRating === String(r)
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      ⭐{r}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={() => {
                    setShowFilter(false);
                    if (bounds) doSearch(bounds);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: selected property detail ───────────────────────────── */}
      <div
        className={`bg-white shadow-2xl flex flex-col relative z-50 transition-all duration-300 ease-in-out overflow-hidden ${
          selected ? "w-80 opacity-100" : "w-0 opacity-0"
        }`}
      >
        {selected && (
          <>
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
            >
              <FiX size={16} />
            </button>

            {/* Image */}
            <div className="relative">
              {selected.images?.[0]?.url ? (
                <img
                  src={selected.images[0].url}
                  alt={selected.title}
                  className="w-full h-52 object-cover"
                />
              ) : (
                <div className="w-full h-52 bg-gray-100 flex items-center justify-center">
                  <FiHome size={32} className="text-gray-300" />
                </div>
              )}
              {/* Rental type badge */}
              <span
                className={`absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                  selected.rentalType === "long_term"
                    ? "bg-sky-500 text-white"
                    : "bg-orange-500 text-white"
                }`}
              >
                {selected.rentalType === "long_term"
                  ? "Long-term"
                  : "Short-term"}
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col overflow-y-auto">
              <p className="font-bold text-lg text-gray-900 leading-snug mb-2">
                {selected.title}
              </p>

              <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                <FiMapPin size={13} className="flex-shrink-0" />
                <span>
                  {selected.location?.area}, {selected.location?.district}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-4">
                {selected.averageRating > 0 && (
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    <FiStar
                      size={13}
                      className="text-amber-500 fill-amber-500"
                    />
                    <span className="font-bold text-sm text-gray-800">
                      {selected.averageRating.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({selected.totalReviews})
                    </span>
                  </div>
                )}
                {selected.guestCapacity && (
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                    <FiUsers size={13} className="text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Up to {selected.guestCapacity}
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                  Starting from
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(
                    selected.pricePerNight || selected.pricePerMonth,
                  )}
                  <span className="text-base font-normal text-gray-400 ml-1">
                    /{selected.rentalType === "long_term" ? "month" : "night"}
                  </span>
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate(`/properties/${selected._id}`)}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors mt-auto"
              >
                View Property
                <FiChevronRight size={16} />
              </button>

              {/* Multiple images preview */}
              {selected.images?.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {selected.images.slice(1, 5).map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
