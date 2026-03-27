// src/utils/Pricing.js

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
};

// ─── NIGHTS CALC ──────────────────────────────────────────────────────────────
export function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  // Subtracting date strings directly parses them as UTC midnight, which is perfect for this.
  const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
  return diff > 0 ? diff : 0;
}

// ─── PROPERTY ─────────────────────────────────────────────────────────────────
export function calcPropertyPrice(data, rentalMode, form) {
  const nightlyPrice = safeNum(data.pricePerNight);
  const monthlyPrice = safeNum(data.pricePerMonth);
  const cleaningFee = safeNum(data.cleaningFee);
  const secDeposit = safeNum(data.securityDeposit);

  if (rentalMode === "nightly") {
    const nights = calcNights(form.checkIn, form.checkOut);
    const subtotal = nights * nightlyPrice;
    const lines = [];

    if (nightlyPrice > 0)
      lines.push({
        label: `৳${nightlyPrice.toLocaleString()} × ${nights} night${nights !== 1 ? "s" : ""}`,
        value: subtotal,
      });
    if (cleaningFee > 0)
      lines.push({ label: "Cleaning fee", value: cleaningFee });
    if (secDeposit > 0)
      lines.push({ label: "Security deposit", value: secDeposit });

    return {
      lines,
      total: subtotal + cleaningFee + secDeposit,
      valid: nights > 0, // Button enables only if dates are valid and check-out is after check-in
    };
  }

  if (rentalMode === "monthly") {
    const months = safeNum(form.months, 1);
    const subtotal = months * monthlyPrice;
    const lines = [];

    if (monthlyPrice > 0)
      lines.push({
        label: `৳${monthlyPrice.toLocaleString()} × ${months} month${months !== 1 ? "s" : ""}`,
        value: subtotal,
      });
    if (secDeposit > 0)
      lines.push({ label: "Security deposit", value: secDeposit });

    return {
      lines,
      total: subtotal + secDeposit,
      valid: !!form.moveIn && months > 0,
    };
  }

  return { lines: [], total: 0, valid: false };
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────
export function calcServicePrice(data, form) {
  const hourlyPrice = safeNum(data.pricePerHour ?? data.hourlyRate);
  const minHours = safeNum(data.minimumHours, 1);
  const hours = safeNum(form.hours, minHours);
  const subtotal = hours * hourlyPrice;

  return {
    lines:
      hourlyPrice > 0
        ? [
            {
              label: `৳${hourlyPrice.toLocaleString()} × ${hours} hour${hours !== 1 ? "s" : ""}`,
              value: subtotal,
            },
          ]
        : [],
    total: subtotal,
    // Button enables only if they filled the text/date fields AND met minimum hours
    valid: !!(form.date && form.time && form.address) && hours >= minHours,
  };
}

// ─── EXPERIENCE ───────────────────────────────────────────────────────────────
export function calcExperiencePrice(data, form) {
  const price = safeNum(data.pricePerPerson ?? data.price);
  const participants = safeNum(form.participants, 1);
  const subtotal = participants * price;

  return {
    lines:
      price > 0
        ? [
            {
              label: `৳${price.toLocaleString()} × ${participants} person${participants !== 1 ? "s" : ""}`,
              value: subtotal,
            },
          ]
        : [],
    total: subtotal,
    // Button enables only if they picked a schedule AND a language
    valid: !!(form.scheduleId && form.language),
  };
}

// ─── MAIN DISPATCHER ──────────────────────────────────────────────────────────
export function calcPrice(selectedType, data, rentalMode, form) {
  if (!data) return { lines: [], total: 0, valid: false };
  if (selectedType === "property")
    return calcPropertyPrice(data, rentalMode, form);
  if (selectedType === "service") return calcServicePrice(data, form);
  if (selectedType === "experience") return calcExperiencePrice(data, form);
  return { lines: [], total: 0, valid: false };
}

// ─── DATE UTILS ───────────────────────────────────────────────────────────────
export function today() {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function buildBookingPayload({
  selectedType,
  data,
  rentalMode,
  form,
  total,
}) {
  return {
    serviceType: selectedType,
    serviceId: data._id,
    rentalMode: rentalMode || undefined,
    ...form, // Injects all our form fields (dates, address, participants, etc.) straight to backend
    totalAmount: total,
    currency: data.currency ?? "BDT",
    bookedAt: new Date().toISOString(),
  };
}
