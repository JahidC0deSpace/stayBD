/**
 * Booking Service
 * Core booking logic: availability check, date locking, early checkout
 */

import { Booking } from "../models/Booking.js";
import { Property } from "../models/Property.js";
import { Service } from "../models/Service.js";
import { Experience } from "../models/Experience.js";
import { User } from "../models/User.js";
import { createError } from "../utils/errorUtils.js";

import {
  calculateBookingPrice,
  calculateServicePrice,
} from "./paymentService.js";
import { differenceInDays } from "date-fns";

/**
 * Create a property booking with availability lock
 */
// 2. Exporting functions directly using 'export const'
export const createPropertyBooking = async (
  guestId,
  propertyId,
  bookingData,
) => {
  const { checkIn, checkOut, guestCount, specialRequests } = bookingData;

  // Validate dates
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today)
    throw createError(400, "Check-in date cannot be in the past");
  if (checkOutDate <= checkInDate)
    throw createError(400, "Check-out must be after check-in");

  const nights = differenceInDays(checkOutDate, checkInDate);
  if (nights < 1) throw createError(400, "Minimum stay is 1 night");

  // Get property
  const property = await Property.findById(propertyId).populate(
    "host",
    "_id name email",
  );

  if (!property) throw createError(404, "Property not found");
  if (property.status !== "approved")
    throw createError(400, "Property is not available for booking");
  if (!property.host) throw createError(400, "Property has no host");

  // Check guest capacity
  if (guestCount > property.guestCapacity) {
    throw createError(
      400,
      `This property accommodates max ${property.guestCapacity} guests`,
    );
  }

  // Check house rules
  if (nights < property.houseRules.minimumStay) {
    throw createError(
      400,
      `Minimum stay is ${property.houseRules.minimumStay} nights`,
    );
  }
  if (nights > property.houseRules.maximumStay) {
    throw createError(
      400,
      `Maximum stay is ${property.houseRules.maximumStay} nights`,
    );
  }

  // Check property availability (blocked dates)
  const isPropertyAvailable = property.isAvailableForDates(checkIn, checkOut);
  if (!isPropertyAvailable) {
    throw createError(409, "Property is not available for selected dates");
  }

  // Check for conflicting bookings in DB (atomic check)
  const isAvailable = await Booking.checkPropertyAvailability(
    propertyId,
    checkIn,
    checkOut,
  );
  if (!isAvailable) {
    throw createError(
      409,
      "These dates are already booked. Please choose different dates.",
    );
  }

  // Server-side price calculation
  const priceBreakdown = calculateBookingPrice(
    { checkIn, checkOut, bookingType: "property" },
    property,
  );

  // Create booking
  const booking = await Booking.create({
    guest: guestId,
    host: property.host._id,
    property: propertyId,
    bookingType: "property",
    checkIn: checkInDate,
    checkOut: checkOutDate,
    guestCount,
    totalNights: nights,
    priceBreakdown,
    totalAmount: priceBreakdown.totalAmount,
    specialRequests: specialRequests || "",
    status: "pending",
    paymentStatus: "unpaid",
  });

  // Increment property booking count
  await Property.findByIdAndUpdate(propertyId, { $inc: { totalBookings: 1 } });
  await User.findByIdAndUpdate(guestId, { $inc: { totalBookings: 1 } });

  return booking.populate([
    { path: "property", select: "title images location pricePerNight" },
    { path: "host", select: "name email avatar" },
    { path: "guest", select: "name email avatar" },
  ]);
};

/**
 * Create a service booking
 */
export const createServiceBooking = async (guestId, serviceId, bookingData) => {
  const { checkIn, checkOut, totalHours, address, specialRequests } =
    bookingData;

  const service = await Service.findById(serviceId).populate(
    "provider",
    "_id name email",
  );
  if (!service) throw createError(404, "Service not found");
  if (service.status !== "approved")
    throw createError(400, "Service is not available");

  const checkInDate = new Date(checkIn);
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const chosenDay = dayNames[checkInDate.getDay()];

  const availability = service.availability;
  if (
    availability &&
    typeof availability === "object" &&
    !Array.isArray(availability)
  ) {
    const dayEntry = availability[chosenDay];

    if (!dayEntry?.available) {
      const availableDays = Object.entries(availability)
        .filter(([, v]) => v?.available)
        .map(([d]) => d.charAt(0).toUpperCase() + d.slice(1))
        .join(", ");
      throw createError(
        400,
        `Provider is not available on ${chosenDay}s. Available days: ${availableDays || "none"}.`,
      );
    }

    const bookingTime = bookingData?.time;
    if (
      bookingTime &&
      Array.isArray(dayEntry.slots) &&
      dayEntry.slots.length > 0
    ) {
      const toMins = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const chosen = toMins(bookingTime);
      const inSlot = dayEntry.slots.some(
        (s) =>
          s?.from && s?.to && chosen >= toMins(s.from) && chosen < toMins(s.to),
      );
      if (!inSlot) {
        const readable = dayEntry.slots
          .map((s) => `${s.from}–${s.to}`)
          .join(", ");
        throw createError(
          400,
          `Selected time is outside provider's available hours. Slots on ${chosenDay}: ${readable}.`,
        );
      }
    }
  } else if (Array.isArray(availability) && availability.length > 0) {
    if (!availability.includes(chosenDay)) {
      throw createError(400, `Provider is not available on ${chosenDay}s.`);
    }
  }

  const hours = totalHours || service.minimumHours || 1;
  const priceBreakdown = calculateServicePrice(hours, service.pricePerHour);

  const booking = await Booking.create({
    guest: guestId,
    host: service.provider._id,
    service: serviceId,
    bookingType: "service",
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    guestCount: 1,
    totalHours: hours,
    serviceAddress: address || "",
    priceBreakdown,
    totalAmount: priceBreakdown.totalAmount,
    specialRequests: specialRequests || "",
    status: "pending",
    paymentStatus: "unpaid",
  });

  await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } });

  return booking.populate([
    { path: "service", select: "title images category pricePerHour" },
    { path: "host", select: "name email avatar" },
  ]);
};

/**
 * Handle early checkout
 * Admin notified → actualCheckout updated → dates freed
 */
export const processEarlyCheckout = async (
  bookingId,
  actualCheckout,
  adminId,
) => {
  const booking = await Booking.findById(bookingId).populate(
    "property",
    "_id title availability",
  );

  if (!booking) throw createError(404, "Booking not found");
  if (booking.status !== "confirmed")
    throw createError(400, "Only confirmed bookings can have early checkout");
  if (booking.paymentStatus !== "paid")
    throw createError(400, "Only paid bookings can process early checkout");

  const newCheckout = new Date(actualCheckout);
  const originalCheckout = new Date(booking.checkOut);

  if (newCheckout >= originalCheckout) {
    throw createError(
      400,
      "Early checkout date must be before original checkout date",
    );
  }
  if (newCheckout <= new Date(booking.checkIn)) {
    throw createError(400, "Early checkout must be after check-in date");
  }

  // Update booking
  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      actualCheckout: newCheckout,
      status: "early_checkout",
      earlyCheckoutApprovedBy: adminId,
    },
    { new: true },
  );

  if (booking.property) {
    await Property.findById(booking.property._id).then(async (prop) => {
      if (prop) {
        prop.availability = prop.availability.filter(
          (rule) =>
            rule.reason !== "booked" ||
            !(
              new Date(rule.startDate).toDateString() ===
              new Date(booking.checkIn).toDateString()
            ),
        );

        // Block only the actually used dates
        prop.availability.push({
          startDate: booking.checkIn,
          endDate: newCheckout,
          isBlocked: true,
          reason: "booked",
        });

        await prop.save();
      }
    });
  }

  // console.log(
  //   `Early checkout processed for booking ${booking.bookingReference}`,
  // );
  return updatedBooking;
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (
  bookingId,
  userId,
  userRole,
  reason = "",
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError(404, "Booking not found");

  // Authorization check
  const isGuest = booking.guest.toString() === userId.toString();
  const isHost = booking.host.toString() === userId.toString();
  const isAdmin = userRole === "admin";

  if (!isGuest && !isHost && !isAdmin) {
    throw createError(403, "You are not authorized to cancel this booking");
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    throw createError(
      400,
      `Cannot cancel a booking with status: ${booking.status}`,
    );
  }

  const cancelledBy = isAdmin ? "admin" : isHost ? "host" : "guest";

  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      status: "cancelled",
      cancellationReason: reason,
      cancelledBy,
      cancelledAt: new Date(),
    },
    { new: true },
  );

  // Unblock dates on property if booking was confirmed
  if (booking.status === "confirmed" && booking.property) {
    const property = await Property.findById(booking.property);
    if (property) {
      property.availability = property.availability.filter(
        (rule) =>
          !(
            rule.reason === "booked" &&
            new Date(rule.startDate).toDateString() ===
              new Date(booking.checkIn).toDateString()
          ),
      );
      await property.save();
    }
  }

  return updatedBooking;
};

/**
 * Lock property dates when booking is confirmed
 */
export const lockPropertyDates = async (
  propertyId,
  checkIn,
  checkOut,
  bookingId,
) => {
  const property = await Property.findById(propertyId);
  if (!property) return;

  property.availability.push({
    startDate: new Date(checkIn),
    endDate: new Date(checkOut),
    isBlocked: true,
    reason: "booked",
  });

  await property.save();
};
