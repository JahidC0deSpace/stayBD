// src/store/useReviewStore.js
import { create } from "zustand";
import { reviewAPI } from "../services/api";
import toast from "react-hot-toast";

export const useReviewStore = create((set, get) => ({
  rating: 0,
  comment: "",
  isSubmitting: false,

  setRating: (rating) => set({ rating }),
  setComment: (comment) => set({ comment }),
  resetForm: () => set({ rating: 0, comment: "", isSubmitting: false }),

  submitReview: async (targetType, targetId, bookingId, onSuccess) => {
    const { rating, comment } = get();

    if (rating === 0) return toast.error("Please select a star rating");
    if (comment.length < 10)
      return toast.error("Comment must be at least 10 characters");
    if (!bookingId)
      return toast.error("You can only review properties you have booked.");

    try {
      set({ isSubmitting: true });

      await reviewAPI.create({
        targetType,
        targetId,
        bookingId,
        rating,
        comment,
      });

      toast.success("Review submitted successfully!");
      get().resetForm();

      // Trigger a refresh of the reviews list on the page
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Review submission failed:", err);
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
