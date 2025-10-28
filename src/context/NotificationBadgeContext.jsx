import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";

const NotificationBadgeContext = createContext();

export const NotificationBadgeProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load notification count from localStorage on initial load
  useEffect(() => {
    if (user?.id) {
      const savedNotificationCount = localStorage.getItem(`notification_count_${user.id}`);
      if (savedNotificationCount) {
        setUnreadCount(parseInt(savedNotificationCount));
      }
    }
  }, [user]);

  // Save notification count to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`notification_count_${user.id}`, unreadCount.toString());
    }
  }, [unreadCount, user]);

  // Fetch initial unread count - FIXED: use 'read' instead of 'is_read'
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false); // FIXED: Changed from 'is_read' to 'read'

      if (!error) {
        setUnreadCount(count || 0);
      } else {
        console.error("Error fetching unread count:", error);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  }, [user]);

  // Fetch notifications with pagination - FIXED: use 'read' instead of 'is_read'
  const fetchNotifications = useCallback(async (page = 0, pageSize = 20) => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return { data: [], hasMore: false, total: 0 };
    }

    try {
      setIsLoading(true);
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!error) {
        if (page === 0) {
          setNotifications(data || []);
        } else {
          setNotifications(prev => [...prev, ...(data || [])]);
        }
        return { data: data || [], hasMore: (data?.length || 0) === pageSize, total: count || 0 };
      } else {
        console.error("Error fetching notifications:", error);
        return { data: [], hasMore: false, total: 0 };
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return { data: [], hasMore: false, total: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark notifications as read - FIXED: use 'read' instead of 'is_read'
  const markAsRead = useCallback(async (notificationId = null) => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from("notifications")
        .update({ read: true }) // FIXED: Changed from 'is_read' to 'read'
        .eq("user_id", user.id)
        .eq("read", false); // FIXED: Changed from 'is_read' to 'read'

      if (notificationId) {
        query = query.eq("id", notificationId);
      }

      const { error } = await query;

      if (!error) {
        // Update local state
        if (notificationId) {
          setNotifications(prev => 
            prev.map(notif => 
              notif.id === notificationId ? { ...notif, read: true } : notif
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
          // Mark all as read
          setNotifications(prev => 
            prev.map(notif => ({ ...notif, read: true }))
          );
          setUnreadCount(0);
        }
      } else {
        console.error("Error marking as read:", error);
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      throw error;
    }
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (!error) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      } else {
        console.error("Error deleting notification:", error);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }, [user, notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (!error) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.error("Error clearing notifications:", error);
      }
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      throw error;
    }
  }, [user]);

  // Real-time subscription for notifications - FIXED: use 'read' instead of 'is_read'
  useEffect(() => {
    if (!user?.id) return;

    let notificationSubscription;

    const setupNotificationSubscription = async () => {
      // First, fetch current count and notifications
      await fetchUnreadCount();
      await fetchNotifications(0, 10);

      // Set up real-time subscription
      notificationSubscription = supabase
        .channel('notification_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Add new notification to the list
            setNotifications(prev => [payload.new, ...prev]);
            
            // Increment unread count if notification is unread
            if (!payload.new.read) { // FIXED: Changed from 'is_read' to 'read'
              setUnreadCount(prev => prev + 1);
              
              // Show desktop notification if supported and page is not focused
              if (Notification.permission === 'granted' && document.hidden) {
                new Notification(payload.new.title || 'New Notification', {
                  body: payload.new.message,
                  icon: '/favicon.ico',
                  tag: payload.new.id
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Update notification in the list
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === payload.new.id ? payload.new : notif
              )
            );
            
            // Update unread count if read status changed
            if (payload.old.read !== payload.new.read) { // FIXED: Changed from 'is_read' to 'read'
              setUnreadCount(prev => 
                payload.new.read ? Math.max(0, prev - 1) : prev + 1 // FIXED: Changed from 'is_read' to 'read'
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Remove notification from the list
            setNotifications(prev => 
              prev.filter(notif => notif.id !== payload.old.id)
            );
            
            // Decrement count if it was unread
            if (!payload.old.read) { // FIXED: Changed from 'is_read' to 'read'
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Connected to real-time notifications');
          }
        });
    };

    setupNotificationSubscription();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    return () => {
      if (notificationSubscription) {
        supabase.removeChannel(notificationSubscription);
      }
    };
  }, [user, fetchUnreadCount, fetchNotifications]);

  // Periodic sync every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 120000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const value = {
    unreadCount,
    setUnreadCount,
    notifications,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    isLoading,
    fetchUnreadCount
  };

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
};

export const useNotificationBadge = () => {
  const context = useContext(NotificationBadgeContext);
  if (!context) {
    throw new Error('useNotificationBadge must be used within a NotificationBadgeProvider');
  }
  return context;
};