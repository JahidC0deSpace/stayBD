import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react"; // Optional: lucide-react for icons

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon Circle */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
          <ShieldAlert className="h-10 w-10 text-red-600" strokeWidth={2} />
        </div>

        {/* Text Content */}
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          403 - Restricted Access
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Oops! You don't have the required permissions to view this page.
          Please contact an administrator if you believe this is a mistake.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)} // Goes back to the previous page
            className="flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </button>

          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
