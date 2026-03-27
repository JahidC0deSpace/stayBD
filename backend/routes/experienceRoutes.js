import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { canCreateListing } from "../middleware/roleMiddleware.js";
import { uploadServiceImages } from "../config/cloudinary.js";
import {
  getExperiences,
  getExperienceById,
  createExperience,
  updateExperience,
  deleteExperience,
  getMyExperiences,
  bookExperience,
  approveExperience,
  getAdminExperiences,
  handleExperienceDeletionRequest,
} from "../controllers/experienceController.js";
import { Experience } from "../models/Experience.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { sendSuccess } from "../utils/responseUtils.js";

const router = express.Router();

router.get("/", getExperiences);
router.get("/admin/all", protect, isAdmin, getAdminExperiences);

router.get("/provider/my-experiences", protect, getMyExperiences);
router.post("/", protect, canCreateListing, createExperience);

router.put(
  "/:id",
  protect,
  canCreateListing,
  uploadServiceImages.array("images", 5),
  updateExperience,
);

router.delete("/:id", protect, canCreateListing, deleteExperience);
router.get("/:id", getExperienceById);

router.post("/:id/book", protect, bookExperience);

router.patch("/:id/approve", protect, isAdmin, approveExperience);
// Make sure to use your admin middleware here!
router.patch(
  "/:id/deletion-request",
  protect,
  isAdmin,
  handleExperienceDeletionRequest,
);
// ─── IMAGE UPLOADS (Inline Controller) ───────────────────────────────────────
// ─── IMAGE UPLOADS ───────────────────────────────────────
router.post(
  "/:id/images",
  protect,
  canCreateListing,
  uploadServiceImages.array("images", 5),
  asyncHandler(async (req, res) => {
    // 👇 FIX 1: We must query by 'host', NOT 'provider'
    const experience = await Experience.findOne({
      _id: req.params.id,
      host: req.user._id,
    });

    // 👇 FIX 2: Updated the error message so it makes sense!
    if (!experience) throw createError(404, "Experience not found");

    const newImages = req.files.map((f) => ({
      url: f.path,
      publicId: f.filename,
    }));

    experience.images.push(...newImages);
    await experience.save();

    sendSuccess(res, 200, "Images uploaded successfully", {
      images: experience.images,
    });
  }),
);
export default router;
