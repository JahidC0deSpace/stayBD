import { Link, useParams } from "react-router-dom";

export default function BookingCancelPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-7xl mb-6">😔</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Payment Cancelled
      </h1>
      <p className="text-gray-500 max-w-md mb-8">
        You cancelled the payment. Your booking has not been confirmed. You can
        try again anytime.
      </p>
      <div className="flex gap-4">
        <Link
          to={`/book/${id}`}
          className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
        >
          Try Again
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
