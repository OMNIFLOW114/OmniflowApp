// src/pages/admin/ProductModeration.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiFilter, FiChevronLeft, FiChevronRight,
  FiShoppingBag, FiFlag, FiCheckCircle, FiXCircle,
  FiEye, FiEyeOff, FiStar, FiEdit, FiTrash2,
  FiCalendar, FiDollarSign,  FiImage, FiLink,
  FiAward, FiClock, FiBarChart2, FiMenu, FiBell,
  FiLogOut, FiHome, FiSettings, FiMessageSquare,
  FiShoppingCart, FiPackage, FiCreditCard, FiDatabase,
  FiClipboard, FiUserPlus, FiUsers, FiFileText
} from "react-icons/fi";
import { FaCrown, FaStore, FaBan, FaCheck, FaExclamationTriangle, FaBolt, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";
import "./ProductModeration.css";

const TABS = [
  { key: "all", label: "All Products", icon: <FiShoppingBag /> },
  { key: "pending", label: "Pending", icon: <FiClock /> },
  { key: "approved", label: "Approved", icon: <FiCheckCircle /> },
  { key: "rejected", label: "Rejected", icon: <FiXCircle /> },
  { key: "flagged", label: "Flagged", icon: <FiFlag /> },
  { key: "promoted", label: "Promoted", icon: <FiAward /> },
  { key: "flashsales", label: "Flash Sales", icon: <FaBolt /> }
];

// Cache manager
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Skeleton Components
const ProductCardSkeleton = () => (
  <div className="product-card-skeleton">
    <div className="sk-pulse" style={{ height: 180, width: "100%", borderRadius: "16px 16px 0 0" }} />
    <div className="product-info-skeleton">
      <div className="sk-pulse" style={{ width: "80%", height: 20, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: "40%", height: 24, marginBottom: 12 }} />
      <div className="sk-pulse" style={{ width: "100%", height: 32, borderRadius: 8 }} />
    </div>
  </div>
);

const PromoCardSkeleton = () => (
  <div className="promo-card-skeleton">
    <div className="sk-pulse" style={{ height: 160, width: "100%" }} />
    <div className="promo-info-skeleton">
      <div className="sk-pulse" style={{ width: "70%", height: 20, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: "90%", height: 14, marginBottom: 12 }} />
      <div className="sk-pulse" style={{ width: "50%", height: 14, marginBottom: 16 }} />
      <div className="sk-pulse" style={{ width: "60%", height: 28, borderRadius: 20 }} />
    </div>
  </div>
);

export default function ProductModeration() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Original data state
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

  const PRODUCTS_PER_PAGE = 12;

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promotionData, setPromotionData] = useState({
    product: null,
    product_id: null,
    title: "",
    tagline: "",
    image_url: "",
    hover_image_url: "",
    link_url: "",
    starts_at: "",
    ends_at: "",
    priority: 0,
    type: "",
    background_color: "",
    cta_text: "Shop Now",
    is_featured: false,
    display_position: "",
    internal_notes: "",
  });

  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState(null);
  const [flashSaleData, setFlashSaleData] = useState({
    product_id: null,
    flash_price: 0,
    discount_percentage: 0,
    stock_quantity: 0,
    max_quantity_per_user: 1,
    starts_at: "",
    ends_at: "",
    is_featured: false
  });

  // Role colors
  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)", accent: "rgba(245,158,11,0.15)" },
    admin: { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)", accent: "rgba(239,68,68,0.15)" },
    moderator: { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)", accent: "rgba(99,102,241,0.15)" },
    support: { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)", accent: "rgba(16,185,129,0.15)" },
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
    { icon: <FiCreditCard />, title: "Wallets", path: "/admin/wallet", perm: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings", perm: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments", perm: "manage_installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports", perm: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Users", path: "/admin/admins", perm: "manage_admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings", perm: "manage_settings" },
    { icon: <FiDatabase />, title: "Database", path: "/admin/database", perm: "manage_database" },
    { icon: <FiAward />, title: "Promotions", path: "/admin/promotions", perm: "manage_promotions" },
  ];

  // Permission check
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
        const hasPerm = data.role === "super_admin" || data.permissions?.includes("manage_products") || data.permissions?.includes("all");
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

  // Original helper functions
  const getImageUrl = async (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    try {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data?.publicUrl || "/placeholder.jpg";
    } catch { return "/placeholder.jpg"; }
  };

  const expireOldPromotions = async () => {
    const now = new Date().toISOString();
    await supabase.from("promoted_products").update({ active: false }).lt("ends_at", now).eq("active", true);
  };

  const expireOldFlashSales = async () => {
    const now = new Date().toISOString();
    await supabase.from("products").update({ is_flash_sale: false, discount: 0 }).lt("flash_sale_ends_at", now).eq("is_flash_sale", true);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const withImages = await Promise.all((data || []).map(async (p) => ({ ...p, imageUrl: await getImageUrl(p.image_gallery?.[0] || p.image_url) })));
      setProducts(withImages);
      setTotalCount(withImages.length);
    } catch (err) { console.error(err); toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase.from("promoted_products").select("*").order("priority", { ascending: false });
      if (error) throw error;
      const map = {}; const ids = [];
      (data || []).forEach(r => { if (r.product_id) { map[r.product_id] = r; ids.push(r.product_id); } else { map[`promo_${r.id}`] = r; } });
      setPromotionsMap(map); setPromotedIds(ids); setPromotionsList(data || []);
    } catch (err) { console.error(err); toast.error("Failed to load promotions"); }
  };

  const fetchFlashSales = async () => {
    try {
      const { data, error } = await supabase.from("products").select(`*, stores!inner (is_active)`).eq("is_flash_sale", true).eq("stores.is_active", true).order("flash_sale_ends_at", { ascending: true });
      if (error) throw error;
      const salesWithImages = await Promise.all((data || []).map(async (p) => ({ ...p, imageUrl: await getImageUrl(p.image_gallery?.[0] || p.image_url), flash_price: p.price * (1 - (p.discount || 0) / 100), discount_percentage: p.discount || 0 })));
      setFlashSales(salesWithImages);
    } catch (err) { console.error(err); toast.error("Failed to load flash sales"); }
  };

  const fetchAllData = useCallback(async () => {
    const cacheKey = "product-moderation-data";
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setProducts(cached.products);
      setPromotionsMap(cached.promotionsMap);
      setPromotionsList(cached.promotionsList);
      setPromotedIds(cached.promotedIds);
      setFlashSales(cached.flashSales);
      setTotalCount(cached.totalCount);
      setLastRefresh(cached.lastRefresh);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await expireOldPromotions();
      await expireOldFlashSales();
      await Promise.all([fetchProducts(), fetchPromotions(), fetchFlashSales()]);
      const now = new Date();
      setLastRefresh(now);
      cache.set(cacheKey, {
        products, promotionsMap, promotionsList, promotedIds, flashSales, totalCount,
        lastRefresh: now, timestamp: Date.now()
      });
    } catch (err) { console.error(err); toast.error("Failed to initialize moderation panel"); }
    finally { setLoading(false); }
  }, []);

  // Original actions
  const toggleFlag = async (id, current) => {
    setActionLoading(`flag-${id}`);
    try {
      const { error } = await supabase.from("products").update({ is_flagged: !current }).eq("id", id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_flagged: !current } : p));
      toast.success(!current ? "Product flagged" : "Flag removed");
    } catch (err) { console.error(err); toast.error("Failed to toggle flag"); }
    setActionLoading(null);
  };

  const setStatus = async (id, status, visibility) => {
    setActionLoading(`status-${id}`);
    try {
      const { error } = await supabase.from("products").update({ status, visibility }).eq("id", id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status, visibility } : p));
      toast.success(`Product set to ${status}/${visibility}`);
    } catch (err) { console.error(err); toast.error("Failed to update product status"); }
    setActionLoading(null);
  };

  const openPromotionModal = (product = null, existingPromo = null) => {
    if (existingPromo) {
      setEditingPromo(existingPromo);
      setPromotionData({
        product: product || null,
        product_id: existingPromo.product_id || null,
        title: existingPromo.title || (product ? product.name : ""),
        tagline: existingPromo.tagline || "",
        image_url: existingPromo.image_url || (product ? product.imageUrl : ""),
        hover_image_url: existingPromo.hover_image_url || "",
        link_url: existingPromo.link_url || "",
        starts_at: existingPromo.starts_at ? toLocalInput(existingPromo.starts_at) : "",
        ends_at: existingPromo.ends_at ? toLocalInput(existingPromo.ends_at) : "",
        priority: existingPromo.priority || 0,
        type: existingPromo.type || "",
        background_color: existingPromo.background_color || "",
        cta_text: existingPromo.cta_text || "Shop Now",
        is_featured: !!existingPromo.is_featured,
        display_position: existingPromo.display_position || "",
        internal_notes: existingPromo.internal_notes || "",
      });
    } else {
      setEditingPromo(null);
      setPromotionData({
        product: product || null,
        product_id: product?.id || null,
        title: product?.name || "",
        tagline: "",
        image_url: product?.imageUrl || "",
        hover_image_url: "",
        link_url: product ? `/product/${product.id}` : "",
        starts_at: "",
        ends_at: "",
        priority: 0,
        type: "",
        background_color: "",
        cta_text: "Shop Now",
        is_featured: false,
        display_position: "",
        internal_notes: "",
      });
    }
    setShowModal(true);
  };

  const openFlashSaleModal = (product = null, existingFlashSale = null) => {
    if (existingFlashSale) {
      setEditingFlashSale(existingFlashSale);
      setFlashSaleData({
        product_id: existingFlashSale.id,
        flash_price: existingFlashSale.price * (1 - (existingFlashSale.discount || 0) / 100),
        discount_percentage: existingFlashSale.discount || 0,
        stock_quantity: existingFlashSale.stock_quantity || 0,
        max_quantity_per_user: 1,
        starts_at: existingFlashSale.flash_sale_starts_at ? toLocalInput(existingFlashSale.flash_sale_starts_at) : "",
        ends_at: existingFlashSale.flash_sale_ends_at ? toLocalInput(existingFlashSale.flash_sale_ends_at) : "",
        is_featured: !!existingFlashSale.is_featured
      });
    } else {
      setEditingFlashSale(null);
      setFlashSaleData({
        product_id: product?.id || null,
        flash_price: product?.price || 0,
        discount_percentage: 0,
        stock_quantity: product?.stock_quantity || 0,
        max_quantity_per_user: 1,
        starts_at: "",
        ends_at: "",
        is_featured: false
      });
    }
    setShowFlashSaleModal(true);
  };

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

  const handlePromoteSubmit = async () => {
    const { product_id, title, tagline, image_url, hover_image_url, link_url, starts_at, ends_at, priority, type, background_color, cta_text, is_featured, display_position, internal_notes } = promotionData;
    if (!title || !image_url) return toast.error("Title and image are required");
    setActionLoading('promo-submit');
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const adminId = authUser?.user?.id || null;
      const row = {
        product_id: product_id || null, title, tagline: tagline || null, image_url, hover_image_url: hover_image_url || null, link_url: link_url || null,
        starts_at: starts_at ? fromLocalToISO(starts_at) : null, ends_at: ends_at ? fromLocalToISO(ends_at) : null, priority: Number(priority) || 0,
        type: type || null, background_color: background_color || null, cta_text: cta_text || "Shop Now", is_featured: !!is_featured,
        display_position: display_position || null, internal_notes: internal_notes || null, active: true, promoted_by_admin_id: adminId,
      };
      if (editingPromo && editingPromo.id) {
        const { error } = await supabase.from("promoted_products").update(row).eq("id", editingPromo.id);
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        const { error } = await supabase.from("promoted_products").insert(row);
        if (error) throw error;
        toast.success("Promotion created");
      }
      await fetchPromotions();
      setShowModal(false);
      setEditingPromo(null);
    } catch (err) { console.error(err); toast.error("Failed to save promotion"); }
    setActionLoading(null);
  };

  const handleFlashSaleSubmit = async () => {
    const { product_id, flash_price, stock_quantity, starts_at, ends_at, is_featured } = flashSaleData;
    if (!product_id || !flash_price || !stock_quantity || !starts_at || !ends_at) return toast.error("Please fill all required fields");
    if (new Date(starts_at) >= new Date(ends_at)) return toast.error("End date must be after start date");
    const product = products.find(p => p.id === product_id);
    const originalPrice = product?.price ?? 0;
    const calcDiscount = originalPrice > 0 ? Math.round(((originalPrice - flash_price) / originalPrice) * 100) : 0;
    setActionLoading("flashsale-submit");
    try {
      const updateData = { is_flash_sale: true, discount: calcDiscount, flash_sale_ends_at: fromLocalToISO(ends_at), stock_quantity: Number(stock_quantity), is_featured: !!is_featured };
      const { error } = await supabase.from("products").update(updateData).eq("id", product_id);
      if (error) throw error;
      toast.success(editingFlashSale ? "Flash sale updated" : "Flash sale created");
      await Promise.all([fetchFlashSales(), fetchProducts()]);
      setShowFlashSaleModal(false);
      setEditingFlashSale(null);
    } catch (err) { console.error(err); toast.error("Failed to save flash sale"); }
    setActionLoading(null);
  };

  const unpromote = async (productOrPromo) => {
    if (!productOrPromo) return;
    if (!window.confirm("Are you sure you want to remove this promotion?")) return;
    setActionLoading(`unpromote-${productOrPromo.id || productOrPromo.product_id}`);
    try {
      if (productOrPromo.product_id) {
        const { error } = await supabase.from("promoted_products").delete().eq("product_id", productOrPromo.product_id);
        if (error) throw error;
      } else if (productOrPromo.id) {
        const { error } = await supabase.from("promoted_products").delete().eq("id", productOrPromo.id);
        if (error) throw error;
      }
      toast.success("Promotion removed");
      await fetchPromotions();
    } catch (err) { console.error(err); toast.error("Failed to remove promotion"); }
    setActionLoading(null);
  };

  const endFlashSale = async (product) => {
    if (!window.confirm("Are you sure you want to end this flash sale?")) return;
    setActionLoading(`end-flashsale-${product.id}`);
    try {
      const { error } = await supabase.from("products").update({ is_flash_sale: false, discount: 0 }).eq("id", product.id);
      if (error) throw error;
      toast.success("Flash sale ended");
      await Promise.all([fetchFlashSales(), fetchProducts()]);
    } catch (err) { console.error(err); toast.error("Failed to end flash sale"); }
    setActionLoading(null);
  };

  const getTimeRemaining = (endsAt) => {
    const now = new Date(); const end = new Date(endsAt); const diff = end - now;
    if (diff <= 0) return { expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, expired: false };
  };

  const getSalesProgress = (product) => {
    const initialStock = product.initial_stock || product.stock_quantity;
    const sold = initialStock - product.stock_quantity;
    const progress = initialStock > 0 ? (sold / initialStock) * 100 : 0;
    return { sold, progress };
  };

  const filteredProducts = products
    .filter(p => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || ((p.category || "") + "").toLowerCase().includes(q);
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
  const paginatedProducts = filteredProducts.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  const getProductStatus = (product) => {
    if (product.is_flagged) return { label: 'Flagged', color: '#EF4444', icon: <FiFlag /> };
    if (product.status === 'active') return { label: 'Approved', color: '#10B981', icon: <FiCheckCircle /> };
    if (product.status === 'rejected') return { label: 'Rejected', color: '#EF4444', icon: <FiXCircle /> };
    return { label: 'Pending', color: '#F59E0B', icon: <FiClock /> };
  };
  const formatPrice = (price) => `KSH ${Number(price || 0).toLocaleString()}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Effects
  useEffect(() => { checkAdminAccess(); }, [checkAdminAccess]);
  useEffect(() => { if (hasAccess) fetchAllData(); }, [hasAccess, fetchAllData]);

  // Loading state with skeleton
  if (!hasAccess || loading) {
    return (
      <div className={`product-modern-root ${darkMode ? "dark" : ""}`}>
        <aside className={`modern-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="modern-sidebar-brand">
            <div className="sk-pulse" style={{ width: 40, height: 40, borderRadius: 12 }} />
            {!sidebarCollapsed && <div className="sk-pulse" style={{ width: 100, height: 16, marginLeft: 12 }} />}
          </div>
          <div className="modern-sidebar-nav">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="nav-item-skeleton">
                <div className="sk-pulse" style={{ width: 24, height: 24, borderRadius: 6 }} />
                {!sidebarCollapsed && <div className="sk-pulse" style={{ width: "70%", height: 14 }} />}
              </div>
            ))}
          </div>
        </aside>
        <main className="modern-main">
          <div className="modern-topbar">
            <div className="sk-pulse" style={{ width: 200, height: 24, borderRadius: 6 }} />
            <div className="sk-pulse" style={{ width: 300, height: 36, borderRadius: 40 }} />
          </div>
          <div className="modern-content">
            <div className="stats-row">
              {[1,2,3].map(i => (
                <div key={i} className="stat-block skeleton">
                  <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
                  <div><div className="sk-pulse" style={{ width: 60, height: 28 }} /><div className="sk-pulse" style={{ width: 80, height: 14, marginTop: 4 }} /></div>
                </div>
              ))}
            </div>
            <div className="tabs-pill">
              {[1,2,3,4,5,6,7].map(i => <div key={i} className="sk-pulse" style={{ width: 100, height: 36, borderRadius: 40 }} />)}
            </div>
            <div className="cards-grid">
              {[1,2,3,4,5,6].map(i => <ProductCardSkeleton key={i} />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

  return (
    <div className={`product-modern-root ${darkMode ? "dark" : ""}`}>
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div className="sidebar-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`modern-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="modern-sidebar-brand">
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

        <nav className="modern-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/products" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
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
          <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); navigate("/admin-auth"); }}>
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
              <p>Approve, reject, and manage promotions & flash sales • Last updated {lastRefresh ? formatDate(lastRefresh) : 'never'}</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-wrapper">
              <FiSearch />
              <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="theme-toggle" onClick={toggleDarkMode}>{darkMode ? "☀️" : "🌙"}</button>
            <div className="role-badge">
              <div className="role-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
              </div>
              <div>
                <span className="role-name" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase()}</span>
                <span className="role-status">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="modern-content">
          {/* Stats Cards */}
          <div className="stats-row">
            <div className="stat-block">
              <div className="stat-icon"><FiShoppingBag /></div>
              <div><span className="stat-value">{totalCount}</span><span className="stat-label">Total Products</span></div>
            </div>
            <div className="stat-block">
              <div className="stat-icon"><FiAward /></div>
              <div><span className="stat-value">{promotedIds.length}</span><span className="stat-label">Promoted</span></div>
            </div>
            <div className="stat-block">
              <div className="stat-icon"><FaBolt /></div>
              <div><span className="stat-value">{flashSales.length}</span><span className="stat-label">Flash Sales</span></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-pill">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`pill ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Promoted Tab */}
          {activeTab === "promoted" && (
            <div className="promoted-section">
              <div className="section-header">
                <h2>Promotions & Campaigns</h2>
                <button className="create-btn" onClick={() => openPromotionModal(null, null)}><FiAward /> Create Campaign</button>
              </div>
              {promotionsList.length === 0 ? (
                <div className="empty-state"><FiAward /><h3>No promotions</h3><p>Create your first campaign</p></div>
              ) : (
                <div className="cards-grid">
                  {promotionsList.map(promo => {
                    const linkedProduct = promo.product_id ? products.find(x => x.id === promo.product_id) : null;
                    return (
                      <div key={promo.id} className="promo-card-modern">
                        <img src={promo.image_url || "/placeholder.jpg"} alt={promo.title} />
                        <div className="promo-info">
                          <h3>{promo.title}</h3>
                          {promo.tagline && <p>{promo.tagline}</p>}
                          <div className="promo-meta"><FiCalendar /> {promo.starts_at ? formatDate(promo.starts_at) : 'No start'} – {promo.ends_at ? formatDate(promo.ends_at) : 'No end'}</div>
                          <div className="promo-actions">
                            <button onClick={() => openPromotionModal(linkedProduct || null, promo)}><FiEdit /> Edit</button>
                            <button onClick={() => unpromote(promo)}><FiTrash2 /> Remove</button>
                            {promo.link_url && <a href={promo.link_url} target="_blank" rel="noreferrer"><FiLink /> Visit</a>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Flash Sales Tab */}
          {activeTab === "flashsales" && (
            <div className="flashsales-section">
              <div className="section-header">
                <h2>Flash Sales</h2>
                <button className="create-btn" onClick={() => openFlashSaleModal(null, null)}><FaBolt /> Create Flash Sale</button>
              </div>
              {flashSales.length === 0 ? (
                <div className="empty-state"><FaBolt /><h3>No active flash sales</h3><p>Create one to boost sales</p></div>
              ) : (
                <div className="cards-grid">
                  {flashSales.map(sale => {
                    const timeRemaining = getTimeRemaining(sale.flash_sale_ends_at);
                    const progress = getSalesProgress(sale);
                    const flashPrice = sale.price * (1 - (sale.discount || 0) / 100);
                    return (
                      <div key={sale.id} className="flash-card-modern">
                        <img src={sale.imageUrl || "/placeholder.jpg"} alt={sale.name} />
                        <div className="flash-info">
                          <h3>{sale.name}</h3>
                          <div className="flash-price"><span className="new">{formatPrice(flashPrice)}</span> <span className="old">{formatPrice(sale.price)}</span></div>
                          <div className="flash-progress"><div className="bar" style={{ width: `${progress.progress}%` }} /><span>{progress.sold} sold / {sale.stock_quantity} left</span></div>
                          <div className="flash-meta"><FiClock /> Ends in {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m</div>
                          <div className="flash-actions">
                            <button onClick={() => openFlashSaleModal(null, sale)}><FiEdit /> Edit</button>
                            <button onClick={() => endFlashSale(sale)}><FiXCircle /> End</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab !== "promoted" && activeTab !== "flashsales" && (
            <div className="products-section">
              <div className="section-header">
                <h2>{TABS.find(t => t.key === activeTab)?.label} Products <span>({filteredProducts.length})</span></h2>
              </div>
              {filteredProducts.length === 0 ? (
                <div className="empty-state"><FiShoppingBag /><h3>No products</h3><p>Try a different filter</p></div>
              ) : (
                <>
                  <div className="cards-grid">
                    {paginatedProducts.map(product => {
                      const status = getProductStatus(product);
                      const promoted = promotedIds.includes(product.id);
                      return (
                        <div key={product.id} className="product-card-modern">
                          <img src={product.imageUrl || "/placeholder.jpg"} alt={product.name} />
                          <div className="product-badges">
                            <span className="badge-status" style={{ background: `${status.color}20`, color: status.color }}>{status.icon} {status.label}</span>
                            {promoted && <span className="badge-promoted"><FiAward /> Promoted</span>}
                            {product.is_flash_sale && <span className="badge-flash"><FaBolt /> Flash</span>}
                          </div>
                          <div className="product-info">
                            <h3>{product.name}</h3>
                            <p className="price">{formatPrice(product.price)}</p>
                            <div className="product-actions-row">
                              <div className="action-group">
                                <button className={`flag ${product.is_flagged ? 'active' : ''}`} onClick={() => toggleFlag(product.id, product.is_flagged)} disabled={actionLoading === `flag-${product.id}`}>
                                  {actionLoading === `flag-${product.id}` ? <div className="loading-dots" /> : <>{product.is_flagged ? 'Unflag' : 'Flag'}</>}
                                </button>
                                <button className="approve" onClick={() => setStatus(product.id, "active", "public")} disabled={actionLoading === `status-${product.id}`}>
                                  {actionLoading === `status-${product.id}` ? <div className="loading-dots" /> : 'Approve'}
                                </button>
                                <button className="reject" onClick={() => setStatus(product.id, "rejected", "private")} disabled={actionLoading === `status-${product.id}`}>
                                  {actionLoading === `status-${product.id}` ? <div className="loading-dots" /> : 'Reject'}
                                </button>
                              </div>
                              <div className="action-group">
                                {promoted ? (
                                  <>
                                    <button className="unpromote" onClick={() => unpromote({ product_id: product.id })} disabled={actionLoading === `unpromote-${product.id}`}>
                                      {actionLoading === `unpromote-${product.id}` ? <div className="loading-dots" /> : 'Unpromote'}
                                    </button>
                                    <button className="edit-promo" onClick={() => openPromotionModal(product, promotionsMap[product.id])}>Edit Promo</button>
                                  </>
                                ) : (
                                  <button className="promote" onClick={() => openPromotionModal(product, null)}>Promote</button>
                                )}
                                {product.is_flash_sale ? (
                                  <button className="end-flash" onClick={() => endFlashSale(product)} disabled={actionLoading === `end-flashsale-${product.id}`}>
                                    {actionLoading === `end-flashsale-${product.id}` ? <div className="loading-dots" /> : 'End Flash'}
                                  </button>
                                ) : (
                                  <button className="create-flash" onClick={() => openFlashSaleModal(product, null)}>Flash Sale</button>
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
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><FiChevronLeft /> Prev</button>
                      <span>{page} / {totalPages}</span>
                      <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next <FiChevronRight /></button>
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
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
            <motion.div className="modal-modern" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>{editingPromo ? "Edit Promotion" : "New Promotion"}</h3><button className="close" onClick={() => setShowModal(false)}><FiXCircle /></button></div>
              <div className="modal-body">
                <div className="form-row"><input type="text" placeholder="Title *" value={promotionData.title} onChange={e => setPromotionData({...promotionData, title: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="Tagline" value={promotionData.tagline} onChange={e => setPromotionData({...promotionData, tagline: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="Image URL *" value={promotionData.image_url} onChange={e => setPromotionData({...promotionData, image_url: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="Hover Image URL" value={promotionData.hover_image_url} onChange={e => setPromotionData({...promotionData, hover_image_url: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="Link URL" value={promotionData.link_url} onChange={e => setPromotionData({...promotionData, link_url: e.target.value})} /></div>
                <div className="form-row"><input type="datetime-local" value={promotionData.starts_at} onChange={e => setPromotionData({...promotionData, starts_at: e.target.value})} /><input type="datetime-local" value={promotionData.ends_at} onChange={e => setPromotionData({...promotionData, ends_at: e.target.value})} /></div>
                <div className="form-row"><input type="number" placeholder="Priority" value={promotionData.priority} onChange={e => setPromotionData({...promotionData, priority: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="Type" value={promotionData.type} onChange={e => setPromotionData({...promotionData, type: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="Background Color" value={promotionData.background_color} onChange={e => setPromotionData({...promotionData, background_color: e.target.value})} /></div>
                <div className="form-row"><input type="text" placeholder="CTA Text" value={promotionData.cta_text} onChange={e => setPromotionData({...promotionData, cta_text: e.target.value})} /></div>
                <div className="form-row"><label>Featured</label><select value={promotionData.is_featured ? "1" : "0"} onChange={e => setPromotionData({...promotionData, is_featured: e.target.value === "1"})}><option value="0">No</option><option value="1">Yes</option></select></div>
                <div className="form-row"><input type="text" placeholder="Display Position" value={promotionData.display_position} onChange={e => setPromotionData({...promotionData, display_position: e.target.value})} /></div>
                <div className="form-row"><textarea placeholder="Internal Notes" rows="3" value={promotionData.internal_notes} onChange={e => setPromotionData({...promotionData, internal_notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button className="cancel" onClick={() => setShowModal(false)}>Cancel</button><button className="submit" onClick={handlePromoteSubmit} disabled={actionLoading === 'promo-submit'}>{actionLoading === 'promo-submit' ? 'Saving...' : (editingPromo ? 'Save' : 'Create')}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Sale Modal */}
      <AnimatePresence>
        {showFlashSaleModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFlashSaleModal(false)}>
            <motion.div className="modal-modern flash-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>{editingFlashSale ? "Edit Flash Sale" : "New Flash Sale"}</h3><button className="close" onClick={() => setShowFlashSaleModal(false)}><FiXCircle /></button></div>
              <div className="modal-body">
                <div className="form-row full">
                  <select value={flashSaleData.product_id || ""} onChange={e => { const pid = e.target.value; const prod = products.find(p => p.id === pid); if (prod) setFlashSaleData({ ...flashSaleData, product_id: pid, flash_price: prod.price, stock_quantity: prod.stock_quantity || 0 }); }} disabled={!!editingFlashSale}>
                    <option value="">Select a product</option>
                    {products.filter(p => p.status === 'active' && p.visibility === 'public').map(p => <option key={p.id} value={p.id}>{p.name} - {formatPrice(p.price)} (Stock: {p.stock_quantity})</option>)}
                  </select>
                </div>
                {flashSaleData.product_id && (
                  <>
                    <div className="form-row"><input type="text" readOnly value={formatPrice(products.find(p => p.id === flashSaleData.product_id)?.price || 0)} placeholder="Original price" /></div>
                    <div className="form-row"><input type="number" step="0.01" value={flashSaleData.flash_price} onChange={e => { const fp = Number(e.target.value); const orig = products.find(p => p.id === flashSaleData.product_id)?.price || 0; const disc = orig > 0 ? ((orig - fp) / orig) * 100 : 0; setFlashSaleData({ ...flashSaleData, flash_price: fp, discount_percentage: Math.round(disc) }); }} placeholder="Flash price *" /></div>
                    <div className="form-row"><input type="number" value={flashSaleData.stock_quantity} onChange={e => setFlashSaleData({ ...flashSaleData, stock_quantity: e.target.value })} placeholder="Sale stock *" /></div>
                    <div className="form-row"><input type="datetime-local" value={flashSaleData.starts_at} onChange={e => setFlashSaleData({ ...flashSaleData, starts_at: e.target.value })} /><input type="datetime-local" value={flashSaleData.ends_at} onChange={e => setFlashSaleData({ ...flashSaleData, ends_at: e.target.value })} /></div>
                    <div className="form-row"><label>Featured</label><select value={flashSaleData.is_featured ? "1" : "0"} onChange={e => setFlashSaleData({ ...flashSaleData, is_featured: e.target.value === "1" })}><option value="0">No</option><option value="1">Yes</option></select></div>
                    <div className="price-preview">
                      <span>Original: {formatPrice(products.find(p => p.id === flashSaleData.product_id)?.price || 0)}</span>
                      <span>Flash: {formatPrice(flashSaleData.flash_price)}</span>
                      <span>Discount: {flashSaleData.discount_percentage}%</span>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer"><button className="cancel" onClick={() => setShowFlashSaleModal(false)}>Cancel</button><button className="submit" onClick={handleFlashSaleSubmit} disabled={!flashSaleData.product_id || actionLoading === 'flashsale-submit'}>{actionLoading === 'flashsale-submit' ? 'Saving...' : (editingFlashSale ? 'Save' : 'Create')}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}