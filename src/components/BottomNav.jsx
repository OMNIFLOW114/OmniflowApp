import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaShoppingCart, FaHeart, FaBell } from "react-icons/fa";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { useAuth } from "@/context/AuthContext";
import "./BottomNavbar.css";

const BottomNavbar = () => {
  const location = useLocation();
  const { unreadCount } = useNotificationBadge();
  const { user } = useAuth();

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

  // Cart and Wishlist count states (you can fetch these from your context or API)
  const cartItemsCount = 0; // Replace with actual cart count from context
  const wishlistItemsCount = 0; // Replace with actual wishlist count from context

  const navItems = [
    { 
      to: "/", 
      label: "Home", 
      icon: <FaHome size={22} />,
      requiresAuth: false
    },
    { 
      to: "/cart", 
      label: "Cart", 
      icon: (
        <div className="nav-icon-with-badge">
          <FaShoppingCart size={22} />
          {user && cartItemsCount > 0 && (
            <span className="nav-badge">
              {cartItemsCount > 9 ? "9+" : cartItemsCount}
            </span>
          )}
        </div>
      ),
      requiresAuth: true
    },
    { 
      to: "/wishlist", 
      label: "Wishlist", 
      icon: (
        <div className="nav-icon-with-badge">
          <FaHeart size={22} />
          {user && wishlistItemsCount > 0 && (
            <span className="nav-badge">
              {wishlistItemsCount > 9 ? "9+" : wishlistItemsCount}
            </span>
          )}
        </div>
      ),
      requiresAuth: true
    },
    {
      to: "/notifications",
      label: "Alerts",
      icon: (
        <div className="nav-icon-with-badge">
          <FaBell size={22} />
          {unreadCount > 0 && (
            <span className="nav-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      ),
      requiresAuth: false
    },
  ];

  const handleNavClick = (item, e) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      // Redirect to auth page - you can use navigate if needed
      window.location.href = "/auth";
    }
  };

  return (
    <nav className="bottom-navbar">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`bottom-nav-link ${location.pathname === item.to ? "active" : ""}`}
          onClick={(e) => handleNavClick(item, e)}
        >
          {item.icon}
          <span className="nav-label">{item.label}</span>
          {location.pathname === item.to && <span className="active-indicator"></span>}
        </Link>
      ))}
    </nav>
  );
};

export default BottomNavbar;