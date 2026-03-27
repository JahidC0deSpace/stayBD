// backend/routes/paymentRoutes.js
import express from "express";
import {
  createCheckoutSession,
  verifyPayment,
  getMyTransactions,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

//  CHECKOUT ROUTE (Requires Auth)
router.post("/create-checkout-session", protect, createCheckoutSession);

//  VERIFY SESSION ROUTE (Requires Auth)
router.get("/verify-session", protect, verifyPayment);

//  TRANSACTION HISTORY (Requires Auth)
// Returns all transactions where the logged-in user is the payee (host/provider)
// or the payer (guest). Used by HostEarningsPage.
router.get("/my-transactions", protect, getMyTransactions);

export default router;
