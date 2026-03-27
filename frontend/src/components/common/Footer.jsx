// src/components/common/Footer.jsx
import { Link } from "react-router-dom";
import {
  FiFacebook,
  FiTwitter,
  FiInstagram,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 mt-auto">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 no-underline mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center bg-[#006A4E] relative overflow-hidden shadow-sm">
                {/* The red disc is offset to the left (40% from the hoist side) */}
                <div className="w-6 h-6 bg-[#F42A41] rounded-full ml-[25%]"></div>
              </div>
              <span className="text-xl font-bold text-white">
                Stay<span className="text-primary-400">BD</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Bangladesh's premier rental and service marketplace. Find your
              perfect stay or book local services across all 64 districts.
            </p>
            <div className="flex gap-3 mt-4">
              {[FiFacebook, FiTwitter, FiInstagram].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary-500 flex items-center justify-center transition-colors"
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-white font-semibold mb-4">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                ["Properties", "/properties"],
                ["Services", "/services"],
                ["Experiences", "/experiences"],
                ["Map Search", "/map"],
                ["Popular Destinations", "/search"],
              ].map(([label, to]) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-gray-400 hover:text-primary-400 no-underline transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hosting */}
          <div>
            <h4 className="text-white font-semibold mb-4">Hosting</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                ["Become a Host", "/register"],
                ["Host Dashboard", "/host/dashboard"],
                ["List Your Service", "/register"],
                ["Host Analytics", "/host/analytics"],
              ].map(([label, to]) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-gray-400 hover:text-primary-400 no-underline transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <FiMapPin
                  size={14}
                  className="mt-0.5 shrink-0 text-primary-400"
                />
                Dhaka, Bangladesh
              </li>
              <li className="flex items-center gap-2">
                <FiPhone size={14} className="text-primary-400" />
                +880 123456789
              </li>
              <li className="flex items-center gap-2">
                <FiMail size={14} className="text-primary-400" />
                support@staybd.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} StayBD. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-gray-300 no-underline">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-300 no-underline">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-300 no-underline">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
