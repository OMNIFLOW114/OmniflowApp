import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCogs,
  FaQuestionCircle,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaTools,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useDarkMode } from "@/context/DarkModeContext";
import { useAuth } from "@/context/AuthContext";
import "./SidebarMenu.css";

const menuVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, type: "spring", stiffness: 200 },
  }),
};

const SidebarMenu = ({ onClose, onLogout, adminAlerts = 0 }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: <FaUserCircle size={18} />, text: "Profile", link: "/profile" },
    { icon: <FaCogs size={18} />, text: "Settings", link: "/settings" },
    { icon: <FaQuestionCircle size={18} />, text: "Help Center", link: "/help" },
  ];

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
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">
            Dashboard
          </h2>
        </div>

        <div className="flex flex-col p-4 space-y-4">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.text}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={menuVariants}
            >
              <Link
                to={item.link}
                onClick={onClose}
                className="sidebar-item dark:text-gray-200"
              >
                {item.icon}
                <span>{item.text}</span>
              </Link>
            </motion.div>
          ))}

          {user?.email === "omniflow718@gmail.com" && (
            <motion.div
              custom={menuItems.length}
              initial="hidden"
              animate="visible"
              variants={menuVariants}
            >
              <button
                onClick={() => {
                  onClose();
                  navigate("/admin-dashboard");
                }}
                className="sidebar-item admin-btn"
              >
                <FaTools size={18} />
                <span>Admin Panel</span>
                {adminAlerts > 0 && (
                  <span className="admin-alert-badge">
                    {adminAlerts > 9 ? "9+" : adminAlerts}
                  </span>
                )}
              </button>
            </motion.div>
          )}

          <motion.div
            custom={menuItems.length + 1}
            initial="hidden"
            animate="visible"
            variants={menuVariants}
          >
            <button
              onClick={toggleDarkMode}
              className="sidebar-item theme-toggle-button"
            >
              {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </motion.div>

          <motion.div
            custom={menuItems.length + 2}
            initial="hidden"
            animate="visible"
            variants={menuVariants}
          >
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="sidebar-item logout-button"
            >
              <FaSignOutAlt size={18} /> <span>Logout</span>
            </button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default SidebarMenu;
