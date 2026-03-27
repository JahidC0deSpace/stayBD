import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, unique: true, index: true },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingType: {
      type: String,
      enum: ["property", "service", "experience"],
      required: true,
      index: true,
    },

    //  Reference Links
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    experience: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experience",
      default: null,
    },

    // For Experiences: Reference the specific slot inside the experience schedule
    experienceSlotId: { type: mongoose.Schema.Types.ObjectId, default: null },

    //  Dates & Timing
    // Properties use checkIn/Out. Experiences/Services use bookingDate + Times.
    checkIn: { type: Date, index: true },
    checkOut: { type: Date },
    bookingDate: { type: Date }, // Specific day for Experience/Service
    startTime: { type: String }, // e.g., "10:00 AM"
    endTime: { type: String },

    actualCheckout: { type: Date, default: null },
    guestCount: {
      type: Number,
      required: true,
      min: [1, "At least 1 guest/participant is required"],
    },
    totalHours: { type: Number, default: null },
    totalNights: { type: Number, default: null }, // property bookings
    serviceAddress: { type: String, default: "" },
    bookingLanguage: { type: String, default: "" },

    //  Pricing Breakdown
    priceBreakdown: {
      basePrice: { type: Number, required: true }, // Price per night OR price per person
      quantity: { type: Number, default: 1 }, // Number of nights OR number of guests
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      subtotal: { type: Number, required: true },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    adminCommission: { type: Number, required: true, default: 0 },
    providerEarning: { type: Number, required: true, default: 0 },
    commissionRate: { type: Number, default: 10 }, // Percentage

    //  Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "early_checkout",
      ],
      default: "pending",
      index: true,
    },
    cancellationReason: { type: String, default: "" },
    cancelledBy: {
      type: String,
      enum: ["guest", "host", "admin", ""],
      default: "",
    },
    cancelledAt: Date,

    //  Payment
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "failed", "partially_refunded"],
      default: "unpaid",
      index: true,
    },
    stripeSessionId: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    paidAt: Date,
    refundAmount: { type: Number, default: 0 },

    //  Logistics & Communication
    specialRequests: { type: String, default: "", maxlength: 500 },
    hostNotes: { type: String, default: "" },
    chatRoomId: { type: String, default: "" },

    //  Early Checkout
    earlyCheckoutRequested: { type: Boolean, default: false },
    earlyCheckoutRequestedAt: Date,
    earlyCheckoutNotes: { type: String, default: "" },

    guestReviewed: { type: Boolean, default: false },
    hostReviewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ host: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

// Logic before saving
bookingSchema.pre("save", function (next) {
  if (this.isNew) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.bookingReference = `SBD-${timestamp}-${random}`;
    this.chatRoomId = `booking:${this._id}`;
  }

  // Calculate earnings based on the commission rate
  if (this.isModified("totalAmount") || this.isModified("commissionRate")) {
    const rate = this.commissionRate / 100;
    this.adminCommission = parseFloat((this.totalAmount * rate).toFixed(2));
    this.providerEarning = parseFloat(
      (this.totalAmount - this.adminCommission).toFixed(2),
    );
  }

  next();
});

// Virtual for display
bookingSchema.virtual("stayDuration").get(function () {
  if (this.bookingType === "property") {
    const end = this.actualCheckout || this.checkOut;
    const ms = new Date(end) - new Date(this.checkIn);
    return `${Math.ceil(ms / (1000 * 60 * 60 * 24))} nights`;
  }
  return this.startTime ? `${this.startTime} - ${this.endTime}` : "Single Day";
});

// Static method for availability (Properties only)
bookingSchema.statics.checkPropertyAvailability = async function (
  propertyId,
  checkIn,
  checkOut,
) {
  const conflicting = await this.findOne({
    property: propertyId,
    status: { $in: ["pending", "confirmed"] },
    $or: [
      {
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
      },
    ],
  });
  return !conflicting;
};

export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
