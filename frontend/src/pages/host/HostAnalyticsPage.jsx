import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiPieChart,
  FiStar,
  FiHome,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

const COLORS = ["#059669", "#0891b2", "#7c3aed", "#d97706", "#e11d48"];

export default function HostAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/host/overview").catch(() => null),
      api.get("/analytics/host/revenue").catch(() => null),
    ])
      .then(([ov, rev]) => {
        const data = ov?.data?.data || null;
        setOverview(
          data
            ? {
                ...data.overview,
                bookingsByStatus: data.bookingStats,
                topListings: data.topListings,
              }
            : null,
        );
        setRevenue(rev?.data?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-emerald-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const bookingStatusData = overview?.bookingsByStatus
    ? Object.entries(overview.bookingsByStatus).map(([name, value]) => ({
        name,
        value: typeof value === "object" ? (value.count ?? 0) : value,
      }))
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-10 md:p-8 animate-fadeIn">
      <div>
        <Link
          to="/host/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-primary-600 transition mb-2 group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
        <p className="text-gray-500 text-sm">
          Performance overview for your listings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Bookings",
            value: overview?.totalBookings ?? 0,
            icon: <FiCalendar />,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Total Earnings",
            value: overview?.totalEarnings
              ? `৳${Number(overview.totalEarnings).toLocaleString()}`
              : "৳0",
            icon: <FiDollarSign />,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Total Listings",
            value: overview?.totalListings ?? 0,
            icon: <FiHome />,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Avg Rating",
            value: overview?.averageRating
              ? Number(overview.averageRating).toFixed(1)
              : "N/A",
            icon: <FiStar />,
            color: "text-amber-500",
            bg: "bg-amber-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.bg} ${s.color}`}
            >
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        {revenue.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-800 mb-6">
              Monthly Revenue (BDT)
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenue}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `৳${v}`}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(v) => [
                    `৳${Number(v).toLocaleString()}`,
                    "Earnings",
                  ]}
                />
                <Bar
                  dataKey="earnings"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="space-y-6">
          {/* Booking Distribution */}
          {bookingStatusData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                Booking Status
              </h2>
              <div className="flex flex-col items-center">
                <PieChart width={200} height={200}>
                  <Pie
                    data={bookingStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {bookingStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
                <div className="w-full space-y-3 mt-4">
                  {bookingStatusData.map((d, i) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-600 capitalize">
                          {d.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Listings */}
          {overview?.topListings?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                Top Performing
              </h2>
              <div className="space-y-4">
                {overview.topListings.map((listing, i) => (
                  <div
                    key={listing._id || i}
                    className="flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 text-sm font-bold flex items-center justify-center shrink-0">
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {listing.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-semibold text-emerald-600">
                          {listing.totalBookings ?? 0}
                        </span>{" "}
                        {listing.totalBookings === 1 ? "booking" : "bookings"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!overview && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4 text-gray-300 flex justify-center">
            <FiPieChart />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No Data Yet</h3>
          <p className="text-gray-500 mt-2">
            Create listings and get bookings to see your insights here.
          </p>
        </div>
      )}
    </div>
  );
}
