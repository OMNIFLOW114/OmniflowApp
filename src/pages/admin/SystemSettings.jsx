// src/pages/admin/SystemSettings.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { useDarkMode } from "@/context/DarkModeContext";
import { useNavigate } from "react-router-dom";
import {
  FiSettings,
  FiBell,
  FiUsers,
  FiGlobe,
  FiUser,
  FiTrash2,
  FiSend,
  FiMessageSquare,
  FiAlertTriangle,
  FiCheckCircle,
  FiSearch,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiBarChart2,
  FiSmartphone,
  FiRefreshCw,
  FiBriefcase,
  FiShoppingBag,
  FiTarget,
  FiCalendar,
  FiClock,
  FiZap,
  FiTrendingUp,
  FiAward,
  FiShield,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiLogOut,
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiCreditCard,
  FiDatabase,
  FiClipboard,
  FiUserPlus,
  FiFileText,
  FiDollarSign,
  FiWifi,
  FiWifiOff,
  FiExternalLink,
} from "react-icons/fi";
import { FaCrown, FaStore, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import "./SystemSettings.css";

// ===== PUSH NOTIFICATION HELPERS =====
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return "unsupported";
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) return "subscribed";
    if (Notification.permission === "denied") return "denied";
    return "not-subscribed";
  } catch (e) {
    return "not-subscribed";
  }
}

// ===== SKELETON LOADER =====
const SystemSettingsSkeleton = ({ darkMode }) => (
  <div className={`system-settings-root skeleton ${darkMode ? "dark" : ""}`}>
    <aside className="settings-sidebar" style={{ width: 260 }}>
      <div className="settings-sidebar-brand">
        <div className="sk-pulse" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div className="sk-pulse" style={{ width: 100, height: 16, marginLeft: 12 }} />
      </div>
      <div className="settings-sidebar-nav" style={{ padding: 12 }}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="sk-pulse" style={{ height: 36, marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
    </aside>
    <main className="settings-main-content">
      <div className="settings-topbar">
        <div>
          <div className="sk-pulse" style={{ width: 200, height: 22, borderRadius: 4 }} />
          <div className="sk-pulse" style={{ width: 260, height: 14, marginTop: 4, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
        </div>
      </div>
      <div className="settings-content">
        <div className="settings-stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="sk-card">
              <div className="sk-pulse" style={{ height: 90, borderRadius: 16 }} />
            </div>
          ))}
        </div>
        <div className="sk-pulse" style={{ height: 400, borderRadius: 16, marginTop: 24 }} />
      </div>
    </main>
  </div>
);

const SystemSettings = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [settings, setSettings] = useState([]);
  const [announcement, setAnnouncement] = useState({
    title: "",
    message: "",
    target: "global",
    userId: "",
    userType: "all",
    type: "info",
    priority: "medium",
    pushNotification: true,
    inAppNotification: true
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [stats, setStats] = useState({
    totalAnnouncements: 0,
    todayAnnouncements: 0,
    totalUsers: 0,
    totalSellers: 0,
    totalBuyers: 0,
    deliveryRate: 95
  });
  const [activeTab, setActiveTab] = useState("broadcast");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // ===== WEB PUSH STATE =====
  const [pushStatus, setPushStatus] = useState("loading");
  const [pushLoading, setPushLoading] = useState(false);
  const [webPush, setWebPush] = useState({
    title: "",
    body: "",
    url: "/",
  });
  const [sendingWebPush, setSendingWebPush] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  const adminSenderId = "a7e0653f-789d-408b-9a85-4d0db68b81ad";

  // Premium Templates
  const premiumTemplates = {
    urgent: [
      {
        id: 1,
        title: "Urgent System Maintenance",
        message: "Critical system maintenance required. Platform will be temporarily unavailable for 30 minutes starting at 2:00 AM UTC.",
        type: "urgent",
        category: "urgent"
      },
      {
        id: 2,
        title: "Security Alert - Action Required",
        message: "Important security update: Please change your password immediately and enable two-factor authentication for enhanced protection.",
        type: "urgent",
        category: "security"
      }
    ],
    promotional: [
      {
        id: 3,
        title: "Exclusive Seller Promotion",
        message: "Special limited-time offer for our valued sellers! Get 50% off on platform fees for the next 48 hours. Don't miss out!",
        type: "promo",
        category: "seller"
      },
      {
        id: 4,
        title: "Flash Sale Alert - Buyers",
        message: "Massive flash sale live now! Up to 70% off on premium products. Limited stock available. Shop now before it's gone!",
        type: "promo",
        category: "buyer"
      }
    ],
    features: [
      {
        id: 5,
        title: "New Feature Launch",
        message: "We're excited to introduce AI-powered product recommendations! Your customers will love personalized shopping experiences.",
        type: "info",
        category: "feature"
      },
      {
        id: 6,
        title: "Mobile App Update",
        message: "Our mobile app has been completely redesigned! Enjoy faster performance, new features, and enhanced security. Update now!",
        type: "info",
        category: "update"
      }
    ],
    welcome: [
      {
        id: 7,
        title: "Welcome to Our Platform",
        message: "Welcome aboard! We're thrilled to have you. Explore all features, connect with sellers/buyers, and start your journey with us.",
        type: "success",
        category: "welcome"
      }
    ]
  };

  const notificationTypes = {
    info: { color: "info", icon: <FiBell />, label: "Information" },
    warning: { color: "warning", icon: <FiAlertTriangle />, label: "Warning" },
    success: { color: "success", icon: <FiCheckCircle />, label: "Success" },
    urgent: { color: "danger", icon: <FiZap />, label: "Urgent" },
    promo: { color: "promo", icon: <FiAward />, label: "Promotional" }
  };

  const priorityLevels = {
    low: { color: "#6B7280", label: "Low" },
    medium: { color: "#F59E0B", label: "Medium" },
    high: { color: "#EF4444", label: "High" }
  };

  const userTypes = {
    all: { icon: <FiGlobe />, label: "All Users", color: "#6366F1" },
    sellers: { icon: <FiBriefcase />, label: "Sellers Only", color: "#10B981" },
    buyers: { icon: <FiShoppingBag />, label: "Buyers Only", color: "#8B5CF6" }
  };

  // Admin navigation modules
  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", path: "/admin-dashboard" },
    { icon: <FiUsers />, title: "Users", path: "/admin/users" },
    { icon: <FaStore />, title: "Stores", path: "/admin/stores" },
    { icon: <FiShoppingCart />, title: "Products", path: "/admin/products" },
    { icon: <FiPackage />, title: "Categories", path: "/admin/categories" },
    { icon: <FiMessageSquare />, title: "Messages", path: "/admin/messages" },
    { icon: <FiDollarSign />, title: "Finance", path: "/admin/finance" },
    { icon: <FiCreditCard />, title: "Wallets", path: "/admin/wallet" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports" },
    { icon: <FiUserPlus />, title: "Admins", path: "/admin/admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings" },
    { icon: <FiDatabase />, title: "Database", path: "/admin/database" },
  ];

  useEffect(() => {
    fetchInitialData();
    loadAdminData();
    initPush();
  }, []);

  useEffect(() => {
    if (userSearch) {
      const filtered = users.filter(user =>
        user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.id?.toLowerCase().includes(userSearch.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users.slice(0, 5));
    }
  }, [userSearch, users]);

  // ===== PUSH INIT =====
  const initPush = async () => {
    await registerServiceWorker();
    const status = await getPushSubscriptionStatus();
    setPushStatus(status);
    await fetchSubscriberCount();
  };

  const fetchSubscriberCount = async () => {
    try {
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });
      if (!error) setSubscriberCount(count || 0);
    } catch (e) {
      console.warn("Could not fetch subscriber count:", e);
    }
  };

  // ===== ADMIN PUSH TOGGLE =====
  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (!isPushSupported()) {
        toast.error("Push notifications not supported in this browser");
        return;
      }
      if (!VAPID_PUBLIC_KEY) {
        toast.error("VAPID public key not configured. Add VITE_VAPID_PUBLIC_KEY to your .env");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      if (pushStatus === "subscribed") {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
          }
        }
        setPushStatus("not-subscribed");
        toast.success("Push notifications disabled for this device");
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied");
          setPushStatus("denied");
          return;
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in");
          return;
        }
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            subscription: subscription.toJSON(),
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
        setPushStatus("subscribed");
        toast.success("Push notifications enabled for this device!");
      }
      await fetchSubscriberCount();
    } catch (error) {
      console.error("Push toggle error:", error);
      toast.error(error.message || "Failed to toggle push notifications");
    } finally {
      setPushLoading(false);
    }
  };

  // ===== SEND WEB PUSH TO ALL SUBSCRIBERS =====
  const handleSendWebPush = async () => {
    if (!webPush.title.trim() || !webPush.body.trim()) {
      toast.error("Please enter both a title and a message");
      return;
    }

    setSendingWebPush(true);
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          title: webPush.title,
          body: webPush.body,
          url: webPush.url || "/",
        },
      });

      if (error) throw error;

      if (data?.sent === 0) {
        toast.error("No subscribed devices found. Ask users to enable notifications first.");
      } else {
        toast.success(
          `Push sent! ✅ ${data.sent} delivered, ${data.failed || 0} failed (${data.total || 0} total)`
        );
      }

      setWebPush({ title: "", body: "", url: "/" });
      await fetchSubscriberCount();
    } catch (error) {
      console.error("Web push send error:", error);
      toast.error("Failed to send push: " + (error.message || "Unknown error"));
    } finally {
      setSendingWebPush(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("admin_users")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (data) setCurrentAdmin(data);
      }
    } catch (err) {
      console.warn("Could not load admin data:", err);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from("platform_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (settingsError) throw settingsError;
      setSettings(settingsData || []);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name, created_at, is_banned, push_notifications")
        .eq("is_banned", false)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("owner_id, name, is_active")
        .eq("is_active", true);

      if (storesError) throw storesError;
      setStores(storesData || []);

      const today = new Date().toISOString().split('T')[0];
      const todayAnnouncements = (settingsData || []).filter(s =>
        s.created_at && s.created_at.startsWith(today)
      ).length || 0;

      const sellerIds = new Set((storesData || []).map(store => store.owner_id));
      const totalSellers = sellerIds.size;
      const totalUsers = (usersData || []).length;
      const totalBuyers = totalUsers - totalSellers;

      setStats({
        totalAnnouncements: (settingsData || []).length || 0,
        todayAnnouncements,
        totalUsers,
        totalSellers,
        totalBuyers,
        deliveryRate: 95
      });

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load system data");
    } finally {
      setLoading(false);
    }
  };

  const getTargetUsers = async (target, userType, specificUserId = null) => {
    if (target === "user" && specificUserId) {
      const { data: userData } = await supabase
        .from("users")
        .select("id, push_notifications")
        .eq("id", specificUserId)
        .eq("is_banned", false)
        .single();
      return userData ? [userData] : [];
    }

    let query = supabase
      .from("users")
      .select("id, push_notifications")
      .eq("is_banned", false);

    if (userType !== "all") {
      const sellerIds = new Set(stores.map(store => store.owner_id));

      if (userType === "sellers") {
        const { data: sellers } = await query.in("id", Array.from(sellerIds));
        return sellers || [];
      } else if (userType === "buyers") {
        const { data: allUsers } = await query;
        const buyers = (allUsers || []).filter(user => !sellerIds.has(user.id));
        return buyers;
      }
    }

    const { data: allUsers } = await query;
    return allUsers || [];
  };

  const handleBroadcast = async () => {
    const { title, message, target, userId, userType, type, priority, pushNotification, inAppNotification } = announcement;

    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    if (target === "user" && !userId) {
      toast.error("Please select a user for specific message");
      return;
    }

    setSending(true);

    try {
      const targetUsers = await getTargetUsers(target, userType, userId);

      if (targetUsers.length === 0) {
        toast.error("No users found matching your criteria");
        return;
      }

      const { error: settingError } = await supabase
        .from("platform_settings")
        .insert({
          title,
          message,
          target_type: target,
          target_user_id: target === "user" ? userId : null,
          user_type: userType,
          notification_type: type,
          priority,
          push_enabled: pushNotification,
          in_app_enabled: inAppNotification,
          created_by: adminSenderId
        });

      if (settingError) throw settingError;

      const notifPayload = targetUsers.map(user => ({
        user_id: user.id,
        title,
        message,
        type: "announcement",
        color: notificationTypes[type]?.color || "info",
        sender_id: adminSenderId,
        read: false
      }));

      const { error: notifError } = await supabase.from("notifications").insert(notifPayload);
      if (notifError) throw notifError;

      // If push notification is enabled, also send via Web Push
      if (pushNotification && target === "global") {
        try {
          const { data, error } = await supabase.functions.invoke("send-notification", {
            body: { title, body: message, url: "/" },
          });
          if (error) {
            console.warn("Web push send failed (in-app still delivered):", error);
          } else if (data) {
            console.log(`Web push: ${data.sent} sent, ${data.failed} failed`);
          }
        } catch (pushErr) {
          console.warn("Web push error:", pushErr);
        }
      }

      const userTypeLabel = userTypes[userType]?.label || "Users";
      toast.success(
        target === "global"
          ? `Sent ${notifPayload.length} notifications to ${userTypeLabel}!`
          : "Message sent to user successfully!"
      );

      fetchInitialData();
      setAnnouncement({
        title: "",
        message: "",
        target: "global",
        userId: "",
        userType: "all",
        type: "info",
        priority: "medium",
        pushNotification: true,
        inAppNotification: true
      });
      setSelectedTemplate(null);

    } catch (error) {
      console.error("Broadcast error:", error);
      toast.error("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleUseTemplate = (template) => {
    setAnnouncement(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      type: template.type
    }));
    setSelectedTemplate(template.id);
    setActiveTab("broadcast");
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const { error } = await supabase.from("platform_settings").delete().eq("id", id);
      if (error) throw error;

      toast.success("Announcement deleted successfully");
      setSettings(prev => prev.filter(s => s.id !== id));
      setStats(prev => ({ ...prev, totalAnnouncements: prev.totalAnnouncements - 1 }));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/admin-auth", { replace: true });
    } catch (err) {
      navigate("/admin-auth", { replace: true });
    }
  };

  if (loading) {
    return <SystemSettingsSkeleton darkMode={darkMode} />;
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = {
    primary: isSuperAdmin ? "#F59E0B" : "#6366F1",
    badge: isSuperAdmin
      ? "linear-gradient(135deg,#F59E0B,#D97706)"
      : "linear-gradient(135deg,#6366F1,#4F46E5)"
  };

  const pushStatusLabel = {
    loading: "Checking...",
    unsupported: "Not Supported",
    denied: "Blocked",
    "not-subscribed": "Enable Notifications",
    subscribed: "Disable Notifications",
  };

  return (
    <div className={`system-settings-root ${darkMode ? "dark" : ""}`}>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`settings-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="settings-sidebar-brand">
          <div className="brand-logo" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
            {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">OmniFlow</div>
              <div className="brand-role">{isSuperAdmin ? "Super Admin" : "Admin Panel"}</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)}>
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="settings-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/settings" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary }}
              onClick={() => {
                navigate(module.path);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
            </button>
          ))}
        </nav>

        <div className="settings-sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="profile-name">{currentAdmin?.email?.split("@")[0] || "Admin"}</div>
                <div className="profile-role" style={{ color: rc.primary }}>{currentAdmin?.role?.replace("_", " ") || "Admin"}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut /> {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="settings-main-content">
        {/* Topbar */}
        <header className="settings-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <div>
              <div className="topbar-title">System Settings</div>
              <div className="topbar-sub">Manage announcements, notifications, and platform broadcasts</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="refresh-btn" onClick={fetchInitialData}>
              <FiRefreshCw /> Refresh
            </button>
            <button className="icon-btn theme-toggle" onClick={toggleDarkMode}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div className="role-chip">
              <div className="role-chip-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown style={{ fontSize: 10 }} /> : <FaShieldAlt style={{ fontSize: 10 }} />}
              </div>
              <div>
                <div className="role-chip-label" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase() || "ADMIN"}</div>
                <div className="role-chip-status">● Online</div>
              </div>
            </div>
          </div>
        </header>

        <div className="settings-content">
          {/* Web Push Status Banner */}
          <div className={`push-status-banner ${pushStatus === "subscribed" ? "active" : ""}`}>
            <div className="push-status-left">
              <div className={`push-status-icon ${pushStatus === "subscribed" ? "active" : ""}`}>
                {pushStatus === "subscribed" ? <FiWifi /> : <FiWifiOff />}
              </div>
              <div className="push-status-info">
                <div className="push-status-title">
                  Web Push Notifications
                  {pushStatus === "subscribed" && <span className="push-status-dot">●</span>}
                </div>
                <div className="push-status-sub">
                  {pushStatus === "subscribed"
                    ? `Enabled for this device · ${subscriberCount} total subscribers`
                    : pushStatus === "denied"
                    ? "Blocked in browser settings"
                    : pushStatus === "unsupported"
                    ? "Not supported in this browser"
                    : `Enable to receive test notifications · ${subscriberCount} subscribers`}
                </div>
              </div>
            </div>
            <button
              className={`push-toggle-btn ${pushStatus === "subscribed" ? "active" : ""}`}
              onClick={handleTogglePush}
              disabled={pushLoading || pushStatus === "unsupported" || pushStatus === "loading" || pushStatus === "denied"}
            >
              {pushLoading ? (
                <><FiRefreshCw className="spinning" /> Please wait...</>
              ) : (
                <>{pushStatusLabel[pushStatus] || "Enable"}</>
              )}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="settings-stats-grid">
            <div className="settings-stat-card">
              <div className="stat-icon" style={{ background: "rgba(99,102,241,0.12)", color: "#6366F1" }}>
                <FiBell />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.totalAnnouncements}</div>
                <div className="stat-label">Total Announcements</div>
              </div>
            </div>

            <div className="settings-stat-card">
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                <FiUsers />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.totalUsers}</div>
                <div className="stat-label">Total Users</div>
                <div className="stat-breakdown">
                  <span>{stats.totalSellers} sellers</span>
                  <span>{stats.totalBuyers} buyers</span>
                </div>
              </div>
            </div>

            <div className="settings-stat-card">
              <div className="stat-icon" style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
                <FiSmartphone />
              </div>
              <div className="stat-info">
                <div className="stat-value">{subscriberCount}</div>
                <div className="stat-label">Push Subscribers</div>
              </div>
            </div>

            <div className="settings-stat-card">
              <div className="stat-icon" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                <FiZap />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.todayAnnouncements}</div>
                <div className="stat-label">Sent Today</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="settings-tabs">
            {[
              { id: "broadcast", label: "Broadcast", icon: <FiSend /> },
              { id: "webpush", label: "Web Push", icon: <FiSmartphone /> },
              { id: "templates", label: "Templates", icon: <FiCopy /> },
              { id: "analytics", label: "Analytics", icon: <FiBarChart2 /> },
              { id: "scheduled", label: "Scheduled", icon: <FiCalendar /> }
            ].map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="settings-tab-content">
            {/* Broadcast Tab */}
            {activeTab === "broadcast" && (
              <div className="broadcast-layout">
                {/* Compose Panel */}
                <div className="compose-panel">
                  <div className="panel-header">
                    <h3>Compose Message</h3>
                    <button
                      className="preview-toggle"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? <FiEyeOff /> : <FiEye />}
                      {previewMode ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>

                  <div className="compose-form">
                    <div className="form-group">
                      <label>Message Title *</label>
                      <input
                        type="text"
                        placeholder="Enter a compelling title..."
                        value={announcement.title}
                        onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Message Content *</label>
                      <textarea
                        placeholder="Craft your message..."
                        value={announcement.message}
                        onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                        rows={6}
                        className="form-textarea"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Notification Type</label>
                        <select
                          value={announcement.type}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                          className="form-select"
                        >
                          {Object.entries(notificationTypes).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Priority Level</label>
                        <select
                          value={announcement.priority}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
                          className="form-select"
                        >
                          {Object.entries(priorityLevels).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="delivery-options">
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={announcement.pushNotification}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, pushNotification: e.target.checked }))}
                        />
                        <FiSmartphone />
                        <span>Push Notification</span>
                      </label>

                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={announcement.inAppNotification}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, inAppNotification: e.target.checked }))}
                        />
                        <FiBell />
                        <span>In-App Notification</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="actions-panel">
                  <div className="target-section">
                    <h4>Target Audience</h4>
                    <div className="target-options">
                      <label className="target-option">
                        <input
                          type="radio"
                          name="target"
                          value="global"
                          checked={announcement.target === "global"}
                          onChange={() => setAnnouncement(prev => ({ ...prev, target: "global", userId: "" }))}
                        />
                        <FiGlobe />
                        <div>
                          <div className="option-title">Global Broadcast</div>
                          <div className="option-desc">Send to all users</div>
                        </div>
                      </label>

                      <label className="target-option">
                        <input
                          type="radio"
                          name="target"
                          value="user"
                          checked={announcement.target === "user"}
                          onChange={() => setAnnouncement(prev => ({ ...prev, target: "user" }))}
                        />
                        <FiUser />
                        <div>
                          <div className="option-title">Specific User</div>
                          <div className="option-desc">Send to one user</div>
                        </div>
                      </label>
                    </div>

                    {announcement.target === "global" && (
                      <div className="user-type-selection">
                        <label>User Category</label>
                        <div className="user-type-options">
                          {Object.entries(userTypes).map(([key, config]) => (
                            <button
                              key={key}
                              className={`user-type-btn ${announcement.userType === key ? 'active' : ''}`}
                              onClick={() => setAnnouncement(prev => ({ ...prev, userType: key }))}
                            >
                              {config.icon}
                              {config.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {announcement.target === "user" && (
                      <div className="user-selection">
                        <div className="search-box">
                          <FiSearch />
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                        <div className="user-list">
                          {filteredUsers.slice(0, 5).map(user => (
                            <div
                              key={user.id}
                              className={`user-item ${announcement.userId === user.id ? 'selected' : ''}`}
                              onClick={() => setAnnouncement(prev => ({ ...prev, userId: user.id }))}
                            >
                              <div className="user-avatar"><FiUser /></div>
                              <div className="user-info">
                                <div className="user-name">{user.full_name || user.email}</div>
                                <div className="user-email">{user.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {previewMode && (
                    <div className="preview-section">
                      <h4>Message Preview</h4>
                      <div className="notification-preview">
                        <div className="preview-header">
                          <div className="preview-icon">
                            {notificationTypes[announcement.type]?.icon}
                          </div>
                          <div className="preview-title">
                            <strong>{announcement.title || "Your Title Here"}</strong>
                            <span className="priority-badge">
                              {priorityLevels[announcement.priority]?.label}
                            </span>
                          </div>
                        </div>
                        <div className="preview-content">
                          <p>{announcement.message || "Your message will appear here..."}</p>
                        </div>
                        <div className="preview-footer">
                          <span>Just now · {userTypes[announcement.userType]?.label}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    className="send-btn"
                    onClick={handleBroadcast}
                    disabled={sending || !announcement.title || !announcement.message}
                  >
                    {sending ? (
                      <>
                        <FiRefreshCw className="spinning" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend />
                        Broadcast Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Web Push Tab */}
            {activeTab === "webpush" && (
              <div className="webpush-layout">
                <div className="compose-panel">
                  <div className="panel-header">
                    <h3>
                      <FiSmartphone style={{ marginRight: 8 }} />
                      Send Web Push Notification
                    </h3>
                    <div className="push-info-badge">
                      {subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="webpush-info">
                    <FiAlertTriangle />
                    <div>
                      <strong>Browser push to all opted-in devices.</strong>
                      <span> Users must click "Enable Notifications" on their device first. Sent to {subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}.</span>
                    </div>
                  </div>

                  <div className="compose-form">
                    <div className="form-group">
                      <label>Notification Title *</label>
                      <input
                        type="text"
                        placeholder="e.g., Flash Sale Alert!"
                        value={webPush.title}
                        onChange={(e) => setWebPush(prev => ({ ...prev, title: e.target.value }))}
                        className="form-input"
                        maxLength={80}
                      />
                      <div className="field-hint">{webPush.title.length}/80 characters</div>
                    </div>

                    <div className="form-group">
                      <label>Notification Message *</label>
                      <textarea
                        placeholder="e.g., Up to 70% off on premium products. Limited stock — shop now!"
                        value={webPush.body}
                        onChange={(e) => setWebPush(prev => ({ ...prev, body: e.target.value }))}
                        rows={4}
                        className="form-textarea"
                        maxLength={200}
                      />
                      <div className="field-hint">{webPush.body.length}/200 characters</div>
                    </div>

                    <div className="form-group">
                      <label>Click-through URL</label>
                      <input
                        type="text"
                        placeholder="/deals or https://omniflowapp.co.ke/deals"
                        value={webPush.url}
                        onChange={(e) => setWebPush(prev => ({ ...prev, url: e.target.value }))}
                        className="form-input"
                      />
                      <div className="field-hint">Where users go when they tap the notification. Leave as "/" for home.</div>
                    </div>

                    {/* Live Preview */}
                    {(webPush.title || webPush.body) && (
                      <div className="webpush-preview">
                        <div className="webpush-preview-label">Live Preview</div>
                        <div className="webpush-card">
                          <div className="webpush-card-icon">
                            <FiBell />
                          </div>
                          <div className="webpush-card-body">
                            <div className="webpush-card-title">{webPush.title || "Notification Title"}</div>
                            <div className="webpush-card-text">{webPush.body || "Your message will appear here..."}</div>
                            <div className="webpush-card-url">
                              <FiExternalLink /> omniflowapp.co.ke{webPush.url && webPush.url !== "/" ? webPush.url : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      className="send-btn webpush-send-btn"
                      onClick={handleSendWebPush}
                      disabled={sendingWebPush || !webPush.title.trim() || !webPush.body.trim() || subscriberCount === 0}
                    >
                      {sendingWebPush ? (
                        <>
                          <FiRefreshCw className="spinning" />
                          Sending to {subscriberCount} device{subscriberCount !== 1 ? "s" : ""}...
                        </>
                      ) : (
                        <>
                          <FiSend />
                          Send Push to {subscriberCount} Subscriber{subscriberCount !== 1 ? "s" : ""}
                        </>
                      )}
                    </button>

                    {subscriberCount === 0 && (
                      <div className="webpush-empty-hint">
                        <FiWifiOff />
                        <span>No subscribers yet. Toggle the Web Push banner at the top of this page on your own device to test, then ask users to enable notifications.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === "templates" && (
              <div className="templates-container">
                <div className="templates-header">
                  <h2>Message Templates</h2>
                  <p>Choose from our professionally designed templates</p>
                </div>

                <div className="templates-grid">
                  {Object.entries(premiumTemplates).map(([category, templates]) => (
                    <div key={category} className="template-category">
                      <h3 className="category-title">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </h3>
                      <div className="template-cards">
                        {templates.map(template => (
                          <div
                            key={template.id}
                            className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                            onClick={() => handleUseTemplate(template)}
                          >
                            <div className="template-body">
                              <h4>{template.title}</h4>
                              <p>{template.message}</p>
                            </div>
                            <div className="template-footer">
                              <button
                                className="use-template-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUseTemplate(template);
                                }}
                              >
                                Use Template
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="placeholder-container">
                <div className="placeholder-icon"><FiBarChart2 /></div>
                <h3>Advanced Analytics</h3>
                <p>Real-time notification analytics and insights coming soon</p>
                <div className="placeholder-features">
                  <div className="feature-item">
                    <FiTrendingUp />
                    <span>Engagement Rate Tracking</span>
                  </div>
                  <div className="feature-item">
                    <FiUsers />
                    <span>User Segmentation Analysis</span>
                  </div>
                  <div className="feature-item">
                    <FiBarChart2 />
                    <span>Performance Metrics</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Tab */}
            {activeTab === "scheduled" && (
              <div className="placeholder-container">
                <div className="placeholder-icon"><FiCalendar /></div>
                <h3>Scheduled Announcements</h3>
                <p>Schedule your announcements for optimal delivery times</p>
                <div className="placeholder-features">
                  <div className="feature-item">
                    <FiClock />
                    <span>Time-based Scheduling</span>
                  </div>
                  <div className="feature-item">
                    <FiTarget />
                    <span>Smart Delivery Optimization</span>
                  </div>
                  <div className="feature-item">
                    <FiTrendingUp />
                    <span>Performance Analytics</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="recent-announcements">
            <div className="section-header">
              <div>
                <h3>Recent Announcements</h3>
                <p>Latest messages sent to your users</p>
              </div>
              <div className="header-stats">
                <span className="badge">{settings.length} total</span>
                <span className="badge badge-primary">{stats.todayAnnouncements} today</span>
              </div>
            </div>

            {settings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><FiMessageSquare /></div>
                <h4>No announcements yet</h4>
                <p>Create your first announcement to get started</p>
                <button className="create-first-btn" onClick={() => setActiveTab('broadcast')}>
                  Create First Announcement
                </button>
              </div>
            ) : (
              <div className="announcements-list">
                {settings.slice(0, 6).map((setting, index) => (
                  <div key={setting.id} className="announcement-item">
                    <div className="announcement-icon">
                      {notificationTypes[setting.notification_type]?.icon || <FiBell />}
                    </div>
                    <div className="announcement-content">
                      <div className="announcement-header">
                        <h4>{setting.title}</h4>
                        <span className="announcement-time">
                          {new Date(setting.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p>{setting.message}</p>
                      <div className="announcement-meta">
                        <span className="badge">
                          {setting.target_type === 'global' ? <FiGlobe /> : <FiUser />}
                          {setting.target_type}
                        </span>
                        <span className="badge">
                          {userTypes[setting.user_type]?.label || 'All Users'}
                        </span>
                        <span className="badge badge-priority">
                          {setting.priority}
                        </span>
                      </div>
                    </div>
                    <div className="announcement-actions">
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteAnnouncement(setting.id)}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SystemSettings;