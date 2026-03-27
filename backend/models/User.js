import mongoose from "mongoose";

export const BANGLADESH_DISTRICTS = [
  "Dhaka",
  "Faridpur",
  "Gazipur",
  "Gopalganj",
  "Kishoreganj",
  "Madaripur",
  "Manikganj",
  "Munshiganj",
  "Narayanganj",
  "Narsingdi",
  "Rajbari",
  "Shariatpur",
  "Tangail",
  "Bagerhat",
  "Chuadanga",
  "Jessore",
  "Jhenaidah",
  "Khulna",
  "Kushtia",
  "Magura",
  "Meherpur",
  "Narail",
  "Satkhira",
  "Jashore",
  "Barguna",
  "Barishal",
  "Bhola",
  "Jhalokati",
  "Patuakhali",
  "Pirojpur",
  "Bandarban",
  "Brahmanbaria",
  "Chandpur",
  "Chattogram",
  "Cox's Bazar",
  "Cumilla",
  "Feni",
  "Khagrachhari",
  "Lakshmipur",
  "Noakhali",
  "Rangamati",
  "Habiganj",
  "Moulvibazar",
  "Sunamganj",
  "Sylhet",
  "Bogura",
  "Chapai Nawabganj",
  "Joypurhat",
  "Naogaon",
  "Natore",
  "Nawabganj",
  "Pabna",
  "Rajshahi",
  "Sirajganj",
  "Dinajpur",
  "Gaibandha",
  "Kurigram",
  "Lalmonirhat",
  "Nilphamari",
  "Panchagarh",
  "Rangpur",
  "Thakurgaon",
  "Jamalpur",
  "Mymensingh",
  "Netrokona",
  "Sherpur",
];

export const DIVISIONS = [
  "Dhaka",
  "Chittagong",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

const addressSchema = new mongoose.Schema(
  {
    division: {
      type: String,
      enum: DIVISIONS,
      required: [true, "Division is required"],
    },
    district: {
      type: String,
      enum: BANGLADESH_DISTRICTS,
      required: [true, "District is required"],
    },
    area: { type: String, required: [true, "Area is required"], trim: true },
    fullAddress: {
      type: String,
      required: [true, "Full address is required"],
      trim: true,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firebaseUID: {
      type: String,
      required: [true, "Firebase UID is required"],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^(\+8801|01)[3-9]\d{8}$/,
        "Please enter a valid Bangladeshi phone number",
      ],
    },
    nationalIdNumber: {
      type: String,
      required: [true, "National ID number is mandatory"],
      unique: true,
      sparse: true,
      trim: true,
      minlength: 10,
      maxlength: 17,
    },
    address: { type: addressSchema, required: [true, "Address is required"] },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    bio: { type: String, maxlength: 500, default: "" },

    // Wishlist array to support favoriting properties!
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],

    role: {
      type: String,
      enum: ["guest", "host", "service_provider", "admin"],
      default: "guest",
    },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    verificationNotes: { type: String, default: "" },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authProvider: {
      type: String,
      enum: ["email", "google", "both"],
      default: "email",
    },
    totalBookings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalEarnings: { type: Number, default: 0 },
    pendingPayouts: { type: Number, default: 0 },
    notifications: {
      email: { type: Boolean, default: true },
      bookingUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
userSchema.index({ role: 1, isVerified: 1 });
userSchema.index({ "address.district": 1 });
userSchema.index({ createdAt: -1 });

// Virtuals
userSchema.virtual("isHost").get(function () {
  return this.role === "host";
});
userSchema.virtual("isServiceProvider").get(function () {
  return this.role === "service_provider";
});
userSchema.virtual("isAdmin").get(function () {
  return this.role === "admin";
});

// Methods
userSchema.methods.canBook = function () {
  return this.isVerified && this.isActive && !this.isBanned;
};
userSchema.methods.canCreateListing = function () {
  return (
    ["host", "service_provider"].includes(this.role) &&
    this.isVerified &&
    this.isApproved &&
    this.isActive &&
    !this.isBanned
  );
};

// Middleware
userSchema.pre("save", function (next) {
  // Logic 1: Auto-verify Google users
  if (this.authProvider === "google") {
    this.isVerified = true;
  }

  // Logic 2: Auto-approve and Auto-verify Guests ONLY
  if (this.role === "guest") {
    this.isApproved = true;
    this.isVerified = true;
  } else {
    // For Host and Service Providers, ensure they start as false
    // unless they were already approved by an admin
    if (this.isNew) {
      this.isApproved = false;
      this.isVerified = false;
    }
  }

  next();
});

// Statics
userSchema.statics.findByFirebaseUID = function (uid) {
  return this.findOne({ firebaseUID: uid });
};

// Use default export for consistency
export const User = mongoose.models.User || mongoose.model("User", userSchema);
