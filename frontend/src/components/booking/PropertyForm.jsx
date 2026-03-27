// src/components/booking/PropertyForm.jsx
import React from "react";
import {
  FormLabel,
  FormInput,
  Stepper,
  InfoBox,
  SectionTitle,
  Divider,
} from "./UI";
import { today } from "../../utils/Pricing";

function RentalTypeTabs({ rentalMode, onSelect }) {
  const tabs = [
    { key: "nightly", label: "🌙 Nightly" },
    { key: "monthly", label: "📆 Monthly" },
  ];
  return (
    <div>
      <SectionTitle icon="📅">Select Rental Type</SectionTitle>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          background: "var(--surface2)",
          borderRadius: 12,
          padding: 4,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            style={{
              flex: 1,
              padding: 10,
              textAlign: "center",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "Syne, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
              border: "none",
              background:
                rentalMode === t.key ? "var(--accent)" : "transparent",
              color: rentalMode === t.key ? "#fff" : "var(--muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageToHost({ value, onChange }) {
  return (
    <div style={{ marginTop: 20 }}>
      <Divider />
      <SectionTitle icon="💬" small>
        Message to Host
      </SectionTitle>
      <p
        style={{
          fontSize: 12,
          color: "var(--muted)",
          marginBottom: 10,
          lineHeight: 1.5,
        }}
      >
        Optional — this will be sent directly to your host's inbox along with
        your booking details.
      </p>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. We'll arrive around 3 PM. Do you have parking available?"
        maxLength={500}
        rows={3}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "var(--surface2)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 13,
          outline: "none",
          resize: "vertical",
          minHeight: 80,
          lineHeight: 1.6,
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          textAlign: "right",
          marginTop: 4,
        }}
      >
        {(value || "").length}/500
      </div>
    </div>
  );
}

function NightlyForm({ data, form, updateForm }) {
  return (
    <div className="animate-slide">
      <SectionTitle icon="🌙">Nightly Booking</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <FormLabel>Check-in Date</FormLabel>
          <FormInput
            type="date"
            value={form.checkIn || ""}
            min={today()}
            onChange={(e) => updateForm({ checkIn: e.target.value })}
          />
        </div>
        <div>
          <FormLabel>Check-out Date</FormLabel>
          <FormInput
            type="date"
            value={form.checkOut || ""}
            min={form.checkIn || today()}
            onChange={(e) => updateForm({ checkOut: e.target.value })}
          />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <FormLabel>Guests (max {data.guestCapacity})</FormLabel>
        <Stepper
          value={form.guests || 1}
          min={1}
          max={data.guestCapacity}
          onChange={(v) => updateForm({ guests: v })}
        />
      </div>
      <InfoBox style={{ marginBottom: 16 }}>
        🏠 {data.amenityNames?.slice(0, 3).join(" · ")} · {data.bedrooms} bed ·{" "}
        {data.bathrooms} bath
      </InfoBox>
      <Divider />
      <SectionTitle icon="📋" small>
        House Rules
      </SectionTitle>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        {data.houseRules?.additionalRules || "No special rules."}
      </p>
      <MessageToHost
        value={form.guestMessage}
        onChange={(val) => updateForm({ guestMessage: val })}
      />
    </div>
  );
}

function MonthlyForm({ data, form, updateForm }) {
  return (
    <div className="animate-slide">
      <SectionTitle icon="📆">Monthly Booking</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <FormLabel>Move-in Date</FormLabel>
          <FormInput
            type="date"
            value={form.moveIn || ""}
            min={today()}
            onChange={(e) => updateForm({ moveIn: e.target.value })}
          />
        </div>
        <div>
          <FormLabel>Number of Months</FormLabel>
          <div style={{ marginTop: 4 }}>
            <Stepper
              value={form.months || 1}
              min={1}
              max={24}
              onChange={(v) => updateForm({ months: v })}
              suffix="mo"
            />
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <FormLabel>Guests (max {data.guestCapacity})</FormLabel>
        <Stepper
          value={form.guests || 1}
          min={1}
          max={data.guestCapacity}
          onChange={(v) => updateForm({ guests: v })}
        />
      </div>
      <InfoBox>
        📆 Monthly rental includes all amenities. Security deposit of ৳
        {data.securityDeposit?.toLocaleString()} required upfront.
      </InfoBox>
      <MessageToHost
        value={form.guestMessage}
        onChange={(val) => updateForm({ guestMessage: val })}
      />
    </div>
  );
}

export default function PropertyForm({
  data,
  rentalMode,
  form,
  updateForm,
  updateRentalMode,
}) {
  const showTabs = data.rentalType === "both";
  return (
    <div style={{ padding: 24 }}>
      {showTabs && (
        <RentalTypeTabs rentalMode={rentalMode} onSelect={updateRentalMode} />
      )}
      {rentalMode === "nightly" && (
        <NightlyForm data={data} form={form} updateForm={updateForm} />
      )}
      {rentalMode === "monthly" && (
        <MonthlyForm data={data} form={form} updateForm={updateForm} />
      )}
      {!rentalMode && (
        <div
          style={{
            color: "var(--muted)",
            fontSize: 14,
            textAlign: "center",
            padding: "32px 0",
          }}
        >
          ☝️ Select a rental type above to continue
        </div>
      )}
    </div>
  );
}
