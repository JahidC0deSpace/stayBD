import express from "express";
import { User } from "../models/User.js"; // Standardized default import
import { asyncHandler, createError } from "../utils/errorUtils.js";
import {
  getMe,
  updateMe,
  completeProfile,
  getUserById,
  switchRole,
  toggleWishlist,
  // getNotifications,
} from "../controllers/userController.js";
import {
  verifyFirebaseTokenOnly,
  protect,
} from "../middleware/authMiddleware.js";
import { uploadAvatar } from "../config/cloudinary.js";

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────

/**
 * GET /api/users/public/:id
 * Used for viewing Host/Provider profiles (ratings, bio, etc.)
 */
router.get("/public/:id", getUserById);

// ─── FIREBASE AUTH SYNC ─────────────────────────────────────────────────────

/**
 * POST /api/users/sync
 * Syncs Firebase user data with MongoDB on initial login
 */
router.post(
  "/sync",
  verifyFirebaseTokenOnly,
  asyncHandler(async (req, res) => {
    const {
      uid,
      email,
      name,
      phone,
      address,
      nationalIdNumber,
      authProvider,
      role,
    } = req.body;

    if (req.user.uid !== uid) {
      throw createError(403, "Unauthorized profile sync");
    }

    // 1. Find the user first to check their status
    let user = await User.findOne({ firebaseUID: req.user.uid });

    // 2. CHECK BAN STATUS (If user exists)
    if (user && user.isBanned) {
      return res.status(403).json({
        message: "This account is banned. Please use another email.",
      });
    }

    // 3. Proceed with Update or Create (Upsert)
    const isGuest = role?.toLowerCase() === "guest";
    user = await User.findOneAndUpdate(
      { firebaseUID: req.user.uid },
      {
        $set: {
          firebaseUID: req.user.uid,
          email,
          name,
          phone,
          address,
          nationalIdNumber,
          authProvider,
        },
        $setOnInsert: {
          role: role ? role.toLowerCase() : "guest",
          isVerified: isGuest,
        },
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json(user);
  }),
);

// ─── PROTECTED ROUTES (Requires Login) ──────────────────────────────────────

router.use(protect); // Middleware to protect all routes below

// Get personal detailed profile
router.get("/me", getMe);

// Update personal profile fields
router.patch("/updateMe", uploadAvatar.single("avatar"), updateMe);
// Onboarding completion
router.post("/complete-profile", completeProfile);

// Role switching (Guest <-> Host)
router.put("/switch-role", switchRole);

// Wishlist management
router.post("/wishlist/:itemId", toggleWishlist);

// Notifications
// router.get("/notifications", getNotifications);

/**
 * GET /api/users/:id (LEGACY)
 * Preserved for frontend compatibility, fetches by Firebase UID
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    // 🔒 SECURITY: Only allows fetching own profile via Firebase UID
    if (req.user.firebaseUID !== req.params.id) {
      throw createError(403, "Unauthorized access to profile");
    }
    res.status(200).json(req.user);
  }),
);

export default router;
