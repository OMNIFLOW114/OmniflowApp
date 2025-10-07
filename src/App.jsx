// App.jsx - Clean White/Dark Mode Compatible Layout with Toast Fixes
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
import Discover from "./components/Discover";
import Create from "./components/Create";
import Profile from "./components/Profile";
import Messages from "./components/Messages";
import Notifications from "./components/Notifications";
import HelpCenter from "./components/HelpCenter";
import Settings from "./components/Settings";
import BottomNav from "@/components/BottomNav";
import Vault from "./pages/Vault";
import ProductDetail from "@/pages/ProductDetail";
import ResetPassword from "@/components/ResetPassword";
import VerifyOtp from "@/components/VerifyOtp";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import BuyerOrders from "@/pages/BuyerOrders";
// Main Features
import OmniVerse from "./pages/OmniVerse";
import OmniCashWallet from "./pages/OmniCashWallet";
import CurrencyConverter from "@/pages/CurrencyConverter";

// Marketplace
import TradeStore from "./pages/TradeStore";
import CreateStore from "./pages/CreateStore";
import StoreDashboard from "./pages/StoreDashboard";
import MyInstallments from "./pages/MyInstallments"; // ✅ make sure the path matches
import Checkout from "@/pages/Checkout";
import Premium from './pages/Premium';

// Business
import BusinessHub from "./pages/business/BusinessHub";

// Student
import StudentDashboard from "./pages/StudentDashboard";
import ExamGenerator from "./pages/AIExamGenerator";
import FlashcardsHome from "./pages/student/FlashcardsHome";
import StudyFlashcards from "./pages/student/StudyFlashcards";
import StudyBuddyAI from "./pages/student/StudyBuddyAI";
import CareerAdvisor from "./pages/student/CareerAdvisor";
import AIBuddy from "./pages/student/AIBuddy";

// Admin
import AdminWallet from "./pages/AdminWallet";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import StoreOversight from "./pages/admin/StoreOversight";
import ProductModeration from "./pages/admin/ProductModeration";
import MessageMonitoring from './pages/admin/MessageMonitoring';
import SystemSettings from './pages/admin/SystemSettings';
import Ratings from "./pages/admin/Ratings";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminInstallmentsPage from "./pages/admin/AdminInstallments";
import CategoryManagement from '@/pages/admin/CategoryManagement';
import FinancialControl from '@/pages/admin/FinancialControl';
import ReportsAnalytics from '@/pages/admin/ReportsAnalytics';
import AdminManagement from '@/pages/admin/AdminManagement';
import PromotionsOffers from '@/pages/admin/PromotionsOffers';
import DatabaseManagement from '@/pages/admin/DatabaseManagement';

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
  const { user:User } = useAuth(); // or whatever your auth context/hook is

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/create" element={<Create />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/omniverse" element={<ProtectedRoute><OmniVerse /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><OmniCashWallet /></ProtectedRoute>} />
        <Route path="/convert-currency" element={<ProtectedRoute><CurrencyConverter /></ProtectedRoute>} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/trade" element={<ProtectedRoute><TradeStore /></ProtectedRoute>} />
        <Route path="/store/create" element={<ProtectedRoute><CreateStore /></ProtectedRoute>} />
        <Route path="/dashboard/store/:storeId" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/business-hub" element={<ProtectedRoute><BusinessHub /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/exam-generator" element={<ProtectedRoute><ExamGenerator /></ProtectedRoute>} />
        <Route path="/student/flashcards" element={<ProtectedRoute><FlashcardsHome /></ProtectedRoute>} />
        <Route path="/student/flashcards/study" element={<ProtectedRoute><StudyFlashcards /></ProtectedRoute>} />
        <Route path="/student/studybuddy" element={<ProtectedRoute><StudyBuddyAI /></ProtectedRoute>} />
        <Route path="/student/studybuddy/career" element={<ProtectedRoute><CareerAdvisor /></ProtectedRoute>} />
        <Route path="/student/studybuddy/buddy" element={<ProtectedRoute><AIBuddy /></ProtectedRoute>} />
        <Route path="/orders" element={<BuyerOrders />} />
        <Route path="/admin/ratings" element={<Ratings />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/admin/wallet" element={<AdminRoute><AdminWallet /></AdminRoute>} />
        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/admin/stores" element={<AdminRoute><StoreOversight /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><ProductModeration /></AdminRoute>} />
        <Route path="/admin/messages" element={<AdminRoute><MessageMonitoring /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><SystemSettings /></AdminRoute>} />
        <Route path="/admin/installments" element={<AdminInstallmentsPage />} />
        <Route path="/admin/categories" element={<CategoryManagement />} />
        <Route path="/admin/finance" element={<FinancialControl />} />
        <Route path="/admin/reports" element={<ReportsAnalytics />} />
        <Route path="/admin/admins" element={<AdminManagement />} />
        <Route path="/admin/promotions" element={<PromotionsOffers />} />
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/database" element={<DatabaseManagement />} />
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
