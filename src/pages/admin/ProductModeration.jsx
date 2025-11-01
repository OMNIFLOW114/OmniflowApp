import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight,
  FiShoppingBag,
  FiFlag,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiEyeOff,
  FiStar,
  FiEdit,
  FiTrash2,
  FiCalendar,
  FiDollarSign,
  FiTag,
  FiImage,
  FiLink,
  FiAward,
  FiClock,
  FiBarChart2
} from "react-icons/fi";
import { FaCrown, FaStore, FaBan, FaCheck, FaExclamationTriangle, FaBolt } from "react-icons/fa";
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

export default function ProductModeration() {
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

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await expireOldPromotions();
        await expireOldFlashSales();
        await Promise.all([fetchProducts(), fetchPromotions(), fetchFlashSales()]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to initialize moderation panel");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const expireOldPromotions = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("promoted_products")
        .update({ active: false })
        .lt("ends_at", now)
        .eq("active", true);

      if (error) {
        console.warn("Could not auto-expire promotions:", error.message);
      }
    } catch (err) {
      console.warn("expireOldPromotions failed", err);
    }
  };

  const expireOldFlashSales = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("products")
        .update({ 
          is_flash_sale: false,
          discount: 0
        })
        .lt("flash_sale_ends_at", now)
        .eq("is_flash_sale", true);

      if (error) {
        console.warn("Could not auto-expire flash sales:", error.message);
      }
    } catch (err) {
      console.warn("expireOldFlashSales failed", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return setProducts([]);

      const withImages = await Promise.all(
        data.map(async (p) => ({
          ...p,
          imageUrl: await getImageUrl(p.image_gallery?.[0] || p.image_url),
        }))
      );

      setProducts(withImages);
      setTotalCount(withImages.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
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
      (data || []).forEach((r) => {
        if (r.product_id) {
          map[r.product_id] = r;
          ids.push(r.product_id);
        } else {
          map[`promo_${r.id}`] = r;
        }
      });

      setPromotionsMap(map);
      setPromotedIds(ids);
      setPromotionsList(data || []);
    } catch (err) {
      console.error("fetchPromotions error", err);
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
        (data || []).map(async (product) => ({
          ...product,
          imageUrl: await getImageUrl(product.image_gallery?.[0] || product.image_url),
          flash_price: product.price * (1 - (product.discount || 0) / 100),
          discount_percentage: product.discount || 0
        }))
      );
      
      setFlashSales(salesWithImages);
    } catch (err) {
      console.error("fetchFlashSales error", err);
      toast.error("Failed to load flash sales");
    }
  };

  const getImageUrl = async (path) => {
    if (!path) return "/placeholder.jpg";
    try {
      if (path.startsWith("http")) return path;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data?.publicUrl || "/placeholder.jpg";
    } catch (err) {
      return "/placeholder.jpg";
    }
  };

  const toggleFlag = async (id, current) => {
    setActionLoading(`flag-${id}`);
    try {
      const { error } = await supabase.from("products").update({ is_flagged: !current }).eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_flagged: !current } : p)));
      toast.success(!current ? "Product flagged" : "Flag removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle flag");
    }
    setActionLoading(null);
  };

  const setStatus = async (id, status, visibility) => {
    setActionLoading(`status-${id}`);
    try {
      const { error } = await supabase.from("products").update({ status, visibility }).eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status, visibility } : p)));
      toast.success(`Product set to ${status}/${visibility}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product status");
    }
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
    const {
      product,
      product_id,
      title,
      tagline,
      image_url,
      hover_image_url,
      link_url,
      starts_at,
      ends_at,
      priority,
      type,
      background_color,
      cta_text,
      is_featured,
      display_position,
      internal_notes,
    } = promotionData;

    if (!title || !image_url) {
      return toast.error("Title and image are required for a promotion");
    }

    setActionLoading('promo-submit');
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const adminId = authUser?.user?.id || null;

      const row = {
        product_id: product_id || null,
        title,
        tagline: tagline || null,
        image_url,
        hover_image_url: hover_image_url || null,
        link_url: link_url || null,
        starts_at: starts_at ? fromLocalToISO(starts_at) : null,
        ends_at: ends_at ? fromLocalToISO(ends_at) : null,
        priority: Number(priority) || 0,
        type: type || null,
        background_color: background_color || null,
        cta_text: cta_text || "Shop Now",
        is_featured: !!is_featured,
        display_position: display_position || null,
        internal_notes: internal_notes || null,
        active: true,
        promoted_by_admin_id: adminId,
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
    } catch (err) {
      console.error("handlePromoteSubmit", err);
      toast.error("Failed to save promotion");
    }
    setActionLoading(null);
  };

  /* ---------- FLASH SALE SUBMIT (fixed) ---------- */
  const handleFlashSaleSubmit = async () => {
    const {
      product_id,
      flash_price,
      discount_percentage,
      stock_quantity,
      starts_at,
      ends_at,
      is_featured,
    } = flashSaleData;

    if (!product_id || !flash_price || !stock_quantity || !starts_at || !ends_at) {
      return toast.error("Please fill all required fields");
    }
    if (new Date(starts_at) >= new Date(ends_at)) {
      return toast.error("End date must be after start date");
    }

    // ---- calculate discount % from entered flash price ----
    const product = products.find((p) => p.id === product_id);
    const originalPrice = product?.price ?? 0;
    const calcDiscount =
      originalPrice > 0 ? Math.round(((originalPrice - flash_price) / originalPrice) * 100) : 0;

    setActionLoading("flashsale-submit");
    try {
      const updateData = {
        is_flash_sale: true,
        discount: calcDiscount,               // only store discount %
        flash_sale_ends_at: fromLocalToISO(ends_at),
        stock_quantity: Number(stock_quantity),
        is_featured: !!is_featured,
        // **price stays untouched**
      };

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", product_id);

      if (error) throw error;

      toast.success(editingFlashSale ? "Flash sale updated" : "Flash sale created");
      await Promise.all([fetchFlashSales(), fetchProducts()]);
      setShowFlashSaleModal(false);
      setEditingFlashSale(null);
    } catch (err) {
      console.error("handleFlashSaleSubmit", err);
      toast.error("Failed to save flash sale");
    } finally {
      setActionLoading(null);
    }
  };

  const unpromote = async (productOrPromo) => {
    if (!productOrPromo) return;
    if (!window.confirm("Are you sure you want to remove this promotion?")) return;

    setActionLoading(`unpromote-${productOrPromo.id || productOrPromo.product_id}`);
    try {
      if (productOrPromo.product_id) {
        const { error } = await supabase
          .from("promoted_products")
          .delete()
          .eq("product_id", productOrPromo.product_id);
        if (error) throw error;
      } else if (productOrPromo.id) {
        const { error } = await supabase
          .from("promoted_products")
          .delete()
          .eq("id", productOrPromo.id);
        if (error) throw error;
      }
      toast.success("Promotion removed");
      await fetchPromotions();
    } catch (err) {
      console.error("unpromote error", err);
      toast.error("Failed to remove promotion");
    }
    setActionLoading(null);
  };

  const endFlashSale = async (product) => {
    if (!window.confirm("Are you sure you want to end this flash sale?")) return;

    setActionLoading(`end-flashsale-${product.id}`);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_flash_sale: false, discount: 0 })
        .eq("id", product.id);
      if (error) throw error;
      toast.success("Flash sale ended");
      await Promise.all([fetchFlashSales(), fetchProducts()]);
    } catch (err) {
      console.error("endFlashSale error", err);
      toast.error("Failed to end flash sale");
    } finally {
      setActionLoading(null);
    }
  };

  const getTimeRemaining = (endsAt) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end - now;
    
    if (diff <= 0) return { expired: true };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, expired: false };
  };

  const getSalesProgress = (product) => {
    const initialStock = product.initial_stock || product.stock_quantity;
    const sold = initialStock - product.stock_quantity;
    const progress = initialStock > 0 ? (sold / initialStock) * 100 : 0;
    return { sold, progress };
  };

  const filteredProducts = products
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        ((p.category || "") + "").toLowerCase().includes(q)
      );
    })
    .filter((p) => {
      switch (activeTab) {
        case "pending":
          return p.status === "pending";
        case "approved":
          return p.status === "active";
        case "rejected":
          return p.status === "rejected";
        case "flagged":
          return !!p.is_flagged;
        case "promoted":
          return promotedIds.includes(p.id);
        case "flashsales":
          return p.is_flash_sale && new Date(p.flash_sale_ends_at) > new Date();
        case "all":
        default:
          return true;
      }
    });

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  const getProductStatus = (product) => {
    if (product.is_flagged) {
      return { label: 'Flagged', color: 'var(--danger-color)', icon: <FiFlag /> };
    }
    if (product.status === 'active') {
      return { label: 'Approved', color: 'var(--success-color)', icon: <FiCheckCircle /> };
    }
    if (product.status === 'rejected') {
      return { label: 'Rejected', color: 'var(--danger-color)', icon: <FiXCircle /> };
    }
    return { label: 'Pending', color: 'var(--warning-color)', icon: <FiClock /> };
  };

  const formatPrice = (price) => {
    return `KSH ${Number(price || 0).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="product-moderation-container">
      <motion.div
        className="product-moderation-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <FiShoppingBag className="header-icon" />
            <div>
              <h1>Product Moderation</h1>
              <p>Approve, reject, and manage product promotions & flash sales</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <FiShoppingBag className="stat-icon" />
              <div>
                <span className="stat-number">{totalCount}</span>
                <span className="stat-label">Total Products</span>
              </div>
            </div>
            <div className="stat-card">
              <FiAward className="stat-icon" />
              <div>
                <span className="stat-number">{promotedIds.length}</span>
                <span className="stat-label">Promoted</span>
              </div>
            </div>
            <div className="stat-card">
              <FaBolt className="stat-icon" />
              <div>
                <span className="stat-number">{flashSales.length}</span>
                <span className="stat-label">Flash Sales</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="product-moderation-content">
        {/* Tabs Section */}
        <motion.section
          className="tabs-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="tab-buttons">
            {TABS.map(tab => (
              <motion.button
                key={tab.key}
                className={`tab-btn ${tab.key === activeTab ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Controls Section */}
        <motion.section
          className="controls-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products by name, description, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.section>

        {/* Content Section */}
        {activeTab === "promoted" ? (
          <motion.section
            className="promotions-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="section-header">
              <h2>Promoted Products & Campaigns</h2>
              <div className="section-actions">
                <motion.button
                  className="create-campaign-btn"
                  onClick={() => openPromotionModal(null, null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiAward />
                  Create Campaign
                </motion.button>
                <motion.button
                  className="refresh-btn"
                  onClick={fetchPromotions}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiBarChart2 />
                  Refresh
                </motion.button>
              </div>
            </div>

            {promotionsList.length === 0 ? (
              <div className="empty-state">
                <FiAward className="empty-icon" />
                <h3>No promotions found</h3>
                <p>Create your first promotion or campaign to get started</p>
              </div>
            ) : (
              <div className="promotions-grid">
                {promotionsList.map((promo, index) => {
                  const linkedProduct = promo.product_id ? products.find((x) => x.id === promo.product_id) : null;
                  return (
                    <motion.div
                      key={promo.id}
                      className="promo-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                      <div className="promo-media">
                        <img src={promo.image_url || "/placeholder.jpg"} alt={promo.title} />
                        <div className="promo-badges">
                          {promo.product_id ? (
                            <span className="badge linked">Product</span>
                          ) : (
                            <span className="badge external">Campaign</span>
                          )}
                          {promo.is_featured && <span className="badge featured">Featured</span>}
                        </div>
                      </div>

                      <div className="promo-content">
                        <h3>{promo.title}</h3>
                        {promo.tagline && <p className="promo-tagline">{promo.tagline}</p>}
                        
                        <div className="promo-details">
                          <div className="detail-item">
                            <FiCalendar className="detail-icon" />
                            <span>
                              {promo.starts_at ? formatDate(promo.starts_at) : 'No start date'}
                              {promo.ends_at && ` - ${formatDate(promo.ends_at)}`}
                            </span>
                          </div>
                          <div className="detail-item">
                            <FiStar className="detail-icon" />
                            <span>Priority: {promo.priority}</span>
                          </div>
                        </div>

                        <div className="promo-actions">
                          <motion.button
                            className="edit-btn"
                            onClick={() => openPromotionModal(linkedProduct || null, promo)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FiEdit />
                            Edit
                          </motion.button>
                          <motion.button
                            className="delete-btn"
                            onClick={() => unpromote(promo)}
                            disabled={actionLoading === `unpromote-${promo.id}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {actionLoading === `unpromote-${promo.id}` ? (
                              <div className="loading-dots"></div>
                            ) : (
                              <>
                                <FiTrash2 />
                                Remove
                              </>
                            )}
                          </motion.button>
                          {promo.link_url && (
                            <a 
                              className="visit-btn" 
                              href={promo.link_url} 
                              target="_blank" 
                              rel="noreferrer"
                            >
                              <FiLink />
                              Visit
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        ) : activeTab === "flashsales" ? (
          <motion.section
            className="flashsales-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="section-header">
              <h2>Flash Sales Management</h2>
              <div className="section-actions">
                <motion.button
                  className="create-flashsale-btn"
                  onClick={() => openFlashSaleModal(null, null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaBolt />
                  Create Flash Sale
                </motion.button>
                <motion.button
                  className="refresh-btn"
                  onClick={() => Promise.all([fetchFlashSales(), fetchProducts()])}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiBarChart2 />
                  Refresh
                </motion.button>
              </div>
            </div>

            {flashSales.length === 0 ? (
              <div className="empty-state">
                <FaBolt className="empty-icon" />
                <h3>No active flash sales</h3>
                <p>Create flash sales to boost urgent purchases</p>
              </div>
            ) : (
              <div className="flashsales-grid">
                {flashSales.map((sale, index) => {
                  const timeRemaining = getTimeRemaining(sale.flash_sale_ends_at);
                  const progress = getSalesProgress(sale);
                  const flashPrice = sale.price * (1 - (sale.discount || 0) / 100);
                  
                  return (
                    <motion.div
                      key={sale.id}
                      className={`flashsale-card ${timeRemaining.expired ? 'expired' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                      <div className="flashsale-media">
                        <img src={sale.imageUrl || "/placeholder.jpg"} alt={sale.name} />
                        <div className="flashsale-badges">
                          <span className="badge discount">-{sale.discount}% OFF</span>
                          {sale.is_featured && <span className="badge featured">Featured</span>}
                          {timeRemaining.expired && <span className="badge expired">Expired</span>}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="stock-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                          </div>
                          <div className="stock-info">
                            <span>Sold: {progress.sold}</span>
                            <span>Left: {sale.stock_quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flashsale-content">
                        <h3>{sale.name}</h3>
                        <p className="flashsale-category">{sale.category}</p>
                        
                        <div className="price-section">
                          <span className="flash-price">{formatPrice(flashPrice)}</span>
                          <span className="original-price">{formatPrice(sale.price)}</span>
                        </div>

                        <div className="flashsale-details">
                          <div className="detail-item">
                            <FiClock className="detail-icon" />
                            <span>Ends: {formatDate(sale.flash_sale_ends_at)}</span>
                          </div>
                          
                          {!timeRemaining.expired && (
                            <div className="detail-item time-remaining">
                              <FaBolt className="detail-icon" />
                              <span>
                                {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                                {timeRemaining.hours}h {timeRemaining.minutes}m left
                              </span>
                            </div>
                          )}
                          
                          <div className="detail-item">
                            <FiStar className="detail-icon" />
                            <span>Rating: {sale.rating || 'No ratings'}</span>
                          </div>
                        </div>

                        <div className="flashsale-actions">
                          <motion.button
                            className="edit-btn"
                            onClick={() => openFlashSaleModal(null, sale)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FiEdit />
                            Edit
                          </motion.button>
                          
                          <motion.button
                            className="view-btn"
                            onClick={() => window.open(`/product/${sale.id}`, '_blank')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FiEye />
                            View
                          </motion.button>
                          
                          <motion.button
                            className="delete-btn"
                            onClick={() => endFlashSale(sale)}
                            disabled={actionLoading === `end-flashsale-${sale.id}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {actionLoading === `end-flashsale-${sale.id}` ? (
                              <div className="loading-dots"></div>
                            ) : (
                              <>
                                <FiXCircle />
                                End Sale
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        ) : (
          <motion.section
            className="products-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="section-header">
              <h2>
                {TABS.find(tab => tab.key === activeTab)?.label} 
                <span className="product-count">({filteredProducts.length} products)</span>
              </h2>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                <FiShoppingBag className="empty-icon" />
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map((product, index) => {
                    const status = getProductStatus(product);
                    const promo = promotionsMap[product.id];
                    const promoted = promotedIds.includes(product.id);
                    
                    return (
                      <motion.div
                        key={product.id}
                        className={`product-card ${product.is_flagged ? 'flagged' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      >
                        <div className="product-media">
                          <img src={product.imageUrl || "/placeholder.jpg"} alt={product.name} />
                          <div className="product-badges">
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: `${status.color}15`, color: status.color }}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                            {promoted && (
                              <span className="promoted-badge">
                                <FiAward />
                                Promoted
                              </span>
                            )}
                            {product.is_flash_sale && (
                              <span className="flashsale-badge">
                                <FaBolt />
                                Flash Sale
                              </span>
                            )}
                            {product.discount > 0 && (
                              <span className="discount-badge">
                                -{product.discount}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="product-content">
                          <h3 className="product-title">{product.name}</h3>
                          <p className="product-description">
                            {(product.description || "").slice(0, 100)}
                            {product.description && product.description.length > 100 && "..."}
                          </p>

                          <div className="product-meta">
                            <div className="price-section">
                              <span className="price">{formatPrice(product.price)}</span>
                              {product.discount > 0 && (
                                <span className="original-price">
                                  {formatPrice(product.price * (1 + product.discount / 100))}
                                </span>
                              )}
                            </div>
                            <div className="category">
                              <FiTag className="meta-icon" />
                              {product.category || 'Uncategorized'}
                            </div>
                          </div>

                          <div className="product-actions">
                            <div className="status-actions">
                              <motion.button
                                className={`action-btn ${product.is_flagged ? 'unflag' : 'flag'}`}
                                onClick={() => toggleFlag(product.id, product.is_flagged)}
                                disabled={actionLoading === `flag-${product.id}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {actionLoading === `flag-${product.id}` ? (
                                  <div className="loading-dots"></div>
                                ) : (
                                  <>
                                    {product.is_flagged ? <FiCheckCircle /> : <FiFlag />}
                                    {product.is_flagged ? 'Unflag' : 'Flag'}
                                  </>
                                )}
                              </motion.button>

                              <motion.button
                                className="action-btn approve"
                                onClick={() => setStatus(product.id, "active", "public")}
                                disabled={actionLoading === `status-${product.id}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FiCheckCircle />
                                Approve
                              </motion.button>

                              <motion.button
                                className="action-btn reject"
                                onClick={() => setStatus(product.id, "rejected", "private")}
                                disabled={actionLoading === `status-${product.id}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FiXCircle />
                                Reject
                              </motion.button>
                            </div>

                            <div className="promo-actions">
                              {promoted ? (
                                <>
                                  <motion.button
                                    className="action-btn unpromote"
                                    onClick={() => unpromote({ product_id: product.id })}
                                    disabled={actionLoading === `unpromote-${product.id}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {actionLoading === `unpromote-${product.id}` ? (
                                      <div className="loading-dots"></div>
                                    ) : (
                                      <>
                                        <FiAward />
                                        Unpromote
                                      </>
                                    )}
                                  </motion.button>
                                  <motion.button
                                    className="action-btn edit-promo"
                                    onClick={() => openPromotionModal(product, promotionsMap[product.id])}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <FiEdit />
                                    Edit Promo
                                  </motion.button>
                                </>
                              ) : (
                                <motion.button
                                  className="action-btn promote"
                                  onClick={() => openPromotionModal(product, null)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <FiAward />
                                  Promote
                                </motion.button>
                              )}
                              
                              {product.is_flash_sale ? (
                                <motion.button
                                  className="action-btn end-flashsale"
                                  onClick={() => endFlashSale(product)}
                                  disabled={actionLoading === `end-flashsale-${product.id}`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {actionLoading === `end-flashsale-${product.id}` ? (
                                    <div className="loading-dots"></div>
                                  ) : (
                                    <>
                                      <FaBolt />
                                      End Flash
                                    </>
                                  )}
                                </motion.button>
                              ) : (
                                <motion.button
                                  className="action-btn create-flashsale"
                                  onClick={() => openFlashSaleModal(product, null)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <FaBolt />
                                  Flash Sale
                                </motion.button>
                              )}
                            </div>
                          </div>

                          {promo && (
                            <div className="promo-info">
                              <FiAward className="promo-icon" />
                              <span>{promo.title}</span>
                              {promo.ends_at && (
                                <span className="promo-end">
                                  • Ends {formatDate(promo.ends_at)}
                                </span>
                              )}
                            </div>
                          )}

                          {product.is_flash_sale && (
                            <div className="flashsale-info">
                              <FaBolt className="flashsale-icon" />
                              <span>Flash Sale Active</span>
                              {product.flash_sale_ends_at && (
                                <span className="flashsale-end">
                                  • Ends {formatDate(product.flash_sale_ends_at)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <motion.div
                    className="pagination"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <button
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="pagination-btn"
                    >
                      <FiChevronLeft />
                      Previous
                    </button>
                    
                    <div className="pagination-info">
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                    </div>
                    
                    <button
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="pagination-btn"
                    >
                      Next
                      <FiChevronRight />
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.section>
        )}
      </div>

      {/* Promotion Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowModal(false); setEditingPromo(null); }}
          >
            <motion.div
              className="promotion-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{editingPromo ? "Edit Promotion" : "Create Promotion"}</h3>
                <button 
                  className="close-btn"
                  onClick={() => { setShowModal(false); setEditingPromo(null); }}
                >
                  <FiXCircle />
                </button>
              </div>

              <div className="modal-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Title *</label>
                    <input 
                      type="text" 
                      value={promotionData.title} 
                      onChange={(e) => setPromotionData({ ...promotionData, title: e.target.value })}
                      placeholder="Promotion title"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tagline</label>
                    <input 
                      type="text" 
                      value={promotionData.tagline} 
                      onChange={(e) => setPromotionData({ ...promotionData, tagline: e.target.value })}
                      placeholder="Short tagline or description"
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL *</label>
                    <input 
                      type="text" 
                      value={promotionData.image_url} 
                      onChange={(e) => setPromotionData({ ...promotionData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="form-group">
                    <label>Hover Image URL</label>
                    <input 
                      type="text" 
                      value={promotionData.hover_image_url} 
                      onChange={(e) => setPromotionData({ ...promotionData, hover_image_url: e.target.value })}
                      placeholder="Optional hover image URL"
                    />
                  </div>

                  <div className="form-group">
                    <label>Link URL</label>
                    <input 
                      type="text" 
                      value={promotionData.link_url} 
                      onChange={(e) => setPromotionData({ ...promotionData, link_url: e.target.value })}
                      placeholder="Where should this promotion link to?"
                    />
                  </div>

                  <div className="form-group">
                    <label>Starts At</label>
                    <input 
                      type="datetime-local" 
                      value={promotionData.starts_at} 
                      onChange={(e) => setPromotionData({ ...promotionData, starts_at: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Ends At</label>
                    <input 
                      type="datetime-local" 
                      value={promotionData.ends_at} 
                      onChange={(e) => setPromotionData({ ...promotionData, ends_at: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <input 
                      type="number" 
                      value={promotionData.priority} 
                      onChange={(e) => setPromotionData({ ...promotionData, priority: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Type</label>
                    <input 
                      type="text" 
                      value={promotionData.type} 
                      onChange={(e) => setPromotionData({ ...promotionData, type: e.target.value })}
                      placeholder="Promotion type"
                    />
                  </div>

                  <div className="form-group">
                    <label>Background Color</label>
                    <input 
                      type="text" 
                      value={promotionData.background_color} 
                      onChange={(e) => setPromotionData({ ...promotionData, background_color: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>

                  <div className="form-group">
                    <label>CTA Text</label>
                    <input 
                      type="text" 
                      value={promotionData.cta_text} 
                      onChange={(e) => setPromotionData({ ...promotionData, cta_text: e.target.value })}
                      placeholder="Shop Now"
                    />
                  </div>

                  <div className="form-group">
                    <label>Featured</label>
                    <select 
                      value={promotionData.is_featured ? "1" : "0"} 
                      onChange={(e) => setPromotionData({ ...promotionData, is_featured: e.target.value === "1" })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Display Position</label>
                    <input 
                      type="text" 
                      value={promotionData.display_position} 
                      onChange={(e) => setPromotionData({ ...promotionData, display_position: e.target.value })}
                      placeholder="Where to display this promotion"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Internal Notes</label>
                    <textarea 
                      rows={3} 
                      value={promotionData.internal_notes} 
                      onChange={(e) => setPromotionData({ ...promotionData, internal_notes: e.target.value })}
                      placeholder="Internal notes for this promotion"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <motion.button
                  className="cancel-btn"
                  onClick={() => { setShowModal(false); setEditingPromo(null); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="submit-btn"
                  onClick={handlePromoteSubmit}
                  disabled={actionLoading === 'promo-submit'}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {actionLoading === 'promo-submit' ? (
                    <div className="loading-dots"></div>
                  ) : (
                    editingPromo ? "Save Changes" : "Create Promotion"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Sale Modal */}
      <AnimatePresence>
        {showFlashSaleModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowFlashSaleModal(false); setEditingFlashSale(null); }}
          >
            <motion.div
              className="flashsale-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{editingFlashSale ? "Edit Flash Sale" : "Create Flash Sale"}</h3>
                <button 
                  className="close-btn"
                  onClick={() => { setShowFlashSaleModal(false); setEditingFlashSale(null); }}
                >
                  <FiXCircle />
                </button>
              </div>

              <div className="modal-content">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Select Product *</label>
                    <select 
                      value={flashSaleData.product_id || ""}
                      onChange={(e) => {
                        const productId = e.target.value;
                        const product = products.find(p => p.id === productId);
                        if (product) {
                          setFlashSaleData({ 
                            ...flashSaleData, 
                            product_id: productId,
                            flash_price: product.price * (1 - (product.discount || 0) / 100),
                            discount_percentage: product.discount || 0,
                            stock_quantity: product.stock_quantity || 0
                          });
                        }
                      }}
                      disabled={!!editingFlashSale}
                    >
                      <option value="">Select a product</option>
                      {products
                        .filter(p => p.status === 'active' && p.visibility === 'public')
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatPrice(product.price)} (Stock: {product.stock_quantity})
                          </option>
                        ))
                      }
                    </select>
                    {editingFlashSale && (
                      <small className="form-hint">Product cannot be changed when editing</small>
                    )}
                  </div>

                  {flashSaleData.product_id && (
                    <>
                      <div className="form-group">
                        <label>Current Price</label>
                        <input 
                          type="text" 
                          value={formatPrice(products.find(p => p.id === flashSaleData.product_id)?.price || 0)}
                          readOnly
                          className="readonly"
                        />
                      </div>

                      <div className="form-group">
                        <label>Flash Sale Price *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={flashSaleData.flash_price} 
                          onChange={(e) => {
                            const flashPrice = Number(e.target.value);
                            const originalPrice = products.find(p => p.id === flashSaleData.product_id)?.price || 0;
                            const discount = originalPrice > 0 ? ((originalPrice - flashPrice) / originalPrice) * 100 : 0;
                            
                            setFlashSaleData({ 
                              ...flashSaleData, 
                              flash_price: flashPrice,
                              discount_percentage: Math.round(discount)
                            });
                          }}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="form-group">
                        <label>Discount Percentage</label>
                        <input 
                          type="number" 
                          value={flashSaleData.discount_percentage} 
                          readOnly
                          className="readonly"
                          placeholder="0"
                        />
                      </div>

                      <div className="form-group">
                        <label>Sale Stock Quantity *</label>
                        <input 
                          type="number" 
                          value={flashSaleData.stock_quantity} 
                          onChange={(e) => setFlashSaleData({ ...flashSaleData, stock_quantity: e.target.value })}
                          placeholder="100"
                          max={products.find(p => p.id === flashSaleData.product_id)?.stock_quantity || 0}
                        />
                        <small className="form-hint">
                          Available: {products.find(p => p.id === flashSaleData.product_id)?.stock_quantity || 0}
                        </small>
                      </div>

                      <div className="form-group">
                        <label>Start Date/Time *</label>
                        <input 
                          type="datetime-local" 
                          value={flashSaleData.starts_at} 
                          onChange={(e) => setFlashSaleData({ ...flashSaleData, starts_at: e.target.value })}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>

                      <div className="form-group">
                        <label>End Date/Time *</label>
                        <input 
                          type="datetime-local" 
                          value={flashSaleData.ends_at} 
                          onChange={(e) => setFlashSaleData({ ...flashSaleData, ends_at: e.target.value })}
                          min={flashSaleData.starts_at || new Date().toISOString().slice(0, 16)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Featured Flash Sale</label>
                        <select 
                          value={flashSaleData.is_featured ? "1" : "0"} 
                          onChange={(e) => setFlashSaleData({ ...flashSaleData, is_featured: e.target.value === "1" })}
                        >
                          <option value="0">No</option>
                          <option value="1">Yes</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {flashSaleData.product_id && flashSaleData.flash_price > 0 && (
                  <div className="price-preview">
                    <h4>Price Preview:</h4>
                    <div className="preview-prices">
                      <span className="original">Original: {formatPrice(products.find(p => p.id === flashSaleData.product_id)?.price || 0)}</span>
                      <span className="flash">Flash: {formatPrice(flashSaleData.flash_price)}</span>
                      <span className="savings">
                        Savings: {formatPrice((products.find(p => p.id === flashSaleData.product_id)?.price || 0) - flashSaleData.flash_price)} 
                        ({flashSaleData.discount_percentage}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <motion.button
                  className="cancel-btn"
                  onClick={() => { setShowFlashSaleModal(false); setEditingFlashSale(null); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="submit-btn"
                  onClick={handleFlashSaleSubmit}
                  disabled={!flashSaleData.product_id || actionLoading === 'flashsale-submit'}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {actionLoading === 'flashsale-submit' ? (
                    <div className="loading-dots"></div>
                  ) : (
                    editingFlashSale ? "Update Flash Sale" : "Create Flash Sale"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}