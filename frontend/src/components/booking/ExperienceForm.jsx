// src/components/booking/ExperienceForm.jsx
import React from "react";
import {
  FormLabel,
  FormSelect,
  Stepper,
  SectionTitle,
  Divider,
  InfoBox,
} from "./UI";
import { format, parseISO, isValid } from "date-fns";

const safeFormatDate = (val, fmt = "EEE, MMM dd") => {
  if (!val) return "Date TBA";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  return isValid(d) ? format(d, fmt) : "Date TBA";
};

function ScheduleCard({ session, selected, onSelect }) {
  const slotMax = session.maxParticipants ?? 0;
  const slotCurrent = session.currentParticipants ?? 0;
  const spotsLeft =
    session.availableSlots ?? Math.max(0, slotMax - slotCurrent);
  const isFull = spotsLeft <= 0;

  return (
    <div
      onClick={() => !isFull && onSelect(session._id)}
      style={{
        padding: 12,
        border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 10,
        cursor: isFull ? "not-allowed" : "pointer",
        background: selected
          ? "rgba(124,92,252,0.1)"
          : isFull
            ? "rgba(0,0,0,0.03)"
            : "var(--surface2)",
        opacity: isFull ? 0.55 : 1,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "Syne, sans-serif",
          color: "var(--accent)",
          marginBottom: 4,
        }}
      >
        {safeFormatDate(session.date, "EEE, MMM dd")}
      </div>
      {(session.startTime || session.time) && (
        <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
          ⏰{" "}
          {session.startTime
            ? `${session.startTime}${session.endTime ? ` – ${session.endTime}` : ""}`
            : session.time}
        </div>
      )}
      {session.durationHours && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          ⏱️ {session.durationHours}h duration
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isFull
            ? "var(--error)"
            : spotsLeft <= 2
              ? "#f0a500"
              : "var(--success)",
        }}
      >
        {isFull
          ? "Sold out"
          : spotsLeft <= 2
            ? `⚡ Only ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
            : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} available`}
      </div>
    </div>
  );
}

export default function ExperienceForm({ data, form, updateForm }) {
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const includes = Array.isArray(data.includes) ? data.includes : [];
  const requirements = Array.isArray(data.requirements)
    ? data.requirements
    : [];
  const languages = Array.isArray(data.languages) ? data.languages : [];

  const groupedByDate = schedule.reduce((acc, s) => {
    const key = safeFormatDate(s.date, "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div style={{ padding: 24 }} className="animate-fade">
      <SectionTitle icon="🎨">Book Experience</SectionTitle>

      <div style={{ marginBottom: 20 }}>
        <FormLabel>Select Session</FormLabel>
        {schedule.length === 0 ? (
          <div
            style={{
              padding: "16px",
              background: "var(--surface2)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            No sessions available yet. Contact the host for more info.
          </div>
        ) : Object.keys(groupedByDate).length > 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(groupedByDate).map(([dateKey, sessions]) => (
              <div key={dateKey}>
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
                  {safeFormatDate(sessions[0].date, "EEEE, MMMM dd")}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {sessions.map((s) => (
                    <ScheduleCard
                      key={s._id}
                      session={s}
                      selected={form.scheduleId === s._id}
                      onSelect={(id) => updateForm({ scheduleId: id })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {schedule.map((s) => (
              <ScheduleCard
                key={s._id}
                session={s}
                selected={form.scheduleId === s._id}
                onSelect={(id) => updateForm({ scheduleId: id })}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <FormLabel>Participants (max {data.maxParticipants ?? "—"})</FormLabel>
        <Stepper
          value={form.participants || 1}
          min={1}
          max={data.maxParticipants || 99}
          onChange={(v) => updateForm({ participants: v })}
          suffix="people"
        />
      </div>

      {languages.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <FormLabel>Language</FormLabel>
          <FormSelect
            value={form.language || languages[0] || ""}
            onChange={(e) => updateForm({ language: e.target.value })}
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </FormSelect>
        </div>
      )}

      <Divider />

      {includes.length > 0 && (
        <>
          <SectionTitle icon="✓" small>
            What's Included
          </SectionTitle>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {includes.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                <span
                  style={{
                    color: "var(--success)",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  ✓
                </span>
                {typeof item === "string" ? item.replace(/["\[\]]/g, "") : item}
              </div>
            ))}
          </div>
        </>
      )}

      {requirements.length > 0 && (
        <>
          <SectionTitle icon="📋" small>
            Requirements
          </SectionTitle>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {requirements.map((r, i) => (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  display: "flex",
                  gap: 8,
                }}
              >
                <span>•</span>
                {typeof r === "string" ? r.replace(/["\[\]`]/g, "") : r}
              </div>
            ))}
          </div>
        </>
      )}

      {data.location?.meetingPoint && (
        <InfoBox>📍 Meeting Point: {data.location.meetingPoint}</InfoBox>
      )}
      {data.durationHours && (
        <InfoBox style={{ marginTop: 12 }}>
          ⏱️ Duration: {data.durationHours} hour
          {data.durationHours !== 1 ? "s" : ""}
        </InfoBox>
      )}
    </div>
  );
}
