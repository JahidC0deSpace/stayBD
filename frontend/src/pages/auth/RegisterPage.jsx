// src/pages/auth/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { auth } from "../../services/firebase";
import api from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";
import {
  DIVISIONS,
  DISTRICTS_BY_DIVISION,
  ROLE_OPTIONS,
} from "../../utils/bdLocations";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    nationalIdNumber: "",
    role: "guest",
    address: { division: "", district: "", area: "", fullAddress: "" },
  });

  const isGuest = form.role === "guest";
  const needsApproval = !isGuest;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("address.")) {
      const field = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
          ...(field === "division" ? { district: "" } : {}), // Reset district if division changes
        },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validateStep2 = () => {
    if (!form.name.trim()) return toast.error("Please enter your full name");
    if (!form.email.trim()) return toast.error("Please enter your email");
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return toast.error("Invalid email format");
    if (form.password.length < 6)
      return toast.error("Password must be 6+ characters");
    return true;
  };

  const validateStep3 = () => {
    if (!form.phone.trim())
      return toast.error("Please enter your phone number");
    const digits = form.phone.replace(/\D/g, "");
    const validBDPhone =
      (digits.startsWith("880") && digits.length === 13) ||
      (digits.startsWith("01") && digits.length === 11);
    if (!validBDPhone)
      return toast.error(
        "Enter valid BD phone (01XXXXXXXXX or +8801XXXXXXXXX)",
      );

    if (!form.nationalIdNumber.trim())
      return toast.error("NID is required for account verification");

    if (!form.address.division)
      return toast.error("Please select your division");
    if (!form.address.district)
      return toast.error("Please select your district");
    if (!form.address.area.trim())
      return toast.error("Please enter your area or thana");
    if (!form.address.fullAddress.trim())
      return toast.error("Please enter your full address");

    return true;
  };

  const getBackendRole = (frontendRole) => {
    switch (frontendRole) {
      case "host":
        return "host";
      case "service_provider":
        return "service_provider";
      default:
        return "guest";
    }
  };

  const handleEmailRegister = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    let firebaseUser = null;

    try {
      // 1. Create user in Firebase
      const res = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );
      firebaseUser = res.user;
      const token = await firebaseUser.getIdToken();

      // 2. Prepare Data for MongoDB (Added UID to fix 403 error)
      const syncData = {
        uid: firebaseUser.uid, // <--- CRITICAL FIX FOR BACKEND
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: getBackendRole(form.role),
        authProvider: "email",
        nationalIdNumber: form.nationalIdNumber.trim(),
        address: {
          division: form.address.division,
          district: form.address.district,
          area: form.address.area.trim(),
          fullAddress: form.address.fullAddress.trim(),
        },
        requiresApproval: needsApproval,
        isVerified: isGuest,
      };

      // 3. Sync with MongoDB
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const backendResponse = await api.post("/users/sync", syncData);

      // 4. Update Zustand Store with full backend user data
      const dbUser =
        backendResponse.data?.data?.user ||
        backendResponse.data?.user ||
        syncData;
      login(dbUser, token);

      const successMsg = isGuest
        ? "Welcome to StayBD! You can now browse & book properties. 🎉"
        : "Account created! Your profile is pending admin approval.";

      toast.success(successMsg);
      navigate("/");
    } catch (err) {
      // Rollback Firebase if MongoDB sync fails
      if (firebaseUser) {
        try {
          await deleteUser(firebaseUser);
        } catch (deleteErr) {
          console.error("⚠️ Critical: Rollback failed", deleteErr);
        }
      }

      console.error("Raw Error Object:", err);

      // Extract error message safely
      let finalMessage = "Registration failed";
      if (err.response?.data) {
        finalMessage =
          typeof err.response.data === "object"
            ? err.response.data.message ||
              err.response.data.error ||
              JSON.stringify(err.response.data)
            : err.response.data;
      } else if (err.message) {
        finalMessage = err.message;
      }

      // Ensure it's a string
      if (typeof finalMessage === "object") {
        finalMessage = finalMessage.message || JSON.stringify(finalMessage);
      }

      // Friendly Firebase errors
      if (err.code === "auth/email-already-in-use") {
        finalMessage = "Email already registered. Please sign in.";
      }

      toast.error(String(finalMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === 2 && validateStep2()) setStep(3);
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400";

  const inputWithIconCls =
    "w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 no-underline">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-green rounded-2xl shadow-card mb-4 relative overflow-hidden">
              <div className="w-7 h-7 bg-brand-red rounded-full ml-[2%]"></div>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Stay<span className="text-primary-600">BD</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">
            Create your account
          </h2>
        </div>

        {/* Stepper Visuals */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 w-full max-w-md">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step >= s
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      step > s ? "bg-primary-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form
          onKeyDown={handleKeyDown}
          onSubmit={(e) => {
            e.preventDefault();
            handleEmailRegister();
          }}
        >
          {/* STEP 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-gray-600 text-sm text-center">
                How do you plan to use StayBD?
              </p>
              <div className="space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => {
                      set("role", role.value);
                      setStep(2);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      form.role === role.value
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{role.label}</p>
                    <p className="text-xs text-gray-500">{role.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={inputWithIconCls}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <FiMail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@email.com"
                    className={inputWithIconCls}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <FiLock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••"
                    className={inputWithIconCls}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? (
                      <FiEyeOff size={16} />
                    ) : (
                      <FiEye size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Verification & Address */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="017..."
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NID Number
                  </label>
                  <input
                    name="nationalIdNumber"
                    type="text"
                    value={form.nationalIdNumber}
                    onChange={handleChange}
                    placeholder="10 or 13 digits"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Division
                  </label>
                  <select
                    name="address.division"
                    value={form.address.division}
                    onChange={handleChange}
                    className={inputCls}
                    required
                  >
                    <option value="">Select Division</option>
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <select
                    name="address.district"
                    value={form.address.district}
                    onChange={handleChange}
                    disabled={!form.address.division}
                    className={inputCls}
                    required
                  >
                    <option value="">Select District</option>
                    {(DISTRICTS_BY_DIVISION[form.address.division] || []).map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {/* NEW MISSING FIELDS ADDED HERE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area / Thana
                </label>
                <input
                  name="address.area"
                  type="text"
                  value={form.address.area}
                  onChange={handleChange}
                  placeholder="e.g., Dhanmondi, Gulshan"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address
                </label>
                <textarea
                  name="address.fullAddress"
                  value={form.address.fullAddress}
                  onChange={handleChange}
                  placeholder="House No, Road No, Block, etc."
                  rows="2"
                  className={`${inputCls} resize-none`}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary-600 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
