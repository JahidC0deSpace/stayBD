// src/components/booking/BookingSummary.jsx
import React from "react";
import { Divider } from "./UI";

const TYPE_LABELS = {
  property: "🏠 Property",
  service: "🔧 Service",
  experience: "🎨 Experience",
};

const OWN_LISTING_ICONS = { property: "🏠", service: "🔧", experience: "🎨" };

export default function BookingSummary({
  data,
  selectedType,
  rentalMode,
  price,
  submitting,
  apiLogs,
  onBook,
  isOwnListing,
  ownListingMessage,
  error,
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 24,
        position: "sticky",
        top: 24,
      }}
    >
      <h3
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 18,
          fontWeight: 800,
          marginBottom: 20,
        }}
      >
        Booking Summary
      </h3>

      {data ? (
        <>
          {/* Service type */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}
            >
              Service Type
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {TYPE_LABELS[selectedType]}
            </div>
            {rentalMode && (
              <div
                style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}
              >
                {rentalMode === "nightly" ? "🌙 Nightly" : "📆 Monthly"} Rental
              </div>
            )}
          </div>

          <Divider style={{ margin: "12px 0" }} />

          {/* Price lines */}
          {price.lines?.length > 0 ? (
            price.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                  marginBottom: 10,
                }}
              >
                <span style={{ color: "var(--muted)" }}>{line.label}</span>
                <span style={{ fontWeight: 500 }}>
                  ৳{line.value.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div
              style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}
            >
              Complete the form to see pricing
            </div>
          )}

          {/* Total */}
          {price.total > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 14,
                borderTop: "1px solid var(--border)",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--accent2)",
                }}
              >
                ৳{price.total.toLocaleString()}
                <span
                  style={{ fontSize: 13, color: "var(--muted)", marginLeft: 4 }}
                >
                  {data.currency}
                </span>
              </span>
            </div>
          )}

          {/* Error / conflict banner */}
          {error && (
            <div
              style={{
                marginTop: 20,
                padding: "14px 16px",
                background: "rgba(255,90,90,0.08)",
                border: "1.5px solid rgba(255,90,90,0.3)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--error)",
                  marginBottom: 4,
                  fontFamily: "Syne, sans-serif",
                }}
              >
                ⚠️ Booking Unavailable
              </div>
              <div
                style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}
              >
                {error}
              </div>
            </div>
          )}

          {/* Own listing warning OR book button */}
          {isOwnListing ? (
            <div
              style={{
                marginTop: 20,
                padding: "16px",
                borderRadius: 12,
                background: "rgba(255,90,90,0.08)",
                border: "1.5px solid rgba(255,90,90,0.3)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>
                {OWN_LISTING_ICONS[selectedType]}
              </div>
              <div
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--error)",
                  marginBottom: 6,
                }}
              >
                Can't Book Your Own Listing
              </div>
              <div
                style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}
              >
                {ownListingMessage} You can manage it from your host dashboard
                instead.
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={onBook}
                disabled={!price.valid || submitting}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background:
                    price.valid && !submitting
                      ? "var(--accent)"
                      : "var(--border)",
                  border: "none",
                  color: price.valid && !submitting ? "#fff" : "var(--muted)",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor:
                    price.valid && !submitting ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  letterSpacing: "0.3px",
                }}
                onMouseEnter={(e) => {
                  if (price.valid && !submitting)
                    e.target.style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  if (price.valid && !submitting)
                    e.target.style.background = "var(--accent)";
                }}
              >
                {submitting
                  ? "⏳ Processing..."
                  : data.instantBooking
                    ? "⚡ Book Instantly"
                    : "📨 Request to Book"}
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  justifyContent: "center",
                  marginTop: 12,
                  color: data.instantBooking
                    ? "var(--success)"
                    : "var(--muted)",
                }}
              >
                {data.instantBooking
                  ? "⚡ Instant confirmation"
                  : "⏳ Host approval required"}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Select a service type to begin
        </div>
      )}

      {/* API Log */}
      <div
        style={{
          marginTop: 20,
          padding: 14,
          background: "var(--surface2)",
          borderRadius: 10,
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            fontFamily: "Syne, sans-serif",
            marginBottom: 8,
          }}
        >
          🔌 API Log
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 1.8,
            maxHeight: 120,
            overflowY: "auto",
          }}
        >
          {apiLogs.length > 0 ? (
            apiLogs.map((log, i) => (
              <div
                key={i}
                style={{
                  color:
                    log.type === "success"
                      ? "var(--success)"
                      : log.type === "err"
                        ? "var(--error)"
                        : "var(--muted)",
                }}
              >
                {log.msg}
              </div>
            ))
          ) : (
            <div style={{ color: "var(--muted)" }}>No requests yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
