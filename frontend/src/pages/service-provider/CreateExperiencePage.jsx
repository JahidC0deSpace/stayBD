import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  DIVISIONS,
  DISTRICTS_BY_DIVISION,
  EXPERIENCE_CATEGORIES,
} from "../../utils/bdLocations";
import { FiArrowLeft, FiPlus, FiTrash2, FiInfo } from "react-icons/fi";

export default function CreateExperiencePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);

  // 1. Initial State - matching your Schema + UI helper strings
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    pricePerPerson: "",
    duration: "",
    maxGuests: "10",
    includesInput: "", // Temporary string for UI
    requirementsInput: "", // Temporary string for UI
    location: {
      division: "",
      district: "",
      area: "", // Added area back as it is required
      meetingPoint: "",
    },
  });

  // 2. Schedule Slots State
  const [scheduleSlots, setScheduleSlots] = useState([
    { date: "", startTime: "", endTime: "", maxParticipants: "" },
  ]);

  // Helpers
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

  // Schedule Handlers
  const handleScheduleChange = (index, field, value) => {
    const newSlots = [...scheduleSlots];
    newSlots[index][field] = value;
    setScheduleSlots(newSlots);
  };

  const addSlot = () =>
    setScheduleSlots([
      ...scheduleSlots,
      { date: "", startTime: "", endTime: "", maxParticipants: "" },
    ]);
  const removeSlot = (index) =>
    setScheduleSlots(scheduleSlots.filter((_, i) => i !== index));

  // 3. Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (form.description.length < 50) {
      return toast.error("Description must be at least 50 characters.");
    }
    if (!form.location.area) {
      return toast.error("Area is required.");
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        pricePerPerson: Number(form.pricePerPerson),
        durationHours: Number(form.duration),
        maxParticipants: Number(form.maxGuests),
        location: {
          division: form.location.division,
          district: form.location.district,
          area: form.location.area,
          meetingPoint: form.location.meetingPoint,
          fullAddress: `${form.location.area}, ${form.location.district}, ${form.location.division}`,
        },
        // Transform Comma Strings to Arrays
        includes: form.includesInput
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        requirements: form.requirementsInput
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        // Format Schedule
        schedule: scheduleSlots
          .filter((s) => s.date)
          .map((s) => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            maxParticipants:
              Number(s.maxParticipants) || Number(form.maxGuests),
          })),
      };

      const res = await api.post("/experiences", payload);
      const experienceId = res.data?.data?.experience?._id;

      // Handle Image Upload if files exist
      if (imageFiles.length > 0 && experienceId) {
        const formData = new FormData();
        Array.from(imageFiles).forEach((file) =>
          formData.append("images", file),
        );
        await api.post(`/experiences/${experienceId}/images`, formData);
      }

      toast.success("Experience created successfully!");
      navigate("/provider/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create experience");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 pb-20">
      <header>
        <Link
          to="/provider/dashboard"
          className="text-sm text-gray-500 hover:text-emerald-600 flex items-center mb-2"
        >
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Create an Experience
        </h1>
        <p className="text-gray-500 text-sm">
          Your experience will be reviewed by an admin before going live.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Experience Details */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-lg flex items-center">
            <FiInfo className="mr-2 text-emerald-500" /> General Info
          </h2>
          <div className="grid gap-4">
            <input
              placeholder="Title (e.g. Traditional Pottery Workshop)"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <textarea
              placeholder="Description (Tell guests what makes this special. Min 50 characters)"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
              rows={4}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                required
                className="p-3 border rounded-xl bg-white outline-none"
              >
                <option value="">Category</option>
                {EXPERIENCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Price (BDT)"
                value={form.pricePerPerson}
                onChange={(e) => set("pricePerPerson", e.target.value)}
                required
                className="p-3 border rounded-xl outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="0.5"
                placeholder="Duration (Hours)"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                required
                className="p-3 border rounded-xl outline-none"
              />
              <input
                type="number"
                placeholder="Default Max Guests"
                value={form.maxGuests}
                onChange={(e) => set("maxGuests", e.target.value)}
                required
                className="p-3 border rounded-xl outline-none"
              />
            </div>
          </div>
        </section>

        {/* Schedule Builder */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Availability Schedule</h2>
            <button
              type="button"
              onClick={addSlot}
              className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full hover:bg-emerald-100 transition"
            >
              + Add Date
            </button>
          </div>
          <div className="space-y-3">
            {scheduleSlots.map((slot, i) => (
              <div
                key={i}
                className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-gray-50 p-4 rounded-xl relative"
              >
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] uppercase font-bold text-gray-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) =>
                      handleScheduleChange(i, "date", e.target.value)
                    }
                    required
                    className="w-full p-2 border rounded-lg text-sm outline-none"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="text-[10px] uppercase font-bold text-gray-400">
                    Start
                  </label>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      handleScheduleChange(i, "startTime", e.target.value)
                    }
                    required
                    className="w-full p-2 border rounded-lg text-sm outline-none"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="text-[10px] uppercase font-bold text-gray-400">
                    End
                  </label>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      handleScheduleChange(i, "endTime", e.target.value)
                    }
                    required
                    className="w-full p-2 border rounded-lg text-sm outline-none"
                  />
                </div>
                {scheduleSlots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="text-red-500 p-2 hover:bg-red-50 rounded-lg mt-4 md:mt-0"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Logistics */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-lg">Experience Logistics</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                What's Included? (Separate with commas)
              </label>
              <textarea
                value={form.includesInput}
                onChange={(e) => set("includesInput", e.target.value)}
                placeholder="e.g. Traditional Lunch, Bottled Water, Entry Fees"
                className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Guest Requirements (Separate with commas)
              </label>
              <textarea
                value={form.requirementsInput}
                onChange={(e) => set("requirementsInput", e.target.value)}
                placeholder="e.g. Comfortable shoes, ID Proof, 12+ age"
                className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-lg">Location Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.location.division}
              onChange={(e) => setLoc("division", e.target.value)}
              required
              className="p-3 border rounded-xl bg-white outline-none"
            >
              <option value="">Select Division</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={form.location.district}
              onChange={(e) => setLoc("district", e.target.value)}
              required
              disabled={!form.location.division}
              className="p-3 border rounded-xl bg-white outline-none disabled:bg-gray-50"
            >
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="Area/Neighborhood (e.g. Banani or Old Dhaka)"
            value={form.location.area}
            onChange={(e) => setLoc("area", e.target.value)}
            required
            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            placeholder="Specific Meeting Point (e.g. North Gate of National Museum)"
            value={form.location.meetingPoint}
            onChange={(e) => setLoc("meetingPoint", e.target.value)}
            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </section>

        {/* Images */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-lg">Photos</h2>
          <div className="border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setImageFiles(e.target.files)}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-2">
              Upload up to 5 high-quality photos.
            </p>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 hover:shadow-lg transition transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "🚀 Submit Service for Approval"}
        </button>
      </form>
    </div>
  );
}
