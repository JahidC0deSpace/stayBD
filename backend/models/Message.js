import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Adding receiver helps with counting "unread" messages per user
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
      required: function () {
        return !this.attachments || this.attachments.length === 0;
      },
    },
    messageType: {
      type: String,
      enum: ["text", "image", "system", "booking_update"],
      default: "text",
    },
    attachments: [
      {
        url: String,
        publicId: String,
        fileType: { type: String, enum: ["image", "document"] },
      },
    ],
    // Boolean is easier for basic "Seen" logic than an array for 1-on-1 chats
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// COMPOUND INDEX: Crucial for fetching chat history quickly
messageSchema.index({ booking: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 }); // Great for "Unread Message" badges

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
export default Message;
