import mongoose from "mongoose";
import { BANGLADESH_DISTRICTS, DIVISIONS } from "./User.js";

const scheduleSlotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g., "10:00 AM"
    endTime: { type: String, required: true }, // e.g., "01:00 PM"
    maxParticipants: { type: Number, required: true, min: 1 },
    currentParticipants: { type: Number, default: 0 },
    isFull: { type: Boolean, default: false }, // Renamed for clearer logic
    bookingIds: [
      // Array of booking IDs
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
  },
  { _id: true },
);

const experienceSchema = new mongoose.Schema(
  {
    //  Ownership
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    //  Basic Info
    title: {
      type: String,
      required: [true, "Experience title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [50, "Description must be at least 50 characters"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    category: {
      type: String,
      enum: [
        "food_tour",
        "cooking_class",
        "cultural_tour",
        "nature_hike",
        "boat_trip",
        "art_class",
        "music_lesson",
        "photography_tour",
        "historical_tour",
        "adventure_sports",
        "wellness",
        "craft_workshop",
        "language_exchange",
        "farming_tour",
        "village_tour",
        "other",
      ],
      required: true,
      index: true,
    },

    //  Duration & Pricing
    durationHours: {
      type: Number,
      required: true,
      min: [0.5, "Minimum 30 minutes"],
      max: [24, "Maximum 24 hours"],
    },
    pricePerPerson: {
      type: Number,
      required: [true, "Price per person is required"],
      min: [0, "Price cannot be negative"],
    },
    currency: { type: String, default: "BDT" },
    maxParticipants: {
      type: Number,
      required: true,
      min: [1, "At least 1 participant"],
      max: [100, "Maximum 100 participants"],
    },

    //  Location
    location: {
      division: { type: String, enum: DIVISIONS, required: true },
      district: { type: String, enum: BANGLADESH_DISTRICTS, required: true },
      area: { type: String, required: true },
      fullAddress: { type: String, required: true },
      meetingPoint: { type: String, default: "" },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [90.4125, 23.8103] }, // [Long, Lat]
      },
    },

    //  Media
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    //  Schedule
    schedule: [scheduleSlotSchema],

    //  Logistics
    includes: [{ type: String, trim: true }],
    excludes: [{ type: String, trim: true }],
    requirements: [{ type: String, trim: true }],
    languages: { type: [String], default: ["Bengali", "English"] },

    //  Status & Verification
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "archived"],
      default: "pending",
      index: true,
    },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, default: "" },
    hasPendingChanges: {
      type: Boolean,
      default: false,
    },
    pendingChanges: {
      type: Object,
      default: {},
    },

    //  Metadata
    totalBookings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },

    deletionRequested: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Geo-spatial index for "Experiences near me" search
experienceSchema.index({ "location.coordinates": "2dsphere" });
experienceSchema.index({ status: 1, category: 1 });
experienceSchema.index({ "location.district": 1 });

export const Experience =
  mongoose.models.Experience || mongoose.model("Experience", experienceSchema);
