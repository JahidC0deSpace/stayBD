// src/components/booking/ServiceSelector.jsx
import React from "react";
import { useBookingStore } from "../../store/useBookingStore"; // 👈 Imported Store

const SERVICE_TYPES = [
  { key: "property", label: "Property", icon: "🏠", dot: "#f0a500" },
  { key: "service", label: "Service", icon: "🔧", dot: "#00d4aa" },
  { key: "experience", label: "Experience", icon: "🎨", dot: "#7c5cfc" },
];

export default function ServiceSelector() {
  // 👈 Read the selected type and the setter action directly from Zustand
  const selectedType = useBookingStore((state) => state.serviceType);
  const onSelect = useBookingStore((state) => state.setServiceType);

  return (
    <div
      style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}
    >
      {SERVICE_TYPES.map((t) => {
        const active = selectedType === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            style={{
              padding: "10px 20px",
              borderRadius: 100,
              border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              cursor: "pointer",
              fontFamily: "Syne, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--text)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--muted)";
              }
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.dot,
                display: "inline-block",
              }}
            />
            {t.icon} {t.label}
          </button>
        );
      })}
    </div>
  );
}
