import mongoose from "mongoose";
// Make sure to add the .js extension for ES Modules!
import { BANGLADESH_DISTRICTS, DIVISIONS } from "./User.js";

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, default: "" },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true },
);

const availabilityRuleSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isBlocked: { type: Boolean, default: false },
    reason: { type: String, default: "unavailable" },
  },
  { _id: true },
);

const propertySchema = new mongoose.Schema(
  {
    // ─── Ownership ─────────────────────────────────────────────────────────
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Listing Info ──────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Property title is required"],
      trim: true,
      minlength: [10, "Title must be at least 10 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Property description is required"],
      minlength: [50, "Description must be at least 50 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    propertyType: {
      type: String,
      enum: [
        "apartment",
        "house",
        "villa",
        "room",
        "studio",
        "guesthouse",
        "hostel",
        "cottage",
        "other",
      ],
      required: true,
    },
    rentalType: {
      type: String,
      enum: ["short_term", "long_term", "both"],
      required: true,
      index: true,
    },

    // ─── Pricing ───────────────────────────────────────────────────────────
    pricePerNight: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    pricePerMonth: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    currency: { type: String, default: "BDT", enum: ["BDT", "USD"] },
    cleaningFee: { type: Number, default: 0, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },

    // ─── Capacity ──────────────────────────────────────────────────────────
    guestCapacity: {
      type: Number,
      required: [true, "Guest capacity is required"],
      min: [1, "Must accommodate at least 1 guest"],
      max: [50, "Maximum 50 guests allowed"],
    },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    beds: { type: Number, default: 1, min: 0 },

    // ─── Location ──────────────────────────────────────────────────────────
    location: {
      division: {
        type: String,
        enum: DIVISIONS,
        required: true,
        index: true,
      },
      district: {
        type: String,
        enum: BANGLADESH_DISTRICTS,
        required: true,
        index: true,
      },
      area: { type: String, required: true, trim: true },
      fullAddress: { type: String, required: true, trim: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: {
          type: [Number],
          default: [90.4125, 23.8103],
          index: "2dsphere",
        },
      },
      landmark: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },

    // ─── Images ────────────────────────────────────────────────────────────
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: "Maximum 20 images allowed",
      },
    },

    // ─── Amenities ─────────────────────────────────────────────────────────
    amenities: [amenitySchema],
    amenityNames: [{ type: String }],

    // ─── House Rules ───────────────────────────────────────────────────────
    houseRules: {
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed: { type: Boolean, default: false },
      partiesAllowed: { type: Boolean, default: false },
      checkInTime: { type: String, default: "14:00" },
      checkOutTime: { type: String, default: "11:00" },
      minimumStay: { type: Number, default: 1 },
      maximumStay: { type: Number, default: 365 },
      additionalRules: { type: String, default: "" },
    },

    // ─── Availability ──────────────────────────────────────────────────────
    availability: [availabilityRuleSchema],
    instantBooking: { type: Boolean, default: false },

    // ─── Approval Lifecycle ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "archived"],
      default: "pending",
      index: true,
    },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, default: "" },

    // ─── Pending Changes ───────────────────────────────────────────────────
    pendingChanges: { type: mongoose.Schema.Types.Mixed, default: null },
    hasPendingChanges: { type: Boolean, default: false },

    // ─── Analytics ─────────────────────────────────────────────────────────
    totalBookings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    viewCount: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 },

    // ─── Featured ──────────────────────────────────────────────────────────
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,

    deletionRequested: { type: Boolean, default: false },

    // ─── Soft Delete ───────────────────────────────────────────────────────
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ───────────────────────────────────────────────────────────────
propertySchema.index({ "location.coordinates": "2dsphere" });
propertySchema.index({ status: 1, rentalType: 1, "location.district": 1 });
propertySchema.index({ pricePerNight: 1, pricePerMonth: 1 });
propertySchema.index({ averageRating: -1, totalBookings: -1 });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ amenityNames: 1 });

// ─── Virtual: Primary Image ─────────────────────────────────────────────────
propertySchema.virtual("primaryImage").get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.images[0]?.url || "";
});

// ─── Methods ───────────────────────────────────────────────────────────────
propertySchema.methods.isAvailableForDates = function (checkIn, checkOut) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  for (const rule of this.availability) {
    if (rule.isBlocked) {
      const ruleStart = new Date(rule.startDate);
      const ruleEnd = new Date(rule.endDate);
      if (checkInDate < ruleEnd && checkOutDate > ruleStart) {
        return false;
      }
    }
  }
  return true;
};

propertySchema.methods.blockDates = function (
  checkIn,
  checkOut,
  reason = "booked",
) {
  this.availability.push({
    startDate: checkIn,
    endDate: checkOut,
    isBlocked: true,
    reason,
  });
  return this.save();
};

propertySchema.methods.unblockDates = function (startDate, endDate) {
  this.availability = this.availability.filter((rule) => {
    const ruleStart = new Date(rule.startDate);
    const ruleEnd = new Date(rule.endDate);
    const targetStart = new Date(startDate);
    const targetEnd = new Date(endDate);
    return !(ruleStart >= targetStart && ruleEnd <= targetEnd);
  });
  return this.save();
};

export const Property =
  mongoose.models.Property || mongoose.model("Property", propertySchema);
