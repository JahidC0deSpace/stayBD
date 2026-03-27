import React from "react";

const TYPE_ICONS = { property: "🏠", service: "🔧", experience: "🎨" };

export default function ConfirmationModal({ modal, onClose }) {
  if (!modal) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: 40,
          maxWidth: 420,
          width: "90%",
          textAlign: "center",
          animation: "fadeIn 0.3s ease",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>
          {TYPE_ICONS[modal.type]}
        </div>
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>Booking Confirmed!</h2>

        <div
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "var(--accent2)",
            background: "var(--surface2)",
            padding: "8px 16px",
            borderRadius: 8,
            display: "inline-block",
            marginBottom: 20,
          }}
        >
          {modal.bookingId}
        </div>

        <p
          style={{
            color: "var(--muted)",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Your booking for{" "}
          <strong style={{ color: "var(--text)" }}>{modal.title}</strong> has
          been successfully submitted. You'll receive a confirmation shortly.
        </p>

        <button
          onClick={onClose}
          style={{
            padding: "12px 32px",
            borderRadius: 100,
            background: "var(--accent)",
            border: "none",
            color: "#fff",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.target.style.background = "var(--accent-hover)")
          }
          onMouseLeave={(e) => (e.target.style.background = "var(--accent)")}
        >
          Done
        </button>
      </div>
    </div>
  );
}
