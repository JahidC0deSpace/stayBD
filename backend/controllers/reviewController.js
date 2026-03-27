import Review from "../models/Review.js";
import { Booking } from "../models/Booking.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";

// Helper to normalize "property" -> "Property" for Mongoose refPath
const normalizeType = (type) => {
  if (!type) return null;
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

/**
 * POST /api/reviews
 * Create a new review for a completed booking
 */
export const createReview = asyncHandler(async (req, res) => {
  let { targetType, targetId, bookingId, rating, comment, subRatings } =
    req.body;

  if (!targetType || !targetId || !rating || !comment || !bookingId) {
    throw createError(400, "All fields including bookingId are required");
  }

  // 1. Validate Target Type
  const normalizedType = normalizeType(targetType);
  if (!["Property", "Service", "Experience"].includes(normalizedType)) {
    throw createError(400, "Invalid targetType");
  }

  // 2. Validate Booking & Ownership
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError(404, "Booking not found");

  if (booking.guest.toString() !== req.user._id.toString()) {
    throw createError(403, "You can only review your own bookings");
  }

  if (booking.status !== "completed") {
    throw createError(400, "You can only review completed bookings");
  }

  // 3. Prevent Duplicate Reviews
  const existing = await Review.findOne({ booking: bookingId });
  if (existing)
    throw createError(409, "This booking has already been reviewed");

  // 4. Create Review
  // Note: model middleware handles the averageRating calculations
  const review = await Review.create({
    reviewer: req.user._id,
    targetType: normalizedType,
    target: targetId,
    booking: bookingId,
    rating: Number(rating),
    comment,
    subRatings,
  });

  // 5. Mark Booking as reviewed
  booking.guestReviewed = true;
  await booking.save();

  const populated = await review.populate("reviewer", "name avatar");

  successResponse(res, 201, "Review submitted successfully", populated);
});

/**
 * GET /api/reviews/:targetType/:targetId
 * Get all reviews for a specific property/service
 */
export const getReviews = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const targetType = normalizeType(req.params.targetType);
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ targetType, target: targetId, isVisible: true })
      .populate("reviewer", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ targetType, target: targetId, isVisible: true }),
  ]);

  successResponse(res, 200, "Reviews fetched", {
    reviews,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

/**
 * PATCH /api/reviews/:id
 * Update an existing review
 */
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw createError(404, "Review not found");

  if (review.reviewer.toString() !== req.user._id.toString()) {
    throw createError(403, "You can only edit your own reviews");
  }

  const { rating, comment, subRatings } = req.body;
  if (rating) review.rating = Number(rating);
  if (comment) review.comment = comment;
  if (subRatings) review.subRatings = subRatings;

  await review.save(); // Middleware handles re-calculation

  const populated = await review.populate("reviewer", "name avatar");
  successResponse(res, 200, "Review updated", populated);
});

/**
 * DELETE /api/reviews/:id
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw createError(404, "Review not found");

  const isAdmin = req.user.role === "admin";
  const isOwner = review.reviewer.toString() === req.user._id.toString();

  if (!isOwner && !isAdmin) throw createError(403, "Not authorized");

  await review.deleteOne(); // Middleware handles re-calculation

  successResponse(res, 200, "Review deleted");
});
