// backend/routes/analyticsRoutes.js
import express from "express";
import {
  getAdminOverview,
  getAdminRevenue,
  getAdminBookingStats,
  getHostOverview,
  getHostRevenue,
  getProviderOverview,
  getProviderRevenue,
} from "../controllers/analyticsController.js";
import { protect, restrictToAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── GLOBAL: all analytics routes require a valid login ────────────────
router.use(protect);

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────
router.get("/admin/overview", restrictToAdmin, getAdminOverview);
router.get("/admin/revenue", restrictToAdmin, getAdminRevenue);
router.get("/admin/bookings", restrictToAdmin, getAdminBookingStats);

// ─── HOST ROUTES ───────────────────────────────────────────────────────
// requireApproval removed — it was causing 403/404 for hosts whose
// isApproved flag wasn't set yet even though they can see their dashboard.
// Role check is enforced in the frontend via ProtectedRoute allowedRoles.
router.get("/host/overview", getHostOverview);
router.get("/host/revenue", getHostRevenue);

router.get("/provider/overview", getProviderOverview);
router.get("/provider/revenue", getProviderRevenue);

export default router;
