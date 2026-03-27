import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Mongodb is connected successfully");
  } catch (error) {
    console.error("error connecting in mongodb", error);
    process.exit(1);
  }
};
