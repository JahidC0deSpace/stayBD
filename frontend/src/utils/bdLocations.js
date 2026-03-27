export const ROLE_OPTIONS = [
  { value: "guest", label: "👤 Guest", desc: "Book properties & services" },
  {
    value: "host",
    label: "🏠 Property Host",
    desc: "List your property for rent",
  },
  {
    value: "service_provider",
    label: "🔧 Service Provider",
    desc: "Offer local services",
  },
];

export const DIVISIONS = [
  "Dhaka",
  "Chittagong",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export const DISTRICTS_BY_DIVISION = {
  Dhaka: [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  Chittagong: [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cox's Bazar",
    "Cumilla",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  Rajshahi: [
    "Bogura",
    "Chapai Nawabganj",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Nawabganj",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  Khulna: [
    "Bagerhat",
    "Chuadanga",
    "Jessore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
    "Jashore",
  ],
  Barisal: [
    "Barguna",
    "Barishal",
    "Bhola",
    "Jhalokati",
    "Patuakhali",
    "Pirojpur",
  ],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};

// ✅ Flat list of all 64 districts (for dropdowns, search, filters)
export const ALL_DISTRICTS = Object.values(DISTRICTS_BY_DIVISION).flat();

// ── Property Types ───────────────────────────────────────────────────────
export const PROPERTY_TYPES = [
  { value: "apartment", label: "🏢 Apartment" },
  { value: "house", label: "🏠 House" },
  { value: "villa", label: "🏡 Villa" },
  { value: "studio", label: "🎨 Studio" },
  { value: "guesthouse", label: "🏨 Guesthouse" },
  { value: "resort", label: "🏖️ Resort" },
  { value: "hostel", label: "🏩 Hostel" },
  { value: "cottage", label: "🌿 Cottage" },
  { value: "farmhouse", label: "🚜 Farmhouse" },
  { value: "other", label: "🏗 Other" },
];

// ✅ FIXED (FIX 10): Rental types — match backend enum values
export const RENTAL_TYPES = [
  { value: "short_term", label: "Short-Term (Per Night)" },
  { value: "long_term", label: "Long-Term (Per Month)" },
  { value: "both", label: "Both" },
];

// ── Service Categories ───────────────────────────────────────────────────
export const SERVICE_CATEGORIES = [
  { value: "cleaning", label: "🧹 Cleaning" },
  { value: "cooking", label: "🍳 Cooking" },
  { value: "plumbing", label: "🔧 Plumbing" },
  { value: "electrical", label: "⚡ Electrical" },
  { value: "painting", label: "🎨 Painting" },
  { value: "carpentry", label: "🪚 Carpentry" },
  { value: "ac_repair", label: "❄️ AC Repair" },
  { value: "laundry", label: "👕 Laundry" },
  { value: "babysitting", label: "👶 Babysitting" },
  { value: "elder_care", label: "👵 Elder Care" },
  { value: "tutoring", label: "📚 Tutoring" },
  { value: "photography", label: "📸 Photography" },
  { value: "catering", label: "🍽️ Catering" },
  { value: "security", label: "🔒 Security" },
  { value: "gardening", label: "🌱 Gardening" },
  { value: "moving", label: "📦 Moving" },
  { value: "pest_control", label: "🦟 Pest Control" },
  { value: "beauty", label: "💄 Beauty" },
  { value: "fitness", label: "🏋️ Fitness" },
  { value: "driver", label: "🚗 Driver" },
  { value: "other", label: "✨ Other" },
];

//------------Days-------
export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
// ── Experience Categories ────────────────────────────────────────────────
export const EXPERIENCE_CATEGORIES = [
  { value: "food_tour", label: "🍜 Food Tour" },
  { value: "cultural_tour", label: "🎭 Cultural Tour" },
  { value: "adventure_sports", label: "🏕️ Adventure & Sports" },
  { value: "photography_tour", label: "📸 Photography" },
  { value: "historical_tour", label: "🏛️ History" },
  { value: "nature_hike", label: "🌿 Nature Hike" },
  { value: "craft_workshop", label: "🎨 Crafts Workshop" },
  { value: "cooking_class", label: "👨‍🍳 Cooking Class" },
  { value: "music_lesson", label: "🎵 Music Lesson" },
  { value: "boat_trip", label: "⛵ Boat Trip" },
  { value: "art_class", label: "🖌️ Art Class" },
  { value: "wellness", label: "🧘‍♀️ Wellness" },
  { value: "language_exchange", label: "🗣️ Language Exchange" },
  { value: "farming_tour", label: "🌾 Farming Tour" },
  { value: "village_tour", label: "🏘️ Village Tour" },
  { value: "other", label: "✨ Other" },
];

// ── Common Amenities ─────────────────────────────────────────────────────
export const AMENITIES = [
  { value: "wifi", label: "📶 WiFi" },
  { value: "ac", label: "❄️ Air Conditioning" },
  { value: "parking", label: "🅿️ Parking" },
  { value: "kitchen", label: "🍳 Kitchen" },
  { value: "tv", label: "📺 TV" },
  { value: "washing_machine", label: "🫧 Washing Machine" },
  { value: "generator", label: "⚡ Generator" },
  { value: "security", label: "🔒 Security Guard" },
  { value: "elevator", label: "🛗 Elevator" },
  { value: "gym", label: "🏋️ Gym" },
  { value: "pool", label: "🏊 Swimming Pool" },
  { value: "rooftop", label: "🌇 Rooftop Access" },
  { value: "gas", label: "🔥 Gas Supply" },
  { value: "water_heater", label: "🚿 Water Heater" },
  { value: "balcony", label: "🏠 Balcony" },
  { value: "garden", label: "🌻 Garden" },
];

// ── Booking & Payment Status Maps (metadata) ─────────────────────────────
export const BOOKING_STATUSES = {
  pending: { label: "Pending", color: "yellow" },
  confirmed: { label: "Confirmed", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
  completed: { label: "Completed", color: "blue" },
};

export const PAYMENT_STATUSES = {
  unpaid: { label: "Unpaid", color: "gray" },
  paid: { label: "Paid", color: "green" },
  refunded: { label: "Refunded", color: "blue" },
  failed: { label: "Failed", color: "red" },
};

// ── UI Constants: Tailwind Color Classes (moved from constants.js) ───────
export const BOOKING_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  early_checkout: "bg-orange-100 text-orange-700",
};

export const PAYMENT_STATUS_COLORS = {
  unpaid: "bg-gray-100 text-gray-600",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
};

// ── User Roles (moved from constants.js) ─────────────────────────────────
export const ROLES = {
  GUEST: "guest",
  HOST: "host",
  SERVICE_PROVIDER: "service_provider",
  ADMIN: "admin",
};

// ── API Base URL (moved from constants.js) ───────────────────────────────
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Formatting Helpers (moved from constants.js) ─────────────────────────
/**
 * Format amount as Bangladeshi Taka (৳)
 * @param {number|string} amount
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) =>
  `৳${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

/**
 * Format date as "15 Mar 2024"
 * @param {string|Date} date
 * @returns {string} Formatted date string
 */
export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Format datetime as "Mar 15, 2024, 2:30 PM"
 * @param {string|Date} date
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
