// src/pages/PropertyListPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { propertyAPI } from "../services/api"; // ✅ Updated import
import PropertyCard from "../components/property/PropertyCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { ALL_DISTRICTS, PROPERTY_TYPES, AMENITIES } from "../utils/bdLocations";
import DashboardHeader from "../components/common/DashboardHeader";

export default function PropertyListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get("page") || 1);

  const filters = {
    district: searchParams.get("district") || "",
    propertyType: searchParams.get("propertyType") || "",
    rentalType: searchParams.get("rentalType") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    guests: searchParams.get("guests") || "",
    search: searchParams.get("search") || "",
    amenities: searchParams.getAll("amenities"),
  };

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", 12);

      Object.entries(filters).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach((item) => params.append(k, item));
        else if (v) params.set(k, v);
      });

      // Now using your structured propertyAPI
      const res = await propertyAPI.getAll(params);

      setProperties(res.data.data.properties || res.data.data || []);
      setTotal(res.data.data.total || 0);
      setPages(res.data.data.pages || 1);
    } catch (err) {
      console.error("Failed to load properties:", err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 mb-8 text-white shadow-sm">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-orange-100 hover:text-white transition mb-2 group"
          >
            {/* Inline SVG so you don't need to add new imports */}
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Return to Homepage
          </Link>
          <h1 className="text-3xl font-bold mb-2">Property Marketplace</h1>
          <p className="text-orange-100 text-base">
            Find your perfect home, apartment, or commercial space
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Sidebar Filters ────────────────────────────── */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-28">
              <h2 className="text-lg font-semibold text-gray-800 mb-5">
                Filters
              </h2>

              {/* Search */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Title or keyword..."
                  value={filters.search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              {/* District */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                  District
                </label>
                <select
                  value={filters.district}
                  onChange={(e) => setFilter("district", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all cursor-pointer"
                >
                  <option value="">All Districts</option>
                  {ALL_DISTRICTS.sort().map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                  Type
                </label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilter("propertyType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all cursor-pointer"
                >
                  <option value="">All Types</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rental Type */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                  Rental
                </label>
                <select
                  value={filters.rentalType}
                  onChange={(e) => setFilter("rentalType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all cursor-pointer"
                >
                  <option value="">Any</option>
                  <option value="short_term">Short Term (Nightly)</option>
                  <option value="long_term">Long Term (Monthly)</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                  Price (BDT)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilter("minPrice", e.target.value)}
                    className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilter("maxPrice", e.target.value)}
                    className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="mb-6">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                  Guests
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Min guests"
                  value={filters.guests}
                  onChange={(e) => setFilter("guests", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-xl transition-all active:scale-95"
              >
                Clear Filters
              </button>
            </div>
          </aside>

          {/* ─── Results ──────────────────────────────────── */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {total > 0 ? `${total} Properties Found` : "Properties"}
              </h1>
              <Link
                to="/map"
                className="text-sm font-medium px-4 py-2 bg-white border border-gray-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Map View
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-32">
                <LoadingSpinner size="lg" />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-bold text-gray-900">
                  No properties found
                </h3>
                <p className="text-gray-500 mt-2">
                  Try adjusting or clearing your filters to see more results.
                </p>
                <button
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="mt-6 px-6 py-2 bg-emerald-100 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-200 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((p) => (
                    <PropertyCard key={p._id} property={p} />
                  ))}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex justify-center gap-2 mt-12">
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setFilter("page", String(p))}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm ${
                          p === page
                            ? "bg-emerald-600 text-white shadow-emerald-200"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
