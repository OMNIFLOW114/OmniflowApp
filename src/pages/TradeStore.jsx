import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import {
  FaStore, FaSearch, FaUser, FaTags, FaStar, FaBolt,
  FaFire, FaExclamationTriangle,
  FaUserCircle, FaEnvelope, FaShoppingCart, FaHeart,
  FaCrown, FaGem, FaEye, FaMapMarkerAlt,
  FaGamepad, FaMoneyBillWave
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

// UPDATED: Added "Lipa Mdogomdogo" as second tab after "All"
const tabs = ["All", "Lipa Mdogomdogo", "Near You", "Flash Sale", "Electronics", "Fashion", "Home", "Gaming", "Trending", "Discounted", "Featured"];

// ========== UPDATED SKELETON COMPONENTS ==========
const ProductCardSkeleton = () => (
  <div className="product-card skeleton">
    <div className="product-img-wrapper skeleton">
      <div className="skeleton-image"></div>
      <div className="skeleton-badge"></div>
    </div>
    <div className="product-card-content">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-stars">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-star"></div>
        ))}
      </div>
      <div className="price-skeleton">
        <div className="skeleton-line skeleton-price-main"></div>
        <div className="skeleton-line skeleton-price-old"></div>
      </div>
      <div className="product-info-skeleton">
        <div className="skeleton-line skeleton-category"></div>
        <div className="skeleton-line skeleton-stock"></div>
      </div>
      <div className="seller-skeleton">
        <div className="skeleton-line skeleton-seller"></div>
      </div>
    </div>
  </div>
);

const EmptyTabState = ({ tabName }) => (
  <div className="empty-tab-state">
    <div className="empty-tab-icon">
      {tabName === "Gaming" ? <FaGamepad /> : 
       tabName === "Near You" ? <FaMapMarkerAlt /> :
       tabName === "Lipa Mdogomdogo" ? <FaMoneyBillWave /> :
       <FaTags />}
    </div>
    <h3>No {tabName} Products Yet</h3>
    <p>Check back soon for exciting {tabName.toLowerCase()} products!</p>
  </div>
);

const NavigationSkeleton = () => (
  <nav className="premium-navbar skeleton">
    <div className="nav-left-skeleton">
      <div className="skeleton-nav-icon"></div>
    </div>
    <div className="nav-center-skeleton">
      <div className="skeleton-search-bar"></div>
    </div>
    <div className="nav-right-skeleton">
      <div className="skeleton-nav-icon"></div>
      <div className="skeleton-nav-icon"></div>
      <div className="skeleton-nav-icon"></div>
    </div>
  </nav>
);

const TaglineSkeleton = () => (
  <div className="tagline-skeleton skeleton">
    <div className="skeleton-tagline-line"></div>
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

// ========== DISTANCE CALCULATION (pure JS) ==========
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km) => {
  if (km === Infinity) return "";
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

// ========== UPDATED: Delivery Time Calculation ==========
const getDeliveryTime = (distance) => {
  if (distance === Infinity) return "Standard Delivery";
  
  // UPDATED: New distance thresholds
  if (distance <= 100) {
    return "Same Day Delivery";
  } else if (distance > 100 && distance <= 220) {
    return "Next Day Delivery";
  } else {
    return "3 Days Delivery";
  }
};

const getDeliveryColor = (distance) => {
  if (distance === Infinity) return "#94a3b8";
  
  // UPDATED: New distance thresholds with colors
  if (distance <= 100) {
    return "#10b981"; // Green for same day
  } else if (distance > 100 && distance <= 220) {
    return "#f59e0b"; // Orange/Yellow for next day
  } else {
    return "#ef4444"; // Red for 3 days
  }
};

// ========== MAIN COMPONENTS ==========
const ProductCard = ({ product, onClick, onAuthRequired, buyerLocation }) => {
  const { user } = useAuth();

  const distance = buyerLocation?.lat && product.store_lat
    ? calculateDistance(buyerLocation.lat, buyerLocation.lng, product.store_lat, product.store_lng)
    : Infinity;

  // UPDATED: Get delivery time based on new thresholds
  const deliveryTime = getDeliveryTime(distance);
  const deliveryColor = getDeliveryColor(distance);

  const getBadge = () => {
    if (product.is_flash_sale) return <span className="badge flash"><FaBolt /> Flash</span>;
    if (product.is_trending) return <span className="badge trending"><FaFire /> Trending</span>;
    if (product.is_featured) return <span className="badge featured">Featured</span>;
    if (product.lipa_polepole) return <span className="badge installment"><FaMoneyBillWave /> Lipa Mdogo</span>;
    return null;
  };

  const hasDiscount = parseFloat(product.discount || 0) > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - parseFloat(product.discount) / 100)
    : product.price;

  const averageRating = product.average_rating || 0;

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
      whileHover={{ y: -2, scale: 1.02 }}
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
            <FaStar 
              key={i} 
              className={i < Math.round(averageRating) ? "star-filled" : "star-empty"} 
            />
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
          <FaMapMarkerAlt style={{ 
            color: deliveryColor,
            marginRight: 6 
          }} />
          {distance !== Infinity ? (
            <span style={{ color: deliveryColor, fontWeight: "600" }}>
              {formatDistance(distance)} · {deliveryTime}
            </span>
          ) : (
            <span>Verified Seller</span>
          )}
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
    if (!isStoreOwner) {
      window.location.href = "/premium";
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
        <FaCrown size={18} className="premium-icon" />
      ) : isStoreOwner ? (
        <FaGem size={18} className="premium-icon" />
      ) : (
        <FaStore size={18} />
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
      navigate("/premium");
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
              <div className="stat-item"><span className="stat-number">0</span><span className="stat-label">Products</span></div>
              <div className="stat-item"><span className="stat-number">0</span><span className="stat-label">Orders</span></div>
              <div className="stat-item"><span className="stat-number">KSH 0</span><span className="stat-label">Earnings</span></div>
            </div>
          </>
        ) : (
          <>
            <p className="premium-text">Join thousands of sellers earning on OmniMarket. Start your store in minutes!</p>
            <ul className="benefits-list">
              <li>🎯 Reach thousands of buyers</li>
              <li>💸 Earn money from anywhere</li>
              <li>🚀 Fast and easy setup</li>
              <li>🛡️ Secure payments with OmniCash</li>
            </ul>
          </>
        )}
      </div>
      <div className="modal-actions premium">
        <button className="glass-button secondary" onClick={onClose}>Maybe Later</button>
        <button 
          className={`premium-action-button ${storeInfo ? 'manage' : 'create'}`} 
          onClick={handleAction}
        >
          {storeInfo ? <><FaGem /> Manage Store</> : <><FaStore /> Start Selling</>}
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
  const [showMenu, setShowMenu] = useState(false);
  const [newAdminNotification, setNewAdminNotification] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [storeInfo, setStoreInfo] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [buyerLocation, setBuyerLocation] = useState(null);
  
  const pageSize = 20;

  const toggleMenu = useCallback(() => setShowMenu(prev => !prev), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  const handleAuthRequired = () => {
    toast.error("Please log in to continue");
    navigate("/auth");
  };

  const handleSearchRedirect = () => {
    navigate("/search");
  };

  useEffect(() => {
    if (!user?.id) {
      setInitialLoad(false);
      return;
    }

    const fetchUserData = async () => {
      try {
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

        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, contact_email, contact_phone, location, is_active, name")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (storeError && storeError.code !== "PGRST116") {
          console.error("Store fetch error:", storeError);
        } else {
          setStoreInfo(storeData || null);
        }

      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
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

  useEffect(() => {
    const fetchUnreadMessagesCount = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setUnreadMessagesCount(0);
          return;
        }

        const { data: userStores } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", currentUser.id);

        const storeIds = userStores?.map(store => store.id) || [];
        
        let query = supabase
          .from("store_messages")
          .select("id, sender_role, user_id, store_id, status");

        if (storeIds.length > 0) {
          query = query.or(`user_id.eq.${currentUser.id},store_id.in.(${storeIds.join(',')})`);
        } else {
          query = query.eq("user_id", currentUser.id);
        }

        const { data: allMessages, error } = await query;

        if (error) {
          console.error("Error fetching messages:", error);
          setUnreadMessagesCount(0);
          return;
        }

        const unreadCount = allMessages?.filter(message => {
          const isUnread = message.status === 'sent';
          const isStoreOwner = storeIds.includes(message.store_id);
          
          if (isStoreOwner) {
            return isUnread && message.sender_role === 'buyer';
          } else {
            return isUnread && message.sender_role === 'seller';
          }
        }).length || 0;

        setUnreadMessagesCount(unreadCount);
      } catch (error) {
        console.error("Error fetching unread messages count:", error);
        setUnreadMessagesCount(0);
      }
    };

    fetchUnreadMessagesCount();
    
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_messages',
        },
        () => {
          fetchUnreadMessagesCount();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user, storeInfo]);

  useEffect(() => {
    const fetchNewOrdersCount = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setNewOrdersCount(0);
          return;
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id", { count: 'exact' })
          .eq("buyer_id", currentUser.id)
          .neq("status", "completed")
          .neq("escrow_released", true);

        if (!ordersError && ordersData) {
          setNewOrdersCount(ordersData.length);
        }
      } catch (error) {
        console.error("Error fetching new orders count:", error);
        setNewOrdersCount(0);
      }
    };

    fetchNewOrdersCount();
    
    const ordersSubscription = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchNewOrdersCount();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
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
      .select(`
        id, name, description, price, discount, stock_quantity,
        category, tags, image_gallery, created_at, views,
        is_featured, is_rare_drop, is_flash_sale, is_trending,
        lipa_polepole, installment_plan,
        store_id,
        stores!inner (
          id, 
          is_active,
          location_lat,
          location_lng
        )
      `)
      .eq("visibility", "public")
      .eq("status", "active")
      .eq("stores.is_active", true)
      .not("stores.location_lat", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
      return;
    }

    const validProducts = data?.filter(p => p.stores?.is_active) || [];

    const productIds = validProducts.map(p => p.id);
    const { data: ratingsData } = await supabase
      .from("product_ratings")
      .select("product_id, avg_rating, rating_count")
      .in("product_id", productIds);

    const ratingsAvgMap = new Map(ratingsData?.map(r => [r.product_id, r.avg_rating]) || []);
    const ratingsCountMap = new Map(ratingsData?.map(r => [r.product_id, r.rating_count]) || []);

    const withImagesAndRatings = validProducts.map(p => ({
      ...p,
      imageUrl: getImageUrl(p.image_gallery?.[0]),
      average_rating: ratingsAvgMap.get(p.id) || 0,
      rating_count: ratingsCountMap.get(p.id) || 0,
      store_lat: p.stores?.location_lat,
      store_lng: p.stores?.location_lng,
      tags: Array.isArray(p.tags) ? p.tags : (p.tags ? JSON.parse(p.tags) : [])
    }));

    setProducts(prev => {
      const combined = [...prev, ...withImagesAndRatings];
      return Array.from(new Map(combined.map(p => [p.id, p])).values());
    });
    setPage(prev => prev + 1);
    
    if (validProducts.length < pageSize) {
      setHasMore(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = [...products];

    // Apply sorting based on buyer location for "Near You" tab
    if (buyerLocation && activeTab === "Near You") {
      result.sort((a, b) => {
        const distA = calculateDistance(buyerLocation.lat, buyerLocation.lng, a.store_lat, a.store_lng);
        const distB = calculateDistance(buyerLocation.lat, buyerLocation.lng, b.store_lat, b.store_lng);
        return distA - distB;
      });
    }

    // Apply filters
    if (filters.category) {
      result = result.filter(p => p.category?.toLowerCase().trim() === filters.category);
    }
    
    if (filters.minPrice) {
      result = result.filter(p => parseFloat(p.price) >= parseFloat(filters.minPrice));
    }
    
    if (filters.maxPrice) {
      result = result.filter(p => parseFloat(p.price) <= parseFloat(filters.maxPrice));
    }
    
    if (filters.minRating) {
      result = result.filter(p => p.average_rating >= filters.minRating);
    }
    
    if (filters.inStock) {
      result = result.filter(p => p.stock_quantity > 0);
    }
    
    if (filters.quickFilter) {
      switch (filters.quickFilter) {
        case "flash":
          result = result.filter(p => p.is_flash_sale);
          break;
        case "trending":
          result = result.filter(p => p.is_trending || p.views > 20);
          break;
        case "featured":
          result = result.filter(p => p.is_featured);
          break;
        case "discounted":
          result = result.filter(p => parseFloat(p.discount || 0) > 0);
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
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    // Apply tab filters
    switch (activeTab) {
      case "Lipa Mdogomdogo":
        // NEW: Filter for installment products
        result = result.filter(p => p.lipa_polepole === true);
        break;
      case "Near You":
        if (buyerLocation) {
          result = result.filter(p => {
            const dist = calculateDistance(buyerLocation.lat, buyerLocation.lng, p.store_lat, p.store_lng);
            // UPDATED: Changed from 100km to 200km
            return dist < 110; // Within 200km
          });
        }
        break;
      case "Flash Sale": 
        result = result.filter(p => p.is_flash_sale); 
        break;
      case "Trending": 
        result = result.filter(p => p.is_trending || p.views > 20); 
        break;
      case "Discounted": 
        result = result.filter(p => parseFloat(p.discount || 0) > 0); 
        break;
      case "Featured": 
        result = result.filter(p => p.is_featured); 
        break;
      case "Electronics": 
        result = result.filter(p => p.category?.toLowerCase() === "electronics"); 
        break;
      case "Fashion": 
        result = result.filter(p => 
          p.category?.toLowerCase().includes("fashion") || 
          p.tags?.some(tag => tag.toLowerCase().includes("fashion"))
        ); 
        break;
      case "Home": 
        result = result.filter(p => 
          p.category?.toLowerCase().includes("home") || 
          p.tags?.some(tag => tag.toLowerCase().includes("home"))
        ); 
        break;
      case "Gaming":
        result = result.filter(p => 
          p.category?.toLowerCase().includes("gaming") || 
          p.tags?.some(tag => 
            tag.toLowerCase().includes("gaming") ||
            tag.toLowerCase().includes("game") ||
            tag.toLowerCase().includes("console") ||
            tag.toLowerCase().includes("playstation") ||
            tag.toLowerCase().includes("xbox") ||
            tag.toLowerCase().includes("nintendo")
          )
        );
        break;
    }

    setFiltered(result);
  }, [products, filters, activeTab, buyerLocation]);

  const handleSearch = () => {
    navigate("/search", { state: { query: search } });
  };

  if (initialLoad) {
    return (
      <div className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}>
        <NavigationSkeleton />
        <TaglineSkeleton />
        <SearchSkeleton />
        <TabsSkeleton />
        <div className="product-grid">
          {[...Array(10)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}>
      {/* COMPACT NAVIGATION BAR */}
      <nav className="premium-navbar compact">
        <motion.button
          onClick={toggleMenu}
          className="nav-icon profile-icon-wrapper"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaUserCircle size={22} />
          {newAdminNotification && <span className="dot top-left-dot" />}
        </motion.button>

        <div className="nav-center">
          <motion.div 
            className="search-bar compact"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={handleSearchRedirect}
            style={{ cursor: "pointer" }}
          >
            <FaSearch size={14} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSearchRedirect();
              }}
              readOnly
            />
          </motion.div>
        </div>

        <div className="nav-right">
          <PremiumStoreButton 
            storeInfo={storeInfo}
            hasActiveSubscription={hasActiveSubscription}
            onStoreClick={() => {
              if (storeInfo && storeInfo.is_active) {
                navigate(`/dashboard/store/${storeInfo.id}`);
              } else {
                setShowStoreModal(true);
              }
            }}
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
            <FaEnvelope size={16} />
            {unreadMessagesCount > 0 && (
              <span className="notification-badge compact">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
          </motion.button>

          <motion.button
            onClick={() => {
              if (!user) {
                handleAuthRequired();
                return;
              }
              navigate("/orders");
            }}
            className="nav-icon orders-wrapper"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="My Orders"
          >
            <FaEye size={16} />
            {newOrdersCount > 0 && (
              <span className="notification-badge compact">
                {newOrdersCount > 99 ? '99+' : newOrdersCount}
              </span>
            )}
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

      {/* Simple tagline section above promoted carousel */}
      <div className="marketplace-tagline">
        <p className="tagline-text">Kenya's #1 Marketplace — Discover Amazing Deals!</p>
      </div>

      {/* Promoted Carousel Section */}
      <div className="promoted-section-fixed">
        <PromotedCarousel />
      </div>

      {/* Only show FlashDeals and FeaturedHighlights when NOT on Home tab */}
      {activeTab !== "Home" && (
        <>
          <FlashDeals />
          <FeaturedHighlights />
        </>
      )}

      {/* PERMANENT TABS - Just below top nav like Kilimall */}
      <div className="tab-bar-permanent-wrapper">
        <motion.div 
          className="tab-bar-scrollable permanent"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              className={`tab-button permanent ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab === "Near You" && buyerLocation && <FaMapMarkerAlt style={{ marginRight: 4 }} />}
              {tab === "Gaming" && <FaGamepad style={{ marginRight: 4 }} />}
              {tab === "Lipa Mdogomdogo" && <FaMoneyBillWave style={{ marginRight: 4 }} />}
              {tab}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Content that comes after tabs */}
      <div className="content-below-tabs">
        {/* Home Tab - Show HomeTabSections only */}
        {activeTab === "Home" ? (
          <div className="home-sections-wrapper">
            <HomeTabSections />
          </div>
        ) : (
          /* Other Tabs - Show products with infinite scroll */
          <InfiniteScroll
            dataLength={filtered.length}
            next={fetchProducts}
            hasMore={hasMore}
            loader={
              <div className="loading-section">
                <div className="skeleton-loader">
                  {[...Array(6)].map((_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              </div>
            }
            endMessage={
              <div className="end-message">
                <p>You've discovered all our products!</p>
              </div>
            }
          >
            <motion.div 
              className="product-grid"
              layout
            >
              {filtered.length === 0 ? (
                <EmptyTabState tabName={activeTab} />
              ) : (
                filtered.map((p) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    buyerLocation={buyerLocation}
                    onClick={() => navigate(`/product/${p.id}`)}
                    onAuthRequired={handleAuthRequired}
                  />
                ))
              )}
            </motion.div>
          </InfiniteScroll>
        )}
      </div>

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