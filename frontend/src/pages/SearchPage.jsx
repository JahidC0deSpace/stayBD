import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import PropertyCard from "../components/property/PropertyCard";
import { ALL_DISTRICTS, RENTAL_TYPES } from "../utils/bdLocations";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Get active tab from URL or default to properties
  const currentTab = searchParams.get("type") || "properties";

  const [localFilters, setLocalFilters] = useState({
    q: searchParams.get("q") || "",
    district: searchParams.get("district") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    // Property specific
    rentalType: searchParams.get("rentalType") || "",
    guestCapacity: searchParams.get("guestCapacity") || "",
    // Service/Experience specific
    category: searchParams.get("category") || "",
  });

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      // Include the active tab as 'type' for the backend
      const params = { ...localFilters, type: currentTab, page, limit: 12 };

      // Clean empty values
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);

      const res = await api.get("/search", { params });
      const { results: items, pagination } = res.data.data;

      setResults(items || []);
      setTotal(pagination.total || 0);
    } catch (err) {
      console.error("Search API Error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [page, localFilters, currentTab]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchParams({ ...localFilters, type: currentTab });
  };

  const handleTabChange = (newTab) => {
    setPage(1);
    // Reset category-specific filters when switching tabs
    const resetFilters = {
      ...localFilters,
      rentalType: "",
      guestCapacity: "",
      category: "",
    };
    setLocalFilters(resetFilters);
    setSearchParams({ ...resetFilters, type: newTab });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-gray-50/30">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-6">
          Explore Bangladesh
        </h1>

        {/* ─── CATEGORY TABS ─── */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {["properties", "services", "experiences"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold capitalize transition-all whitespace-nowrap ${
                currentTab === tab
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ─── DYNAMIC FILTER BAR ─── */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-10 transition-all focus-within:shadow-md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Universal Filters */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Keyword
            </label>
            <input
              type="text"
              placeholder={`Search ${currentTab}...`}
              className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={localFilters.q}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, q: e.target.value })
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Location
            </label>
            <select
              className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm appearance-none"
              value={localFilters.district}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, district: e.target.value })
              }
            >
              <option value="">All Districts</option>
              {ALL_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Filters: Properties */}
          {currentTab === "properties" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                  Guests
                </label>
                <input
                  type="number"
                  placeholder="Min Capacity"
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={localFilters.guestCapacity}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      guestCapacity: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                  Rental Type
                </label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm appearance-none"
                  value={localFilters.rentalType}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      rentalType: e.target.value,
                    })
                  }
                >
                  <option value="">Any Stay Type</option>
                  {RENTAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Conditional Filters: Services & Experiences */}
          {(currentTab === "services" || currentTab === "experiences") && (
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                Category
              </label>
              <input
                type="text"
                placeholder={`e.g. ${currentTab === "services" ? "Cleaning, Chef" : "Tour, Workshop"}`}
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={localFilters.category}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, category: e.target.value })
                }
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-5">
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </button>
          </div>
        </div>

        {/* Universal Price Row */}
        <div className="mt-6 pt-6 border-t border-gray-50 flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Price Range (৳):
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              className="w-28 px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-1 focus:ring-emerald-500"
              value={localFilters.minPrice}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, minPrice: e.target.value })
              }
            />
            <span className="text-gray-300">—</span>
            <input
              type="number"
              placeholder="Max"
              className="w-28 px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-1 focus:ring-emerald-500"
              value={localFilters.maxPrice}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, maxPrice: e.target.value })
              }
            />
          </div>
          <p className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            {total} Results Found
          </p>
        </div>
      </form>

      {/* ─── RESULTS GRID ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl h-80 animate-pulse border border-gray-100 shadow-sm"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-800">
            No {currentTab} match your search
          </h3>
          <p className="text-gray-400 mt-2">
            Try clearing filters or changing your keywords.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {results.map((item) => (
            <PropertyCard key={item._id} property={item} type={currentTab} />
          ))}
        </div>
      )}

      {/* ─── PAGINATION ─── */}
      {total > 12 && (
        <div className="flex justify-center mt-16 gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-6 py-2 border border-gray-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all font-medium"
          >
            Previous
          </button>
          <button
            disabled={page >= Math.ceil(total / 12)}
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2 border border-gray-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
