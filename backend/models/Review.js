import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["Property", "Service", "Experience"],
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetType",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    subRatings: {
      cleanliness: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      checkIn: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
      trim: true,
    },
    hostResponse: {
      comment: { type: String, maxlength: 1000 },
      respondedAt: Date,
    },
    isVisible: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, default: "" },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    moderatedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── INDEXES ───────────────────────────────────────────────────────────────
reviewSchema.index({ target: 1, targetType: 1, isVisible: 1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ rating: -1 });

// ─── AGGREGATION LOGIC ─────────────────────────────────────────────────────

/**
 * Recalculates average rating for both the Listing AND the Host
 */
reviewSchema.statics.calculateRatings = async function (targetId, targetType) {
  // 1. Update the Listing (Property/Service/Experience)
  const stats = await this.aggregate([
    { $match: { target: targetId, targetType, isVisible: true } },
    {
      $group: {
        _id: "$target",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  const Model = mongoose.model(targetType);

  if (stats.length > 0) {
    const doc = await Model.findByIdAndUpdate(targetId, {
      totalReviews: stats[0].nRating,
      averageRating: parseFloat(stats[0].avgRating.toFixed(2)),
    });

    // 2. Update the Host/Provider's overall reputation
    if (doc && doc.host) {
      const hostStats = await this.aggregate([
        // Find all reviews for all listings owned by this host
        {
          $lookup: {
            from: targetType.toLowerCase() + "s", // e.g., "properties"
            localField: "target",
            foreignField: "_id",
            as: "listing",
          },
        },
        { $unwind: "$listing" },
        { $match: { "listing.host": doc.host, isVisible: true } },
        {
          $group: {
            _id: "$listing.host",
            nRating: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ]);

      if (hostStats.length > 0) {
        await mongoose.model("User").findByIdAndUpdate(doc.host, {
          totalReviews: hostStats[0].nRating,
          averageRating: parseFloat(hostStats[0].avgRating.toFixed(2)),
        });
      }
    }
  }
};

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────

reviewSchema.post("save", function () {
  this.constructor.calculateRatings(this.target, this.targetType);
});

// For updates and deletes
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calculateRatings(doc.target, doc.targetType);
  }
});

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;
