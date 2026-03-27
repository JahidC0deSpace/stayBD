// backend/controllers/paymentController.js
import * as paymentService from "../services/paymentService.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";
import Transaction from "../models/Transaction.js";

/**
 * POST /api/payments/create-checkout-session
 * Creates a Stripe checkout session for a pending booking
 */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  const guestId = req.user._id;

  if (!bookingId) {
    throw createError(400, "Booking ID is required");
  }

  const sessionData = await paymentService.createCheckoutSession(
    bookingId,
    guestId,
  );

  successResponse(
    res,
    200,
    "Checkout session created successfully",
    sessionData,
  );
});

/**
 * GET /api/payments/verify-session
 * Verifies a Stripe session after the user is redirected back to the frontend
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    throw createError(400, "Stripe session ID is required");
  }

  const booking = await paymentService.verifySession(session_id);

  successResponse(res, 200, "Payment verified successfully", { booking });
});

/**
 * GET /api/payments/my-transactions
 * Returns transactions for the logged-in user.
 * - As a host/provider:  transactions where they are the payee
 * - As a guest:          transactions where they are the payer
 * Both are included so the same endpoint works for all roles.
 */
export const getMyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const transactions = await Transaction.find({
    $or: [{ payee: userId }, { payer: userId }],
    status: { $in: ["succeeded", "pending"] },
  })
    .populate({
      path: "booking",
      select: "bookingReference bookingType checkIn checkOut totalAmount",
      populate: [
        { path: "property", select: "title" },
        { path: "service", select: "title" },
        { path: "experience", select: "title" },
      ],
    })
    .populate("payer", "name email")
    .populate("payee", "name email")
    .sort({ createdAt: -1 })
    .lean();

  successResponse(res, 200, "Transactions fetched successfully", transactions);
});
