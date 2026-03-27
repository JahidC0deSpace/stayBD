import mongoose from "mongoose";
import { BANGLADESH_DISTRICTS, DIVISIONS } from "./User.js";

// ─── Slot sub-schema (enforces HH:MM format) ──────────────────────────────────
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const slotSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      validate: {
        validator: (v) => timeRegex.test(v),
        message: 'Slot "from" must be in HH:MM format (e.g. "09:00")',
      },
    },
    to: {
      type: String,
      required: true,
      validate: {
        validator: (v) => timeRegex.test(v),
        message: 'Slot "to" must be in HH:MM format (e.g. "17:00")',
      },
    },
  },
  { _id: false },
);

// ─── Day availability sub-schema (reused for each weekday) ───────────────────
const daySchema = new mongoose.Schema(
  {
    available: { type: Boolean, default: true },
    slots: { type: [slotSchema], default: [] },
  },
  { _id: false },
);

// ─── Certification sub-schema ─────────────────────────────────────────────────
const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    issuedBy: { type: String, trim: true },
    documentUrl: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

// ─── Image sub-schema ─────────────────────────────────────────────────────────
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────
const serviceSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────────
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── Service info ───────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Service title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    category: {
      type: String,
      enum: [
        "cleaning",
        "cooking",
        "plumbing",
        "electrical",
        "painting",
        "carpentry",
        "ac_repair",
        "laundry",
        "babysitting",
        "elder_care",
        "tutoring",
        "photography",
        "catering",
        "security",
        "gardening",
        "moving",
        "pest_control",
        "beauty",
        "fitness",
        "driver",
        "other",
      ],
      required: true,
      index: true,
    },

    // ── Pricing ────────────────────────────────────────────────────────────
    pricePerHour: {
      type: Number,
      required: [true, "Hourly price is required"],
      min: [1, "Price must be at least 1"],
    },
    minimumHours: { type: Number, default: 1, min: 1 },
    // FIX: currency is now enum-guarded so it can never drift from BDT accidentally
    currency: {
      type: String,
      enum: ["BDT"],
      default: "BDT",
    },

    // ── Service area ───────────────────────────────────────────────────────
    serviceArea: {
      divisions: [{ type: String, enum: DIVISIONS }],
      districts: [{ type: String, enum: BANGLADESH_DISTRICTS }],
      areas: [{ type: String, trim: true }],
    },

    // ── Images (max 10) ────────────────────────────────────────────────────
    // FIX: added a max-10 validator; previously unbounded
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "A service cannot have more than 10 images",
      },
    },

    // ── Availability (weekly template) ─────────────────────────────────────
    // FIX: typed sub-schemas replace bare objects so slot times are validated
    availability: {
      monday: {
        type: daySchema,
        default: () => ({ available: true, slots: [] }),
      },
      tuesday: {
        type: daySchema,
        default: () => ({ available: true, slots: [] }),
      },
      wednesday: {
        type: daySchema,
        default: () => ({ available: true, slots: [] }),
      },
      thursday: {
        type: daySchema,
        default: () => ({ available: true, slots: [] }),
      },
      friday: {
        type: daySchema,
        default: () => ({ available: true, slots: [] }),
      },
      saturday: {
        type: daySchema,
        default: () => ({ available: true, slots: [] }),
      },
      sunday: {
        type: daySchema,
        default: () => ({ available: false, slots: [] }),
      },
    },

    // ── Skills & tags ──────────────────────────────────────────────────────
    skills: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    experience: {
      years: { type: Number, default: 0, min: 0 },
      description: { type: String, default: "", trim: true },
    },

    // ── Approval lifecycle ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "archived"],
      default: "pending",
    },
    approvedAt: Date,
    // FIX: approvedBy is intentionally admin-only; application layer must enforce this
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, default: "", trim: true },

    // ── Pending changes (edit-approval workflow) ───────────────────────────
    // FIX: replaced bare Mixed with a wrapper object so markModified() is explicit
    pendingChanges: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    hasPendingChanges: { type: Boolean, default: false },

    // ── Analytics (denormalised — keep in sync via review hooks) ──────────
    totalBookings: { type: Number, default: 0, min: 0 },
    totalReviews: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },

    // ── Certifications (max 5) ─────────────────────────────────────────────
    // FIX: added a max-5 validator; previously unbounded
    certifications: {
      type: [certificationSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "A service cannot have more than 5 certifications",
      },
    },

    // ── Soft delete ────────────────────────────────────────────────────────
    deletionRequested: { type: Boolean, default: false },
    // FIX: added timestamp so admin/cron can know when deletion was requested
    deletionRequestedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// FIX: removed redundant single-field indexes on status and category — the
//      compound index below already covers queries leading with status or category.
serviceSchema.index({ status: 1, category: 1 }); // most common filter
serviceSchema.index({ provider: 1, status: 1 }); // FIX: added — "my approved services"
serviceSchema.index({ "serviceArea.districts": 1 });
serviceSchema.index({ averageRating: -1, totalBookings: -1 });
serviceSchema.index({ pricePerHour: 1 });
serviceSchema.index({ isActive: 1 }); // FIX: added — soft-delete queries
serviceSchema.index({ deletedAt: 1 }, { sparse: true }); // FIX: added — cron cleanup queries

// ─── Helper: call this whenever you mutate pendingChanges directly ────────────
serviceSchema.methods.setPendingChanges = function (changes) {
  this.pendingChanges = changes;
  this.hasPendingChanges = changes !== null;
  this.markModified("pendingChanges");
};

export const Service =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
