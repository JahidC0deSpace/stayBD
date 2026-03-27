// src/pages/admin/AdminAnalyticsPage.jsx
// Full admin analytics dashboard with Recharts

import { useState, useEffect } from "react";
import { analyticsAPI } from "../../services/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiDollarSign,
  FiUsers,
  FiHome,
  FiCalendar,
  FiTrendingUp,
  FiActivity,
  FiArrowLeft,
} from "react-icons/fi";
import { formatCurrency } from "../../utils/bdLocations";
import { Link } from "react-router-dom";

const COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
];

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary-500",
  bg = "bg-primary-50",
}) => (
  <div className="bg-white rounded-2xl p-6 shadow-card">
    <div className="flex items-center justify-between mb-4">
      <div
        className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}
      >
        <Icon size={22} className={color} />
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    <p className="text-gray-500 text-sm mt-1">{label}</p>
    {sub && <p className="text-xs text-green-500 mt-1 font-medium">{sub}</p>}
  </div>
);

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getAdminStats({ dateRange });
      setAnalytics(res.data.data.analytics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (!analytics)
    return <p className="text-gray-500">Failed to load analytics.</p>;

  const {
    overview,
    monthlyRevenue,
    paymentStats,
    topProperties,
    bookingsByStatus,
    usersByRole,
  } = analytics;

  // Prepare pie data for bookings by status
  const bookingStatusData = Object.entries(bookingsByStatus || {}).map(
    ([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }),
  );

  // Prepare pie data for users by role
  const userRoleData = Object.entries(usersByRole || {}).map(
    ([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
    }),
  );

  return (
    <div className="p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-8">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-primary-600 transition mb-2 group"
            >
              <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              Return to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            StayBD performance overview
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="input-field w-40 py-2"
        >
          <option value="all">All Time</option>
          <option value="year">This Year</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={FiDollarSign}
          label="Admin Revenue"
          value={formatCurrency(overview.totalRevenue)}
          sub="Platform commission (10%)"
          color="text-primary-500"
          bg="bg-primary-50"
        />
        <StatCard
          icon={FiUsers}
          label="Total Users"
          value={overview.totalUsers?.toLocaleString()}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard
          icon={FiHome}
          label="Active Listings"
          value={overview.totalListings?.toLocaleString()}
          color="text-green-500"
          bg="bg-green-50"
        />
        <StatCard
          icon={FiCalendar}
          label="Total Bookings"
          value={overview.totalBookings?.toLocaleString()}
          color="text-purple-500"
          bg="bg-purple-50"
        />
        <StatCard
          icon={FiActivity}
          label="Pending Approvals"
          value={overview.pendingApprovals}
          color="text-yellow-500"
          bg="bg-yellow-50"
        />
        <StatCard
          icon={FiTrendingUp}
          label="Success Rate"
          value={`${
            paymentStats?.paid?.count
              ? Math.round(
                  (paymentStats.paid.count / overview.totalBookings) * 100,
                )
              : 0
          }%`}
          color="text-teal-500"
          bg="bg-teal-50"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Monthly Revenue Trend
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={monthlyRevenue || []}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip formatter={(v, name) => [formatCurrency(v), name]} />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Admin Revenue"
              stroke="#f97316"
              fill="url(#revenueGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="totalVolume"
              name="Gross Volume"
              stroke="#3b82f6"
              fill="url(#volumeGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking transactions bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Monthly Bookings
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyRevenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="bookings"
                name="Bookings"
                fill="#f97316"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Booking status pie */}
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Booking Status
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {bookingStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Users by role + Top Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User roles */}
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Users by Role
          </h3>
          <div className="space-y-4">
            {userRoleData.map((item, i) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-gray-500">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.round((item.value / overview.totalUsers) * 100)}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top properties */}
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Top Properties
          </h3>
          <div className="space-y-4">
            {(topProperties || []).map((prop, i) => (
              <div key={prop._id} className="flex items-center gap-4">
                <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {prop.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {prop.location?.district} • {prop.host?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {prop.totalBookings} bookings
                  </p>
                  <p className="text-xs text-yellow-500">
                    ★ {prop.averageRating?.toFixed(1) || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment stats */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Payment Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(paymentStats || {}).map(([status, data]) => (
            <div key={status} className="bg-gray-50 rounded-xl p-4 text-center">
              <p
                className={`badge mb-2 mx-auto ${
                  status === "paid"
                    ? "badge-green"
                    : status === "failed"
                      ? "badge-red"
                      : status === "refunded"
                        ? "badge-blue"
                        : "badge-yellow"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {data.count || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(data.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
