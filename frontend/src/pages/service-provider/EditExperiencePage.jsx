import { useState, useEffect } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

// 👇 Importing experienceAPI instead of the base api instance

import { experienceAPI } from "../../services/api";

import toast from "react-hot-toast";

import {
  DIVISIONS,
  DISTRICTS_BY_DIVISION,
  EXPERIENCE_CATEGORIES,
  DAYS,
} from "../../utils/bdLocations";

import { FiArrowLeft } from "react-icons/fi";

export default function EditExperiencePage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [fetching, setFetching] = useState(true);

  const [imageFiles, setImageFiles] = useState([]);

  const [form, setForm] = useState({
    title: "",

    description: "",

    category: "",

    pricePerPerson: "",

    duration: "",

    maxGuests: "",

    availability: [],

    tags: "",

    location: { division: "", district: "", area: "" },
  });

  // Fetch the existing experience data when the page loads

  useEffect(() => {
    const fetchExperience = async () => {
      try {
        // 👇 Using the getById method from experienceAPI

        const res = await experienceAPI.getById(id);

        // Adjust this based on your exact API response structure

        const exp = res.data?.data?.experience || res.data?.experience;

        if (exp) {
          setForm({
            title: exp.title || "",

            description: exp.description || "",

            category: exp.category || "",

            pricePerPerson: exp.pricePerPerson || "",

            duration: exp.durationHours || "",

            maxGuests: exp.maxParticipants || "",

            tags: exp.includes ? exp.includes.join(", ") : "",

            location: {
              division: exp.location?.division || "",

              district: exp.location?.district || "",

              area: exp.location?.area || "",
            },

            // Note: Mapping complex schedules back to basic days can be tricky.

            // If you want to keep it simple, we initialize an empty array or

            // map it if you used standard days in your schedule logic.

            availability: [],
          });
        }
      } catch (error) {
        toast.error("Failed to load experience details");

        console.error("Fetch error:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchExperience();
  }, [id]);

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

  const toggleDay = (day) => {
    set(
      "availability",

      form.availability.includes(day)
        ? form.availability.filter((d) => d !== day)
        : [...form.availability, day],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.title ||
      !form.description ||
      !form.category ||
      !form.pricePerPerson ||
      !form.duration ||
      !form.location.district
    ) {
      toast.error(
        "Title, description, category, price, duration, and location are required",
      );

      return;
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
          ...form.location,

          fullAddress: [
            form.location.area,

            form.location.district,

            form.location.division,
          ]

            .filter(Boolean)

            .join(", "),
        },

        includes: form.tags

          .split(",")

          .map((t) => t.trim())

          .filter(Boolean),
      };

      // Only update the schedule if the user actually selected new days

      if (form.availability.length > 0) {
        payload.schedule = form.availability.map((day) => ({
          date: new Date(),

          startTime: "10:00",

          endTime: "12:00",

          maxParticipants: Number(form.maxGuests),
        }));
      }

      // 1. Update the basic experience details

      // 👇 Using the update method from experienceAPI

      await experienceAPI.update(id, payload);

      // 2. Upload any NEW images selected

      if (imageFiles.length > 0) {
        const formData = new FormData();

        Array.from(imageFiles).forEach((file) => {
          formData.append("images", file);
        });

        // 👇 Using the uploadImages method from experienceAPI

        await experienceAPI.uploadImages(id, formData);
      }

      toast.success("Changes saved! Sent to admin for review.");

      navigate("/provider/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update experience");

      console.error("Backend Error:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <Link
          to="/provider/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-emerald-600 transition mb-2 group"
        >
          <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-800">Edit Experience</h1>

        <p className="text-amber-600 font-medium text-sm mt-1">
          Note: Updating this activity will temporarily hide it until an admin
          approves the changes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">
            Experience Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Experience Title *
            </label>

            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Traditional Bengali Cooking Masterclass"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">Select Category</option>

                {EXPERIENCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (Hours) *
              </label>

              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="e.g. 3"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
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
              placeholder="What will guests do? What makes it special?"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Per Person (BDT) *
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  ৳
                </span>

                <input
                  type="number"
                  min={0}
                  value={form.pricePerPerson}
                  onChange={(e) => set("pricePerPerson", e.target.value)}
                  placeholder="1500"
                  required
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Guests *
              </label>

              <input
                type="number"
                min={1}
                value={form.maxGuests}
                onChange={(e) => set("maxGuests", e.target.value)}
                placeholder="e.g. 10"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Includes (comma-separated)
            </label>

            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="e.g. Lunch, Transportation, Guide"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Location */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">
            Meeting Point / Location
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division
              </label>

              <select
                value={form.location.division}
                onChange={(e) => setLoc("division", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
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
              Area / Specific Address
            </label>

            <input
              value={form.location.area}
              onChange={(e) => setLoc("area", e.target.value)}
              placeholder="e.g. TSC, Dhaka University"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Availability */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Update Available Days (Optional)
          </h2>

          <p className="text-xs text-gray-500 mb-4">
            Leave this blank to keep your current schedule, or select days to
            overwrite it.
          </p>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                  form.availability.includes(day)
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-emerald-300"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Images */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-800 mb-2">
            Add New Images
          </h2>

          <p className="text-xs text-gray-500 mb-2">
            Selecting files here will add them to your existing images.
          </p>

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files);

              if (files.length > 5) {
                toast.error("You can only upload up to 5 new images at a time");

                return;
              }

              setImageFiles(files);
            }}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition"
          />

          {imageFiles.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Selected Files to Add:
              </p>

              <ul className="text-sm text-gray-600 list-disc list-inside">
                {Array.from(imageFiles).map((file, i) => (
                  <li key={i}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition disabled:opacity-50 shadow-md"
        >
          {loading ? "Updating..." : "📝 Update Service (Requires Approval)"}
        </button>
      </form>
    </div>
  );
}
