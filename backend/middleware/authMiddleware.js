import admin from "../config/firebase.js";
import { User } from "../models/User.js";
import { AppError } from "./errorMiddleware.js";

/**
 * Middleware: Verify Firebase token ONLY (Use this strictly for /sync)
 * Does NOT check if user exists in Mongo yet.
 */
export const verifyFirebaseTokenOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];

    // 1. Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 2. THIS IS THE MISSING PIECE! Attach it to the request.
    req.user = decodedToken;

    next();
  } catch (error) {
    next(createError(401, "Invalid or expired token"));
  }
};

/**
 * Middleware: Verify Firebase token and attach User from MongoDB
 * (Use this for 99% of your secure routes)
 */
export const protect = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Please log in to access this resource", 401));
    }

    const idToken = authHeader.split("Bearer ")[1];

    // 2. Verify token with Firebase Admin
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return next(
        new AppError("Invalid or expired session. Please log in again.", 401),
      );
    }

    // 3. Find user in our MongoDB
    const user = await User.findOne({ firebaseUID: decodedToken.uid }).select(
      "-__v",
    );

    if (!user) {
      return next(
        new AppError("User not found in our database. Please register.", 401),
      );
    }

    // 4. Safety Checks
    if (!user.isActive || user.isBanned) {
      return next(
        new AppError("Your account has been restricted. Contact support.", 403),
      );
    }

    // 5. Attach to request for use in controllers
    req.user = user;
    req.firebaseUser = decodedToken;

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Check if user is an Admin
 */
export const restrictToAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to perform this action", 403),
    );
  }
  next();
};

/**
 * Middleware: Require Approval for Hosts/Providers
 * Guests are exempt from this check
 */
export const requireApproval = (req, res, next) => {
  if (req.user.role === "guest") return next();

  // ✅ FIX: Changed isApproved to isVerified to match your MongoDB schema
  if (!req.user.isVerified) {
    return next(new AppError("Your account is pending admin approval.", 403));
  }
  next();
};

/**
 * Middleware: Optional Auth
 * Doesn't block the request if no token is found
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await User.findOne({ firebaseUID: decodedToken.uid });

    req.user = user || null;
    next();
  } catch (err) {
    next(); // Just move on without req.user
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Access denied. Admin privileges required.");
  }
};
