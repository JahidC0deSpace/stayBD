import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  uploadPropertyImages,
  deletePropertyImage,
  deleteProperty,
  getMyListings,
  getPropertiesForMap,
  updateAvailability,
  getSimilarPropertiesHandler,
  getPopularDestinationsHandler,
  getRecommendedPropertiesHandler,
  bookProperty,
} from "../controllers/propertyController.js";
import { protect, optionalAuth } from "../middleware/authMiddleware.js";
import { canCreateListing } from "../middleware/roleMiddleware.js";
import { uploadPropertyImages as multerUpload } from "../config/cloudinary.js";

const router = express.Router();

// ─── Public Feeds & Maps (Must go before /:id to prevent route collision) ───
router.get("/feed/destinations", getPopularDestinationsHandler);
// Using optionalAuth so logged-in users get personalized feeds, but guests still get popular ones
router.get(
  "/feed/recommendations",
  optionalAuth,
  getRecommendedPropertiesHandler,
);
router.get("/map", getPropertiesForMap);

// ─── Host-Only GET Routes (Must be before /:id) ─────────────────────────────
router.get("/host/my-listings", protect, canCreateListing, getMyListings);

// ─── General Public Routes ──────────────────────────────────────────────────
router.get("/", optionalAuth, getProperties);

// ─── Dynamic Public Routes ──────────────────────────────────────────────────
router.get("/:id", optionalAuth, getProperty);
router.get("/:id/similar", getSimilarPropertiesHandler);

// ─── Protected Routes (Host Only) ───────────────────────────────────────────
router.post("/:id/book", protect, bookProperty);
router.post("/", protect, canCreateListing, createProperty);
router.put("/:id", protect, canCreateListing, updateProperty);
router.delete("/:id", protect, canCreateListing, deleteProperty);
router.post(
  "/:id/images",
  protect,
  canCreateListing,
  multerUpload.array("images", 10),
  uploadPropertyImages,
);
router.delete(
  "/:id/images/:imageId",
  protect,
  canCreateListing,
  deletePropertyImage,
);
router.post("/:id/availability", protect, canCreateListing, updateAvailability);

export default router;
