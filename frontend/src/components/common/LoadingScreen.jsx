// src/components/common/LoadingScreen.jsx
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#006A4E] relative overflow-hidden shadow-sm mx-auto mb-4">
          <div className="w-6 h-6 bg-[#F42A41] rounded-full"></div>
        </div>

        <div className="spinner w-8 h-8 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading StayBD...</p>
      </div>
    </div>
  );
}
