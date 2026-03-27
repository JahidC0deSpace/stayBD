/**
 * Response Utility
 * Standardized API responses
 */

/**
 * Send success response
 */
export const sendSuccess = (
  res,
  statusCode = 200,
  message = "Success",
  data = {},
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// Alias for controllers using successResponse
export const successResponse = sendSuccess;

/**
 * Send error response
 */
export const errorResponse = (
  res,
  statusCode = 500,
  message = "Internal Server Error",
  data = {},
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};

/**
 * Send paginated response
 */
export const sendPaginated = (res, data, pagination) => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
  });
};

/**
 * Parse pagination params from query
 */
export const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
