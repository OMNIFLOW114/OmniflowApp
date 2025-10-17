import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCogs,
  FaQuestionCircle,
  FaSignOutAlt,
  FaMoon,
  FaSun,
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

  const menuItems = [
    { icon: <FaUserCircle size={18} />, text: "Profile", link: "/profile" },
    { icon: <FaCogs size={18} />, text: "Settings", link: "/settings" },
    { icon: <FaQuestionCircle size={18} />, text: "Help Center", link: "/help" },
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
          <h2 className="sidebar-title">Dashboard</h2>
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
              <Link
                to={item.link}
                onClick={onClose}
                className="sidebar-item"
              >
                {item.icon}
                <span>{item.text}</span>
              </Link>
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
              className="sidebar-item theme-toggle-button"
            >
              {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </motion.div>
          <motion.div
            custom={menuItems.length + 1}
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