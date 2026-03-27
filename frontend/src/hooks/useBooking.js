// src/hooks/useBooking.js
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  fetchService,
  submitBooking,
  createCheckoutSession,
} from "../services/api";
import { calcPrice } from "../utils/Pricing";
import { auth } from "../services/firebase";
import api from "../services/api";

//  Ownership check helpers
function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

export function getOwnerId(data) {
  if (!data) return null;
  const owner = data.host || data.provider;
  if (!owner) return null;
  return typeof owner === "object" ? owner._id?.toString() : owner?.toString();
}

export function checkIsOwnListing(data) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !data) return false;
  return getOwnerId(data) === currentUserId;
}

const OWN_LISTING_MESSAGES = {
  property: "You can't book your own property.",
  service: "You can't book your own service.",
  experience: "You can't book your own experience.",
};

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

export function useBooking() {
  const [selectedType, setSelectedType] = useState("property");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [rentalMode, setRentalMode] = useState(null);
  const [form, setForm] = useState({});
  const [apiLogs, setApiLogs] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  const addLog = useCallback((msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setApiLogs((prev) => [
      { msg: `[${time}] ${msg}`, type },
      ...prev.slice(0, 8),
    ]);
  }, []);

  const loadService = useCallback(
    async (type, id) => {
      setLoading(true);
      setSelectedType(type);
      setData(null);
      setError(null);
      setForm({});
      setRentalMode(null);
      addLog(`GET /api/${type}s/${id} — fetching...`, "info");
      try {
        const result = await fetchService(type, id);
        setData(result);
        setRentalMode(getDefaultRentalMode(result));
        setForm(getDefaultForm(type, result));
        addLog(`200 OK — ${result.title}`, "success");
      } catch (err) {
        setError(err.message);
        addLog(`Error: ${err.message}`, "err");
      } finally {
        setLoading(false);
      }
    },
    [addLog],
  );

  const switchType = useCallback(
    (type) => {
      if (type === selectedType) return;
      setSelectedType(type);
    },
    [selectedType],
  );

  //  Clear error whenever guest changes any form field
  const updateForm = useCallback((updates) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const updateRentalMode = useCallback(
    (mode) => {
      setRentalMode(mode);
      setError(null);
      addLog(`Rental mode → ${mode}`, "success");
    },
    [addLog],
  );

  const isOwnListing = checkIsOwnListing(data);
  const ownListingMessage = isOwnListing
    ? OWN_LISTING_MESSAGES[selectedType]
    : null;

  const handleSubmit = useCallback(async () => {
    //  Ownership guard
    if (checkIsOwnListing(data)) {
      const msg = OWN_LISTING_MESSAGES[selectedType];
      addLog(`Blocked: ${msg}`, "err");
      setError(msg);
      return;
    }

    addLog(`POST /api/bookings/${selectedType} — creating booking...`, "info");
    setSubmitting(true);
    setError(null);

    try {
      //  Step 1: Create booking record
      const { bookingId, bookingReference, requiresPayment } =
        await submitBooking({
          selectedType,
          data,
          rentalMode,
          form,
        });
      addLog(`201 Created — ${bookingReference}`, "success");

      //  Step 1.5: Send optional guest message to host inbox
      const guestMessage = form.guestMessage?.trim();
      if (guestMessage && bookingId) {
        try {
          await api.post(`/chat/${bookingId}/messages`, { text: guestMessage });
          addLog(`💬 Message sent to host inbox`, "success");
        } catch (msgErr) {
          console.warn("Could not send guest message to host:", msgErr.message);
          addLog(`⚠️ Message not sent (booking continues)`, "info");
        }
      }

      //  Mock path
      if (!requiresPayment) {
        setModal({
          bookingId: bookingReference,
          type: selectedType,
          title: data.title,
        });
        return;
      }

      //  Step 2: Create Stripe checkout session and redirect
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
        setError(msg);
        //  Toast notification
        toast.error("📅 Dates unavailable — already booked by someone else.", {
          duration: 5000,
          style: {
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "14px",
          },
        });
      } else {
        addLog(`Error: ${serverMsg}`, "err");
        setError(serverMsg);
        toast.error(serverMsg || "Something went wrong. Please try again.", {
          duration: 4000,
          style: {
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "14px",
          },
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, data, rentalMode, form, addLog]);

  const price = calcPrice(selectedType, data, rentalMode, form);

  return {
    selectedType,
    loading,
    submitting,
    data,
    rentalMode,
    form,
    apiLogs,
    modal,
    error,
    price,
    isOwnListing,
    ownListingMessage,
    switchType,
    loadService,
    updateForm,
    updateRentalMode,
    handleSubmit,
    closeModal: () => setModal(null),
  };
}
