// backend/routes/bookingRoutes.js
import express from "express";
import {
  getMyBookings,
  getBooking,
  updateBookingStatus,
  cancelBookingHandler,
  processEarlyCheckoutHandler,
  requestEarlyCheckout,
  approveEarlyCheckout,
  rejectEarlyCheckout,
  completeBooking,
  getChatRoom,
  createPropertyBookingHandler,
  createServiceBookingHandler,
  checkReviewEligibility,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ─── List routes (no :id) ─────────────────────────────────────────────────────
router.get("/my-bookings", protect, getMyBookings);
router.get(
  "/host/my-bookings",
  protect,
  restrictTo("host", "service_provider", "admin"),
  getMyBookings,
);

// ─── Create routes ─────────────────────────────────────────────────────────────
router.post("/property", protect, createPropertyBookingHandler);
router.post("/service", protect, createServiceBookingHandler);

// ─── :id/action routes (MUST come before /:id) ────────────────────────────────

// Early checkout — 3-step flow: host requests → admin approves or rejects
router.post(
  "/:id/early-checkout-request",
  protect,
  restrictTo("host"),
  requestEarlyCheckout, // ← NEW: host submits request, no unlock yet
);
router.patch(
  "/:id/early-checkout-approve",
  protect,
  restrictTo("admin"),
  approveEarlyCheckout, // ← NEW: admin approves → property unlocked
);
router.patch(
  "/:id/early-checkout-reject",
  protect,
  restrictTo("admin"),
  rejectEarlyCheckout, // ← NEW: admin rejects → booking stays confirmed
);

// Legacy direct early checkout (admin only, still works)
router.post(
  "/:id/early-checkout",
  protect,
  restrictTo("admin"),
  processEarlyCheckoutHandler,
);

router.patch("/:id/cancel", protect, cancelBookingHandler);
router.patch(
  "/:id/status",
  protect,
  restrictTo("host", "service_provider", "admin"),
  updateBookingStatus,
);
router.patch(
  "/:id/complete",
  protect,
  restrictTo("host", "service_provider", "admin"),
  completeBooking,
);
router.get("/:id/chat-room", protect, getChatRoom);

// ─── Generic /:id LAST ─────────────────────────────────────────────────────────
router.get("/:propertyId/review-eligibility", protect, checkReviewEligibility);
router.get("/:id", protect, getBooking);

export default router;
