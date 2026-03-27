// src/pages/admin/AdminPropertiesPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiX,
  FiEye,
  FiArrowLeft,
  FiHome,
  FiTrash2,
} from "react-icons/fi";
import { formatDate, formatCurrency } from "../../utils/bdLocations";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function AdminPropertiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);

  const LIMIT = 15;

  // Modals State
  const [rejectModal, setRejectModal] = useState({
    open: false,
    item: null,
    reason: "",
    isUpdate: false,
  });

  const [reviewModal, setReviewModal] = useState({
    open: false,
    item: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI
        .getProperties()
        .catch(() => ({ data: { data: [] } }));

      const pData =
        res.data?.data?.properties || res.data?.data || res.data || [];
      const safeProperties = Array.isArray(pData)
        ? pData.map((p) => ({ ...p, itemType: "property" }))
        : [];

      // Sort by newest first
      const sorted = safeProperties.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );

      setItems(sorted);
    } catch (err) {
      console.error("API Error:", err);
      toast.error("Failed to load properties");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- FILTERING LOGIC ---
  const filteredItems = items.filter((item) => {
    if (status === "deletion-requests") return item.deletionRequested === true;
    if (status === "approved")
      return item.status === "approved" && !item.deletionRequested;
    return item.status === status;
  });

  const total = filteredItems.length;
  const paginatedItems = filteredItems.slice((page - 1) * LIMIT, page * LIMIT);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  // --- ACTIONS ---
  const approve = async (item, isUpdate = false) => {
    try {
      if (isUpdate) {
        // ✅ Route to the correct endpoint for pending changes
        await adminAPI.reviewPropertyChanges(item._id, { action: "approve" });
        toast.success("Changes applied!");
      } else {
        await adminAPI.approveProperty(item._id, {
          action: "approve",
          status: "approved",
        });
        toast.success("Property approved!");
      }
      loadData();
    } catch (err) {
      toast.error("Failed to approve");
    }
  };

  const reject = async () => {
    const { item, reason, isUpdate } = rejectModal;
    try {
      if (isUpdate) {
        // ✅ Use reviewPropertyChanges for pending change rejections
        await adminAPI.reviewPropertyChanges(item._id, {
          action: "reject",
          reason,
        });
        toast.success("Changes rejected");
      } else {
        await adminAPI.approveProperty(item._id, {
          action: "reject",
          status: "rejected",
          reason,
        });
        toast.success("Property rejected");
      }
      closeRejectModal();
      loadData();
    } catch (err) {
      toast.error("Failed to reject property");
    }
  };

  // Handle Host's Deletion Request
  const handleDeletion = async (item, action) => {
    try {
      const payload = { action };
      await adminAPI.handlePropertyDeletionRequest(item._id, payload);

      toast.success(`Deletion request ${action}d successfully`);
      loadData();
    } catch (err) {
      toast.error(`Failed to process deletion request`);
    }
  };

  // Admin Direct Hard Delete
  const handleDirectDelete = async (item) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this property? This cannot be undone.",
      )
    )
      return;

    try {
      await adminAPI.deleteProperty(item._id);
      toast.success("Property permanently deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to directly delete property");
    }
  };

  const closeRejectModal = () => {
    setRejectModal({ open: false, item: null, reason: "", isUpdate: false });
  };

  // --- PRICE DISPLAY HELPER ---
  // Handles all three rentalType cases: "nightly", "monthly", "both"
  const renderPriceCell = (item) => {
    const hasNightly =
      item.rentalType === "nightly" ||
      item.rentalType === "short_term" ||
      item.rentalType === "both";
    const hasMonthly =
      item.rentalType === "monthly" ||
      item.rentalType === "long_term" ||
      item.rentalType === "both";

    return (
      <div className="space-y-1">
        {/* Only show if price > 0 to avoid showing 0 BDT */}
        {hasNightly && item.pricePerNight > 0 && (
          <div className="font-bold text-gray-900">
            {formatCurrency(item.pricePerNight)}
            <span className="text-xs text-gray-400 font-normal"> /night</span>
          </div>
        )}
        {hasMonthly && item.pricePerMonth > 0 && (
          <div className="font-bold text-gray-900">
            {formatCurrency(item.pricePerMonth)}
            <span className="text-xs text-gray-400 font-normal"> /mo</span>
          </div>
        )}
        {/* If everything is 0 or N/A, show a dash */}
        {(!hasNightly || item.pricePerNight === 0) &&
          (!hasMonthly || item.pricePerMonth === 0) && (
            <span className="text-gray-400">—</span>
          )}
      </div>
    );
  };

  // --- MODAL PRICE CARDS HELPER ---
  // Renders 1 or 2 price cards depending on rentalType
  const renderModalPriceCards = (item) => {
    const hasNightly = ["nightly", "short_term", "both"].includes(
      item.rentalType,
    );
    const hasMonthly = ["monthly", "long_term", "both"].includes(
      item.rentalType,
    );

    return (
      <>
        {hasNightly && item.pricePerNight > 0 && (
          <div className="p-3 bg-gray-50 rounded-xl border">
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Per Night
            </label>
            <p className="font-bold text-lg text-gray-900">
              {formatCurrency(item.pricePerNight)}
            </p>
          </div>
        )}

        {hasMonthly && item.pricePerMonth > 0 && (
          <div className="p-3 bg-gray-50 rounded-xl border">
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Per Month
            </label>
            <p className="font-bold text-lg text-gray-900">
              {formatCurrency(item.pricePerMonth)}
            </p>
          </div>
        )}
        {(!hasNightly || item.pricePerNight === 0) &&
          (!hasMonthly || item.pricePerMonth === 0) && (
            <div className="p-3 bg-gray-50 rounded-xl border col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">
                Price
              </label>
              <p className="font-bold text-lg text-gray-400">N/A</p>
            </div>
          )}
      </>
    );
  };

  return (
    <div className="p-10 space-y-6">
      <div>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition mb-2 group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <p className="text-gray-500 text-sm">
          {total} items found in {status.replace("-", " ")}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["pending", "approved", "rejected", "deletion-requests"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize
              ${status === s ? "bg-primary-500 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100"}`}
          >
            {s.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100">
        <div
          className={`overflow-x-auto transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          {items.length === 0 && loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No {status.replace("-", " ")} properties found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    "Listing",
                    "Host",
                    "Location",
                    "Price",
                    "Type",
                    "Submitted",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedItems.map((item) => {
                  const img = item.images?.[0]?.url || item.images?.[0] || "";

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border shadow-sm flex items-center justify-center relative">
                            {img ? (
                              <img
                                src={img}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FiHome className="text-gray-300" size={20} />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
                          </div>
                          <div>
                            <p
                              className="font-semibold text-gray-900 max-w-[160px] truncate"
                              title={item.title}
                            >
                              {item.title}
                            </p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white bg-blue-500">
                                {item.itemType}
                              </span>
                              {item.hasPendingChanges &&
                                !item.deletionRequested && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-yellow-100 text-yellow-700 border border-yellow-200">
                                    Pending Changes
                                  </span>
                                )}
                              {item.deletionRequested && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-700 border border-red-200">
                                  Deletion Requested
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">
                          {item.host?.name || "Unknown"}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {item.host?.email || "No email"}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-xs">
                        {[item.location?.city, item.location?.district]
                          .filter(Boolean)
                          .join(", ") || "N/A"}
                      </td>

                      {/* ✅ Dynamic Price Cell */}
                      <td className="py-4 px-4">{renderPriceCell(item)}</td>

                      <td className="py-4 px-4">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md capitalize">
                          {item.propertyType || "Property"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              console.log("Reviewing Item:", item);
                              setReviewModal({ open: true, item });
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Detailed Review"
                          >
                            <FiEye size={15} />
                          </button>

                          {/* Action Buttons for Normal Items */}
                          {!item.deletionRequested && (
                            <>
                              {(status === "pending" ||
                                item.hasPendingChanges) && (
                                <>
                                  <button
                                    onClick={() =>
                                      approve(item, item.hasPendingChanges)
                                    }
                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                    title="Approve"
                                  >
                                    <FiCheck size={15} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setRejectModal({
                                        open: true,
                                        item: item,
                                        reason: "",
                                        isUpdate:
                                          item.hasPendingChanges || false,
                                      })
                                    }
                                    className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                                    title="Reject Changes"
                                  >
                                    <FiX size={15} />
                                  </button>
                                </>
                              )}
                              {/* Direct Delete Button for Admins */}
                              <button
                                onClick={() => handleDirectDelete(item)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Delete Permanently"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </>
                          )}

                          {/* Action Buttons specifically for Deletion Requests */}
                          {item.deletionRequested &&
                            status === "deletion-requests" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleDeletion(item, "approve")
                                  }
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                  title="Approve Permanent Deletion"
                                >
                                  <FiTrash2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeletion(item, "reject")}
                                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                  title="Reject Deletion (Keep Active)"
                                >
                                  <FiX size={15} />
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500 font-medium">
              Page {page} of {Math.ceil(total / LIMIT)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              Reject{" "}
              {rejectModal.isUpdate ? "Changes" : rejectModal.item?.itemType}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason so the host knows what to fix.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((p) => ({ ...p, reason: e.target.value }))
              }
              placeholder="e.g., Description lacks detail..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none mb-6"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={closeRejectModal}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && reviewModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {reviewModal.item.title}
                  </h2>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider text-white bg-blue-500">
                    {reviewModal.item.itemType}
                  </span>
                  {reviewModal.item.deletionRequested && (
                    <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider text-white bg-red-500">
                      Deletion Requested
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">
                  Status:{" "}
                  <span className="text-primary-600 font-bold">
                    {reviewModal.item.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setReviewModal({ open: false, item: null })}
                className="p-2 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Current Info Column */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase border-b pb-2">
                    {reviewModal.item.hasPendingChanges
                      ? "Current Live Version"
                      : "Listing Details"}
                  </h3>

                  {/* Images */}
                  <div className="grid grid-cols-2 gap-2">
                    {reviewModal.item.images?.map((img, i) => (
                      <img
                        key={i}
                        src={img.url || img}
                        className="w-full h-32 object-cover rounded-xl border shadow-sm"
                        alt="Listing"
                      />
                    ))}
                    {!reviewModal.item.images?.length && (
                      <div className="col-span-2 h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                        No Images Provided
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400">
                        Description
                      </label>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border mt-1">
                        {reviewModal.item.description ||
                          "No description provided."}
                      </p>
                    </div>

                    {/* ✅ Dynamic Price Cards in Modal */}
                    <div className="grid grid-cols-2 gap-4">
                      {renderModalPriceCards(reviewModal.item)}
                      <div className="p-3 bg-gray-50 rounded-xl border">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Property Type
                        </label>
                        <p className="font-bold text-gray-700 capitalize line-clamp-2">
                          {reviewModal.item.propertyType || "Property"}
                        </p>
                      </div>
                      {/* Rental Type Badge */}
                      <div className="p-3 bg-gray-50 rounded-xl border">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Rental Type
                        </label>
                        <p className="font-bold text-gray-700 capitalize">
                          {reviewModal.item.rentalType || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Pending Changes OR Host Info */}
                {reviewModal.item.hasPendingChanges &&
                !reviewModal.item.deletionRequested ? (
                  <div className="space-y-6 bg-yellow-50 p-6 rounded-2xl border border-yellow-200 shadow-inner">
                    <h3 className="text-sm font-bold text-yellow-700 uppercase border-b border-yellow-200 pb-2">
                      Proposed Changes
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(
                        reviewModal.item.pendingChanges || {},
                      ).map(([key, value]) => {
                        if (key === "_id" || !value) return null;
                        const displayValue =
                          typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value);
                        return (
                          <div key={key}>
                            <label className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </label>
                            <div className="mt-1 p-3 bg-white border border-yellow-200 rounded-xl shadow-sm">
                              <p className="text-sm font-semibold text-gray-900 break-words">
                                {displayValue}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase border-b pb-2">
                      Host & Location
                    </h3>
                    <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center font-bold text-primary-600 text-xl shadow-sm border border-primary-100">
                        {(reviewModal.item.host?.name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {reviewModal.item.host?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {reviewModal.item.host?.email}
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-2">
                        📍 Location
                      </p>
                      <p className="text-sm text-blue-900 font-medium">
                        {[
                          reviewModal.item.location?.city,
                          reviewModal.item.location?.district,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No location provided"}
                      </p>
                    </div>

                    {/* Deletion Context inside Modal if relevant */}
                    {reviewModal.item.deletionRequested && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <h4 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-1">
                          <FiTrash2 /> Deletion Requested
                        </h4>
                        <p className="text-xs text-red-600">
                          The host has requested to permanently remove this
                          listing. You can approve this action to completely
                          delete it from the system, or reject to keep it
                          active.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Footer */}
            {(status === "pending" || reviewModal.item.hasPendingChanges) &&
              !reviewModal.item.deletionRequested && (
                <div className="p-6 border-t bg-gray-50 flex gap-4">
                  <button
                    onClick={() => {
                      setRejectModal({
                        open: true,
                        item: reviewModal.item,
                        reason: "",
                        isUpdate: reviewModal.item.hasPendingChanges,
                      });
                      setReviewModal({ open: false, item: null });
                    }}
                    className="flex-1 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 flex items-center justify-center gap-2"
                  >
                    <FiX size={18} /> Reject
                  </button>
                  <button
                    onClick={() => {
                      approve(
                        reviewModal.item,
                        reviewModal.item.hasPendingChanges,
                      );
                      setReviewModal({ open: false, item: null });
                    }}
                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <FiCheck size={18} /> Approve{" "}
                    {reviewModal.item.hasPendingChanges ? "Changes" : "Listing"}
                  </button>
                </div>
              )}

            {/* Deletion Specific Actions in Modal */}
            {reviewModal.item.deletionRequested && (
              <div className="p-6 border-t bg-gray-50 flex gap-4">
                <button
                  onClick={() => {
                    handleDeletion(reviewModal.item, "reject");
                    setReviewModal({ open: false, item: null });
                  }}
                  className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2"
                >
                  <FiX size={18} /> Reject Deletion
                </button>
                <button
                  onClick={() => {
                    handleDeletion(reviewModal.item, "approve");
                    setReviewModal({ open: false, item: null });
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <FiTrash2 size={18} /> Approve Permanent Deletion
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
