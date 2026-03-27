import { useState, useEffect } from "react";
import api from "../../services/api";
import { format } from "date-fns";
import {
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiFileText,
  FiArrowLeft,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";

export default function HostEarningsPage() {
  const [transactions, setTransactions] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/payments/my-transactions").catch(() => null),
      api.get("/analytics/host/revenue").catch(() => null),
      api.get("/analytics/host/overview").catch(() => null),
    ])
      .then(([txns, rev, ov]) => {
        console.log("Overview data:", ov?.data);
        setTransactions(txns?.data?.data || []);
        setRevenue(rev?.data?.data || []);
        setSummary(ov?.data?.data?.overview || null);
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

  const totalEarnings = summary?.totalEarnings || 0;
  const pendingEarnings = summary?.pendingPayouts || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
      <div>
        <Link
          to="/host/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors duration-200 group w-fit"
        >
          <span className="p-1.5 rounded-full bg-gray-100 group-hover:bg-emerald-50 mr-2 transition-colors">
            <FiArrowLeft className="group-hover:-translate-x-0.5 transition-transform" />
          </span>
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Earnings</h1>
        <p className="text-gray-500 text-sm">Your income & payout history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-primary-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-primary-500 opacity-30 text-8xl">
            <FiDollarSign />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-100 text-sm font-medium mb-1">
              <FiDollarSign /> Total Earned
            </div>
            <p className="text-3xl font-bold">
              ৳{Number(totalEarnings).toLocaleString()}
            </p>
            <p className="text-primary-300 text-xs mt-2 font-medium">
              90% of booking total
            </p>
          </div>
        </div>

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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
            <FiTrendingUp /> This Month
          </div>
          <p className="text-3xl font-bold text-gray-800">
            ৳
            {Number(
              revenue[revenue.length - 1]?.earnings || 0,
            ).toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs mt-2 font-medium">
            {revenue.length > 1
              ? `vs ৳${Number(revenue[revenue.length - 2]?.earnings || 0).toLocaleString()} last month`
              : "Current month earnings"}
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {revenue.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-6">
            Earnings Trend
          </h2>
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
                dot={{ r: 4, fill: "#059669", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction History Table */}
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
              When guests book your properties, payments will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Booking Detail
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Total
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Your Share
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((txn) => (
                  <tr
                    key={txn._id}
                    className="hover:bg-gray-50/80 transition group"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {txn.createdAt
                        ? format(new Date(txn.createdAt), "MMM dd, yyyy")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      {txn.booking?.property?.title ||
                        txn.booking?.service?.title ||
                        (txn.stripePaymentIntentId &&
                          `Payment ...${txn.stripePaymentIntentId.slice(-6)}`) ||
                        "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600 whitespace-nowrap">
                      ৳{Number(txn.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600 whitespace-nowrap">
                      ৳{Number(txn.providerEarning || 0).toLocaleString()}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
