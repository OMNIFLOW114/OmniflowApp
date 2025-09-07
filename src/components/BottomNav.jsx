import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaCompass, FaPlusCircle, FaBell } from "react-icons/fa";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import "./BottomNavbar.css";

const BottomNavbar = () => {
  const location = useLocation();
  const { unreadCount } = useNotificationBadge();

  const navItems = [
    { to: "/", label: "Home", icon: <FaHome size={22} /> },
    { to: "/discover", label: "Discover", icon: <FaCompass size={22} /> },
    { to: "/create", label: "Create", icon: <FaPlusCircle size={22} /> },
    {
      to: "/notifications",
      label: "Alerts",
      icon: (
        <div style={{ position: "relative" }}>
          <FaBell size={22} />
          {unreadCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                backgroundColor: "red",
                color: "white",
                borderRadius: "50%",
                padding: "2px 5px",
                fontSize: "10px",
                animation: "pulse 1s infinite",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
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
