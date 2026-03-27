// src/pages/admin/AdminUsersPage.jsx
import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiSearch, FiEdit2, FiX, FiArrowLeft } from "react-icons/fi";
import { formatDate } from "../../utils/bdLocations";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    nationalIdNumber: "",
    role: "guest",
    isVerified: false,
    isApproved: false,
    isBanned: false,
  });

  // ✅ Read ?edit=<id> from URL to auto-open modal
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, verifiedFilter]);

  // ✅ Once users are loaded, check if we need to auto-open a specific user
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && users.length > 0) {
      const target = users.find((u) => u._id === editId);
      if (target) openEditModal(target);
    }
  }, [users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({
        page,
        limit: LIMIT,
        role: roleFilter || undefined,
        isVerified: verifiedFilter !== "" ? verifiedFilter : undefined,
        search: search || undefined,
      });

      const userData = res.data?.data?.users || [];
      const totalCount = res.data?.data?.total || userData.length || 0;

      setUsers(userData);
      setTotal(totalCount);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      nationalIdNumber: user.nationalIdNumber || "",
      role: user.role || "guest",
      isVerified: user.isVerified || false,
      isApproved: user.isApproved || false,
      isBanned: user.isBanned || false,
    });
    setIsEditModalOpen(true);
  };

  const handleGlobalUpdate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateUser(selectedUser._id, editForm);
      toast.success(`User ${editForm.name} updated successfully!`);
      setIsEditModalOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition mb-2 group"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">{total} total users found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={search}
            placeholder="Search name, email, or NID..."
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers()}
            className="input-field pl-10 py-2 text-sm w-full"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="input-field py-2 text-sm w-40"
        >
          <option value="">All Roles</option>
          <option value="guest">Guest</option>
          <option value="host">Host</option>
          <option value="service_provider">Provider</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={verifiedFilter}
          onChange={(e) => {
            setVerifiedFilter(e.target.value);
            setPage(1);
          }}
          className="input-field py-2 text-sm w-40"
        >
          <option value="">All Status</option>
          <option value="false">Unverified</option>
          <option value="true">Verified Only</option>
        </select>

        <button onClick={loadUsers} className="btn-primary px-6 py-2 text-sm">
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    "User",
                    "Contact",
                    "Role",
                    "NID",
                    "Status",
                    "Joined",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0 border border-white shadow-sm">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-primary-700 font-bold uppercase">
                                {user.name?.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {user.name}
                            </p>
                            {user.isBanned && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded uppercase font-bold mt-0.5 inline-block">
                                Banned
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 text-gray-600">
                        <div className="truncate max-w-[150px]">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          {user.phone || "No phone"}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span
                          className={`badge ${user.role === "admin" ? "badge-blue" : user.role === "host" ? "badge-orange" : user.role === "service_provider" ? "badge-green" : "badge-gray"}`}
                        >
                          {user.role?.replace("_", " ")}
                        </span>
                      </td>

                      {/* NID */}
                      <td className="py-4 px-4 font-mono text-xs text-gray-500">
                        {user.nationalIdNumber || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 space-y-1">
                        <div>
                          <span
                            className={`badge ${user.isVerified ? "badge-green" : "badge-yellow"}`}
                          >
                            {user.isVerified ? "✓ Verified" : "Pending NID"}
                          </span>
                        </div>
                        {["host", "service_provider"].includes(user.role) && (
                          <div>
                            <span
                              className={`badge ${user.isApproved ? "badge-blue" : "badge-gray"}`}
                            >
                              {user.isApproved
                                ? "✓ Approved"
                                : "Pending Approval"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="py-4 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 bg-gray-50 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-gray-200 hover:border-primary-100"
                          title="Edit User"
                        >
                          <FiEdit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-gray-400">
                      No users found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Edit User:{" "}
                <span className="text-primary-600">{selectedUser.name}</span>
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 transition-colors p-1"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleGlobalUpdate} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left — Personal Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 border-b pb-2">
                    Personal Information
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      className="input-field w-full"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <p className="pl-1 text-xs font-light text-red-400 mb-1">
                      (can't edit email)
                    </p>
                    <input
                      type="email"
                      className="input-field w-full opacity-60 cursor-not-allowed"
                      value={selectedUser.email}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      className="input-field w-full"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      National ID (NID)
                    </label>
                    <input
                      className="input-field w-full font-mono text-sm"
                      value={editForm.nationalIdNumber}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          nationalIdNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Right — System Permissions */}
                <div className="space-y-6">
                  <h3 className="font-bold text-gray-900 border-b pb-2">
                    System Permissions
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Role
                    </label>
                    <select
                      className="input-field w-full"
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm({ ...editForm, role: e.target.value })
                      }
                    >
                      <option value="guest">Guest</option>
                      <option value="host">Host</option>
                      <option value="service_provider">Service Provider</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={editForm.isVerified}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isVerified: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span className="block text-sm font-medium text-gray-900 group-hover:text-green-700">
                          Verified Identity
                        </span>
                        <span className="block text-xs text-gray-500">
                          NID has been checked and confirmed.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={editForm.isApproved}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isApproved: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span className="block text-sm font-medium text-gray-900 group-hover:text-blue-700">
                          Approved for Platform
                        </span>
                        <span className="block text-xs text-gray-500">
                          Allowed to create listings or offer services.
                        </span>
                      </div>
                    </label>

                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          checked={editForm.isBanned}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              isBanned: e.target.checked,
                            })
                          }
                        />
                        <div>
                          <span className="block text-sm font-bold text-red-600 group-hover:text-red-700">
                            Ban Account
                          </span>
                          <span className="block text-xs text-red-400">
                            User will be locked out of the system entirely.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-8 flex gap-3 justify-end border-t mt-8">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-8 py-2.5 shadow-md"
                >
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
