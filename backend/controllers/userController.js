import { User } from "../models/User.js"; // Standardized to default import
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";

/**
 * GET /api/users/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("wishlist") // Removed specific fields to give more flexibility to the frontend
    .select("-__v -password");

  if (!user) throw createError(404, "User not found");

  successResponse(res, 200, "Profile fetched", user);
});

/**
 * PUT /api/users/updateMe
 * Strict update: name, email, phone, address, and profile-related metadata
 */
export const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "email",
    "phone",
    "address",
    "avatar",
    "bio",
    "socialLinks",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // If a file was uploaded via multer, override the avatar field
  if (req.file) {
    // req.file.path is typically where the Cloudinary URL sits
    // when using multer-storage-cloudinary
    updates.avatar = req.file.path;
  }

  if (updates.email) {
    const emailExists = await User.findOne({
      email: updates.email,
      _id: { $ne: req.user._id },
    });
    if (emailExists) throw createError(400, "Email is already in use");
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select("-__v -password");

  if (!user) throw createError(404, "User not found");

  successResponse(res, 200, "Profile updated successfully", user);
});

/**
 * POST /api/users/complete-profile
 */
export const completeProfile = asyncHandler(async (req, res) => {
  const { phone, nationalIdNumber, address, role } = req.body;

  if (!phone || !nationalIdNumber || !address) {
    throw createError(400, "Phone, national ID, and address are required");
  }

  const validRoles = ["guest", "host", "service_provider"];
  const assignedRole = validRoles.includes(role) ? role : "guest";

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      phone,
      nationalIdNumber,
      address,
      role: assignedRole,
      isProfileComplete: true,
    },
    { new: true, runValidators: true },
  ).select("-__v");

  successResponse(res, 200, "Profile completed successfully", user);
});

/**
 * GET /api/users/:id (Public Profile)
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "name avatar bio role createdAt averageRating totalReviews isServiceProvider isHost",
  );

  if (!user) throw createError(404, "User not found");

  successResponse(res, 200, "Public profile fetched", user);
});

/**
 * PATCH /api/users/me/role
 */
export const switchRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ["guest", "host", "service_provider"];

  if (!validRoles.includes(role)) {
    throw createError(400, "Invalid role selection");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role },
    { new: true },
  ).select("role name");

  successResponse(res, 200, `Successfully switched role to ${role}`, user);
});

/**
 * POST /api/users/me/wishlist/:itemId
 */
export const toggleWishlist = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const user = await User.findById(req.user._id);

  if (!user) throw createError(404, "User not found");

  const itemIndex = user.wishlist.indexOf(itemId);

  if (itemIndex > -1) {
    // Remove if exists
    user.wishlist.splice(itemIndex, 1);
  } else {
    // Add if not exists
    user.wishlist.push(itemId);
  }

  await user.save();

  successResponse(
    res,
    200,
    itemIndex > -1 ? "Removed from wishlist" : "Added to wishlist",
    { wishlist: user.wishlist },
  );
});
