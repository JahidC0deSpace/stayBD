// testTransaction.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Transaction from "../models/Transaction.js"; // Adjust path if needed

dotenv.config();
const testModel = async () => {
  try {
    // 1. Connect to your MongoDB database (replace with your actual URI from .env)
    // const MONGO_URI = "mongodb://127.0.0.1:27017/staybd_dev";
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 2. Generate dummy ObjectIds for the required references
    const dummyBookingId = new mongoose.Types.ObjectId();
    const dummyPayerId = new mongoose.Types.ObjectId();
    const dummyPayeeId = new mongoose.Types.ObjectId();

    // 3. Create a new dummy transaction
    const newTransaction = new Transaction({
      booking: dummyBookingId,
      payer: dummyPayerId,
      payee: dummyPayeeId,
      paymentGateway: "bkash",
      transactionId: `TRX-${Date.now()}`, // Unique ID
      totalAmount: 5000,
      adminCommission: 500,
      providerEarning: 4500,
      status: "succeeded",
    });

    // 4. Save it to the database
    const savedTransaction = await newTransaction.save();
    console.log("✅ Transaction successfully saved:");
    console.log(savedTransaction);

    // 5. Read it back to ensure querying works
    const foundTransaction = await Transaction.findOne({
      transactionId: savedTransaction.transactionId,
    });
    console.log(
      "✅ Transaction successfully retrieved from DB. Total amount is:",
      foundTransaction.totalAmount,
    );

    // 6. Clean up (Optional: delete the dummy data)
    await Transaction.findByIdAndDelete(savedTransaction._id);
    console.log("✅ Dummy data cleaned up.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error testing model:", error.message);
    process.exit(1);
  }
};

testModel();
