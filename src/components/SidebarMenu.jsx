// src/components/SidebarMenu.jsx - UPDATED PREMIUM VERSION
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
  FaInfoCircle,
  FaHome
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useDarkMode } from "@/context/DarkModeContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import styles from "./SidebarMenu.module.css";

const menuVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, type: "spring", stiffness: 200 },
  }),
};

const SidebarMenu = ({ onClose, onLogout }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Removed cart and wishlist count fetching - not needed anymore

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

  // Updated menu items - removed Cart and Wishlist, renamed My Store to Create a Store
  const menuItems = [
    { 
      icon: <FaHome size={18} />, 
      text: "Home", 
      link: "/",
      requiresAuth: false
    },
    { 
      icon: <FaUserCircle size={18} />, 
      text: "Profile", 
      link: "/profile",
      requiresAuth: true
    },
    { 
      icon: <FaWallet size={18} />, 
      text: "OmniPay", 
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
      text: "Create a Store", 
      link: "/store/create",
      requiresAuth: true
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
      link: "/help",
      requiresAuth: false
    },
  ];

  if (loading) {
    return (
      <>
        <div className={styles.backdrop} onClick={onClose}></div>
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.3 }}
          className={styles.container}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>Dashboard</h2>
          </div>
          <div className={styles.content}>
            <div className={styles.loadingItem}>
              <div className={styles.loadingSpinner}></div>
              <span>Loading...</span>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose}></div>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.3 }}
        className={styles.container}
      >
        <div className={styles.header}>
          <div className={styles.userInfo}>
            {user ? (
              <>
                <div className={styles.userAvatar}>
                  <FaUserCircle size={36} />
                </div>
                <div className={styles.userDetails}>
                  <h2 className={styles.title}>
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </h2>
                  <p className={styles.userEmail}>{user.email}</p>
                </div>
              </>
            ) : (
              <h2 className={styles.title}>Welcome</h2>
            )}
          </div>
        </div>

        <div className={styles.content}>
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
                className={styles.menuItem}
              >
                <div className={styles.menuItemLeft}>
                  {item.icon}
                  <span>{item.text}</span>
                </div>
                <div className={styles.menuItemRight}>
                  {item.badge && <span className={styles.badge}>{item.badge}</span>}
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
              className={`${styles.menuItem} ${styles.themeToggle}`}
            >
              <div className={styles.menuItemLeft}>
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
                className={`${styles.menuItem} ${styles.logoutBtn}`}
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
                className={`${styles.menuItem} ${styles.loginBtn}`}
              >
                <FaUserCircle size={18} /> 
                <span>Login / Sign Up</span>
              </button>
            )}
          </motion.div>
        </div>

        {/* App Version */}
        <div className={styles.footer}>
          <p className={styles.version}>OmniFlow v2.0</p>
          <p className={styles.tagline}>Kenya's Powered E-Commerce</p>
        </div>
      </motion.div>
    </>
  );
};

export default SidebarMenu;