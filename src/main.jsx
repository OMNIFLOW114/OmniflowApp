import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationBadgeProvider } from "./context/NotificationBadgeContext";
import './i18n'; // Initialize i18next before anything else
import "./index.css";
import { Toaster } from "react-hot-toast";

// DO NOT expose supabase to window - this is a security risk
// Remove this line: window.supabase = supabase;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <NotificationBadgeProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </NotificationBadgeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);