import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationBadgeProvider } from "./context/NotificationBadgeContext";
import './i18n'; // Initialize i18next before anything else
import "./index.css";
import { supabase } from "./lib/supabaseClient";
window.supabase = supabase;
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationBadgeProvider>
          <App />
        </NotificationBadgeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
