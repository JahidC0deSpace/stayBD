import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api"; // Or hostAPI if you moved it there
import toast from "react-hot-toast";
import { FiArrowLeft, FiUploadCloud, FiX } from "react-icons/fi";
import {
  DIVISIONS,
  DISTRICTS_BY_DIVISION,
  PROPERTY_TYPES,
  RENTAL_TYPES, // Make sure these have values like "short_term", "long_term", "both"
  AMENITIES,
} from "../../utils/bdLocations";

const STEPS = ["Basic Info", "Location", "Pricing", "Photos", "Amenities"];

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. Aligned state exactly with the backend propertySchema
  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "apartment",
    rentalType: "short_term",
    guestCapacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    location: {
      division: "",
      district: "",
      area: "",
      fullAddress: "",
      lat: "",
      lng: "",
    },
    pricePerNight: "",
    pricePerMonth: "",
    cleaningFee: "",
    securityDeposit: "",
    amenities: [],
    rules: "",
  });

  // 2. State for actual file uploads
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const setLoc = (field, value) =>
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));

  const districts = form.location.division
    ? DISTRICTS_BY_DIVISION[form.location.division] || []
    : [];

  const toggleAmenity = (val) => {
    set(
      "amenities",
      form.amenities.includes(val)
        ? form.amenities.filter((a) => a !== val)
        : [...form.amenities, val],
    );
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 20) {
      return toast.error("Maximum 20 images allowed");
    }
    setImageFiles((prev) => [...prev, ...files]);

    // Create local preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.location.district) {
      toast.error("Please fill required fields: title and district");
      return;
    }
    if (form.rentalType !== "long_term" && !form.pricePerNight) {
      toast.error("Nightly price is required for short-term rentals");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Format payload for createProperty controller
      const payload = {
        ...form,
        pricePerNight: Number(form.pricePerNight) || 0,
        pricePerMonth: Number(form.pricePerMonth) || 0,
        cleaningFee: Number(form.cleaningFee) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        guestCapacity: Number(form.guestCapacity),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        beds: Number(form.beds),
        houseRules: { additionalRules: form.rules }, // Wrapped to match schema
        amenities: form.amenities.map((name) => ({ name })), // Backend expects array of objects or strings
        location: {
          ...form.location,
          coordinates:
            form.location.lat && form.location.lng
              ? [Number(form.location.lng), Number(form.location.lat)]
              : [90.4125, 23.8103], // Default to Dhaka if empty
        },
      };

      // Step 2: Create the Property Document
      const res = await api.post("/properties", payload);
      const newPropertyId = res.data.data.property._id;

      // Step 3: Upload Images if any exist
      if (imageFiles.length > 0) {
        toast.success("Property created! Uploading images...");
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append("images", file)); // "images" matches Multer field

        await api.post(`/properties/${newPropertyId}/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success("Listing submitted for admin approval!");
      navigate("/host/listings");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.title && form.description;
    if (step === 1) return form.location.district && form.location.area;
    if (step === 2) {
      if (form.rentalType === "short_term") return form.pricePerNight;
      if (form.rentalType === "long_term") return form.pricePerMonth;
      return form.pricePerNight && form.pricePerMonth;
    }
    return true;
  };

  const stepContent = [
    /* Step 0: Basic Info */
    <div key="0" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Property Title *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Cozy Studio in Gulshan"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Describe your property..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Type
          </label>
          <select
            value={form.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rental Type
          </label>
          <select
            value={form.rentalType}
            onChange={(e) => set("rentalType", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          >
            <option value="short_term">Short Term (Nightly)</option>
            <option value="long_term">Long Term (Monthly)</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Guests", field: "guestCapacity" },
          { label: "Bedrooms", field: "bedrooms" },
          { label: "Beds", field: "beds" },
          { label: "Bathrooms", field: "bathrooms" },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              type="number"
              min={1}
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        ))}
      </div>
    </div>,

    /* Step 1: Location */
    <div key="1" className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Division *
          </label>
          <select
            value={form.location.division}
            onChange={(e) => setLoc("division", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          >
            <option value="">Select Division</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District *
          </label>
          <select
            value={form.location.district}
            onChange={(e) => setLoc("district", e.target.value)}
            disabled={!form.location.division}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white disabled:opacity-50"
          >
            <option value="">Select District</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Area / Thana *
        </label>
        <input
          type="text"
          value={form.location.area}
          onChange={(e) => setLoc("area", e.target.value)}
          placeholder="e.g. Dhanmondi, Gulshan"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Address
        </label>
        <textarea
          value={form.location.fullAddress}
          onChange={(e) => setLoc("fullAddress", e.target.value)}
          rows={2}
          placeholder="House/flat, road, landmark"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude (Optional)
          </label>
          <input
            type="text"
            value={form.location.lat}
            onChange={(e) => setLoc("lat", e.target.value)}
            placeholder="23.8103"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude (Optional)
          </label>
          <input
            type="text"
            value={form.location.lng}
            onChange={(e) => setLoc("lng", e.target.value)}
            placeholder="90.4125"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
          />
        </div>
      </div>
    </div>,

    /* Step 2: Pricing */
    <div key="2" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(form.rentalType === "short_term" || form.rentalType === "both") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nightly Price (BDT) *
            </label>
            <input
              type="number"
              min={0}
              value={form.pricePerNight}
              onChange={(e) => set("pricePerNight", e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
          </div>
        )}
        {(form.rentalType === "long_term" || form.rentalType === "both") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Price (BDT) *
            </label>
            <input
              type="number"
              min={0}
              value={form.pricePerMonth}
              onChange={(e) => set("pricePerMonth", e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cleaning Fee (BDT)
          </label>
          <input
            type="number"
            min={0}
            value={form.cleaningFee}
            onChange={(e) => set("cleaningFee", e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Security Deposit (BDT)
          </label>
          <input
            type="number"
            min={0}
            value={form.securityDeposit}
            onChange={(e) => set("securityDeposit", e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
          />
        </div>
      </div>
    </div>,

    /* Step 3: Photos (Updated for Real File Uploads) */
    <div key="3" className="space-y-4">
      <div className="border-2 border-dashed border-emerald-500 bg-emerald-50 rounded-2xl p-8 text-center relative hover:bg-emerald-100 transition">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <FiUploadCloud className="mx-auto text-4xl text-emerald-600 mb-3" />
        <p className="text-emerald-800 font-medium">
          Click or drag images here to upload
        </p>
        <p className="text-sm text-emerald-600 mt-1">
          Maximum 20 images. High quality recommended.
        </p>
      </div>

      {imagePreviews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
          {imagePreviews.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-xl overflow-hidden group border shadow-sm"
            >
              <img
                src={url}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>,

    /* Step 4: Amenities */
    <div key="4" className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Select available amenities
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AMENITIES.map((a) => (
            <label
              key={a.value}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                form.amenities.includes(a.value)
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-gray-200 hover:border-emerald-300"
              }`}
            >
              <input
                type="checkbox"
                checked={form.amenities.includes(a.value)}
                onChange={() => toggleAmenity(a.value)}
                className="sr-only"
              />
              <span className="text-lg">{a.label.split(" ")[0]}</span>
              <span className="text-sm font-semibold">
                {a.label.split(" ").slice(1).join(" ")}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          House Rules (Optional)
        </label>
        <textarea
          value={form.rules}
          onChange={(e) => set("rules", e.target.value)}
          rows={3}
          placeholder="No smoking, no pets, quiet hours after 10 PM..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none resize-none"
        />
      </div>
    </div>,
  ];

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-6 pb-20">
      <div>
        <Link
          to="/host/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-emerald-600 transition mb-2 group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </Link>
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">
          Create New Listing
        </h1>
        <p className="text-gray-500 font-medium mt-1">
          Your listing will be reviewed by an admin before going live on the
          platform.
        </p>
      </div>

      {/* Step Progress */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1 text-center">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${i <= step ? "bg-emerald-500" : "bg-gray-200"}`}
            />
            <span
              className={`text-[11px] uppercase tracking-wider mt-2 block font-bold ${i === step ? "text-emerald-700" : "text-gray-400"}`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">{STEPS[step]}</h2>
        {stepContent[step]}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center px-2">
        <button
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="px-6 py-3 font-bold text-gray-500 hover:text-gray-800 disabled:opacity-30 transition"
        >
          ← Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
            className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 transition font-bold"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition font-bold flex items-center gap-2"
          >
            {loading ? "Submitting..." : "🚀 Submit for Approval"}
          </button>
        )}
      </div>
    </div>
  );
}
