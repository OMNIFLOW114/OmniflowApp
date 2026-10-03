// src/components/SidebarMenu.jsx - FINAL PRODUCTION READY
import React from "react";
import { useNavigate } from "react-router-dom";
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
  FaHome,
  FaStoreAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useDarkMode } from "@/context/DarkModeContext";
import { useAuth } from "@/context/AuthContext";
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

const SidebarMenu = ({
  onClose,
  onLogout,
  storeInfo = null,
  hasActiveSubscription = false,
}) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Store navigation - uses props passed from parent
  const handleStoreNavigation = () => {
    console.log("🏪 Store button clicked:", {
      user: user?.email,
      storeInfo,
      hasActiveSubscription,
    });

    if (!user) {
      toast.error("Please log in to access this feature");
      navigate("/auth");
      onClose();
      return;
    }

    // Case 1: user has a store
    if (storeInfo) {
      const { id, contact_email, contact_phone, location, is_active } = storeInfo;

      if (!is_active) {
        toast.error("Your store has been deactivated. Contact support.");
        onClose();
        return;
      }

      const incomplete = !contact_email || !contact_phone || !location;
      if (incomplete) {
        toast("Please complete your store setup.");
        navigate("/store/create");
        onClose();
        return;
      }

      console.log("🏪 Navigating to /seller/dashboard for store:", id);
      navigate("/seller/dashboard");
      onClose();
      return;
    }

    // Case 2: no store yet
    if (hasActiveSubscription) {
      console.log("🏪 Navigating to /store/create");
      navigate("/store/create");
    } else {
      console.log("🏪 Navigating to /premium");
      navigate("/premium");
    }
    onClose();
  };

  const getMenuItems = () => {
    const isStoreOwner = !!(storeInfo && storeInfo.is_active);

    return [
      { icon: <FaHome size={18} />, text: "Home", link: "/", requiresAuth: false },
      { icon: <FaWallet size={18} />, text: "OmniPay", link: "/wallet", requiresAuth: true },
      {
        icon: <FaGraduationCap size={18} />,
        text: "Student Marketplace",
        link: "/student",
        requiresAuth: true,
        badge: "🎓",
      },
      {
        icon: isStoreOwner ? <FaStoreAlt size={18} /> : <FaStore size={18} />,
        text: isStoreOwner ? "My Store" : "Create a Store",
        link: isStoreOwner ? "/seller/dashboard" : "/store/create",
        requiresAuth: true,
        isStoreOwner,
        action: handleStoreNavigation,
      },
      { icon: <FaInfoCircle size={18} />, text: "About Us", link: "/about", requiresAuth: false },
      { icon: <FaCogs size={18} />, text: "Settings", link: "/settings", requiresAuth: true },
      { icon: <FaQuestionCircle size={18} />, text: "Help Center", link: "/help", requiresAuth: false },
    ];
  };

  const menuItems = getMenuItems();
  const isStoreOwner = !!(storeInfo && storeInfo.is_active);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose}></div>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.3 }}
        className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}
      >
        <div className={styles.header}>
          <div className={styles.userInfo}>
            {user ? (
              <>
                <div className={styles.userAvatar} onClick={onClose}>
                  <FaUserCircle size={36} />
                </div>
                <div className={styles.userDetails}>
                  <h2 className={styles.title}>
                    {user.user_metadata?.full_name ||
                      user.email?.split("@")[0] ||
                      "User"}
                  </h2>
                  <p className={styles.userEmail}>{user.email}</p>
                  {isStoreOwner && (
                    <span className={styles.storeBadge}>
                      <FaStoreAlt size={12} /> Store Owner
                    </span>
                  )}
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
                onClick={item.action || (() => handleNavigation(item.link, item.requiresAuth))}
                className={styles.menuItem}
              >
                <div className={styles.menuItemLeft}>
                  {item.icon}
                  <span>{item.text}</span>
                </div>
                <div className={styles.menuItemRight}>
                  {item.badge && <span className={styles.badge}>{item.badge}</span>}
                  {item.isStoreOwner && <span className={styles.statusDot}></span>}
                </div>
              </button>
            </motion.div>
          ))}

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

        <div className={styles.footer}>
          <p className={styles.version}>OmniFlow 1.1.2.0</p>
          <p className={styles.tagline}>Kenya's Hyperlocal E-Commerce</p>
        </div>
      </motion.div>
    </>
  );
};

export default SidebarMenu;