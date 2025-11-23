// App.jsx - UPDATED: Clean White/Dark Mode Compatible Layout with Toast Fixes
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import Messages from "./components/Messages";
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
// Main Features
import OmniCashWallet from "./pages/OmniCashWallet";
import CurrencyConverter from "@/pages/CurrencyConverter";
import AboutUs from '@/pages/AboutUs';

// Marketplace
import TradeStore from "./pages/TradeStore";
import CreateStore from "./pages/CreateStore";
import StoreDashboard from "./pages/StoreDashboard";
import MyInstallments from "./pages/MyInstallments"; // ✅ make sure the path matches
import Checkout from "@/pages/Checkout";
import Premium from './pages/Premium';
import SearchPage from "./pages/SearchPage"; 
import ChatScreen from './pages/ChatScreen';
// Student
import StudentDashboard from "./pages/StudentDashboard";

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

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  if (!user || user.email !== "omniflow718@gmail.com") return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user:User } = useAuth();

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* NEW: TradeStore is now the PUBLIC landing page */}
        <Route path="/" element={<TradeStore />} />
        
        <Route path="/auth" element={<Auth />} />
        
        {/* REMOVED: Discover and Create routes */}
        
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><OmniCashWallet /></ProtectedRoute>} />
        <Route path="/convert-currency" element={<ProtectedRoute><CurrencyConverter /></ProtectedRoute>} />
        <Route path="/chat" element={<ChatScreen />} />
        {/* REMOVED: ProtectedRoute from /trade since it's now the root */}
        <Route path="/trade" element={<TradeStore />} />
        
        <Route path="/store/create" element={<ProtectedRoute><CreateStore /></ProtectedRoute>} />
        <Route path="/dashboard/store/:storeId" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/orders" element={<BuyerOrders />} />
        <Route path="/admin/ratings" element={<Ratings />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/student/sell-product" element={<SellProductPage />} />
        <Route path="/student/start-restaurant" element={<StartRestaurantPage />} />
        <Route path="/student/service/:id" element={<ServiceDetailPage />} />
        <Route path="/student/restaurant/:id" element={<RestaurantDetailPage />} />
        <Route path="/student/product/:id" element={<ProductDetailPage />} />
        <Route path="/student/become-delivery-agent" element={<BecomeDeliveryAgentPage />} />
        <Route path="/student/chat/:chatId" element={<StudentChatPage />} />
        <Route path="/student/orders" element={<OrderTrackingPage />} />
        <Route path="/student/earnings" element={<StudentEarningsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/search" element={<SearchPage />} />

        {/* ===================== ADMIN ROUTES ===================== */}
        <Route path="/admin" element={<AdminAuth />} />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedAdminRoute>
              <UserManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/stores"
          element={
            <ProtectedAdminRoute>
              <StoreOversight />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <ProtectedAdminRoute>
              <ProductModeration />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/messages"
          element={
            <ProtectedAdminRoute>
              <MessageMonitoring />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/ratings"
          element={
            <ProtectedAdminRoute>
              <Ratings />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/installments"
          element={
            <ProtectedAdminRoute>
              <AdminInstallmentsPage />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/categories"
          element={
            <ProtectedAdminRoute>
              <CategoryManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/finance"
          element={
            <ProtectedAdminRoute>
              <FinancialControl />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedAdminRoute>
              <ReportsAnalytics />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/admins"
          element={
            <ProtectedAdminRoute>
              <AdminManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/promotions"
          element={
            <ProtectedAdminRoute>
              <PromotionsOffers />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/overview"
          element={
            <ProtectedAdminRoute>
              <DashboardOverview />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/database"
          element={
            <ProtectedAdminRoute>
              <DatabaseManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedAdminRoute>
              <SystemSettings />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/wallet"
          element={
            <ProtectedAdminRoute>
              <AdminWallet />
            </ProtectedAdminRoute>
          }
        />

        {/* Admin Invitation Link (for Phase 3) */}
        <Route path="/admin/invite/:token" element={<AdminAuth mode="invite" />} />

        <Route path="/my-installments" element={<MyInstallments user={User} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />   
        <Route path="/store/premium" element={<Premium />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const PAYPAL_CLIENT_ID = "AafXEhKIfb17UbunbfNiv5e_h1mtg3fpjx_7c-1EFLnTxHQsJF-a_l1q-W7exOKcfcBafNvKTjJOkrt2";
  Modal.setAppElement("#root");

  return (
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
            <Toaster
              position="top-right"
              reverseOrder={false}
              toastOptions={{
                style: {
                  background: "#ffffff",
                  color: "#000000",
                  border: "1px solid #ddd",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
                  fontWeight: "normal",
                },
                success: {
                  style: {
                    background: "#e6ffed",
                    borderColor: "#a2f5bf",
                    color: "#065f46",
                  },
                },
                error: {
                  style: {
                    background: "#ffe6e6",
                    borderColor: "#ff9999",
                    color: "#991b1b",
                  },
                },
                progressStyle: {
                  background: "#4ade80",
                },
              }}
            />
            <AppRoutes />
            <BottomNav />
          </div>
        </PayPalScriptProvider>
      </DarkModeProvider>
    </AuthProvider>
  );
}