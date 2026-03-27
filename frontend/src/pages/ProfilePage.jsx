import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCamera,
  FiArrowLeft,
  FiCreditCard,
  FiMapPin,
  FiShield,
  FiCalendar,
} from "react-icons/fi";
import { userAPI } from "../services/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { DIVISIONS, DISTRICTS_BY_DIVISION } from "../utils/bdLocations";

export default function ProfilePage() {
  const navigate = useNavigate();
  const globalUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState(globalUser);
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    avatar: "",
    bio: "",
    address: {
      division: "",
      district: "",
      area: "",
      fullAddress: "",
    },
  });

  const handleEditClick = () => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      avatar: user?.avatar?.url || user?.avatar || "",
      bio: user?.bio || "",
      address: {
        division: user?.address?.division || "",
        district: user?.address?.district || "",
        area: user?.address?.area || "",
        fullAddress: user?.address?.fullAddress || "",
      },
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    if (name === "division") {
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, division: value, district: "" },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [name]: value },
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("phone", formData.phone);
      data.append("bio", formData.bio);

      // Handle nested address for FormData
      data.append("address[division]", formData.address.division);
      data.append("address[district]", formData.address.district);
      data.append("address[area]", formData.address.area);
      data.append("address[fullAddress]", formData.address.fullAddress);

      // Priority: Send file if selected, otherwise send the text URL
      if (selectedFile) {
        data.append("avatar", selectedFile);
      } else {
        data.append("avatar", formData.avatar);
      }

      const res = await userAPI.updateMe(data);
      setUser(res.data.data);
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user)
    return (
      <div className="py-20 text-center text-emerald-600 font-bold">
        Loading...
      </div>
    );

  // Logical priority for display: Preview > Form Link > User Avatar
  const currentAvatar =
    previewUrl ||
    (isEditing ? formData.avatar : user?.avatar?.url || user?.avatar);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-10 space-y-8">
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        <h1 className="text-3xl font-extrabold text-gray-900">My Profile</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10 flex flex-col md:flex-row gap-10">
        {/* Left: Avatar & Role */}
        <div className="flex flex-col items-center gap-5 w-full md:w-auto shrink-0">
          <div
            onClick={() => isEditing && fileInputRef.current.click()}
            className={`relative w-36 h-36 rounded-full bg-emerald-50 border-4 border-white shadow-lg overflow-hidden group ${isEditing ? "cursor-pointer" : ""}`}
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <FiUser className="m-auto text-5xl text-emerald-200 mt-10" />
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <FiCamera className="text-white text-2xl" />
                <span className="text-white text-[10px] font-bold mt-1">
                  Change Photo
                </span>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-col gap-2 items-center">
            <span className="px-4 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-widest border border-emerald-100">
              {user.role}
            </span>
            {user.isVerified && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                <FiShield /> Verified
              </span>
            )}
          </div>
        </div>

        {/* Right: Info Area */}
        <div className="flex-1 w-full">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user.name}
                  </h2>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                    <FiCalendar /> Member since{" "}
                    {new Date(user.createdAt).getFullYear()}
                  </p>
                </div>
                <button
                  onClick={handleEditClick}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
                >
                  Edit Profile
                </button>
              </div>

              {user.bio && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase">
                    About Me
                  </h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed">
                    {user.bio}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <InfoRow icon={<FiMail />} label="Email" value={user.email} />
                <InfoRow
                  icon={<FiPhone />}
                  label="Phone"
                  value={user.phone || "Not set"}
                />
                <InfoRow
                  icon={<FiCreditCard className="text-indigo-500" />}
                  label="National ID"
                  value={
                    user.nationalIdNumber
                      ? `•••• ${user.nationalIdNumber.slice(-4)}`
                      : "Not provided"
                  }
                />
                <InfoRow
                  icon={<FiMapPin className="text-orange-500" />}
                  label="Location"
                  value={user.address?.fullAddress || "No address added"}
                  sub={
                    user.address?.district
                      ? `${user.address.area}, ${user.address.district}`
                      : null
                  }
                />
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-5"
              encType="multipart/form-data"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Avatar URL (Optional if uploading)"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleChange}
                    placeholder={
                      selectedFile
                        ? "File selected..."
                        : "Paste image link here"
                    }
                    disabled={!!selectedFile}
                  />
                  {selectedFile && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                      Using uploaded file: {selectedFile.name}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-gray-700 mb-1 block">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border rounded-xl h-24 text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase">
                  Address Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Division
                    </label>
                    <select
                      name="division"
                      value={formData.address.division}
                      onChange={handleAddressChange}
                      className="p-3 bg-gray-50 border rounded-xl text-sm"
                    >
                      <option value="">Select Division</option>
                      {DIVISIONS.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      District
                    </label>
                    <select
                      name="district"
                      value={formData.address.district}
                      onChange={handleAddressChange}
                      disabled={!formData.address.division}
                      className="p-3 bg-gray-50 border rounded-xl text-sm disabled:opacity-50"
                    >
                      <option value="">Select District</option>
                      {formData.address.division &&
                        DISTRICTS_BY_DIVISION[formData.address.division]?.map(
                          (dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ),
                        )}
                    </select>
                  </div>
                </div>
                <Input
                  label="Area / Neighborhood"
                  name="area"
                  value={formData.address.area}
                  onChange={handleAddressChange}
                />
                <Input
                  label="Full Address (Street/House)"
                  name="fullAddress"
                  value={formData.address.fullAddress}
                  onChange={handleAddressChange}
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:bg-gray-400"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const InfoRow = ({ icon, label, value, sub }) => (
  <div className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
    <input
      {...props}
      className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition"
    />
  </div>
);
