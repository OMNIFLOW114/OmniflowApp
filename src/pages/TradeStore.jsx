import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import {
  FaStore, FaSearch, FaUser, FaTags, FaStar, FaBolt,
  FaFire, FaBars, FaExclamationTriangle, FaSlidersH
} from "react-icons/fa";
import InfiniteScroll from "react-infinite-scroll-component";
import ReactModal from "react-modal";

import FlashDeals from "@/components/FlashDeals";
import FeaturedHighlights from "@/components/FeaturedHighlights";
import PromotedCarousel from "@/components/PromotedCarousel";
import HomeTabSections from "@/components/HomeTabSections";
import AdvancedFilterOverlay from "@/components/AdvancedFilterOverlay";

import "./TradeStore.css";

const tabs = ["All", "Flash Sale", "Electronics", "Fashion", "Home", "Trending", "Discounted", "Featured"];

const ProductCard = ({ product, onClick }) => {
  const getBadge = () => {
    if (product.is_flash_sale) return <span className="badge flash"><FaBolt /> Flash</span>;
    if (product.is_trending) return <span className="badge trending"><FaFire /> Trending</span>;
    if (product.is_featured) return <span className="badge featured">Featured</span>;
    return null;
  };

  const hasDiscount = parseFloat(product.discount) > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - parseFloat(product.discount) / 100)
    : product.price;

  const averageRating = product.average_rating || 0;
  const ratingCount = product.rating_count || 0;

  return (
    <div className="product-card" onClick={onClick}>
      <div className="product-img-wrapper">
        <img
          src={product.imageUrl}
          alt={product.name}
          onError={(e) => { e.target.src = "/placeholder.jpg"; }}
        />
        {getBadge()}
      </div>
      
      <div className="product-card-content">
        <h3>{product.name}</h3>
        
        <div className="stars">
          {[...Array(5)].map((_, i) => (
            <FaStar key={i} className={i < Math.round(averageRating) ? "star-filled" : "star-empty"} />
          ))}
          <span className="rating-text">({averageRating.toFixed(1)} - {ratingCount} reviews)</span>
        </div>

        <div className="price-container">
          <div className="price-main-row">
            {hasDiscount && (
              <span className="price-old">
                KSH {Number(product.price).toLocaleString("en-KE")}
              </span>
            )}
            {hasDiscount && (
              <span className="discount">-{product.discount}%</span>
            )}
          </div>
          <span className="price-new">
            KSH {Number(hasDiscount ? discountedPrice : product.price).toLocaleString("en-KE")}
          </span>
        </div>

        <div className="product-info">
          <div className="info-row category-row">
            <span><FaTags /> {product.category || "Uncategorized"}</span>
          </div>
          <div className="info-row stock-row">
            <span>Stock: {product.stock_quantity}</span>
          </div>
        </div>

        <div className="seller-row">
          <FaUser /> Seller Hidden
        </div>
      </div>
    </div>
  );
};

const CreateStoreButton = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [storeInfo, setStoreInfo] = useState(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("stores")
      .select("id, contact_email, contact_phone, location, is_active")
      .eq("owner_id", user.id)
      .single()
      .then(({ data }) => data && setStoreInfo(data));
  }, [user]);

  const handleClick = () => {
    if (!user) return toast.error("Please log in to start selling.");
    if (!storeInfo) return navigate("/store/create");

    const { id, contact_email, contact_phone, location, is_active } = storeInfo;
    const incomplete = !contact_email || !contact_phone || !location;
    if (!is_active) return setShowBlockedModal(true);
    if (incomplete) {
      toast("Please complete your store setup.");
      return navigate("/store/create");
    }
    navigate(`/dashboard/store/${id}`);
  };

  return (
    <>
      <button className="glass-button" onClick={handleClick}>
        <FaStore style={{ marginRight: 6 }} />
        {storeInfo ? "Manage Store" : "Upgrade to own a store"}
      </button>

      <ReactModal
        isOpen={showBlockedModal}
        onRequestClose={() => setShowBlockedModal(false)}
        className="modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <FaExclamationTriangle className="modal-icon" />
          <h2>Store Access Blocked</h2>
        </div>
        <p>Your store has been <strong>deactivated</strong> due to policy violations.</p>
        <p>If you believe this is an error, please contact our support team.</p>
        <div className="modal-actions">
          <button className="glass-button" onClick={() => setShowBlockedModal(false)}>Close</button>
          <a
            href="mailto:support@omniflow.ai"
            className="glass-button contact-support"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Support
          </a>
        </div>
      </ReactModal>
    </>
  );
};

const OmniMarket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("All");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasInstallmentPlan, setHasInstallmentPlan] = useState(false);
  const [filters, setFilters] = useState({
    category: "", 
    minPrice: "", 
    maxPrice: "", 
    minRating: 0, 
    inStock: false,
    sortBy: "newest",
    quickFilter: ""
  });
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("users").select("dark_mode").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setIsDarkMode(data.dark_mode);
          document.body.setAttribute("data-theme", data.dark_mode ? "dark" : "light");
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("installment_orders")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("status", "active")
      .then(({ data }) => data?.length > 0 && setHasInstallmentPlan(true));
  }, [user]);

  const getImageUrl = (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const fetchProducts = async () => {
    const offset = (page - 1) * pageSize;
    const { data, error } = await supabase
      .from("products")
      .select(`id, name, description, price, discount, stock_quantity,
        category, tags, image_gallery, created_at, views,
        is_featured, is_rare_drop, is_flash_sale, is_trending,
        stores(id, is_active)`)
      .eq("visibility", "public")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Failed to load products:", error);
      return toast.error("Failed to load products");
    }

    const valid = data.filter((p) => p.stores?.is_active);
    if (valid.length < pageSize) setHasMore(false);

    // Fetch average ratings and count from product_ratings view
    const productIds = valid.map((p) => p.id);
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("product_ratings")
      .select("product_id, avg_rating, rating_count")
      .in("product_id", productIds);

    if (ratingsError) {
      console.error("Failed to load ratings:", ratingsError);
      toast.error("Failed to load product ratings");
    }

    const ratingsAvgMap = new Map(ratingsData?.map((r) => [r.product_id, r.avg_rating]) || []);
    const ratingsCountMap = new Map(ratingsData?.map((r) => [r.product_id, r.rating_count]) || []);

    const withImagesAndRatings = valid.map((p) => ({
      ...p,
      imageUrl: getImageUrl(p.image_gallery?.[0]),
      average_rating: ratingsAvgMap.get(p.id) || 0,
      rating_count: ratingsCountMap.get(p.id) || 0
    }));

    setProducts((prev) => {
      const combined = [...prev, ...withImagesAndRatings];
      return Array.from(new Map(combined.map((p) => [p.id, p])).values());
    });
    setPage((prev) => prev + 1);
  };

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    let result = [...products];
    
    // Apply search filter
    if (search) {
      result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    // Apply category filter
    if (filters.category) {
      result = result.filter((p) => p.category?.toLowerCase().trim() === filters.category);
    }
    
    // Apply price range filter
    if (filters.minPrice) {
      result = result.filter((p) => parseFloat(p.price) >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p) => parseFloat(p.price) <= parseFloat(filters.maxPrice));
    }
    
    // Apply rating filter
    if (filters.minRating) {
      result = result.filter((p) => p.average_rating >= filters.minRating);
    }
    
    // Apply stock filter
    if (filters.inStock) {
      result = result.filter((p) => p.stock_quantity > 0);
    }
    
    // Apply quick filters
    if (filters.quickFilter) {
      switch (filters.quickFilter) {
        case "flash":
          result = result.filter((p) => p.is_flash_sale);
          break;
        case "trending":
          result = result.filter((p) => p.is_trending || p.views > 20);
          break;
        case "featured":
          result = result.filter((p) => p.is_featured);
          break;
        case "discounted":
          result = result.filter((p) => parseFloat(p.discount || 0) > 0);
          break;
      }
    }
    
    // Apply sorting
    switch (filters.sortBy) {
      case "price-low":
        result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case "price-high":
        result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case "rating":
        result.sort((a, b) => parseFloat(b.average_rating) - parseFloat(a.average_rating));
        break;
      case "popular":
        result.sort((a, b) => parseFloat(b.views) - parseFloat(a.views));
        break;
      default:
        // newest first (default)
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    // Apply tab filters
    switch (activeTab) {
      case "Flash Sale": 
        result = result.filter((p) => p.is_flash_sale); 
        break;
      case "Trending": 
        result = result.filter((p) => p.is_trending || p.views > 20); 
        break;
      case "Discounted": 
        result = result.filter((p) => parseFloat(p.discount || 0) > 0); 
        break;
      case "Featured": 
        result = result.filter((p) => p.is_featured); 
        break;
      case "Electronics": 
        result = result.filter((p) => p.category?.toLowerCase() === "electronics"); 
        break;
      case "Fashion": 
        result = result.filter((p) => p.category?.toLowerCase().includes("fashion")); 
        break;
      case "Home": 
        result = result.filter((p) => p.category?.toLowerCase().includes("home")); 
        break;
    }

    setFiltered(result);
  }, [products, search, filters, activeTab]);

  return (
    <div className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}>
      <header className="marketplace-header">
        <h1>Welcome to <span className="highlight">OmniMarket</span></h1>
        <p className="tagline">Powering the future of trade — faster, smarter, Kenyan!</p>
        <div className="header-controls">
          <CreateStoreButton />
          {hasInstallmentPlan && (
            <button className="glass-button" onClick={() => navigate("/my-installments")}>
              My Installments
            </button>
          )}
          <PromotedCarousel />
          <button 
            className="glass-button" 
            onClick={() => setShowFilterOverlay(true)}
          >
            <FaSlidersH style={{ marginRight: 6 }} /> Filters
          </button>
        </div>
      </header>

      <FlashDeals />
      <FeaturedHighlights />

      <div className="search-bar">
        <FaSearch />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tab-bar-scrollable">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Home" && (
        <div className="home-sections-wrapper">
          <HomeTabSections />
        </div>
      )}

      <InfiniteScroll
        dataLength={filtered.length}
        next={fetchProducts}
        hasMore={hasMore}
        loader={<h4 style={{ textAlign: "center" }}>Loading more products...</h4>}
        endMessage={<p style={{ textAlign: "center" }}>You've reached the end.</p>}
      >
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
          ))}
        </div>
      </InfiniteScroll>

      {showFilterOverlay && (
        <AdvancedFilterOverlay
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFilterOverlay(false)}
          productCount={filtered.length}
        />
      )}
    </div>
  );
};

export default OmniMarket;