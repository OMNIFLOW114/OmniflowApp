import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { FaBell, FaCheckCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import "./Notifications.css";

const Notifications = () => {
  const { user } = useAuth();
  const { setGlobalUnreadCount } = useNotificationBadge();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Insert welcome messages if not exists
  const insertWelcomeNotifications = async () => {
    if (!user?.id) return;
    const { data: existing, error } = await supabase
      .from("notifications")
      .select("title")
      .eq("user_id", user.id)
      .eq("type", "system_welcome");

    if (error) return;

    const existingTitles = existing.map((n) => n.title);

    const welcomeMessages = [
      {
        title: "🎉 Welcome to OmniFlow!",
        message: "We're thrilled to have you here. Your journey starts now.",
        color: "gold",
      },
      {
        title: "🔥 Let's Go!",
        message:
          "Tap into power. Explore OmniCash, OmniHub & unlock your potential.",
        color: "crimson",
      },
    ];

    const inserts = welcomeMessages
      .filter((msg) => !existingTitles.includes(msg.title))
      .map((msg) => ({
        user_id: user.id,
        title: msg.title,
        message: msg.message,
        type: "system_welcome",
        color: msg.color,
        read: false,
      }));

    if (inserts.length > 0) {
      await supabase.from("notifications").insert(inserts);
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      await insertWelcomeNotifications();

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data);
      setGlobalUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Notification fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setGlobalUnreadCount((prev) => Math.max(prev - 1, 0));

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Failed to mark as read:", error);
      fetchNotifications(); // fallback
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistically mark all read in UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setGlobalUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Failed to mark all as read:", error);
      fetchNotifications();
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel("notifications_listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) return <div className="notifications-page">Authenticating...</div>;
  if (loading) return <div className="notifications-page">Loading...</div>;

  return (
    <div className="notifications-page">
      <motion.div
        className="notifications-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="notifications-title">Alerts & Notifications</h1>
      </motion.div>

      <motion.div className="notifications-list">
        {notifications.length === 0 ? (
          <p className="no-notifications-text">
            You're all caught up — no new notifications.
          </p>
        ) : (
          notifications.map((n) => {
            const highlightColor =
              n.color === "gold"
                ? "#FFD700"
                : n.color === "crimson"
                ? "#DC143C"
                : "#55f";

            return (
              <motion.div
                key={n.id}
                className={`notification-item ${n.read ? "read" : "unread"}`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                onClick={() => markAsRead(n.id)}
                style={{
                  borderLeft: `5px solid ${highlightColor}`,
                }}
              >
                <div className="notification-content">
                  <FaBell size={22} color={highlightColor} />
                  <div>
                    <h4 style={{ color: highlightColor }}>{n.title}</h4>
                    <p style={{ color: "#aaa" }}>{n.message}</p>
                  </div>
                </div>
                {!n.read && (
                  <FaCheckCircle size={18} color={highlightColor} />
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>

      <motion.button
        className="mark-all-btn-fixed"
        onClick={markAllAsRead}
        disabled={unreadCount === 0}
        style={{
          opacity: unreadCount === 0 ? 0.4 : 1,
          cursor: unreadCount === 0 ? "not-allowed" : "pointer",
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Mark All as Read
      </motion.button>
    </div>
  );
};

export default Notifications;
