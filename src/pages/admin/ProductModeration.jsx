// src/pages/admin/ProductModeration.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiChevronLeft, FiChevronRight,
  FiShoppingBag, FiFlag, FiCheckCircle, FiXCircle,
  FiStar, FiEdit, FiTrash2,
  FiCalendar, FiDollarSign, FiLink,
  FiAward, FiClock, FiMenu,
  FiLogOut, FiHome, FiSettings, FiMessageSquare,
  FiShoppingCart, FiPackage, FiCreditCard, FiDatabase,
  FiClipboard, FiUserPlus, FiUsers, FiFileText,
  FiPlus, FiRefreshCw, FiZap, FiTrendingUp, FiBox,
  FiEye
} from "react-icons/fi";
import { FaCrown, FaStore, FaBolt, FaShieldAlt, FaFire } from "react-icons/fa";
import { toast } from "react-hot-toast";
import "./ProductModeration.css";

const TABS = [
  { key: "all", label: "All Products", icon: <FiShoppingBag />, color: "#6366F1" },
  { key: "pending", label: "Pending", icon: <FiClock />, color: "#F59E0B" },
  { key: "approved", label: "Approved", icon: <FiCheckCircle />, color: "#10B981" },
  { key: "rejected", label: "Rejected", icon: <FiXCircle />, color: "#EF4444" },
  { key: "flagged", label: "Flagged", icon: <FiFlag />, color: "#EF4444" },
  { key: "promoted", label: "Promoted", icon: <FiAward />, color: "#F59E0B" },
  { key: "flashsales", label: "Flash Sales", icon: <FaBolt />, color: "#8B5CF6" }
];

export default function ProductModeration() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  const [products, setProducts] = useState([]);
  const [promotionsMap, setPromotionsMap] = useState({});
  const [promotionsList, setPromotionsList] = useState([]);
  const [promotedIds, setPromotedIds] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const PRODUCTS_PER_PAGE = 12;

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promotionData, setPromotionData] = useState({
    product_id: null,
    title: "",
    tagline: "",
    image_url: "",
    link_url: "",
    starts_at: "",
    ends_at: "",
    priority: 0,
    cta_text: "Shop Now",
    is_featured: false
  });

  const [showFlashModal, setShowFlashModal] = useState(false);
  const [editingFlash, setEditingFlash] = useState(null);
  const [flashData, setFlashData] = useState({
    product_id: null,
    flash_price: "",
    stock_quantity: "",
    starts_at: "",
    ends_at: ""
  });

  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)" },
    admin: { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)" },
    moderator: { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)" },
    support: { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)" },
  };

  const getRoleColor = (role) => roleColors[role] || roleColors.moderator;

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
    { icon: <FiAward />, title: "Promotions", path: "/admin/promotions" },
  ];

  const getImageUrl = async (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    try {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data?.publicUrl || "/placeholder.jpg";
    } catch { return "/placeholder.jpg"; }
  };

  // FIXED: Format price with proper thousands separator
  const formatPrice = (price) => {
    const num = Number(price || 0);
    const rounded = Math.round(num);
    return `KSH ${rounded.toLocaleString('en-KE')}`;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });

  const toLocalInput = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  const fromLocalToISO = (localValue) => {
    if (!localValue) return null;
    const d = new Date(localValue);
    return d.toISOString();
  };

  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
    try {
      const { data } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      
      if (data) {
        setCurrentAdmin(data);
        const hasPerm = data.role === "super_admin" || 
                       data.permissions?.includes("manage_products") || 
                       data.permissions?.includes("all");
        if (!hasPerm) {
          toast.error("You don't have permission to moderate products");
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const withImages = await Promise.all(
        (data || []).map(async (p) => ({
          ...p,
          imageUrl: await getImageUrl(p.image_gallery?.[0] || p.image_url)
        }))
      );
      
      setProducts(withImages);
      setTotalCount(withImages.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    }
  };

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promoted_products")
        .select("*")
        .order("priority", { ascending: false });
      
      if (error) throw error;
      
      const map = {};
      const ids = [];
      (data || []).forEach(r => {
        if (r.product_id) {
          map[r.product_id] = r;
          ids.push(r.product_id);
        }
      });
      
      setPromotionsMap(map);
      setPromotedIds(ids);
      setPromotionsList(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load promotions");
    }
  };

  const fetchFlashSales = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          stores!inner (is_active)
        `)
        .eq("is_flash_sale", true)
        .eq("stores.is_active", true)
        .order("flash_sale_ends_at", { ascending: true });
      
      if (error) throw error;
      
      const salesWithImages = await Promise.all(
        (data || []).map(async (p) => ({
          ...p,
          imageUrl: await getImageUrl(p.image_gallery?.[0] || p.image_url),
          flash_price: p.price * (1 - (p.discount || 0) / 100),
          discount_percentage: p.discount || 0
        }))
      );
      
      setFlashSales(salesWithImages);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load flash sales");
    }
  };

  const expireOldFlashSales = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("products")
        .update({ is_flash_sale: false, discount: 0 })
        .lt("flash_sale_ends_at", now)
        .eq("is_flash_sale", true);
      
      if (error) throw error;
    } catch (err) {
      console.error("Error expiring flash sales:", err);
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await expireOldFlashSales();
      await Promise.all([fetchProducts(), fetchPromotions(), fetchFlashSales()]);
      setLastRefresh(new Date());
      toast.success("Data refreshed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFlag = async (id, current) => {
    setActionLoading(`flag-${id}`);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_flagged: !current })
        .eq("id", id);
      
      if (error) throw error;
      
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, is_flagged: !current } : p
      ));
      toast.success(!current ? "Product flagged successfully" : "Flag removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle flag");
    }
    setActionLoading(null);
  };

  const setProductStatus = async (id, status, visibility) => {
    setActionLoading(`status-${id}`);
    try {
      const { error } = await supabase
        .from("products")
        .update({ status, visibility })
        .eq("id", id);
      
      if (error) throw error;
      
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, status, visibility } : p
      ));
      toast.success(`Product ${status === 'active' ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product status");
    }
    setActionLoading(null);
  };

  const handlePromoSubmit = async () => {
    if (!promotionData.title || !promotionData.image_url) {
      toast.error("Title and image are required");
      return;
    }
    
    setActionLoading('promo-submit');
    try {
      const row = {
        product_id: promotionData.product_id || null,
        title: promotionData.title,
        tagline: promotionData.tagline || null,
        image_url: promotionData.image_url,
        link_url: promotionData.link_url || null,
        starts_at: promotionData.starts_at ? fromLocalToISO(promotionData.starts_at) : null,
        ends_at: promotionData.ends_at ? fromLocalToISO(promotionData.ends_at) : null,
        priority: Number(promotionData.priority) || 0,
        cta_text: promotionData.cta_text || 'Shop Now',
        is_featured: !!promotionData.is_featured,
        active: true,
        promoted_by_admin_id: user?.id
      };
      
      if (editingPromo?.id) {
        const { error } = await supabase
          .from("promoted_products")
          .update(row)
          .eq("id", editingPromo.id);
        
        if (error) throw error;
        toast.success("Promotion updated successfully");
      } else {
        const { error } = await supabase
          .from("promoted_products")
          .insert(row);
        
        if (error) throw error;
        toast.success("Promotion created successfully");
      }
      
      await fetchPromotions();
      setShowPromoModal(false);
      setEditingPromo(null);
      setPromotionData({
        product_id: null,
        title: "",
        tagline: "",
        image_url: "",
        link_url: "",
        starts_at: "",
        ends_at: "",
        priority: 0,
        cta_text: "Shop Now",
        is_featured: false
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save promotion");
    }
    setActionLoading(null);
  };

  const handleFlashSubmit = async () => {
    const { product_id, flash_price, stock_quantity, starts_at, ends_at } = flashData;
    
    if (!product_id || !flash_price || !stock_quantity || !starts_at || !ends_at) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (new Date(starts_at) >= new Date(ends_at)) {
      toast.error("End date must be after start date");
      return;
    }
    
    const product = products.find(p => p.id === product_id);
    const originalPrice = product?.price ?? 0;
    const flashPriceNum = parseFloat(flash_price);
    const calcDiscount = originalPrice > 0 
      ? Math.round(((originalPrice - flashPriceNum) / originalPrice) * 100) 
      : 0;
    
    setActionLoading("flash-submit");
    
    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_flash_sale: true,
          discount: calcDiscount,
          flash_sale_ends_at: fromLocalToISO(ends_at),
          stock_quantity: Number(stock_quantity)
        })
        .eq("id", product_id);
      
      if (error) throw error;
      
      toast.success(editingFlash ? "Flash sale updated successfully" : "Flash sale created successfully");
      await Promise.all([fetchFlashSales(), fetchProducts()]);
      setShowFlashModal(false);
      setEditingFlash(null);
      setFlashData({
        product_id: null,
        flash_price: "",
        stock_quantity: "",
        starts_at: "",
        ends_at: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save flash sale: " + err.message);
    }
    setActionLoading(null);
  };

  const endFlashSale = async (product) => {
    if (!window.confirm("Are you sure you want to end this flash sale?")) return;
    
    setActionLoading(`end-flash-${product.id}`);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_flash_sale: false, discount: 0 })
        .eq("id", product.id);
      
      if (error) throw error;
      
      toast.success("Flash sale ended successfully");
      await Promise.all([fetchFlashSales(), fetchProducts()]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to end flash sale");
    }
    setActionLoading(null);
  };

  const removePromotion = async (promoId) => {
    if (!window.confirm("Are you sure you want to remove this promotion?")) return;
    
    setActionLoading(`remove-promo-${promoId}`);
    try {
      const { error } = await supabase
        .from("promoted_products")
        .delete()
        .eq("id", promoId);
      
      if (error) throw error;
      
      toast.success("Promotion removed successfully");
      await fetchPromotions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove promotion");
    }
    setActionLoading(null);
  };

  const getTimeRemaining = (endsAt) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end - now;
    if (diff <= 0) return { expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, expired: false };
  };

  const getProductStatus = (product) => {
    if (product.is_flagged) return { label: 'Flagged', color: '#EF4444', icon: <FiFlag /> };
    if (product.status === 'active') return { label: 'Approved', color: '#10B981', icon: <FiCheckCircle /> };
    if (product.status === 'rejected') return { label: 'Rejected', color: '#EF4444', icon: <FiXCircle /> };
    return { label: 'Pending', color: '#F59E0B', icon: <FiClock /> };
  };

  const filteredProducts = products
    .filter(p => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q) || 
             (p.description || "").toLowerCase().includes(q) ||
             ((p.category || "") + "").toLowerCase().includes(q);
    })
    .filter(p => {
      switch (activeTab) {
        case "pending": return p.status === "pending";
        case "approved": return p.status === "active";
        case "rejected": return p.status === "rejected";
        case "flagged": return !!p.is_flagged;
        case "promoted": return promotedIds.includes(p.id);
        case "flashsales": return p.is_flash_sale && new Date(p.flash_sale_ends_at) > new Date();
        default: return true;
      }
    });

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  useEffect(() => { checkAdminAccess(); }, [checkAdminAccess]);
  useEffect(() => { if (hasAccess) fetchAllData(); }, [hasAccess]);

  if (!hasAccess || loading) {
    return (
      <div className={`product-modern-root ${darkMode ? "dark" : ""}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading product moderation...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

  return (
    <div className={`product-modern-root ${darkMode ? "dark" : ""}`}>
      <aside className={`modern-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="modern-sidebar-brand">
          <div className="brand-logo" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
            {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">OmniFlow</div>
              <div className="brand-role">{isSuperAdmin ? "Super Admin" : "Admin"}</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)}>
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="modern-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/products" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary }}
              onClick={() => navigate(module.path)}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
            </button>
          ))}
        </nav>

        <div className="modern-sidebar-footer">
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

      <main className="modern-main" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
        <header className="modern-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu /></button>
            <div>
              <h1>Product Moderation</h1>
              <p>Manage products, promotions, and flash sales</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-wrapper">
              <FiSearch />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="refresh-btn" onClick={fetchAllData} title="Refresh data">
              <FiRefreshCw />
            </button>
            <button className="theme-toggle" onClick={toggleDarkMode}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div className="role-badge">
              <div className="role-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
              </div>
              <div>
                <span className="role-name" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase()}</span>
                <span className="role-status">● Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="modern-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><FiShoppingBag /></div>
              <div className="stat-info">
                <span className="stat-value">{totalCount}</span>
                <span className="stat-label">Total Products</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><FiAward /></div>
              <div className="stat-info">
                <span className="stat-value">{promotedIds.length}</span>
                <span className="stat-label">Promoted</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple"><FaBolt /></div>
              <div className="stat-info">
                <span className="stat-value">{flashSales.length}</span>
                <span className="stat-label">Active Flash Sales</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><FiCheckCircle /></div>
              <div className="stat-info">
                <span className="stat-value">{products.filter(p => p.status === 'active').length}</span>
                <span className="stat-label">Approved</span>
              </div>
            </div>
          </div>

          <div className="tabs-container">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                style={activeTab === tab.key ? { '--tab-color': tab.color } : {}}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.key === 'pending' && (
                  <span className="tab-count">{products.filter(p => p.status === 'pending').length}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "promoted" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Promotions & Campaigns</h2>
                <button className="btn-primary" onClick={() => setShowPromoModal(true)}>
                  <FiPlus /> New Promotion
                </button>
              </div>
              {promotionsList.length === 0 ? (
                <div className="empty-state">
                  <FiAward className="empty-icon" />
                  <h3>No promotions yet</h3>
                  <p>Create your first campaign to boost sales</p>
                </div>
              ) : (
                <div className="promo-grid">
                  {promotionsList.map(promo => (
                    <div key={promo.id} className="promo-card">
                      <img src={promo.image_url || "/placeholder.jpg"} alt={promo.title} />
                      <div className="promo-body">
                        <h3>{promo.title}</h3>
                        {promo.tagline && <p>{promo.tagline}</p>}
                        <div className="promo-meta">
                          <FiCalendar /> {formatDate(promo.starts_at)} - {formatDate(promo.ends_at)}
                        </div>
                        <div className="promo-actions">
                          <button className="btn-edit" onClick={() => {
                            setEditingPromo(promo);
                            setPromotionData({
                              product_id: promo.product_id,
                              title: promo.title,
                              tagline: promo.tagline || '',
                              image_url: promo.image_url,
                              link_url: promo.link_url || '',
                              starts_at: toLocalInput(promo.starts_at),
                              ends_at: toLocalInput(promo.ends_at),
                              priority: promo.priority || 0,
                              cta_text: promo.cta_text || 'Shop Now',
                              is_featured: !!promo.is_featured
                            });
                            setShowPromoModal(true);
                          }}>
                            <FiEdit /> Edit
                          </button>
                          <button className="btn-danger" onClick={() => removePromotion(promo.id)}>
                            <FiTrash2 /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "flashsales" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Flash Sales</h2>
                <button className="btn-primary" onClick={() => setShowFlashModal(true)}>
                  <FaBolt /> New Flash Sale
                </button>
              </div>
              {flashSales.length === 0 ? (
                <div className="empty-state">
                  <FaBolt className="empty-icon" />
                  <h3>No active flash sales</h3>
                  <p>Create a flash sale to boost product sales</p>
                </div>
              ) : (
                <div className="flash-grid">
                  {flashSales.map(sale => {
                    const remaining = getTimeRemaining(sale.flash_sale_ends_at);
                    const flashPrice = sale.price * (1 - (sale.discount || 0) / 100);
                    return (
                      <div key={sale.id} className="flash-card">
                        <img src={sale.imageUrl || "/placeholder.jpg"} alt={sale.name} />
                        <div className="flash-body">
                          <h3>{sale.name}</h3>
                          <div className="flash-price">
                            <span className="new">{formatPrice(flashPrice)}</span>
                            <span className="old">{formatPrice(sale.price)}</span>
                            <span className="discount-badge">-{sale.discount || 0}%</span>
                          </div>
                          <div className="flash-progress">
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${((sale.stock_quantity || 0) > 0 ? 100 - ((sale.stock_quantity / (sale.initial_stock || 1)) * 100) : 0)}%` }} />
                            </div>
                            <span>{sale.stock_quantity} left</span>
                          </div>
                          <div className="flash-meta">
                            <FiClock /> {remaining.expired ? 'Expired' : `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`}
                          </div>
                          <div className="flash-actions">
                            <button className="btn-edit" onClick={() => {
                              setEditingFlash(sale);
                              setFlashData({
                                product_id: sale.id,
                                flash_price: flashPrice.toString(),
                                stock_quantity: sale.stock_quantity?.toString() || "",
                                starts_at: toLocalInput(sale.flash_sale_starts_at || sale.created_at),
                                ends_at: toLocalInput(sale.flash_sale_ends_at)
                              });
                              setShowFlashModal(true);
                            }}>
                              <FiEdit /> Edit
                            </button>
                            <button className="btn-danger" onClick={() => endFlashSale(sale)}>
                              <FiXCircle /> End
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab !== "promoted" && activeTab !== "flashsales" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>{TABS.find(t => t.key === activeTab)?.label} Products</h2>
                <span className="product-count">{filteredProducts.length} products</span>
              </div>
              
              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <FiShoppingBag className="empty-icon" />
                  <h3>No products found</h3>
                  <p>Try adjusting your filters or search</p>
                </div>
              ) : (
                <>
                  <div className="products-grid">
                    {paginatedProducts.map(product => {
                      const status = getProductStatus(product);
                      const isPromoted = promotedIds.includes(product.id);
                      const isLoading = actionLoading === `flag-${product.id}` || 
                                       actionLoading === `status-${product.id}` ||
                                       actionLoading === `end-flash-${product.id}`;
                      
                      return (
                        <div key={product.id} className="product-card">
                          <div className="product-image-wrapper">
                            <img 
                              src={product.imageUrl || "/placeholder.jpg"} 
                              alt={product.name}
                              className="product-image"
                              onError={(e) => { e.target.src = "/placeholder.jpg"; }}
                            />
                            <div className="product-badges">
                              <span className={`badge ${status.label.toLowerCase()}`}>
                                {status.icon} {status.label}
                              </span>
                              {isPromoted && <span className="badge promoted"><FiAward /> Promoted</span>}
                              {product.is_flash_sale && <span className="badge flash"><FaBolt /> Flash</span>}
                              {product.is_trending && <span className="badge trending"><FaFire /> Trending</span>}
                            </div>
                            <button 
                              className="view-detail-btn"
                              onClick={() => { setSelectedProduct(product); setShowDetailModal(true); }}
                              title="View product details"
                            >
                              <FiEye />
                            </button>
                          </div>
                          
                          <div className="product-body">
                            <h3>{product.name}</h3>
                            <p className="product-price">{formatPrice(product.price)}</p>
                            <div className="product-meta">
                              <span><FiBox /> Stock: {product.stock_quantity}</span>
                              <span><FiShoppingBag /> {product.category || 'Uncategorized'}</span>
                            </div>
                            
                            <div className="product-actions">
                              <div className="action-row">
                                <button 
                                  className={`btn-flag ${product.is_flagged ? 'active' : ''}`}
                                  onClick={() => toggleFlag(product.id, product.is_flagged)}
                                  disabled={isLoading}
                                >
                                  {isLoading && actionLoading === `flag-${product.id}` ? (
                                    <span className="loading-dots"></span>
                                  ) : (
                                    <>{product.is_flagged ? 'Unflag' : 'Flag'}</>
                                  )}
                                </button>
                                <button 
                                  className="btn-approve"
                                  onClick={() => setProductStatus(product.id, "active", "public")}
                                  disabled={isLoading}
                                >
                                  {isLoading && actionLoading === `status-${product.id}` ? (
                                    <span className="loading-dots"></span>
                                  ) : (
                                    'Approve'
                                  )}
                                </button>
                                <button 
                                  className="btn-reject"
                                  onClick={() => setProductStatus(product.id, "rejected", "private")}
                                  disabled={isLoading}
                                >
                                  {isLoading && actionLoading === `status-${product.id}` ? (
                                    <span className="loading-dots"></span>
                                  ) : (
                                    'Reject'
                                  )}
                                </button>
                              </div>
                              <div className="action-row">
                                {isPromoted ? (
                                  <>
                                    <button 
                                      className="btn-promote"
                                      onClick={() => {
                                        const promo = promotionsMap[product.id];
                                        setEditingPromo(promo);
                                        setPromotionData({
                                          product_id: product.id,
                                          title: promo.title,
                                          tagline: promo.tagline || '',
                                          image_url: promo.image_url,
                                          link_url: promo.link_url || '',
                                          starts_at: toLocalInput(promo.starts_at),
                                          ends_at: toLocalInput(promo.ends_at),
                                          priority: promo.priority || 0,
                                          cta_text: promo.cta_text || 'Shop Now',
                                          is_featured: !!promo.is_featured
                                        });
                                        setShowPromoModal(true);
                                      }}
                                    >
                                      Edit Promo
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    className="btn-promote"
                                    onClick={() => {
                                      setPromotionData({
                                        product_id: product.id,
                                        title: product.name,
                                        tagline: '',
                                        image_url: product.imageUrl || '',
                                        link_url: `/product/${product.id}`,
                                        starts_at: '',
                                        ends_at: '',
                                        priority: 0,
                                        cta_text: 'Shop Now',
                                        is_featured: false
                                      });
                                      setShowPromoModal(true);
                                    }}
                                  >
                                    Promote
                                  </button>
                                )}
                                {product.is_flash_sale ? (
                                  <button 
                                    className="btn-flash"
                                    onClick={() => endFlashSale(product)}
                                    disabled={isLoading}
                                  >
                                    {isLoading && actionLoading === `end-flash-${product.id}` ? (
                                      <span className="loading-dots"></span>
                                    ) : (
                                      'End Flash'
                                    )}
                                  </button>
                                ) : (
                                  <button 
                                    className="btn-flash"
                                    onClick={() => {
                                      setFlashData({
                                        product_id: product.id,
                                        flash_price: "",
                                        stock_quantity: "",
                                        starts_at: "",
                                        ends_at: ""
                                      });
                                      setShowFlashModal(true);
                                    }}
                                  >
                                    Flash Sale
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        disabled={page === 1} 
                        onClick={() => setPage(p => p - 1)}
                      >
                        <FiChevronLeft /> Previous
                      </button>
                      <span className="page-info">Page {page} of {totalPages}</span>
                      <button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(p => p + 1)}
                      >
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

      {/* Promotion Modal */}
      <AnimatePresence>
        {showPromoModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => { setShowPromoModal(false); setEditingPromo(null); }}
          >
            <motion.div 
              className="modal-content premium-modal" 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header premium">
                <div className="modal-header-content">
                  <span className="modal-icon">🚀</span>
                  <h3>{editingPromo ? "Edit Promotion" : "Create Promotion"}</h3>
                </div>
                <button className="modal-close" onClick={() => { setShowPromoModal(false); setEditingPromo(null); }}>
                  <FiXCircle />
                </button>
              </div>
              <div className="modal-body premium">
                <div className="form-group premium">
                  <label>Title <span className="required">*</span></label>
                  <input 
                    type="text" 
                    value={promotionData.title} 
                    onChange={e => setPromotionData({...promotionData, title: e.target.value})}
                    placeholder="Enter promotion title"
                    className="premium-input"
                  />
                </div>
                <div className="form-group premium">
                  <label>Tagline</label>
                  <input 
                    type="text" 
                    value={promotionData.tagline} 
                    onChange={e => setPromotionData({...promotionData, tagline: e.target.value})}
                    placeholder="Short description"
                    className="premium-input"
                  />
                </div>
                <div className="form-group premium">
                  <label>Image URL <span className="required">*</span></label>
                  <input 
                    type="text" 
                    value={promotionData.image_url} 
                    onChange={e => setPromotionData({...promotionData, image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="premium-input"
                  />
                </div>
                <div className="form-group premium">
                  <label>Link URL</label>
                  <input 
                    type="text" 
                    value={promotionData.link_url} 
                    onChange={e => setPromotionData({...promotionData, link_url: e.target.value})}
                    placeholder="/product/123 or https://example.com"
                    className="premium-input"
                  />
                </div>
                <div className="form-row premium">
                  <div className="form-group premium">
                    <label>Start Date</label>
                    <input 
                      type="datetime-local" 
                      value={promotionData.starts_at} 
                      onChange={e => setPromotionData({...promotionData, starts_at: e.target.value})}
                      className="premium-input"
                    />
                  </div>
                  <div className="form-group premium">
                    <label>End Date</label>
                    <input 
                      type="datetime-local" 
                      value={promotionData.ends_at} 
                      onChange={e => setPromotionData({...promotionData, ends_at: e.target.value})}
                      className="premium-input"
                    />
                  </div>
                </div>
                <div className="form-row premium">
                  <div className="form-group premium">
                    <label>Priority</label>
                    <input 
                      type="number" 
                      value={promotionData.priority} 
                      onChange={e => setPromotionData({...promotionData, priority: parseInt(e.target.value) || 0})}
                      placeholder="0"
                      className="premium-input"
                    />
                  </div>
                  <div className="form-group premium">
                    <label>CTA Text</label>
                    <input 
                      type="text" 
                      value={promotionData.cta_text} 
                      onChange={e => setPromotionData({...promotionData, cta_text: e.target.value})}
                      placeholder="Shop Now"
                      className="premium-input"
                    />
                  </div>
                </div>
                <div className="form-group premium checkbox-group">
                  <label className="checkbox-label premium">
                    <input 
                      type="checkbox" 
                      checked={promotionData.is_featured} 
                      onChange={e => setPromotionData({...promotionData, is_featured: e.target.checked})}
                    />
                    <span>Featured Promotion</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer premium">
                <button className="btn-cancel premium" onClick={() => { setShowPromoModal(false); setEditingPromo(null); }}>
                  Cancel
                </button>
                <button 
                  className="btn-submit premium" 
                  onClick={handlePromoSubmit}
                  disabled={actionLoading === 'promo-submit'}
                >
                  {actionLoading === 'promo-submit' ? (
                    <span className="loading-dots"></span>
                  ) : (
                    editingPromo ? 'Update Promotion' : 'Create Promotion'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Sale Modal */}
      <AnimatePresence>
        {showFlashModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => { setShowFlashModal(false); setEditingFlash(null); }}
          >
            <motion.div 
              className="modal-content premium-modal flash-premium" 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header premium flash-header">
                <div className="modal-header-content">
                  <span className="modal-icon flash-icon">⚡</span>
                  <h3>{editingFlash ? "Edit Flash Sale" : "Create Flash Sale"}</h3>
                </div>
                <button className="modal-close" onClick={() => { setShowFlashModal(false); setEditingFlash(null); }}>
                  <FiXCircle />
                </button>
              </div>
              <div className="modal-body premium">
                <div className="form-group premium">
                  <label>Product <span className="required">*</span></label>
                  <select 
                    value={flashData.product_id || ""} 
                    onChange={e => {
                      const pid = e.target.value;
                      const prod = products.find(p => p.id === pid);
                      if (prod) {
                        setFlashData({
                          ...flashData,
                          product_id: pid,
                          flash_price: "",
                          stock_quantity: prod.stock_quantity?.toString() || ""
                        });
                      }
                    }}
                    disabled={!!editingFlash}
                    className="premium-select"
                  >
                    <option value="">Select a product</option>
                    {products
                      .filter(p => p.status === 'active')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {formatPrice(p.price)} (Stock: {p.stock_quantity})
                        </option>
                      ))}
                  </select>
                </div>
                {flashData.product_id && (
                  <>
                    <div className="form-row premium">
                      <div className="form-group premium">
                        <label>Original Price</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={formatPrice(products.find(p => p.id === flashData.product_id)?.price || 0)}
                          className="premium-input readonly"
                        />
                      </div>
                      <div className="form-group premium">
                        <label>Flash Price <span className="required">*</span></label>
                        <input 
                          type="number" 
                          step="1"
                          value={flashData.flash_price} 
                          onChange={e => setFlashData({...flashData, flash_price: e.target.value})}
                          placeholder="Enter flash price"
                          className="premium-input"
                        />
                      </div>
                    </div>
                    <div className="form-group premium">
                      <label>Sale Stock <span className="required">*</span></label>
                      <input 
                        type="number" 
                        value={flashData.stock_quantity} 
                        onChange={e => setFlashData({...flashData, stock_quantity: e.target.value})}
                        placeholder="Number available for flash sale"
                        className="premium-input"
                      />
                    </div>
                    <div className="form-row premium">
                      <div className="form-group premium">
                        <label>Start Date <span className="required">*</span></label>
                        <input 
                          type="datetime-local" 
                          value={flashData.starts_at} 
                          onChange={e => setFlashData({...flashData, starts_at: e.target.value})}
                          className="premium-input"
                        />
                      </div>
                      <div className="form-group premium">
                        <label>End Date <span className="required">*</span></label>
                        <input 
                          type="datetime-local" 
                          value={flashData.ends_at} 
                          onChange={e => setFlashData({...flashData, ends_at: e.target.value})}
                          className="premium-input"
                        />
                      </div>
                    </div>
                    <div className="price-preview premium">
                      <div className="preview-item">
                        <span className="preview-label">Original</span>
                        <span className="preview-value">{formatPrice(products.find(p => p.id === flashData.product_id)?.price || 0)}</span>
                      </div>
                      <div className="preview-divider"></div>
                      <div className="preview-item">
                        <span className="preview-label">Flash</span>
                        <span className="preview-value flash">{flashData.flash_price ? formatPrice(flashData.flash_price) : '—'}</span>
                      </div>
                      <div className="preview-divider"></div>
                      <div className="preview-item">
                        <span className="preview-label">Discount</span>
                        <span className="preview-value discount">
                          {flashData.flash_price && products.find(p => p.id === flashData.product_id) 
                            ? `${Math.round(((products.find(p => p.id === flashData.product_id)?.price || 1) - parseFloat(flashData.flash_price)) / (products.find(p => p.id === flashData.product_id)?.price || 1) * 100)}%`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer premium">
                <button className="btn-cancel premium" onClick={() => { setShowFlashModal(false); setEditingFlash(null); }}>
                  Cancel
                </button>
                <button 
                  className="btn-submit premium flash-submit" 
                  onClick={handleFlashSubmit}
                  disabled={!flashData.product_id || !flashData.flash_price || !flashData.stock_quantity || actionLoading === 'flash-submit'}
                >
                  {actionLoading === 'flash-submit' ? (
                    <span className="loading-dots"></span>
                  ) : (
                    editingFlash ? 'Update Flash Sale' : 'Create Flash Sale'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedProduct && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div 
              className="modal-content premium-modal detail-premium" 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header premium detail-header">
                <div className="modal-header-content">
                  <span className="modal-icon">📦</span>
                  <h3>Product Details</h3>
                </div>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                  <FiXCircle />
                </button>
              </div>
              <div className="modal-body premium detail-body">
                <div className="detail-image-wrapper">
                  <img src={selectedProduct.imageUrl || "/placeholder.jpg"} alt={selectedProduct.name} />
                </div>
                <div className="detail-info premium">
                  <h2>{selectedProduct.name}</h2>
                  <p className="detail-price premium">{formatPrice(selectedProduct.price)}</p>
                  <p className="detail-desc premium">{selectedProduct.description || 'No description available'}</p>
                  <div className="detail-grid premium">
                    <div className="detail-item">
                      <span className="detail-label">Category</span>
                      <span className="detail-value">{selectedProduct.category || 'Uncategorized'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Stock</span>
                      <span className="detail-value">{selectedProduct.stock_quantity}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className={`detail-value status-${selectedProduct.status}`}>{selectedProduct.status}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Visibility</span>
                      <span className="detail-value">{selectedProduct.visibility}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created</span>
                      <span className="detail-value">{formatDate(selectedProduct.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Views</span>
                      <span className="detail-value">{selectedProduct.views || 0}</span>
                    </div>
                  </div>
                  {selectedProduct.tags?.length > 0 && (
                    <div className="detail-tags premium">
                      <span className="tags-label">Tags</span>
                      <div className="tags-list">
                        {selectedProduct.tags.map((tag, i) => (
                          <span key={i} className="tag premium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}