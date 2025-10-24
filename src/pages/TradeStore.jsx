import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import {
  FaStore, FaSearch, FaUser, FaTags, FaStar, FaBolt,
  FaFire, FaExclamationTriangle, FaSlidersH,
  FaUserCircle, FaEnvelope, FaShoppingCart, FaHeart,
  FaCrown, FaGem
} from "react-icons/fa";
import InfiniteScroll from "react-infinite-scroll-component";
import ReactModal from "react-modal";

import FlashDeals from "@/components/FlashDeals";
import FeaturedHighlights from "@/components/FeaturedHighlights";
import PromotedCarousel from "@/components/PromotedCarousel";
import HomeTabSections from "@/components/HomeTabSections";
import AdvancedFilterOverlay from "@/components/AdvancedFilterOverlay";
import SidebarMenu from "@/components/SidebarMenu";

import "./TradeStore.css";

const tabs = ["All", "Flash Sale", "Electronics", "Fashion", "Home", "Trending", "Discounted", "Featured"];

// ========== SKELETON COMPONENTS ==========
const ProductCardSkeleton = () => (
  <div className="product-card skeleton">
    <div className="product-img-wrapper skeleton">
      <div className="skeleton-image"></div>
    </div>
    <div className="product-card-content">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-stars">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-star"></div>
        ))}
      </div>
      <div className="skeleton-line skeleton-price"></div>
      <div className="product-info">
        <div className="skeleton-line skeleton-category"></div>
        <div className="skeleton-line skeleton-stock"></div>
      </div>
      <div className="skeleton-line skeleton-seller"></div>
    </div>
  </div>
);

const NavigationSkeleton = () => (
  <nav className="premium-navbar skeleton">
    <div className="skeleton-nav-icon"></div>
    <div className="nav-center">
      <div className="skeleton-nav-title"></div>
    </div>
    <div className="nav-right">
      <div className="skeleton-nav-icon"></div>
      <div className="skeleton-nav-icon"></div>
      <div className="skeleton-nav-icon"></div>
    </div>
  </nav>
);

const HeroSkeleton = () => (
  <div className="marketplace-hero skeleton">
    <div className="hero-content">
      <div className="skeleton-hero-title"></div>
      <div className="skeleton-hero-tagline"></div>
      <div className="hero-controls">
        <div className="skeleton-button"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
  </div>
);

const SearchSkeleton = () => (
  <div className="search-bar skeleton">
    <div className="skeleton-search-icon"></div>
    <div className="skeleton-search-input"></div>
  </div>
);

const TabsSkeleton = () => (
  <div className="tab-bar-scrollable skeleton">
    {tabs.map((_, index) => (
      <div key={index} className="skeleton-tab"></div>
    ))}
  </div>
);

// ========== MAIN COMPONENTS ==========
const ProductCard = ({ product, onClick, onAuthRequired }) => {
  const { user } = useAuth();
  
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

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (!user) {
      onAuthRequired();
      return;
    }
    toast.success("Added to wishlist!");
  };

  const handleCartClick = (e) => {
    e.stopPropagation();
    if (!user) {
      onAuthRequired();
      return;
    }
    toast.success("Added to cart!");
  };

  return (
    <motion.div 
      className="product-card" 
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="product-img-wrapper">
        <img
          src={product.imageUrl}
          alt={product.name}
          onError={(e) => { e.target.src = "/placeholder.jpg"; }}
        />
        {getBadge()}
        
        <div className="product-quick-actions">
          <motion.button 
            className="quick-action-btn wishlist-btn"
            onClick={handleWishlistClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaHeart />
          </motion.button>
          <motion.button 
            className="quick-action-btn cart-btn"
            onClick={handleCartClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaShoppingCart />
          </motion.button>
        </div>
      </div>
      
      <div className="product-card-content">
        <h3>{product.name}</h3>
        
        <div className="stars">
          {[...Array(5)].map((_, i) => (
            <FaStar key={i} className={i < Math.round(averageRating) ? "star-filled" : "star-empty"} />
          ))}
          <span className="rating-text">({averageRating.toFixed(1)})</span>
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
          <FaUser /> Campus Seller
        </div>
      </div>
    </motion.div>
  );
};

const PremiumStoreButton = ({ storeInfo, hasActiveSubscription, onStoreClick, onAuthRequired }) => {
  const { user } = useAuth();
  
  const isStoreOwner = storeInfo && storeInfo.is_active;
  const hasPremiumStore = storeInfo && hasActiveSubscription;

  const handleClick = () => {
    if (!user) {
      onAuthRequired();
      return;
    }
    onStoreClick();
  };

  return (
    <motion.button 
      className={`nav-icon store-button ${isStoreOwner ? 'premium-store' : ''} ${hasPremiumStore ? 'vip-store' : ''}`}
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={isStoreOwner ? "Manage Your Store" : "Become a Seller"}
    >
      {hasPremiumStore ? (
        <FaCrown size={20} className="premium-icon" />
      ) : isStoreOwner ? (
        <FaGem size={20} className="premium-icon" />
      ) : (
        <FaStore size={20} />
      )}
      
      {isStoreOwner && (
        <span className="premium-badge">
          {hasPremiumStore ? 'VIP' : 'PRO'}
        </span>
      )}
    </motion.button>
  );
};

const CreateStoreModal = ({ isOpen, onClose, storeInfo, hasActiveSubscription, onNavigate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAction = () => {
    if (!user) {
      toast.error("Please log in to start selling.");
      navigate("/auth");
      onClose();
      return;
    }

    if (storeInfo) {
      const { id, contact_email, contact_phone, location, is_active } = storeInfo;
      const incomplete = !contact_email || !contact_phone || !location;
      
      if (!is_active) {
        toast.error("Your store has been deactivated. Contact support.");
        onClose();
        return;
      }
      
      if (incomplete) {
        toast("Please complete your store setup.");
        navigate("/store/create");
        onClose();
        return;
      }
      
      navigate(`/dashboard/store/${id}`);
      onClose();
      return;
    }

    if (hasActiveSubscription) {
      navigate("/store/create");
    } else {
      navigate("/store/premium");
    }
    onClose();
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="premium-modal"
      overlayClassName="modal-overlay"
    >
      <div className="modal-header premium">
        {storeInfo ? (
          <>
            <FaGem className="modal-icon premium" />
            <h2>Manage Your Store</h2>
          </>
        ) : (
          <>
            <FaStore className="modal-icon" />
            <h2>Start Selling Today</h2>
          </>
        )}
      </div>
      
      <div className="modal-content">
        {storeInfo ? (
          <>
            <p className="premium-text">You're already a seller! Manage your store and grow your business.</p>
            <div className="store-stats">
              <div className="stat-item">
                <span className="stat-number">0</span>
                <span className="stat-label">Products</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">0</span>
                <span className="stat-label">Orders</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">KSH 0</span>
                <span className="stat-label">Earnings</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="premium-text">Join thousands of sellers earning on OmniMarket. Start your store in minutes!</p>
            <ul className="benefits-list">
              <li>🎯 Reach thousands of campus students</li>
              <li>💸 Earn money from your dorm room</li>
              <li>🚀 Fast and easy setup</li>
              <li>🛡️ Secure payments with OmniCash</li>
            </ul>
          </>
        )}
      </div>

      <div className="modal-actions premium">
        <button className="glass-button secondary" onClick={onClose}>
          Maybe Later
        </button>
        <button 
          className={`premium-action-button ${storeInfo ? 'manage' : 'create'}`}
          onClick={handleAction}
        >
          {storeInfo ? (
            <>
              <FaGem /> Manage Store
            </>
          ) : (
            <>
              <FaStore /> Start Selling
            </>
          )}
        </button>
      </div>
    </ReactModal>
  );
};

const TradeStore = () => {
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
  
  // UPDATED: Store and modal states
  const [showMenu, setShowMenu] = useState(false);
  const [newAdminNotification, setNewAdminNotification] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const pageSize = 20;

  const toggleMenu = useCallback(() => setShowMenu((prev) => !prev), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  const handleAuthRequired = () => {
    toast.error("Please log in to continue");
    navigate("/auth");
  };

  // FIXED: Fetch store information with correct column name
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Check for active subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (subscriptionError && subscriptionError.code !== "PGRST116") {
          console.error("Subscription fetch error:", subscriptionError);
        } else {
          setHasActiveSubscription(!!subscriptionData);
        }

        // FIXED: Use 'name' instead of 'store_name'
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, contact_email, contact_phone, location, is_active, name") // FIXED: 'name' not 'store_name'
          .eq("owner_id", user.id)
          .maybeSingle(); // Use maybeSingle to handle no rows

        if (storeError && storeError.code !== "PGRST116") {
          console.error("Store fetch error:", storeError);
        } else {
          setStoreInfo(storeData || null);
        }

      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchUserData();
  }, [user]);

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

  // Messages notification check
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setNewMessages(false);
          return;
        }

        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("is_read", false)
          .eq("receiver_id", currentUser.id)
          .limit(1);

        if (!messagesError) {
          setNewMessages(messagesData?.length > 0);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setNewMessages(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

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

  useEffect(() => { 
    fetchProducts(); 
  }, []);

  useEffect(() => {
    let result = [...products];
    
    if (search) {
      result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    if (filters.category) {
      result = result.filter((p) => p.category?.toLowerCase().trim() === filters.category);
    }
    
    if (filters.minPrice) {
      result = result.filter((p) => parseFloat(p.price) >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p) => parseFloat(p.price) <= parseFloat(filters.maxPrice));
    }
    
    if (filters.minRating) {
      result = result.filter((p) => p.average_rating >= filters.minRating);
    }
    
    if (filters.inStock) {
      result = result.filter((p) => p.stock_quantity > 0);
    }
    
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
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

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

  // Show skeleton during initial load
  if (initialLoad) {
    return (
      <div className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}>
        <NavigationSkeleton />
        <HeroSkeleton />
        <SearchSkeleton />
        <TabsSkeleton />
        <div className="product-grid">
          {[...Array(10)].map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}>
      <nav className="premium-navbar">
        <motion.button
          onClick={toggleMenu}
          className="nav-icon profile-icon-wrapper"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaUserCircle size={26} />
          {newAdminNotification && <span className="dot top-left-dot" />}
        </motion.button>

        <div className="nav-center">
          <motion.h1 
            className="nav-title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Omni<span className="highlight">Market</span>
          </motion.h1>
        </div>

        <div className="nav-right">
          <PremiumStoreButton 
            storeInfo={storeInfo}
            hasActiveSubscription={hasActiveSubscription}
            onStoreClick={() => setShowStoreModal(true)}
            onAuthRequired={handleAuthRequired}
          />

          <motion.button
            onClick={() => {
              if (!user) {
                handleAuthRequired();
                return;
              }
              navigate("/messages");
            }}
            className="nav-icon messages-wrapper"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaEnvelope size={20} />
            {newMessages && <span className="dot top-right-dot" />}
          </motion.button>

          <motion.button
            onClick={() => {
              if (!user) {
                handleAuthRequired();
                return;
              }
              navigate("/cart");
            }}
            className="nav-icon"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaShoppingCart size={20} />
          </motion.button>
        </div>
      </nav>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="sidebar-wrapper"
          >
            <SidebarMenu
              onClose={closeMenu}
              onLogout={() => {
                supabase.auth.signOut();
                navigate("/auth");
              }}
              darkMode={isDarkMode}
              toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateStoreModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        storeInfo={storeInfo}
        hasActiveSubscription={hasActiveSubscription}
        onNavigate={navigate}
      />

      <motion.header 
        className="marketplace-hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="hero-content">
          <h1>Welcome to <span className="hero-highlight">OmniMarket</span></h1>
          <p className="hero-tagline">Kenya's #1 Campus Marketplace — Shop Smarter, Live Better!</p>
          
          <div className="hero-controls">
            {hasInstallmentPlan && (
              <motion.button 
                className="glass-button" 
                onClick={() => navigate("/my-installments")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                My Installments
              </motion.button>
            )}
            <motion.button 
              className="glass-button" 
              onClick={() => setShowFilterOverlay(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaSlidersH style={{ marginRight: 6 }} /> Filters
            </motion.button>
          </div>
        </div>
        
        <PromotedCarousel />
      </motion.header>

      <FlashDeals />
      <FeaturedHighlights />

      <motion.div 
        className="search-bar"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <FaSearch />
        <input
          type="text"
          placeholder="Search thousands of products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      <motion.div 
        className="tab-bar-scrollable"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab}
          </motion.button>
        ))}
      </motion.div>

      {activeTab === "Home" && (
        <div className="home-sections-wrapper">
          <HomeTabSections />
        </div>
      )}

      <InfiniteScroll
        dataLength={filtered.length}
        next={fetchProducts}
        hasMore={hasMore}
        loader={
          <div className="loading-section">
            <motion.div 
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <h4>Loading more amazing products...</h4>
          </div>
        }
        endMessage={
          <div className="end-message">
            <p>🎉 You've discovered all our products!</p>
          </div>
        }
      >
        <motion.div 
          className="product-grid"
          layout
        >
          {filtered.map((p) => (
            <ProductCard 
              key={p.id} 
              product={p} 
              onClick={() => navigate(`/product/${p.id}`)}
              onAuthRequired={handleAuthRequired}
            />
          ))}
        </motion.div>
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

export default TradeStore;