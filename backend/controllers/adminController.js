import { User } from "../models/User.js";
import { Property } from "../models/Property.js";
import { Service } from "../models/Service.js";
import { Booking } from "../models/Booking.js";
// import Transaction from "../models/Transaction.js";
// import { getAdminAnalytics } from "../services/analyticsService.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";

// Helper for standard pagination
const getPagination = (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────

export const getUsers = async (req, res) => {
  try {
    // 1. Create a base query that excludes the current logged-in admin
    const query = {
      _id: { $ne: req.user._id },
    };

    // 2. Add your other frontend filters to the query
    if (req.query.role) query.role = req.query.role;
    if (req.query.isVerified !== undefined)
      query.isVerified = req.query.isVerified === "true";
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { nationalIdNumber: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // 3. Pagination logic
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    // 4. Fetch data
    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const verifyUser = asyncHandler(async (req, res) => {
  const { isVerified, verificationNotes } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      isVerified: Boolean(isVerified),
      verificationNotes: verificationNotes || "",
      // verifiedAt: isVerified ? new Date() : null, // Add if schema supports
      // verifiedBy: isVerified ? req.user._id : null,
    },
    { new: true },
  ).select("-password -__v");

  if (!user) throw createError(404, "User not found");

  successResponse(
    res,
    200,
    `User ${isVerified ? "verified" : "unverified"}`,
    user,
  );
});

export const approveUser = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isApproved: Boolean(isApproved) },
    { new: true },
  ).select("-password");

  if (!user) throw createError(404, "User not found");

  successResponse(
    res,
    200,
    `User ${isApproved ? "approved" : "unapproved"}`,
    user,
  );
});

export const banUser = asyncHandler(async (req, res) => {
  const { isBanned } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      isBanned: Boolean(isBanned),
      isActive: !isBanned,
    },
    { new: true },
  ).select("-password");

  if (!user) throw createError(404, "User not found");

  successResponse(res, 200, `User ${isBanned ? "banned" : "unbanned"}`, user);
});

export const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ["guest", "host", "service_provider", "admin"];

  if (!allowedRoles.includes(role)) {
    throw createError(400, `Invalid role: ${role}`);
  }

  // If changing to a host/provider, reset approval status for safety
  const requiresApproval = ["host", "service_provider"].includes(role);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      role,
      isApproved: !requiresApproval,
    },
    { new: true },
  ).select("-password");

  if (!user) throw createError(404, "User not found");

  successResponse(res, 200, "User role updated", user);
});

export const updateUserFull = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Action denied. You cannot modify your own admin account.",
      });
    }
    const {
      name,
      email,
      phone,
      nationalIdNumber,
      role,
      isVerified,
      isApproved,
      isBanned,
    } = req.body;

    // 1. Find the user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2. Update the fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.nationalIdNumber = nationalIdNumber || user.nationalIdNumber;
    user.role = role || user.role;
    user.isVerified = isVerified !== undefined ? isVerified : user.isVerified;
    user.isApproved = isApproved !== undefined ? isApproved : user.isApproved;
    user.isBanned = isBanned !== undefined ? isBanned : user.isBanned;

    // 3. Save to MongoDB
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ─── PROPERTY & SERVICE APPROVALS ────────────────────────────────────────

export const getAdminProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, hasPendingChanges, deletionRequested } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (hasPendingChanges !== undefined)
    filter.hasPendingChanges = hasPendingChanges === "true";

  if (deletionRequested !== undefined) {
    filter.deletionRequested = deletionRequested === "true";
  }

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .populate("host", "name email avatar isVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(filter),
  ]);

  successResponse(res, 200, "Properties fetched", { properties, total, page });
});

export const approveProperty = async (req, res) => {
  const { action, reason } = req.body; // action: 'approve' or 'reject'
  const status = action === "approve" ? "approved" : "rejected";

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { status, rejectionReason: reason || "" },
    { new: true },
  );
  res.json({ success: true, data: property });
};

// Approve EDITS to an existing property
export const reviewChanges = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });

    const { action, reason } = req.body;

    if (action === "approve") {
      const changes = property.pendingChanges || {};
      // ✅ Use individual set calls so Mongoose tracks all changes properly
      for (const [key, value] of Object.entries(changes)) {
        if (key !== "_id") {
          property.set(key, value);
        }
      }
    } else if (action === "reject") {
      console.log(
        `Changes rejected for property ${property._id}. Reason: ${reason}`,
      );
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action type." });
    }

    property.pendingChanges = null;
    property.hasPendingChanges = false;
    property.markModified("pendingChanges");

    await property.save();
    res.json({ success: true, message: `Changes ${action}d successfully` });
  } catch (err) {
    console.error("reviewChanges error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdminServices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, hasPendingChanges, deletionRequested } = req.query;

  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (hasPendingChanges !== undefined) {
    filter.hasPendingChanges = hasPendingChanges === "true";
  }
  if (deletionRequested !== undefined) {
    filter.deletionRequested = deletionRequested === "true";
  }
  const [services, total] = await Promise.all([
    Service.find(filter)
      .populate("provider", "name email") // Fetch the provider's details
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);

  successResponse(res, 200, "Services fetched successfully", {
    services,
    total,
    page,
  });
});
export const approveService = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;

  // 1. Find the service first so we can check if it has pending changes
  const service = await Service.findById(req.params.id);
  if (!service) throw createError(404, "Service not found");

  if (action === "approve") {
    if (service.hasPendingChanges) {
      // SCENARIO A: Approving an UPDATE
      // Merge the pending changes into the main service document
      Object.assign(service, service.pendingChanges);
      service.pendingChanges = {};
      service.hasPendingChanges = false;
    } else {
      // SCENARIO B: Approving a BRAND NEW service
      service.status = "approved";
    }
    service.rejectionReason = ""; // Clear any previous rejection reasons
  } else if (action === "reject") {
    if (service.hasPendingChanges) {
      // SCENARIO C: Rejecting an UPDATE
      // Simply delete the proposed changes, but keep the original service live
      service.pendingChanges = {};
      service.hasPendingChanges = false;
    } else {
      // SCENARIO D: Rejecting a BRAND NEW service
      service.status = "rejected";
      service.rejectionReason = reason || "Did not meet platform guidelines.";
    }
  }

  // Save the document (this triggers mongoose validation)
  await service.save();

  // Populate provider info before sending the response
  await service.populate("provider", "name email");

  successResponse(res, 200, `Service ${action}d successfully`, service);
});
// ─── BOOKING MANAGEMENT ───────────────────────────────────────────────────

export const getAdminBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, paymentStatus } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("guest", "name email avatar phone")
      .populate("host", "name email avatar phone")
      .populate("property", "title images location")
      .populate("service", "title images category")
      .populate("experience", "title images location")
      .sort({ earlyCheckoutRequested: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  successResponse(res, 200, "Bookings fetched", { bookings, total, page });
});
/**
 * GET /api/admin/bookings
 * Admin: fetch all bookings across the platform with filters
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, bookingType, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (bookingType) filter.bookingType = bookingType;

  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("property", "title images location")
      .populate("service", "title images category")
      .populate("experience", "title images location")
      .populate("guest", "name email avatar phone")
      .populate("host", "name email avatar phone")
      .sort({ earlyCheckoutRequested: -1, createdAt: -1 }) // early checkout requests float to top
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Booking.countDocuments(filter),
  ]);

  successResponse(res, 200, "All bookings fetched", {
    bookings,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});
// ─── DELETION REQUEST MANAGEMENT ──────────────────────────────────────────

export const handlePropertyDeletionRequest = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' or 'reject'
  const property = await Property.findById(req.params.id);

  if (!property) throw createError(404, "Property not found");

  if (action === "approve") {
    // 🗑️ HARD DELETE: Completely remove the property from the database
    const deletedProperty = await Property.findByIdAndDelete(req.params.id);

    return successResponse(
      res,
      200,
      "Deletion approved. Property permanently deleted.",
      deletedProperty,
    );
  } else if (action === "reject") {
    property.deletionRequested = false; // Just remove the request flag
    await property.save();
    return successResponse(
      res,
      200,
      "Deletion rejected. Property remains active.",
      property,
    );
  } else {
    throw createError(400, "Invalid action. Use 'approve' or 'reject'.");
  }
});

/**
 * PATCH /api/admin/services/:id/deletion-request
 * Admin: Approve or Reject a service deletion request
 */
export const handleServiceDeletionRequest = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' or 'reject'
  const service = await Service.findById(req.params.id);

  if (!service) throw createError(404, "Service not found");

  if (action === "approve") {
    // 🗑️ HARD DELETE: Completely remove the service from the database
    const deletedService = await Service.findByIdAndDelete(req.params.id);

    return successResponse(
      res,
      200,
      "Deletion approved. Service permanently deleted.",
      deletedService,
    );
  } else if (action === "reject") {
    service.deletionRequested = false;
    await service.save();
    return successResponse(
      res,
      200,
      "Deletion rejected. Service remains active.",
      service,
    );
  } else {
    throw createError(400, "Invalid action. Use 'approve' or 'reject'.");
  }
});

/**
 * DELETE /api/admin/properties/:id
 * Admin: Directly and permanently delete a property
 */
export const adminDeleteProperty = asyncHandler(async (req, res) => {
  // 🗑️ HARD DELETE: Bypass all requests and nuke it
  const property = await Property.findByIdAndDelete(req.params.id);

  if (!property) throw createError(404, "Property not found");

  return successResponse(
    res,
    200,
    "Property permanently deleted by Admin.",
    property, // Returning the deleted object helps the frontend remove it from the UI
  );
});

/**
 * DELETE /api/admin/services/:id
 * Admin: Directly and permanently delete a service
 */
export const adminDeleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);

  if (!service) throw createError(404, "Service not found");

  return successResponse(
    res,
    200,
    "Service permanently deleted by Admin.",
    service,
  );
});

/**
 * DELETE /api/admin/experiences/:id
 * Admin: Directly and permanently delete an experience
 */
export const adminDeleteExperience = asyncHandler(async (req, res) => {
  const experience = await Experience.findByIdAndDelete(req.params.id);

  if (!experience) throw createError(404, "Experience not found");

  return successResponse(
    res,
    200,
    "Experience permanently deleted by Admin.",
    experience,
  );
});
