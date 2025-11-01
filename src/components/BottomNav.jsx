import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaShoppingCart, FaHeart, FaBell } from "react-icons/fa";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import "./BottomNavbar.css";

const BottomNavbar = () => {
  const location = useLocation();
  const { unreadCount } = useNotificationBadge();
  const { user } = useAuth();
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [wishlistItemsCount, setWishlistItemsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hide navbar on auth-related routes, admin routes, and search page
  const hiddenRoutes = [
    "/login", 
    "/signup", 
    "/reset-password", 
    "/auth",
    "/admin",
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
    "/admin/activities",
    "/orders",
    "/messages",
    "/chat",
    "/search"
  ];

  // Check if current path starts with any hidden route
  const shouldHide = hiddenRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  // Load counts from localStorage on initial load
  useEffect(() => {
    if (user?.id) {
      const savedCartCount = localStorage.getItem(`cart_count_${user.id}`);
      const savedWishlistCount = localStorage.getItem(`wishlist_count_${user.id}`);
      
      if (savedCartCount) setCartItemsCount(parseInt(savedCartCount));
      if (savedWishlistCount) setWishlistItemsCount(parseInt(savedWishlistCount));
    }
    setIsInitialized(true);
  }, [user]);

  // Save counts to localStorage whenever they change
  useEffect(() => {
    if (user?.id && isInitialized) {
      localStorage.setItem(`cart_count_${user.id}`, cartItemsCount.toString());
    }
  }, [cartItemsCount, user, isInitialized]);

  useEffect(() => {
    if (user?.id && isInitialized) {
      localStorage.setItem(`wishlist_count_${user.id}`, wishlistItemsCount.toString());
    }
  }, [wishlistItemsCount, user, isInitialized]);

  // Fetch initial cart and wishlist counts
  const fetchCounts = useCallback(async () => {
    if (!user?.id) {
      setCartItemsCount(0);
      setWishlistItemsCount(0);
      return;
    }

    try {
      // Fetch cart count
      const { count: cartCount, error: cartError } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!cartError) {
        setCartItemsCount(cartCount || 0);
      }

      // Fetch wishlist count
      const { count: wishlistCount, error: wishlistError } = await supabase
        .from("wishlist_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!wishlistError) {
        setWishlistItemsCount(wishlistCount || 0);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, [user]);

  // Real-time subscriptions for cart items
  useEffect(() => {
    if (!user?.id) return;

    let cartSubscription;
    let wishlistSubscription;

    const setupSubscriptions = async () => {
      // Cart subscription
      cartSubscription = supabase
        .channel('cart_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            setTimeout(async () => {
              const { count, error } = await supabase
                .from("cart_items")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id);

              if (!error) {
                setCartItemsCount(count || 0);
              }
            }, 100);
          }
        )
        .subscribe();

      // Wishlist subscription
      wishlistSubscription = supabase
        .channel('wishlist_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wishlist_items',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            setTimeout(async () => {
              const { count, error } = await supabase
                .from("wishlist_items")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id);

              if (!error) {
                setWishlistItemsCount(count || 0);
              }
            }, 100);
          }
        )
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      if (cartSubscription) {
        supabase.removeChannel(cartSubscription);
      }
      if (wishlistSubscription) {
        supabase.removeChannel(wishlistSubscription);
      }
    };
  }, [user]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchCounts();
    
    const interval = setInterval(fetchCounts, 30000);
    
    return () => clearInterval(interval);
  }, [fetchCounts]);

  if (shouldHide) {
    return null;
  }

  // Ultra-compact Badge Component
  const AnimatedBadge = ({ count, type = "default" }) => {
    if (!count || count <= 0) return null;

    const badgeColors = {
      cart: "#ef4444",
      wishlist: "#ec4899",
      notification: "#3b82f6",
      default: "#ef4444"
    };

    const badgeColor = badgeColors[type] || badgeColors.default;

    return (
      <motion.span
        className="nav-badge"
        style={{ background: badgeColor }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          transition: {
            type: "spring",
            stiffness: 600,
            damping: 15
          }
        }}
        exit={{ scale: 0, opacity: 0 }}
        key={count}
      >
        {count > 9 ? "9+" : count}
      </motion.span>
    );
  };

  const navItems = [
    { 
      to: "/", 
      label: "Home", 
      icon: <FaHome size={18} />,
      requiresAuth: false,
      badgeCount: 0,
      badgeType: "default"
    },
    { 
      to: "/cart", 
      label: "Cart", 
      icon: <FaShoppingCart size={18} />,
      requiresAuth: true,
      badgeCount: cartItemsCount,
      badgeType: "cart"
    },
    { 
      to: "/wishlist", 
      label: "Wishlist", 
      icon: <FaHeart size={18} />,
      requiresAuth: true,
      badgeCount: wishlistItemsCount,
      badgeType: "wishlist"
    },
    {
      to: "/notifications",
      label: "Alerts",
      icon: <FaBell size={18} />,
      requiresAuth: false,
      badgeCount: unreadCount,
      badgeType: "notification"
    },
  ];

  const handleNavClick = (item, e) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      window.location.href = "/auth";
    }
  };

  const NavItem = ({ item }) => (
    <Link
      to={item.to}
      className={`bottom-nav-link ${location.pathname === item.to ? "active" : ""}`}
      onClick={(e) => handleNavClick(item, e)}
    >
      <div className="nav-icon-with-badge">
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          {item.icon}
        </motion.div>
        <AnimatePresence mode="wait">
          <AnimatedBadge 
            count={item.badgeCount} 
            type={item.badgeType}
          />
        </AnimatePresence>
      </div>
      <span className="nav-label">{item.label}</span>
      {location.pathname === item.to && (
        <motion.span 
          className="active-indicator"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 20 }}
        />
      )}
    </Link>
  );

  return (
    <motion.nav 
      className="bottom-navbar"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    >
      {navItems.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </motion.nav>
  );
};

export default BottomNavbar;