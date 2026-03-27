// src/components/booking/DynamicBookingForm.jsx
import React from "react";
import { useBookingStore } from "../../store/useBookingStore";
import PropertyForm from "./PropertyForm";
import ServiceForm from "./ServiceForm";
import ExperienceForm from "./ExperienceForm";
import { Spinner } from "./UI";

export default function DynamicBookingForm() {
  const selectedType = useBookingStore((state) => state.selectedType);
  const data = useBookingStore((state) => state.data);
  const loading = useBookingStore((state) => state.loading);

  if (loading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spinner size={40} />
      </div>
    );
  }

  // Act as a router for your booking forms
  switch (selectedType) {
    case "property":
      return <PropertyForm />;
    case "service":
      return <ServiceForm />;
    case "experience":
      return <ExperienceForm />;
    default:
      return null;
  }
}
