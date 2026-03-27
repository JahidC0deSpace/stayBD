// src/pages/host/HostDashboardPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { hostAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useAuthStore } from "../../store/useAuthStore"; // Added Zustand import
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { FiPlus } from "react-icons/fi"; // Added icon for the button
import DashboardHeader from "../../components/common/DashboardHeader";

function StatCard({ title, value, icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
        {sub && (
          <p className="text-xs text-emerald-600 font-medium mt-2 bg-emerald-50 w-fit px-2 py-1 rounded-md">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function HostDashboardPage() {
  // Added user state from Zustand for personalization
  const user = useAuthStore((state) => state.user);

  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      hostAPI.getOverview().catch(() => null),
      hostAPI.getRevenue().catch(() => null),
    ])
      .then(([overview, rev]) => {
        setData(overview?.data?.data || null);
        setRevenue(rev?.data?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );

  return (
    <div className="p-10 space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <DashboardHeader />
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0] || "Host"}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here is what is happening with your properties today.
          </p>
        </div>
        <Link
          to="/host/listings/new"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition shadow-sm w-full sm:w-auto"
        >
          <FiPlus size={18} /> New Listing
        </Link>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Listings"
          value={data?.overview?.totalListings ?? 0} // Added .overview
          icon="🏠"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Active Bookings"
          value={data?.overview?.totalBookings ?? 0} // Added .overview
          icon="📅"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Total Earnings"
          value={
            data?.overview?.totalEarnings // Added .overview
              ? `৳${Number(data.overview.totalEarnings).toLocaleString()}`
              : "৳0"
          }
          icon="💰"
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          title="Avg Rating"
          value={
            data?.overview?.averageRating
              ? data.overview.averageRating.toFixed(1)
              : "N/A"
          } // Added .overview
          icon="⭐"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* 3. Main Content Grid (Chart + Links) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart (Spans 2 columns on large screens) */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${revenue.length > 0 ? "lg:col-span-2" : "hidden"}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Revenue Overview
            </h2>
            <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenue}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `৳${v / 1000}k`}
              />
              <Tooltip
                formatter={(v) => `৳${Number(v).toLocaleString()}`}
                cursor={{ fill: "#f3f4f6" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              {/* Changed fill color to match your brand's primary color */}
              <Bar
                dataKey="earnings"
                fill="#0ea5e9"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Links Column */}
        <div className="space-y-4 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Quick Actions
          </h2>
          {[
            {
              to: "/host/listings",
              label: "Manage Listings",
              icon: "🏠",
              desc: "View & edit your properties",
              bg: "bg-blue-50",
            },
            {
              to: "/host/bookings",
              label: "Manage Bookings",
              icon: "📅",
              desc: "Approve or decline requests",
              bg: "bg-green-50",
            },
            {
              to: "/host/earnings",
              label: "Withdraw Funds",
              icon: "💳",
              desc: "Check your transaction history",
              bg: "bg-purple-50",
            },
            {
              to: "/host/analytics",
              label: "Analytics",
              icon: "📊",
              desc: "Check your analytics",
              bg: "bg-purple-50",
            },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-primary-300 hover:shadow-md transition group"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${link.bg}`}
              >
                {link.icon}
              </div>
              <div>
                <p className="font-bold text-gray-900 group-hover:text-primary-600 transition">
                  {link.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
