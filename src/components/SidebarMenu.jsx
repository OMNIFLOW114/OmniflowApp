import React, { useState, useEffect } from "react";
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

const SidebarMenu = ({ onClose, onLogout, adminAlerts = 0 }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const SUPER_ADMIN_EMAIL = "omniflow718@gmail.com";

  // Log activity to admin_activities table
  const logActivity = async (action, target_type = null, target_id = null) => {
    try {
      await supabase
        .from('admin_activities')
        .insert({
          performed_by: user?.id,
          action,
          target_type,
          target_id,
          user_agent: navigator.userAgent,
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Check if user is an active admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Fetch admin record by user_id
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, is_active, role')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
          toast.error('Failed to verify admin status');
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // If admin record exists and is active, grant access
        if (data && data.is_active) {
          setIsAdmin(true);
          await logActivity('admin_panel_access_attempt', 'admin_user', data.id);
        } else if (user.email === SUPER_ADMIN_EMAIL && !data) {
          // Auto-create super admin if no record exists
          const { error: insertError } = await supabase
            .from('admin_users')
            .insert([
              {
                user_id: user.id,
                email: user.email,
                role: 'super_admin',
                permissions: ['all'],
                is_active: true,
                created_by: user.id,
              },
            ]);

          if (insertError) {
            console.error('Error creating super admin:', insertError);
            toast.error('Failed to initialize super admin');
            setIsAdmin(false);
          } else {
            setIsAdmin(true);
            await logActivity('super_admin_created', 'admin_user', user.id);
          }
        } else {
          setIsAdmin(false);
          await logActivity('admin_panel_access_denied', 'user', user.id);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Error verifying admin privileges');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const menuItems = [
    { icon: <FaUserCircle size={18} />, text: "Profile", link: "/profile" },
    { icon: <FaCogs size={18} />, text: "Settings", link: "/settings" },
    { icon: <FaQuestionCircle size={18} />, text: "Help Center", link: "/help" },
  ];

  const handleAdminClick = async () => {
    try {
      await logActivity('admin_panel_navigated', 'admin_dashboard', null);
      navigate("/admin-dashboard");
      toast.success('Redirecting to Admin Dashboard');
      onClose();
    } catch (error) {
      console.error('Error navigating to admin dashboard:', error);
      toast.error('Failed to access Admin Dashboard');
      navigate('/');
    }
  };

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
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">
              Dashboard
            </h2>
          </div>
          <div className="flex flex-col p-4 space-y-4">
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
          {isAdmin && (
            <motion.div
              custom={menuItems.length}
              initial="hidden"
              animate="visible"
              variants={menuVariants}
            >
              <button
                onClick={handleAdminClick}
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
