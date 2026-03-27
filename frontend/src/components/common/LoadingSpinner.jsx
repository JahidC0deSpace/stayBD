// src/components/common/LoadingSpinner.jsx
export default function LoadingSpinner({ size = "md", className = "" }) {
  const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };
  return <div className={`spinner ${sizes[size] || sizes.md} ${className}`} />;
}
