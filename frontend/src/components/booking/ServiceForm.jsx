// src/components/booking/ServiceForm.jsx
import React, { useMemo } from "react";
import {
  FormLabel,
  FormInput,
  Stepper,
  SectionTitle,
  Divider,
  Badge,
} from "./UI";
import { today } from "../../utils/Pricing";

const ALL_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const getAvailableDays = (availability) => {
  if (!availability) return [];
  if (Array.isArray(availability))
    return availability.filter((d) => typeof d === "string");
  if (typeof availability === "object") {
    return Object.entries(availability)
      .filter(([, val]) => val?.available === true)
      .map(([day]) => day);
  }
  return [];
};

const getScheduleSlots = (availability) => {
  if (
    !availability ||
    typeof availability !== "object" ||
    Array.isArray(availability)
  )
    return [];
  const result = [];
  for (const day of ALL_DAYS) {
    const entry = availability[day];
    if (!entry?.available || !Array.isArray(entry.slots)) continue;
    for (const slot of entry.slots) {
      if (slot?.from && slot?.to)
        result.push({ day, from: slot.from, to: slot.to });
    }
  }
  return result;
};

// ── NEW: converts "HH:MM" to total minutes ──────────────────────────────────
const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

// ── NEW: returns the JS day name ("monday", "tuesday", ...) from a date string
const getDayName = (dateStr) => {
  if (!dateStr) return null;
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date(dateStr).getDay()];
};

// ── NEW: main validation — returns an error string or null ───────────────────
export function validateAvailability(availability, date, time) {
  if (!date && !time) return null; // nothing picked yet, stay silent

  const availableDays = getAvailableDays(availability);
  const scheduleSlots = getScheduleSlots(availability);

  if (date && availableDays.length > 0) {
    const chosenDay = getDayName(date);
    if (!availableDays.includes(chosenDay)) {
      return `Provider is not available on ${capitalize(chosenDay)}s. Available days: ${availableDays.map(capitalize).join(", ")}.`;
    }
  }

  if (date && time && scheduleSlots.length > 0) {
    const chosenDay = getDayName(date);
    const chosenMinutes = toMinutes(time);
    const slotsForDay = scheduleSlots.filter((s) => s.day === chosenDay);

    if (slotsForDay.length > 0) {
      const isInSlot = slotsForDay.some((s) => {
        const from = toMinutes(s.from);
        const to = toMinutes(s.to);
        return chosenMinutes >= from && chosenMinutes < to;
      });

      if (!isInSlot) {
        const readable = slotsForDay.map((s) => `${s.from}–${s.to}`).join(", ");
        return `Selected time is outside the provider's hours. Available slots on ${capitalize(chosenDay)}: ${readable}.`;
      }
    }
  }

  return null;
}

function AvailabilityInfo({ data }) {
  const availableDays = getAvailableDays(data.availability);
  const scheduleSlots = getScheduleSlots(data.availability);
  if (availableDays.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionTitle icon="📅" small>
        Provider Availability
      </SectionTitle>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        {availableDays.map((day) => (
          <span
            key={day}
            style={{
              padding: "4px 10px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "Syne, sans-serif",
              background: "rgba(0,212,170,0.12)",
              color: "var(--accent3)",
              border: "1px solid rgba(0,212,170,0.25)",
            }}
          >
            {capitalize(day).slice(0, 3)}
          </span>
        ))}
      </div>
      {scheduleSlots.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {scheduleSlots.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--surface2)",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{ fontWeight: 600, color: "var(--muted)", minWidth: 36 }}
              >
                {capitalize(s.day).slice(0, 3)}
              </span>
              <span style={{ color: "var(--accent3)", fontWeight: 600 }}>
                ⏰ {s.from} – {s.to}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Contact the provider for exact time arrangements.
        </p>
      )}
    </div>
  );
}

export default function ServiceForm({ data, form, updateForm }) {
  // ── NEW: compute error live as the user changes date/time ─────────────────
  const availabilityError = useMemo(
    () => validateAvailability(data?.availability, form.date, form.time),
    [data?.availability, form.date, form.time],
  );

  return (
    <div style={{ padding: 24 }} className="animate-fade">
      <SectionTitle icon="🔧">Book Service</SectionTitle>
      <AvailabilityInfo data={data} />
      <Divider />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <FormLabel>Date</FormLabel>
          <FormInput
            type="date"
            value={form.date || ""}
            min={today()}
            onChange={(e) => updateForm({ date: e.target.value })}
          />
        </div>
        <div>
          <FormLabel>Preferred Time</FormLabel>
          <FormInput
            type="time"
            value={form.time || ""}
            onChange={(e) => updateForm({ time: e.target.value })}
          />
        </div>
      </div>

      {/* ── NEW: inline validation error ───────────────────────────────────── */}
      {availabilityError && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: "rgba(220,60,60,0.08)",
            color: "var(--danger, #dc3c3c)",
            border: "1px solid rgba(220,60,60,0.25)",
            lineHeight: 1.5,
          }}
        >
          ⚠️ {availabilityError}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <FormLabel>Duration (min {data.minimumHours}h)</FormLabel>
        <Stepper
          value={form.hours || data.minimumHours || 1}
          min={data.minimumHours || 1}
          max={24}
          onChange={(v) => updateForm({ hours: v })}
          suffix="hours"
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <FormLabel>Service Address</FormLabel>
        <FormInput
          type="text"
          placeholder="Enter your full address..."
          value={form.address || ""}
          onChange={(e) => updateForm({ address: e.target.value })}
        />
        {data.serviceArea?.areas?.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            ✅ Available in: {data.serviceArea.areas.join(", ")}
          </div>
        )}
      </div>
      <Divider />
      <SectionTitle icon="✦" small>
        Skills &amp; Expertise
      </SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {data.skills?.map((s) => (
          <Badge key={s} variant="service">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
