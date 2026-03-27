// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../../services/firebase";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();

    // Client-side email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return toast.error("Please enter a valid email address");
    }

    setLoading(true);

    try {
      // See: Firebase Console → Authentication → Settings → Security
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);

      if (signInMethods.length === 0) {
        // User not found in Firebase Auth
        toast.error("No account found with this email address.");
      } else {
        await sendPasswordResetEmail(auth, email);
        toast.success("Reset link sent! Check your inbox (and spam folder).");
        navigate("/login");
      }
    } catch (error) {
      console.error("Password reset error:", error);

      // User-friendly error mapping
      if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error(
          error.message || "Failed to send reset link. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-brand-green/5 px-4 relative overflow-hidden">
      {/* 🎨 Decorative Animated Blur Blobs (aligned with LoginPage) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-primary-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-brand-green/30 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      </div>

      <div className="relative w-full max-w-md z-10 animate-fade-in">
        {/* 🇧🇩 Logo with Bangladesh Flag Colors (consistent with Register/Login) */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 no-underline"
          >
            <div className="w-10 h-10 rounded-xl flex items-center bg-emerald-600 relative overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <div className="w-5 h-5 bg-red-500 rounded-full ml-[25%]"></div>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Stay<span className="text-primary-600">BD</span>
            </span>
          </Link>
        </div>

        {/*Glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-card-hover border border-white/60">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Reset Password
          </h2>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>

          <form onSubmit={handleReset} className="space-y-5">
            {/* Email Field */}
            <div className="relative">
              <label className="sr-only">Email address</label>
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 text-gray-800 placeholder:text-gray-400"
                autoComplete="email"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold py-3.5 rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-lg shadow-primary-300/40 hover:shadow-xl hover:shadow-primary-400/50 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} StayBD. All rights reserved.
        </p>
      </div>
    </div>
  );
}
