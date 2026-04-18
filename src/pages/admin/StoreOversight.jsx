// src/pages/admin/StoreOversight.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import {
  FiSearch, FiFilter, FiEye, FiTrash2, FiCheckCircle, FiXCircle,
  FiAlertCircle, FiBriefcase, FiUser, FiMapPin, FiMail, FiPhone,
  FiFileText, FiDownload, FiChevronLeft, FiChevronRight, FiRefreshCw,
  FiTruck, FiUsers, FiDollarSign, FiMenu, FiBell, FiLogOut, FiHome,
  FiSettings, FiMessageSquare, FiShoppingCart, FiPackage, FiCreditCard,
  FiDatabase, FiAward, FiClipboard, FiUserPlus, FiActivity, FiStar
} from "react-icons/fi";
import { FaStore, FaCheck, FaTimes, FaCrown, FaBan, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import "./StoreOversight.css";

const TABS = [
  { key: 'all', label: 'All Stores', icon: <FiBriefcase /> },
  { key: 'pending', label: 'Pending Requests', icon: <FiAlertCircle /> },
  { key: 'active', label: 'Active', icon: <FiCheckCircle /> },
  { key: 'inactive', label: 'Inactive', icon: <FiXCircle /> },
  { key: 'verified', label: 'Verified', icon: <FaCheck /> },
  { key: 'unverified', label: 'Unverified', icon: <FiXCircle /> }
];

const STORES_PER_PAGE = 9;

// Skeleton Components
const StoreCardSkeleton = () => (
  <div className="store-card skeleton">
    <div className="store-header">
      <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
      <div style={{ flex: 1, marginLeft: 12 }}>
        <div className="sk-pulse" style={{ width: "60%", height: 20, marginBottom: 8 }} />
        <div className="sk-pulse" style={{ width: "80%", height: 14 }} />
      </div>
    </div>
    <div className="store-details">
      <div className="sk-pulse" style={{ width: "70%", height: 16, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: "50%", height: 16, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: "60%", height: 16 }} />
    </div>
    <div className="store-actions">
      <div className="sk-pulse" style={{ width: 80, height: 36, borderRadius: 8 }} />
      <div className="sk-pulse" style={{ width: 90, height: 36, borderRadius: 8 }} />
      <div className="sk-pulse" style={{ width: 70, height: 36, borderRadius: 8 }} />
    </div>
  </div>
);

const RequestCardSkeleton = () => (
  <div className="request-card skeleton">
    <div className="request-header">
      <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
      <div style={{ flex: 1, marginLeft: 12 }}>
        <div className="sk-pulse" style={{ width: "50%", height: 20, marginBottom: 8 }} />
        <div className="sk-pulse" style={{ width: "70%", height: 14 }} />
      </div>
    </div>
    <div className="request-details">
      <div className="sk-pulse" style={{ width: "90%", height: 14, marginBottom: 6 }} />
      <div className="sk-pulse" style={{ width: "80%", height: 14, marginBottom: 6 }} />
      <div className="sk-pulse" style={{ width: "60%", height: 14 }} />
    </div>
    <div className="request-actions">
      <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
      <div className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 8 }} />
    </div>
  </div>
);

const StoreOversight = () => {
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
  const [stores, setStores] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [documentLoading, setDocumentLoading] = useState(null);

  const adminUserUUID = '755ed9e9-69f6-459c-ad44-d1b93b80a4c6';

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
        const hasPerm = data.role === "super_admin" || data.permissions?.includes("manage_stores") || data.permissions?.includes("all");
        if (!hasPerm) {
          toast.error("You don't have permission to manage stores");
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

  // ── Fetch Data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [storesResponse, requestsResponse] = await Promise.all([
        supabase.from('stores').select('*', { count: 'exact' }),
        supabase.from('store_requests').select('*')
      ]);
      if (storesResponse.error) throw storesResponse.error;
      if (requestsResponse.error) throw requestsResponse.error;
      setStores(storesResponse.data || []);
      setRequests(requestsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load store data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (hasAccess) fetchData();
  }, [fetchData, hasAccess]);

  // ── Filtering & Pagination ─────────────────────────────────────────────────
  const filteredStores = stores.filter(store => {
    const matchSearch = store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       store.owner_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       store.location?.toLowerCase().includes(searchTerm.toLowerCase());
    switch (activeTab) {
      case 'active': return matchSearch && store.is_active;
      case 'inactive': return matchSearch && !store.is_active;
      case 'verified': return matchSearch && store.is_verified;
      case 'unverified': return matchSearch && !store.is_verified;
      default: return matchSearch;
    }
  });

  const paginatedStores = filteredStores.slice(
    (page - 1) * STORES_PER_PAGE,
    page * STORES_PER_PAGE
  );
  const totalPages = Math.ceil(filteredStores.length / STORES_PER_PAGE);

  // ── Store Actions ──────────────────────────────────────────────────────────
  const updateStoreStatus = async (id, updates, actionName) => {
    setActionLoading(`${id}-${actionName}`);
    try {
      const { error } = await supabase.from('stores').update(updates).eq('id', id);
      if (error) throw error;
      setStores(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      toast.success(`Store ${actionName} successfully`);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to ${actionName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStoreStatus = async (store) => {
    const updates = {
      is_active: !store.is_active,
      deactivation_reason: store.is_active ? 'Deactivated by admin' : null
    };
    await updateStoreStatus(store.id, updates, store.is_active ? 'deactivated' : 'activated');
  };

  const toggleVerification = async (store) => {
    const updates = store.is_verified
      ? { is_verified: false, verified_at: null, verified_by: null }
      : { is_verified: true, verified_at: new Date().toISOString(), verified_by: adminUserUUID };
    await updateStoreStatus(store.id, updates, store.is_verified ? 'unverified' : 'verified');
  };

  const deleteStore = async (store) => {
    setActionLoading(`delete-${store.id}`);
    try {
      const { error } = await supabase.from('stores').delete().eq('id', store.id);
      if (error) throw error;
      setStores(prev => prev.filter(s => s.id !== store.id));
      toast.success('Store deleted successfully');
    } catch (error) {
      console.error('Deletion failed:', error);
      toast.error('Failed to delete store');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Request Actions ────────────────────────────────────────────────────────
  const approveStoreRequest = async (request) => {
    setActionLoading(`approve-${request.id}`);
    try {
      // Prepare store data from request
      const latValue = request.location_lat ? parseFloat(request.location_lat) : null;
      const lngValue = request.location_lng ? parseFloat(request.location_lng) : null;
      if (!latValue || !lngValue) {
        toast.error('Missing location coordinates. Cannot approve store.');
        setActionLoading(null);
        return;
      }
      const payload = {
        owner_id: request.user_id,
        name: request.name || '',
        description: request.description || '',
        contact_email: request.contact_email || '',
        contact_phone: request.contact_phone || '',
        location: request.location || '',
        location_lat: latValue,
        location_lng: lngValue,
        delivery_type: request.delivery_type || 'omniflow-managed',
        has_delivery_fleet: request.has_delivery_fleet === true,
        delivery_fleet_size: parseInt(request.delivery_fleet_size) || 0,
        delivery_coverage_radius: parseInt(request.delivery_coverage_radius) || 50,
        delivery_base_fee: parseFloat(request.delivery_base_fee) || 100,
        delivery_rate_per_km: parseFloat(request.delivery_rate_per_km) || 15,
        business_document: request.business_document || '',
        owner_id_card: request.owner_id_card || '',
        is_active: true,
        is_verified: true,
        verified_by: adminUserUUID,
        verified_at: new Date().toISOString(),
        theme: 'default',
        dashboard_theme: 'default',
        same_day_cutoff_time: '14:00:00',
        county: request.county || 'Nairobi',
        seller_score: 0,
        total_orders: 0,
        successful_orders: 0
      };
      const { data: newStore, error: insertError } = await supabase
        .from('stores')
        .insert(payload)
        .select()
        .single();
      if (insertError) throw insertError;
      const { error: deleteError } = await supabase.from('store_requests').delete().eq('id', request.id);
      if (deleteError) throw deleteError;
      setStores(prev => [...prev, newStore]);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Store Approved',
        message: 'Your store has been approved and is now live!',
        type: 'store',
        read: false,
        color: 'success',
      });
      toast.success('Store request approved successfully');
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Failed to approve store request');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectStoreRequest = async (request) => {
    setActionLoading(`reject-${request.id}`);
    try {
      const { error } = await supabase.from('store_requests').delete().eq('id', request.id);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== request.id));
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Store Request Rejected',
        message: 'Your store request was rejected by admin.',
        type: 'store',
        read: false,
        color: 'error',
      });
      toast.success('Store request rejected');
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject store request');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Document Handling ──────────────────────────────────────────────────────
  const handleDocumentView = async (documentData, docType) => {
    if (!documentData) {
      toast.error('No document available');
      return;
    }
    setDocumentLoading(docType);
    try {
      let filePath = documentData;
      if (typeof documentData === 'string') {
        try {
          const parsed = JSON.parse(documentData);
          filePath = parsed.path || parsed.url || documentData;
        } catch { filePath = documentData; }
      } else if (typeof documentData === 'object') {
        filePath = documentData.path || documentData.url || documentData;
      }
      const { data: signedData, error } = await supabase.storage
        .from('store-documents')
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      window.open(signedData.signedUrl, '_blank');
    } catch (error) {
      console.error('Document access error:', error);
      toast.error('Unable to load document');
    } finally {
      setDocumentLoading(null);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getStoreStatus = (store) => {
    if (!store.is_active) return { label: 'Inactive', color: '#EF4444', icon: <FiXCircle /> };
    if (store.is_verified) return { label: 'Verified', color: '#10B981', icon: <FiCheckCircle /> };
    return { label: 'Active', color: '#F59E0B', icon: <FiAlertCircle /> };
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'Never';

  // Loading or no access
  if (!hasAccess || loading) {
    return (
      <div className={`store-mgmt-root ${darkMode ? "dark" : ""}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading store management...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`store-mgmt-root ${darkMode ? "dark" : ""}`}>
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

      {/* Sidebar */}
      <aside className={`store-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="store-sidebar-brand">
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

        <nav className="store-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/stores" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => navigate(module.path)}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
            </button>
          ))}
        </nav>

        <div className="store-sidebar-footer">
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
      <main className="store-main-content">
        <header className="store-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu /></button>
            <div>
              <div className="topbar-title">Store Management</div>
              <div className="topbar-sub">Oversee stores and pending requests</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Search stores..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="icon-btn refresh-btn" onClick={fetchData}>
              <FiRefreshCw />
            </button>
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

        <div className="store-content">
          {/* Tabs */}
          <div className="tabs-container">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Pending Requests Tab */}
          {activeTab === 'pending' && (
            <div className="requests-section">
              <div className="section-header">
                <h2>Pending Store Requests</h2>
                <span className="count-badge">{requests.length} requests</span>
              </div>
              {loading ? (
                <div className="requests-grid">
                  {[1,2,3].map(i => <RequestCardSkeleton key={i} />)}
                </div>
              ) : requests.length === 0 ? (
                <div className="empty-state">
                  <FiCheckCircle className="empty-icon" />
                  <h3>No pending requests</h3>
                  <p>All store requests have been processed</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {requests.map((request, idx) => (
                    <motion.div
                      key={request.id}
                      className="request-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="request-header">
                        <div className="store-avatar"><FiBriefcase /></div>
                        <div className="request-info">
                          <h3>{request.name}</h3>
                          <p>Owner: {request.user_id}</p>
                        </div>
                        <div className="status-badge pending">
                          <FiAlertCircle /> Pending
                        </div>
                      </div>
                      <div className="request-details">
                        <div className="detail-row"><FiMapPin /> {request.location || 'No location'}</div>
                        {request.location_lat && request.location_lng && (
                          <div className="detail-row coordinates">
                            <FiMapPin /> 📍 {parseFloat(request.location_lat).toFixed(6)}, {parseFloat(request.location_lng).toFixed(6)}
                          </div>
                        )}
                        <div className="detail-row"><FiTruck /> Delivery: {request.delivery_type === 'self-delivery' ? 'Self-Delivery' : 'Omniflow Managed'}</div>
                        {request.delivery_type === 'self-delivery' && (
                          <>
                            <div className="detail-row"><FiUsers /> Fleet: {request.delivery_fleet_size || 0} riders</div>
                            <div className="detail-row"><FiMapPin /> Radius: {request.delivery_coverage_radius || 50} km</div>
                            <div className="detail-row"><FiDollarSign /> Base: Ksh {request.delivery_base_fee || 100} | Rate: Ksh {request.delivery_rate_per_km || 15}/km</div>
                          </>
                        )}
                        {(request.business_document || request.owner_id_card) && (
                          <div className="document-links">
                            {request.business_document && (
                              <button className="doc-link" onClick={() => handleDocumentView(request.business_document, 'business')}>
                                <FiFileText /> Business Doc <FiDownload />
                              </button>
                            )}
                            {request.owner_id_card && (
                              <button className="doc-link" onClick={() => handleDocumentView(request.owner_id_card, 'id')}>
                                <FiFileText /> ID Document <FiDownload />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="request-actions">
                        <button
                          className="approve-btn"
                          onClick={() => approveStoreRequest(request)}
                          disabled={actionLoading === `approve-${request.id}`}
                        >
                          {actionLoading === `approve-${request.id}` ? <div className="loading-dots" /> : <><FiCheckCircle /> Approve</>}
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => rejectStoreRequest(request)}
                          disabled={actionLoading === `reject-${request.id}`}
                        >
                          {actionLoading === `reject-${request.id}` ? <div className="loading-dots" /> : <><FiXCircle /> Reject</>}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stores List Tab */}
          {activeTab !== 'pending' && (
            <div className="stores-section">
              <div className="section-header">
                <h2>{TABS.find(t => t.key === activeTab)?.label} <span className="count-badge">({filteredStores.length} stores)</span></h2>
              </div>
              {loading ? (
                <div className="stores-grid">
                  {[1,2,3,4,5,6].map(i => <StoreCardSkeleton key={i} />)}
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="empty-state">
                  <FiBriefcase className="empty-icon" />
                  <h3>No stores found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <>
                  <div className="stores-grid">
                    {paginatedStores.map((store, idx) => {
                      const status = getStoreStatus(store);
                      return (
                        <motion.div
                          key={store.id}
                          className="store-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                        >
                          <div className="store-header">
                            <div className="store-avatar">{store.is_verified ? <FaCheck /> : <FiBriefcase />}</div>
                            <div className="store-info">
                              <h3>{store.name}</h3>
                              <p>Owner: {store.owner_id}</p>
                            </div>
                            <div className="status-badge" style={{ background: `${status.color}15`, color: status.color }}>
                              {status.icon} {status.label}
                            </div>
                          </div>
                          <div className="store-details">
                            <div className="detail-row"><FiMapPin /> {store.location || 'No location'}</div>
                            {store.location_lat && store.location_lng && (
                              <div className="detail-row coordinates">
                                <FiMapPin /> 📍 {store.location_lat.toFixed(6)}, {store.location_lng.toFixed(6)}
                              </div>
                            )}
                            <div className="detail-row"><FiTruck /> Delivery: {store.delivery_type === 'self-delivery' ? 'Self-Delivery' : 'Omniflow Managed'}</div>
                            <div className="detail-row"><FiMail /> {store.contact_email || 'No email'}</div>
                            <div className="detail-row"><FiPhone /> {store.contact_phone || 'No phone'}</div>
                            {store.verified_at && <div className="detail-row"><FiCheckCircle /> Verified {formatDate(store.verified_at)}</div>}
                          </div>
                          <div className="store-actions">
                            <button className="action-btn view" onClick={() => setSelectedStore(store)}>
                              <FiEye /> Details
                            </button>
                            <button
                              className={`action-btn ${store.is_active ? 'deactivate' : 'activate'}`}
                              onClick={() => toggleStoreStatus(store)}
                              disabled={actionLoading === `${store.id}-${store.is_active ? 'deactivated' : 'activated'}`}
                            >
                              {actionLoading === `${store.id}-${store.is_active ? 'deactivated' : 'activated'}` ? <div className="loading-dots" /> : <>{store.is_active ? <FiXCircle /> : <FiCheckCircle />} {store.is_active ? 'Deactivate' : 'Activate'}</>}
                            </button>
                            <button
                              className={`action-btn ${store.is_verified ? 'unverify' : 'verify'}`}
                              onClick={() => toggleVerification(store)}
                              disabled={actionLoading === `${store.id}-${store.is_verified ? 'unverified' : 'verified'}`}
                            >
                              {actionLoading === `${store.id}-${store.is_verified ? 'unverified' : 'verified'}` ? <div className="loading-dots" /> : <>{store.is_verified ? <FiXCircle /> : <FiCheckCircle />} {store.is_verified ? 'Unverify' : 'Verify'}</>}
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => deleteStore(store)}
                              disabled={actionLoading === `delete-${store.id}`}
                            >
                              {actionLoading === `delete-${store.id}` ? <div className="loading-dots" /> : <><FiTrash2 /> Delete</>}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                        <FiChevronLeft /> Previous
                      </button>
                      <span>Page {page} of {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                        Next <FiChevronRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Store Details Modal */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStore(null)}>
            <motion.div className="modal-box" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Store Details</h3>
                <button className="modal-close" onClick={() => setSelectedStore(null)}><FiXCircle /></button>
              </div>
              <div className="modal-body">
                <div className="detail-section"><h4>Basic Info</h4>
                  <div className="detail-grid">
                    <div><strong>Store ID:</strong> {selectedStore.id}</div>
                    <div><strong>Owner ID:</strong> {selectedStore.owner_id}</div>
                    <div><strong>Name:</strong> {selectedStore.name}</div>
                    <div><strong>Description:</strong> {selectedStore.description || 'No description'}</div>
                  </div>
                </div>
                <div className="detail-section"><h4>Location</h4>
                  <div className="detail-grid">
                    <div><strong>Address:</strong> {selectedStore.location || 'No location'}</div>
                    <div><strong>Lat/Lng:</strong> {selectedStore.location_lat?.toFixed(6) || 'N/A'}, {selectedStore.location_lng?.toFixed(6) || 'N/A'}</div>
                  </div>
                </div>
                <div className="detail-section"><h4>Contact</h4>
                  <div className="detail-grid">
                    <div><strong>Email:</strong> {selectedStore.contact_email || 'No email'}</div>
                    <div><strong>Phone:</strong> {selectedStore.contact_phone || 'No phone'}</div>
                  </div>
                </div>
                <div className="detail-section"><h4>Delivery</h4>
                  <div className="detail-grid">
                    <div><strong>Type:</strong> {selectedStore.delivery_type === 'self-delivery' ? 'Self-Delivery' : 'Omniflow Managed'}</div>
                    <div><strong>Has Fleet:</strong> {selectedStore.has_delivery_fleet ? 'Yes' : 'No'}</div>
                    {selectedStore.has_delivery_fleet && (
                      <>
                        <div><strong>Fleet Size:</strong> {selectedStore.delivery_fleet_size}</div>
                        <div><strong>Coverage Radius:</strong> {selectedStore.delivery_coverage_radius} km</div>
                        <div><strong>Base Fee:</strong> Ksh {selectedStore.delivery_base_fee}</div>
                        <div><strong>Rate/km:</strong> Ksh {selectedStore.delivery_rate_per_km}</div>
                      </>
                    )}
                  </div>
                </div>
                {(selectedStore.business_document || selectedStore.owner_id_card) && (
                  <div className="detail-section"><h4>Documents</h4>
                    <div className="document-links">
                      {selectedStore.business_document && <button className="doc-link" onClick={() => handleDocumentView(selectedStore.business_document, 'modal-business')}><FiFileText /> Business Document</button>}
                      {selectedStore.owner_id_card && <button className="doc-link" onClick={() => handleDocumentView(selectedStore.owner_id_card, 'modal-id')}><FiFileText /> ID Card</button>}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreOversight;