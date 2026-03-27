//forntend/src/services/api.js
import axios from "axios";
import { auth } from "./firebase";
import { useAuthStore } from "../store/useAuthStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

//  REQUEST INTERCEPTOR (Firebase Auth)
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

//  RESPONSE INTERCEPTOR (Auto Logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, config } = error;
    const skipLogoutRoutes = ["/users/sync", "/users/me"];
    const isSkipRoute = skipLogoutRoutes.some((route) =>
      config?.url?.includes(route),
    );

    if (response?.status === 401 && !isSkipRoute) {
      console.warn("🔒 Unauthorized access detected. Logging out...");
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

//  PROPERTY API
export const propertyAPI = {
  getAll: (params) => api.get("/properties", { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post("/properties", data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  getMyListings: (params) =>
    api.get("/properties/host/my-listings", { params }),
  uploadImages: (id, formData) =>
    api.post(`/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

//  SERVICE & EXPERIENCE API (For Search)
export const serviceAPI = {
  getAll: (params) =>
    api.get("/search", { params: { ...params, type: "services" } }),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post("/services", data),
  uploadImages: (id, formData) =>
    api.post(`/services/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const experienceAPI = {
  getAll: (params) =>
    api.get("/search", { params: { ...params, type: "experiences" } }),
  getById: (id) => api.get(`/experiences/${id}`),
  create: (data) => api.post("/experiences", data),
  uploadImages: (id, formData) =>
    api.post(`/experiences/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) => api.put(`/experiences/${id}`, formData),
  deleteExperience: (id) => api.delete(`/experiences/${id}`),
  getMyExperiences: (params) =>
    api.get("/experiences/provider/my-experiences", { params }),
  book: (id, data) => api.post(`/experiences/${id}/book`, data),
};

//  SEARCH & RECOMMENDATIONS
export const feedAPI = {
  getRecommendations: () => api.get("/search/recommendations"),
  getDistricts: () => api.get("/search/districts"),
};
export const searchAPI = {
  recommendations: (params) => api.get("/search/recommendations", { params }),
};

//  BOOKING API
export const bookingAPI = {
  bookProperty: (data) => api.post("/bookings/property", data),
  getUserBookings: (params) => api.get("/bookings/my-bookings", { params }),
  getBookingDetails: (id) => api.get(`/bookings/${id}`),
  cancelBooking: (id, reason) =>
    api.patch(`/bookings/${id}/cancel`, { reason }),
  createCheckoutSession: (bookingId) =>
    api.post("/payments/create-checkout-session", { bookingId }),
  checkEligibility: (propertyId) =>
    api.get(`/bookings/${propertyId}/review-eligibility`),
};

//  ANALYTICS API
export const analyticsAPI = {
  getOverview: () => api.get("/search/districts"), // Or your specific analytics endpoint
  getAdminStats: () => api.get("/analytics/admin/overview"),

  getHostStats: () => api.get("/analytics/host/overview"),

  getProviderStats: () => api.get("/analytics/provider/overview"),
};

//  ADMIN API
export const adminAPI = {
  // Properties
  getProperties: (params) => api.get("/admin/properties", { params }),
  approveProperty: (id, data) =>
    api.patch(`/admin/properties/${id}/approve`, data),
  reviewPropertyChanges: (id, data) =>
    api.patch(`/admin/properties/${id}/review-changes`, data),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
  deleteService: (id) => api.delete(`/services/${id}`),
  deleteExperience: (id) => api.delete(`/experiences/${id}`),
  approveService: (id, data) =>
    api.patch(`/admin/services/${id}/approve`, data),

  // Users
  getUsers: (params) => api.get("/admin/users", { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  verifyUser: (id, data) => api.patch(`/admin/users/${id}/verify`, data),
  banUser: (id, data) => api.patch(`/admin/users/${id}/ban`, data),

  // Analytics
  getAnalytics: () => api.get("/analytics/admin/overview"),

  // Experiences (Updated)
  getPublicExperiences: (params) => api.get("/experiences", { params }),
  getAdminExperiences: (params) =>
    api.get("/experiences/admin/all", { params }),
  approveExperience: (id, data) =>
    api.patch(`/experiences/${id}/approve`, data), // 👈 ADDED THIS

  // Services (Recommended addition so your AdminServicesPage can use this file)
  getServices: (params) => api.get("/admin/services", { params }),
  approveService: (id, data) =>
    api.patch(`/admin/services/${id}/approve`, data),

  handlePropertyDeletionRequest: (id, payload) =>
    api.patch(`/admin/properties/${id}/deletion-request`, payload),
  handleServiceDeletionRequest: (id, payload) =>
    api.patch(`/admin/services/${id}/deletion-request`, payload),
  handleExperienceDeletionRequest: (id, payload) =>
    api.patch(`/experiences/${id}/deletion-request`, payload),
};

//  HOST API
export const hostAPI = {
  getOverview: () => api.get("/analytics/host/overview"),
  getRevenue: () => api.get("/analytics/host/revenue"),
  getMyListings: (params) =>
    api.get("/properties/host/my-listings", { params }),
  getBookings: () => api.get("/bookings/host/my-bookings"),
  deleteListing: (id) => api.delete(`/properties/${id}`),
};

//  PROVIDER API
export const providerAPI = {
  getMyServices: (params) =>
    api.get("/services/provider/my-services", { params }),
  deleteService: (id) => api.delete(`/services/${id}`),
};

//  USER API
export const userAPI = {
  getMe: () => api.get("/users/me"),
  updateMe: (data) => api.patch("/users/updateMe", data),
  toggleWishlist: (itemId) => api.post(`/users/wishlist/${itemId}`),
};

//  REVIEW API
export const reviewAPI = {
  // Fetch reviews for a specific property, service, or experience
  getByTarget: (targetType, targetId, params) =>
    api.get(`/reviews/${targetType}/${targetId}`, { params }),

  // Create a new review
  create: (data) => api.post("/reviews", data),

  // Edit an existing review
  update: (id, data) => api.patch(`/reviews/${id}`, data),

  // Delete a review
  delete: (id) => api.delete(`/reviews/${id}`),

  // Host response to a review
  respond: (id, comment) => api.post(`/reviews/${id}/respond`, { comment }),

  // Flag a review for moderation
  flag: (id, reason) => api.patch(`/reviews/${id}/flag`, { reason }),
};

//  BOOKING PAGE HELPERS
export async function fetchService(type, id) {
  const endpointMap = {
    property: `/properties/${id}`,
    service: `/services/${id}`,
    experience: `/experiences/${id}`,
  };
  const res = await api.get(endpointMap[type]);

  // Each type nests its data differently — unwrap correctly
  if (type === "property") {
    return res.data?.data?.property ?? res.data?.data ?? res.data;
  }
  if (type === "service") {
    return res.data?.data?.service ?? res.data?.data ?? res.data;
  }
  if (type === "experience") {
    return res.data?.data?.experience ?? res.data?.data ?? res.data;
  }
  return res.data?.data ?? res.data;
}

export async function submitBooking({ selectedType, data, rentalMode, form }) {
  const base = { specialRequests: form.specialRequests || "" };
  let payload = base;

  if (selectedType === "property") {
    let checkIn, checkOut;
    if (rentalMode === "nightly") {
      checkIn = form.checkIn;
      checkOut = form.checkOut;
    } else {
      checkIn = form.moveIn;
      const d = new Date(form.moveIn);
      d.setMonth(d.getMonth() + (form.months || 1));
      checkOut = d.toISOString().split("T")[0];
    }
    payload = {
      ...base,
      propertyId: data._id,
      checkIn,
      checkOut,
      guestCount: form.guests || 1,
    };
  }

  if (selectedType === "service") {
    const checkInISO = new Date(`${form.date}T${form.time}`).toISOString();
    const checkOutDate = new Date(checkInISO);
    checkOutDate.setHours(checkOutDate.getHours() + (form.hours || 1));
    payload = {
      ...base,
      serviceId: data._id,
      checkIn: checkInISO,
      checkOut: checkOutDate.toISOString(),
      totalHours: form.hours || 1,
      guestCount: 1,
      address: form.address,
    };
  }

  if (selectedType === "experience") {
    const selectedSlot =
      data.schedule?.find((s) => s._id === form.scheduleId) ?? null;

    const slotDate =
      selectedSlot?.date?.split("T")[0] ??
      new Date().toISOString().split("T")[0];
    const slotStart = selectedSlot?.startTime ?? selectedSlot?.time ?? "09:00";
    const checkInISO = new Date(`${slotDate}T${slotStart}`).toISOString();

    let checkOutISO;
    if (selectedSlot?.endTime) {
      checkOutISO = new Date(
        `${slotDate}T${selectedSlot.endTime}`,
      ).toISOString();
    } else {
      const co = new Date(checkInISO);
      co.setHours(co.getHours() + (data.durationHours || 1));
      checkOutISO = co.toISOString();
    }

    payload = {
      ...base,
      slotId: form.scheduleId, // ← backend expects exactly "slotId"
      participants: form.participants || 1,
      guestCount: form.participants || 1,
      language: form.language || "",
      checkIn: checkInISO,
      checkOut: checkOutISO,
      bookingDate: selectedSlot?.date ?? new Date().toISOString(),
      startTime: selectedSlot?.startTime ?? selectedSlot?.time ?? "",
      endTime: selectedSlot?.endTime ?? "",
    };
  }

  const endpointMap = {
    property: "/bookings/property",
    service: "/bookings/service",
    experience: `/experiences/${data._id}/book`,
  };

  const res = await api.post(endpointMap[selectedType], payload);
  const resData = res.data?.data ?? res.data;

  return {
    bookingId: resData.bookingId ?? resData._id, // ← experience returns bookingId
    bookingReference: resData.bookingReference ?? resData.bookingId,
    requiresPayment: true,
  };
}

export async function createCheckoutSession(bookingId) {
  const res = await api.post("/payments/create-checkout-session", {
    bookingId,
  });
  return res.data?.data ?? res.data;
}
export async function verifyPayment(sessionId) {
  const res = await api.get(`/payments/verify-session?session_id=${sessionId}`);
  return res.data?.data?.booking ?? res.data;
}
export default api;
