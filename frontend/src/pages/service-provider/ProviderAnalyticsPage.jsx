// src/pages/service-provider/ProviderAnalyticsPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, isValid } from "date-fns";
import api from "../../services/api";
import {
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiPieChart,
  FiStar,
  FiClock,
  FiTrendingUp,
  FiFileText,
  FiPackage,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#059669", "#0891b2", "#7c3aed", "#d97706", "#e11d48"];

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex justify-center items-center py-20 text-emerald-600">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div className="flex items-center gap-4 my-2">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function ProviderAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/provider/overview").catch(() => null),
      api.get("/analytics/provider/revenue").catch(() => null),
      api.get("/payments/my-transactions").catch(() => null),
    ])
      .then(([ov, rev, txns]) => {
        // Backend returns: ov.data.data = { overview, monthlyEarnings, bookingStats, topServices }
        const ovData = ov?.data?.data ?? null;

        if (ovData) {
          // Flatten into the shape the component expects
          setOverview({
            totalBookings: ovData.overview?.totalBookings ?? 0,
            totalServices: ovData.overview?.totalServices ?? 0,
            totalExperiences: ovData.overview?.totalExperiences ?? 0,
            totalEarnings: ovData.overview?.totalEarnings ?? 0,
            pendingEarnings: ovData.overview?.pendingPayouts ?? 0, // key rename
            avgRating: ovData.topServices?.[0]?.averageRating ?? null,
            bookingsByStatus: ovData.bookingStats ?? {}, // e.g. { completed: 2 }
            topListings: (ovData.topServices ?? []).map((s) => ({
              _id: s._id,
              title: s.title,
              bookingsCount: s.totalBookings,
              revenue: s.pricePerHour * s.totalBookings, // approximate if no direct revenue field
            })),
          });
        }

        setRevenue(rev?.data?.data ?? []);
        setTransactions(txns?.data?.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  // ── Derived data ─────────────────────────────────────────────────────────────
  const bookingStatusData = overview?.bookingsByStatus
    ? Object.entries(overview.bookingsByStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const totalEarnings = overview?.totalEarnings ?? 0;
  const pendingEarnings = overview?.pendingEarnings ?? 0;
  const thisMonthEarnings = revenue[revenue.length - 1]?.earnings ?? 0;
  const lastMonthEarnings = revenue[revenue.length - 2]?.earnings ?? 0;

  const noData = !overview && revenue.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-10 animate-fadeIn">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/provider/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-emerald-600 transition mb-2 group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">
          Analytics & Earnings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Performance overview and income history for your services &amp;
          experiences
        </p>
      </div>

      {noData ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-6xl mb-4 flex justify-center text-gray-200">
            <FiPieChart />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No Data Yet</h3>
          <p className="text-gray-500 mt-2 text-sm max-w-xs mx-auto">
            Start offering services or experiences and get bookings to see your
            insights here.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Link
              to="/provider/services/new"
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition"
            >
              Add a Service
            </Link>
            <Link
              to="/provider/experiences/new"
              className="px-5 py-2.5 border border-emerald-600 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-50 transition"
            >
              Add an Experience
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════
              SECTION 1 — PERFORMANCE OVERVIEW
          ════════════════════════════════════════════════════════════════ */}
          <Divider label="Performance Overview" />

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
                label: "Total Services",
                value: overview?.totalServices ?? 0,
                icon: <FiPackage />,
                color: "text-teal-600",
                bg: "bg-teal-50",
              },
              {
                label: "Total Experiences",
                value: overview?.totalExperiences ?? 0,
                icon: <FiPieChart />,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Avg Rating",
                value: overview?.avgRating
                  ? Number(overview.avgRating).toFixed(1)
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
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Bar Chart */}
            {revenue.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <SectionHeader
                  title="Monthly Revenue (BDT)"
                  subtitle="Combined earnings from services & experiences"
                />
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
              {/* Booking Status Donut */}
              {bookingStatusData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-semibold text-gray-800 mb-4">
                    Booking Status
                  </h2>
                  <div className="flex flex-col items-center">
                    <PieChart width={200} height={180}>
                      <Pie
                        data={bookingStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
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
                    <div className="w-full space-y-2.5 mt-2">
                      {bookingStatusData.map((d, i) => (
                        <div
                          key={d.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
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

              {/* Top Performing */}
              {overview?.topListings?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-semibold text-gray-800 mb-4">
                    Top Performing
                  </h2>
                  <div className="space-y-4">
                    {overview.topListings.map((item, i) => (
                      <div
                        key={item._id ?? i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 text-sm font-bold flex items-center justify-center shrink-0">
                            #{i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 line-clamp-1">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.bookingsCount} bookings
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600 shrink-0">
                          ৳{Number(item.revenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 2 — EARNINGS
          ════════════════════════════════════════════════════════════════ */}
          <Divider label="Earnings" />

          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Earned — hero card */}
            <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-emerald-500 opacity-30 text-8xl">
                <FiDollarSign />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-100 text-sm font-medium mb-1">
                  <FiDollarSign /> Total Earned
                </div>
                <p className="text-3xl font-bold">
                  ৳{Number(totalEarnings).toLocaleString()}
                </p>
                <p className="text-emerald-300 text-xs mt-2 font-medium">
                  90% of booking total
                </p>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
                <FiClock /> Pending
              </div>
              <p className="text-3xl font-bold text-amber-500">
                ৳{Number(pendingEarnings).toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs mt-2 font-medium">
                Awaiting payment to your bank
              </p>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
                <FiTrendingUp /> This Month
              </div>
              <p className="text-3xl font-bold text-gray-800">
                ৳{Number(thisMonthEarnings).toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs mt-2 font-medium">
                {revenue.length > 1
                  ? `vs ৳${Number(lastMonthEarnings).toLocaleString()} last month`
                  : "Current month earnings"}
              </p>
            </div>
          </div>

          {/* Earnings Trend Line Chart */}
          {revenue.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                title="Earnings Trend"
                subtitle="Monthly income over time"
              />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenue}>
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
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#059669",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                Transaction History
              </h2>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4 text-gray-200 flex justify-center">
                  <FiFileText />
                </div>
                <p className="text-gray-500 font-medium">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  When customers book your services or experiences, payments
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {[
                        "Date",
                        "Booking Detail",
                        "Type",
                        "Total",
                        "Your Share",
                        "Status",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((txn) => {
                      const bookingTitle =
                        txn.booking?.service?.title ??
                        txn.booking?.experience?.title ??
                        txn.booking?.property?.title ??
                        (txn.stripePaymentIntentId
                          ? `Payment ...${txn.stripePaymentIntentId.slice(-6)}`
                          : "—");

                      const bookingType = txn.booking?.service
                        ? "Service"
                        : txn.booking?.experience
                          ? "Experience"
                          : txn.booking?.property
                            ? "Property"
                            : "—";

                      const typeColor =
                        bookingType === "Service"
                          ? "bg-teal-50 text-teal-700"
                          : bookingType === "Experience"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-amber-50 text-amber-700";

                      const txnDate =
                        txn.createdAt && isValid(new Date(txn.createdAt))
                          ? format(new Date(txn.createdAt), "MMM dd, yyyy")
                          : "—";

                      return (
                        <tr
                          key={txn._id}
                          className="hover:bg-gray-50/80 transition"
                        >
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {txnDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800 font-medium max-w-[200px]">
                            <p className="line-clamp-1">{bookingTitle}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor}`}
                            >
                              {bookingType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-600 whitespace-nowrap">
                            ৳{Number(txn.totalAmount ?? 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-600 whitespace-nowrap">
                            ৳{Number(txn.providerEarning ?? 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                txn.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : txn.status === "pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
