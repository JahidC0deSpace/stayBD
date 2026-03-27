import express from "express";
import { Property } from "../models/Property.js";
import { Service } from "../models/Service.js";
import { Experience } from "../models/Experience.js";
import { asyncHandler } from "../utils/errorUtils.js";
import { sendSuccess } from "../utils/responseUtils.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/search/recommendations
 * Get personalized, popular, and trending properties
 * Public (Optional Auth)
 */
router.get(
  "/recommendations",
  optionalAuth,
  asyncHandler(async (req, res) => {
    // 1. Fetch Popular Properties (Highest rating/bookings)
    const popular = await Property.find({ status: "approved", deletedAt: null })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(8)
      .select("title images location pricePerNight averageRating guestCapacity")
      .lean();

    // 2. Fetch Popular Destinations (Based on property count per district)
    const destinations = await Property.aggregate([
      { $match: { status: "approved", deletedAt: null } },
      {
        $group: {
          _id: "$location.district",
          count: { $sum: 1 },
          thumbnail: { $first: "$images.0.url" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // 3. For You (Personalized logic if user is logged in)
    let forYou = [];
    if (req.user) {
      forYou = await Property.find({
        status: "approved",
        deletedAt: null,
        "location.district": req.user.address?.district || "Dhaka",
      })
        .limit(4)
        .select("title images location pricePerNight averageRating")
        .lean();
    }

    sendSuccess(res, 200, "Recommendations fetched successfully", {
      popular,
      destinations,
      forYou: forYou.length > 0 ? forYou : popular.slice(0, 4),
    });
  }),
);

/**
 *  GET /api/search/districts
 *  Get all districts with property counts
 */
router.get(
  "/districts",
  asyncHandler(async (req, res) => {
    const districts = await Property.distinct("location.district", {
      status: "approved",
      deletedAt: null,
    });

    sendSuccess(res, 200, "Districts fetched", { districts: districts.sort() });
  }),
);

/**
 * GET /api/search
 * Unified search across Properties, Services, and Experiences
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      type = "properties",
      q,
      district,
      minPrice,
      maxPrice,
      rentalType,
      guestCapacity,
      category,
      page = 1,
      limit = 12,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. Base Filter
    const filter = {
      status: { $in: ["approved", "pending"] },
      deletedAt: null,
    };

    // 2. Keyword Search
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    // 3. Dynamic Field Mapping based on Schema type
    let Model;
    let selectFields = "title images averageRating category status";
    let priceField = "";
    let locationField = "";
    let hostField = "";

    if (type === "properties") {
      Model = Property;
      priceField = "pricePerNight";
      locationField = "location.district";
      hostField = "host";
      selectFields += " pricePerNight rentalType guestCapacity location";

      if (rentalType) filter.rentalType = rentalType;
      if (guestCapacity) filter.guestCapacity = { $gte: Number(guestCapacity) };
    } else if (type === "services") {
      Model = Service;
      priceField = "pricePerHour";
      locationField = "serviceArea.districts";
      hostField = "provider";
      selectFields += " pricePerHour serviceArea";

      if (category) filter.category = category;
    } else if (type === "experiences") {
      Model = Experience;
      priceField = "pricePerPerson";
      locationField = "location.district";
      hostField = "host";
      selectFields += " pricePerPerson durationHours location";

      if (category) filter.category = category;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid search type" });
    }

    // 4. Apply Location & Price using dynamic field names
    if (district) {
      filter[locationField] = district;
    }

    if (minPrice || maxPrice) {
      filter[priceField] = {};
      if (minPrice) filter[priceField].$gte = Number(minPrice);
      if (maxPrice) filter[priceField].$lte = Number(maxPrice);
    }

    // 5. Execute Query
    const [results, total] = await Promise.all([
      Model.find(filter)
        .select(selectFields)
        .populate(hostField, "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Model.countDocuments(filter),
    ]);

    sendSuccess(res, 200, `${type} search results fetched`, {
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  }),
);

export default router;
