import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Factory function for Cloudinary Storage
 */
const createStorage = (
  folder,
  allowedFormats = ["jpg", "jpeg", "png", "webp"],
) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `staybd/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
      public_id: (req, file) =>
        `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    },
  });
};

// 2. Define Storage Instances
const avatarStorage = createStorage("avatars");
const propertyStorage = createStorage("properties");
const serviceStorage = createStorage("services");
const documentStorage = createStorage("documents", [
  "jpg",
  "jpeg",
  "png",
  "pdf",
]);

// 3. File Filters & Limits
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// 4. Export Multer Upload Instances
export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const uploadNID = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadPropertyImages = multer({
  storage: propertyStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// 5. Utility Functions

/**
 * Delete a single image
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    throw error;
  }
};

/**
 * Function to deleteMultipleFromCloudinary
 */
export const deleteMultipleFromCloudinary = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) return null;
  try {
    return await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error("Cloudinary Bulk Delete Error:", error);
    throw error;
  }
};

//  Define the Multer instance for services (Add this block)
export const uploadServiceImages = multer({
  storage: serviceStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB limit, max 5 files
  fileFilter: imageFilter,
});

/**
 * Extract public_id from URL
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const folderIndex = parts.indexOf("staybd");
  if (folderIndex === -1) return null;

  const publicIdWithExtension = parts.slice(folderIndex).join("/");
  return publicIdWithExtension.split(".")[0]; // Returns 'staybd/folder/filename'
};

export { cloudinary };
export default cloudinary;
