// controllers/analyticsController.js
import * as analyticsService from "../services/analyticsService.js";
import { successResponse, errorResponse } from "../utils/responseUtils.js";

/**
 * GET /api/analytics/admin/overview
 * Admin: full platform overview
 */
export const getAdminOverview = async (req, res) => {
  try {
    const data = await analyticsService.getAdminOverview();
    return successResponse(res, 200, "Admin analytics fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/admin/revenue
 * Admin: monthly revenue breakdown
 */
export const getAdminRevenue = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = await analyticsService.getRevenueByMonth(Number(months));
    return successResponse(res, 200, "Revenue data fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/admin/bookings
 * Admin: booking status distribution
 */
export const getAdminBookingStats = async (req, res) => {
  try {
    const data = await analyticsService.getBookingStatusStats();
    return successResponse(res, 200, "Booking stats fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/host/overview
 * Host: own property analytics
 */
export const getHostOverview = async (req, res) => {
  try {
    // Requires req.user to be populated by auth middleware
    const data = await analyticsService.getHostOverview(req.user._id);
    return successResponse(res, 200, "Host analytics fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/host/revenue
 * Host: monthly earnings
 */
export const getHostRevenue = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    // Requires req.user to be populated by auth middleware
    const data = await analyticsService.getHostRevenueByMonth(
      req.user._id,
      Number(months),
    );
    return successResponse(res, 200, "Host revenue fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/provider/overview
 * Service Provider: own service analytics
 */
export const getProviderOverview = async (req, res) => {
  try {
    // Requires req.user to be populated by auth middleware
    const data = await analyticsService.getProviderOverview(req.user._id);
    return successResponse(res, 200, "Provider analytics fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/guide/overview
 * Guide: own experience analytics
 */
export const getExperienceOverview = async (req, res) => {
  try {
    const data = await analyticsService.getExperienceOverview(req.user._id);
    return successResponse(res, 200, "Experience analytics fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

/**
 * GET /api/analytics/provider/revenue
 * Service Provider: monthly earnings
 */
export const getProviderRevenue = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = await analyticsService.getProviderRevenueByMonth(
      req.user._id,
      Number(months),
    );
    return successResponse(res, 200, "Provider revenue fetched", data);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};
