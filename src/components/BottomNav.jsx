import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaCompass, FaPlusCircle, FaBell } from "react-icons/fa";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import "./BottomNavbar.css";

const BottomNavbar = () => {
  const location = useLocation();
  const { unreadCount } = useNotificationBadge();

  // Hide navbar on auth-related routes AND admin routes
  const hiddenRoutes = [
    "/login", 
    "/signup", 
    "/reset-password", 
    "/auth",
    "/admin", // Hide on all admin routes
    "/admin-dashboard",
    "/admin-overview",
    "/admin/users",
    "/admin/stores",
    "/admin/products",
    "/admin/categories",
    "/admin/messages",
    "/admin/finance",
    "/admin/wallet",
    "/admin/ratings",
    "/admin/installments",
    "/admin/reports",
    "/admin/admins",
    "/admin/settings",
    "/admin/database",
    "/admin/promotions",
    "/admin/search",
    "/admin/activities"
  ];

  // Check if current path starts with any hidden route
  const shouldHide = hiddenRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  if (shouldHide) {
    return null;
  }

  const navItems = [
    { to: "/", label: "Home", icon: <FaHome size={22} /> },
    { to: "/discover", label: "Discover", icon: <FaCompass size={22} /> },
    { to: "/create", label: "Create", icon: <FaPlusCircle size={22} /> },
    {
      to: "/notifications",
      label: "Alerts",
      icon: (
        <div className="notif-icon">
          <FaBell size={22} />
          {unreadCount > 0 && (
            <span className="notif-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <nav className="bottom-navbar">
      {navItems.map(({ to, label, icon }) => (
        <Link
          key={to}
          to={to}
          className={`bottom-nav-link ${location.pathname === to ? "active" : ""}`}
        >
          {icon}
          <span className="nav-label">{label}</span>
          {location.pathname === to && <span className="active-indicator"></span>}
        </Link>
      ))}
    </nav>
  );
};

export default BottomNavbar;