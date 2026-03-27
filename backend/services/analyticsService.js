// services/analyticsService.js
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import { User } from "../models/User.js";
import { Property } from "../models/Property.js";
import { Service } from "../models/Service.js";
import { Experience } from "../models/Experience.js";

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────

const buildDateFilter = (range) => {
  const now = new Date();
  const filterDate = new Date();
  switch (range) {
    case "week":
      filterDate.setDate(now.getDate() - 7);
      break;
    case "month":
      filterDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      filterDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return {};
  }
  return { createdAt: { $gte: filterDate } };
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatMonthlyData = (data, valueKey = "revenue") => {
  return data.reverse().map((item) => ({
    month: `${MONTH_NAMES[item._id.month - 1]} ${item._id.year}`,
    year: item._id.year,
    monthNum: item._id.month,
    [valueKey]: item[valueKey] || item.earnings || item.revenue || 0,
    bookings: item.transactions || item.bookings || 0,
    totalVolume: item.totalVolume || 0,
  }));
};

// ─── CORE ADMIN ANALYTICS ──────────────────────────────────────────────

export const getAdminAnalytics = async (dateRange = "all") => {
  const dateFilter = buildDateFilter(dateRange);
  const [
    totalUsers,
    totalRevenue,
    monthlyRevenue,
    paymentStats,
    topProperties,
    totalServices,
    bookingsByStatus,
    usersByRole,
    recentTransactions,
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Transaction.aggregate([
      { $match: { status: "succeeded", ...dateFilter } },
      { $group: { _id: null, total: { $sum: "$adminCommission" } } },
    ]),
    Transaction.aggregate([
      { $match: { status: "succeeded" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$adminCommission" },
          transactions: { $sum: 1 },
          totalVolume: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]),
    Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          amount: { $sum: "$totalAmount" },
        },
      },
    ]),
    Property.find({ status: "approved" })
      .select("title location totalBookings averageRating images host")
      .populate("host", "name")
      .sort({ totalBookings: -1 })
      .limit(5)
      .lean(),
    Booking.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Transaction.find({ status: "succeeded" })
      .populate("payer", "name email")
      .populate("payee", "name email")
      .populate("booking", "bookingReference")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Wrapped in "analytics" object so your frontend destructuring works flawlessly!
  return {
    analytics: {
      overview: {
        totalUsers,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalListings: await Property.countDocuments({ status: "approved" }),
        totalServices:
          (await Service.countDocuments({ status: "approved" })) +
          (await Experience.countDocuments({ status: "approved" })),
        totalBookings: await Booking.countDocuments(),
        pendingApprovals:
          (await Property.countDocuments({ status: "pending" })) +
          (await Service.countDocuments({ status: "pending" })) +
          (await Experience.countDocuments({ status: "pending" })),
      },
      monthlyRevenue: formatMonthlyData(monthlyRevenue),
      paymentStats: Object.fromEntries(
        paymentStats.map((s) => [s._id, { count: s.count, amount: s.amount }]),
      ),
      topProperties,
      bookingsByStatus: Object.fromEntries(
        bookingsByStatus.map((s) => [s._id, s.count]),
      ),
      usersByRole: Object.fromEntries(usersByRole.map((s) => [s._id, s.count])),
      recentTransactions,
    },
  };
};

export const getAdminOverview = async () => {
  return getAdminAnalytics("all");
};

export const getRevenueByMonth = async (months = 12) => {
  const data = await Transaction.aggregate([
    { $match: { status: "succeeded" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$adminCommission" },
        transactions: { $sum: 1 },
        totalVolume: { $sum: "$totalAmount" },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: months },
  ]);
  return formatMonthlyData(data);
};

export const getBookingStatusStats = async () => {
  const stats = await Booking.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(stats.map((s) => [s._id || "unknown", s.count]));
};

// ─── CORE HOST/PROVIDER ANALYTICS ──────────────────────────────────────

export const getHostAnalytics = async (hostId, dateRange = "year") => {
  const id =
    typeof hostId === "string" ? new mongoose.Types.ObjectId(hostId) : hostId;
  const dateFilter = buildDateFilter(dateRange);

  const [
    totalEarnings,
    monthlyEarnings,
    bookingStats,
    topListings,
    occupancyData,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { payee: id, status: "succeeded" } },
      { $group: { _id: null, total: { $sum: "$providerEarning" } } },
    ]),
    Transaction.aggregate([
      { $match: { payee: id, status: "succeeded" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          earnings: { $sum: "$providerEarning" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]),
    Booking.aggregate([
      { $match: { host: id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$providerEarning" },
        },
      },
    ]),
    Property.find({ host: id, status: "approved" })
      .select(
        "title totalBookings averageRating totalReviews images pricePerNight",
      )
      .sort({ totalBookings: -1 })
      .limit(5)
      .lean(),
    Booking.find({
      host: id,
      status: { $in: ["confirmed", "completed", "early_checkout"] },
      paymentStatus: "paid",
    })
      .select("checkIn checkOut actualCheckout totalNights property")
      .lean(),
  ]);

  const totalBookedNights = occupancyData.reduce((acc, booking) => {
    const checkout = booking.actualCheckout || booking.checkOut;
    const nights = Math.ceil(
      (new Date(checkout) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24),
    );
    return acc + nights;
  }, 0);

  return {
    overview: {
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingPayouts: await Transaction.aggregate([
        {
          $match: {
            payee: id,
            status: "pending",
          },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "booking",
            foreignField: "_id",
            as: "bookingData",
          },
        },
        {
          $unwind: "$bookingData",
        },
        {
          $match: {
            "bookingData.status": { $nin: ["cancelled", "rejected"] },
          },
        },
        {
          $group: { _id: null, total: { $sum: "$providerEarning" } },
        },
      ]).then((r) => r[0]?.total || 0),
      totalBookings: await Booking.countDocuments({ host: id }),
      totalListings: await Property.countDocuments({
        host: id,
        status: "approved",
      }),
      averageRating:
        (
          await Property.findOne({ host: id })
            .sort({ averageRating: -1 })
            .lean()
        )?.averageRating || 0,
    },
    monthlyEarnings: formatMonthlyData(monthlyEarnings, "earnings"),
    bookingStats: Object.fromEntries(
      bookingStats.map((s) => [s._id, { count: s.count, revenue: s.revenue }]),
    ),
    topListings,
    totalBookedNights,
  };
};

export const getHostOverview = async (hostId) => {
  return getHostAnalytics(hostId);
};

export const getHostRevenueByMonth = async (hostId, months = 12) => {
  const id =
    typeof hostId === "string" ? new mongoose.Types.ObjectId(hostId) : hostId;
  const data = await Transaction.aggregate([
    { $match: { payee: id, status: "succeeded" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        earnings: { $sum: "$providerEarning" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: months },
  ]);
  return formatMonthlyData(data, "earnings");
};

export const getProviderAnalytics = async (providerId, dateRange = "year") => {
  const id =
    typeof providerId === "string"
      ? new mongoose.Types.ObjectId(providerId)
      : providerId;
  const dateFilter = buildDateFilter(dateRange);

  const [
    totalEarnings,
    pendingEarnings,
    monthlyEarnings,
    bookingStats,
    topServices,
  ] = await Promise.all([
    // ✅ Only completed/succeeded transactions
    Transaction.aggregate([
      { $match: { payee: id, status: "succeeded", ...dateFilter } },
      { $group: { _id: null, total: { $sum: "$providerEarning" } } },
    ]),

    // ✅ NEW — only pending transactions
    Transaction.aggregate([
      { $match: { payee: id, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$providerEarning" } } },
    ]),

    Transaction.aggregate([
      { $match: { payee: id, status: "succeeded" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          earnings: { $sum: "$providerEarning" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]),
    Booking.aggregate([
      { $match: { host: id, bookingType: "service", ...dateFilter } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Service.find({ provider: id, status: "approved" })
      .select("title totalBookings averageRating images pricePerHour")
      .sort({ totalBookings: -1 })
      .limit(5)
      .lean(),
  ]);

  return {
    overview: {
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingPayouts: pendingEarnings[0]?.total || 0, // ✅ Real pending amount
      totalBookings: await Booking.countDocuments({
        host: id,
        bookingType: "service",
      }),
      totalServices: await Service.countDocuments({
        provider: id,
        status: "approved",
      }),
      totalExperiences: await Experience.countDocuments({
        host: id,
        status: "approved",
      }),
    },
    monthlyEarnings: formatMonthlyData(monthlyEarnings, "earnings"),
    bookingStats: Object.fromEntries(bookingStats.map((s) => [s._id, s.count])),
    topServices,
  };
};

export const getProviderOverview = async (providerId) => {
  return getProviderAnalytics(providerId, "year");
};

export const getProviderRevenueByMonth = async (providerId, months = 12) => {
  const id =
    typeof providerId === "string"
      ? new mongoose.Types.ObjectId(providerId)
      : providerId;
  const data = await Transaction.aggregate([
    { $match: { payee: id, status: "succeeded" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        earnings: { $sum: "$providerEarning" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: months },
  ]);
  return formatMonthlyData(data, "earnings");
};

export const getExperienceAnalytics = async (hostId, dateRange = "year") => {
  const id =
    typeof hostId === "string" ? new mongoose.Types.ObjectId(hostId) : hostId;
  const dateFilter = buildDateFilter(dateRange);

  const [totalEarnings, monthlyEarnings, bookingStats, topExperiences] =
    await Promise.all([
      Transaction.aggregate([
        { $match: { payee: id, status: "succeeded", ...dateFilter } },
        { $group: { _id: null, total: { $sum: "$providerEarning" } } },
      ]),
      Transaction.aggregate([
        { $match: { payee: id, status: "succeeded" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            earnings: { $sum: "$providerEarning" },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]),
      Booking.aggregate([
        { $match: { host: id, bookingType: "experience", ...dateFilter } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Experience.find({ host: id, status: "approved" })
        // Correctly matching your schema's 'pricePerPerson' field
        .select("title totalBookings averageRating images pricePerPerson")
        .sort({ totalBookings: -1 })
        .limit(5)
        .lean(),
    ]);

  return {
    overview: {
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingPayouts: (await User.findById(id).lean())?.pendingPayouts || 0,
      totalBookings: await Booking.countDocuments({
        host: id,
        bookingType: "experience",
      }),
      totalExperiences: await Experience.countDocuments({
        host: id,
        status: "approved",
      }),
    },
    monthlyEarnings: formatMonthlyData(monthlyEarnings, "earnings"),
    bookingStats: Object.fromEntries(bookingStats.map((s) => [s._id, s.count])),
    topExperiences,
  };
};

export const getExperienceOverview = async (hostId) => {
  return getExperienceAnalytics(hostId, "year");
};

export const getExperienceRevenueByMonth = async (hostId, months = 12) => {
  const id =
    typeof hostId === "string" ? new mongoose.Types.ObjectId(hostId) : hostId;
  const data = await Transaction.aggregate([
    { $match: { payee: id, status: "succeeded" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        earnings: { $sum: "$providerEarning" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: months },
  ]);
  return formatMonthlyData(data, "earnings");
};
