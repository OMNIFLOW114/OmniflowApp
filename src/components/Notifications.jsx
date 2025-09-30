import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/supabase";
import { FaBell, FaCheckCircle, FaTrash, FaSearch, FaFilter } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import "./Notifications.css";

const Notifications = () => {
  const { user } = useAuth();
  const { setGlobalUnreadCount } = useNotificationBadge();
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [loading, setLoading] = useState(true);

  // Time ago function
  const timeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = {};
    const filteredNotifs = notifications
      .filter(n => {
        if (filter === "unread") return !n.read;
        if (filter === "read") return n.read;
        return true;
      })
      .filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );

    filteredNotifs.forEach(n => {
      const date = new Date(n.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    });

    return groups;
  }, [notifications, searchQuery, filter]);

  // Insert welcome notifications
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
        message: "Tap into power. Explore OmniCash, OmniHub & unlock your potential.",
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
        .order("created_at", { ascending: false })
        .limit(100); // Limit for performance

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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setGlobalUnreadCount(prev => prev - 1);

    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setGlobalUnreadCount(0);

    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

  const clearAll = async () => {
    setNotifications([]);
    setGlobalUnreadCount(0);
    await supabase.from("notifications").delete().eq("user_id", user.id);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel("notifications")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, fetchNotifications)
        .subscribe();

      return () => channel.unsubscribe();
    }
  }, [user]);

  if (loading) return <div className="notifications-loading">Loading notifications...</div>;

  return (
    <div className="notifications-container">
      <header className="notifications-header">
        <h1>Notifications</h1>
        <div className="header-controls">
          <div className="search-bar">
            <FaSearch />
            <input 
              type="text" 
              placeholder="Search notifications..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
            <button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>Unread</button>
            <button className={filter === "read" ? "active" : ""} onClick={() => setFilter("read")}>Read</button>
          </div>
        </div>
      </header>

      <main className="notifications-main">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="no-notifications">
            <FaBell size={80} />
            <h2>No Notifications</h2>
            <p>You're all caught up. Check back later!</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]) => (
            <section key={date} className="notification-group">
              <h3>{date === new Date().toLocaleDateString() ? "Today" : date}</h3>
              <AnimatePresence>
                {notifs.map(n => (
                  <motion.div
                    key={n.id}
                    className={`notification-card ${n.read ? "read" : ""}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="notification-icon" style={{ backgroundColor: n.color === "gold" ? "#FFD70033" : n.color === "crimson" ? "#DC143C33" : "#007bff33" }}>
                      <FaBell />
                    </div>
                    <div className="notification-details">
                      <h4>{n.title}</h4>
                      <p>{n.message}</p>
                      <span className="time">{timeAgo(n.created_at)}</span>
                    </div>
                    <div className="notification-actions">
                      {!n.read && <button onClick={() => markAsRead(n.id)}><FaCheckCircle /></button>}
                      <button onClick={() => deleteNotification(n.id)}><FaTrash /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </section>
          ))
        )}
      </main>

      <footer className="notifications-footer">
        <button onClick={markAllAsRead} disabled={!notifications.some(n => !n.read)}>Mark All as Read</button>
        <button onClick={clearAll} disabled={!notifications.length}>Clear All</button>
      </footer>
    </div>
  );
};

export default Notifications;