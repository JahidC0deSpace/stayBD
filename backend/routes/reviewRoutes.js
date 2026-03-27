import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────

/**
 * GET /api/reviews/:targetType/:targetId
 * Fetch paginated reviews for a Property, Service, or Experience
 */
router.get("/:targetType/:targetId", getReviews);

// ─── GUEST ROUTES ───────────────────────────────────────────────────────────

/**
 * POST /api/reviews
 * Submit a review for a completed booking
 */
router.post("/", protect, createReview);

/**
 * PATCH /api/reviews/:id
 * Edit your own review
 */
router.patch("/:id", protect, updateReview);

/**
 * DELETE /api/reviews/:id
 * Delete your own review (or Admin can delete)
 */
router.delete("/:id", protect, deleteReview);

// ─── HOST & MODERATION ROUTES ───────────────────────────────────────────────

/**
 * POST /api/reviews/:id/respond
 * Host/Provider responds to a review
 */
router.post(
  "/:id/respond",
  protect,
  restrictTo("host", "service_provider", "admin"),
  asyncHandler(async (req, res) => {
    const { comment } = req.body;
    if (!comment) throw createError(400, "Response comment is required");

    const review = await Review.findById(req.params.id);
    if (!review) throw createError(404, "Review not found");

    // Dynamic model lookup to verify ownership
    const TargetModel = mongoose.model(review.targetType);
    const target = await TargetModel.findById(review.target);

    // Services use 'provider', Properties/Experiences use 'host'
    const ownerId = target?.host || target?.provider;

    if (!target || ownerId?.toString() !== req.user._id.toString()) {
      throw createError(403, "Only the owner of this listing can respond");
    }

    review.hostResponse = {
      comment: comment.trim(),
      respondedAt: new Date(),
    };

    await review.save();
    successResponse(res, 200, "Response added successfully", review);
  }),
);

/**
 * PATCH /api/reviews/:id/flag
 * Flag a review for manual moderation
 */
router.patch(
  "/:id/flag",
  protect,
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        isFlagged: true,
        flagReason: reason || "Inappropriate content",
      },
      { new: true },
    );

    if (!review) throw createError(404, "Review not found");
    successResponse(res, 200, "Review flagged for moderation", {});
  }),
);

export default router;
