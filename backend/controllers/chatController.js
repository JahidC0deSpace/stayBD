import Message from "../models/Message.js";
import { Booking } from "../models/Booking.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { successResponse } from "../utils/responseUtils.js";

/**
 * GET /api/chat/:bookingId/messages
 * Fetch message history for a specific booking
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // 1. Verify user is a participant
  const booking = await Booking.findById(bookingId)
    .select("guest host provider")
    .lean();
  if (!booking) throw createError(404, "Booking not found");

  const userId = req.user._id.toString();
  const isParticipant = [
    booking.guest?.toString(),
    booking.host?.toString(),
  ].includes(userId);

  if (!isParticipant && req.user.role !== "admin") {
    throw createError(403, "Access denied to this chat");
  }

  // 2. Fetch messages
  const [messages, total] = await Promise.all([
    Message.find({ booking: bookingId })
      .populate("sender", "name avatar role")
      .sort({ createdAt: -1 }) // Get newest first for pagination
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Message.countDocuments({ booking: bookingId }),
  ]);

  successResponse(res, 200, "Messages fetched", {
    messages: messages.reverse(), // Reverse so frontend displays oldest to newest
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

/**
 * POST /api/chat/:bookingId/messages
 * REST Fallback for sending messages (Primary is usually Socket.io)
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { text, messageType = "text", attachments } = req.body;

  if (!text?.trim() && (!attachments || attachments.length === 0)) {
    throw createError(400, "Message content cannot be empty");
  }

  const booking = await Booking.findById(bookingId).select(
    "guest host provider",
  );
  if (!booking) throw createError(404, "Booking not found");

  // Determine receiver
  const userId = req.user._id.toString();
  const receiverId =
    userId === booking.guest.toString() ? booking.host : booking.guest;

  const message = await Message.create({
    booking: bookingId,
    sender: req.user._id,
    receiver: receiverId,
    text: text.trim(),
    messageType,
    attachments,
  });

  const populated = await message.populate("sender", "name avatar role");
  successResponse(res, 201, "Message sent", populated);
});

/**
 * GET /api/chat/conversations
 * List all active chats for the user
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const bookings = await Booking.find({
    $or: [{ guest: userId }, { host: userId }], // ← removed provider
  })
    .populate("guest host", "name avatar") // ← removed provider
    .populate("property", "title images")
    .populate("service", "title images")
    .populate("experience", "title images") // ← added experience
    .sort({ updatedAt: -1 })
    .lean();

  const conversations = await Promise.all(
    bookings.map(async (booking) => {
      const [lastMessage, unreadCount] = await Promise.all([
        Message.findOne({ booking: booking._id })
          .sort({ createdAt: -1 })
          .lean(),
        Message.countDocuments({
          booking: booking._id,
          receiver: userId,
          isRead: false,
        }),
      ]);
      return { ...booking, lastMessage, unreadCount };
    }),
  );

  const activeConversations = conversations.filter((c) => c.lastMessage);

  successResponse(res, 200, "Conversations fetched", activeConversations);
});
/**
 * PATCH /api/chat/:bookingId/read
 * Mark messages as read when the user opens the chat
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  await Message.updateMany(
    {
      booking: bookingId,
      receiver: req.user._id,
      isRead: false,
    },
    {
      $set: { isRead: true, readAt: new Date() },
    },
  );

  successResponse(res, 200, "Messages marked as read");
});
