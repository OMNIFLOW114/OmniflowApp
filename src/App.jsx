import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// ✅ Pages & Components
import Home from "./components/Home";
import Auth from "./components/Auth";
import Discover from "./components/Discover";
import Create from "./components/Create";
import Profile from "./components/Profile";
import Messages from "./components/Messages";
import Notifications from "./components/Notifications";
import HelpCenter from "./components/HelpCenter";
import Settings from "./components/Settings";
import Trade from "./pages/Trade";
import Currency from "./pages/Currency";
import StudentDashboard from "./pages/StudentDashboard";
import CreateStore from "./pages/CreateStore";
import ExamGenerator from "./pages/AIExamGenerator";
import StorePage from "./pages/StorePage";
import StudyFlashcards from "./pages/student/StudyFlashcards";
import FlashcardsHome from "./pages/student/FlashcardsHome";
import StudyBuddyAI from "./pages/student/StudyBuddyAI";
import CareerAdvisor from "./pages/student/CareerAdvisor";
import AIBuddy from "./pages/student/AIBuddy";
import TestBackendConnection from "./components/TestBackendConnection";
import JobBoard from "./pages/student/JobBoard";
import PostJob from "@/pages/admin/PostJob";
import "./App.css";

// 🔁 Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// 🔒 Protected wrapper
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg font-medium">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

// 📌 App Routing
function AppRoutes() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/create" element={<Create />} />

        {/* Protected Routes */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/currency" element={<ProtectedRoute><Currency /></ProtectedRoute>} />
        <Route path="/trade" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/exam-generator" element={<ProtectedRoute><ExamGenerator /></ProtectedRoute>} />
        <Route path="/student/flashcards" element={<ProtectedRoute><FlashcardsHome /></ProtectedRoute>} />
        <Route path="/student/flashcards/study" element={<ProtectedRoute><StudyFlashcards /></ProtectedRoute>} />
        <Route path="/store/create" element={<ProtectedRoute><CreateStore /></ProtectedRoute>} />
        <Route path="/store/:storeId" element={<ProtectedRoute><StorePage /></ProtectedRoute>} />
        <Route path="/studybuddy" element={<ProtectedRoute><StudyBuddyAI /></ProtectedRoute>} />
        <Route path="/student/studybuddy" element={<ProtectedRoute><StudyBuddyAI /></ProtectedRoute>} />
        <Route path="/student/studybuddy/career" element={<ProtectedRoute><CareerAdvisor /></ProtectedRoute>} />
        <Route path="/student/studybuddy/buddy" element={<ProtectedRoute><AIBuddy /></ProtectedRoute>} />
        <Route path="/student/jobs" element={<ProtectedRoute><JobBoard /></ProtectedRoute>} />
        <Route path="/admin/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
        {/* Test Backend Connection */}
        <Route path="/test-backend" element={<TestBackendConnection />} />
      </Routes>
    </>
  );
}

// 🧠 Main App Wrapper
function App() {
  return (
    <AuthProvider>
      <div className="bg-gray-100 min-h-screen flex flex-col">
        <AppRoutes />
        <footer className="bg-gray-800 text-white p-4 text-center">
          <p>&copy; {new Date().getFullYear()} OmniFlow. All rights reserved.</p>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
