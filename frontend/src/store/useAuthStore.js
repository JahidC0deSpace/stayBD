// src/store/useAuthStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import api from "../services/api";
import { useChatStore } from "./useChatStore";
import { useWishlistStore } from "./useWishlistStore";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────────────────────
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthLoading: true, // true on first load until Firebase resolves
      isHydrated: false,

      // ── Internal: called once on app boot ────────────────────────────────────
      // Returns the unsubscribe function so App.jsx can clean up.
      initAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              // 1. Get a fresh token and attach it globally
              const token = await firebaseUser.getIdToken();
              api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

              // 2. Pull the latest MongoDB user document
              const res = await api.get(`/users/${firebaseUser.uid}`);
              const mongoUser = res.data;

              set({
                user: mongoUser,
                token,
                isAuthenticated: true,
                isAuthLoading: false,
              });
            } catch (err) {
              // Firebase session exists but Mongo fetch failed (e.g. 404 on
              // interrupted registration). Keep the user logged-out so that
              // role checks don't crash on undefined.
              console.error(
                "Failed to fetch user profile on refresh:",
                err.message,
              );
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isAuthLoading: false,
              });
            }
          } else {
            // Signed out — clear everything
            delete api.defaults.headers.common["Authorization"];
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isAuthLoading: false,
            });
          }
        });

        return unsubscribe;
      },

      // ── Called after registration / social login to sync with MongoDB ────────
      syncWithMongo: async (firebaseUser, additionalData = {}) => {
        try {
          const token = await firebaseUser.getIdToken();
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          const payload = {
            firebaseUID: firebaseUser.uid,
            email: firebaseUser.email,
            name: additionalData.name || firebaseUser.displayName || "New User",
            phone: additionalData.phone,
            address: additionalData.address,
            nationalIdNumber: additionalData.nationalIdNumber,
            role: additionalData.role || "guest",
            isVerified: additionalData.isVerified || false,
            authProvider:
              firebaseUser.providerData[0]?.providerId === "google.com"
                ? "google"
                : "email",
          };

          const res = await api.post("/users/sync", payload);
          const mongoUser = res.data;

          set({
            user: mongoUser,
            token,
            isAuthenticated: true,
            isAuthLoading: false,
          });

          return mongoUser;
        } catch (err) {
          console.error(
            "MongoDB sync error:",
            err.response?.data || err.message,
          );
          throw err;
        }
      },

      // ── Manual login (used after email/password sign-in if needed) ───────────
      login: (userData, token) => {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        set({
          user: userData,
          token,
          isAuthenticated: true,
          isAuthLoading: false,
        });
      },

      // ── Logout ───────────────────────────────────────────────────────────────
      logout: async () => {
        await signOut(auth);
        delete api.defaults.headers.common["Authorization"];
        localStorage.removeItem("staybd-auth");
        useChatStore.getState().disconnectAll();
        useWishlistStore.getState().clear(); // ← ADD THIS LINE
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAuthLoading: false,
        });
      },

      // ── Update user in store (e.g. after profile edit) ───────────────────────
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // ── Internal flags ───────────────────────────────────────────────────────
      setAuthLoading: (status) => set({ isAuthLoading: status }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "staybd-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
