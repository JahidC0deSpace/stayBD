import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking reference is required"],
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The Guest paying for the booking
      required: [true, "Payer reference is required"],
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The Host or Service Provider receiving the payout
      required: [true, "Payee reference is required"],
    },

    //  Payment Gateway Details
    paymentGateway: {
      type: String,
      enum: ["stripe", "sslcommerz", "bkash", "aamarpay", "cash"],
      default: "stripe",
    },
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      unique: true,
      index: true, // Stripe Session ID
    },
    gatewayPaymentId: { type: String, default: "" }, // Secondary ID

    //  Amounts
    currency: { type: String, default: "BDT" },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
    },
    adminCommission: {
      type: Number,
      required: [true, "Admin commission is required"],
    },
    providerEarning: {
      type: Number,
      required: [true, "Provider earning is required"],
    },

    //  Payment Status (Guest -> Platform)
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded", "disputed"],
      default: "pending",
    },

    //  Payout Status (Platform -> Host)
    payoutStatus: {
      type: String,
      enum: ["pending", "processing", "paid"],
      default: "pending",
    },
    payoutDate: Date,

    //  Metadata & Refunds
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureMessage: { type: String, default: "" },
    refundId: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 },
    refundedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for fast dashboard queries
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ payoutStatus: 1 });

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

export default Transaction;
