// backend/services/paymentService.js
import Stripe from "stripe";
import { Booking } from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import { User } from "../models/User.js";
import { createError } from "../utils/errorUtils.js";
import { differenceInDays } from "date-fns";
import { lockPropertyDates } from "./bookingService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const COMMISSION_RATE = 0.1;
const CURRENCY = "bdt";
const CURRENCY_MULTIPLIER = 100;

//  Helper: Calculate Property Prices
export const calculateBookingPrice = (booking, property) => {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const nights = Math.max(1, differenceInDays(checkOut, checkIn));
  let basePrice = 0;

  if (property.rentalType === "short_term" || property.rentalType === "both") {
    basePrice = property.pricePerNight * nights;
  } else if (property.rentalType === "long_term") {
    const months = Math.max(1, Math.ceil(nights / 30));
    basePrice = property.pricePerMonth * months;
  }

  const cleaningFee = property.cleaningFee || 0;
  const serviceFee = Math.round(basePrice * 0.03);
  const taxes = Math.round(basePrice * 0.05);
  const subtotal = basePrice + cleaningFee;
  const totalAmount = subtotal + serviceFee + taxes;

  return {
    basePrice,
    nights,
    cleaningFee,
    serviceFee,
    taxes,
    discount: 0,
    subtotal,
    totalAmount: Math.round(totalAmount),
  };
};

//  Helper: Calculate Service Prices
export const calculateServicePrice = (hours, pricePerHour) => {
  const basePrice = Math.round(hours * pricePerHour);
  const serviceFee = Math.round(basePrice * 0.03);
  const taxes = Math.round(basePrice * 0.05);
  const totalAmount = basePrice + serviceFee + taxes;

  return {
    basePrice,
    hours,
    serviceFee,
    taxes,
    subtotal: basePrice,
    totalAmount: Math.round(totalAmount),
  };
};

//  Create Stripe Checkout Session
export const createCheckoutSession = async (bookingId, guestId) => {
  const booking = await Booking.findById(bookingId)
    .populate("guest", "name email")
    .populate("host", "name email _id")
    .populate(
      "property",
      "title images pricePerNight pricePerMonth rentalType cleaningFee",
    )
    .populate("service", "title images pricePerHour provider");

  if (!booking) throw createError(404, "Booking not found");
  if (booking.guest._id.toString() !== guestId.toString())
    throw createError(403, "Unauthorized");
  if (booking.paymentStatus === "paid") throw createError(400, "Already paid");

  let priceBreakdown;
  let itemTitle;
  let itemDescription;

  if (booking.bookingType === "property" && booking.property) {
    priceBreakdown = calculateBookingPrice(booking, booking.property);
    itemTitle = `Stay: ${booking.property.title}`;
    itemDescription = `Check-in: ${booking.checkIn.toDateString()}`;
  } else if (booking.bookingType === "service" && booking.service) {
    const hours = booking.totalHours || 1;
    priceBreakdown = calculateServicePrice(hours, booking.service.pricePerHour);
    itemTitle = `Service: ${booking.service.title}`;
    itemDescription = `${hours} hour(s) of service`;
  } else if (booking.bookingType === "experience") {
    await booking.populate("experience", "title pricePerPerson images host");
    const participants = booking.guestCount || 1;
    const base = booking.experience.pricePerPerson * participants;
    const sFee = Math.round(base * 0.03);
    const tax = Math.round(base * 0.05);
    priceBreakdown = {
      basePrice: base,
      serviceFee: sFee,
      taxes: tax,
      subtotal: base,
      totalAmount: base + sFee + tax,
    };
    itemTitle = `Experience: ${booking.experience.title}`;
    itemDescription = `${participants} participant(s)`;
  } else {
    throw createError(400, "Unsupported booking type");
  }

  booking.totalAmount = priceBreakdown.totalAmount;
  booking.adminCommission = parseFloat(
    (priceBreakdown.totalAmount * COMMISSION_RATE).toFixed(2),
  );
  booking.providerEarning = parseFloat(
    (priceBreakdown.totalAmount * (1 - COMMISSION_RATE)).toFixed(2),
  );
  booking.priceBreakdown = priceBreakdown;
  await booking.save();

  const rawPayee =
    booking.host?._id ??
    booking.service?.provider ??
    booking.experience?.host ??
    booking.host ??
    null;

  const payeeId = rawPayee?.toString() ?? "";

  if (!payeeId) {
    console.warn(`⚠️  Could not resolve payeeId for booking ${bookingId}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: booking.guest.email,
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          unit_amount: priceBreakdown.totalAmount * CURRENCY_MULTIPLIER,
          product_data: { name: itemTitle, description: itemDescription },
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking._id.toString(),
      bookingReference: booking.bookingReference,
      guestId: guestId.toString(),
      payeeId,
      bookingType: booking.bookingType,
      totalAmount: priceBreakdown.totalAmount.toString(),
      adminCommission: booking.adminCommission.toString(),
      providerEarning: booking.providerEarning.toString(),
    },
    success_url: `${process.env.FRONTEND_URL}/bookings/${booking._id}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/bookings/${booking._id}/cancel`,
  });

  await Booking.findByIdAndUpdate(bookingId, { stripeSessionId: session.id });
  return { sessionId: session.id, sessionUrl: session.url };
};

//  Verify Payment Session
export const verifySession = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.payment_status !== "paid") {
    throw createError(400, "Payment has not been completed");
  }

  const {
    bookingId,
    guestId,
    payeeId,
    totalAmount,
    adminCommission,
    providerEarning,
    bookingType,
  } = session.metadata;

  const finalTransactionId =
    (typeof session.payment_intent === "object"
      ? session.payment_intent?.id
      : session.payment_intent) || session.id;

  const existingTransaction = await Transaction.findOne({
    $or: [
      { stripeSessionId: sessionId },
      { transactionId: finalTransactionId },
    ],
  }).lean();

  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError(404, "Booking not found");

  if (existingTransaction) {
    if (booking.paymentStatus !== "paid" || booking.status !== "confirmed") {
      booking.status = "confirmed";
      booking.paymentStatus = "paid";
      booking.stripePaymentIntentId = finalTransactionId;
      booking.transactionId = finalTransactionId;
      booking.paidAt = booking.paidAt || new Date();
      await booking.save();

      if (
        bookingType === "experience" &&
        booking.experience &&
        booking.experienceSlotId
      ) {
        const { Experience } = await import("../models/Experience.js");
        const experience = await Experience.findById(booking.experience);
        if (experience) {
          const slot = experience.schedule.id(booking.experienceSlotId);
          if (
            slot &&
            !slot.bookingIds
              .map((id) => id.toString())
              .includes(booking._id.toString())
          ) {
            slot.currentParticipants += booking.guestCount;
            slot.bookingIds.push(booking._id);
            if (slot.currentParticipants >= slot.maxParticipants) {
              slot.isFull = true;
            }
            await experience.save();
          }
        }
      }
    }
    return booking;
  }

  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.stripePaymentIntentId = finalTransactionId;
  booking.transactionId = finalTransactionId;
  booking.paidAt = new Date();
  await booking.save();

  if (
    bookingType === "experience" &&
    booking.experience &&
    booking.experienceSlotId
  ) {
    const { Experience } = await import("../models/Experience.js");
    const experience = await Experience.findById(booking.experience);
    if (experience) {
      const slot = experience.schedule.id(booking.experienceSlotId);
      if (slot) {
        slot.currentParticipants += booking.guestCount;
        slot.bookingIds.push(booking._id);
        if (slot.currentParticipants >= slot.maxParticipants) {
          slot.isFull = true;
        }
        await experience.save();
      }
    }
  }

  await Transaction.create({
    booking: bookingId,
    payer: guestId,
    payee: payeeId || undefined,
    stripeSessionId: session.id,
    stripePaymentIntentId: finalTransactionId,
    transactionId: finalTransactionId,
    totalAmount: parseFloat(totalAmount),
    adminCommission: parseFloat(adminCommission),
    providerEarning: parseFloat(providerEarning),
    amountInSmallestUnit: session.amount_total,
    status: "succeeded",
  });

  if (payeeId) {
    await User.findByIdAndUpdate(payeeId, {
      $inc: {
        totalEarnings: parseFloat(providerEarning),
        pendingPayouts: parseFloat(providerEarning),
      },
    });
  }

  if (bookingType === "property") {
    await lockPropertyDates(
      booking.property,
      booking.checkIn,
      booking.checkOut,
      bookingId,
    );
  }

  return booking;
};

export { stripe };
