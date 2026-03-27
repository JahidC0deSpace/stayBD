import { Service } from "../models/Service.js";
import { Booking } from "../models/Booking.js"; // Needed for our new bookService function
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse, errorResponse } from "../utils/responseUtils.js";
import sanitizeHtml from "sanitize-html";

const ALL_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// Strip all HTML tags to prevent stored XSS
const sanitizeText = (str) => {
  const sanitized = sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
  return sanitized
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

// Validate and parse a positive finite number
const parsePositiveNumber = (value, fieldName) => {
  const n = Number(value);
  if (!isFinite(n) || n <= 0)
    throw createError(400, `${fieldName} must be a positive number`);
  return n;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normaliseAvailability = (input) => {
  if (!input) return null;

  if (Array.isArray(input)) {
    return ALL_DAYS.reduce((acc, d) => {
      acc[d] = {
        available: input.map((k) => k.toLowerCase()).includes(d),
        slots: [],
      };
      return acc;
    }, {});
  }

  if (typeof input !== "object") return null;

  // Lowercase all keys from the incoming object before processing
  const lowercasedInput = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k.toLowerCase(), v]),
  );

  return ALL_DAYS.reduce((acc, d) => {
    const raw = lowercasedInput[d]; // ✅ now matches correctly
    if (!raw || typeof raw !== "object") {
      acc[d] = { available: false, slots: [] };
      return acc;
    }

    const slots = Array.isArray(raw.slots)
      ? raw.slots
          .filter(
            (s) =>
              s &&
              typeof s.from === "string" &&
              typeof s.to === "string" &&
              TIME_RE.test(s.from.trim()) &&
              TIME_RE.test(s.to.trim()),
          )
          .map((s) => ({ from: s.from.trim(), to: s.to.trim() }))
      : [];

    acc[d] = { available: Boolean(raw.available), slots };
    return acc;
  }, {});
};

const BLOCKED_FIELDS = new Set([
  "status",
  "isApproved",
  "averageRating",
  "totalBookings",
  "totalReviews",
  "pendingChanges",
  "hasPendingChanges",
  "approvedAt",
  "approvedBy",
  "rejectionReason",
  "provider", // ownership must never change
  "deletedAt",
  "deletionRequested",
  "deletionRequestedAt",
]);

// Fields safe to return to the provider (excludes internal admin flags)
const PROVIDER_SAFE_FIELDS =
  "title description category pricePerHour minimumHours currency " +
  "serviceArea images availability skills languages experience " +
  "status hasPendingChanges totalBookings totalReviews averageRating " +
  "isActive createdAt updatedAt";

/**
 * GET /api/services
 * List all approved services (public)
 */
export const getServices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    district,
    category,
    minPrice,
    maxPrice,
    rating,
    search,
  } = req.query;

  const query = { status: "approved", isActive: true, deletedAt: null };

  // Fixed field names to match the model
  if (district) query["serviceArea.districts"] = district;
  if (category) query.category = category;
  if (minPrice || maxPrice) {
    query.pricePerHour = {};
    if (minPrice) query.pricePerHour.$gte = Number(minPrice);
    if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
  }
  if (rating) query.averageRating = { $gte: Number(rating) };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [services, total] = await Promise.all([
    Service.find(query)
      .populate("provider", "name avatar averageRating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Service.countDocuments(query),
  ]);

  return successResponse(res, 200, "Services fetched", {
    services,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

/**
 * GET /api/services/:id
 * Get single service details
 */
export const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, deletedAt: null })
    .populate("provider", "name avatar bio phone")
    .lean();

  if (!service) throw createError(404, "Service not found");

  return successResponse(res, 200, "Service fetched", service);
});

/**
 * POST /api/services
 * Create a new service (service_provider only)
 */
export const createService = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    pricePerHour,
    minimumHours,
    serviceArea,
    availability,
    skills,
    languages,
    experience,
  } = req.body;

  // Required-field presence check
  if (!title || !description || !category || !pricePerHour || !serviceArea) {
    throw createError(
      400,
      "Title, description, category, pricePerHour, and serviceArea are required",
    );
  }

  // Length validation (mirrors schema constraints for early, friendly errors)
  if (title.trim().length < 5)
    throw createError(400, "Title must be at least 5 characters");
  if (description.trim().length < 20)
    throw createError(400, "Description must be at least 20 characters");

  // Sanitize free-text fields
  const safeTitle = sanitizeText(title);
  const safeDescription = sanitizeText(description);
  const safeSkills = Array.isArray(skills)
    ? skills.map(sanitizeText).filter(Boolean)
    : [];
  const safeLanguages = Array.isArray(languages)
    ? languages.map(sanitizeText).filter(Boolean)
    : [];

  // Parse and validate numbers
  const parsedPrice = parsePositiveNumber(pricePerHour, "pricePerHour");
  const parsedMinimumHours = minimumHours
    ? parsePositiveNumber(minimumHours, "minimumHours")
    : 1;

  // Duplicate check — prevents provider from flooding the admin approval queue
  const duplicate = await Service.exists({
    provider: req.user._id,
    title: safeTitle,
    status: { $in: ["pending", "approved"] },
    isActive: true,
  });
  if (duplicate) {
    throw createError(
      409,
      "You already have an active or pending service with this title",
    );
  }

  // Normalise availability
  // Accepts the full { monday: { available, slots: [{from, to}] } } object
  // sent by the updated frontend, or a legacy flat string[] for backwards compatibility.
  const availabilityObj = normaliseAvailability(availability);

  // Create the document
  const service = await Service.create({
    provider: req.user._id,
    title: safeTitle,
    description: safeDescription,
    category,
    pricePerHour: parsedPrice,
    minimumHours: parsedMinimumHours,
    serviceArea,
    images: [],
    availability: availabilityObj,
    skills: safeSkills,
    languages: safeLanguages,
    experience: experience || { years: 0, description: "" },
    status: "pending",
  });

  // Return only the provider-safe projection
  const safeService = await Service.findById(service._id)
    .select(PROVIDER_SAFE_FIELDS)
    .lean();

  return successResponse(
    res,
    201,
    "Service created and pending admin approval",
    safeService,
  );
});

/**
 * PUT /api/services/:id
 * Update service
 */
export const updateService = asyncHandler(async (req, res) => {
  // ── 1. Fetch and guard ───────────────────────────────────────────────────
  const service = await Service.findById(req.params.id);
  if (!service || service.deletedAt)
    throw createError(404, "Service not found");

  const isOwner = service.provider.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin)
    throw createError(403, "Not authorized to update this service");

  // ── 2. Strip blocked fields from the incoming body ───────────────────────
  const raw = req.body;
  const updates = {};
  for (const key of Object.keys(raw)) {
    if (!BLOCKED_FIELDS.has(key)) updates[key] = raw[key];
  }
  // ── 3. Sanitize and validate free-text fields ────────────────────────────
  if (updates.title !== undefined) {
    updates.title = sanitizeText(updates.title);
    if (updates.title.length < 5)
      throw createError(400, "Title must be at least 5 characters");
    if (updates.title.length > 100)
      throw createError(400, "Title cannot exceed 100 characters");
  }

  if (updates.description !== undefined) {
    updates.description = sanitizeText(updates.description);
    if (updates.description.length < 20)
      throw createError(400, "Description must be at least 20 characters");
    if (updates.description.length > 3000)
      throw createError(400, "Description cannot exceed 3000 characters");
  }

  if (updates.pricePerHour !== undefined) {
    updates.pricePerHour = parsePositiveNumber(
      updates.pricePerHour,
      "pricePerHour",
    );
  }

  if (updates.minimumHours !== undefined) {
    updates.minimumHours = parsePositiveNumber(
      updates.minimumHours,
      "minimumHours",
    );
  }

  if (Array.isArray(updates.skills)) {
    updates.skills = updates.skills.map(sanitizeText).filter(Boolean);
  }

  if (Array.isArray(updates.languages)) {
    updates.languages = updates.languages.map(sanitizeText).filter(Boolean);
  }

  // ── 4. Normalise availability ────────────────────────────────────────────
  if (updates.availability !== undefined) {
    const normalised = normaliseAvailability(updates.availability);
    if (normalised !== null) {
      updates.availability = normalised;
    } else {
      delete updates.availability; // clean removal, won't be stored in pendingChanges
    }
  }

  // ── 5. Apply the update ──────────────────────────────────────────────────
  if (isAdmin) {
    // Admin: overwrite live data immediately and clear any pending review
    Object.assign(service, updates);
    service.hasPendingChanges = false;
    service.pendingChanges = null;
    service.markModified("pendingChanges");
  } else {
    // Provider: stash changes for admin review, keep live data intact

    service.setPendingChanges(updates);
  }

  await service.save();

  // ── 6. Return the safe projection ───────────────────────────────────────
  const safeService = await Service.findById(service._id)
    .select(PROVIDER_SAFE_FIELDS)
    .lean();

  const message = isAdmin
    ? "Service updated successfully"
    : "Changes saved and sent to admin for approval";

  return res.status(200).json({ success: true, message, data: safeService });
});
/**
 * DELETE /api/services/:id
 * Delete (soft delete/archive) a service or request deletion
 */
export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw createError(404, "Service not found");

  const isOwner = service.provider.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) throw createError(403, "Not authorized");

  if (isAdmin) {
    // 🗑️ HARD DELETE: Admin bypasses request and permanently deletes
    await Service.findByIdAndDelete(req.params.id);
    // Note: I kept your specific `successResponse` here as it differed from the others
    return successResponse(res, 200, "Service permanently deleted by admin");
  } else {
    // Provider requests deletion
    if (service.deletionRequested) {
      throw createError(400, "Deletion request is already pending.");
    }
    service.deletionRequested = true;
    await service.save();
    return successResponse(
      res,
      200,
      "Deletion requested. Pending admin approval.",
    );
  }
});
/**
 * GET /api/services/my/listings
 * Get all services for the logged-in provider
 */
export const getMyServices = asyncHandler(async (req, res) => {
  const services = await Service.find({
    provider: req.user._id,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();
  return successResponse(res, 200, "My services fetched", services);
});

/**
 * GET /api/services/admin/all (or /api/admin/services)
 * Admin: Get all services (allows filtering by status=pending)
 */
export const getAdminServices = asyncHandler(async (req, res) => {
  const { status, limit = 100, page = 1 } = req.query;

  const query = { deletedAt: null };
  if (status) query.status = status; // Allows the frontend "pending" filter to work

  const skip = (Number(page) - 1) * Number(limit);

  const [services, total] = await Promise.all([
    Service.find(query)
      .populate("provider", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Service.countDocuments(query),
  ]);

  return successResponse(res, 200, "Admin services fetched", {
    services, // Note: your frontend looks for res.data.data.services
    total,
  });
});

/**
 * PATCH /api/services/:id/approve (or /api/admin/services/:id/approve)
 * Admin: Approve or Reject a service
 */
export const approveAdminService = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    throw createError(400, "Invalid status. Must be 'approved' or 'rejected'");
  }

  const service = await Service.findById(req.params.id);

  if (!service) throw createError(404, "Service not found");

  // ── Merge pending changes if approving ───────────────────────────────────
  if (
    status === "approved" &&
    service.hasPendingChanges &&
    service.pendingChanges
  ) {
    const changes = service.pendingChanges;

    // Scalar fields — assign directly, Mongoose tracks these automatically
    const SCALAR_FIELDS = [
      "title",
      "description",
      "category",
      "pricePerHour",
      "minimumHours",
      "skills",
      "languages",
      "experience",
    ];
    for (const field of SCALAR_FIELDS) {
      if (changes[field] !== undefined) {
        service[field] = changes[field];
      }
    }

    // serviceArea — nested object, needs markModified
    if (changes.serviceArea !== undefined) {
      service.serviceArea = changes.serviceArea;
      service.markModified("serviceArea");
    }

    // availability — assign day-by-day so Mongoose casts each day
    // through daySchema correctly (slots get validated, types are enforced)
    if (changes.availability && typeof changes.availability === "object") {
      const DAYS = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      for (const day of DAYS) {
        if (changes.availability[day] !== undefined) {
          service.availability[day] = {
            available: Boolean(changes.availability[day].available),
            slots: Array.isArray(changes.availability[day].slots)
              ? changes.availability[day].slots.map((s) => ({
                  from: s.from,
                  to: s.to,
                }))
              : [],
          };
        }
      }
      service.markModified("availability");
    }
  }

  // ── Update status and clear pending state ────────────────────────────────
  service.status = status;
  service.isApproved = status === "approved";
  if (adminNotes) service.adminNotes = adminNotes;

  // Use the schema helper — sets pendingChanges to null,
  // hasPendingChanges to false, and calls markModified in one shot
  service.setPendingChanges(null);

  await service.save();

  return successResponse(res, 200, `Service successfully ${status}`, service);
});

/**
 * POST /api/services/:id/book
 * Guest: Book a service provider for specific hours
 */
export const bookService = asyncHandler(async (req, res) => {
  const serviceId = req.params.id;
  const { date, startTime, hours } = req.body;
  const guestId = req.user._id;

  if (!date || !startTime || !hours) {
    throw createError(
      400,
      "Date, start time, and number of hours are required.",
    );
  }

  const service = await Service.findById(serviceId);
  if (
    !service ||
    service.status !== "approved" ||
    !service.isActive ||
    service.deletedAt
  ) {
    throw createError(404, "Service is not available.");
  }

  const requestedHours = Number(hours);
  if (requestedHours < service.minimumHours) {
    throw createError(
      400,
      `This service requires a minimum of ${service.minimumHours} hours.`,
    );
  }

  // Check Weekly Availability Template
  const bookingDate = new Date(date);
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = daysOfWeek[bookingDate.getDay()];

  if (
    !service.availability[dayName] ||
    !service.availability[dayName].available
  ) {
    throw createError(400, `The provider does not work on ${dayName}s.`);
  }

  // Calculate Price
  const basePrice = service.pricePerHour;
  const subtotal = basePrice * requestedHours;

  // Create the Booking Record
  const booking = await Booking.create({
    guest: guestId,
    host: service.provider, // The provider acts as the 'host' of the service
    bookingType: "service",
    service: service._id,
    checkInDate: bookingDate, // For services, checkInDate is the service date
    checkOutDate: bookingDate,
    guestCount: 1,
    priceBreakdown: {
      basePrice,
      quantity: requestedHours, // Here, quantity means hours
      subtotal,
    },
    totalAmount: subtotal,
    status: "pending", // Services usually require provider confirmation
    paymentStatus: "unpaid",
  });

  successResponse(
    res,
    201,
    "Service booked successfully! Pending provider confirmation.",
    {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      status: booking.status,
    },
  );
});
