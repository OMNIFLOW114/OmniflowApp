import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import {
  FiUsers,
  FiSettings,
  FiBarChart2,
  FiBriefcase,
  FiMessageSquare,
  FiStar,
  FiShoppingCart,
  FiDollarSign,
  FiHome,
  FiMenu,
  FiX,
  FiClipboard,
} from "react-icons/fi";
import { motion } from "framer-motion";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user || user.email !== "omniflow718@gmail.com") {
    return <Navigate to="/" replace />;
  }

  const cards = [
    {
      icon: <FiBarChart2 />,
      title: "Dashboard Overview",
      desc: "Track KPIs and system-wide stats.",
      path: "/admin/overview",
    },
    {
      icon: <FiUsers />,
      title: "User Management",
      desc: "Ban, unban, and grant store privileges.",
      path: "/admin/users",
    },
    {
      icon: <FiBriefcase />,
      title: "Store Oversight",
      desc: "Monitor and deactivate stores.",
      path: "/admin/stores",
    },
    {
      icon: <FiShoppingCart />,
      title: "Product Moderation",
      desc: "Remove flagged or illegal listings.",
      path: "/admin/products",
    },
    {
      icon: <FiMessageSquare />,
      title: "Message Monitoring",
      desc: "Filter abusive or suspicious chats.",
      path: "/admin/messages",
    },
    {
      icon: <FiSettings />,
      title: "System Settings",
      desc: "Push announcements or maintenance mode.",
      path: "/admin/settings",
    },
    {
      icon: <FiDollarSign />,
      title: "Wallet Control",
      desc: "Oversee commissions and financial flows.",
      path: "/admin/wallet",
    },
    {
      icon: <FiStar />,
      title: "Product Ratings",
      desc: "View ratings and promote top items.",
      path: "/admin/ratings",
    },
    {
     icon: <FiClipboard />,
     title: "Installment Oversight",
     desc: "Monitor and control installment orders.",
     path: "/admin/installments",
   }
  ];

  return (
    <div className={`admin-layout ${darkMode ? "dark-mode" : ""}`}>
      {sidebarOpen && (
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <FiHome className="sidebar-logo" />
            <span>OmniFlow Admin</span>
          </div>
          <nav className="sidebar-links">
            {cards.map((card, index) => (
              <button key={index} onClick={() => navigate(card.path)}>
                {card.icon}
                <span>{card.title}</span>
              </button>
            ))}
          </nav>
        </aside>
      )}

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="flex items-center gap-4">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div>
              <h1>Admin Control Center</h1>
              <p>Welcome, Superuser. You control the OmniFlow universe.</p>
            </div>
          </div>
          <div className="admin-avatar">🛡️</div>
        </header>

        <motion.section
          className="admin-grid"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {cards.map((card, index) => (
            <motion.div
              key={index}
              className="admin-card"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="admin-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <button onClick={() => navigate(card.path)}>Go</button>
            </motion.div>
          ))}
        </motion.section>
      </main>
    </div>
  );
};

export default AdminDashboard;
