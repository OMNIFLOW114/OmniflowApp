import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCogs,
  FaQuestionCircle,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaWallet,
  FaGraduationCap,
  FaStore,
  FaShoppingCart,
  FaHeart,
  FaInfoCircle
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useDarkMode } from "@/context/DarkModeContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import "./SidebarMenu.css";

const menuVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, type: "spring", stiffness: 200 },
  }),
};

const SidebarMenu = ({ onClose, onLogout }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [wishlistItemsCount, setWishlistItemsCount] = useState(0);

  // Fetch cart and wishlist counts
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Fetch cart items count
        const { count: cartCount, error: cartError } = await supabase
          .from("cart_items")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id);

        if (!cartError && cartCount !== null) {
          setCartItemsCount(cartCount);
        }

        // Fetch wishlist items count
        const { count: wishlistCount, error: wishlistError } = await supabase
          .from("wishlist_items")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id);

        if (!wishlistError && wishlistCount !== null) {
          setWishlistItemsCount(wishlistCount);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleNavigation = (path, requiresAuth = false) => {
    if (requiresAuth && !user) {
      toast.error("Please log in to access this feature");
      navigate("/auth");
      onClose();
      return;
    }
    navigate(path);
    onClose();
  };

  // Updated menu items with About Us button
  const menuItems = [
    { 
      icon: <FaUserCircle size={18} />, 
      text: "Profile", 
      link: "/profile",
      requiresAuth: true
    },
    { 
      icon: <FaWallet size={18} />, 
      text: "OmniCash Wallet", 
      link: "/wallet",
      requiresAuth: true,
      badge: "💎"
    },
    { 
      icon: <FaGraduationCap size={18} />, 
      text: "Student Marketplace", 
      link: "/student",
      requiresAuth: true,
      badge: "🎓"
    },
    { 
      icon: <FaStore size={18} />, 
      text: "My Store", 
      link: "/store/create",
      requiresAuth: true
    },
    { 
      icon: <FaShoppingCart size={18} />, 
      text: "Cart", 
      link: "/cart",
      requiresAuth: true,
      count: cartItemsCount
    },
    { 
      icon: <FaHeart size={18} />, 
      text: "Wishlist", 
      link: "/wishlist",
      requiresAuth: true,
      count: wishlistItemsCount
    },
    { 
      icon: <FaInfoCircle size={18} />, 
      text: "About Us", 
      link: "/about",
      requiresAuth: false,
      badge: "✨"
    },
    { 
      icon: <FaCogs size={18} />, 
      text: "Settings", 
      link: "/settings",
      requiresAuth: true
    },
    { 
      icon: <FaQuestionCircle size={18} />, 
      text: "Help Center", 
      link: "/help" 
    },
  ];

  if (loading) {
    return (
      <>
        <div className="sidebar-backdrop" onClick={onClose}></div>
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.3 }}
          className="sidebar-container"
        >
          <div className="sidebar-header">
            <h2 className="sidebar-title">Dashboard</h2>
          </div>
          <div className="sidebar-content">
            <div className="sidebar-item">
              <div className="loading-spinner-small"></div>
              <span>Loading...</span>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose}></div>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.3 }}
        className="sidebar-container"
      >
        <div className="sidebar-header">
          <div className="user-info">
            {user ? (
              <>
                <div className="user-avatar">
                  <FaUserCircle size={32} />
                </div>
                <div className="user-details">
                  <h2 className="sidebar-title">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </h2>
                  <p className="user-email">{user.email}</p>
                </div>
              </>
            ) : (
              <h2 className="sidebar-title">Welcome</h2>
            )}
          </div>
        </div>

        <div className="sidebar-content">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.text}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={menuVariants}
            >
              <button
                onClick={() => handleNavigation(item.link, item.requiresAuth)}
                className="sidebar-item"
              >
                <div className="sidebar-item-left">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
                <div className="sidebar-item-right">
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="sidebar-count">{item.count}</span>
                  )}
                </div>
              </button>
            </motion.div>
          ))}

          {/* Theme Toggle */}
          <motion.div
            custom={menuItems.length}
            initial="hidden"
            animate="visible"
            variants={menuVariants}
          >
            <button
              onClick={toggleDarkMode}
              className="sidebar-item theme-toggle-button"
            >
              <div className="sidebar-item-left">
                {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
              </div>
            </button>
          </motion.div>

          {/* Logout/Login Button */}
          <motion.div
            custom={menuItems.length + 1}
            initial="hidden"
            animate="visible"
            variants={menuVariants}
          >
            {user ? (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="sidebar-item logout-button"
              >
                <FaSignOutAlt size={18} /> 
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  navigate("/auth");
                }}
                className="sidebar-item login-button"
              >
                <FaUserCircle size={18} /> 
                <span>Login / Sign Up</span>
              </button>
            )}
          </motion.div>
        </div>

        {/* App Version */}
        <div className="sidebar-footer">
          <p className="app-version">OmniFlow v2.0</p>
          <p className="app-tagline">Kenya's Powered E-Commerce</p>
        </div>
      </motion.div>
    </>
  );
};

export default SidebarMenu;