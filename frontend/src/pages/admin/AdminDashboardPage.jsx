// src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";
import {
  FiUsers,
  FiHome,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiTool,
  FiCompass,
} from "react-icons/fi";
import { formatCurrency } from "../../utils/bdLocations";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import DashboardHeader from "../../components/common/DashboardHeader";

export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState(null);
  const [pendingP, setPendingP] = useState([]);
  const [pendingU, setPendingU] = useState([]);
  const [pendingE, setPendingE] = useState([]);
  const [pendingS, setPendingS] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getAnalytics({ dateRange: "month" }).catch(() => null),
      adminAPI
        .getProperties({ status: "pending", limit: 100 })
        .catch(() => null),
      adminAPI.getUsers({ isVerified: false, limit: 100 }).catch(() => null),
      adminAPI
        .getPublicExperiences({ status: "pending", limit: 100 })
        .catch(() => null),
      adminAPI.getServices({ status: "pending", limit: 100 }).catch(() => null),
    ])
      .then(([analyticsRes, propRes, userRes, expRes, serviceRes]) => {
        setStats(analyticsRes?.data?.data?.analytics?.overview || null);

        const pData = propRes?.data?.data;
        setPendingP(
          Array.isArray(pData) ? pData : pData?.properties || pData?.docs || [],
        );

        const uData = userRes?.data?.data;
        setPendingU(
          Array.isArray(uData) ? uData : uData?.users || uData?.docs || [],
        );

        const eData = expRes?.data?.data;
        setPendingE(
          Array.isArray(eData)
            ? eData
            : eData?.experiences || eData?.docs || [],
        );

        const sData = serviceRes?.data?.data;
        setPendingS(
          Array.isArray(sData) ? sData : sData?.services || sData?.docs || [],
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );

  const safePendingP = Array.isArray(pendingP) ? pendingP : [];
  const safePendingU = Array.isArray(pendingU) ? pendingU : [];
  const safePendingE = Array.isArray(pendingE) ? pendingE : [];
  const safePendingS = Array.isArray(pendingS) ? pendingS : [];

  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers - 1 || 0,
      icon: FiUsers,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/admin/users",
    },
    {
      label: "Active Listings",
      value: stats?.totalListings || 0,
      icon: FiHome,
      color: "text-green-600",
      bg: "bg-green-50",
      link: "/admin/properties",
    },
    {
      label: "Service and Experience Listings",
      value: stats?.totalServices || "Manage",
      icon: FiCompass,
      color: "text-orange-600",
      bg: "bg-orange-50",
      link: "/admin/services",
    },
    {
      label: "Total Bookings",
      value: stats?.totalBookings || 0,
      icon: FiCalendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
      link: "/admin/bookings",
    },
    {
      label: "Platform Revenue",
      value: stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : "৳0",
      icon: FiTrendingUp,
      color: "text-primary-600",
      bg: "bg-primary-50",
      link: "/admin/analytics",
    },
    {
      label: "Pending Approvals",
      value:
        stats?.pendingApprovals ||
        safePendingP.length + safePendingE.length + safePendingS.length ||
        0,
      icon: FiAlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      link: "/admin/pending",
    },
  ];

  return (
    <div className="p-10 space-y-8">
      {/* Header */}
      <div>
        <DashboardHeader />
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0] || "Admin"}! 🛡️
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here is your platform overview and pending actions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-primary-300 hover:shadow-md transition group no-underline flex flex-col justify-between"
          >
            <div
              className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4`}
            >
              <card.icon size={24} className={card.color} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-500 mt-1">
                {card.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Action Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Properties */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">
              Pending Properties ({safePendingP.length})
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {safePendingP.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FiCheckCircle
                  size={32}
                  className="mx-auto mb-3 text-green-400"
                />
                <p className="text-sm text-gray-500 font-medium">
                  No pending properties
                </p>
              </div>
            ) : (
              safePendingP.map((prop) => (
                <div
                  key={prop._id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FiHome className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {prop.title || "Untitled Property"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {prop.location?.district || "Unknown"} •{" "}
                      {prop.host?.name || "Unknown Host"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Experiences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">
              Pending Experiences ({safePendingE.length})
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {safePendingE.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FiCheckCircle
                  size={32}
                  className="mx-auto mb-3 text-green-400"
                />
                <p className="text-sm text-gray-500 font-medium">
                  No pending experiences
                </p>
              </div>
            ) : (
              safePendingE.map((exp) => (
                <div
                  key={exp._id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <FiCalendar className="text-orange-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {exp.title || "Untitled Experience"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {exp.location?.district || "Unknown"} •{" "}
                      {exp.host?.name || "Unknown Host"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Services */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">
              Pending Services ({safePendingS.length})
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {safePendingS.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FiCheckCircle
                  size={32}
                  className="mx-auto mb-3 text-green-400"
                />
                <p className="text-sm text-gray-500 font-medium">
                  No pending services
                </p>
              </div>
            ) : (
              safePendingS.map((service) => (
                <div
                  key={service._id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <FiTool className="text-purple-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {service.title || "Untitled Service"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate capitalize">
                      {service.category || "General"} •{" "}
                      {service.provider?.name || "Unknown Provider"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unverified Users */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">
              Unverified Users ({safePendingU.length})
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {safePendingU.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FiCheckCircle
                  size={32}
                  className="mx-auto mb-3 text-green-400"
                />
                <p className="text-sm text-gray-500 font-medium">
                  All users are verified
                </p>
              </div>
            ) : (
              safePendingU.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary-600 text-lg uppercase">
                      {u.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {u.name || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate capitalize">
                      {u.email || "No email"} •{" "}
                      {u.role?.replace("_", " ") || "User"}
                    </p>
                  </div>
                  {/* ✅ FIXED: links to /admin/users?edit=<id> instead of /admin/users/<id> */}
                  <Link
                    to={`/admin/users?edit=${u._id}`}
                    className="text-xs bg-primary-600 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-primary-700 transition shrink-0"
                  >
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
