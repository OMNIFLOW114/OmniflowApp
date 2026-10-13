// src/hooks/useHardwareBackExit.js
//
// Intercepts Android hardware back button on Capacitor native builds.
// Behavior:
//   - On "home" routes (configurable): double-tap to exit the app.
//   - On all other routes: standard back navigation via React Router.
//   - On web (non-native): no-op — the browser handles back.

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import toast from "react-hot-toast";

// Routes considered "home" — pressing back here will attempt to exit the app.
// Adjust this list if your home route path changes.
const HOME_ROUTES = ["/", "/trade-store", "/home"];

const EXIT_WINDOW_MS = 2000;      // Time in which a second tap exits the app
const EXIT_TOAST_ID = "exit-app-hint";

export default function useHardwareBackExit() {
  const navigate = useNavigate();
  const location = useLocation();

  // Track last tap timestamp across listener invocations
  const lastBackPressRef = useRef(0);

  // Keep latest pathname in a ref so the listener doesn't need to re-subscribe
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    // Only run on native (Android/iOS via Capacitor)
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;
    let removed = false;

    const setup = async () => {
      listenerHandle = await CapApp.addListener("backButton", ({ canGoBack }) => {
        const currentPath = pathnameRef.current;
        const isHome = HOME_ROUTES.includes(currentPath);

        if (isHome) {
          const now = Date.now();
          const elapsed = now - lastBackPressRef.current;

          if (elapsed < EXIT_WINDOW_MS) {
            // Second tap within window → exit the app
            toast.dismiss(EXIT_TOAST_ID);
            CapApp.exitApp();
            return;
          }

          // First tap → show hint toast, reset timer
          lastBackPressRef.current = now;
          toast("Press back again to exit", {
            id: EXIT_TOAST_ID,
            duration: EXIT_WINDOW_MS,
            style: {
              borderRadius: "14px",
              background: "#0f0f16",
              color: "#e5e7eb",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "12px 16px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            },
          });
          return;
        }

        // Not home → normal navigation
        if (canGoBack) {
          navigate(-1);
        } else {
          navigate("/", { replace: true });
        }
      });

      // If component unmounted during await, clean up immediately
      if (removed && listenerHandle) {
        listenerHandle.remove();
        listenerHandle = null;
      }
    };

    setup();

    return () => {
      removed = true;
      if (listenerHandle) {
        listenerHandle.remove();
        listenerHandle = null;
      }
    };
  }, [navigate]);
}
