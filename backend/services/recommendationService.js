/**
 * Recommendation Service
 */
import { Property } from "../models/Property.js";
import { Booking } from "../models/Booking.js";

/**
 * Get recommendations for a user based on their booking history
 */
export const getPersonalizedRecommendations = async (
  userId,
  userDistrict,
  limit = 6,
) => {
  try {
    const userBookings = await Booking.find({
      guest: userId,
      status: "completed",
    })
      .populate("property", "location pricePerNight amenityNames")
      .limit(10)
      .lean();

    let preferredDistricts = [userDistrict];
    let avgPrice = 2000;

    if (userBookings.length > 0) {
      const districts = userBookings
        .filter((b) => b.property?.location?.district)
        .map((b) => b.property.location.district);
      preferredDistricts = [...new Set([...preferredDistricts, ...districts])];

      const prices = userBookings
        .filter((b) => b.property?.pricePerNight)
        .map((b) => b.property.pricePerNight);
      if (prices.length > 0) {
        avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }

    const priceMin = avgPrice * 0.85; // -15%
    const priceMax = avgPrice * 1.15; // +15%
    const recommendations = await Property.find({
      status: "approved",
      $or: [
        { "location.district": { $in: preferredDistricts } },
        { pricePerNight: { $gte: priceMin, $lte: priceMax } },
      ],
    })
      .select(
        "title images location pricePerNight pricePerMonth rentalType averageRating totalBookings guestCapacity amenityNames",
      )
      .populate("host", "name avatar")
      .sort({ averageRating: -1, totalBookings: -1 })
      .limit(limit)
      .lean();

    return recommendations;
  } catch (err) {
    console.error("Recommendation error:", err);
    return [];
  }
};

/**
 * Get popular properties
 */
export const getPopularProperties = async (limit = 8) => {
  return Property.find({ status: "approved" })
    .select(
      "title images location pricePerNight pricePerMonth rentalType averageRating totalBookings guestCapacity",
    )
    .populate("host", "name avatar")
    .sort({ totalBookings: -1, averageRating: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get similar properties (same district, similar price)
 */
export const getSimilarProperties = async (propertyId, limit = 4) => {
  const property = await Property.findById(propertyId).lean();
  if (!property) return [];

  const priceField =
    property.rentalType === "long_term" ? "pricePerMonth" : "pricePerNight";
  const basePrice = property[priceField] || 0;
  const priceMin = basePrice * 0.85;
  const priceMax = basePrice * 1.15;

  return Property.find({
    _id: { $ne: propertyId },
    status: "approved",
    "location.district": property.location.district,
    [priceField]: { $gte: priceMin, $lte: priceMax },
  })
    .select(
      "title images location pricePerNight pricePerMonth rentalType averageRating totalBookings guestCapacity",
    )
    .populate("host", "name avatar")
    .sort({ averageRating: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get featured/popular destinations (by district)
 */
export const getPopularDestinations = async () => {
  return Property.aggregate([
    { $match: { status: "approved" } },
    {
      $group: {
        _id: "$location.district",
        count: { $sum: 1 },
        avgPrice: { $avg: "$pricePerNight" },
        avgRating: { $avg: "$averageRating" },
        totalBookings: { $sum: "$totalBookings" },
        sampleImage: { $first: { $arrayElemAt: ["$images.url", 0] } },
      },
    },
    { $sort: { totalBookings: -1, count: -1 } },
    { $limit: 8 },
    {
      $project: {
        district: "$_id",
        _id: 0,
        count: 1,
        avgPrice: { $round: ["$avgPrice", 0] },
        avgRating: { $round: ["$avgRating", 1] },
        totalBookings: 1,
        sampleImage: 1,
      },
    },
  ]);
};
