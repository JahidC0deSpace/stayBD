// src/store/useWishlistStore.js
import { create } from "zustand";
import api from "../services/api";
import { useAuthStore } from "./useAuthStore";

export const useWishlistStore = create((set, get) => ({
  //  State
  items: [],
  wishlistIds: [],
  isLoading: false,
  error: null,

  hydrate: (populatedWishlist = []) => {
    set({
      items: populatedWishlist,
      wishlistIds: populatedWishlist.map((p) =>
        typeof p === "object" ? p._id : p,
      ),
    });
  },

  //  Fetch wishlist from backend
  fetchWishlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get("/users/me");
      const user = res.data?.data ?? res.data;
      const wishlist = user?.wishlist ?? [];
      set({
        items: wishlist,
        wishlistIds: wishlist.map((p) => (typeof p === "object" ? p._id : p)),
        isLoading: false,
      });
      // Keep auth store user in sync
      useAuthStore.getState().updateUser({ wishlist });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  toggleWishlist: async (itemId) => {
    const { wishlistIds, items } = get();
    const isInWishlist = wishlistIds.includes(itemId);

    if (isInWishlist) {
      set({
        items: items.filter((p) => (p._id ?? p) !== itemId),
        wishlistIds: wishlistIds.filter((id) => id !== itemId),
      });
    } else {
      set({ wishlistIds: [...wishlistIds, itemId] });
    }

    try {
      await api.post(`/users/wishlist/${itemId}`);
      await get().fetchWishlist();
      return !isInWishlist;
    } catch (err) {
      await get().fetchWishlist();
      throw err;
    }
  },

  //  Check if an item is wishlisted
  isWishlisted: (itemId) => get().wishlistIds.includes(itemId),

  //  Clear on logout
  clear: () => set({ items: [], wishlistIds: [], error: null }),
}));
