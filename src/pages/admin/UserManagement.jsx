// src/pages/admin/UserManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import {
  FiUsers, FiSearch, FiFilter, FiChevronLeft, FiChevronRight,
  FiUser, FiUserCheck, FiUserX, FiStar, FiBriefcase, FiShield,
  FiMail, FiPhone, FiCalendar, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiMenu, FiBell, FiLogOut, FiHome, FiSettings, FiMessageSquare,
  FiShoppingCart, FiDollarSign, FiPackage, FiCreditCard, FiFileText,
  FiDatabase, FiAward, FiClipboard, FiUserPlus, FiActivity
} from "react-icons/fi";
import { FaCrown, FaStore, FaBan, FaCheck, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import "./UserManagement.css";

const USERS_PER_PAGE = 10;

// Reusable Skeleton Component
const UserCardSkeleton = () => (
  <div className="user-card skeleton">
    <div className="user-header">
      <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
      <div style={{ flex: 1, marginLeft: 12 }}>
        <div className="sk-pulse" style={{ width: "60%", height: 20, marginBottom: 8 }} />
        <div className="sk-pulse" style={{ width: "80%", height: 14 }} />
      </div>
    </div>
    <div className="user-details">
      <div className="sk-pulse" style={{ width: "50%", height: 16, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: "40%", height: 16, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: "70%", height: 16 }} />
    </div>
    <div className="user-actions">
      <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
      <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
      <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
    </div>
  </div>
);

const UserManagement = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Data state
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);

  // Role colors (consistent with dashboard)
  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)", accent: "rgba(245,158,11,0.15)" },
    admin:       { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)", accent: "rgba(239,68,68,0.15)" },
    moderator:   { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)", accent: "rgba(99,102,241,0.15)" },
    support:     { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)", accent: "rgba(16,185,129,0.15)" },
  };

  const getRoleColor = (role) => roleColors[role] || roleColors.moderator;

  // Navigation modules (same as dashboard – only show if user has permission)
  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", path: "/admin-dashboard", perm: "view_dashboard" },
    { icon: <FiUsers />, title: "User Management", path: "/admin/users", perm: "manage_users" },
    { icon: <FaStore />, title: "Store Management", path: "/admin/stores", perm: "manage_stores" },
    { icon: <FiShoppingCart />, title: "Products", path: "/admin/products", perm: "manage_products" },
    { icon: <FiPackage />, title: "Categories", path: "/admin/categories", perm: "manage_categories" },
    { icon: <FiMessageSquare />, title: "Messages", path: "/admin/messages", perm: "manage_messages" },
    { icon: <FiDollarSign />, title: "Finance", path: "/admin/finance", perm: "manage_finance" },
    { icon: <FiCreditCard />, title: "Wallets", path: "/admin/wallet", perm: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings", perm: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments", perm: "manage_installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports", perm: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Users", path: "/admin/admins", perm: "manage_admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings", perm: "manage_settings" },
    { icon: <FiDatabase />, title: "Database", path: "/admin/database", perm: "manage_database" },
    { icon: <FiAward />, title: "Promotions", path: "/admin/promotions", perm: "manage_promotions" },
  ];

  // ── Check Admin Access ──────────────────────────────────────────────────────
  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (data) {
        setCurrentAdmin(data);
        const hasPerm = data.role === "super_admin" || data.permissions?.includes("manage_users") || data.permissions?.includes("all");
        if (!hasPerm) {
          toast.error("You don't have permission to manage users");
          navigate("/admin-dashboard", { replace: true });
          return false;
        }
        setHasAccess(true);
        return true;
      }
      navigate("/admin-dashboard", { replace: true });
      return false;
    } catch {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
  }, [user, navigate]);

  // ── Fetch Users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    let query = supabase
      .from("users")
      .select(`*, stores:stores!stores_owner_id_fkey(id, name, is_verified, verified_at)`, { count: "exact" });

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }
    if (filter === "banned") query = query.eq("is_banned", true);
    else if (filter === "premium") query = query.eq("is_premium", true);
    else if (filter === "store_owners") query = query.not("stores", "is", null);
    else if (filter === "verified_stores") query = query.eq("stores.is_verified", true);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load users");
    } else {
      setUsers(data || []);
      setTotalUsers(count || 0);
    }
    setLoading(false);
  }, [page, searchTerm, filter]);

  // ── Actions (Ban, Premium, Store Access, Verify Store) ─────────────────────
  const toggleField = async (userId, field, value, actionName) => {
    setActionLoading(`${field}-${userId}`);
    const { error } = await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", userId);
    if (error) {
      toast.error(`Failed to ${actionName}`);
    } else {
      toast.success(`User ${actionName} successfully`);
      fetchUsers();
    }
    setActionLoading(null);
  };

  const toggleStoreVerification = async (storeId, value, storeName) => {
    setActionLoading(`store-${storeId}`);
    const { error } = await supabase
      .from("stores")
      .update({ is_verified: value, verified_at: value ? new Date().toISOString() : null })
      .eq("id", storeId);
    if (error) {
      toast.error(`Failed to ${value ? "verify" : "unverify"} store`);
    } else {
      toast.success(`Store ${value ? "verified" : "unverified"} successfully`);
      fetchUsers();
    }
    setActionLoading(null);
  };

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (hasAccess) fetchUsers();
  }, [fetchUsers, hasAccess]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

  const getStatusBadge = (user) => {
    if (user.is_banned) return { label: "Banned", color: "#EF4444", icon: <FaBan /> };
    if (user.is_premium) return { label: "Premium", color: "#F59E0B", icon: <FaCrown /> };
    if (user.stores?.length > 0) return { label: "Store Owner", color: "#10B981", icon: <FaStore /> };
    return { label: "Active", color: "#6366F1", icon: <FiUserCheck /> };
  };

  const getStoreBadge = (store) => {
    if (!store) return null;
    return store.is_verified
      ? { label: "Verified Store", color: "#10B981", icon: <FiCheckCircle /> }
      : { label: "Unverified Store", color: "#F59E0B", icon: <FiAlertCircle /> };
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric"
  });

  // Loading or no access
  if (!hasAccess || loading) {
    return (
      <div className={`user-mgmt-root ${darkMode ? "dark" : ""}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user management...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`user-mgmt-root ${darkMode ? "dark" : ""}`}>
      {/* Mobile backdrop */}
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

      {/* Sidebar (identical to dashboard) */}
      <aside className={`user-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="user-sidebar-brand">
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

        <nav className="user-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/users" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => navigate(module.path)}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
            </button>
          ))}
        </nav>

        <div className="user-sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="profile-name">{currentAdmin?.email?.split("@")[0] || "Admin"}</div>
                <div className="profile-role" style={{ color: rc.primary }}>{currentAdmin?.role?.replace("_", " ")}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={async () => {
            await supabase.auth.signOut();
            navigate("/admin-auth");
          }}>
            <FiLogOut /> {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="user-main-content">
        <header className="user-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu /></button>
            <div>
              <div className="topbar-title">User Management</div>
              <div className="topbar-sub">Manage platform users and permissions</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
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
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-group">
              <FiFilter />
              <select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All Users</option>
                <option value="banned">Banned Users</option>
                <option value="premium">Premium Users</option>
                <option value="store_owners">Store Owners</option>
                <option value="verified_stores">Verified Stores</option>
              </select>
            </div>
            <div className="stats-info">
              <span>{totalUsers} total users</span>
            </div>
          </div>

          {/* Users Grid */}
          <div className="users-grid">
            {loading ? (
              Array(6).fill(0).map((_, i) => <UserCardSkeleton key={i} />)
            ) : users.length === 0 ? (
              <div className="empty-state">
                <FiUsers className="empty-icon" />
                <h3>No users found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              users.map((user, idx) => {
                const status = getStatusBadge(user);
                const store = user.stores?.[0];
                const storeBadge = getStoreBadge(store);
                return (
                  <motion.div
                    key={user.id}
                    className="user-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="user-card-header">
                      <div className="user-avatar" style={{ background: `${status.color}20`, color: status.color }}>
                        {status.icon}
                      </div>
                      <div className="user-info">
                        <h3>{user.name || "Unnamed User"}</h3>
                        <p>{user.email}</p>
                      </div>
                      <span className="status-badge" style={{ background: `${status.color}15`, color: status.color }}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <div className="user-details">
                      <div className="detail-row">
                        <FiPhone /> <span>{user.phone || "No phone"}</span>
                      </div>
                      <div className="detail-row">
                        <FiCalendar /> <span>Joined {formatDate(user.created_at)}</span>
                      </div>
                      {store && (
                        <div className="detail-row store-row">
                          <FaStore /> <span>{store.name}</span>
                          {storeBadge && (
                            <span className="store-badge" style={{ background: `${storeBadge.color}15`, color: storeBadge.color }}>
                              {storeBadge.icon} {storeBadge.label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="user-actions">
                      <button
                        className={`action-btn ${user.is_banned ? "unban" : "ban"}`}
                        onClick={() => toggleField(user.id, "is_banned", !user.is_banned, user.is_banned ? "unbanned" : "banned")}
                        disabled={actionLoading === `is_banned-${user.id}`}
                      >
                        {actionLoading === `is_banned-${user.id}` ? <div className="loading-dots" /> : <>{user.is_banned ? <FiUserCheck /> : <FiUserX />} {user.is_banned ? "Unban" : "Ban"}</>}
                      </button>
                      <button
                        className={`action-btn ${user.can_create_store ? "revoke" : "grant"}`}
                        onClick={() => toggleField(user.id, "can_create_store", !user.can_create_store, user.can_create_store ? "store access revoked" : "store access granted")}
                        disabled={actionLoading === `can_create_store-${user.id}`}
                      >
                        {actionLoading === `can_create_store-${user.id}` ? <div className="loading-dots" /> : <><FiBriefcase /> {user.can_create_store ? "Revoke Store" : "Grant Store"}</>}
                      </button>
                      <button
                        className={`action-btn ${user.is_premium ? "revoke-premium" : "grant-premium"}`}
                        onClick={() => toggleField(user.id, "is_premium", !user.is_premium, user.is_premium ? "premium revoked" : "premium granted")}
                        disabled={actionLoading === `is_premium-${user.id}`}
                      >
                        {actionLoading === `is_premium-${user.id}` ? <div className="loading-dots" /> : <><FiStar /> {user.is_premium ? "Revoke Premium" : "Grant Premium"}</>}
                      </button>
                      {store && (
                        <button
                          className={`action-btn ${store.is_verified ? "unverify-store" : "verify-store"}`}
                          onClick={() => toggleStoreVerification(store.id, !store.is_verified, store.name)}
                          disabled={actionLoading === `store-${store.id}`}
                        >
                          {actionLoading === `store-${store.id}` ? <div className="loading-dots" /> : <>{store.is_verified ? <FiXCircle /> : <FiCheckCircle />} {store.is_verified ? "Unverify Store" : "Verify Store"}</>}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                <FiChevronLeft /> Previous
              </button>
              <span>Page {page} of {totalPages} ({totalUsers} users)</span>
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
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