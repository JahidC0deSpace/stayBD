import dotenv from "dotenv";
dotenv.config();

const { NODE_ENV } = process.env;

/**
 * Custom AppError Class
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found Handler
 */
export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // ── Safely coerce err.code to string for string operations ────────────────
  // err.code can be a number (MongoDB: 11000) or a string (Firebase: "auth/...")
  const errCode = err.code != null ? String(err.code) : "";

  // ─── MongoDB Duplicate Key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] ?? "field";
    const value = err.keyValue?.[field] ?? "";
    message = `The ${field} "${value}" is already in use. Please try another.`;
  }

  // ─── MongoDB Validation Error ──────────────────────────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(". ");
  }

  // ─── MongoDB Cast Error (invalid ObjectId) ─────────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ─── Firebase Auth Errors ──────────────────────────────────────────────────
  // Use errCode (string) not err.code (could be number) for .startsWith()
  if (errCode.startsWith("auth/")) {
    statusCode = 401;
    message = errCode.replace("auth/", "").replace(/-/g, " ");
  }

  // ─── Multer / File Upload Errors ───────────────────────────────────────────
  if (errCode === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "File too large. Maximum size allowed is 5MB.";
  }

  if (errCode === "LIMIT_FILE_COUNT") {
    statusCode = 413;
    message = "Too many files uploaded. Please check the limit.";
  }

  // ─── Build Response ────────────────────────────────────────────────────────
  const response = {
    success: false,
    message: message.charAt(0).toUpperCase() + message.slice(1),
    statusCode,
  };

  if (NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = err;
  }

  if (statusCode >= 500) {
    console.error("CRITICAL SERVER ERROR:", {
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      user: req.user?.firebaseUID || "Guest",
    });
  }

  res.status(statusCode).json(response);
};
