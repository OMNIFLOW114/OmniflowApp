// src/pages/admin/UserManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import {
  FiUsers, FiSettings, FiBriefcase, FiMessageSquare,
  FiStar, FiShoppingCart, FiDollarSign, FiMenu, FiX, FiClipboard,
  FiUserPlus, FiActivity, FiTrendingUp, FiAlertTriangle, FiCheckCircle,
  FiSearch, FiBell, FiLogOut, FiUser, FiAward, FiPackage, FiCreditCard,
  FiFileText, FiDatabase, FiHome, FiShield, FiChevronLeft, FiChevronRight,
  FiTrendingDown, FiRefreshCw, FiEye, FiDownload, FiAlertCircle,
  FiMail, FiPhone, FiMapPin, FiBox, FiClock
} from "react-icons/fi";
import { FaCrown, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import "./UserManagement.css";

// ─── SKELETON COMPONENT ──────────────────────────────────────────────────────
const UserManagementSkeleton = ({ darkMode }) => (
  <div className={`user-mgmt-root skeleton ${darkMode ? "dark" : ""}`}>
    <aside className="user-sidebar" style={{ width: 260 }}>
      <div className="user-sidebar-brand">
        <div className="sk-pulse" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div className="sk-pulse" style={{ width: 100, height: 16, marginLeft: 12 }} />
      </div>
      <div className="user-sidebar-nav" style={{ padding: 12 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="sk-pulse" style={{ height: 36, marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
      <div className="user-sidebar-footer">
        <div className="sk-pulse" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />
        <div className="sk-pulse" style={{ height: 36, borderRadius: 8 }} />
      </div>
    </aside>
    <main className="user-main-content">
      <div className="user-topbar">
        <div className="topbar-left">
          <div className="sk-pulse" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div>
            <div className="sk-pulse" style={{ width: 120, height: 20, borderRadius: 4 }} />
            <div className="sk-pulse" style={{ width: 160, height: 14, marginTop: 4, borderRadius: 4 }} />
          </div>
        </div>
        <div className="topbar-right">
          <div className="sk-pulse" style={{ width: 160, height: 36, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 80, height: 36, borderRadius: 8 }} />
        </div>
      </div>
      <div className="user-content">
        <div className="filter-bar">
          <div className="sk-pulse" style={{ width: 180, height: 40, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 120, height: 40, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 100, height: 40, borderRadius: 8 }} />
        </div>
        <div className="users-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="user-card sk-card">
              <div className="user-card-header">
                <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
                <div className="user-info">
                  <div className="sk-pulse" style={{ width: 140, height: 18, borderRadius: 4 }} />
                  <div className="sk-pulse" style={{ width: 100, height: 14, marginTop: 4, borderRadius: 4 }} />
                </div>
                <div className="sk-pulse" style={{ width: 80, height: 24, borderRadius: 12, marginLeft: 'auto' }} />
              </div>
              <div className="user-details">
                <div className="sk-pulse" style={{ width: "60%", height: 14, borderRadius: 4, marginBottom: 8 }} />
                <div className="sk-pulse" style={{ width: "40%", height: 14, borderRadius: 4, marginBottom: 8 }} />
                <div className="sk-pulse" style={{ width: "50%", height: 14, borderRadius: 4 }} />
              </div>
              <div className="user-actions">
                <div className="sk-pulse" style={{ width: 70, height: 32, borderRadius: 6 }} />
                <div className="sk-pulse" style={{ width: 70, height: 32, borderRadius: 6 }} />
                <div className="sk-pulse" style={{ width: 70, height: 32, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="pagination">
          <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 60, height: 20, borderRadius: 4 }} />
          <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
        </div>
      </div>
    </main>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const UserManagement = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Data State
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    premium: 0,
    verified: 0,
    banned: 0
  });

  const ITEMS_PER_PAGE = 12;
  const subscriptionRef = useRef(null);

  // ─── Role Colors ──────────────────────────────────────────────────────────
  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)" },
    admin: { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)" },
    moderator: { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)" },
    support: { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)" },
  };

  const getRoleColor = (role) => roleColors[role] || roleColors.moderator;

  // ─── Load Admin Data ──────────────────────────────────────────────────────
  const loadAdminData = useCallback(async () => {
    if (!user) return false;
    try {
      let { data: adminData } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!adminData) {
        const { data: adminByEmail } = await supabase
          .from("admin_users")
          .select("*")
          .eq("email", user.email)
          .eq("is_active", true)
          .maybeSingle();
        if (adminByEmail) {
          adminData = adminByEmail;
          if (!adminByEmail.user_id) {
            await supabase
              .from("admin_users")
              .update({ user_id: user.id })
              .eq("id", adminByEmail.id);
          }
        }
      }

      if (adminData) {
        setCurrentAdmin(adminData);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error loading admin data:", err);
      return false;
    }
  }, [user]);

  // ─── Fetch Users ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!currentAdmin) return;

    setLoading(true);
    try {
      let query = supabase.from("users").select("*", { count: "exact" });

      // Search filter
      if (searchQuery) {
        query = query.or(
          `email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        );
      }

      // Role filter (is_premium)
      if (filterRole === "premium") {
        query = query.eq("is_premium", true);
      } else if (filterRole === "non-premium") {
        query = query.eq("is_premium", false);
      }

      // Status filter
      if (filterStatus === "banned") {
        query = query.eq("is_banned", true);
      } else if (filterStatus === "active") {
        query = query.eq("is_banned", false);
      } else if (filterStatus === "verified") {
        query = query.eq("confirmed", true);
      } else if (filterStatus === "unverified") {
        query = query.eq("confirmed", false);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalUsers(count || 0);

      // Calculate stats
      const { data: allUsers } = await supabase
        .from("users")
        .select("is_premium, is_banned, confirmed");
      
      if (allUsers) {
        setStats({
          total: allUsers.length,
          premium: allUsers.filter(u => u.is_premium).length,
          verified: allUsers.filter(u => u.confirmed).length,
          banned: allUsers.filter(u => u.is_banned).length
        });
      }

      setHasError(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setHasError(true);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [currentAdmin, searchQuery, filterRole, filterStatus, currentPage]);

  // ─── Toggle User Ban ──────────────────────────────────────────────────────
  const toggleBan = async (userId, currentStatus) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_banned: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_banned: !currentStatus } : u
      ));
      
      toast.success(`User ${currentStatus ? "unbanned" : "banned"} successfully!`);
    } catch (err) {
      console.error("Error toggling ban:", err);
      toast.error("Failed to update user status");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ─── Toggle Premium ──────────────────────────────────────────────────────
  const togglePremium = async (userId, currentStatus) => {
    setActionLoading(prev => ({ ...prev, [`premium_${userId}`]: true }));
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_premium: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_premium: !currentStatus } : u
      ));
      
      toast.success(`Premium ${currentStatus ? "revoked" : "granted"} successfully!`);
    } catch (err) {
      console.error("Error toggling premium:", err);
      toast.error("Failed to update premium status");
    } finally {
      setActionLoading(prev => ({ ...prev, [`premium_${userId}`]: false }));
    }
  };

  // ─── Toggle Store Creation ──────────────────────────────────────────────
  const toggleStoreAccess = async (userId, currentStatus) => {
    setActionLoading(prev => ({ ...prev, [`store_${userId}`]: true }));
    try {
      const { error } = await supabase
        .from("users")
        .update({ can_create_store: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, can_create_store: !currentStatus } : u
      ));
      
      toast.success(`Store access ${currentStatus ? "revoked" : "granted"} successfully!`);
    } catch (err) {
      console.error("Error toggling store access:", err);
      toast.error("Failed to update store access");
    } finally {
      setActionLoading(prev => ({ ...prev, [`store_${userId}`]: false }));
    }
  };

  // ─── Fetch Notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("admin_notifications")
        .select("id, title, message, created_at, is_read")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      const formatted = (data || []).map(n => ({
        id: n.id,
        message: n.message || n.title,
        time: new Date(n.created_at).toLocaleTimeString(),
        type: "admin"
      }));

      setNotifications(formatted);
    } catch (err) {
      console.warn("Could not fetch notifications:", err);
    }
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/admin-auth", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/admin-auth", { replace: true });
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  
  // Initialize
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const adminLoaded = await loadAdminData();
      if (!adminLoaded || !isMounted) {
        setLoading(false);
        return;
      }
      await fetchUsers();
      await fetchNotifications();

      try {
        subscriptionRef.current = supabase.channel("user-updates")
          .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
            if (isMounted) fetchUsers();
          })
          .subscribe();
      } catch (err) {
        console.warn("Subscription error:", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []); // Runs once on mount

  // Fetch users when filters change
  useEffect(() => {
    if (currentAdmin) {
      fetchUsers();
    }
  }, [searchQuery, filterRole, filterStatus, currentPage, fetchUsers]);

  // Online/Offline handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Back online – refreshing data");
      fetchUsers();
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You are offline. Showing cached data.");
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchUsers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector(".search-bar input")?.focus();
      }
      if (e.key === "Escape") {
        setShowNotifications(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Render Helpers ──────────────────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return <UserManagementSkeleton darkMode={darkMode} />;
  }

  // ─── Admin Navigation ────────────────────────────────────────────────────
  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", path: "/admin-dashboard" },
    { icon: <FiUsers />, title: "Users", path: "/admin/users" },
    { icon: <FiBriefcase />, title: "Stores", path: "/admin/stores" },
    { icon: <FiShoppingCart />, title: "Products", path: "/admin/products" },
    { icon: <FiMessageSquare />, title: "Messages", path: "/admin/messages" },
    { icon: <FiDollarSign />, title: "Finance", path: "/admin/finance" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports" },
    { icon: <FiUserPlus />, title: "Admins", path: "/admin/admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings" },
  ];

  const rc = getRoleColor(currentAdmin?.role);
  const isSuperAdmin = currentAdmin?.role === "super_admin";

  return (
    <div className={`user-mgmt-root${darkMode ? " dark" : ""}`}>
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

      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className={`user-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="user-sidebar-brand">
          <div className="brand-logo" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
            {isSuperAdmin ? <FaCrown /> : <FiShield />}
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">OmniFlow</div>
              <div className="brand-role">{isSuperAdmin ? "Super Admin" : currentAdmin?.role?.replace(/_/g, " ") || "Admin"}</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)}>
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="user-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(m => (
            <button
              key={m.path}
              className={`nav-item${location.pathname === m.path ? " active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => {
                navigate(m.path);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? m.title : undefined}
            >
              <span className="nav-icon">{m.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{m.title}</span>}
            </button>
          ))}
        </nav>

        <div className="user-sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            {!sidebarCollapsed && (
              <div style={{ overflow: "hidden" }}>
                <div className="profile-name">{currentAdmin?.email?.split("@")[0] || "Admin"}</div>
                <div className="profile-role" style={{ color: rc.primary }}>{currentAdmin?.role?.replace(/_/g, " ")}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut /> {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="user-main-content">
        <header className="user-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <div>
              <div className="topbar-title">User Management</div>
              <div className="topbar-sub">
                {totalUsers} total users · {stats.premium} premium · {stats.verified} verified
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Search users... (Ctrl+K)"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {isOffline && (
              <div className="offline-indicator">
                <FiAlertCircle /> Offline
              </div>
            )}

            <div style={{ position: "relative" }}>
              <button className="icon-btn" onClick={() => setShowNotifications(p => !p)}>
                <FiBell />
                {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div className="notif-dropdown" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="notif-header">Notifications</div>
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No pending notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="notif-item">
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{n.time}</div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="icon-btn theme-toggle" onClick={toggleDarkMode}>
              {darkMode ? "☀️" : "🌙"}
            </button>

            <div className="role-chip">
              <div className="role-chip-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown style={{ fontSize: 10 }} /> : <FaShieldAlt style={{ fontSize: 10 }} />}
              </div>
              <div>
                <div className="role-chip-label" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase()}</div>
                <div className="role-chip-status">● Online</div>
              </div>
            </div>
          </div>
        </header>

        <div className="user-content">
          {/* ─── FILTER BAR ────────────────────────────────────────────────── */}
          <div className="filter-bar">
            <div className="filter-group">
              <select
                value={filterRole}
                onChange={e => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Users</option>
                <option value="premium">Premium</option>
                <option value="non-premium">Non-Premium</option>
              </select>
            </div>

            <div className="filter-group">
              <select
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div className="stats-info">
              Showing {users.length} of {totalUsers} users
            </div>
          </div>

          {/* ─── USERS GRID ───────────────────────────────────────────────── */}
          {hasError ? (
            <div className="error-banner">
              <FiAlertCircle />
              <span>Failed to load users</span>
              <button onClick={fetchUsers}>Retry</button>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FiUsers /></div>
              <h3>No users found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="users-grid">
              {users.map(user => {
                const isPremium = user.is_premium;
                const isBanned = user.is_banned;
                const isVerified = user.confirmed;
                const canCreateStore = user.can_create_store;
                const isAdminUser = user.is_admin;

                return (
                  <motion.div
                    key={user.id}
                    className="user-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="user-card-header">
                      <div className="user-avatar" style={{
                        background: isPremium ? "linear-gradient(135deg,#F59E0B,#D97706)" : "rgba(99,102,241,0.1)",
                        color: isPremium ? "#000" : "#6366F1"
                      }}>
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} style={{ width: 48, height: 48, borderRadius: 24 }} />
                        ) : (
                          <FiUser size={20} />
                        )}
                      </div>
                      <div className="user-info">
                        <h3>{user.full_name || "Unknown User"}</h3>
                        <p>{user.email || "No email"}</p>
                      </div>
                      <div className={`status-badge ${isBanned ? "banned" : isVerified ? "verified" : "pending"}`}>
                        {isBanned ? <FiAlertTriangle size={12} /> : isVerified ? <FiCheckCircle size={12} /> : <FiClock size={12} />}
                        {isBanned ? "Banned" : isVerified ? "Verified" : "Pending"}
                      </div>
                    </div>

                    <div className="user-details">
                      {user.phone && (
                        <div className="detail-row">
                          <FiPhone /> {user.phone}
                        </div>
                      )}
                      <div className="detail-row">
                        <FiClock /> Joined {formatDate(user.created_at)}
                      </div>
                      <div className="detail-row store-row">
                        <FiBox /> Store Access: 
                        <span className={`store-badge ${canCreateStore ? "granted" : "revoked"}`}>
                          {canCreateStore ? "✅ Granted" : "❌ Revoked"}
                        </span>
                        {isPremium && (
                          <span className="store-badge premium">
                            <FiCrown size={10} /> Premium
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="user-actions">
                      <button
                        className={`action-btn ${isBanned ? "unban" : "ban"}`}
                        onClick={() => toggleBan(user.id, isBanned)}
                        disabled={actionLoading[user.id]}
                      >
                        {actionLoading[user.id] ? (
                          <span className="loading-dots" />
                        ) : isBanned ? (
                          "Unban"
                        ) : (
                          "Ban"
                        )}
                      </button>

                      <button
                        className={`action-btn ${isPremium ? "revoke-premium" : "grant-premium"}`}
                        onClick={() => togglePremium(user.id, isPremium)}
                        disabled={actionLoading[`premium_${user.id}`]}
                      >
                        {actionLoading[`premium_${user.id}`] ? (
                          <span className="loading-dots" />
                        ) : isPremium ? (
                          "Revoke Premium"
                        ) : (
                          "Grant Premium"
                        )}
                      </button>

                      <button
                        className={`action-btn ${canCreateStore ? "revoke" : "grant"}`}
                        onClick={() => toggleStoreAccess(user.id, canCreateStore)}
                        disabled={actionLoading[`store_${user.id}`]}
                      >
                        {actionLoading[`store_${user.id}`] ? (
                          <span className="loading-dots" />
                        ) : canCreateStore ? (
                          "Revoke Store"
                        ) : (
                          "Grant Store"
                        )}
                      </button>

                      <button
                        className="action-btn"
                        style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1" }}
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        <FiEye size={14} /> View
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ─── PAGINATION ────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft /> Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserManagement;