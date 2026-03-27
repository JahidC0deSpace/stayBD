import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/authMiddleware.js"; // Import the new guard!
import {
  getUsers,
  verifyUser,
  approveUser,
  banUser,
  changeUserRole,
  getAdminProperties,
  approveProperty,
  approveService,
  getAdminBookings,
  updateUserFull,
  reviewChanges,
  getAdminServices,
  handlePropertyDeletionRequest,
  handleServiceDeletionRequest,
  adminDeleteProperty,
  adminDeleteService,
  adminDeleteExperience,
  getAllBookings,
} from "../controllers/adminController.js";

const router = express.Router();

// 🔒 Apply BOTH protect (logged in) and isAdmin (admin role) to ALL routes below
router.use(protect, isAdmin);

// ─── USER ROUTES ──────────────────────────────────────────────────────────
router.get("/users", getUsers);
router.patch("/users/:id/verify", verifyUser);
router.patch("/users/:id/approve", approveUser);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/role", changeUserRole);
router.put("/users/:id", updateUserFull);

//  PROPERTY & SERVICE ROUTES
router.get("/properties", getAdminProperties);
router.patch("/properties/:id/approve", approveProperty);
router.patch("/properties/:id/review-changes", reviewChanges); // Uncomment when ready

router.get("/services", getAdminServices);
router.patch("/services/:id/approve", approveService);

router.patch(
  "/properties/:id/deletion-request",
  protect,
  isAdmin,
  handlePropertyDeletionRequest,
);
router.patch(
  "/services/:id/deletion-request",
  protect,
  isAdmin,
  handleServiceDeletionRequest,
);

router.delete("/admin/properties/:id", protect, isAdmin, adminDeleteProperty);
router.delete("/admin/services/:id", protect, isAdmin, adminDeleteService);
router.delete(
  "/admin/experiences/:id",
  protect,
  isAdmin,
  adminDeleteExperience,
);

//  BOOKING & ANALYTICS ROUTES
router.get("/bookings", getAdminBookings);
router.get("/all-bookings", getAllBookings);
// router.get("/analytics", getAnalytics);

export default router;
