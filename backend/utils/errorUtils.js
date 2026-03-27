/**
 * Error Utilities
 */

/**
 * Create a custom error with statusCode
 */
export const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Async handler wrapper — eliminates try/catch boilerplate in controllers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
