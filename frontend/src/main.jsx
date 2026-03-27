import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import BanGuard from "./components/auth/BannedGuard";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <BanGuard>
      <App />
    </BanGuard>
  </BrowserRouter>,
);
