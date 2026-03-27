import { Property } from "../models/Property.js";
import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";
import { Service } from "../models/Service.js";
import { Experience } from "../models/Experience.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import {
  sendSuccess,
  sendPaginated,
  getPaginationParams,
} from "../utils/responseUtils.js";
import {
  deleteMultipleFromCloudinary,
  extractPublicId,
} from "../config/cloudinary.js";

// Import your new recommendation service!
import * as recommendationService from "../services/recommendationService.js";

/**
 * GET /api/properties
 * Public: List approved properties with filtering
 */
export const getProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const {
    district,
    division,
    rentalType,
    minPrice,
    maxPrice,
    amenities,
    minRating,
    search,
    guestCapacity,
    propertyType,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = { status: "approved", deletedAt: null };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } }, // Search in title (case-insensitive)
      { "location.address": { $regex: search, $options: "i" } }, // Search in address
    ];
  }

  if (district) filter["location.district"] = district;
  if (division) filter["location.division"] = division;
  if (rentalType) filter.rentalType = rentalType;
  if (propertyType) filter.propertyType = propertyType;
  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
  }
  if (amenities) {
    const amenityList = amenities.split(",").map((a) => a.trim());
    filter.amenityNames = { $all: amenityList };
  }
  if (minRating) filter.averageRating = { $gte: Number(minRating) };
  if (guestCapacity) filter.guestCapacity = { $gte: Number(guestCapacity) };

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .select("-pendingChanges -availability -__v")
      .populate("host", "name avatar averageRating totalReviews")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(filter),
  ]);

  sendPaginated(res, properties, { page, limit, total });
});

/**
 * GET /api/properties/:id
 * Public: Get property details (Hosts & Admins can see unapproved properties)
 */
export const getProperty = asyncHandler(async (req, res) => {
  // 1. Fetch the property without strictly checking for "approved" status yet
  const property = await Property.findOne({
    _id: req.params.id,
    deletedAt: null,
  })
    .populate("host", "name avatar bio totalReviews averageRating createdAt")
    .lean();

  // 2. If it doesn't exist in the database at all
  if (!property) throw createError(404, "Property not found");

  // 3. Security/Visibility Check
  // If the property is NOT approved, we must ensure the user is allowed to see it
  if (property.status !== "approved") {
    const isHost =
      req.user && req.user._id.toString() === property.host._id.toString();
    const isAdmin = req.user && req.user.role === "admin";

    // If they aren't the host and aren't an admin, pretend it doesn't exist
    if (!isHost && !isAdmin) {
      throw createError(404, "Property not found");
    }
  }

  // 4. Increment view count (fire and forget - only counting public views)
  if (property.status === "approved") {
    Property.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).catch(
      () => {},
    );
  }

  sendSuccess(res, 200, "Property found", { property });
});
/**
 * POST /api/properties
 * Host: Create new property listing
 */
export const createProperty = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    propertyType,
    rentalType,
    pricePerNight,
    pricePerMonth,
    cleaningFee,
    securityDeposit,
    guestCapacity,
    bedrooms,
    bathrooms,
    beds,
    location,
    amenities,
    houseRules,
    instantBooking,
  } = req.body;

  const amenityNames = (amenities || []).map((a) =>
    typeof a === "string" ? a : a.name,
  );

  const property = await Property.create({
    host: req.user._id,
    title,
    description,
    propertyType,
    rentalType,
    pricePerNight: pricePerNight || 0,
    pricePerMonth: pricePerMonth || 0,
    cleaningFee: cleaningFee || 0,
    securityDeposit: securityDeposit || 0,
    guestCapacity,
    bedrooms,
    bathrooms,
    beds,
    location,
    amenities: amenities || [],
    amenityNames,
    houseRules: houseRules || {},
    instantBooking: instantBooking || false,
    status: "pending",
  });

  sendSuccess(res, 201, "Property submitted for admin approval", { property });
});

/**
 * PUT /api/properties/:id
 * Host: Update property (creates pendingChanges)
 */
export const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    host: req.user._id,
    deletedAt: null,
  });

  if (!property) throw createError(404, "Property not found or unauthorized");

  const allowedFields = [
    "title",
    "description",
    "pricePerNight",
    "pricePerMonth",
    "cleaningFee",
    "securityDeposit",
    "guestCapacity",
    "bedrooms",
    "bathrooms",
    "beds",
    "amenities",
    "amenityNames",
    "houseRules",
    "instantBooking",
    "location",
  ];

  const changes = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) changes[field] = req.body[field];
  });

  if (changes.amenities) {
    changes.amenityNames = changes.amenities.map((a) =>
      typeof a === "string" ? a : a.name,
    );
  }

  if (property.status === "pending") {
    Object.assign(property, changes);
    await property.save();
    return sendSuccess(res, 200, "Property updated", { property });
  }

  await Property.findByIdAndUpdate(req.params.id, {
    pendingChanges: changes,
    hasPendingChanges: true,
  });

  sendSuccess(res, 200, "Changes submitted for admin review", { property });
});

/**
 * POST /api/properties/:id/images
 * Host: Upload property images
 */
export const uploadPropertyImages = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    host: req.user._id,
  });
  if (!property) throw createError(404, "Property not found");
  if (!req.files || req.files.length === 0)
    throw createError(400, "No images provided");

  const newImages = req.files.map((file, index) => ({
    url: file.path,
    publicId: file.filename,
    isPrimary: property.images.length === 0 && index === 0,
  }));

  if (property.images.length + newImages.length > 20) {
    throw createError(400, "Maximum 20 images allowed per property");
  }

  property.images.push(...newImages);
  await property.save();

  sendSuccess(res, 200, "Images uploaded successfully", {
    images: property.images,
  });
});

/**
 * DELETE /api/properties/:id/images/:imageId
 * Host: Delete a property image
 */
export const deletePropertyImage = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    host: req.user._id,
  });
  if (!property) throw createError(404, "Property not found");

  const imageIndex = property.images.findIndex(
    (img) => img._id.toString() === req.params.imageId,
  );
  if (imageIndex === -1) throw createError(404, "Image not found");

  const image = property.images[imageIndex];
  await deleteMultipleFromCloudinary([image.publicId]).catch(() => {});
  property.images.splice(imageIndex, 1);

  if (
    property.images.length > 0 &&
    !property.images.some((img) => img.isPrimary)
  ) {
    property.images[0].isPrimary = true;
  }

  await property.save();
  sendSuccess(res, 200, "Image deleted", {});
});

/**
 * DELETE /api/properties/:id
 * Host: Request deletion (Pending Admin Approval)
 */
export const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw createError(404, "Property not found");

  const isOwner = property.host.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) throw createError(403, "Not authorized");

  if (isAdmin) {
    // 🗑️ HARD DELETE: Admin bypasses request and permanently deletes
    await Property.findByIdAndDelete(req.params.id);
    return sendSuccess(res, 200, "Property permanently deleted by admin");
  } else {
    // Host requests deletion
    if (property.deletionRequested) {
      throw createError(400, "Deletion request is already pending.");
    }
    property.deletionRequested = true;
    await property.save();
    return sendSuccess(res, 200, "Deletion requested. Pending admin approval.");
  }
});

/**
 * GET /api/properties/host/my-listings
 * Host: Get own listings
 */
export const getMyListings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status, type } = req.query; // 'type' comes from your frontend activeTab

  let Model;
  let filter = {};

  // 2. Determine which Model to use and how to identify the owner
  switch (type) {
    case "services":
      Model = Service;
      filter = { provider: req.user._id }; // Services usually use 'provider'
      break;
    case "experiences":
      Model = Experience;
      filter = { host: req.user._id };
      break;
    default:
      Model = Property;
      filter = { host: req.user._id };
  }

  if (status) filter.status = status;

  // 3. Perform the query
  const [listings, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);

  sendPaginated(res, listings, { page, limit, total });
});
/**
 * GET /api/properties/map
 * Map-based property search using geo queries
 */
export const getPropertiesForMap = asyncHandler(async (req, res) => {
  const { swLng, swLat, neLng, neLat, minPrice, maxPrice, rentalType } =
    req.query;

  if (!swLng || !swLat || !neLng || !neLat) {
    throw createError(400, "Map bounds required (swLng, swLat, neLng, neLat)");
  }

  const filter = {
    status: "approved",
    "location.coordinates": {
      $geoWithin: {
        $box: [
          [parseFloat(swLng), parseFloat(swLat)],
          [parseFloat(neLng), parseFloat(neLat)],
        ],
      },
    },
  };

  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
  }
  if (rentalType) filter.rentalType = rentalType;

  const properties = await Property.find(filter)
    .select(
      "title location pricePerNight pricePerMonth rentalType averageRating images guestCapacity",
    )
    .limit(100)
    .lean();

  sendSuccess(res, 200, "Map properties fetched", { properties });
});

/**
 * POST /api/properties/:id/availability
 * Host: Manually block dates
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { blockedDates } = req.body;
  const property = await Property.findOne({
    _id: req.params.id,
    host: req.user._id,
  });
  if (!property) throw createError(404, "Property not found");

  const bookedDates = property.availability.filter(
    (a) => a.reason === "booked",
  );
  const customBlocks = (blockedDates || []).map((d) => ({
    startDate: d.startDate,
    endDate: d.endDate,
    isBlocked: true,
    reason: d.reason || "unavailable",
  }));

  property.availability = [...bookedDates, ...customBlocks];
  await property.save();

  sendSuccess(res, 200, "Availability updated", {
    availability: property.availability,
  });
});

/**
 * POST /api/properties/:id/book
 * Guest: Initiate a property booking (Creates a pending booking)
 */
export const bookProperty = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, guestCount, specialRequests } = req.body;
  const propertyId = req.params.id; // Using ID from URL params
  const guestId = req.user._id;

  // 1. Validate Input
  if (!checkIn || !checkOut || !guestCount) {
    throw createError(
      400,
      "Please provide check-in, check-out, and guest count",
    );
  }

  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);

  if (startDate >= endDate) {
    throw createError(400, "Check-out date must be after check-in date");
  }

  if (startDate < new Date().setHours(0, 0, 0, 0)) {
    throw createError(400, "Cannot book dates in the past");
  }

  // 2. Fetch Property
  const property = await Property.findOne({
    _id: propertyId,
    status: "approved",
    deletedAt: null,
  });
  if (!property) throw createError(404, "Property not found or unavailable");

  // 3. Capacity Check
  if (guestCount > property.guestCapacity) {
    throw createError(
      400,
      `This property accommodates a maximum of ${property.guestCapacity} guests`,
    );
  }

  // 4. Availability Check (Using the static method from your Booking Model)
  // This checks for overlapping "confirmed" or "pending" bookings
  const isAvailable = await Booking.checkPropertyAvailability(
    propertyId,
    startDate,
    endDate,
  );
  if (!isAvailable) {
    throw createError(409, "These dates are already booked by another guest");
  }

  // 5. Host Block Check (Using the instance method from your Property Model)
  // This checks your property.availability array for manual host blocks
  const isNotBlocked = property.isAvailableForDates(startDate, endDate);
  if (!isNotBlocked) {
    throw createError(409, "The host has manually blocked these dates");
  }

  // 6. Pricing Logic
  const diffTime = Math.abs(endDate - startDate);
  const nightCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (nightCount < property.houseRules.minimumStay) {
    throw createError(
      400,
      `Minimum stay is ${property.houseRules.minimumStay} nights`,
    );
  }

  const basePriceTotal = property.pricePerNight * nightCount;

  // Example fee logic (Adjust percentages as needed for your business)
  const serviceFee = parseFloat((basePriceTotal * 0.03).toFixed(2)); // 3% Platform fee
  const taxes = parseFloat((basePriceTotal * 0.05).toFixed(2)); // 5% Tax

  const subtotal =
    basePriceTotal + (property.cleaningFee || 0) + serviceFee + taxes;

  // 7. Create the Booking
  // Note: your Booking Schema pre-save hook automatically calculates:
  // adminCommission and providerEarning based on the commissionRate (default 10)
  const booking = await Booking.create({
    guest: guestId,
    host: property.host,
    bookingType: "property",
    property: propertyId,
    checkIn: startDate,
    checkOut: endDate,
    guestCount,
    specialRequests,
    priceBreakdown: {
      basePrice: property.pricePerNight,
      quantity: nightCount,
      cleaningFee: property.cleaningFee || 0,
      serviceFee: serviceFee,
      taxes: taxes,
      subtotal: subtotal,
    },
    totalAmount: subtotal,
    commissionRate: 10, // Platform take
  });

  sendSuccess(res, 201, "Booking created. Please complete payment.", {
    bookingId: booking._id,
    bookingReference: booking.bookingReference,
    totalAmount: booking.totalAmount,
  });
});

// RECOMMENDATION ENDPOINTS

/**
 * GET /api/properties/:id/similar
 * Public: Get similar properties for the details page
 */
export const getSimilarPropertiesHandler = asyncHandler(async (req, res) => {
  const similar = await recommendationService.getSimilarProperties(
    req.params.id,
  );
  sendSuccess(res, 200, "Similar properties fetched", { properties: similar });
});

/**
 * GET /api/properties/feed/destinations
 * Public: Get popular destinations for the homepage
 */
export const getPopularDestinationsHandler = asyncHandler(async (req, res) => {
  const destinations = await recommendationService.getPopularDestinations();
  sendSuccess(res, 200, "Popular destinations fetched", { destinations });
});

/**
 * GET /api/properties/feed/recommendations
 * Public/Private: Get personalized or general popular properties for homepage
 */
export const getRecommendedPropertiesHandler = asyncHandler(
  async (req, res) => {
    let properties = [];

    // If the user is logged in, try to get personalized recommendations based on booking history
    if (req.user) {
      properties = await recommendationService.getPersonalizedRecommendations(
        req.user._id,
        req.user.address?.district || "Dhaka", // Fallback district
      );
    }

    // If user is a guest, or if they have no booking history yielding recommendations, fallback to popular ones
    if (!properties || properties.length === 0) {
      properties = await recommendationService.getPopularProperties();
    }

    sendSuccess(res, 200, "Recommendations fetched", { properties });
  },
);
