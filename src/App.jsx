// App.jsx - FULLY UPDATED: Secure, Production-Ready with Network Handling + Native Deep Link
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import { NetworkProvider, useNetwork } from "./context/NetworkContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Toaster } from "react-hot-toast";
import Modal from "react-modal";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import 'swiper/css';
import "./App.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

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

// Protected Route - requires authentication with network check
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { isOnline } = useNetwork();
  
  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  
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
    return <div className="flex items-center justify-center min-h-screen text-lg">Checking admin access...</div>;
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
        {/* Public Routes */}
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
        
        {/* Protected User Routes */}
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
        <Route path="/store/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
        
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

        {/* Admin Routes */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Native Deep-Link Handler
// Registers exactly ONCE for the entire app lifetime.
// Also drains the "launch URL" for the cold-start case (Android
// launches the app from scratch with the deep link).
// ─────────────────────────────────────────────────────────────
function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;

    const processUrl = async (url) => {
      try {
        if (!url) return;
        if (!url.startsWith("ke.co.omniflowapp://")) return;

        console.log("[deep-link] processing:", url);

        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        const errorDescription = parsed.searchParams.get("error_description");
        const hash = parsed.hash ? parsed.hash.substring(1) : "";
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (errorDescription) {
          console.error("[deep-link] OAuth error:", errorDescription);
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[deep-link] exchangeCodeForSession error:", error);
            return;
          }
          if (data?.session && isMounted) {
            console.log("[deep-link] session established, navigating to /");
            navigate("/", { replace: true });
          }
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("[deep-link] setSession error:", error);
            return;
          }
          if (isMounted) {
            console.log("[deep-link] session set (implicit flow), navigating to /");
            navigate("/", { replace: true });
          }
        }
      } catch (err) {
        console.error("[deep-link] handling error:", err);
      }
    };

    // 1) Handle cold-start: Android may have launched us WITH a deep link.
    CapacitorApp.getLaunchUrl()
      .then((result) => {
        if (result?.url) {
          console.log("[deep-link] getLaunchUrl:", result.url);
          processUrl(result.url);
        }
      })
      .catch((err) => console.warn("[deep-link] getLaunchUrl failed:", err));

    // 2) Handle warm-start: app already running, deep link arrives.
    const listenerPromise = CapacitorApp.addListener("appUrlOpen", (event) => {
      console.log("[deep-link] appUrlOpen:", event.url);
      processUrl(event.url);
    });

    return () => {
      isMounted = false;
      Promise.resolve(listenerPromise).then((handle) => {
        if (handle?.remove) handle.remove();
      });
    };
    // NOTE: no `user` in deps → listener is registered exactly once.
  }, [navigate]);

  return null;
}

// Main App Component
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
                      iconTheme: { primary: "#10b981", secondary: "#ffffff" },
                      style: { background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" },
                    },
                    error: {
                      duration: 4000,
                      iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
                      style: { background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" },
                    },
                    loading: { style: { background: "#f3f4f6", color: "#374151" } },
                  }}
                />
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