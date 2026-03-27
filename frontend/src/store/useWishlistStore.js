// src/store/useWishlistStore.js
import { create } from "zustand";
import api from "../services/api";
import { useAuthStore } from "./useAuthStore";

export const useWishlistStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  items: [], // populated wishlist objects (Property docs)
  wishlistIds: [], // just the IDs — used for fast heart toggle checks
  isLoading: false,
  error: null,

  // ── Seed from auth store on login ────────────────────────────────────────
  // Call this once after login / on mount if the user is already logged in.
  // The User model stores wishlist as an array of Property ObjectIds.
  // getMe() populates them, so we can use the full objects directly.
  hydrate: (populatedWishlist = []) => {
    set({
      items: populatedWishlist,
      wishlistIds: populatedWishlist.map((p) =>
        typeof p === "object" ? p._id : p,
      ),
    });
  },

  // ── Fetch wishlist from backend ──────────────────────────────────────────
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

  // ── Toggle a property in/out of the wishlist ─────────────────────────────
  // Returns true if added, false if removed.
  toggleWishlist: async (itemId) => {
    const { wishlistIds, items } = get();
    const isInWishlist = wishlistIds.includes(itemId);

    // Optimistic update
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
      // Re-fetch to get the populated objects in sync
      await get().fetchWishlist();
      return !isInWishlist;
    } catch (err) {
      // Rollback on failure
      await get().fetchWishlist();
      throw err;
    }
  },

  // ── Check if an item is wishlisted (synchronous) ─────────────────────────
  isWishlisted: (itemId) => get().wishlistIds.includes(itemId),

  // ── Clear on logout ───────────────────────────────────────────────────────
  clear: () => set({ items: [], wishlistIds: [], error: null }),
}));
