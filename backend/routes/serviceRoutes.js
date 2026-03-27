import express from "express";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getMyServices,
  bookService,
  getAdminServices,
  approveAdminService,
} from "../controllers/serviceController.js";
import { Service } from "../models/Service.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { sendSuccess } from "../utils/responseUtils.js";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import { canCreateListing } from "../middleware/roleMiddleware.js";
import { uploadServiceImages } from "../config/cloudinary.js";

const router = express.Router();

//  PUBLIC LISTING
router.get("/", getServices);

//  SPECIFIC PROVIDER ROUTES
router.get("/provider/my-services", protect, getMyServices);

//  PARAMETRIC ROUTES
router.get("/:id", getServiceById);

//  GUEST ROUTES (Booking)
// Anyone logged in can book a service
router.post("/:id/book", protect, bookService);

//  PROTECTED PROVIDER ROUTES
router.post("/", protect, canCreateListing, createService);
router.put("/:id", protect, canCreateListing, updateService);
router.delete("/:id", protect, canCreateListing, deleteService);

router.get("/admin/all", protect, isAdmin, getAdminServices);
router.patch("/:id/approve", protect, isAdmin, approveAdminService);
//  IMAGE UPLOADS (Inline Controller)
router.post(
  "/:id/images",
  protect,
  canCreateListing,
  uploadServiceImages.array("images", 5),
  asyncHandler(async (req, res) => {
    const service = await Service.findOne({
      _id: req.params.id,
      provider: req.user._id,
    });

    if (!service) throw createError(404, "Service not found");

    const newImages = req.files.map((f) => ({
      url: f.path,
      publicId: f.filename,
    }));

    service.images.push(...newImages);
    await service.save();

    sendSuccess(res, 200, "Images uploaded", { images: service.images });
  }),
);

export default router;
