// src/store/usePropertyStore.js
import { create } from "zustand";
import { propertyAPI } from "../services/api";

export const usePropertyStore = create((set, get) => ({
  // ── Properties list state ────────────────────────────────────────────────────
  properties: [],
  pagination: {},
  loading: false,
  error: null,

  // ── Single property state ────────────────────────────────────────────────────
  property: null,
  propertyLoading: false,
  propertyError: null,

  // ── Fetch list of properties ─────────────────────────────────────────────────
  // Bug fixed: params are passed in at call time — no stale closure issue.
  fetchProperties: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await propertyAPI.getAll(params);
      set({
        properties: res.data.data,
        pagination: res.data.pagination || {},
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch properties",
      });
    } finally {
      set({ loading: false });
    }
  },

  // ── Fetch a single property by id ────────────────────────────────────────────
  fetchProperty: async (id) => {
    if (!id) return;
    set({ propertyLoading: true, propertyError: null, property: null });
    try {
      const res = await propertyAPI.getById(id);
      set({ property: res.data.data.property });
    } catch (err) {
      set({
        propertyError: err.response?.data?.message || "Failed to load property",
      });
    } finally {
      set({ propertyLoading: false });
    }
  },

  // ── Clear single property (call on detail page unmount) ──────────────────────
  clearProperty: () => set({ property: null, propertyError: null }),

  // ── Clear list (call on list page unmount if needed) ─────────────────────────
  clearProperties: () => set({ properties: [], pagination: {}, error: null }),
}));
