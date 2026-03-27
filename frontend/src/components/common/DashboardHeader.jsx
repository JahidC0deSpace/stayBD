import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHome } from "react-icons/fi"; // Added FiHome

export default function DashboardHeader({ title, subtitle }) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <div className="flex gap-4 mb-2">
        {" "}
        {/* Added wrapper for layout */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors group"
        >
          <FiArrowLeft className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <FiHome className="mr-1.5" />
          Home
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
