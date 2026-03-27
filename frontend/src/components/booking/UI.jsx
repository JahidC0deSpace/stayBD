import React from "react";

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: "3px solid var(--border)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
const badgeStyles = {
  property: {
    background: "rgba(240,165,0,0.15)",
    color: "var(--accent2)",
    border: "1px solid rgba(240,165,0,0.3)",
  },
  service: {
    background: "rgba(0,212,170,0.15)",
    color: "var(--accent3)",
    border: "1px solid rgba(0,212,170,0.3)",
  },
  experience: {
    background: "rgba(124,92,252,0.15)",
    color: "var(--accent)",
    border: "1px solid rgba(124,92,252,0.3)",
  },
  neutral: {
    background: "var(--surface2)",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  },
};

export function Badge({ variant = "neutral", children }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "Syne, sans-serif",
        display: "inline-flex",
        alignItems: "center",
        ...badgeStyles[variant],
      }}
    >
      {children}
    </span>
  );
}

// ─── DIVIDER ─────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return (
    <div
      style={{
        height: 1,
        background: "var(--border)",
        margin: "20px 0",
        ...style,
      }}
    />
  );
}

// ─── INFO BOX ─────────────────────────────────────────────────────────────────
export function InfoBox({ children, style }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "rgba(124,92,252,0.08)",
        border: "1px solid rgba(124,92,252,0.2)",
        borderRadius: "var(--radius-sm)",
        fontSize: 13,
        color: "var(--muted)",
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── FORM LABEL ───────────────────────────────────────────────────────────────
export function FormLabel({ children }) {
  return (
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        fontFamily: "Syne, sans-serif",
        marginBottom: 8,
        display: "block",
      }}
    >
      {children}
    </label>
  );
}

// ─── FORM INPUT ───────────────────────────────────────────────────────────────
export function FormInput({ style, ...props }) {
  return (
    <input
      style={{
        width: "100%",
        padding: "12px 14px",
        background: "var(--surface2)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        outline: "none",
        transition: "border-color var(--transition)",
        ...style,
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      {...props}
    />
  );
}

// ─── FORM SELECT ─────────────────────────────────────────────────────────────
export function FormSelect({ children, style, ...props }) {
  return (
    <select
      style={{
        width: "100%",
        padding: "12px 14px",
        background: "var(--surface2)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── STEPPER ─────────────────────────────────────────────────────────────────
export function Stepper({ value, onChange, min = 1, max = 99, suffix = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1.5px solid var(--border)",
          background: "var(--surface2)",
          color: "var(--text)",
          fontSize: 18,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--transition)",
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = "var(--accent)";
          e.target.style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = "var(--border)";
          e.target.style.color = "var(--text)";
        }}
      >
        −
      </button>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "Syne, sans-serif",
          minWidth: 32,
          textAlign: "center",
        }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1.5px solid var(--border)",
          background: "var(--surface2)",
          color: "var(--text)",
          fontSize: 18,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--transition)",
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = "var(--accent)";
          e.target.style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = "var(--border)";
          e.target.style.color = "var(--text)";
        }}
      >
        +
      </button>
      {suffix && (
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{suffix}</span>
      )}
    </div>
  );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
export function SectionTitle({ icon, children, small }) {
  return (
    <div
      style={{
        fontSize: small ? 13 : 16,
        fontWeight: 700,
        fontFamily: "Syne, sans-serif",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon && <span style={{ fontSize: small ? 14 : 18 }}>{icon}</span>}
      {children}
    </div>
  );
}
