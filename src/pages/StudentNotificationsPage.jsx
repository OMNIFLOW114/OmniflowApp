// src/pages/StudentNotificationsPage.jsx - UPDATED FOR EXISTING SCHEMA
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaBell, FaCheck, FaTrash, FaEye,
  FaShoppingBag, FaUtensils, FaGraduationCap, FaUser,
  FaStore, FaMoneyBillWave, FaCheckCircle, FaTimesCircle,
  FaInfoCircle, FaFire, FaTrophy, FaGift, FaTag,
  FaClock, FaSpinner, FaEnvelope, FaStar, FaHeart
} from "react-icons/fa";
import styles from "./StudentNotificationsPage.module.css";

const StudentNotificationsPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notification types with icons and colors (matching your schema's type field)
  const notificationTypes = {
    order: { icon: <FaShoppingBag />, color: "#3B82F6", label: "Order" },
    food: { icon: <FaUtensils />, color: "#F59E0B", label: "Food" },
    service: { icon: <FaGraduationCap />, color: "#8B5CF6", label: "Service" },
    product: { icon: <FaStore />, color: "#10B981", label: "Product" },
    payment: { icon: <FaMoneyBillWave />, color: "#EC4899", label: "Payment" },
    verification: { icon: <FaCheckCircle />, color: "#10B981", label: "Verification" },
    promotion: { icon: <FaGift />, color: "#EF4444", label: "Promotion" },
    alert: { icon: <FaInfoCircle />, color: "#F59E0B", label: "Alert" },
    achievement: { icon: <FaTrophy />, color: "#A855F7", label: "Achievement" },
    review: { icon: <FaStar />, color: "#F59E0B", label: "Review" }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadNotifications();
    subscribeToNotifications();
    
    return () => {
      // Cleanup subscription
    };
  }, [user, navigate]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('campus_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // If no notifications, generate sample ones for demo
      if (!data || data.length === 0) {
        const sampleNotifications = generateSampleNotifications();
        setNotifications(sampleNotifications);
      } else {
        setNotifications(data || []);
      }
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
      // Fallback to sample notifications
      setNotifications(generateSampleNotifications());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleNotifications = () => {
    const now = new Date();
    return [
      {
        id: "1",
        user_id: user?.id,
        title: "Welcome to ComradeMarket! 🎉",
        message: "Thank you for joining Kenya's #1 campus marketplace. Complete your profile to get started.",
        type: "alert",
        is_read: false,
        action_url: "/student/profile",
        related_entity_type: null,
        related_entity_id: null,
        created_at: new Date(now.getTime() - 5 * 60000).toISOString()
      },
      {
        id: "2",
        user_id: user?.id,
        title: "Your product is getting views!",
        message: "Your MacBook Air listing has received 15 views in the last hour. It's trending!",
        type: "product",
        is_read: false,
        action_url: "/student/product/1",
        related_entity_type: "product",
        related_entity_id: "1",
        created_at: new Date(now.getTime() - 30 * 60000).toISOString()
      },
      {
        id: "3",
        user_id: user?.id,
        title: "New order received! 🍔",
        message: "Someone ordered a Chicken Burger from your restaurant. Check the order details.",
        type: "food",
        is_read: false,
        action_url: "/student/orders",
        related_entity_type: "order",
        related_entity_id: "123",
        created_at: new Date(now.getTime() - 2 * 3600000).toISOString()
      },
      {
        id: "4",
        user_id: user?.id,
        title: "Flash Sale Alert! 🔥",
        message: "50% off on all textbooks for the next 24 hours. Limited stock available!",
        type: "promotion",
        is_read: true,
        action_url: "/student/campus-flash-sales",
        related_entity_type: null,
        related_entity_id: null,
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString()
      },
      {
        id: "5",
        user_id: user?.id,
        title: "Your service order is complete",
        message: "Math Tutoring service has been marked as completed. Rate your experience!",
        type: "service",
        is_read: true,
        action_url: "/student/orders",
        related_entity_type: "service_order",
        related_entity_id: "456",
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString()
      },
      {
        id: "6",
        user_id: user?.id,
        title: "Payment received! 💰",
        message: "You've received KSh 2,500 for your Calculus Textbook sale.",
        type: "payment",
        is_read: false,
        action_url: "/student/earnings",
        related_entity_type: "transaction",
        related_entity_id: "789",
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString()
      },
      {
        id: "7",
        user_id: user?.id,
        title: "Account Verification Approved! ✅",
        message: "Your student account has been verified. You now have full access to all features.",
        type: "verification",
        is_read: false,
        action_url: "/student/profile",
        related_entity_type: "profile",
        related_entity_id: user?.id,
        created_at: new Date(now.getTime() - 4 * 86400000).toISOString()
      }
    ];
  };

  const subscribeToNotifications = () => {
    // Subscribe to real-time notifications
    const subscription = supabase
      .channel('campus_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campus_notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          // Show toast for new notification
          toast.custom((t) => (
            <div className={styles.toastNotification}>
              <div className={styles.toastIcon}>
                {notificationTypes[payload.new.type]?.icon || <FaBell />}
              </div>
              <div className={styles.toastContent}>
                <strong>{payload.new.title}</strong>
                <p>{payload.new.message}</p>
              </div>
              <button onClick={() => toast.dismiss(t.id)}>✕</button>
            </div>
          ), { duration: 5000 });
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('campus_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const { error } = await supabase
        .from('campus_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('campus_notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const deleteAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete all notifications?')) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('campus_notifications')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setNotifications([]);
      toast.success('All notifications deleted');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('Failed to delete notifications');
    } finally {
      setDeleting(false);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate if action_url exists
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.is_read;
    return n.type === activeFilter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonBackBtn}></div>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonActions}></div>
        </div>
        <div className={styles.skeletonStats}>
          <div className={styles.skeletonStat}></div>
          <div className={styles.skeletonStat}></div>
        </div>
        <div className={styles.skeletonFilters}>
          {[1,2,3,4,5].map(i => <div key={i} className={styles.skeletonFilter}></div>)}
        </div>
        <div className={styles.skeletonList}>
          {[1,2,3,4].map(i => <div key={i} className={styles.skeletonNotification}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Notifications</h1>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={markAllAsRead} disabled={markingAll}>
              {markingAll ? <FaSpinner className={styles.spinning} /> : <FaCheck />}
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button className={styles.deleteAllBtn} onClick={deleteAllNotifications} disabled={deleting}>
              <FaTrash />
            </button>
          )}
        </div>
      </header>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBell />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{notifications.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaEye />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{unreadCount}</span>
            <span className={styles.statLabel}>Unread</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersSection}>
        <div className={styles.filtersScroll}>
          <button
            className={`${styles.filterChip} ${activeFilter === "all" ? styles.active : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "unread" ? styles.active : ""}`}
            onClick={() => setActiveFilter("unread")}
          >
            Unread {unreadCount > 0 && <span className={styles.filterBadge}>{unreadCount}</span>}
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "order" ? styles.active : ""}`}
            onClick={() => setActiveFilter("order")}
          >
            <FaShoppingBag /> Orders
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "food" ? styles.active : ""}`}
            onClick={() => setActiveFilter("food")}
          >
            <FaUtensils /> Food
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "service" ? styles.active : ""}`}
            onClick={() => setActiveFilter("service")}
          >
            <FaGraduationCap /> Services
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "product" ? styles.active : ""}`}
            onClick={() => setActiveFilter("product")}
          >
            <FaStore /> Products
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "payment" ? styles.active : ""}`}
            onClick={() => setActiveFilter("payment")}
          >
            <FaMoneyBillWave /> Payments
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "promotion" ? styles.active : ""}`}
            onClick={() => setActiveFilter("promotion")}
          >
            <FaGift /> Promotions
          </button>
          <button
            className={`${styles.filterChip} ${activeFilter === "verification" ? styles.active : ""}`}
            onClick={() => setActiveFilter("verification")}
          >
            <FaCheckCircle /> Verification
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <main className={styles.main}>
        {filteredNotifications.length > 0 ? (
          <div className={styles.notificationsList}>
            {filteredNotifications.map((notification) => {
              const typeInfo = notificationTypes[notification.type] || notificationTypes.alert;
              const isUnread = !notification.is_read;
              
              return (
                <motion.div
                  key={notification.id}
                  className={`${styles.notificationCard} ${isUnread ? styles.unread : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={styles.notificationIcon} style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                    {typeInfo.icon}
                  </div>
                  
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationHeader}>
                      <h4>{notification.title}</h4>
                      <span className={styles.notificationTime}>
                        <FaClock /> {getTimeAgo(notification.created_at)}
                      </span>
                    </div>
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    <div className={styles.notificationFooter}>
                      <span className={styles.notificationType} style={{ color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      {notification.related_entity_type && (
                        <span className={styles.relatedEntity}>
                          Related: {notification.related_entity_type}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.notificationActions}>
                    {isUnread && (
                      <button
                        className={styles.readBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FaBell />
            </div>
            <h3>No notifications yet</h3>
            <p>When you receive notifications, they'll appear here</p>
            <button onClick={() => navigate('/student/marketplace')}>
              Browse Marketplace
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentNotificationsPage;