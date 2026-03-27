// src/components/common/AccessDenied.jsx
import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiLock size={36} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You don't have permission to access this page. If you believe this is
          a mistake, please contact support.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary no-underline">
            Go Home
          </Link>
          <Link to="/profile" className="btn-secondary no-underline">
            My Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
