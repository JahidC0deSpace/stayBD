// src/store/useMyBookingsStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { bookingAPI } from "../services/api";

export const useMyBookingsStore = create((set, get) => ({
  //  State
  bookings: [],
  loading: true,
  activeTab: "all",

  // Cancel Modal State
  cancelTarget: null,
  cancelReason: "",
  cancelling: false,

  //  Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchBookings: async () => {
    set({ loading: true });
    try {
      const res = await bookingAPI.getUserBookings({ viewAs: "guest" });
      const data =
        res.data?.data?.bookings ?? res.data?.bookings ?? res.data?.data ?? [];
      set({ bookings: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bookings");
      set({ loading: false });
    }
  },

  // Cancel Modal Actions
  openCancelModal: (booking) =>
    set({ cancelTarget: booking, cancelReason: "" }),

  closeCancelModal: () => set({ cancelTarget: null, cancelReason: "" }),

  setCancelReason: (reason) => set({ cancelReason: reason }),

  confirmCancel: async () => {
    const { cancelTarget, cancelReason, fetchBookings } = get();
    if (!cancelTarget || !cancelReason.trim()) return;

    set({ cancelling: true });
    try {
      await bookingAPI.cancelBooking(cancelTarget._id, cancelReason);
      toast.success("Booking cancelled");

      await fetchBookings();

      set({ cancelTarget: null, cancelReason: "", cancelling: false });
    } catch (err) {
      console.error("Cancel error:", err.response?.data ?? err.message);
      toast.error(
        err.response?.data?.message ??
          err.message ??
          "Failed to cancel booking",
      );
      set({ cancelling: false });
    }
  },
}));
