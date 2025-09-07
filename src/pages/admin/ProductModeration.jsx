// ProductModeration.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import "./ProductModeration.css";

const TABS = ["All", "Pending", "Approved", "Rejected", "Flagged", "Promoted"];

export default function ProductModeration() {
  const [products, setProducts] = useState([]);
  const [promotionsMap, setPromotionsMap] = useState({}); // product_id -> promo row (or external promos keyed by promo.id)
  const [promotionsList, setPromotionsList] = useState([]); // full promotions rows
  const [promotedIds, setPromotedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null); // promo row being edited (or null)
  const [promotionData, setPromotionData] = useState({
    // can be used for both product promotions and external campaigns (product null)
    product: null, // full product object (optional)
    product_id: null, // product id (optional)
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

  // ---------------- on mount ----------------
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- expire promotions whose ends_at < now ----------------
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

  // ---------------- fetch products ----------------
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return setProducts([]);

      // resolve image URL for each product
      const withImages = await Promise.all(
        data.map(async (p) => ({
          ...p,
          imageUrl: await getImageUrl(p.image_gallery?.[0] || p.image_url),
        }))
      );

      setProducts(withImages);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- fetch promotions ----------------
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
        // map by product_id if present; also keep promos by id inside promotionsMap with key `promo_<id>` for external promos
        if (r.product_id) {
          map[r.product_id] = r;
          ids.push(r.product_id);
        } else {
          // external campaign/promo with no product_id; store under special key
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

  // ---------------- storage helper ----------------
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

  // ---------------- toggle flag ----------------
  const toggleFlag = async (id, current) => {
    try {
      const { error } = await supabase.from("products").update({ is_flagged: !current }).eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_flagged: !current } : p)));
      toast.success(!current ? "Product flagged" : "Flag removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle flag");
    }
  };

  // ---------------- set status ----------------
  const setStatus = async (id, status, visibility) => {
    try {
      const { error } = await supabase.from("products").update({ status, visibility }).eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status, visibility } : p)));
      toast.success(`Product set to ${status}/${visibility}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product status");
    }
  };

  // ---------------- open promotion modal ----------------
  const openPromotionModal = (product = null, existingPromo = null) => {
    // If existingPromo passed => editing that promo; else open new promo for the product (or external campaign if product === null)
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

  // helper convert DB ts -> input local value
  const toLocalInput = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  // helper convert local input -> ISO (UTC)
  const fromLocalToISO = (localValue) => {
    if (!localValue) return null;
    const d = new Date(localValue);
    return d.toISOString();
  };

  // ---------------- create or update promotion ----------------
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
        // update
        const { error } = await supabase.from("promoted_products").update(row).eq("id", editingPromo.id);
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        // insert
        const { error } = await supabase.from("promoted_products").insert(row);
        if (error) throw error;
        toast.success("Promotion created");
      }

      // refresh promotions map/list
      await fetchPromotions();
      setShowModal(false);
      setEditingPromo(null);
    } catch (err) {
      console.error("handlePromoteSubmit", err);
      toast.error("Failed to save promotion");
    }
  };

  // ---------------- delete/unpromote ----------------
  const unpromote = async (productOrPromo) => {
    // if productOrPromo has product.id treat as product removal, else if object is promo row remove by id
    let ok = true;
    if (!productOrPromo) return;
    if (productOrPromo.product_id || productOrPromo.id) {
      ok = window.confirm("Are you sure you want to remove this promotion?");
    }
    if (!ok) return;

    try {
      if (productOrPromo.product_id) {
        // delete by product_id
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
  };

  // ---------------- filtered products according to tab/search/filter ----------------
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
        case "Pending":
          return p.status === "pending";
        case "Approved":
          return p.status === "active";
        case "Rejected":
          return p.status === "rejected";
        case "Flagged":
          return !!p.is_flagged;
        case "Promoted":
          return promotedIds.includes(p.id);
        case "All":
        default:
          return true;
      }
    })
    .filter((p) => {
      if (filter === "flagged") return p.is_flagged;
      if (filter === "unflagged") return !p.is_flagged;
      return true;
    });

  // ---------------- UI Render ----------------
  return (
    <div className="product-moderation-container">
      <header className="pm-header">
        <div>
          <h2>🛒 Product Moderation</h2>
          <p className="muted">Manage product status, flags and promotions (product or external campaigns).</p>
        </div>

        <div className="pm-controls">
          <input
            className="pm-search"
            type="search"
            placeholder="Search products, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />

          <select className="pm-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
            <option value="all">All</option>
            <option value="flagged">Flagged Only</option>
            <option value="unflagged">Unflagged Only</option>
          </select>
        </div>
      </header>

      <nav className="admin-tabs" role="tablist" aria-label="Moderation tabs">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeTab === t}
            onClick={() => setActiveTab(t)}
            className={`tab-button ${activeTab === t ? "active" : ""}`}
          >
            {t}
            {t === "Promoted" && <span className="count-badge">{promotedIds.length}</span>}
          </button>
        ))}
      </nav>

      <main className="pm-main">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <>
            {/* If activeTab is Promoted - show promotions list (including external ones) */}
            {activeTab === "Promoted" ? (
              <section className="promoted-section">
                <div className="promo-actions-row">
                  <button
                    className="promote-new"
                    onClick={() => {
                      // open modal for external campaign (no product)
                      openPromotionModal(null, null);
                    }}
                  >
                    Create External Campaign / Banner
                  </button>
                  <button
                    className="refresh-btn"
                    onClick={() => {
                      fetchPromotions();
                    }}
                  >
                    Refresh Promotions
                  </button>
                </div>

                <div className="promotions-grid">
                  {promotionsList.length === 0 && <p className="muted">No promotions found.</p>}
                  {promotionsList.map((promo) => {
                    const linkedProduct = promo.product_id ? products.find((x) => x.id === promo.product_id) : null;
                    return (
                      <div key={promo.id} className="promo-card">
                        <div className="promo-media">
                          <img src={promo.image_url || "/placeholder.jpg"} alt={promo.title} />
                          {promo.hover_image_url && <img className="hover" src={promo.hover_image_url} alt={`${promo.title} hover`} />}
                          {promo.product_id && <span className="promo-linked">Linked product</span>}
                          {!promo.product_id && <span className="promo-external">External</span>}
                        </div>

                        <div className="promo-body">
                          <h4>{promo.title}</h4>
                          {promo.tagline && <p className="muted small">{promo.tagline}</p>}
                          <p className="muted small">
                            {promo.starts_at ? `Starts: ${new Date(promo.starts_at).toLocaleString()}` : "Starts: —"}{" "}
                            {promo.ends_at ? ` • Ends: ${new Date(promo.ends_at).toLocaleString()}` : ""}
                          </p>

                          <div className="promo-actions">
                            <button onClick={() => openPromotionModal(linkedProduct || null, promo)} className="edit-promo">Edit</button>
                            <button onClick={() => unpromote(promo)} className="delete-promo">Delete</button>
                            {promo.link_url && (
                              <a className="visit-link" href={promo.link_url} target="_blank" rel="noreferrer">
                                Visit
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              /* default: products grid for tabs All / Pending / Approved / Rejected / Flagged */
              <section className="products-grid-section">
                {filteredProducts.length === 0 ? (
                  <p className="muted">No products found.</p>
                ) : (
                  <div className="product-grid">
                    {filteredProducts.map((product) => {
                      const promo = promotionsMap[product.id];
                      const promoted = promotedIds.includes(product.id);
                      return (
                        <article key={product.id} className={`product-card ${product.is_flagged ? "flagged" : ""}`}>
                          <div className="product-media">
                            <img src={product.imageUrl || "/placeholder.jpg"} alt={product.name} />
                            {promoted && <span className="promoted-badge">PROMOTED</span>}
                          </div>

                          <div className="product-body">
                            <h3 className="product-title">{product.name}</h3>
                            <p className="muted product-desc">{(product.description || "").slice(0, 120)}</p>

                            <div className="product-meta">
                              <div>
                                <strong>KSH {Number(product.price || 0).toLocaleString()}</strong>
                                {product.discount > 0 && <span className="discount"> -{product.discount}%</span>}
                              </div>
                              <div className="muted tiny">Status: {product.status} • {product.visibility}</div>
                            </div>

                            <div className="card-actions">
                              <button className={product.is_flagged ? "unflag-btn" : "flag-btn"} onClick={() => toggleFlag(product.id, product.is_flagged)}>
                                {product.is_flagged ? "Unflag" : "Flag"}
                              </button>

                              <button className="approve" onClick={() => setStatus(product.id, "active", "public")}>Approve</button>
                              <button className="reject" onClick={() => setStatus(product.id, "rejected", "private")}>Reject</button>
                              <button className="unpublish" onClick={() => setStatus(product.id, "pending", "private")}>Unpublish</button>

                              {promoted ? (
                                <>
                                  <button className="unpromote" onClick={() => unpromote({ product_id: product.id })}>Unpromote</button>
                                  <button className="edit-promo" onClick={() => openPromotionModal(product, promotionsMap[product.id])}>Edit Promo</button>
                                </>
                              ) : (
                                <button className="promote" onClick={() => openPromotionModal(product, null)}>Promote</button>
                              )}
                            </div>

                            {promo && (
                              <div className="promo-meta small muted">Promo: {promo.title} {promo.ends_at && ` • Ends: ${new Date(promo.ends_at).toLocaleString()}`}</div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Promotion Modal */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="promotion-modal">
            <header className="modal-header">
              <h3>{editingPromo ? "Edit Promotion" : "Create Promotion / Campaign"}</h3>
              <button className="close-x" onClick={() => { setShowModal(false); setEditingPromo(null); }}>✕</button>
            </header>

            <div className="modal-grid">
              <label>Title</label>
              <input type="text" value={promotionData.title} onChange={(e) => setPromotionData({ ...promotionData, title: e.target.value })} />

              <label>Tagline</label>
              <input type="text" value={promotionData.tagline} onChange={(e) => setPromotionData({ ...promotionData, tagline: e.target.value })} />

              <label>Image URL</label>
              <input type="text" value={promotionData.image_url} onChange={(e) => setPromotionData({ ...promotionData, image_url: e.target.value })} />

              <label>Hover Image URL</label>
              <input type="text" value={promotionData.hover_image_url} onChange={(e) => setPromotionData({ ...promotionData, hover_image_url: e.target.value })} />

              <label>Link URL</label>
              <input type="text" value={promotionData.link_url} onChange={(e) => setPromotionData({ ...promotionData, link_url: e.target.value })} />

              <label>Starts At</label>
              <input type="datetime-local" value={promotionData.starts_at} onChange={(e) => setPromotionData({ ...promotionData, starts_at: e.target.value })} />

              <label>Ends At</label>
              <input type="datetime-local" value={promotionData.ends_at} onChange={(e) => setPromotionData({ ...promotionData, ends_at: e.target.value })} />

              <label>Priority</label>
              <input type="number" value={promotionData.priority} onChange={(e) => setPromotionData({ ...promotionData, priority: e.target.value })} />

              <label>Type</label>
              <input type="text" value={promotionData.type} onChange={(e) => setPromotionData({ ...promotionData, type: e.target.value })} />

              <label>Background Color</label>
              <input type="text" value={promotionData.background_color} placeholder="#111111" onChange={(e) => setPromotionData({ ...promotionData, background_color: e.target.value })} />

              <label>CTA Text</label>
              <input type="text" value={promotionData.cta_text} onChange={(e) => setPromotionData({ ...promotionData, cta_text: e.target.value })} />

              <label>Featured</label>
              <select value={promotionData.is_featured ? "1" : "0"} onChange={(e) => setPromotionData({ ...promotionData, is_featured: e.target.value === "1" })}>
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>

              <label>Display position</label>
              <input type="text" value={promotionData.display_position} onChange={(e) => setPromotionData({ ...promotionData, display_position: e.target.value })} />

              <label>Internal notes</label>
              <textarea rows={3} value={promotionData.internal_notes} onChange={(e) => setPromotionData({ ...promotionData, internal_notes: e.target.value })} />
            </div>

            <div className="modal-actions">
              <button className="submit" onClick={handlePromoteSubmit}>{editingPromo ? "Save Changes" : "Create Promotion"}</button>
              <button className="cancel" onClick={() => { setShowModal(false); setEditingPromo(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
