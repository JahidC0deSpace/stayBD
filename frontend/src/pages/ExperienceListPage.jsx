// src/pages/ExperienceListPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { ALL_DISTRICTS, EXPERIENCE_CATEGORIES } from "../utils/bdLocations";
import { FiArrowLeft } from "react-icons/fi";

function ExperienceCard({ exp }) {
  const {
    _id,
    title,
    pricePerPerson,
    location,
    averageRating,
    reviewCount,
    images = [],
    host,
    category,
    duration,
  } = exp;

  const imageUrl =
    images[0]?.url ||
    images[0] ||
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600";

  const catLabel =
    EXPERIENCE_CATEGORIES.find((c) => c.value === category)?.label || category;

  return (
    <Link
      to={`/experiences/${_id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-shadow flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {catLabel && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold text-gray-700 px-2.5 py-1 rounded-full shadow">
            {catLabel}
          </span>
        )}
        {duration && (
          <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
            {duration}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 group-hover:text-emerald-700 transition">
          {title}
        </h3>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
          </svg>
          {location?.area || location?.district || "Bangladesh"}
        </p>
        {host && (
          <p className="text-xs text-gray-400 mt-0.5">Hosted by {host.name}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-yellow-400 fill-current"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-medium text-gray-700">
              {averageRating ? averageRating.toFixed(1) : "New"}
            </span>
            {reviewCount > 0 && (
              <span className="text-xs text-gray-400">({reviewCount})</span>
            )}
          </div>
          <span className="text-sm font-bold text-emerald-700">
            ৳{Number(pricePerPerson || 0).toLocaleString()}/person
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ExperienceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [experiences, setExperiences] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get("page") || 1);
  const filters = {
    district: searchParams.get("district") || "",
    category: searchParams.get("category") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    search: searchParams.get("search") || "",
  };

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const res = await api.get(`/experiences?${params}`);
      const data = res.data.data;
      setExperiences(data.experiences || data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams, page]); // Added page to dependencies

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

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
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-purple-100 hover:text-zinc-50 transition mb-2 group"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Return to Homepage
          </Link>
          <h1 className="text-3xl font-bold mb-2">Explore Experiences</h1>
          <p className="text-violet-100">
            Discover unique local activities hosted by passionate Bangladeshis
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXPERIENCE_CATEGORIES.sort(() => Math.random() - 0.5)
              .slice(0, 6)
              .map((c) => (
                <button
                  key={c.value}
                  onClick={() =>
                    setFilter(
                      "category",
                      filters.category === c.value ? "" : c.value,
                    )
                  }
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filters.category === c.value ? "bg-white text-violet-700" : "bg-white/20 hover:bg-white/30"}`}
                >
                  {c.label}
                </button>
              ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                Filters
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Experience name..."
                    value={filters.search}
                    onChange={(e) => setFilter("search", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                    District
                  </label>
                  <select
                    value={filters.district}
                    onChange={(e) => setFilter("district", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                  >
                    <option value="">All Districts</option>
                    {ALL_DISTRICTS.sort().map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Other filters... */}
                <button
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="w-full py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                {total > 0 ? `${total} Experiences` : "Experiences"}
              </h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : experiences.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🎭</div>
                <h3 className="text-lg font-semibold text-gray-700">
                  No experiences found
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {experiences.map((e) => (
                    <ExperienceCard key={e._id} exp={e} />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="flex justify-center gap-2 mt-10">
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setFilter("page", String(p))}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${p === page ? "bg-violet-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-violet-400"}`}
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
