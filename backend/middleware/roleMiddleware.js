/**
 * Role-Based Access Control Middleware
 * Enforces role permissions for routes
 */

import { createError } from "../utils/errorUtils.js";

/**
 * Restrict access to specific roles
 * Usage: restrictTo('admin') or restrictTo('admin', 'host')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        createError(
          403,
          `Access denied. This resource requires one of these roles: ${roles.join(", ")}`,
        ),
      );
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(createError(403, "Admin access required"));
  }
  next();
};

/**
 * Host only middleware
 */
export const hostOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "host") {
    return next(
      createError(403, "Host access required. Please register as a host."),
    );
  }
  next();
};

/**
 * Service provider only middleware
 */
export const serviceProviderOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "service_provider") {
    return next(createError(403, "Service provider access required."));
  }
  next();
};

/**
 * Host or Admin middleware
 */
export const hostOrAdmin = (req, res, next) => {
  if (!req.user || !["host", "admin"].includes(req.user.role)) {
    return next(createError(403, "Host or Admin access required"));
  }
  next();
};

/**
 * Provider or Admin middleware
 */
export const providerOrAdmin = (req, res, next) => {
  if (!req.user || !["service_provider", "admin"].includes(req.user.role)) {
    return next(createError(403, "Service Provider or Admin access required"));
  }
  next();
};

/**
 * Verified user (any role)
 * Cannot perform booking/listing actions without verification
 */
export const requireVerifiedUser = (req, res, next) => {
  if (!req.user) {
    return next(createError(401, "Authentication required"));
  }
  if (!req.user.isVerified) {
    return next(
      createError(
        403,
        "Account not verified. Admin must verify your account before you can proceed.",
      ),
    );
  }
  next();
};

/**
 * Can perform booking (verified guest)
 */
export const canBook = (req, res, next) => {
  if (!req.user) {
    return next(createError(401, "Authentication required"));
  }
  if (!req.user.isVerified) {
    return next(createError(403, "You must be verified to make bookings."));
  }
  // ⚠️ Ensure isActive and isBanned are in your User schema!
  if (req.user.isActive === false || req.user.isBanned) {
    return next(createError(403, "Your account is not active."));
  }
  next();
};

/**
 * Can create listing (approved host/provider)
 */
export const canCreateListing = (req, res, next) => {
  if (!req.user) {
    return next(createError(401, "Authentication required"));
  }
  const listingRoles = ["host", "service_provider", "admin"];
  if (!listingRoles.includes(req.user.role)) {
    return next(
      createError(403, "Only hosts and service providers can create listings."),
    );
  }
  if (!req.user.isVerified) {
    return next(createError(403, "You must be verified to create listings."));
  }
  // ⚠️ Ensure isApproved is in your User schema!
  if (!req.user.isApproved && req.user.role !== "admin") {
    return next(
      createError(
        403,
        "Your account must be approved by admin before creating listings.",
      ),
    );
  }
  next();
};
