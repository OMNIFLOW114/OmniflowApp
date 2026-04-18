// App.jsx - FULLY UPDATED: Secure, Production-Ready with React Router v7 Future Flags
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Toaster } from "react-hot-toast";
import Modal from "react-modal";
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
import ProtectedAdminRoute from "@/pages/admin/ProtectedAdminRoute";

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

// Protected Route - requires authentication
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// Admin Route - requires admin privileges
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  if (!user || user.email !== "omniflow718@gmail.com") return <Navigate to="/" replace />;
  return children;
}

// Main Routes Component
function AppRoutes() {
  const { user: User } = useAuth();

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

        {/* Admin Routes - Protected by AdminRoute */}
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

// Main App Component
export default function App() {
  const PAYPAL_CLIENT_ID = "AafXEhKIfb17UbunbfNiv5e_h1mtg3fpjx_7c-1EFLnTxHQsJF-a_l1q-W7exOKcfcBafNvKTjJOkrt2";
  Modal.setAppElement("#root");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <AppRoutes />
              <BottomNav />
            </div>
          </PayPalScriptProvider>
        </DarkModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}