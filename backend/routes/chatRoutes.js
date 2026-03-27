import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
} from "../controllers/chatController.js";

const router = express.Router();

//  CONVERSATION LIST
// Fetch all active bookings/conversations for the current user
router.get("/conversations", protect, getConversations);

//  MESSAGE MANAGEMENT

/**
 * GET /api/chat/:bookingId/messages
 * Fetch history for a specific room (Paginated)
 */
router.get("/:bookingId/messages", protect, getMessages);

/**
 * POST /api/chat/:bookingId/messages
 * REST Fallback for sending messages (Primary is usually Socket.io)
 */
router.post("/:bookingId/messages", protect, sendMessage);

/**
 * PATCH /api/chat/:bookingId/read
 * Mark all incoming messages in this booking as 'seen'
 */
router.patch("/:bookingId/read", protect, markAsRead);

export default router;
