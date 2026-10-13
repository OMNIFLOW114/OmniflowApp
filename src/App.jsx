// App.jsx - FULLY UPDATED: Secure, Production-Ready with Network Handling
// + Native OAuth Deep Link Handler (Supabase Google login on Android/iOS)
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import { NetworkProvider, useNetwork } from "./context/NetworkContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Toaster } from "react-hot-toast";
import Modal from "react-modal";
import 'swiper/css';
import "./App.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Capacitor imports for native deep-link handling
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

// Pages / Components
import Home from "./components/Home";
import Auth from "./components/Auth";
import Profile from "./components/Profile";
import Notifications from "./components/Notifications";
import HelpCenter from "./components/HelpCenter";
import Settings from "./components/Settings";
import BottomNav from "@/components/BottomNav";
import ProductDetail from "@/pages/ProductDetail";
import ResetPassword from "@/components/ResetPassword";
import VerifyOtp from "@/components/VerifyOtp";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import BuyerOrders from "@/pages/BuyerOrders";
import SellProductPage from './pages/SellProductPage';
import StartRestaurantPage from './pages/StartRestaurantPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import RestaurantDetailPage from './pages/RestaurantDetailPage';
import ProductDetailPage from './pages/ProductDetailPage';
import BecomeDeliveryAgentPage from './pages/BecomeDeliveryAgentPage';
import StudentChatPage from './pages/StudentChatPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import StudentEarningsPage from './pages/StudentEarningsPage';
import TermsPage from "@/components/TermsPage";
import FlashSalesPage from './components/FlashSalesPage';
import OrderDetail from "@/pages/OrderDetail";
import PrivacyPage from './pages/PrivacyPage';
import FeaturedPage from "./pages/FeaturedPage";
// Main Features
import OmniPayWallet from "./pages/OmniPayWallet";
import CurrencyConverter from "@/pages/CurrencyConverter";
import AboutUs from '@/pages/AboutUs';

// Marketplace
import TradeStore from "./pages/TradeStore";
import CreateStore from "./pages/CreateStore";
import StoreDashboard from "./pages/StoreDashboard";
import MyInstallments from "./pages/MyInstallments";
import Checkout from "@/pages/Checkout";
import Premium from './pages/Premium';
import SearchPage from "./pages/SearchPage";
import StoreDashboardV2 from './pages/StoreDashboardV2';
import NewMessages from './pages/NewMessages';
import ReportProductPage from "./pages/ReportProductPage";
// Student
import StudentDashboard from "./pages/StudentDashboard";
import CategoryPage from "./pages/CategoryPage";
import CampusSearchPage from "./pages/CampusSearchPage"
import CampusFlashSales from "./pages/CampusFlashSales";
import CampusTrendingNow from "./pages/CampusTrendingNow";
import CampusRecommendedForYou from "./pages/CampusRecommendedForYou";
import CampusNearbyRestaurants from "./pages/CampusNearbyRestaurants";
import CampusPopularServices from "./pages/CampusPopularServices";
import OfferServicePage from "./pages/OfferServicePage";
import StudentProfilePage from "./pages/StudentProfilePage";
import StudentNotificationsPage from "./pages/StudentNotificationsPage";

// Admin
import AdminWallet from "./pages/AdminWallet";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import StoreOversight from "./pages/admin/StoreOversight";
import ProductModeration from "./pages/admin/ProductModeration";
import MessageMonitoring from './pages/admin/MessageMonitoring';
import SystemSettings from './pages/admin/SystemSettings';
import Ratings from "./pages/admin/Ratings";
import AdminInstallmentsPage from "./pages/admin/AdminInstallments";
import CategoryManagement from '@/pages/admin/CategoryManagement';
import FinancialControl from '@/pages/admin/FinancialControl';
import ReportsAnalytics from '@/pages/admin/ReportsAnalytics';
import AdminManagement from '@/pages/admin/AdminManagement';
import PromotionsOffers from '@/pages/admin/PromotionsOffers';
import DatabaseManagement from '@/pages/admin/DatabaseManagement';
import DashboardOverview from '@/pages/admin/DashboardOverview';
import AdminAuth from "@/pages/admin/AdminAuth";
import { supabase } from "@/supabase";

// Network Components
import NoInternetConnection from "@/components/NoInternetConnection";

// ================================================================
// NATIVE OAUTH DEEP LINK URL — must match:
//   - AndroidManifest.xml intent-filter (scheme + host)
//   - Info.plist CFBundleURLSchemes
//   - Supabase Dashboard → Authentication → Redirect URLs
// ================================================================
const NATIVE_DEEP_LINK = "ke.co.omniflowapp://login-callback";

// Create a client for React Query - Optimized for production
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Scroll to top component - preserves scroll position on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ================================================================
// NATIVE DEEP LINK LISTENER
//
// The problem: supabase.auth.exchangeCodeForSession() and
// supabase.auth.setSession() both internally `await` every
// onAuthStateChange subscriber. If any subscriber's callback
// re-renders and re-subscribes, the chain can deadlock forever —
// which is exactly what happened on Transsion/Infinix WebViews.
//
// The solution: manually exchange the code for tokens, then write
// the session blob directly to localStorage under the exact key
// Supabase uses. Then reload the WebView. On cold boot,
// AuthContext.getSession() reads from storage without any
// notification chain to hang on. Same reason "close the app and
// reopen" works today — this just automates it.
// ================================================================
function NativeDeepLinkHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;

    const setup = async () => {
      try {
        listener = await CapacitorApp.addListener("appUrlOpen", async (event) => {
          console.log("🔗 [deep-link] appUrlOpen:", event.url);

          if (!event.url.startsWith(NATIVE_DEEP_LINK)) {
            console.log("🔗 [deep-link] ignoring — not our scheme");
            return;
          }

          try {
            const url = new URL(event.url);
            const code = url.searchParams.get("code");
            const errorDescription = url.searchParams.get("error_description");
            const error = url.searchParams.get("error");

            if (errorDescription || error) {
              console.error(
                "🔴 [deep-link] OAuth error:",
                errorDescription || error
              );
              return;
            }
            if (!code) {
              console.warn("🟡 [deep-link] no code in URL:", event.url);
              return;
            }

            console.log("🔑 [deep-link] code received, closing browser...");
            try {
              await Browser.close();
            } catch (err) {
              console.warn("🟡 [deep-link] Browser.close failed:", err);
            }

            await new Promise((r) => setTimeout(r, 600));

            // ------------------------------------------------------
            // Step 1: Read our captured PKCE verifier
            // ------------------------------------------------------
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
            const storageKey = `sb-${projectRef}-auth-token`;

            let codeVerifier = null;
            try {
              codeVerifier = localStorage.getItem("__omniflow_pkce_verifier__");
            } catch {
              /* ignore */
            }

            if (!codeVerifier) {
              const candidates = [
                `sb-${projectRef}-auth-token-code-verifier`,
                `sb-${projectRef}-pkce-code-verifier`,
              ];
              for (const k of candidates) {
                try {
                  const v = localStorage.getItem(k);
                  if (v) {
                    try {
                      const parsed = JSON.parse(v);
                      codeVerifier = typeof parsed === "string" ? parsed : v;
                    } catch {
                      codeVerifier = v;
                    }
                    if (codeVerifier) break;
                  }
                } catch {
                  /* ignore */
                }
              }
            }

            if (!codeVerifier) {
              console.error("🔴 [deep-link] no code_verifier found");
              console.log(
                "🔵 [deep-link] available auth keys:",
                Object.keys(localStorage).filter(
                  (k) => k.startsWith("sb-") || k.includes("verifier")
                )
              );
              return;
            }

            // ------------------------------------------------------
            // Step 2: POST the code + verifier to Supabase
            // ------------------------------------------------------
            console.log("🔑 [deep-link] posting to /auth/v1/token...");
            const tokenResp = await fetch(
              `${supabaseUrl}/auth/v1/token?grant_type=pkce`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  auth_code: code,
                  code_verifier: codeVerifier,
                }),
              }
            );

            if (!tokenResp.ok) {
              const errText = await tokenResp.text().catch(() => "");
              console.error(
                "🔴 [deep-link] token endpoint error:",
                tokenResp.status,
                errText
              );
              return;
            }

            const tokens = await tokenResp.json();
            console.log(
              "🟢 [deep-link] tokens received — writing to storage directly"
            );

            // ------------------------------------------------------
            // Step 3: Write the session blob directly to localStorage
            //         in the exact shape Supabase expects on read
            // ------------------------------------------------------
            const now = Math.floor(Date.now() / 1000);
            const sessionPayload = {
              access_token: tokens.access_token,
              token_type: tokens.token_type || "bearer",
              expires_in: tokens.expires_in || 3600,
              expires_at:
                tokens.expires_at ||
                now + (tokens.expires_in || 3600),
              refresh_token: tokens.refresh_token,
              user: tokens.user,
            };

            try {
              localStorage.setItem(storageKey, JSON.stringify(sessionPayload));
              localStorage.removeItem("__omniflow_pkce_verifier__");
              try {
                localStorage.removeItem(
                  `sb-${projectRef}-auth-token-code-verifier`
                );
              } catch {
                /* ignore */
              }
              console.log(
                "✅ [deep-link] session written — reloading WebView"
              );
            } catch (err) {
              console.error("🔴 [deep-link] storage write failed:", err);
              return;
            }

            // ------------------------------------------------------
            // Step 4: Reload the WebView so AuthContext reads the
            //         session on cold start — no subscriber chain
            // ------------------------------------------------------
            setTimeout(() => {
              window.location.replace("/");
            }, 100);
          } catch (err) {
            console.error("🔴 [deep-link] handler error:", err);
          }
        });
      } catch (err) {
        console.error("🔴 [deep-link] failed to attach listener:", err);
      }
    };

    setup();

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
    };
  }, []);

  return null;
}

// Protected Route - requires authentication with network check
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { isOnline } = useNetwork();

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-lg">
        Loading...
      </div>
    );

  if (!isOnline) {
    return <NoInternetConnection />;
  }

  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// ✅ FIXED: Admin Route - checks if user is in admin_users table
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const { isOnline } = useNetwork();
  const [isAdmin, setIsAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        console.log("🔍 AdminRoute checking user:", user.id, user.email);

        let { data: adminData, error } = await supabase
          .from("admin_users")
          .select("id, role, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!adminData && !error) {
          console.log("🔍 Not found by user_id, trying by email:", user.email);
          const { data: adminByEmail } = await supabase
            .from("admin_users")
            .select("id, role, is_active")
            .eq("email", user.email)
            .eq("is_active", true)
            .maybeSingle();

          if (adminByEmail) {
            adminData = adminByEmail;
            if (!adminByEmail.user_id) {
              console.log("🔄 Updating user_id for admin:", adminByEmail.id);
              await supabase
                .from("admin_users")
                .update({ user_id: user.id })
                .eq("id", adminByEmail.id);
            }
          }
        }

        if (adminData) {
          console.log("✅ AdminRoute: User is admin:", adminData.role);
          setIsAdmin(true);
        } else {
          console.log("❌ AdminRoute: User is NOT admin");
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("❌ Admin check error:", err);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [user]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg">
        Checking admin access...
      </div>
    );
  }

  if (!isOnline) {
    return <NoInternetConnection />;
  }

  if (!user || !isAdmin) {
    console.log("🚫 AdminRoute: Redirecting to home - not admin");
    return <Navigate to="/" replace />;
  }

  return children;
}

// Main Routes Component with Network Monitoring
function AppRoutes() {
  const { user: User } = useAuth();
  const { isOnline, wasOffline, isSlowConnection } = useNetwork();

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes - Accessible even offline (will show cached content) */}
        <Route path="/" element={<TradeStore />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/flash-sales" element={<FlashSalesPage />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/order/:orderId" element={<OrderDetail />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/featured" element={<FeaturedPage />} />

        {/* Protected User Routes - Require internet */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><OmniPayWallet /></ProtectedRoute>} />
        <Route path="/convert-currency" element={<ProtectedRoute><CurrencyConverter /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><NewMessages /></ProtectedRoute>} />
        <Route path="/trade" element={<ProtectedRoute><TradeStore /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><BuyerOrders /></ProtectedRoute>} />
        <Route path="/my-installments" element={<ProtectedRoute><MyInstallments user={User} /></ProtectedRoute>} />

        {/* Seller Routes */}
        <Route path="/seller/dashboard" element={<ProtectedRoute><StoreDashboardV2 /></ProtectedRoute>} />
        <Route path="/store/create" element={<ProtectedRoute><CreateStore /></ProtectedRoute>} />
        <Route path="/dashboard/store/:storeId" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
        <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />

        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/sell-product" element={<ProtectedRoute><SellProductPage /></ProtectedRoute>} />
        <Route path="/student/start-restaurant" element={<ProtectedRoute><StartRestaurantPage /></ProtectedRoute>} />
        <Route path="/student/service/:id" element={<ProtectedRoute><ServiceDetailPage /></ProtectedRoute>} />
        <Route path="/student/restaurant/:id" element={<ProtectedRoute><RestaurantDetailPage /></ProtectedRoute>} />
        <Route path="/student/product/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
        <Route path="/student/become-delivery-agent" element={<ProtectedRoute><BecomeDeliveryAgentPage /></ProtectedRoute>} />
        <Route path="/student/chat/:chatId" element={<ProtectedRoute><StudentChatPage /></ProtectedRoute>} />
        <Route path="/student/orders" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
        <Route path="/student/earnings" element={<ProtectedRoute><StudentEarningsPage /></ProtectedRoute>} />
        <Route path="/student/category/:categoryId" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
        <Route path="/student/campus-search" element={<ProtectedRoute><CampusSearchPage /></ProtectedRoute>} />
        <Route path="/student/campus-flash-sales" element={<ProtectedRoute><CampusFlashSales /></ProtectedRoute>} />
        <Route path="/student/campus-trending-now" element={<ProtectedRoute><CampusTrendingNow /></ProtectedRoute>} />
        <Route path="/student/campus-recommended" element={<ProtectedRoute><CampusRecommendedForYou /></ProtectedRoute>} />
        <Route path="/student/campus-nearby-restaurants" element={<ProtectedRoute><CampusNearbyRestaurants /></ProtectedRoute>} />
        <Route path="/student/campus-popular-services" element={<ProtectedRoute><CampusPopularServices /></ProtectedRoute>} />
        <Route path="/student/offer-service" element={<ProtectedRoute><OfferServicePage /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
        <Route path="/student/notifications" element={<ProtectedRoute><StudentNotificationsPage /></ProtectedRoute>} />
        <Route path="/student/report-product/:id" element={<ProtectedRoute><ReportProductPage /></ProtectedRoute>} />

        {/* Admin Routes - Protected by AdminRoute (FIXED) */}
        <Route path="/admin" element={<AdminAuth />} />
        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/admin/stores" element={<AdminRoute><StoreOversight /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><ProductModeration /></AdminRoute>} />
        <Route path="/admin/messages" element={<AdminRoute><MessageMonitoring /></AdminRoute>} />
        <Route path="/admin/ratings" element={<AdminRoute><Ratings /></AdminRoute>} />
        <Route path="/admin/installments" element={<AdminRoute><AdminInstallmentsPage /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><CategoryManagement /></AdminRoute>} />
        <Route path="/admin/finance" element={<AdminRoute><FinancialControl /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><ReportsAnalytics /></AdminRoute>} />
        <Route path="/admin/admins" element={<AdminRoute><AdminManagement /></AdminRoute>} />
        <Route path="/admin/promotions" element={<AdminRoute><PromotionsOffers /></AdminRoute>} />
        <Route path="/admin/overview" element={<AdminRoute><DashboardOverview /></AdminRoute>} />
        <Route path="/admin/database" element={<AdminRoute><DatabaseManagement /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><SystemSettings /></AdminRoute>} />
        <Route path="/admin/wallet" element={<AdminRoute><AdminWallet /></AdminRoute>} />
        <Route path="/admin/invite/:token" element={<AdminAuth mode="invite" />} />

        {/* Auth Utility Routes */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

// Main App Component - Wrapped with NetworkProvider
export default function App() {
  const PAYPAL_CLIENT_ID = "AafXEhKIfb17UbunbfNiv5e_h1mtg3fpjx_7c-1EFLnTxHQsJF-a_l1q-W7exOKcfcBafNvKTjJOkrt2";
  Modal.setAppElement("#root");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NetworkProvider>
          <DarkModeProvider>
            <PayPalScriptProvider
              options={{
                "client-id": PAYPAL_CLIENT_ID,
                currency: "USD",
                intent: "capture",
                vault: false,
                debug: false,
              }}
            >
              <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col text-black dark:text-white transition-colors">
                {/* Global Toast Notifications - Single Instance */}
                <Toaster
                  position="top-right"
                  reverseOrder={false}
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: "#ffffff",
                      color: "#000000",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "500",
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: "#10b981",
                        secondary: "#ffffff",
                      },
                      style: {
                        background: "#ecfdf5",
                        borderColor: "#a7f3d0",
                        color: "#065f46",
                      },
                    },
                    error: {
                      duration: 4000,
                      iconTheme: {
                        primary: "#ef4444",
                        secondary: "#ffffff",
                      },
                      style: {
                        background: "#fef2f2",
                        borderColor: "#fecaca",
                        color: "#991b1b",
                      },
                    },
                    loading: {
                      style: {
                        background: "#f3f4f6",
                        color: "#374151",
                      },
                    },
                  }}
                />
                {/* Native OAuth deep link handler - no-op on web */}
                <NativeDeepLinkHandler />
                <AppRoutes />
                <BottomNav />
              </div>
            </PayPalScriptProvider>
          </DarkModeProvider>
        </NetworkProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}