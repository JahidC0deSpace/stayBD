// backend/controllers/experienceController.js
import { Experience } from "../models/Experience.js";
import { Booking } from "../models/Booking.js";
import { createError, asyncHandler } from "../utils/errorUtils.js";
import {
  deleteMultipleFromCloudinary,
  extractPublicId,
} from "../config/cloudinary.js";
import {
  sendSuccess,
  sendPaginated,
  getPaginationParams,
} from "../utils/responseUtils.js";

// @desc    Approve or reject an experience
// @route   PATCH /api/experiences/:id/approve
// @access  Private/Admin
export const approveExperience = async (req, res) => {
  try {
    const { id } = req.params;

    const action = req.body.action || "approve";
    const reason = req.body.reason;

    const isApproving = action === "approve";
    const newStatus = isApproving ? "approved" : "rejected";

    const experience = await Experience.findById(id);

    if (!experience) {
      return res
        .status(404)
        .json({ success: false, message: "Experience not found" });
    }

    if (
      isApproving &&
      experience.hasPendingChanges &&
      experience.pendingChanges
    ) {
      const updates = experience.pendingChanges.toObject
        ? experience.pendingChanges.toObject()
        : experience.pendingChanges;

      // 🛠️ THE FIX: Auto-correct legacy string images in pendingChanges
      if (updates.images && Array.isArray(updates.images)) {
        updates.images = updates.images.map((img) => {
          // If it's a legacy string URL, convert it to the required object
          if (typeof img === "string") {
            // Quick inline extraction of a publicId (or fallback)
            const parts = img.split("/");
            const folderIndex = parts.indexOf("staybd");
            let extractedPublicId = `legacy_${Date.now()}`; // Safe fallback

            if (folderIndex !== -1) {
              extractedPublicId = parts
                .slice(folderIndex)
                .join("/")
                .split(".")[0];
            }

            return { url: img, publicId: extractedPublicId };
          }
          // If it's already an object, leave it alone
          return img;
        });
      }

      // Now it is perfectly safe to merge
      experience.set(updates);
    }

    // Update states
    experience.status = newStatus;
    experience.isApproved = isApproving;
    experience.hasPendingChanges = false;
    experience.pendingChanges = undefined;

    await experience.save();

    res.status(200).json({
      success: true,
      message: `Experience successfully ${newStatus}`,
      data: experience,
    });
  } catch (error) {
    console.error("Error approving experience:", error.message || error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
/**
 * GET /api/experiences
 * List all approved experiences with optional filters and geo-search
 */
export const getExperiences = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const {
    district,
    category,
    minPrice,
    maxPrice,
    date,
    search,
    lat,
    lng,
    radius,
    status,
  } = req.query;

  const query = {};

  if (status) {
    query.status = status; // Allows Admin to search for "pending"
  } else {
    query.status = "approved"; // Default for public users
    query.isActive = true;
  }

  if (district) query["location.district"] = district;
  if (category) query.category = category;
  if (minPrice || maxPrice) {
    query.pricePerPerson = {};
    if (minPrice) query.pricePerPerson.$gte = Number(minPrice);
    if (maxPrice) query.pricePerPerson.$lte = Number(maxPrice);
  }
  if (date) {
    query["schedule.date"] = { $gte: new Date(date) };
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // 📍 Geo-spatial search (requires 2dsphere index on location.coordinates)
  if (lat && lng) {
    query["location.coordinates"] = {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: (Number(radius) || 15) * 1000, // Default 15km
      },
    };
  }

  const [experiences, total] = await Promise.all([
    Experience.find(query)
      .populate("host", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Experience.countDocuments(query),
  ]);

  sendPaginated(res, experiences, { page, limit, total });
});

/**
 * GET /api/experiences/:id
 * Get single experience details
 */
export const getExperienceById = asyncHandler(async (req, res) => {
  const experience = await Experience.findById(req.params.id)
    .populate("host", "name avatar bio")
    .lean();

  if (!experience) throw createError(404, "Experience not found");

  sendSuccess(res, 200, "Experience fetched", { experience });
});

/**
 * POST /api/experiences
 * Create a new experience (Host/Provider only)
 */
export const createExperience = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    pricePerPerson,
    maxParticipants,
    location,
    schedule,
    images,
    durationHours,
    includes,
    requirements,
  } = req.body;

  // 👇 ADDED stricter validation matching the model
  if (
    !title ||
    !description ||
    !category ||
    !pricePerPerson ||
    !location ||
    !schedule ||
    !durationHours
  ) {
    throw createError(
      400,
      "Title, description, category, price, location, schedule, and duration are required",
    );
  }

  const experience = await Experience.create({
    host: req.user._id,
    title,
    description,
    category,
    pricePerPerson: Number(pricePerPerson),
    maxParticipants: maxParticipants || 10,
    location,
    schedule,
    images: images || [],
    durationHours: Number(durationHours), // 👇 Ensure it's a number
    includes: includes || [],
    requirements: requirements || [],
    status: "pending",
  });

  sendSuccess(res, 201, "Experience created and pending review", {
    experience,
  });
});

/**
 * PUT /api/experiences/:id
 * Update experience details
 */
export const updateExperience = asyncHandler(async (req, res) => {
  const experience = await Experience.findById(req.params.id);

  if (!experience) throw createError(404, "Experience not found");

  const isOwner = experience.host.toString() === req.user._id.toString();

  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin)
    throw createError(403, "Not authorized to edit this listing");

  const updatable = [
    "title",

    "description",

    "category",

    "pricePerPerson",

    "maxParticipants",

    "location",

    "schedule",

    "images",

    "durationHours",

    "includes",

    "requirements",

    "isActive",
  ];

  // Gather only the allowed fields that the user actually sent

  const updates = {};

  updatable.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (isAdmin) {
    // Admins overwrite the live data immediately

    Object.assign(experience, updates);

    experience.hasPendingChanges = false;

    experience.pendingChanges = {}; // Clear any pending changes
  } else {
    // Providers tuck their changes into the pending object

    experience.pendingChanges = updates;

    experience.hasPendingChanges = true;

    // Note: I removed the status="pending" change here so the OLD version stays live

    // on your site while the admin reviews the NEW changes.

    // If you WANT the listing to disappear from the site during review, uncomment these:

    // experience.isApproved = false;

    // experience.status = "pending";
  }

  await experience.save();

  const successMessage = isAdmin
    ? "Experience updated successfully"
    : "Experience updated successfully. Pending admin approval.";

  res

    .status(200)

    .json({ success: true, message: successMessage, data: { experience } });
});

/**
 * DELETE /api/experiences/:id
 * Host: Request deletion (Pending Admin Approval)
 * Admin: Direct soft delete (archiving)
 */
export const deleteExperience = asyncHandler(async (req, res) => {
  const experience = await Experience.findById(req.params.id);
  if (!experience) throw createError(404, "Experience not found");

  const isOwner = experience.host.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) throw createError(403, "Not authorized");

  if (isAdmin) {
    // 🗑️ HARD DELETE: Admin bypasses request and permanently deletes
    await Experience.findByIdAndDelete(req.params.id);
    return sendSuccess(res, 200, "Experience permanently deleted by admin");
  } else {
    // Host requests deletion
    if (experience.deletionRequested) {
      throw createError(400, "Deletion request is already pending.");
    }
    experience.deletionRequested = true;
    await experience.save();
    return sendSuccess(res, 200, "Deletion requested. Pending admin approval.");
  }
});
/**
 * GET /api/experiences/my
 * List all experiences created by the logged-in host
 */
export const getMyExperiences = asyncHandler(async (req, res) => {
  const experiences = await Experience.find({ host: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, 200, "My experiences fetched", { experiences });
});

// @desc    Get all experiences for Admin Dashboard (includes pending/rejected/deletionRequested)
// @route   GET /api/experiences/admin/all
// @access  Private/Admin
export const getAdminExperiences = async (req, res) => {
  try {
    // Fetch everything, optionally filtering by status if provided in query
    const filter =
      req.query.status && req.query.status !== "all"
        ? { status: req.query.status }
        : {};

    // 👇 Add the filter for deletion requests 👇
    if (req.query.deletionRequested !== undefined) {
      filter.deletionRequested = req.query.deletionRequested === "true";
    }

    const experiences = await Experience.find(filter)
      .populate("host", "name email") // Adjust if your user ref is different
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: experiences, // Ensure this matches what your frontend expects
    });
  } catch (error) {
    console.error("Error fetching admin experiences:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
// @desc    Approve or Reject an experience deletion request
// @route   PATCH /api/experiences/:id/deletion-request
// @access  Private/Admin
export const handleExperienceDeletionRequest = asyncHandler(
  async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    const experience = await Experience.findById(req.params.id);

    if (!experience) throw createError(404, "Experience not found");

    if (action === "approve") {
      // Archive it permanently
      experience.status = "archived";
      experience.isActive = false;
      experience.deletedAt = new Date();
      experience.deletionRequested = false; // Reset the flag

      await experience.save();

      return sendSuccess(res, 200, "Deletion approved. Experience archived.", {
        experience,
      });
    } else if (action === "reject") {
      // Just remove the request flag and leave it active
      experience.deletionRequested = false;

      await experience.save();

      return sendSuccess(
        res,
        200,
        "Deletion rejected. Experience remains active.",
        { experience },
      );
    } else {
      throw createError(400, "Invalid action. Use 'approve' or 'reject'.");
    }
  },
);
/**
 * POST /api/experiences/:id/book
 * Reserve a spot in an experience time slot
 */
export const bookExperience = asyncHandler(async (req, res) => {
  const experience = await Experience.findById(req.params.id);

  // 1. Availability Checks
  if (!experience) throw createError(404, "Experience not found");
  if (experience.status !== "approved" || !experience.isActive) {
    throw createError(
      400,
      "This experience is not currently available for booking",
    );
  }

  const { slotId, participants } = req.body;
  if (!slotId || !participants) {
    throw createError(400, "slotId and number of participants are required");
  }

  // Find specific sub-document slot
  const slot = experience.schedule.id(slotId);
  if (!slot) throw createError(400, "Invalid schedule slot");
  if (slot.isFull) throw createError(400, "This time slot is already full");

  const requestedCount = Number(participants);
  const remaining = slot.maxParticipants - slot.currentParticipants;

  if (requestedCount > remaining) {
    throw createError(
      400,
      `Only ${remaining} spots remaining for this time slot`,
    );
  }

  // 2. Financials
  const basePrice = experience.pricePerPerson;
  const subtotal = basePrice * requestedCount;
  const totalAmount = subtotal;

  // 3. Create Booking (Fully aligned with Booking.js ESM model)
  const booking = await Booking.create({
    guest: req.user._id,
    host: experience.host,
    bookingType: "experience",
    experience: experience._id,
    experienceSlotId: slot._id,
    bookingDate: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    guestCount: requestedCount,
    priceBreakdown: {
      basePrice,
      quantity: requestedCount,
      subtotal,
    },
    totalAmount,
    status: "pending",
    paymentStatus: "unpaid",
  });

  // // 4. Update Experience Schedule State
  // slot.currentParticipants += requestedCount;
  // slot.bookingIds.push(booking._id);

  // if (slot.currentParticipants >= slot.maxParticipants) {
  //   slot.isFull = true;
  // }

  // await experience.save();

  sendSuccess(res, 201, "Booking created. Proceed to payment.", {
    bookingId: booking._id,
    bookingReference: booking.bookingReference,
    totalAmount: booking.totalAmount,
  });
});
