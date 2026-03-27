import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { hostAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiPlus,
  FiEdit2,
  FiEye,
  FiTrash2,
  FiMapPin,
  FiStar,
  FiArrowLeft,
} from "react-icons/fi";
import toast from "react-hot-toast";

const statusColors = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
  archived: "bg-gray-100 text-gray-500",
};

export default function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await hostAPI.getMyListings({ type: "properties" });
      setListings(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load listings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDeleteRequest = async (id) => {
    if (
      !confirm(
        "Are you sure you want to request deletion for this listing? An admin will review your request.",
      )
    )
      return;

    try {
      await hostAPI.deleteListing(id);
      toast.success("Deletion Requested");
      fetchListings();
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
            to="/host/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-primary-600 transition mb-2 group"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Return to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            My Listings
          </h1>
          <p className="text-gray-500 font-medium">
            Manage and monitor your performance
          </p>
        </div>
        <Link
          to="/host/listings/new"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
        >
          <FiPlus size={20} /> Add New Listing
        </Link>
      </div>

      {/* ─── CONTENT ─── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
          <div className="text-6xl mb-4">🏜️</div>
          <h3 className="text-xl font-bold text-gray-800">
            No properties found
          </h3>
          <p className="text-gray-400 mt-2 max-w-xs mx-auto">
            You haven't listed any properties yet. Start earning today!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {listings.map((item) => {
            const primaryImage =
              item.images?.find((i) => i.isPrimary)?.url ||
              item.images?.[0]?.url ||
              item.images?.[0];

            const displayPrice = item.pricePerNight || item.pricePerMonth || 0;

            const priceUnit =
              item.rentalType === "long_term" ? "/mo" : "/night";

            return (
              <div
                key={item._id}
                className="group bg-white rounded-3xl border border-gray-100 p-4 flex flex-col md:flex-row gap-6 hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative w-full md:w-64 h-44 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
                  <img
                    src={primaryImage || "https://placehold.co/600x400/png"}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${statusColors[item.status]}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">
                      <FiMapPin className="text-emerald-500" />
                      {item.location?.district || "—"}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm font-bold">
                      <div className="text-gray-900">
                        ৳{displayPrice.toLocaleString()}
                        <span className="text-gray-400 font-medium text-xs">
                          {" "}
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
                      to={`/properties/${item._id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                    >
                      <FiEye size={14} /> Preview
                    </Link>
                    <Link
                      to={`/host/listings/${item._id}/edit`}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <FiEdit2 size={14} /> Edit
                    </Link>
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
