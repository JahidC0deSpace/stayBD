// src/pages/provider/MyServicesPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { providerAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiPlus,
  FiEdit2,
  FiEye,
  FiTrash2, // 🎯 Swapped FiArchive for FiTrash2
  FiMapPin,
  FiStar,
  FiArrowLeft,
  FiTool,
} from "react-icons/fi";
import toast from "react-hot-toast";

const statusColors = {
  approved: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
  archived: "bg-gray-100 text-gray-500",
};

export default function MyServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await providerAPI.getMyServices();
      setServices(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load services");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // 🎯 UPDATED: Handles deletion request instead of direct archive
  const handleDeleteRequest = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to request deletion for this service? An admin will review your request.",
      )
    )
      return;
    try {
      await providerAPI.deleteService(id);
      toast.success("Deletion Requested");
      fetchServices();
    } catch {
      toast.error("Failed to request deletion");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/provider/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-blue-600 transition mb-2 group"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Return to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            My Services
          </h1>
          <p className="text-gray-500 font-medium">
            Manage your offerings and track your performance
          </p>
        </div>
        <Link
          to="/provider/services/new"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
        >
          <FiPlus size={20} /> Add New Service
        </Link>
      </div>

      {/* ─── CONTENT ─── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
          <div className="flex justify-center mb-4 text-blue-200">
            <FiTool size={64} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">No services found</h3>
          <p className="text-gray-400 mt-2 max-w-xs mx-auto">
            You haven't listed any services yet. Create one to start accepting
            bookings!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {services.map((item) => {
            const primaryImage =
              item.images?.find((i) => i.isPrimary)?.url ||
              item.images?.[0]?.url ||
              item.images?.[0];

            const displayPrice = item.pricePerHour || item.basePrice || 0;
            const priceUnit = item.pricePerHour ? "/hr" : " flat rate";

            return (
              <div
                key={item._id}
                className="group bg-white rounded-3xl border border-gray-100 p-4 flex flex-col md:flex-row gap-6 hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300"
              >
                {/* Image Wrap */}
                <div className="relative w-full md:w-64 h-44 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
                  <img
                    src={primaryImage || "https://placehold.co/600x400/png"}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${statusColors[item.status] || statusColors.pending}`}
                  >
                    {item.status || "Pending"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">
                      <FiMapPin className="text-blue-500" />
                      {item.serviceArea?.districts?.[0] ||
                        item.location?.district ||
                        "Online / Global"}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm font-bold">
                      <div className="text-gray-900">
                        ৳{displayPrice.toLocaleString()}
                        <span className="text-gray-400 font-medium text-xs">
                          {priceUnit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        <FiStar className="fill-amber-500" />
                        <span>{item.averageRating?.toFixed(1) || "New"}</span>
                        {item.totalReviews > 0 && (
                          <span className="text-gray-300 font-medium text-xs">
                            ({item.totalReviews})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    <Link
                      to={`/services/${item._id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                    >
                      <FiEye size={14} /> Preview
                    </Link>
                    <Link
                      to={`/provider/services/${item._id}/edit`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      <FiEdit2 size={14} /> Edit
                    </Link>

                    {/* 🎯 UPDATED: Request Deletion Button with disabled state */}
                    <button
                      onClick={() => handleDeleteRequest(item._id)}
                      disabled={item.deletionRequested}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ml-auto ${
                        item.deletionRequested
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-rose-50 text-rose-500 hover:bg-rose-100"
                      }`}
                    >
                      {item.deletionRequested ? (
                        <>Deletion Pending</>
                      ) : (
                        <>
                          <FiTrash2 size={14} /> Request Deletion
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
