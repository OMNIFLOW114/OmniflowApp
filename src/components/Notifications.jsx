import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/supabase";
import { 
  FaBell, 
  FaCheckCircle, 
  FaTrash, 
  FaSearch, 
  FaFilter,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegBell,
  FaRegCheckCircle,
  FaRegTrashAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import "./Notifications.css";

const Notifications = () => {
  const { user } = useAuth();
  const { setGlobalUnreadCount } = useNotificationBadge();
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Time ago function
  const timeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <FaCheckCircle className="icon-success" />;
      case "warning":
        return <FaExclamationTriangle className="icon-warning" />;
      case "info":
        return <FaInfoCircle className="icon-info" />;
      case "system":
        return <FaBell className="icon-system" />;
      default:
        return <FaBell className="icon-default" />;
    }
  };

  // Get notification color class
  const getNotificationColorClass = (type) => {
    switch (type) {
      case "success": return "color-success";
      case "warning": return "color-warning";
      case "info": return "color-info";
      case "system": return "color-system";
      default: return "color-default";
    }
  };

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = {};
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    const filteredNotifs = notifications
      .filter(n => {
        if (filter === "unread") return !n.read;
        if (filter === "read") return n.read;
        return true;
      })
      .filter(n => 
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    filteredNotifs.forEach(n => {
      const date = new Date(n.created_at).toLocaleDateString();
      let displayDate;
      
      if (date === today) displayDate = "Today";
      else if (date === yesterday) displayDate = "Yesterday";
      else displayDate = new Date(n.created_at).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      if (!groups[displayDate]) groups[displayDate] = [];
      groups[displayDate].push(n);
    });

    return groups;
  }, [notifications, searchQuery, filter]);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setNotifications(data || []);
      setGlobalUnreadCount(data?.filter((n) => !n.read).length || 0);
    } catch (err) {
      console.error("Notification fetch failed:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user, setGlobalUnreadCount]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.read) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setGlobalUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    } catch (err) {
      console.error("Error marking as read:", err);
      // Revert on error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      setGlobalUnreadCount(prev => prev + 1);
    }
  };

  // Delete single notification
  const deleteNotification = async (id) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!notification.read) {
      setGlobalUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await supabase.from("notifications").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting notification:", err);
      // Revert on error
      setNotifications(prev => [...prev, notification]);
      if (!notification.read) {
        setGlobalUnreadCount(prev => prev + 1);
      }
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    const unreadIds = unreadNotifications.map(n => n.id);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setGlobalUnreadCount(0);

    try {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    } catch (err) {
      console.error("Error marking all as read:", err);
      // Revert on error
      setNotifications(prev => prev.map(n => 
        unreadIds.includes(n.id) ? { ...n, read: false } : n
      ));
      setGlobalUnreadCount(unreadNotifications.length);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user?.id || notifications.length === 0) return;

    const currentNotifications = [...notifications];
    const currentUnreadCount = getUnreadCount();
    
    // Optimistically update UI
    setNotifications([]);
    setGlobalUnreadCount(0);
    setShowClearConfirm(false);

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      console.log("All notifications cleared successfully");
    } catch (err) {
      console.error("Error clearing all notifications:", err);
      // Revert on error
      setNotifications(currentNotifications);
      setGlobalUnreadCount(currentUnreadCount);
      alert("Failed to clear notifications. Please try again.");
    }
  };

  const getUnreadCount = () => notifications.filter(n => !n.read).length;

  // Set up real-time subscription and initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Real-time subscription for notifications
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          { 
            event: "*", 
            schema: "public", 
            table: "notifications",
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log("Real-time notification update:", payload);
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, fetchNotifications]);

  if (loading) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner"></div>
        <p>Loading your notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      {/* Header Section */}
      <header className="notifications-header">
        <div className="header-content">
          <div className="header-title">
            <FaBell className="header-icon" />
            <h1>Notifications</h1>
            {getUnreadCount() > 0 && (
              <span className="unread-badge">{getUnreadCount()}</span>
            )}
          </div>
          
          <div className="header-controls">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search notifications..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button 
                className={`filter-tab ${filter === "unread" ? "active" : ""}`}
                onClick={() => setFilter("unread")}
              >
                Unread {getUnreadCount() > 0 && `(${getUnreadCount()})`}
              </button>
              <button 
                className={`filter-tab ${filter === "read" ? "active" : ""}`}
                onClick={() => setFilter("read")}
              >
                Read
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="notifications-main">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="empty-state">
            <FaRegBell className="empty-icon" />
            <h2>No notifications</h2>
            <p>
              {searchQuery || filter !== "all" 
                ? "No notifications match your current filters." 
                : "You're all caught up! New notifications will appear here."
              }
            </p>
            {(searchQuery || filter !== "all") && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="notifications-list">
            {Object.entries(groupedNotifications).map(([date, notifs]) => (
              <section key={date} className="notification-group">
                <div className="group-header">
                  <h3 className="group-date">{date}</h3>
                  <span className="group-count">{notifs.length} notification{notifs.length !== 1 ? 's' : ''}</span>
                </div>
                
                <div className="notifications-grid">
                  <AnimatePresence>
                    {notifs.map(n => (
                      <motion.div
                        key={n.id}
                        className={`notification-card ${n.read ? "read" : "unread"} ${getNotificationColorClass(n.type)}`}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        layout
                      >
                        <div className="notification-indicator">
                          {!n.read && <div className="unread-dot"></div>}
                        </div>

                        <div className="notification-icon-container">
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="notification-content">
                          <div className="notification-header">
                            <h4 className="notification-title">{n.title}</h4>
                            <span className="notification-time">{timeAgo(n.created_at)}</span>
                          </div>
                          <p className="notification-message">{n.message}</p>
                        </div>

                        <div className="notification-actions">
                          {!n.read && (
                            <button 
                              className="action-btn mark-read-btn"
                              onClick={() => markAsRead(n.id)}
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <FaRegCheckCircle />
                            </button>
                          )}
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => deleteNotification(n.id)}
                            title="Delete notification"
                            aria-label="Delete notification"
                          >
                            <FaRegTrashAlt />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer Actions */}
      {notifications.length > 0 && (
        <footer className="notifications-footer">
          <div className="footer-actions">
            <button 
              className="footer-btn mark-all-btn"
              onClick={markAllAsRead}
              disabled={getUnreadCount() === 0}
              aria-label="Mark all as read"
            >
              <FaCheck className="btn-icon" />
              Mark all as read
            </button>
            
            <button 
              className="footer-btn clear-all-btn"
              onClick={() => setShowClearConfirm(true)}
              aria-label="Clear all notifications"
            >
              <FaTrash className="btn-icon" />
              Clear all
            </button>
          </div>
        </footer>
      )}

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              className="confirmation-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <FaExclamationTriangle className="modal-icon" />
                <h3>Clear all notifications?</h3>
              </div>
              
              <div className="modal-content">
                <p>This will permanently delete all {notifications.length} notifications. This action cannot be undone.</p>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="modal-btn cancel-btn"
                  onClick={() => setShowClearConfirm(false)}
                  aria-label="Cancel clear all"
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn confirm-btn"
                  onClick={clearAllNotifications}
                  aria-label="Confirm clear all"
                >
                  Yes, clear all
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;