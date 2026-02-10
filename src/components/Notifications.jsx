import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { useAuth } from "@/context/AuthContext";
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
  FaEllipsisV,
  FaRegCheckCircle,
  FaRegCircle,
  FaCalendar,
  FaArrowLeft
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import "./Notifications.css";

// Cache keys for localStorage
const NOTIFICATIONS_CACHE_KEYS = {
  LIST: 'notifications_list',
  CACHE_TIMESTAMP: 'notifications_cache_timestamp',
  UNREAD_COUNT: 'notifications_unread_count',
  LAST_VIEWED: 'notifications_last_viewed'
};

// Cache expiry time (5 minutes)
const NOTIFICATIONS_CACHE_EXPIRY = 5 * 60 * 1000;

// Cache utility functions
const loadNotificationsFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - timestamp > NOTIFICATIONS_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading notifications cache ${key}:`, error);
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveNotificationsToCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving notifications cache ${key}:`, error);
  }
};

const clearNotificationsCache = () => {
  Object.values(NOTIFICATIONS_CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Notification type configurations
const NOTIFICATION_TYPES = {
  announcement: { icon: FaBell, color: 'info', label: 'Announcement' },
  order: { icon: FaShoppingCart, color: 'success', label: 'Order' },
  wishlist: { icon: FaHeart, color: 'pink', label: 'Wishlist' },
  rating: { icon: FaStar, color: 'warning', label: 'Rating' },
  promotion: { icon: FaTag, color: 'purple', label: 'Promotion' },
  message: { icon: FaEnvelope, color: 'blue', label: 'Message' },
  system: { icon: FaCog, color: 'gray', label: 'System' },
  alert: { icon: FaExclamationTriangle, color: 'danger', label: 'Alert' }
};

// Individual Notification Card Component
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
      className={`notification-card ${notification.read ? 'read' : 'unread'} ${config.color}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      {isSelectMode && (
        <div className="selection-checkbox" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          {isSelected ? <FaRegCheckCircle className="checked" /> : <FaRegCircle className="unchecked" />}
        </div>
      )}

      <div className="notification-content">
        <div className="notification-icon-wrapper">
          <IconComponent className={`notification-icon ${config.color}`} />
          {!notification.read && !isSelectMode && <div className="unread-indicator"></div>}
        </div>

        <div className="notification-details">
          <div className="notification-header">
            <h3 className="notification-title">{notification.title}</h3>
            <span className="notification-time">
              {formatTime(notification.created_at)}
            </span>
          </div>

          <p className="notification-message">
            {notification.message}
          </p>

          <div className="notification-meta">
            <span className={`notification-type ${notification.type}`}>
              {config.label}
            </span>
          </div>
        </div>

        {!isSelectMode && !notification.read && (
          <div className="notification-actions">
            <div className="unread-dot"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

NotificationCard.displayName = 'NotificationCard';

// Main component
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
  const [activeFilter, setActiveFilter] = useState(() => 
    localStorage.getItem('notifications_filter') || 'all'
  );
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [longPressTimer, setLongPressTimer] = useState(null);
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isSyncing: false,
    lastSyncTime: 0,
    backgroundSyncInterval: null
  });

  // Load cached notifications on mount
  useEffect(() => {
    const cachedNotifications = loadNotificationsFromCache(NOTIFICATIONS_CACHE_KEYS.LIST, []);
    const cachedUnreadCount = loadNotificationsFromCache(NOTIFICATIONS_CACHE_KEYS.UNREAD_COUNT, 0);
    
    if (cachedNotifications.length > 0) {
      // We can't directly set the context state, but we can show cached data
      console.log('Loaded notifications from cache:', cachedNotifications.length);
    }
    
    isMountedRef.current = true;
  }, []);

  // Save notifications to cache when they change
  useEffect(() => {
    if (isMountedRef.current && notifications.length > 0) {
      saveNotificationsToCache(NOTIFICATIONS_CACHE_KEYS.LIST, notifications);
      saveNotificationsToCache(NOTIFICATIONS_CACHE_KEYS.UNREAD_COUNT, unreadCount);
      saveNotificationsToCache(NOTIFICATIONS_CACHE_KEYS.LAST_VIEWED, Date.now());
    }
  }, [notifications, unreadCount]);

  // Save filter preference
  useEffect(() => {
    localStorage.setItem('notifications_filter', activeFilter);
  }, [activeFilter]);

  // Background sync every 2 minutes
  useEffect(() => {
    const syncNotifications = async () => {
      if (cacheDataRef.current.isSyncing || !user?.id) return;
      
      // Don't sync if we just synced less than 30 seconds ago
      if (cacheDataRef.current.lastSyncTime > 0 && 
          Date.now() - cacheDataRef.current.lastSyncTime < 30000) {
        return;
      }
      
      cacheDataRef.current.isSyncing = true;
      
      try {
        await fetchNotifications();
        cacheDataRef.current.lastSyncTime = Date.now();
      } catch (error) {
        console.error('Background sync failed:', error);
      } finally {
        cacheDataRef.current.isSyncing = false;
      }
    };

    // Initial sync
    if (user?.id) {
      syncNotifications();
    }

    // Set up interval for background sync
    cacheDataRef.current.backgroundSyncInterval = setInterval(syncNotifications, 2 * 60 * 1000);
    
    return () => {
      if (cacheDataRef.current.backgroundSyncInterval) {
        clearInterval(cacheDataRef.current.backgroundSyncInterval);
      }
    };
  }, [fetchNotifications, user]);

  // Infinite scroll hook
  const { loadMore, hasMore, loadingMore } = useInfiniteScroll(
    fetchNotifications,
    15
  );

  // Filter notifications based on active filter
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
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    });
    return groups;
  }, []);

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  // Get notification icon and color
  const getNotificationConfig = useCallback((notification) => {
    const { type, color } = notification;
    return NOTIFICATION_TYPES[type] || { 
      icon: FaInfoCircle, 
      color: color || 'info', 
      label: type || 'Notification' 
    };
  }, []);

  // Handle mark as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await markAsRead(notificationId);
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  }, [markAsRead]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  }, [markAsRead]);

  // Handle delete notification
  const handleDeleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      if (expandedNotification === notificationId) {
        setExpandedNotification(null);
        setViewMode('list');
      }
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  }, [deleteNotification, expandedNotification]);

  // Handle clear all
  const handleClearAll = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      try {
        await clearAllNotifications();
        setViewMode('list');
        setExpandedNotification(null);
        clearNotificationsCache();
        toast.success('All notifications cleared');
      } catch (error) {
        toast.error('Failed to clear notifications');
      }
    }
  }, [clearAllNotifications]);

  // Long press handlers
  const handleLongPressStart = useCallback((notificationId) => {
    const timer = setTimeout(() => {
      setIsSelectMode(true);
      toggleSelectNotification(notificationId);
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  }, [filteredNotifications, selectedNotifications.size]);

  const toggleSelectNotification = useCallback((notificationId) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  }, [selectedNotifications]);

  const handleBulkMarkAsRead = useCallback(async () => {
    try {
      for (const id of selectedNotifications) {
        await markAsRead(id);
      }
      setSelectedNotifications(new Set());
      setIsSelectMode(false);
      toast.success(`Marked ${selectedNotifications.size} notifications as read`);
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  }, [selectedNotifications, markAsRead]);

  const handleBulkDelete = useCallback(async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedNotifications.size} notifications?`)) {
      try {
        for (const id of selectedNotifications) {
          await deleteNotification(id);
        }
        setSelectedNotifications(new Set());
        setIsSelectMode(false);
        toast.success(`Deleted ${selectedNotifications.size} notifications`);
      } catch (error) {
        toast.error('Failed to delete notifications');
      }
    }
  }, [selectedNotifications, deleteNotification]);

  // Format time for mobile
  const formatTime = useCallback((timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return notificationTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // Format date for groups
  const formatGroupDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    if (isSelectMode) {
      toggleSelectNotification(notification.id);
    } else {
      setExpandedNotification(notification.id);
      setViewMode('detail');
      if (!notification.read) {
        handleMarkAsRead(notification.id);
      }
    }
  }, [isSelectMode, toggleSelectNotification, handleMarkAsRead]);

  // Exit select mode
  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedNotifications(new Set());
  }, []);

  // Handle pull-to-refresh
  useEffect(() => {
    let startY = 0;
    let isRefreshing = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const notificationsSection = document.querySelector('.notifications-container');
      if (!notificationsSection) return;
      
      const rect = notificationsSection.getBoundingClientRect();
      const isAtTop = window.scrollY <= rect.top + 100;
      
      if (isAtTop && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 80) {
          isRefreshing = true;
          clearNotificationsCache();
          fetchNotifications(true).finally(() => {
            isRefreshing = false;
            toast.success('Notifications refreshed!');
          });
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [fetchNotifications]);

  if (!user) {
    return (
      <div className="notifications-container">
        <div className="notifications-header">
          <div className="header-content">
            <div className="header-main">
              <h1>Notifications</h1>
            </div>
          </div>
        </div>
        <div className="notifications-login-prompt">
          <div className="login-prompt-icon">
            <FaBell />
          </div>
          <h3>Please log in to view notifications</h3>
          <p>Sign in to see your alerts and updates</p>
        </div>
      </div>
    );
  }

  // Detail View
  if (viewMode === 'detail' && expandedNotification) {
    const notification = notifications.find(n => n.id === expandedNotification);
    if (!notification) {
      setViewMode('list');
      return null;
    }

    const config = getNotificationConfig(notification);
    const IconComponent = config.icon;

    return (
      <div className="notifications-container detail-view">
        <div className="notifications-header">
          <div className="header-content">
            <div className="header-main">
              <button 
                className="back-button"
                onClick={() => setViewMode('list')}
              >
                <FaArrowLeft />
              </button>
              <div className="header-title-section">
                <h1>Notification</h1>
              </div>
              <button 
                className="action-btn delete-btn"
                onClick={() => handleDeleteNotification(notification.id)}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        </div>

        <div className="notification-detail-view">
          <motion.div 
            className="notification-detail-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="detail-header">
              <div className={`detail-icon ${config.color}`}>
                <IconComponent />
              </div>
              <div className="detail-meta">
                <h2 className="detail-title">{notification.title}</h2>
                <div className="detail-time">
                  <FaCalendar />
                  {new Date(notification.created_at).toLocaleString()}
                </div>
                <span className={`notification-type ${notification.type}`}>
                  {config.label}
                </span>
              </div>
            </div>

            <div className="detail-content">
              <p className="detail-message">{notification.message}</p>
            </div>

            <div className="detail-actions">
              {!notification.read && (
                <button 
                  className="action-btn mark-read-btn"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <FaCheck />
                  Mark as read
                </button>
              )}
              <button 
                className="action-btn delete-btn"
                onClick={() => handleDeleteNotification(notification.id)}
              >
                <FaTrash />
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="notifications-container list-view">
      {/* Header Section */}
      <motion.div 
        className="notifications-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-main">
            <div className="header-title-section">
              <h1>
                Notifications
                {unreadCount > 0 && (
                  <motion.span 
                    className="unread-count-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                )}
              </h1>
            </div>

            <div className="header-actions">
              {isSelectMode ? (
                <button 
                  className="action-btn cancel-btn"
                  onClick={exitSelectMode}
                >
                  <FaTimes />
                </button>
              ) : (
                <button 
                  className="action-btn menu-btn"
                  onClick={handleClearAll}
                >
                  <FaTrash />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs-scroll">
            <div className="filter-tabs">
              {[
                { key: 'all', label: 'All', count: notifications.length },
                { key: 'unread', label: 'Unread', count: unreadCount },
                { key: 'read', label: 'Read', count: notifications.length - unreadCount }
              ].map(filter => (
                <button
                  key={filter.key}
                  className={`filter-tab ${activeFilter === filter.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  <span className="filter-label">{filter.label}</span>
                  {filter.count > 0 && (
                    <span className="filter-count">{filter.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {isSelectMode && selectedNotifications.size > 0 && (
              <motion.div 
                className="bulk-actions-bar"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="bulk-actions-content">
                  <span className="selected-count">
                    {selectedNotifications.size} selected
                  </span>
                  <div className="bulk-actions">
                    <button 
                      className="bulk-action-btn bulk-mark-read-btn"
                      onClick={handleBulkMarkAsRead}
                    >
                      <FaCheck />
                      Mark read
                    </button>
                    <button 
                      className="bulk-action-btn bulk-delete-btn"
                      onClick={handleBulkDelete}
                    >
                      <FaTrash />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Notifications List */}
      <div className="notifications-content">
        <AnimatePresence mode="wait">
          {isLoading && notifications.length === 0 ? (
            <motion.div
              className="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="loading-spinner"></div>
              <p>Loading notifications...</p>
            </motion.div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="empty-icon">
                <FaBellSlash />
              </div>
              <h3>No notifications yet</h3>
              <p>You're all caught up! We'll notify you when something new arrives.</p>
            </motion.div>
          ) : (
            <motion.div
              className="notifications-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isSelectMode && (
                <div className="select-all-bar">
                  <label className="select-all-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.size === filteredNotifications.length}
                      onChange={toggleSelectAll}
                    />
                    <span className="checkmark"></span>
                    <span>Select all ({filteredNotifications.length})</span>
                  </label>
                </div>
              )}

              {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
                <div key={date} className="notification-group">
                  <div className="group-header">
                    <span className="group-date">{formatGroupDate(date)}</span>
                    <span className="group-count">{dayNotifications.length}</span>
                  </div>
                  
                  <div className="group-notifications">
                    {dayNotifications.map((notification, index) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        index={index}
                        isSelectMode={isSelectMode}
                        isSelected={selectedNotifications.has(notification.id)}
                        onSelect={() => toggleSelectNotification(notification.id)}
                        onClick={() => handleNotificationClick(notification)}
                        onLongPressStart={() => handleLongPressStart(notification.id)}
                        onLongPressEnd={handleLongPressEnd}
                        formatTime={formatTime}
                        getNotificationConfig={getNotificationConfig}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Mark All as Read Button - At the bottom */}
              {unreadCount > 0 && !isSelectMode && (
                <div className="mark-all-read-section">
                  <button 
                    className="mark-all-read-btn"
                    onClick={handleMarkAllAsRead}
                  >
                    <FaCheckDouble />
                    Mark all as read
                  </button>
                </div>
              )}

              {/* Load More */}
              {hasMore && (
                <div className="load-more-section">
                  <button 
                    onClick={loadMore} 
                    disabled={loadingMore}
                    className="load-more-btn"
                  >
                    {loadingMore ? (
                      <>
                        <div className="loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        Loading...
                      </>
                    ) : (
                      'Load more notifications'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

NotificationsPage.displayName = 'NotificationsPage';

export default NotificationsPage;