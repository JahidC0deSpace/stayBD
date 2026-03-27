// src/pages/serviceprovider/CreateServicePage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  DIVISIONS,
  DISTRICTS_BY_DIVISION,
  SERVICE_CATEGORIES,
  DAYS,
} from "../../utils/bdLocations";
import { FiArrowLeft, FiPlus, FiTrash2, FiClock } from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_IMAGES = 5;
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TITLE_MIN = 5;
const TITLE_MAX = 100;
const DESC_MIN = 20;
const DESC_MAX = 3000;
const MAX_SLOTS_PER_DAY = 4;

// ─── Build the initial availability object ────────────────────────────────────
// Each day: { available: bool, slots: [{ from: "HH:MM", to: "HH:MM" }] }
const buildInitialAvailability = () =>
  Object.fromEntries(
    DAYS.map((day) => [day, { available: day !== "sunday", slots: [] }]),
  );

// ─── Helpers ──────────────────────────────────────────────────────────────────
const validateImageFiles = (files) => {
  if (files.length > MAX_IMAGES)
    return `You can only upload up to ${MAX_IMAGES} images`;
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type))
      return `"${file.name}" is not a supported format (JPEG, PNG, WebP, GIF only)`;
    if (file.size > MAX_IMAGE_BYTES)
      return `"${file.name}" exceeds the ${MAX_IMAGE_MB} MB limit`;
  }
  return null;
};

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const validateDaySlots = (dayLabel, slots) => {
  for (let i = 0; i < slots.length; i++) {
    const { from, to } = slots[i];
    if (!from || !to)
      return `${dayLabel}: slot ${i + 1} needs both a start and end time`;
    if (toMinutes(from) >= toMinutes(to))
      return `${dayLabel}: slot ${i + 1} — start time must be before end time`;
    for (let j = 0; j < i; j++) {
      if (
        toMinutes(from) < toMinutes(slots[j].to) &&
        toMinutes(to) > toMinutes(slots[j].from)
      )
        return `${dayLabel}: slot ${i + 1} overlaps with slot ${j + 1}`;
    }
  }
  return null;
};

// ─── DaySchedule sub-component ────────────────────────────────────────────────
function DaySchedule({
  day,
  dayData,
  onToggle,
  onAddSlot,
  onRemoveSlot,
  onSlotChange,
}) {
  const label = day.charAt(0).toUpperCase() + day.slice(1);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        dayData.available
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Toggle pill */}
          <button
            type="button"
            onClick={onToggle}
            className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
              dayData.available ? "bg-emerald-500" : "bg-gray-300"
            }`}
            aria-label={`Toggle ${label}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                dayData.available ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium w-24 ${
              dayData.available ? "text-gray-700" : "text-gray-400"
            }`}
          >
            {label}
          </span>
        </div>

        {dayData.available ? (
          <button
            type="button"
            onClick={onAddSlot}
            disabled={dayData.slots.length >= MAX_SLOTS_PER_DAY}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <FiPlus size={13} />
            Add slot
          </button>
        ) : (
          <span className="text-xs text-gray-400">Unavailable</span>
        )}
      </div>

      {/* Slot rows */}
      {dayData.available && dayData.slots.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {dayData.slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <FiClock size={13} className="text-emerald-400 shrink-0" />

              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 sr-only">From</label>
                <input
                  type="time"
                  value={slot.from}
                  onChange={(e) => onSlotChange(i, "from", e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>

              <span className="text-gray-400 text-xs">to</span>

              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 sr-only">To</label>
                <input
                  type="time"
                  value={slot.to}
                  onChange={(e) => onSlotChange(i, "to", e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => onRemoveSlot(i)}
                className="ml-auto text-gray-400 hover:text-red-500 transition"
                aria-label={`Remove slot ${i + 1} for ${label}`}
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty-state hint */}
      {dayData.available && dayData.slots.length === 0 && (
        <p className="px-4 pb-3 text-xs text-emerald-500 opacity-80">
          No slots added — available all day
        </p>
      )}
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function CreateServicePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    hourlyRate: "",
    skills: "",
    location: { division: "", district: "", area: "" },
    availability: buildInitialAvailability(),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const setLoc = (field, value) =>
    setForm((p) => ({ ...p, location: { ...p.location, [field]: value } }));

  const districts = form.location.division
    ? (DISTRICTS_BY_DIVISION[form.location.division] ?? [])
    : [];

  // ── Availability mutations ─────────────────────────────────────────────────
  const toggleDay = (day) =>
    setForm((p) => ({
      ...p,
      availability: {
        ...p.availability,
        [day]: {
          ...p.availability[day],
          available: !p.availability[day].available,
        },
      },
    }));

  const addSlot = (day) =>
    setForm((p) => {
      if (p.availability[day].slots.length >= MAX_SLOTS_PER_DAY) return p;
      return {
        ...p,
        availability: {
          ...p.availability,
          [day]: {
            ...p.availability[day],
            slots: [
              ...p.availability[day].slots,
              { from: "09:00", to: "17:00" },
            ],
          },
        },
      };
    });

  const removeSlot = (day, index) =>
    setForm((p) => ({
      ...p,
      availability: {
        ...p.availability,
        [day]: {
          ...p.availability[day],
          slots: p.availability[day].slots.filter((_, i) => i !== index),
        },
      },
    }));

  const updateSlot = (day, index, field, value) =>
    setForm((p) => ({
      ...p,
      availability: {
        ...p.availability,
        [day]: {
          ...p.availability[day],
          slots: p.availability[day].slots.map((s, i) =>
            i === index ? { ...s, [field]: value } : s,
          ),
        },
      },
    }));

  // ── Image handler ──────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const error = validateImageFiles(files);
    if (error) {
      toast.error(error);
      e.target.value = "";
      return;
    }
    setImageFiles(files);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Presence checks
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.hourlyRate ||
      !form.location.district ||
      !form.category
    ) {
      toast.error(
        "Title, description, category, hourly rate, and district are required",
      );
      return;
    }

    // Length checks
    if (form.title.trim().length < TITLE_MIN) {
      toast.error(`Title must be at least ${TITLE_MIN} characters`);
      return;
    }
    if (form.title.trim().length > TITLE_MAX) {
      toast.error(`Title cannot exceed ${TITLE_MAX} characters`);
      return;
    }
    if (form.description.trim().length < DESC_MIN) {
      toast.error(`Description must be at least ${DESC_MIN} characters`);
      return;
    }
    if (form.description.trim().length > DESC_MAX) {
      toast.error(`Description cannot exceed ${DESC_MAX} characters`);
      return;
    }

    // Rate check
    const parsedRate = Number(form.hourlyRate);
    if (!isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("Hourly rate must be a positive number");
      return;
    }

    // Slot validation
    for (const day of DAYS) {
      const { available, slots } = form.availability[day];
      if (!available) continue;
      const err = validateDaySlots(
        day.charAt(0).toUpperCase() + day.slice(1),
        slots,
      );
      if (err) {
        toast.error(err);
        return;
      }
    }

    setLoading(true);

    try {
      // The availability object is already in the correct schema shape:
      // { monday: { available, slots: [{from, to}] }, … }
      // No conversion needed in the controller.
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        pricePerHour: parsedRate,
        serviceArea: {
          divisions: form.location.division ? [form.location.division] : [],
          districts: form.location.district ? [form.location.district] : [],
          areas: form.location.area.trim() ? [form.location.area.trim()] : [],
        },
        availability: form.availability,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const serviceRes = await api.post("/services", payload);
      const newServiceId = serviceRes.data?.data?._id;

      if (!newServiceId) {
        toast.success("Service submitted. Add images from your dashboard.");
        navigate("/provider/dashboard");
        return;
      }

      // Image upload — isolated so a failure here doesn't mask service creation
      if (imageFiles.length > 0) {
        try {
          const formData = new FormData();
          imageFiles.forEach((f) => formData.append("images", f));
          await api.post(`/services/${newServiceId}/images`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success("Service created and images uploaded!");
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          toast(
            "Service submitted, but image upload failed. Add images from your dashboard.",
            {
              icon: "⚠️",
            },
          );
        }
      } else {
        toast.success("Service submitted for approval!");
      }

      navigate("/provider/dashboard");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.response?.data?.message || "Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const descLength = form.description.length;
  const descLimitColor =
    descLength > DESC_MAX
      ? "text-red-500"
      : descLength > DESC_MAX * 0.9
        ? "text-amber-500"
        : "text-gray-400";

  const activeDaysCount = DAYS.filter(
    (d) => form.availability[d].available,
  ).length;
  const totalSlotsCount = DAYS.reduce(
    (sum, d) => sum + form.availability[d].slots.length,
    0,
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6 animate-fadeIn">
      {/* Header */}
      <div>
        <Link
          to="/provider/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-emerald-600 transition mb-2 group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Create New Service</h1>
        <p className="text-gray-500 text-sm">
          Your service will be reviewed by an admin before going live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Service Details ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">
            Service Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Professional House Cleaning"
              maxLength={TITLE_MAX}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.title.length}/{TITLE_MAX} chars (min {TITLE_MIN})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition"
              >
                <option value="">Select Category</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate (BDT) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  ৳
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.hourlyRate}
                  onChange={(e) => set("hourlyRate", e.target.value)}
                  placeholder="500"
                  required
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe your service in detail..."
              maxLength={DESC_MAX}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition"
            />
            <p className={`text-xs mt-1 text-right ${descLimitColor}`}>
              {descLength}/{DESC_MAX} chars (min {DESC_MIN})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills (comma-separated)
            </label>
            <input
              value={form.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="cleaning, home, professional"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>
        </div>

        {/* ── Service Area ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">
            Service Area
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division
              </label>
              <select
                value={form.location.division}
                onChange={(e) => {
                  setLoc("division", e.target.value);
                  setLoc("district", "");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-emerald-500 transition"
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
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition"
              >
                <option value="">
                  {form.location.division
                    ? "Select District"
                    : "Select a division first"}
                </option>
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
              Area / Thana
            </label>
            <input
              value={form.location.area}
              onChange={(e) => setLoc("area", e.target.value)}
              placeholder="e.g. Dhanmondi"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* ── Availability & Schedule ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-800">
              Availability &amp; Schedule
            </h2>
            <span className="text-xs text-gray-400">
              {activeDaysCount} day{activeDaysCount !== 1 ? "s" : ""} ·{" "}
              {totalSlotsCount} slot{totalSlotsCount !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Toggle days on or off. Click "Add slot" to set specific working
            hours for a day — or leave slots empty to indicate you're available
            all day.
          </p>

          <div className="space-y-2">
            {DAYS.map((day) => (
              <DaySchedule
                key={day}
                day={day}
                dayData={form.availability[day]}
                onToggle={() => toggleDay(day)}
                onAddSlot={() => addSlot(day)}
                onRemoveSlot={(i) => removeSlot(day, i)}
                onSlotChange={(i, field, val) => updateSlot(day, i, field, val)}
              />
            ))}
          </div>
        </div>

        {/* ── Images ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-800 mb-2">
            Service Images (up to {MAX_IMAGES}, max {MAX_IMAGE_MB} MB each)
          </h2>
          <input
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleImageChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition"
          />
          <p className="text-xs text-gray-400">
            JPEG, PNG, WebP, or GIF · max {MAX_IMAGE_MB} MB each
          </p>
          {imageFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Selected ({imageFiles.length}/{MAX_IMAGES}):
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {imageFiles.map((file, i) => (
                  <li key={i}>
                    {file.name}{" "}
                    <span className="text-gray-400">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit Service for Approval"}
        </button>
      </form>
    </div>
  );
}
