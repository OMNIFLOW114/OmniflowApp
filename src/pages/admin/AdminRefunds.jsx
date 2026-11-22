// src/pages/admin/AdminRefunds.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch, FiRefreshCw, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiAlertTriangle, FiDollarSign, FiUser, FiPackage, FiClock,
  FiHome, FiUsers, FiShoppingCart, FiMessageSquare, FiCreditCard,
  FiStar, FiClipboard, FiFileText, FiUserPlus, FiSettings,
  FiDatabase, FiAward, FiChevronLeft, FiChevronRight, FiMenu,
  FiLogOut, FiX
} from "react-icons/fi";
import { FaStore, FaCrown, FaShieldAlt } from "react-icons/fa";
import "./AdminRefunds.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const AdminRefunds = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Shell state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Data
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [buyerAmt, setBuyerAmt] = useState(0);
  const [sellerAmt, setSellerAmt] = useState(0);
  const [adminAmt, setAdminAmt] = useState(0);
  const [adminNotes, setAdminNotes] = useState("");

  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)", accent: "rgba(245,158,11,0.15)" },
    admin:       { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)", accent: "rgba(239,68,68,0.15)" },
    moderator:   { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)", accent: "rgba(99,102,241,0.15)" },
    support:     { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)", accent: "rgba(16,185,129,0.15)" },
  };
  const getRoleColor = (role) => roleColors[role] || roleColors.moderator;

  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", path: "/admin-dashboard", perm: "view_dashboard" },
    { icon: <FiUsers />, title: "User Management", path: "/admin/users", perm: "manage_users" },
    { icon: <FaStore />, title: "Store Management", path: "/admin/stores", perm: "manage_stores" },
    { icon: <FiShoppingCart />, title: "Products", path: "/admin/products", perm: "manage_products" },
    { icon: <FiPackage />, title: "Categories", path: "/admin/categories", perm: "manage_categories" },
    { icon: <FiMessageSquare />, title: "Messages", path: "/admin/messages", perm: "manage_messages" },
    { icon: <FiDollarSign />, title: "Finance", path: "/admin/finance", perm: "manage_finance" },
    { icon: <FiRefreshCw />, title: "Refunds", path: "/admin/refunds", perm: "manage_finance" },
    { icon: <FiCreditCard />, title: "Wallets", path: "/admin/wallet", perm: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings", perm: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments", perm: "manage_installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports", perm: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Users", path: "/admin/admins", perm: "manage_admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings", perm: "manage_settings" },
    { icon: <FiDatabase />, title: "Database", path: "/admin/database", perm: "manage_database" },
    { icon: <FiAward />, title: "Promotions", path: "/admin/promotions", perm: "manage_promotions" },
  ];

  // ─── Check access ───────────────────────────────────────────────────────
  const checkAdminAccess = useCallback(async () => {
    if (!user) { navigate("/admin-auth", { replace: true }); return false; }
    try {
      const { data, error } = await supabase
        .from("admin_users").select("*")
        .eq("user_id", user.id).eq("is_active", true).single();
      if (data) {
        setCurrentAdmin(data);
        const hasPerm = data.role === "super_admin" || data.permissions?.includes("all") || data.permissions?.includes("manage_finance");
        if (!hasPerm) {
          toast.error("You don't have permission to manage refunds");
          navigate("/admin-dashboard", { replace: true });
          return false;
        }
        setHasAccess(true);
        return true;
      }
      navigate("/admin-auth", { replace: true });
      return false;
    } catch {
      navigate("/admin-auth", { replace: true });
      return false;
    }
  }, [user, navigate]);

  useEffect(() => { checkAdminAccess(); }, [checkAdminAccess]);

  // ─── Fetch returns ──────────────────────────────────────────────────────
  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      // Simple query first — no joins. This guarantees we see rows.
      const { data: rows, error } = await supabase
        .from("returns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rows || rows.length === 0) {
        setReturns([]);
        return;
      }

      // Fetch related data separately to avoid join failures
      const productIds = [...new Set(rows.map(r => r.product_id).filter(Boolean))];
      const orderIds = [...new Set(rows.map(r => r.order_id).filter(Boolean))];
      const buyerIds = [...new Set(rows.map(r => r.buyer_id).filter(Boolean))];
      const sellerIds = [...new Set(rows.map(r => r.seller_id).filter(Boolean))];

      const [productsRes, ordersRes, buyersRes, sellersRes] = await Promise.all([
        productIds.length
          ? supabase.from("products").select("id, name, image_gallery, image_url").in("id", productIds)
          : Promise.resolve({ data: [] }),
        orderIds.length
          ? supabase.from("orders").select("id, total_price, delivery_fee").in("id", orderIds)
          : Promise.resolve({ data: [] }),
        buyerIds.length
          ? supabase.from("users").select("id, full_name, name, email").in("id", buyerIds)
          : Promise.resolve({ data: [] }),
        sellerIds.length
          ? supabase.from("users").select("id, full_name, name, email").in("id", sellerIds)
          : Promise.resolve({ data: [] }),
      ]);

      const productsMap = new Map((productsRes.data || []).map(p => [p.id, p]));
      const ordersMap = new Map((ordersRes.data || []).map(o => [o.id, o]));
      const buyersMap = new Map((buyersRes.data || []).map(u => [u.id, u]));
      const sellersMap = new Map((sellersRes.data || []).map(u => [u.id, u]));

      const enriched = rows.map(r => ({
        ...r,
        product: productsMap.get(r.product_id) || null,
        order: ordersMap.get(r.order_id) || null,
        buyer: buyersMap.get(r.buyer_id) || null,
        seller: sellersMap.get(r.seller_id) || null,
      }));

      setReturns(enriched);
    } catch (err) {
      console.error("Fetch refunds error:", err);
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasAccess) return;
    fetchReturns();

    const channel = supabase.channel("admin-refunds")
      .on("postgres_changes", { event: "*", schema: "public", table: "returns" }, () => fetchReturns())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [hasAccess, fetchReturns]);

  // ─── Process actions ────────────────────────────────────────────────────
  const openProcessModal = (ret) => {
    setSelectedReturn(ret);
    setBuyerAmt(Number(ret.buyer_refund_amount || 0));
    setSellerAmt(Number(ret.seller_refund_amount || 0));
    setAdminAmt(Number(ret.admin_refund_amount || 0));
    setAdminNotes(ret.admin_notes || "");
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReturn) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_refund", {
        p_return_id: selectedReturn.id,
        p_action: "approve",
        p_admin_notes: adminNotes || "Approved by admin",
        p_buyer_amount_override: buyerAmt,
        p_seller_amount_override: sellerAmt,
        p_admin_amount_override: adminAmt,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Processing failed");
      toast.success("Refund approved and processed!");
      setIsModalOpen(false);
      fetchReturns();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error(err.message || "Failed to process refund");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReturn) return;
    if (!adminNotes.trim()) {
      toast.error("Please provide admin notes explaining the rejection.");
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_refund", {
        p_return_id: selectedReturn.id,
        p_action: "reject",
        p_admin_notes: adminNotes,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Rejection failed");
      toast.success("Refund request rejected.");
      setIsModalOpen(false);
      fetchReturns();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(err.message || "Failed to reject refund");
    } finally {
      setProcessing(false);
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const matchesTab = r.status === activeTab;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || (r.id || "").toLowerCase().includes(q)
        || (r.order_id || "").toLowerCase().includes(q)
        || (r.buyer?.full_name || r.buyer?.name || "").toLowerCase().includes(q)
        || (r.seller?.full_name || r.seller?.name || "").toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [returns, activeTab, searchQuery]);

  const tabConfig = [
    { key: "pending", label: "Pending Review", color: "#F59E0B" },
    { key: "approved", label: "Approved", color: "#10B981" },
    { key: "completed", label: "Completed", color: "#3B82F6" },
    { key: "rejected", label: "Rejected", color: "#EF4444" },
  ];

  const pendingCount = returns.filter(r => r.status === "pending").length;

  if (!hasAccess) return null;

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

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

      {/* Sidebar (identical to StoreOversight) */}
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
              className={`nav-item ${module.path === "/admin/refunds" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => navigate(module.path)}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
              {module.path === "/admin/refunds" && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount}</span>
              )}
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

      {/* Main */}
      <main className="store-main-content">
        <header className="store-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu /></button>
            <div>
              <div className="topbar-title">Refund Management</div>
              <div className="topbar-sub">Review and process buyer refund requests</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Search refunds..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="icon-btn refresh-btn" onClick={fetchReturns}><FiRefreshCw /></button>
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
          {/* Summary Banner */}
          <div className="refund-summary">
            <div className="refund-summary-item">
              <div className="refund-summary-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                <FiClock />
              </div>
              <div>
                <div className="refund-summary-value">{pendingCount}</div>
                <div className="refund-summary-label">Pending Actions</div>
              </div>
            </div>
            <div className="refund-summary-item">
              <div className="refund-summary-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                <FiCheckCircle />
              </div>
              <div>
                <div className="refund-summary-value">
                  {returns.filter(r => r.status === "completed").length}
                </div>
                <div className="refund-summary-label">Completed</div>
              </div>
            </div>
            <div className="refund-summary-item">
              <div className="refund-summary-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                <FiDollarSign />
              </div>
              <div>
                <div className="refund-summary-value">
                  {formatKSH(returns.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.buyer_refund_amount || 0), 0))}
                </div>
                <div className="refund-summary-label">Total Refunded</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            {tabConfig.map(tab => {
              const count = returns.filter(r => r.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={activeTab === tab.key ? { color: tab.color, borderBottomColor: tab.color } : {}}
                >
                  {tab.label}
                  {count > 0 && <span className="tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading refunds...</div>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="empty-state">
              <FiCheckCircle className="empty-icon" />
              <h3>No {activeTab} refunds</h3>
              <p>
                {returns.length === 0
                  ? "No refund requests in the system yet. They will appear here when buyers request refunds."
                  : `There are no refund requests with status "${activeTab}".`}
              </p>
            </div>
          ) : (
            <div className="refund-list">
              {filteredReturns.map(ret => {
                const buyerName = ret.buyer?.full_name || ret.buyer?.name || "Buyer";
                const sellerName = ret.seller?.full_name || ret.seller?.name || "Seller";
                const productImg = ret.product?.image_gallery?.[0] || ret.product?.image_url || "/placeholder.jpg";
                const isDisputed = (ret.seller_notes || "").toLowerCase().includes("disputed");

                return (
                  <div key={ret.id} className="refund-card">
                    <div className="refund-card-left">
                      <img src={productImg} alt="Product" className="refund-product-img" onError={(e) => e.target.src = "/placeholder.jpg"} />
                      <div className="refund-info">
                        <h4 className="refund-product-name">{ret.product?.name || "Product"}</h4>
                        <div className="refund-meta">
                          <span>Order #{ret.order_id?.slice(0, 8).toUpperCase()}</span>
                          <span>·</span>
                          <span>{new Date(ret.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                        <div className="refund-parties">
                          <span><FiUser size={10} /> {buyerName}</span>
                          <span>·</span>
                          <span><FiPackage size={10} /> {sellerName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="refund-card-middle">
                      <div className="refund-reason-label">Reason</div>
                      <div className="refund-reason-value">{(ret.reason || "").replace(/_/g, " ").toUpperCase()}</div>
                      <p className="refund-description">"{ret.description}"</p>
                      {isDisputed && (
                        <div className="refund-disputed-badge">
                          <FiAlertTriangle size={10} /> Seller Disputed
                        </div>
                      )}
                    </div>

                    <div className="refund-card-right">
                      <div className="refund-amounts">
                        <div className="refund-amt-row">
                          <span>Buyer</span>
                          <strong>{formatKSH(ret.buyer_refund_amount)}</strong>
                        </div>
                        <div className="refund-amt-row">
                          <span>Seller</span>
                          <strong style={{ color: "#EF4444" }}>-{formatKSH(ret.seller_refund_amount)}</strong>
                        </div>
                        <div className="refund-amt-row">
                          <span>Admin</span>
                          <strong style={{ color: "#10B981" }}>{formatKSH(ret.admin_refund_amount)}</strong>
                        </div>
                      </div>

                      {ret.status === "pending" || ret.status === "approved" ? (
                        <button className="refund-process-btn" onClick={() => openProcessModal(ret)}>
                          Process
                        </button>
                      ) : (
                        <div className={`refund-status-badge status-${ret.status}`}>
                          {ret.status.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Process Modal */}
      <AnimatePresence>
        {isModalOpen && selectedReturn && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-box" style={{ maxWidth: 600 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="modal-header">
                <h3>Process Refund</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div className="process-summary">
                  <div className="process-summary-row">
                    <span>Product</span>
                    <strong>{selectedReturn.product?.name}</strong>
                  </div>
                  <div className="process-summary-row">
                    <span>Buyer Reason</span>
                    <strong style={{ textTransform: "capitalize" }}>{(selectedReturn.reason || "").replace(/_/g, " ")}</strong>
                  </div>
                  <div className="process-summary-row">
                    <span>Original Order Total</span>
                    <strong>{formatKSH(selectedReturn.order?.total_price)}</strong>
                  </div>
                  {selectedReturn.seller_notes && (
                    <div className="process-summary-notes">
                      <strong>Seller notes:</strong> "{selectedReturn.seller_notes}"
                    </div>
                  )}
                </div>

                <h4 className="process-section-title">Refund Breakdown (Editable)</h4>
                <div className="process-split-grid">
                  <div className="form-group">
                    <label className="form-label">Buyer Gets (Ksh)</label>
                    <input type="number" className="form-input" value={buyerAmt} onChange={e => setBuyerAmt(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Seller Deduction (Ksh)</label>
                    <input type="number" className="form-input" value={sellerAmt} onChange={e => setSellerAmt(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admin Absorbs (Ksh)</label>
                    <input type="number" className="form-input" value={adminAmt} onChange={e => setAdminAmt(Number(e.target.value))} />
                  </div>
                </div>
                <div className="process-note">
                  <FiAlertTriangle size={12} />
                  Totals must match the product price. Adjusting these fields will override the default split.
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Admin Notes (Required for Rejection)</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Explain your decision..."
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setIsModalOpen(false)} disabled={processing}>Cancel</button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-reject" onClick={handleReject} disabled={processing}>Reject</button>
                  <button className="btn-approve" onClick={handleApprove} disabled={processing}>
                    {processing ? "Processing..." : "Approve & Refund"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminRefunds;