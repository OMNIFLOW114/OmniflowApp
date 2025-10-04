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
import { FaCrown, FaStore, FaBan, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-hot-toast";
import "./ProductModeration.css";

const TABS = [
  { key: "all", label: "All Products", icon: <FiShoppingBag /> },
  { key: "pending", label: "Pending", icon: <FiClock /> },
  { key: "approved", label: "Approved", icon: <FiCheckCircle /> },
  { key: "rejected", label: "Rejected", icon: <FiXCircle /> },
  { key: "flagged", label: "Flagged", icon: <FiFlag /> },
  { key: "promoted", label: "Promoted", icon: <FiAward /> }
];

export default function ProductModeration() {
  const [products, setProducts] = useState([]);
  const [promotionsMap, setPromotionsMap] = useState({});
  const [promotionsList, setPromotionsList] = useState([]);
  const [promotedIds, setPromotedIds] = useState([]);
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

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await expireOldPromotions();
        await Promise.all([fetchProducts(), fetchPromotions()]);
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
    } catch (err) {
      console.error("unpromote error", err);
      toast.error("Failed to remove promotion");
    }
    setActionLoading(null);
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
              <p>Approve, reject, and manage product promotions</p>
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
              <FiFlag className="stat-icon" />
              <div>
                <span className="stat-number">{products.filter(p => p.is_flagged).length}</span>
                <span className="stat-label">Flagged</span>
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
    </div>
  );
}