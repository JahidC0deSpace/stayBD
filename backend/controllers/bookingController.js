// backend/controllers/bookingController.js
import { Booking } from "../models/Booking.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";
import * as bookingService from "../services/bookingService.js";

/** POST /api/bookings/property */
export const createPropertyBookingHandler = asyncHandler(async (req, res) => {
  const guestId = req.user._id;
  const { propertyId, ...bookingData } = req.body;
  const booking = await bookingService.createPropertyBooking(
    guestId,
    propertyId,
    bookingData,
  );
  successResponse(res, 201, "Property booked successfully", booking);
});

/** POST /api/bookings/service */
export const createServiceBookingHandler = asyncHandler(async (req, res) => {
  const guestId = req.user._id;
  const { serviceId, ...bookingData } = req.body;
  const booking = await bookingService.createServiceBooking(
    guestId,
    serviceId,
    bookingData,
  );
  successResponse(res, 201, "Service booked successfully", booking);
});

/** GET /api/bookings/my-bookings  OR  /api/bookings/host/my-bookings */
export const getMyBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, viewAs } = req.query;

  const filter =
    viewAs === "host" ? { host: req.user._id } : { guest: req.user._id };

  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("property", "title images location pricePerNight")
      .populate("service", "title images category")
      .populate("experience", "title images location")
      .populate("guest", "name email avatar phone")
      .populate("host", "name email avatar phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Booking.countDocuments(filter),
  ]);

  successResponse(res, 200, "Bookings fetched successfully", {
    bookings,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

/** GET /api/bookings/:id */
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("property", "title images location pricePerNight houseRules")
    .populate("service", "title images category pricePerHour")
    .populate("experience", "title images location pricePerPerson")
    .populate("guest", "name email avatar phone")
    .populate("host", "name email avatar phone")
    .lean();

  if (!booking) throw createError(404, "Booking not found");

  const isGuest = booking.guest._id.toString() === req.user._id.toString();
  const isHost = booking.host._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isGuest && !isHost && !isAdmin)
    throw createError(403, "Not authorized to view this booking");

  successResponse(res, 200, "Booking found", booking);
});

/** PATCH /api/bookings/:id/status — Host: Approve or Reject */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) throw createError(404, "Booking not found");

  if (
    booking.host.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  )
    throw createError(403, "Only the host can update this booking's status");

  if (booking.status !== "pending")
    throw createError(
      400,
      `Cannot update status. Booking is already ${booking.status}`,
    );

  if (!["confirmed", "rejected"].includes(status))
    throw createError(
      400,
      "Invalid status. Must be 'confirmed' or 'rejected'.",
    );

  booking.status = status;
  await booking.save();

  if (status === "confirmed" && booking.property) {
    await bookingService.lockPropertyDates(
      booking.property,
      booking.checkIn,
      booking.checkOut,
      booking._id,
    );
  }

  successResponse(res, 200, `Booking successfully ${status}`, booking);
});

/** POST /api/bookings/:id/cancel */
export const cancelBookingHandler = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const cancelledBooking = await bookingService.cancelBooking(
    req.params.id,
    req.user._id,
    req.user.role,
    reason,
  );
  successResponse(res, 200, "Booking cancelled successfully", cancelledBooking);
});

/** PATCH /api/bookings/:id/complete — Host/Admin */
export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw createError(404, "Booking not found");

  if (
    booking.host.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  )
    throw createError(403, "Not authorized");

  if (booking.status !== "confirmed")
    throw createError(
      400,
      `Cannot complete a booking with status: ${booking.status}`,
    );

  booking.status = "completed";
  await booking.save();

  successResponse(res, 200, "Booking marked as completed", booking);
});

/**
 * POST /api/bookings/:id/early-checkout-request
 * Host submits an early checkout request for admin review.
 */
export const requestEarlyCheckout = asyncHandler(async (req, res) => {
  const { actualCheckout, notes } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) throw createError(404, "Booking not found");

  if (booking.host.toString() !== req.user._id.toString())
    throw createError(403, "Only the host can request early checkout");

  if (booking.status !== "confirmed")
    throw createError(
      400,
      "Early checkout can only be requested for confirmed bookings",
    );

  if (booking.paymentStatus !== "paid")
    throw createError(
      400,
      "Early checkout can only be requested for paid bookings",
    );

  if (booking.earlyCheckoutRequested)
    throw createError(
      400,
      "An early checkout request has already been submitted for this booking",
    );

  const newCheckout = new Date(actualCheckout);
  const originalCheckout = new Date(booking.checkOut);
  const checkIn = new Date(booking.checkIn);

  if (isNaN(newCheckout.getTime()))
    throw createError(400, "Invalid actualCheckout date");

  if (newCheckout >= originalCheckout)
    throw createError(
      400,
      "Early checkout date must be before the original checkout date",
    );

  if (newCheckout <= checkIn)
    throw createError(400, "Early checkout date must be after check-in date");

  // ── Use findByIdAndUpdate so the pre("save") hook does NOT run ──────────
  // This prevents any accidental status/amount recalculation on save.
  const updatedBooking = await Booking.findByIdAndUpdate(
    booking._id,
    {
      $set: {
        earlyCheckoutRequested: true,
        earlyCheckoutRequestedAt: new Date(),
        earlyCheckoutNotes: notes || "",
        actualCheckout: newCheckout,
        // status intentionally NOT changed here — stays "confirmed"
      },
    },
    { new: true },
  );

  successResponse(
    res,
    200,
    "Early checkout request submitted. Admin will review it shortly.",
    updatedBooking,
  );
});

/**
 * PATCH /api/bookings/:id/early-checkout-approve
 * Admin approves the early checkout request → unlocks property dates.
 */
export const approveEarlyCheckout = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    throw createError(403, "Only admin can approve early checkout requests");

  // ── Re-fetch fresh from DB (do NOT use .populate() yet — check raw status)
  const booking = await Booking.findById(req.params.id);

  if (!booking) throw createError(404, "Booking not found");

  if (!booking.earlyCheckoutRequested)
    throw createError(400, "No early checkout request found for this booking");

  // ── Accept both "confirmed" and "early_checkout" statuses ────────────────
  // "early_checkout" can happen if the request was partially processed before.
  // This makes the approve action idempotent and safe to retry.
  if (!["confirmed", "early_checkout"].includes(booking.status)) {
    throw createError(
      400,
      `Cannot approve early checkout for a booking with status: "${booking.status}". Expected "confirmed".`,
    );
  }

  if (booking.paymentStatus !== "paid")
    throw createError(400, "Only paid bookings can process early checkout");

  const newCheckout = booking.actualCheckout;
  if (!newCheckout)
    throw createError(400, "No proposed checkout date found on this booking");

  // Populate property now that we've passed all checks
  await booking.populate("property", "_id title availability");

  const updatedBooking = await bookingService.processEarlyCheckout(
    booking._id,
    newCheckout,
    req.user._id,
  );

  successResponse(
    res,
    200,
    "Early checkout approved and property dates freed",
    updatedBooking,
  );
});

/**
 * PATCH /api/bookings/:id/early-checkout-reject
 * Admin rejects the early checkout request — booking stays confirmed.
 */
export const rejectEarlyCheckout = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    throw createError(403, "Only admin can reject early checkout requests");

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw createError(404, "Booking not found");

  if (!booking.earlyCheckoutRequested)
    throw createError(400, "No early checkout request found for this booking");

  // ── Use findByIdAndUpdate to avoid triggering pre("save") hook ───────────
  const updatedBooking = await Booking.findByIdAndUpdate(
    booking._id,
    {
      $set: {
        earlyCheckoutRequested: false,
        earlyCheckoutNotes: "",
      },
      $unset: {
        earlyCheckoutRequestedAt: "",
        actualCheckout: "",
      },
    },
    { new: true },
  );

  successResponse(
    res,
    200,
    "Early checkout request rejected. Booking remains confirmed.",
    updatedBooking,
  );
});

/** PATCH /api/bookings/:id/early-checkout — kept for backward compat */
export const processEarlyCheckoutHandler = asyncHandler(async (req, res) => {
  const { actualCheckout } = req.body;
  const updatedBooking = await bookingService.processEarlyCheckout(
    req.params.id,
    actualCheckout,
    req.user._id,
  );
  successResponse(
    res,
    200,
    "Early checkout processed successfully",
    updatedBooking,
  );
});

/** GET /api/bookings/:id/chat-room */
export const getChatRoom = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .select("chatRoomId guest host status bookingReference")
    .populate("guest", "name avatar")
    .populate("host", "name avatar")
    .lean();

  if (!booking) throw createError(404, "Booking not found");

  const isParticipant =
    booking.guest._id.toString() === req.user._id.toString() ||
    booking.host._id.toString() === req.user._id.toString() ||
    req.user.role === "admin";

  if (!isParticipant)
    throw createError(403, "Not a participant in this booking");

  successResponse(res, 200, "Chat room info fetched", { chatRoom: booking });
});

/** GET /api/bookings/:propertyId/review-eligibility */
export const checkReviewEligibility = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const userId = req.user._id;

  const eligibleBooking = await Booking.findOne({
    guest: userId,
    property: propertyId,
    status: "completed",
    guestReviewed: { $ne: true },
  }).sort({ createdAt: -1 });

  if (!eligibleBooking) {
    return successResponse(res, 200, "Not eligible to review", {
      isEligible: false,
      bookingId: null,
    });
  }

  successResponse(res, 200, "Eligible to review", {
    isEligible: true,
    bookingId: eligibleBooking._id,
  });
});
