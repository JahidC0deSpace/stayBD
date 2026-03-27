// src/store/useBookingStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import {
  fetchService,
  submitBooking,
  createCheckoutSession,
} from "../services/api";
import { calcPrice } from "../utils/Pricing";
import { auth } from "../services/firebase";
import api from "../services/api";
import { useAuthStore } from "./useAuthStore";
import { validateAvailability } from "../components/booking/ServiceForm";

// ── Ownership check helpers ───────────────────────────────────────────────────
function getCurrentUserId() {
  const user = useAuthStore.getState().user;

  return (
    user?._id?.toString() ?? user?.firebaseUID ?? auth?.currentUser?.uid ?? null
  );
}

export function getOwnerId(data) {
  if (!data) return null;

  const owner = data.host ?? data.provider ?? null;
  if (!owner) return null;

  if (typeof owner === "object") {
    return owner._id?.toString() ?? owner.firebaseUID ?? null;
  }
  return owner.toString();
}

export function checkIsOwnListing(data) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !data) return false;

  const owner = data.host ?? data.provider ?? null;
  if (!owner) return false;

  const ownerId = getOwnerId(data);
  if (ownerId === currentUserId) return true;

  const ownerFirebaseUID = typeof owner === "object" ? owner.firebaseUID : null;
  const currentFirebaseUID = auth?.currentUser?.uid;
  if (
    ownerFirebaseUID &&
    currentFirebaseUID &&
    ownerFirebaseUID === currentFirebaseUID
  )
    return true;

  return false;
}

const OWN_LISTING_MESSAGES = {
  property: "You can't book your own property.",
  service: "You can't book your own service.",
  experience: "You can't book your own experience.",
};

// ── Form defaults per booking type ───────────────────────────────────────────
function getDefaultForm(type, data) {
  if (type === "property")
    return {
      checkIn: "",
      checkOut: "",
      moveIn: "",
      months: 1,
      guests: 1,
      guestMessage: "",
    };
  if (type === "service")
    return { date: "", time: "", hours: data?.minimumHours || 1, address: "" };
  if (type === "experience")
    return {
      scheduleId: null,
      participants: 1,
      language: data?.languages?.[0] || "",
    };
  return {};
}

function getDefaultRentalMode(data) {
  if (!data) return null;
  if (data.rentalType === "short_term") return "nightly";
  if (data.rentalType === "long_term") return "monthly";
  return null; // "both" → user picks
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useBookingStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  selectedType: "property",
  loading: false,
  submitting: false,
  data: null,
  rentalMode: null,
  form: {},
  apiLogs: [],
  modal: null,
  error: null,

  // ── Derived (computed on read, not stored) ───────────────────────────────────
  // Call get() inside components: useBookingStore(s => s.getPrice())
  getPrice: () => {
    const { selectedType, data, rentalMode, form } = get();
    return calcPrice(selectedType, data, rentalMode, form);
  },

  isOwnListing: () => checkIsOwnListing(get().data),

  ownListingMessage: () => {
    const { selectedType, data } = get();
    return checkIsOwnListing(data) ? OWN_LISTING_MESSAGES[selectedType] : null;
  },

  // ── Actions ──────────────────────────────────────────────────────────────────
  addLog: (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    set((state) => ({
      apiLogs: [
        { msg: `[${time}] ${msg}`, type },
        ...state.apiLogs.slice(0, 8),
      ],
    }));
  },

  loadService: async (type, id) => {
    const { addLog } = get();
    set({
      loading: true,
      selectedType: type,
      data: null,
      error: null,
      form: {},
      rentalMode: null,
    });
    addLog(`GET /api/${type}s/${id} — fetching...`, "info");
    try {
      const result = await fetchService(type, id);
      set({
        data: result,
        rentalMode: getDefaultRentalMode(result),
        form: getDefaultForm(type, result),
      });
      addLog(`200 OK — ${result.title}`, "success");
    } catch (err) {
      set({ error: err.message });
      addLog(`Error: ${err.message}`, "err");
    } finally {
      set({ loading: false });
    }
  },

  switchType: (type) => {
    if (type === get().selectedType) return;
    set({ selectedType: type });
  },

  updateForm: (updates) =>
    set((state) => ({ form: { ...state.form, ...updates }, error: null })),

  updateRentalMode: (mode) => {
    get().addLog(`Rental mode → ${mode}`, "success");
    set({ rentalMode: mode, error: null });
  },

  closeModal: () => set({ modal: null }),

  // ── Reset the whole booking state (e.g. on page unmount) ────────────────────
  reset: () =>
    set({
      selectedType: "property",
      loading: false,
      submitting: false,
      data: null,
      rentalMode: null,
      form: {},
      apiLogs: [],
      modal: null,
      error: null,
    }),

  // ── Submit booking ───────────────────────────────────────────────────────────
  handleSubmit: async () => {
    const { selectedType, data, rentalMode, form, addLog } = get();

    // Ownership guard
    if (checkIsOwnListing(data)) {
      const msg = OWN_LISTING_MESSAGES[selectedType];
      addLog(`Blocked: ${msg}`, "err");
      set({ error: msg });
      return;
    }

    // ── NEW: service availability guard ─────────────────────────────────────────
    if (selectedType === "service") {
      const { date, time } = form;
      const error = validateAvailability(data?.availability, date, time);
      if (error) {
        addLog(`Blocked: ${error}`, "err");
        set({ error });
        toast.error(error, { duration: 5000 });
        return;
      }
    }

    addLog(`POST /api/bookings/${selectedType} — creating booking...`, "info");
    set({ submitting: true, error: null });

    try {
      // Step 1: Create booking record
      const { bookingId, bookingReference, requiresPayment } =
        await submitBooking({ selectedType, data, rentalMode, form });
      addLog(`201 Created — ${bookingReference}`, "success");

      // Step 1.5: Send optional guest message to host inbox
      const guestMessage = form.guestMessage?.trim();
      if (guestMessage && bookingId) {
        try {
          await api.post(`/chat/${bookingId}/messages`, { text: guestMessage });
          addLog(`Message sent to host inbox`, "success");
        } catch (msgErr) {
          console.warn("Could not send guest message:", msgErr.message);
          addLog(`Message not sent (booking continues)`, "info");
        }
      }

      // Mock / free path — show confirmation modal
      if (!requiresPayment) {
        set({
          modal: {
            bookingId: bookingReference,
            type: selectedType,
            title: data.title,
          },
        });
        return;
      }

      // Step 2: Create Stripe checkout session and redirect
      addLog(`POST /payments/create-checkout-session...`, "info");
      const { sessionUrl } = await createCheckoutSession(bookingId);
      addLog(`Stripe session ready — redirecting...`, "success");
      window.location.href = sessionUrl;
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message ?? err.message;

      if (status === 409) {
        const msg =
          "These dates are already booked. Please choose different dates and try again.";
        addLog(`409 Conflict — dates unavailable`, "err");
        set({ error: msg });
        toast.error("Dates unavailable — already booked by someone else.", {
          duration: 5000,
          style: { borderRadius: "12px", fontWeight: 600, fontSize: "14px" },
        });
      } else {
        addLog(`Error: ${serverMsg}`, "err");
        set({ error: serverMsg });
        toast.error(serverMsg || "Something went wrong. Please try again.", {
          duration: 4000,
          style: { borderRadius: "12px", fontWeight: 600, fontSize: "14px" },
        });
      }
    } finally {
      set({ submitting: false });
    }
  },
}));
