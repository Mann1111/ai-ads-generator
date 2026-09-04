import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AdminPanel from "./admin/AdminPanel.jsx";
import "./index.css";

// No router library in this app — the buyer-facing wizard is the only real
// "page", so a plain path check is enough to also serve the small internal
// /admin settings page from the same build.
const isAdmin = window.location.pathname.replace(/\/+$/, "") === "/admin";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>{isAdmin ? <AdminPanel /> : <App />}</React.StrictMode>
);
