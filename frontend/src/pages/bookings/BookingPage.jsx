// src/pages/bookings/BookingPage.jsx
import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useBookingStore } from "../../store/useBookingStore";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

import ServicePreview from "../../components/booking/ServicePreview";
import ServiceSelector from "../../components/booking/ServiceSelector";
import PropertyForm from "../../components/booking/PropertyForm";
import ServiceForm from "../../components/booking/ServiceForm";
import ExperienceForm from "../../components/booking/ExperienceForm";
import BookingSummary from "../../components/booking/BookingSummary";
import ConfirmationModal from "../../components/booking/ConfirmationModal";
import DashboardHeader from "../../components/common/DashboardHeader";

export default function BookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingType = searchParams.get("type") || "property";

  const {
    selectedType,
    loading,
    submitting,
    data,
    rentalMode,
    form,
    apiLogs,
    modal,
    error,
    loadService,
    updateForm,
    updateRentalMode,
    handleSubmit,
    closeModal,
    reset,
    isOwnListing,
    ownListingMessage,
    getPrice,
  } = useBookingStore();

  const price = getPrice();

  useEffect(() => {
    if (id && bookingType) loadService(bookingType, id);
    return () => reset();
  }, [id, bookingType]);

  function renderForm() {
    if (!data) return null;
    if (selectedType === "property")
      return (
        <PropertyForm
          data={data}
          rentalMode={rentalMode}
          form={form}
          updateForm={updateForm}
          updateRentalMode={updateRentalMode}
        />
      );
    if (selectedType === "service")
      return <ServiceForm data={data} form={form} updateForm={updateForm} />;
    if (selectedType === "experience")
      return <ExperienceForm data={data} form={form} updateForm={updateForm} />;
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Could not load booking details.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-emerald-600 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <DashboardHeader />
        <h1 className="text-3xl font-bold mb-8">Confirm your {selectedType}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* LEFT: Listing preview + dynamic form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              {data?.images?.[0]?.url && (
                <img
                  src={data.images[0].url}
                  alt={data.title}
                  className="w-full h-64 object-cover"
                />
              )}
              <ServicePreview data={data} serviceType={selectedType} />
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
              {renderForm()}
            </div>
          </div>

          {/* RIGHT: Price summary + book button */}
          <div className="lg:col-span-2">
            <BookingSummary
              data={data}
              selectedType={selectedType}
              rentalMode={rentalMode}
              price={price}
              submitting={submitting}
              apiLogs={apiLogs}
              onBook={handleSubmit}
              isOwnListing={isOwnListing()}
              ownListingMessage={ownListingMessage()}
              error={error}
            />
          </div>
        </div>
      </div>

      <ConfirmationModal modal={modal} onClose={closeModal} />
    </div>
  );
}
