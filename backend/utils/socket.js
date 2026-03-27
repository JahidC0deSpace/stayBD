import { Server } from "socket.io";
import { verifyFirebaseToken } from "../config/firebase.js";
import { User } from "../models/User.js";
import Message from "../models/Message.js";
import { Booking } from "../models/Booking.js";

let io = null;

// Map: userId -> Set of socketIds (handles multiple device connections)
const userSocketMap = new Map();

export const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── AUTHENTICATION MIDDLEWARE ──────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token required"));

      const decoded = await verifyFirebaseToken(token);
      const user = await User.findOne({ firebaseUID: decoded.uid }).select(
        "-__v",
      );

      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error(`Authentication failed: ${err.message}`));
    }
  });

  // ─── CONNECTION HANDLER ──────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    // console.log(`🔌 Socket connected: ${userId}`);

    // Track user socket connections
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    // Broadcast online status
    socket.broadcast.emit("user:online", { userId });

    // ─── JOIN A CHAT ROOM ───────────────────────────────────────────────
    socket.on("chat:join", async ({ bookingId }) => {
      const room = `booking:${bookingId}`;
      socket.join(room);
      // console.log(`User ${userId} joined room ${room}`);

      // Optional: Auto-mark messages as read when joining the room
      await Message.updateMany(
        { booking: bookingId, receiver: userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      );
    });

    // ─── SEND MESSAGE ────────────────────────────────────────────────────
    socket.on("chat:message", async (data) => {
      try {
        // Extract the data sent from the frontend.
        // Note: The frontend must send the FULL saved message object here!
        const {
          bookingId,
          text,
          _id,
          sender,
          createdAt,
          messageType = "text",
          attachments,
        } = data;

        if (!text?.trim() && (!attachments || attachments.length === 0)) return;
        socket.broadcast.to(`booking:${bookingId}`).emit("chat:message", data);

        // 2. We still need to find the booking to send the push notification
        const booking = await Booking.findById(bookingId).select(
          "guest host provider",
        );

        if (!booking)
          return socket.emit("chat:error", { message: "Booking not found" });

        const receiverId =
          userId === booking.guest.toString()
            ? booking.host || booking.provider
            : booking.guest;

        // 🚨 3. REMOVED `Message.create()` and `message.populate()` HERE 🚨
        // The frontend's `api.post` already saved the message to MongoDB!

        // 4. Send the notification to the receiver if they are offline
        emitToUser(receiverId, "notification:message", {
          bookingId,
          senderName: socket.user.name,
          text: text?.slice(0, 50) || "Sent an attachment",
        });
      } catch (err) {
        socket.emit("chat:error", { message: err.message });
      }
    });

    // ─── TYPING INDICATOR ────────────────────────────────────────────────
    socket.on("chat:typing", ({ bookingId, isTyping }) => {
      socket.to(`booking:${bookingId}`).emit("chat:typing", {
        userId,
        isTyping,
      });
    });

    // ─── DISCONNECT ──────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketMap.delete(userId);
          socket.broadcast.emit("user:offline", { userId });
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

export const emitToUser = (userId, event, data) => {
  const sockets = userSocketMap.get(userId.toString());
  if (sockets && io) {
    sockets.forEach((socketId) => io.to(socketId).emit(event, data));
  }
};

export const isUserOnline = (userId) => userSocketMap.has(userId.toString());
