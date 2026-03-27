import React from "react";
import { Badge } from "./UI";

const TYPE_ICONS = { property: "🏙️", service: "🔧", experience: "🎨" };
const TYPE_LABELS = {
  property: "🏠 Property",
  service: "🔧 Service",
  experience: "🎨 Experience",
};
const BADGE_VARIANTS = {
  property: "property",
  service: "service",
  experience: "experience",
};

export default function ServicePreview({ data, serviceType }) {
  const host = data.host || data.provider || {};

  return (
    <div style={{ padding: 24, borderBottom: "1px solid var(--border)" }}>
      {/* Title row */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            background: "var(--surface2)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
          }}
        >
          {TYPE_ICONS[serviceType]}
        </div>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: 8,
            }}
          >
            {data.title}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge variant={BADGE_VARIANTS[serviceType]}>
              {TYPE_LABELS[serviceType]}
            </Badge>
            {data.propertyType && (
              <Badge variant="property">{data.propertyType}</Badge>
            )}
            {data.category && (
              <Badge variant="experience">
                {data.category.replace("_", " ")}
              </Badge>
            )}
            {data.location && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                📍 {data.location.area}, {data.location.district}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Host row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--surface2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          👤
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {host.name || "Host"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {serviceType === "service" ? "Service Provider" : "Host"}
          </div>
        </div>
        {host.phone && (
          <div
            style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}
          >
            📞 {host.phone}
          </div>
        )}
      </div>
    </div>
  );
}
