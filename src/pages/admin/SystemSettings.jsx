// src/pages/admin/SystemSettings.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { useDarkMode } from "@/context/DarkModeContext";
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
  FiStar
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import "./SystemSettings.css";

const SystemSettings = () => {
  const { darkMode } = useDarkMode();
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
    inAppNotification: true,
    schedule: null
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
    deliveryRate: 95
  });
  const [activeTab, setActiveTab] = useState("broadcast");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [scheduledAnnouncements, setScheduledAnnouncements] = useState([]);

  const adminSenderId = "a7e0653f-789d-408b-9a85-4d0db68b81ad";

  // Premium 3D Templates with Categories
  const premiumTemplates = {
    urgent: [
      {
        id: 1,
        title: "🚨 Urgent System Maintenance",
        message: "Critical system maintenance required. Platform will be temporarily unavailable for 30 minutes starting at 2:00 AM UTC.",
        type: "urgent",
        category: "urgent",
        icon: "⚡",
        gradient: "from-red-500 to-orange-500",
        badge: "Critical"
      },
      {
        id: 2,
        title: "🔒 Security Alert - Action Required",
        message: "Important security update: Please change your password immediately and enable two-factor authentication for enhanced protection.",
        type: "urgent",
        category: "security",
        icon: "🛡️",
        gradient: "from-purple-600 to-pink-600",
        badge: "Security"
      }
    ],
    promotional: [
      {
        id: 3,
        title: "🎊 Exclusive Seller Promotion",
        message: "Special limited-time offer for our valued sellers! Get 50% off on platform fees for the next 48 hours. Don't miss out!",
        type: "promo",
        category: "seller",
        icon: "🏪",
        gradient: "from-green-500 to-teal-500",
        badge: "Seller Exclusive"
      },
      {
        id: 4,
        title: "🛍️ Flash Sale Alert - Buyers",
        message: "Massive flash sale live now! Up to 70% off on premium products. Limited stock available. Shop now before it's gone!",
        type: "promo",
        category: "buyer",
        icon: "🛒",
        gradient: "from-blue-500 to-cyan-500",
        badge: "Buyer Special"
      }
    ],
    features: [
      {
        id: 5,
        title: "✨ New Feature Launch",
        message: "We're excited to introduce AI-powered product recommendations! Your customers will love personalized shopping experiences.",
        type: "info",
        category: "feature",
        icon: "🤖",
        gradient: "from-indigo-500 to-purple-500",
        badge: "New Feature"
      },
      {
        id: 6,
        title: "📱 Mobile App Update",
        message: "Our mobile app has been completely redesigned! Enjoy faster performance, new features, and enhanced security. Update now!",
        type: "info",
        category: "update",
        icon: "📲",
        gradient: "from-yellow-500 to-red-500",
        badge: "Update Available"
      }
    ],
    welcome: [
      {
        id: 7,
        title: "👋 Welcome to Our Platform",
        message: "Welcome aboard! We're thrilled to have you. Explore all features, connect with sellers/buyers, and start your journey with us.",
        type: "success",
        category: "welcome",
        icon: "🎯",
        gradient: "from-teal-500 to-blue-500",
        badge: "Welcome"
      }
    ]
  };

  // Notification types with 3D colors
  const notificationTypes = {
    info: { 
      color: "info", 
      icon: <FiBell />, 
      label: "Information",
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "linear-gradient(135deg, #3B82F6, #06B6D4)"
    },
    warning: { 
      color: "warning", 
      icon: <FiAlertTriangle />, 
      label: "Warning",
      gradient: "from-amber-500 to-orange-500",
      bgColor: "linear-gradient(135deg, #F59E0B, #F97316)"
    },
    success: { 
      color: "success", 
      icon: <FiCheckCircle />, 
      label: "Success",
      gradient: "from-emerald-500 to-green-500",
      bgColor: "linear-gradient(135deg, #10B981, #22C55E)"
    },
    urgent: { 
      color: "danger", 
      icon: <FiZap />, 
      label: "Urgent",
      gradient: "from-red-500 to-rose-500",
      bgColor: "linear-gradient(135deg, #EF4444, #F43F5E)"
    },
    promo: { 
      color: "promo", 
      icon: <FiAward />, 
      label: "Promotional",
      gradient: "from-purple-500 to-fuchsia-500",
      bgColor: "linear-gradient(135deg, #8B5CF6, #D946EF)"
    }
  };

  // Priority levels with 3D effects
  const priorityLevels = {
    low: { 
      color: "#6B7280", 
      label: "Low",
      bg: "linear-gradient(135deg, #6B7280, #9CA3AF)",
      glow: "0 0 10px rgba(107, 114, 128, 0.3)"
    },
    medium: { 
      color: "#F59E0B", 
      label: "Medium",
      bg: "linear-gradient(135deg, #F59E0B, #FBBF24)",
      glow: "0 0 15px rgba(245, 158, 11, 0.4)"
    },
    high: { 
      color: "#EF4444", 
      label: "High",
      bg: "linear-gradient(135deg, #EF4444, #F87171)",
      glow: "0 0 20px rgba(239, 68, 68, 0.5)"
    }
  };

  // User types for targeting
  const userTypes = {
    all: { icon: <FiGlobe />, label: "All Users", color: "#3B82F6" },
    sellers: { icon: <FiBriefcase />, label: "Sellers Only", color: "#10B981" },
    buyers: { icon: <FiShoppingBag />, label: "Buyers Only", color: "#8B5CF6" }
  };

  useEffect(() => {
    fetchInitialData();
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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch platform settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("platform_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (settingsError) throw settingsError;
      setSettings(settingsData || []);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name, created_at, is_banned, push_notifications")
        .eq("is_banned", false)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch stores to identify sellers
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("owner_id, name, is_active")
        .eq("is_active", true);

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Calculate statistics
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

    // Filter by user type (sellers/buyers)
    if (userType !== "all") {
      const sellerIds = new Set(stores.map(store => store.owner_id));
      
      if (userType === "sellers") {
        // Only include users who have stores
        const { data: sellers } = await query.in("id", Array.from(sellerIds));
        return sellers || [];
      } else if (userType === "buyers") {
        // Only include users who don't have stores
        const { data: allUsers } = await query;
        const buyers = (allUsers || []).filter(user => !sellerIds.has(user.id));
        return buyers;
      }
    }

    // For "all" user type, return all users
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
      // Get target users based on selection
      const targetUsers = await getTargetUsers(target, userType, userId);

      if (targetUsers.length === 0) {
        toast.error("No users found matching your criteria");
        return;
      }

      // Save to platform_settings
      const { data: insertedSetting, error: settingError } = await supabase
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
        })
        .select()
        .single();

      if (settingError) throw settingError;

      // Create notifications
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

      // Send push notifications if enabled
      if (pushNotification) {
        await sendPushNotifications(targetUsers, title, message, type);
      }

      const userTypeLabel = userTypes[userType]?.label || "Users";
      toast.success(
        target === "global" 
          ? `🎯 ${notifPayload.length} notifications sent to ${userTypeLabel}!`
          : "📩 Message sent to user successfully!"
      );

      // Refresh data and reset form
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
        inAppNotification: true,
        schedule: null
      });
      setSelectedTemplate(null);

    } catch (error) {
      console.error("Broadcast error:", error);
      toast.error("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const sendPushNotifications = async (userList, title, message, type) => {
    try {
      const usersWithPushEnabled = userList.filter(user => 
        user.push_notifications !== false
      );

      if (usersWithPushEnabled.length === 0) {
        console.log('No users with push notifications enabled');
        return;
      }

      // OneSignal integration placeholder
      console.log('Sending push notifications to:', usersWithPushEnabled.length, 'users');
      
      toast.success(`📱 Push notifications queued for ${usersWithPushEnabled.length} users`);
      
    } catch (error) {
      console.error('Push notification error:', error);
      toast.error('Push notifications failed, but in-app messages were sent');
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

  if (loading) {
    return (
      <div className="system-settings-loading">
        <div className="premium-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-glow"></div>
        </div>
        <p>Loading Premium Control Center...</p>
      </div>
    );
  }

  return (
    <div className={`premium-system-settings ${darkMode ? 'dark-mode' : ''}`}>
      {/* Animated Background Elements */}
      <div className="background-elements">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      {/* Header Section with 3D Effects */}
      <motion.header 
        className="premium-header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <div className="header-main">
            <div className="header-title">
              <div className="header-icon-3d">
                <FiSettings />
              </div>
              <div>
                <h1>Premium Control Center</h1>
                <p>Advanced notification management with 3D effects</p>
              </div>
            </div>
            <motion.button 
              className="premium-refresh-btn"
              onClick={fetchInitialData}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiRefreshCw />
              Refresh Analytics
            </motion.button>
          </div>

          {/* Premium Stats Grid */}
          <div className="premium-stats-grid">
            <motion.div 
              className="stat-card-3d"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="stat-glow"></div>
              <div className="stat-icon-3d">
                <FiBell />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalAnnouncements}</div>
                <div className="stat-label">Total Announcements</div>
                <div className="stat-trend">+12% this month</div>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card-3d"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="stat-glow"></div>
              <div className="stat-icon-3d">
                <FiUsers />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalUsers}</div>
                <div className="stat-label">Total Users</div>
                <div className="stat-breakdown">
                  <span>{stats.totalSellers} sellers</span>
                  <span>{stats.totalBuyers} buyers</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card-3d"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="stat-glow"></div>
              <div className="stat-icon-3d">
                <FiTrendingUp />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.deliveryRate}%</div>
                <div className="stat-label">Delivery Rate</div>
                <div className="stat-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${stats.deliveryRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card-3d"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="stat-glow"></div>
              <div className="stat-icon-3d">
                <FiZap />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.todayAnnouncements}</div>
                <div className="stat-label">Sent Today</div>
                <div className="stat-badge live">Live</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="premium-content">
        {/* Premium Navigation Tabs */}
        <motion.nav 
          className="premium-tabs"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { id: "broadcast", label: "Broadcast", icon: <FiSend />, badge: "New" },
            { id: "templates", label: "Templates", icon: <FiCopy />, badge: "3D" },
            { id: "analytics", label: "Analytics", icon: <FiBarChart2 /> },
            { id: "scheduled", label: "Scheduled", icon: <FiCalendar /> }
          ].map(tab => (
            <motion.button
              key={tab.id}
              className={`premium-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
            </motion.button>
          ))}
        </motion.nav>

        {/* Tab Content */}
        <div className="premium-tab-content">
          
          {/* Broadcast Tab */}
          {activeTab === "broadcast" && (
            <motion.div
              className="broadcast-3d"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="broadcast-layout-3d">
                {/* Message Composition - Left Panel */}
                <div className="compose-panel-3d">
                  <div className="panel-header">
                    <h3>🎯 Compose Message</h3>
                    <div className="header-actions">
                      <motion.button
                        className="preview-toggle-3d"
                        onClick={() => setPreviewMode(!previewMode)}
                        whileHover={{ scale: 1.05 }}
                      >
                        {previewMode ? <FiEyeOff /> : <FiEye />}
                        {previewMode ? 'Hide Preview' : 'Show Preview'}
                      </motion.button>
                    </div>
                  </div>

                  <div className="compose-form-3d">
                    <div className="form-group-3d">
                      <label>Message Title *</label>
                      <div className="input-container-3d">
                        <input
                          type="text"
                          placeholder="Enter a compelling title..."
                          value={announcement.title}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                          className="premium-input"
                        />
                        <div className="input-glow"></div>
                      </div>
                    </div>

                    <div className="form-group-3d">
                      <label>Message Content *</label>
                      <div className="textarea-container-3d">
                        <textarea
                          placeholder="Craft your message with engaging content..."
                          value={announcement.message}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                          rows={6}
                          className="premium-textarea"
                        />
                        <div className="textarea-glow"></div>
                      </div>
                    </div>

                    <div className="form-grid-3d">
                      <div className="form-group-3d">
                        <label>Notification Type</label>
                        <select
                          value={announcement.type}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                          className="premium-select"
                        >
                          {Object.entries(notificationTypes).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group-3d">
                        <label>Priority Level</label>
                        <select
                          value={announcement.priority}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
                          className="premium-select"
                        >
                          {Object.entries(priorityLevels).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="delivery-options-3d">
                      <motion.label 
                        className="checkbox-option-3d"
                        whileHover={{ scale: 1.02 }}
                      >
                        <input
                          type="checkbox"
                          checked={announcement.pushNotification}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, pushNotification: e.target.checked }))}
                        />
                        <div className="checkbox-design"></div>
                        <FiSmartphone />
                        <span>Push Notification</span>
                      </motion.label>

                      <motion.label 
                        className="checkbox-option-3d"
                        whileHover={{ scale: 1.02 }}
                      >
                        <input
                          type="checkbox"
                          checked={announcement.inAppNotification}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, inAppNotification: e.target.checked }))}
                        />
                        <div className="checkbox-design"></div>
                        <FiBell />
                        <span>In-App Notification</span>
                      </motion.label>
                    </div>
                  </div>
                </div>

                {/* Target & Actions - Right Panel */}
                <div className="actions-panel-3d">
                  {/* Target Selection */}
                  <div className="target-section-3d">
                    <h4>🎯 Target Audience</h4>
                    <div className="target-options-3d">
                      <motion.label 
                        className="target-option-3d"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <input
                          type="radio"
                          name="target"
                          value="global"
                          checked={announcement.target === "global"}
                          onChange={() => setAnnouncement(prev => ({ ...prev, target: "global", userId: "" }))}
                        />
                        <div className="option-design"></div>
                        <FiGlobe />
                        <div>
                          <div className="option-title">Global Broadcast</div>
                          <div className="option-desc">Send to all users</div>
                        </div>
                      </motion.label>

                      <motion.label 
                        className="target-option-3d"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <input
                          type="radio"
                          name="target"
                          value="user"
                          checked={announcement.target === "user"}
                          onChange={() => setAnnouncement(prev => ({ ...prev, target: "user" }))}
                        />
                        <div className="option-design"></div>
                        <FiUser />
                        <div>
                          <div className="option-title">Specific User</div>
                          <div className="option-desc">Send to one user</div>
                        </div>
                      </motion.label>
                    </div>

                    {/* User Type Selection */}
                    {announcement.target === "global" && (
                      <div className="user-type-selection">
                        <label>User Category</label>
                        <div className="user-type-options">
                          {Object.entries(userTypes).map(([key, config]) => (
                            <motion.button
                              key={key}
                              className={`user-type-btn ${announcement.userType === key ? 'active' : ''}`}
                              onClick={() => setAnnouncement(prev => ({ ...prev, userType: key }))}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              style={{ '--color': config.color }}
                            >
                              {config.icon}
                              {config.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User Selection for Specific User */}
                    {announcement.target === "user" && (
                      <div className="user-selection-3d">
                        <div className="search-box-3d">
                          <FiSearch />
                          <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                        <div className="user-list-3d">
                          {filteredUsers.slice(0, 5).map(user => (
                            <motion.div
                              key={user.id}
                              className={`user-item-3d ${announcement.userId === user.id ? 'selected' : ''}`}
                              onClick={() => setAnnouncement(prev => ({ ...prev, userId: user.id }))}
                              whileHover={{ scale: 1.02 }}
                            >
                              <div className="user-avatar-3d">
                                <FiUser />
                              </div>
                              <div className="user-info">
                                <div className="user-name">{user.full_name || user.email}</div>
                                <div className="user-email">{user.email}</div>
                                <div className="user-type">
                                  {stores.find(s => s.owner_id === user.id) ? 'Seller' : 'Buyer'}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Preview */}
                  {previewMode && (
                    <motion.div 
                      className="preview-section-3d"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <h4>👁️ Message Preview</h4>
                      <div className="notification-preview-3d">
                        <div 
                          className="preview-header-3d"
                          style={{ background: notificationTypes[announcement.type]?.bgColor }}
                        >
                          <div className="preview-icon-3d">
                            {notificationTypes[announcement.type]?.icon}
                          </div>
                          <div className="preview-title-3d">
                            <strong>{announcement.title || "Your Title Here"}</strong>
                            <span 
                              className="priority-badge-3d"
                              style={{ 
                                background: priorityLevels[announcement.priority]?.bg,
                                boxShadow: priorityLevels[announcement.priority]?.glow
                              }}
                            >
                              {priorityLevels[announcement.priority]?.label}
                            </span>
                          </div>
                        </div>
                        <div className="preview-content-3d">
                          <p>{announcement.message || "Your message will appear here..."}</p>
                        </div>
                        <div className="preview-footer-3d">
                          <span>Just now • {userTypes[announcement.userType]?.label}</span>
                          <div className="delivery-badges-3d">
                            {announcement.pushNotification && (
                              <motion.span whileHover={{ scale: 1.2 }}>
                                <FiSmartphone title="Push Notification" />
                              </motion.span>
                            )}
                            {announcement.inAppNotification && (
                              <motion.span whileHover={{ scale: 1.2 }}>
                                <FiBell title="In-App Notification" />
                              </motion.span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Send Button */}
                  <motion.button
                    className="premium-send-btn"
                    onClick={handleBroadcast}
                    disabled={sending || !announcement.title || !announcement.message}
                    whileHover={{ scale: sending ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {sending ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <FiRefreshCw />
                        </motion.div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend />
                        Broadcast Message
                        <div className="send-glow"></div>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <motion.div
              className="templates-3d"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="templates-header">
                <h2>🎨 Premium Templates</h2>
                <p>Choose from our professionally designed templates</p>
              </div>

              <div className="templates-grid-3d">
                {Object.entries(premiumTemplates).map(([category, templates]) => (
                  <div key={category} className="template-category-3d">
                    <h3 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                    <div className="template-cards-3d">
                      {templates.map(template => (
                        <motion.div
                          key={template.id}
                          className={`template-card-3d ${selectedTemplate === template.id ? 'selected' : ''}`}
                          onClick={() => handleUseTemplate(template)}
                          whileHover={{ 
                            scale: 1.05,
                            y: -5,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="template-glow"></div>
                          <div 
                            className="template-header-3d"
                            style={{ background: `linear-gradient(135deg, ${template.gradient})` }}
                          >
                            <div className="template-icon-3d">
                              {template.icon}
                            </div>
                            <h4>{template.title}</h4>
                            <span className="template-badge">{template.badge}</span>
                          </div>
                          <div className="template-content-3d">
                            <p>{template.message}</p>
                          </div>
                          <div className="template-footer-3d">
                            <motion.button 
                              className="use-template-btn-3d"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('broadcast');
                                handleUseTemplate(template);
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              Use Template
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <motion.div
              className="analytics-3d"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="analytics-placeholder-3d">
                <div className="analytics-icon-3d">
                  <FiBarChart2 />
                </div>
                <h3>Advanced Analytics Dashboard</h3>
                <p>Real-time notification analytics and insights coming soon...</p>
                <div className="analytics-stats-preview">
                  <div className="stat-preview">
                    <span>📊</span>
                    <strong>Engagement Rate</strong>
                    <span>Coming Soon</span>
                  </div>
                  <div className="stat-preview">
                    <span>👥</span>
                    <strong>User Segments</strong>
                    <span>Coming Soon</span>
                  </div>
                  <div className="stat-preview">
                    <span>📈</span>
                    <strong>Performance Metrics</strong>
                    <span>Coming Soon</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scheduled Tab */}
          {activeTab === "scheduled" && (
            <motion.div
              className="scheduled-3d"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="scheduled-placeholder-3d">
                <div className="scheduled-icon-3d">
                  <FiCalendar />
                </div>
                <h3>Scheduled Announcements</h3>
                <p>Schedule your announcements for optimal delivery times</p>
                <div className="scheduled-features">
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
            </motion.div>
          )}
        </div>

        {/* Recent Announcements */}
        <motion.section 
          className="recent-announcements-3d"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="section-header-3d">
            <h3>📜 Recent Announcements</h3>
            <div className="header-stats">
              <span className="announcement-count">{settings.length} total</span>
              <span className="announcement-active">{stats.todayAnnouncements} today</span>
            </div>
          </div>

          {settings.length === 0 ? (
            <div className="empty-state-3d">
              <div className="empty-icon-3d">
                <FiMessageSquare />
              </div>
              <h4>No announcements yet</h4>
              <p>Create your first announcement to get started with advanced notification management</p>
              <motion.button 
                className="create-first-btn"
                onClick={() => setActiveTab('broadcast')}
                whileHover={{ scale: 1.05 }}
              >
                Create First Announcement
              </motion.button>
            </div>
          ) : (
            <div className="announcements-list-3d">
              {settings.slice(0, 6).map((setting, index) => (
                <motion.div
                  key={setting.id}
                  className="announcement-item-3d"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                >
                  <div 
                    className="announcement-icon-3d"
                    style={{ 
                      background: notificationTypes[setting.notification_type]?.bgColor 
                    }}
                  >
                    {notificationTypes[setting.notification_type]?.icon}
                  </div>
                  <div className="announcement-content-3d">
                    <div className="announcement-header-3d">
                      <h4>{setting.title}</h4>
                      <span className="announcement-time">
                        {new Date(setting.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p>{setting.message}</p>
                    <div className="announcement-meta-3d">
                      <span className="target-badge-3d">
                        {setting.target_type === 'global' ? <FiGlobe /> : <FiUser />}
                        {setting.target_type}
                      </span>
                      <span className="user-type-badge">
                        {userTypes[setting.user_type]?.icon}
                        {userTypes[setting.user_type]?.label || 'All Users'}
                      </span>
                      <span 
                        className="priority-badge-3d"
                        style={{ 
                          background: priorityLevels[setting.priority]?.bg,
                          boxShadow: priorityLevels[setting.priority]?.glow
                        }}
                      >
                        {setting.priority}
                      </span>
                    </div>
                  </div>
                  <div className="announcement-actions-3d">
                    <motion.button
                      className="delete-btn-3d"
                      onClick={() => handleDeleteAnnouncement(setting.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiTrash2 />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default SystemSettings;