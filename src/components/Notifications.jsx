// src/components/NotificationsPage.jsx - PREMIUM UPDATED VERSION
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FaBell, 
  FaCheck, 
  FaCheckDouble, 
  FaTrash, 
  FaShoppingCart, 
  FaHeart, 
  FaStar, 
  FaTag,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEnvelope,
  FaCog,
  FaTimes,
  FaEye,
  FaBellSlash,
  FaRegCheckCircle,
  FaRegCircle,
  FaCalendar,
  FaArrowLeft,
  FaSpinner
} from "react-icons/fa";
import styles from "./Notifications.module.css";

// Cache keys for localStorage
const NOTIFICATIONS_CACHE_KEYS = {
  LIST: 'notifications_list',
  CACHE_TIMESTAMP: 'notifications_cache_timestamp',
  UNREAD_COUNT: 'notifications_unread_count',
  LAST_VIEWED: 'notifications_last_viewed'
};

const NOTIFICATIONS_CACHE_EXPIRY = 5 * 60 * 1000;

// Notification type configurations
const NOTIFICATION_TYPES = {
  announcement: { icon: FaBell, color: '#8B5CF6', label: 'Announcement' },
  order: { icon: FaShoppingCart, color: '#10B981', label: 'Order' },
  wishlist: { icon: FaHeart, color: '#EC4899', label: 'Wishlist' },
  rating: { icon: FaStar, color: '#F59E0B', label: 'Rating' },
  promotion: { icon: FaTag, color: '#8B5CF6', label: 'Promotion' },
  message: { icon: FaEnvelope, color: '#3B82F6', label: 'Message' },
  system: { icon: FaCog, color: '#6B7280', label: 'System' },
  alert: { icon: FaExclamationTriangle, color: '#EF4444', label: 'Alert' }
};

// Skeleton Loader Component
const NotificationsSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonActions}></div>
      </div>
      <div className={styles.skeletonTabs}>
        {[1,2,3].map(i => <div key={i} className={styles.skeletonTab}></div>)}
      </div>
      <div className={styles.skeletonList}>
        {[1,2,3,4].map(i => (
          <div key={i} className={styles.skeletonItem}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLineShort}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Notification Card Component
const NotificationCard = memo(({ 
  notification, 
  index, 
  isSelectMode, 
  isSelected, 
  onSelect, 
  onClick,
  onLongPressStart,
  onLongPressEnd,
  formatTime, 
  getNotificationConfig
}) => {
  const config = getNotificationConfig(notification);
  const IconComponent = config.icon;

  return (
    <motion.div
      className={`${styles.notificationCard} ${!notification.read ? styles.unread : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      {isSelectMode && (
        <div className={styles.selectionCheckbox} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          {isSelected ? <FaRegCheckCircle className={styles.checked} /> : <FaRegCircle className={styles.unchecked} />}
        </div>
      )}

      <div className={styles.notificationIcon} style={{ background: `${config.color}15`, color: config.color }}>
        <IconComponent />
        {!notification.read && !isSelectMode && <div className={styles.unreadDot}></div>}
      </div>

      <div className={styles.notificationContent}>
        <div className={styles.notificationHeader}>
          <h4>{notification.title}</h4>
          <span className={styles.notificationTime}>{formatTime(notification.created_at)}</span>
        </div>
        <p className={styles.notificationMessage}>{notification.message}</p>
        <div className={styles.notificationFooter}>
          <span className={styles.notificationType} style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

NotificationCard.displayName = 'NotificationCard';

// Detail View Component
const NotificationDetail = ({ notification, onBack, onDelete, onMarkRead, getNotificationConfig, formatTime }) => {
  const config = getNotificationConfig(notification);
  const IconComponent = config.icon;

  return (
    <div className={styles.detailView}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          <FaArrowLeft />
        </button>
        <h2>Notification</h2>
        <button className={styles.deleteBtn} onClick={() => onDelete(notification.id)}>
          <FaTrash />
        </button>
      </div>

      <div className={styles.detailCard}>
        <div className={styles.detailIcon} style={{ background: `${config.color}15`, color: config.color }}>
          <IconComponent />
        </div>
        
        <div className={styles.detailInfo}>
          <h3>{notification.title}</h3>
          <div className={styles.detailTime}>
            <FaCalendar />
            <span>{formatTime(notification.created_at, true)}</span>
          </div>
          <span className={styles.detailType} style={{ color: config.color }}>{config.label}</span>
        </div>

        <div className={styles.detailMessage}>
          <p>{notification.message}</p>
        </div>

        <div className={styles.detailActions}>
          {!notification.read && (
            <button className={styles.markReadBtn} onClick={() => onMarkRead(notification.id)}>
              <FaCheck /> Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
const NotificationsPage = memo(() => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    deleteNotification,
    clearAllNotifications,
    fetchNotifications,
    isLoading 
  } = useNotificationBadge();
  
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [activeFilter, setActiveFilter] = useState(() => 
    localStorage.getItem('notifications_filter') || 'all'
  );
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isMountedRef = useRef(false);

  // Load cached notifications on mount
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Save filter preference
  useEffect(() => {
    localStorage.setItem('notifications_filter', activeFilter);
  }, [activeFilter]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const statusMatch = activeFilter === 'all' || 
      (activeFilter === 'unread' && !notification.read) ||
      (activeFilter === 'read' && notification.read);
    return statusMatch;
  });

  // Group notifications by date
  const groupNotificationsByDate = useCallback((notifications) => {
    const groups = {};
    notifications.forEach(notification => {
      const date = new Date(notification.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(notification);
    });
    return groups;
  }, []);

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  const getNotificationConfig = useCallback((notification) => {
    return NOTIFICATION_TYPES[notification.type] || { 
      icon: FaInfoCircle, 
      color: '#6B7280', 
      label: notification.type || 'Notification' 
    };
  }, []);

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await markAsRead(notificationId);
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  }, [markAsRead]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  }, [markAsRead]);

  const handleDeleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      if (selectedNotification?.id === notificationId) setSelectedNotification(null);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  }, [deleteNotification, selectedNotification]);

  const handleClearAll = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      try {
        await clearAllNotifications();
        toast.success('All notifications cleared');
      } catch (error) {
        toast.error('Failed to clear notifications');
      }
    }
  }, [clearAllNotifications]);

  // Long press handlers for select mode
  const handleLongPressStart = useCallback((notificationId) => {
    const timer = setTimeout(() => {
      setIsSelectMode(true);
      setSelectedNotifications(prev => new Set(prev).add(notificationId));
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const toggleSelectNotification = useCallback((notificationId) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) newSet.delete(notificationId);
      else newSet.add(notificationId);
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  }, [filteredNotifications, selectedNotifications.size]);

  const handleBulkMarkAsRead = useCallback(async () => {
    try {
      for (const id of selectedNotifications) await markAsRead(id);
      setSelectedNotifications(new Set());
      setIsSelectMode(false);
      toast.success(`Marked ${selectedNotifications.size} notifications as read`);
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  }, [selectedNotifications, markAsRead]);

  const handleBulkDelete = useCallback(async () => {
    if (window.confirm(`Delete ${selectedNotifications.size} notifications?`)) {
      try {
        for (const id of selectedNotifications) await deleteNotification(id);
        setSelectedNotifications(new Set());
        setIsSelectMode(false);
        toast.success(`Deleted ${selectedNotifications.size} notifications`);
      } catch (error) {
        toast.error('Failed to delete notifications');
      }
    }
  }, [selectedNotifications, deleteNotification]);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedNotifications(new Set());
  }, []);

  const formatTime = useCallback((timestamp, full = false) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (full) {
      return notificationTime.toLocaleString();
    }
    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return notificationTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const formatGroupDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  // Pull to refresh
  useEffect(() => {
    let startY = 0;
    const handleTouchStart = (e) => { startY = e.touches[0].clientY; };
    const handleTouchMove = async (e) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const diff = e.touches[0].clientY - startY;
        if (diff > 80) {
          setIsRefreshing(true);
          await fetchNotifications(true);
          setIsRefreshing(false);
          toast.success('Notifications refreshed!');
        }
      }
    };
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [fetchNotifications, isRefreshing]);

  if (!user) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.loginPrompt}>
          <FaBell className={styles.promptIcon} />
          <h3>Please log in to view notifications</h3>
          <p>Sign in to see your alerts and updates</p>
          <button className={styles.loginBtn} onClick={() => navigate('/auth')}>Login</button>
        </div>
      </div>
    );
  }

  if (selectedNotification) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <NotificationDetail
          notification={selectedNotification}
          onBack={() => setSelectedNotification(null)}
          onDelete={handleDeleteNotification}
          onMarkRead={handleMarkAsRead}
          getNotificationConfig={getNotificationConfig}
          formatTime={formatTime}
        />
        <div className={styles.bottomSpacing} />
      </div>
    );
  }

  if (isLoading && notifications.length === 0) {
    return <NotificationsSkeleton />;
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <h1>
          Notifications
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </h1>
        <div className={styles.headerActions}>
          {isSelectMode ? (
            <button className={styles.cancelBtn} onClick={exitSelectMode}>
              <FaTimes /> Cancel
            </button>
          ) : (
            <button className={styles.clearBtn} onClick={handleClearAll}>
              <FaTrash /> Clear All
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'read', label: 'Read', count: notifications.length - unreadCount }
          ].map(filter => (
            <button
              key={filter.key}
              className={`${styles.tab} ${activeFilter === filter.key ? styles.active : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              <span>{filter.label}</span>
              {filter.count > 0 && <span className={styles.tabCount}>{filter.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {isSelectMode && selectedNotifications.size > 0 && (
          <motion.div 
            className={styles.bulkBar}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span className={styles.bulkCount}>{selectedNotifications.size} selected</span>
            <div className={styles.bulkActions}>
              <button onClick={handleBulkMarkAsRead}><FaCheck /> Mark Read</button>
              <button onClick={handleBulkDelete}><FaTrash /> Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className={styles.content}>
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <motion.div 
              className={styles.emptyState}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <FaBellSlash className={styles.emptyIcon} />
              <h3>No notifications yet</h3>
              <p>You're all caught up! We'll notify you when something new arrives.</p>
            </motion.div>
          ) : (
            <motion.div 
              className={styles.notificationsList}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Select All Bar */}
              {isSelectMode && (
                <div className={styles.selectAllBar}>
                  <label className={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      checked={selectedNotifications.size === filteredNotifications.length}
                      onChange={toggleSelectAll}
                    />
                    <span>Select all ({filteredNotifications.length})</span>
                  </label>
                </div>
              )}

              {/* Grouped Notifications */}
              {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
                <div key={date} className={styles.notificationGroup}>
                  <div className={styles.groupHeader}>
                    <span className={styles.groupDate}>{formatGroupDate(date)}</span>
                    <span className={styles.groupCount}>{dayNotifications.length}</span>
                  </div>
                  
                  {dayNotifications.map((notification, index) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      index={index}
                      isSelectMode={isSelectMode}
                      isSelected={selectedNotifications.has(notification.id)}
                      onSelect={() => toggleSelectNotification(notification.id)}
                      onClick={() => setSelectedNotification(notification)}
                      onLongPressStart={() => handleLongPressStart(notification.id)}
                      onLongPressEnd={handleLongPressEnd}
                      formatTime={formatTime}
                      getNotificationConfig={getNotificationConfig}
                    />
                  ))}
                </div>
              ))}

              {/* Mark All as Read Button */}
              {unreadCount > 0 && !isSelectMode && (
                <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                  <FaCheckDouble /> Mark all as read
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Spacing for Navigation */}
      <div className={styles.bottomSpacing} />
    </div>
  );
});

NotificationsPage.displayName = 'NotificationsPage';
export default NotificationsPage;