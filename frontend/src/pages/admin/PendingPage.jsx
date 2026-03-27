// src/pages/admin/PendingPage.jsx
import { useState, useEffect } from "react";
import DashboardHeader from "../../components/common/DashboardHeader";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiHome,
  FiCalendar,
  FiTool,
  FiUser,
  FiCheck,
  FiX,
  FiArrowLeft,
} from "react-icons/fi";
import { Link } from "react-router-dom";

export default function PendingPage() {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingData();
  }, []);

  const loadPendingData = async () => {
    setLoading(true);
    try {
      // Fetch everything at once (catch errors individually so one failure doesn't break the whole page)
      const [propsRes, expRes, servRes, usersRes] = await Promise.all([
        adminAPI
          .getProperties({ status: "pending" })
          .catch(() => ({ data: { data: [] } })),
        adminAPI
          .getAdminExperiences({ status: "pending" })
          .catch(() => ({ data: { data: [] } })),
        adminAPI
          .getServices({ status: "pending" })
          .catch(() => ({ data: { data: [] } })),
        adminAPI.getUsers().catch(() => ({ data: { data: [] } })), // We will filter unverified users below
      ]);

      // 1. Extract & Normalize Properties
      const rawProps =
        propsRes.data?.data?.properties || propsRes.data?.data || [];
      const pendingProps = Array.isArray(rawProps)
        ? rawProps
            .filter((p) => p.status === "pending" || p.hasPendingChanges)
            .map((p) => ({
              ...p,
              itemType: "property",
              displayTitle: p.title,
              displaySub:
                p.location?.city || p.location?.district || "Unknown Location",
              displayImage: p.images?.[0]?.url || p.images?.[0] || "",
            }))
        : [];

      // 2. Extract & Normalize Experiences
      const rawExp = expRes.data?.data?.experiences || expRes.data?.data || [];
      const pendingExp = Array.isArray(rawExp)
        ? rawExp
            .filter((e) => e.status === "pending" || e.hasPendingChanges)
            .map((e) => ({
              ...e,
              itemType: "experience",
              displayTitle: e.title,
              displaySub: e.category || "Experience",
              displayImage: e.images?.[0]?.url || e.images?.[0] || "",
            }))
        : [];

      // 3. Extract & Normalize Services
      const rawServ = servRes.data?.data?.services || servRes.data?.data || [];
      const pendingServ = Array.isArray(rawServ)
        ? rawServ
            .filter((s) => s.status === "pending" || s.hasPendingChanges)
            .map((s) => ({
              ...s,
              itemType: "service",
              displayTitle: s.title,
              displaySub: s.category || "Service",
              displayImage: s.images?.[0]?.url || s.images?.[0] || "",
            }))
        : [];

      // 4. Extract & Normalize Users (Hosts/Providers awaiting verification)
      const rawUsers = usersRes.data?.data?.users || usersRes.data?.data || [];
      const pendingUsers = Array.isArray(rawUsers)
        ? rawUsers
            .filter(
              (u) =>
                !u.isVerified && (u.role === "host" || u.role === "provider"),
            )
            .map((u) => ({
              ...u,
              itemType: "user",
              displayTitle: u.name,
              displaySub: u.email,
              displayImage: u.avatar || u.profilePicture || "",
            }))
        : [];

      // Combine all and sort by oldest first (first in, first out for approvals)
      const combined = [
        ...pendingProps,
        ...pendingExp,
        ...pendingServ,
        ...pendingUsers,
      ].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

      setPendingItems(combined);
    } catch (error) {
      console.error("Error loading pending data", error);
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, itemType) => {
    try {
      if (itemType === "property") {
        await adminAPI.approveProperty(id, {
          action: "approve",
          status: "approved",
        });
      } else if (itemType === "experience") {
        await adminAPI.approveExperience(id, {
          action: "approve",
          status: "approved",
        });
      } else if (itemType === "service") {
        await adminAPI.approveService(id, {
          action: "approve",
          status: "approved",
        });
      } else if (itemType === "user") {
        // Assuming your backend expects { isVerified: true } for users
        await adminAPI.verifyUser(id, { isVerified: true });
      }
      toast.success(`${itemType} approved!`);
      loadPendingData(); // Refresh the list
    } catch (error) {
      toast.error(`Failed to approve ${itemType}`);
    }
  };

  const handleReject = async (id, itemType) => {
    try {
      if (itemType === "property") {
        await adminAPI.approveProperty(id, {
          action: "reject",
          status: "rejected",
        });
      } else if (itemType === "experience") {
        await adminAPI.approveExperience(id, {
          action: "reject",
          status: "rejected",
        });
      } else if (itemType === "service") {
        await adminAPI.approveService(id, {
          action: "reject",
          status: "rejected",
        });
      } else if (itemType === "user") {
        // You might have a banUser or deleteUser API for rejected users
        await adminAPI.banUser(id, {
          isBanned: true,
          reason: "Verification Rejected",
        });
      }
      toast.success(`${itemType} rejected.`);
      loadPendingData(); // Refresh the list
    } catch (error) {
      toast.error(`Failed to reject ${itemType}`);
    }
  };

  // UI Helpers
  const getTypeConfig = (type) => {
    switch (type) {
      case "property":
        return {
          icon: <FiHome />,
          color: "bg-blue-100 text-blue-700",
          border: "border-blue-200",
        };
      case "experience":
        return {
          icon: <FiCalendar />,
          color: "bg-purple-100 text-purple-700",
          border: "border-purple-200",
        };
      case "service":
        return {
          icon: <FiTool />,
          color: "bg-orange-100 text-orange-700",
          border: "border-orange-200",
        };
      case "user":
        return {
          icon: <FiUser />,
          color: "bg-teal-100 text-teal-700",
          border: "border-teal-200",
        };
      default:
        return {
          icon: null,
          color: "bg-gray-100 text-gray-700",
          border: "border-gray-200",
        };
    }
  };

  return (
    <div className="p-10 space-y-8 max-w-7xl mx-auto">
      <Link
        to="/admin/dashboard"
        className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-primary-600 transition mb-2 group"
      >
        <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Return to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          Pending Approvals
          {pendingItems.length > 0 && !loading && (
            <span className="bg-red-500 text-white text-sm py-0.5 px-2.5 rounded-full font-bold">
              {pendingItems.length}
            </span>
          )}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Review and approve properties, experiences, services, and new provider
          accounts.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
        <h2 className="text-lg font-semibold mb-6">Awaiting Your Review</h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-gray-700">All caught up!</h3>
            <p className="text-gray-500 mt-1">
              There are no pending items requiring your approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => {
              const config = getTypeConfig(item.itemType);

              return (
                <div
                  key={item._id}
                  className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border ${config.border} bg-white hover:shadow-md transition-shadow`}
                >
                  {/* Image or Icon */}
                  <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                    {item.displayImage ? (
                      <img
                        src={item.displayImage}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`text-2xl ${config.color.split(" ")[1]}`}>
                        {config.icon}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${config.color}`}
                      >
                        {item.itemType}
                      </span>
                      {item.hasPendingChanges && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200">
                          Update Requested
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900">
                      {item.displayTitle}
                    </h3>
                    <p className="text-sm text-gray-500">{item.displaySub}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                    <button
                      onClick={() => handleApprove(item._id, item.itemType)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 rounded-lg text-sm font-bold transition-colors"
                    >
                      <FiCheck /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(item._id, item.itemType)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg text-sm font-bold transition-colors"
                    >
                      <FiX /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
