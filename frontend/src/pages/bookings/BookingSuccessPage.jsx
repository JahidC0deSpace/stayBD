import { useEffect, useState } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import { verifyPayment } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function BookingSuccessPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Not strictly needed right now, but good if you want to auto-redirect later
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("verifying"); // "verifying" | "confirmed" | "error"
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyPayment(sessionId);
        setBooking(result);
        setStatus("confirmed");
      } catch (err) {
        console.error("Payment verification failed:", err);
        setStatus("error");
      }
    };
    verify();
  }, [sessionId]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-gray-500 font-medium">Confirming your payment...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500 mb-6">
          We couldn't verify your payment. If you were charged, please contact
          support.
        </p>
        <Link
          to="/guest/my-bookings"
          className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
        >
          View My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-7xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Booking Confirmed!
      </h1>

      {booking?.bookingReference && (
        <div className="my-4 px-6 py-3 bg-gray-100 rounded-xl font-mono text-emerald-700 font-bold text-lg">
          {booking.bookingReference}
        </div>
      )}

      <p className="text-gray-500 max-w-md mb-8">
        Your payment was successful and your booking is confirmed. You'll
        receive a confirmation email shortly.
      </p>

      <div className="flex gap-4">
        <Link
          to={`/bookings/${id}`}
          className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
        >
          View Booking Details
        </Link>
        <Link
          to="/"
          className="px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
