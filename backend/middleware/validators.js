import { body, param, query, validationResult } from "express-validator";

/**
 * handleValidationErrors
 * Middleware to check validation results and return errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

//  Auth Validators

export const validateRegistration = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 }),
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("phone")
    .matches(/^(\+880|0)[0-9]{10}$/)
    .withMessage("Valid Bangladeshi phone number required (e.g. 017xxxxxxxx)"),
  body("nationalIdNumber")
    .notEmpty()
    .withMessage("National ID number is required")
    .isLength({ min: 10, max: 17 })
    .withMessage("Invalid National ID format"),
  body("address.division").notEmpty().withMessage("Division is required"),
  body("address.district").notEmpty().withMessage("District is required"),
  handleValidationErrors,
];

//  Experience Validators

export const validateExperience = [
  body("title").trim().notEmpty().isLength({ min: 5, max: 100 }),
  body("description").trim().notEmpty().isLength({ min: 50, max: 3000 }),
  body("category").notEmpty().withMessage("Category is required"),
  body("pricePerPerson")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("durationHours").isFloat({ min: 0.5, max: 24 }),
  body("location.division").notEmpty(),
  body("location.district").notEmpty(),
  handleValidationErrors,
];

//  Property Validators

export const validateProperty = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 120 }),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 }),
  body("propertyType")
    .isIn([
      "apartment",
      "house",
      "villa",
      "cottage",
      "resort",
      "guesthouse",
      "hostel",
      "studio",
      "farmhouse",
      "other",
    ])
    .withMessage("Invalid property type"),
  body("rentalType")
    .isIn(["short_term", "long_term", "both"])
    .withMessage("Rental type must be short_term, long_term, or both"),
  body("guestCapacity")
    .isInt({ min: 1, max: 50 })
    .withMessage("Guest capacity must be between 1 and 50"),
  body("location.division").notEmpty().withMessage("Division is required"),
  body("location.district").notEmpty().withMessage("District is required"),
  body("location.coordinates.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be [longitude, latitude]"),
  handleValidationErrors,
];

//  Booking Validators

export const validateBooking = [
  body("checkIn")
    .isISO8601()
    .withMessage("Valid check-in date required")
    .toDate(),
  body("checkOut")
    .isISO8601()
    .withMessage("Valid check-out date required")
    .toDate(),
  body("guestCount").isInt({ min: 1 }).withMessage("At least 1 guest required"),
  body("checkOut").custom((checkOut, { req }) => {
    if (new Date(checkOut) <= new Date(req.body.checkIn)) {
      throw new Error("Check-out must be after check-in");
    }
    // Note: We use .setHours(0,0,0,0) to compare only the date part if needed
    if (new Date(req.body.checkIn) < new Date().setHours(0, 0, 0, 0)) {
      throw new Error("Check-in date cannot be in the past");
    }
    return true;
  }),
  handleValidationErrors,
];

//  Review Validators

export const validateReview = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be 10-1000 characters"),
  handleValidationErrors,
];

//  ID Validators

export const validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),
  handleValidationErrors,
];
