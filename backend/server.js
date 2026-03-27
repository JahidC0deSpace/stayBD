import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import { initializeSocketIO } from "./utils/socket.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Routes
import UserRoutes from "./routes/UserRoutes.js";
import experienceRoutes from "./routes/experienceRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

dotenv.config();
const app = express();

// Create the HTTP Server
const httpServer = createServer(app);

// Initialize Socket.io with the HTTP Server
initializeSocketIO(httpServer);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
const PORT = process.env.PORT || 5000;

// API Routes
app.use("/api/users", UserRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/payments", paymentRoutes);

// Error handler
app.use(notFound);
app.use(errorHandler);

// Connect to DB then start the HTTP Server (not the app)
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server & Socket.io running on port: ${PORT}`);
  });
});
