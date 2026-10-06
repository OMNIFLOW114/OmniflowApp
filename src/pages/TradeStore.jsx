// src/pages/TradeStore.jsx - FULLY UPDATED, PRODUCTION READY
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import {
  FaStore, FaSearch, FaStar, FaBolt,
  FaFire,
  FaUserCircle, FaEnvelope,
  FaCrown, FaGem, FaEye, FaMapMarkerAlt,
  FaGamepad, FaMoneyBillWave, FaLocationArrow, FaTags,
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

// ==============================================================
// TOAST HELPERS — modern, consistent across the page
// ==============================================================
const toastSuccess = (msg) =>
  toast.success(msg, {
    duration: 2600,
    style: {
      borderRadius: "14px",
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "#ffffff",
      fontWeight: 600,
      fontSize: "0.85rem",
      padding: "12px 16px",
      boxShadow: "0 10px 30px rgba(16, 185, 129, 0.25)",
    },
    iconTheme: { primary: "#ffffff", secondary: "#10b981" },
  });

const toastError = (msg) =>
  toast.error(msg, {
    duration: 3400,
    style: {
      borderRadius: "14px",
      background: "#0f0f16",
      color: "#fecaca",
      fontWeight: 600,
      fontSize: "0.85rem",
      padding: "12px 16px",
      border: "1px solid rgba(239, 68, 68, 0.35)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
    },
    iconTheme: { primary: "#ef4444", secondary: "#0f0f16" },
  });

const toastInfo = (msg) =>
  toast(msg, {
    duration: 2600,
    icon: "📍",
    style: {
      borderRadius: "14px",
      background: "#0f0f16",
      color: "#c7d2fe",
      fontWeight: 600,
      fontSize: "0.85rem",
      padding: "12px 16px",
      border: "1px solid rgba(102, 126, 234, 0.35)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
    },
  });

// Cache keys
const CACHE_KEYS = {
  PRODUCTS: "trade_store_products",
  FILTERED: "trade_store_filtered",
  SEARCH: "trade_store_search",
  PAGE: "trade_store_page",
  ACTIVE_TAB: "trade_store_active_tab",
  HAS_MORE: "trade_store_has_more",
  BUYER_LOCATION: "trade_store_buyer_location",
  FILTERS: "trade_store_filters",
  CACHE_TIMESTAMP: "trade_store_cache_timestamp",
  SCROLL_POSITION: "trade_store_scroll_position",
  LOCATION_FETCHED: "trade_store_location_fetched",
  INITIAL_LOAD_DONE: "trade_store_initial_load_done",
};

const CACHE_EXPIRY = 5 * 60 * 1000;

const tabs = [
  "All",
  "Lipa Mdogomdogo",
  "Near You",
  "Flash Sale",
  "Electronics",
  "Fashion",
  "Home",
  "Gaming",
  "Trending",
  "Discounted",
  "Featured",
];

// ========== SKELETONS ==========
const NavigationSkeleton = () => (
  <nav className="premium-navbar compact skeleton">
    <div className="nav-left-skeleton"><div className="skeleton-circle" /></div>
    <div className="nav-center-skeleton"><div className="skeleton-search" /></div>
    <div className="nav-right-skeleton">
      <div className="skeleton-circle" />
      <div className="skeleton-circle" />
      <div className="skeleton-circle" />
    </div>
  </nav>
);

const TaglineSkeleton = () => (
  <div className="marketplace-tagline skeleton">
    <div className="skeleton-tagline" />
  </div>
);

const PromotedCarouselSkeleton = () => (
  <div className="promoted-section-fixed skeleton">
    <div className="skeleton-carousel" />
  </div>
);

const TabsSkeleton = () => (
  <div className="tab-bar-permanent-wrapper skeleton">
    <div className="tab-bar-scrollable permanent">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton-tab" />
      ))}
    </div>
  </div>
);

const ProductCardSkeleton = () => (
  <div className="product-card skeleton">
    <div className="product-img-wrapper skeleton">
      <div className="skeleton-image" />
    </div>
    <div className="product-card-content">
      <div className="skeleton-line skeleton-title" />
      <div className="compact-price skeleton">
        <div className="skeleton-price-new" />
        <div className="skeleton-price-old" />
      </div>
      <div className="compact-meta skeleton">
        <div className="skeleton-stars">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-star" />
          ))}
        </div>
        <div className="skeleton-stock" />
      </div>
      <div className="compact-distance skeleton">
        <div className="skeleton-distance-icon" />
        <div className="skeleton-distance-text" />
      </div>
    </div>
  </div>
);

const FlashDealsSkeleton = () => (
  <div className="flash-deals-section skeleton">
    <div className="skeleton-section-header">
      <div className="skeleton-header-icon" />
      <div className="skeleton-header-title" />
    </div>
    <div className="flash-deals-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-flash-card" />
      ))}
    </div>
  </div>
);

const FeaturedHighlightsSkeleton = () => (
  <div className="featured-highlights-section skeleton">
    <div className="skeleton-section-header">
      <div className="skeleton-header-icon" />
      <div className="skeleton-header-title" />
    </div>
    <div className="featured-grid">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton-featured-card" />
      ))}
    </div>
  </div>
);

const EmptyTabState = ({ tabName }) => (
  <div className="empty-tab-state">
    <div className="empty-tab-icon">
      {tabName === "Gaming" ? (
        <FaGamepad />
      ) : tabName === "Near You" ? (
        <FaMapMarkerAlt />
      ) : tabName === "Lipa Mdogomdogo" ? (
        <FaMoneyBillWave />
      ) : (
        <FaTags />
      )}
    </div>
    <h3>No {tabName} Products Yet</h3>
    <p>Check back soon for exciting {tabName.toLowerCase()} products!</p>
  </div>
);

const PageSkeleton = () => (
  <div className="marketplace-wrapper">
    <NavigationSkeleton />
    <TaglineSkeleton />
    <PromotedCarouselSkeleton />
    <TabsSkeleton />
    <div className="content-below-tabs">
      <FlashDealsSkeleton />
      <FeaturedHighlightsSkeleton />
      <div className="product-grid skeleton-grid">
        {[...Array(12)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

// ========== DISTANCE ==========
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatDistance = (km) => {
  if (km === Infinity) return "";
  if (km < 1) return `${(km * 1000).toFixed(0)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
};

const getDeliveryTime = (d) => {
  if (d === Infinity) return "Standard";
  if (d <= 100) return "Same Day";
  if (d <= 220) return "Next Day";
  return "3 Days";
};

const getDeliveryColor = (d) => {
  if (d === Infinity) return "#94a3b8";
  if (d <= 100) return "#10b981";
  if (d <= 220) return "#f59e0b";
  return "#ef4444";
};

// ========== PRODUCT CARD ==========
const ProductCard = memo(({ product, onClick, buyerLocation }) => {
  const distance =
    buyerLocation?.lat && product.store_lat
      ? calculateDistance(
          buyerLocation.lat,
          buyerLocation.lng,
          product.store_lat,
          product.store_lng
        )
      : Infinity;

  const deliveryTime = getDeliveryTime(distance);
  const deliveryColor = getDeliveryColor(distance);

  const getBadge = () => {
    const isFlashActive =
      product.is_flash_sale &&
      product.flash_sale_ends_at &&
      new Date(product.flash_sale_ends_at) > new Date();

    if (isFlashActive)
      return (
        <span className="badge flash">
          <FaBolt /> Flash
        </span>
      );
    if (product.is_trending)
      return (
        <span className="badge trending">
          <FaFire /> Trending
        </span>
      );
    if (product.is_featured) return <span className="badge featured">Featured</span>;
    if (product.lipa_polepole)
      return (
        <span className="badge installment">
          <FaMoneyBillWave /> Lipa
        </span>
      );
    return null;
  };

  const hasDiscount = parseFloat(product.discount || 0) > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - parseFloat(product.discount) / 100)
    : product.price;

  const averageRating = product.average_rating || 0;

  return (
    <motion.div
      className="product-card"
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="product-img-wrapper">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.src = "/placeholder.jpg";
          }}
        />
        {getBadge()}
      </div>

      <div className="product-card-content">
        <h3>{product.name}</h3>

        <div className="compact-price">
          {hasDiscount ? (
            <>
              <span className="price-new">
                KSH {Number(discountedPrice).toLocaleString("en-KE")}
              </span>
              <span className="price-old">
                KSH {Number(product.price).toLocaleString("en-KE")}
              </span>
            </>
          ) : (
            <span className="price-new">
              KSH {Number(product.price).toLocaleString("en-KE")}
            </span>
          )}
        </div>

        <div className="compact-meta">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                className={i < Math.round(averageRating) ? "star-filled" : "star-empty"}
              />
            ))}
          </div>
          <span className="stock-indicator">
            {product.stock_quantity > 0 ? "In Stock" : "Out"}
          </span>
        </div>

        <div className="compact-distance" style={{ color: deliveryColor }}>
          <FaMapMarkerAlt size={10} />
          {distance !== Infinity ? (
            <span>
              {formatDistance(distance)} · {deliveryTime}
            </span>
          ) : (
            <span>Location unavailable</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
ProductCard.displayName = "ProductCard";

// ========== PREMIUM STORE BUTTON ==========
const PremiumStoreButton = memo(
  ({ storeInfo, hasActiveSubscription, onStoreClick, onAuthRequired }) => {
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
        className={`nav-icon store-button ${
          isStoreOwner ? "premium-store" : ""
        } ${hasPremiumStore ? "vip-store" : ""}`}
        onClick={handleClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={isStoreOwner ? "Manage Your Store" : "Become a Seller"}
      >
        {hasPremiumStore ? (
          <FaCrown size={16} className="premium-icon" />
        ) : isStoreOwner ? (
          <FaGem size={16} className="premium-icon" />
        ) : (
          <FaStore size={16} />
        )}
        {isStoreOwner && (
          <span className="premium-badge">{hasPremiumStore ? "VIP" : "PRO"}</span>
        )}
      </motion.button>
    );
  }
);
PremiumStoreButton.displayName = "PremiumStoreButton";

// ========== CREATE STORE MODAL ==========
const CreateStoreModal = memo(
  ({ isOpen, onClose, storeInfo, hasActiveSubscription }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleAction = () => {
      if (!user) {
        toastError("Please log in to start selling.");
        navigate("/auth");
        onClose();
        return;
      }

      if (storeInfo) {
        const { id, contact_email, contact_phone, location, is_active } = storeInfo;
        const incomplete = !contact_email || !contact_phone || !location;

        if (!is_active) {
          toastError("Your store has been deactivated. Contact support.");
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
              <p className="premium-text">
                You're already a seller! Manage your store and grow your business.
              </p>
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
              <p className="premium-text">
                Join thousands of sellers earning on OmniMarket. Start your store in
                minutes!
              </p>
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
          <button className="glass-button secondary" onClick={onClose}>
            Maybe Later
          </button>
          <button
            className={`premium-action-button ${
              storeInfo ? "manage" : "create"
            }`}
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
  }
);
CreateStoreModal.displayName = "CreateStoreModal";

// ========== CACHE HELPERS ==========
const loadFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    return data;
  } catch {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (err) {
    console.error(`Error saving cache ${key}:`, err);
  }
};

const clearHomepageCache = () => {
  Object.values(CACHE_KEYS).forEach((key) => {
    if (key !== "userLocation" && key !== "locationPermission") {
      localStorage.removeItem(key);
    }
  });
};

// ================================================================
// MAIN COMPONENT
// ================================================================
const TradeStore = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const BOTTOM_NAV_HEIGHT = 70;
  const [bottomPadding, setBottomPadding] = useState(BOTTOM_NAV_HEIGHT + 20);

  const isMountedRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const initialLoadDoneRef = useRef(
    loadFromCache(CACHE_KEYS.INITIAL_LOAD_DONE, false)
  );
  const darkModeLoadedRef = useRef(false);
  const cacheDataRef = useRef({
    isInitialized: initialLoadDoneRef.current,
    lastFetchTime: 0,
    productCache: new Map(),
    isFetchingLocation: false,
    hasInitialFetch: false,
  });

  const [products, setProducts] = useState(() =>
    loadFromCache(CACHE_KEYS.PRODUCTS, [])
  );
  const [filtered, setFiltered] = useState(() =>
    loadFromCache(CACHE_KEYS.FILTERED, [])
  );
  const [search, setSearch] = useState(() =>
    loadFromCache(CACHE_KEYS.SEARCH, "")
  );
  const [hasMore, setHasMore] = useState(() =>
    loadFromCache(CACHE_KEYS.HAS_MORE, true)
  );
  const [page, setPage] = useState(() => loadFromCache(CACHE_KEYS.PAGE, 1));
  const [activeTab, setActiveTab] = useState(() =>
    loadFromCache(CACHE_KEYS.ACTIVE_TAB, "All")
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [filters, setFilters] = useState(() =>
    loadFromCache(CACHE_KEYS.FILTERS, {
      category: "",
      minPrice: "",
      maxPrice: "",
      minRating: 0,
      inStock: false,
      sortBy: "newest",
      quickFilter: "",
    })
  );
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newAdminNotification] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [storeInfo, setStoreInfo] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!initialLoadDoneRef.current);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [buyerLocation, setBuyerLocation] = useState(() => {
    const cached = loadFromCache(CACHE_KEYS.BUYER_LOCATION, null);
    if (
      cached &&
      cached.timestamp &&
      Date.now() - cached.timestamp < 60 * 60 * 1000
    ) {
      return cached;
    }
    return null;
  });

  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [, setIsLocationBlocked] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);

  const pageSize = 20;

  // Bottom padding
  useEffect(() => {
    const update = () => {
      setBottomPadding(window.innerWidth >= 768 ? 20 : BOTTOM_NAV_HEIGHT + 20);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toggleMenu = useCallback(() => setShowMenu((p) => !p), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);
  const handleAuthRequired = useCallback(() => {
    toastError("Please log in to continue");
    navigate("/auth");
  }, [navigate]);
  const handleSearchRedirect = useCallback(() => navigate("/search"), [navigate]);

  // Persist cache
  useEffect(() => {
    if (isMountedRef.current) {
      saveToCache(CACHE_KEYS.PRODUCTS, products);
      saveToCache(CACHE_KEYS.FILTERED, filtered);
      saveToCache(CACHE_KEYS.SEARCH, search);
      saveToCache(CACHE_KEYS.HAS_MORE, hasMore);
      saveToCache(CACHE_KEYS.PAGE, page);
      saveToCache(CACHE_KEYS.ACTIVE_TAB, activeTab);
      saveToCache(CACHE_KEYS.FILTERS, filters);
      saveToCache(CACHE_KEYS.INITIAL_LOAD_DONE, true);
      if (buyerLocation) {
        saveToCache(CACHE_KEYS.BUYER_LOCATION, {
          ...buyerLocation,
          timestamp: Date.now(),
        });
      }
    }
  }, [products, filtered, search, hasMore, page, activeTab, filters, buyerLocation]);

  // Scroll position
  useEffect(() => {
    const onScroll = () => {
      scrollPositionRef.current = window.scrollY;
      saveToCache(CACHE_KEYS.SCROLL_POSITION, window.scrollY);
    };
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      saveToCache(CACHE_KEYS.SCROLL_POSITION, scrollPositionRef.current);
    };
  }, []);

  // Restore scroll on mount
  useEffect(() => {
    const saved = loadFromCache(CACHE_KEYS.SCROLL_POSITION, 0);
    if (saved > 0) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    }
    isMountedRef.current = true;
  }, []);

  // ==============================================================
  // GEOLOCATION
  // ==============================================================
  const fetchUserLocation = useCallback(
    async (forceRefresh = false) => {
      if (isLocationLoading || !navigator.geolocation) {
        setIsLocationBlocked(true);
        setHasRequestedLocation(true);
        return;
      }
      setIsLocationLoading(true);
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: forceRefresh ? 0 : 300000,
          });
        });
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        setBuyerLocation(location);
        setHasRequestedLocation(true);
        setIsLocationBlocked(false);
        localStorage.setItem("userLocation", JSON.stringify(location));
        localStorage.setItem("locationPermission", "granted");
        if (forceRefresh) toastSuccess("Location updated! Showing nearby products.");
      } catch {
        setHasRequestedLocation(true);
        setIsLocationBlocked(true);
        localStorage.setItem("locationPermission", "denied");
        if (forceRefresh)
          toastError("Unable to get your location. Please enable location services.");
      } finally {
        setIsLocationLoading(false);
      }
    },
    [isLocationLoading]
  );

  useEffect(() => {
    if (!buyerLocation && !hasRequestedLocation) {
      fetchUserLocation(false);
    } else if (buyerLocation) {
      setHasRequestedLocation(true);
    }
  }, [buyerLocation, hasRequestedLocation, fetchUserLocation]);

  useEffect(() => {
    let watchId = null;
    if (navigator.geolocation && buyerLocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };
          const dist = calculateDistance(
            buyerLocation.lat,
            buyerLocation.lng,
            newLoc.lat,
            newLoc.lng
          );
          if (dist > 0.5) {
            setBuyerLocation(newLoc);
            toastInfo("Location updated based on your movement");
          }
        },
        (err) => console.log("Location watch error:", err.message),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [buyerLocation]);

  // ==============================================================
  // USER DATA (store + subscription)
  // ==============================================================
  useEffect(() => {
    if (!user?.id) {
      setInitialLoad(false);
      return;
    }
    const fetchUserData = async () => {
      try {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        setHasActiveSubscription(!!sub);

        const { data: store } = await supabase
          .from("stores")
          .select("id, contact_email, contact_phone, location, is_active, name")
          .eq("owner_id", user.id)
          .maybeSingle();
        setStoreInfo(store || null);
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setInitialLoad(false);
      }
    };
    fetchUserData();
  }, [user]);

  // Dark mode
  useEffect(() => {
    if (!user?.id || darkModeLoadedRef.current) return;
    supabase
      .from("users")
      .select("dark_mode")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data !== null && data !== undefined) {
          setIsDarkMode(data.dark_mode);
          document.body.setAttribute(
            "data-theme",
            data.dark_mode ? "dark" : "light"
          );
          darkModeLoadedRef.current = true;
        }
      })
      .catch((err) => console.error("Error fetching dark mode:", err));
  }, [user]);

  useEffect(() => {
    if (!user?.id || !darkModeLoadedRef.current) return;
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    supabase
      .from("users")
      .update({ dark_mode: isDarkMode })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.error("Error saving dark mode:", error);
      });
  }, [isDarkMode, user]);

  // Unread messages count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const {
          data: { user: cu },
        } = await supabase.auth.getUser();
        if (!cu) return setUnreadMessagesCount(0);

        const { data: userStores } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", cu.id);
        const storeIds = userStores?.map((s) => s.id) || [];

        let query = supabase
          .from("store_messages")
          .select("id, sender_role, user_id, store_id, status, is_read");

        if (storeIds.length > 0) {
          query = query.or(`user_id.eq.${cu.id},store_id.in.(${storeIds.join(",")})`);
        } else {
          query = query.eq("user_id", cu.id);
        }

        const { data: msgs } = await query;
        const count =
          msgs?.filter((m) => {
            const isUnread = !m.is_read && m.status !== "read";
            const isOwner = storeIds.includes(m.store_id);
            return isOwner
              ? isUnread && m.sender_role === "buyer"
              : isUnread && m.sender_role === "seller";
          }).length || 0;

        setUnreadMessagesCount(count);
      } catch {
        setUnreadMessagesCount(0);
      }
    };
    fetchUnread();
    const sub = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_messages" },
        fetchUnread
      )
      .subscribe();
    return () => sub.unsubscribe();
  }, [user, storeInfo]);

  // Orders count
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const {
          data: { user: cu },
        } = await supabase.auth.getUser();
        if (!cu) return setNewOrdersCount(0);

        const { data } = await supabase
          .from("orders")
          .select("id", { count: "exact" })
          .eq("buyer_id", cu.id)
          .neq("status", "completed")
          .neq("escrow_released", true);
        if (data) setNewOrdersCount(data.length);
      } catch {
        setNewOrdersCount(0);
      }
    };
    fetchOrders();
    const sub = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        fetchOrders
      )
      .subscribe();
    return () => sub.unsubscribe();
  }, []);

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data
      .publicUrl;
  }, []);

  // ==============================================================
  // FETCH PRODUCTS — the important one
  // ==============================================================
  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      if (isRefreshingRef.current || isFetchingProducts) return;
      if (!hasMore && !forceRefresh) return;

      isRefreshingRef.current = true;
      setIsFetchingProducts(true);
      setIsLoadingMore(true);

      const currentPage = forceRefresh ? 1 : page;
      const offset = (currentPage - 1) * pageSize;

      try {
        const { data, error, count } = await supabase
          .from("products")
          .select(
            `
            id, name, description, price, discount, stock_quantity,
            category, tags, image_gallery, created_at, views,
            is_featured, is_rare_drop, is_flash_sale, is_trending,
            lipa_polepole, flash_sale_ends_at, installment_plan,
            store_id,
            stores!inner (id, is_active, location_lat, location_lng)
          `,
            { count: "exact" }
          )
          .eq("visibility", "public")
          .eq("status", "active")
          .eq("stores.is_active", true)
          .not("stores.location_lat", "is", null)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        const validProducts = data?.filter((p) => p.stores?.is_active) || [];
        const productIds = validProducts.map((p) => p.id);

        let ratingsMap = new Map();
        if (productIds.length > 0) {
          const { data: ratings } = await supabase
            .from("ratings")
            .select("product_id, rating")
            .in("product_id", productIds);

          ratings?.forEach((r) => {
            if (!ratingsMap.has(r.product_id))
              ratingsMap.set(r.product_id, { total: 0, count: 0 });
            const cur = ratingsMap.get(r.product_id);
            cur.total += r.rating;
            cur.count += 1;
          });
        }

        const enriched = validProducts.map((p) => ({
          ...p,
          imageUrl: getImageUrl(p.image_gallery?.[0]),
          average_rating: ratingsMap.has(p.id)
            ? ratingsMap.get(p.id).total / ratingsMap.get(p.id).count
            : 0,
          rating_count: ratingsMap.has(p.id) ? ratingsMap.get(p.id).count : 0,
          store_lat: p.stores?.location_lat,
          store_lng: p.stores?.location_lng,
          tags: Array.isArray(p.tags)
            ? p.tags
            : p.tags
            ? JSON.parse(p.tags)
            : [],
        }));

        // FIX: merge correctly so infinite scroll keeps existing items
        if (forceRefresh) {
          setProducts(enriched);
          setPage(2);
        } else {
          setProducts((prev) => {
            const combined = [...prev, ...enriched];
            const unique = Array.from(
              new Map(combined.map((p) => [p.id, p])).values()
            );
            return unique;
          });
          setPage((prev) => prev + 1);
        }

        if (count !== undefined) {
          setHasMore(offset + enriched.length < count);
        } else {
          setHasMore(enriched.length === pageSize);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        toastError("Failed to load more products");
      } finally {
        isRefreshingRef.current = false;
        setIsFetchingProducts(false);
        setIsLoadingMore(false);
      }
    },
    [page, getImageUrl, pageSize, isFetchingProducts, hasMore]
  );

  // Initial load
  useEffect(() => {
    if (
      products.length === 0 &&
      !cacheDataRef.current.hasInitialFetch
    ) {
      cacheDataRef.current.hasInitialFetch = true;
      fetchProducts();
      cacheDataRef.current.isInitialized = true;
      initialLoadDoneRef.current = true;
    } else if (products.length > 0) {
      setInitialLoad(false);
    }
  }, [products.length, fetchProducts]);

  // ==============================================================
  // FILTER — recompute whenever products / filters / tab change
  // FIX: filtered is always derived from products, so new pages
  // automatically appear in the active tab without resetting.
  // ==============================================================
  useEffect(() => {
    let result = [...products];

    if (buyerLocation && activeTab === "Near You") {
      result.sort((a, b) => {
        const dA = calculateDistance(
          buyerLocation.lat,
          buyerLocation.lng,
          a.store_lat,
          a.store_lng
        );
        const dB = calculateDistance(
          buyerLocation.lat,
          buyerLocation.lng,
          b.store_lat,
          b.store_lng
        );
        return dA - dB;
      });
    }

    if (filters.category)
      result = result.filter(
        (p) => p.category?.toLowerCase().trim() === filters.category
      );
    if (filters.minPrice)
      result = result.filter((p) => parseFloat(p.price) >= parseFloat(filters.minPrice));
    if (filters.maxPrice)
      result = result.filter((p) => parseFloat(p.price) <= parseFloat(filters.maxPrice));
    if (filters.minRating)
      result = result.filter((p) => p.average_rating >= filters.minRating);
    if (filters.inStock) result = result.filter((p) => p.stock_quantity > 0);

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
        default:
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
        result.sort(
          (a, b) => parseFloat(b.average_rating) - parseFloat(a.average_rating)
        );
        break;
      case "popular":
        result.sort((a, b) => parseFloat(b.views) - parseFloat(a.views));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    switch (activeTab) {
      case "Lipa Mdogomdogo":
        result = result.filter((p) => p.lipa_polepole === true);
        break;
      case "Near You":
        if (buyerLocation) {
          result = result.filter(
            (p) =>
              calculateDistance(
                buyerLocation.lat,
                buyerLocation.lng,
                p.store_lat,
                p.store_lng
              ) < 110
          );
        }
        break;
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
        result = result.filter(
          (p) =>
            p.category?.toLowerCase().includes("fashion") ||
            p.tags?.some((t) => t.toLowerCase().includes("fashion"))
        );
        break;
      case "Home":
        result = result.filter(
          (p) =>
            p.category?.toLowerCase().includes("home") ||
            p.tags?.some((t) => t.toLowerCase().includes("home"))
        );
        break;
      case "Gaming":
        result = result.filter(
          (p) =>
            p.category?.toLowerCase().includes("gaming") ||
            p.tags?.some((t) =>
              [
                "gaming",
                "game",
                "console",
                "playstation",
                "xbox",
                "nintendo",
              ].some((k) => t.toLowerCase().includes(k))
            )
        );
        break;
      default:
        break;
    }

    setFiltered(result);
  }, [products, filters, activeTab, buyerLocation]);

  const handleSearch = useCallback(
    () => navigate("/search", { state: { query: search } }),
    [navigate, search]
  );

  // Pull-to-refresh
  useEffect(() => {
    let touchStartY = 0,
      touchStartTime = 0,
      isPull = false;

    const onStart = (e) => {
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };
    const onMove = (e) => {
      if (window.scrollY === 0 && !isRefreshingRef.current && !isPull) {
        const dist = e.touches[0].clientY - touchStartY;
        if (dist > 100) {
          isPull = true;
          const ind = document.createElement("div");
          ind.className = "pull-to-refresh-indicator";
          ind.textContent = "Refreshing...";
          document.body.prepend(ind);
          setTimeout(() => ind.remove(), 2000);
        }
      }
    };
    const onEnd = () => {
      if (isPull && !isRefreshingRef.current) {
        if (Date.now() - touchStartTime > 100) refreshProducts();
      }
      isPull = false;
    };

    document.addEventListener("touchstart", onStart);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProducts = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const id = toast.loading("Refreshing products...", {
        style: {
          borderRadius: "14px",
          background: "#0f0f16",
          color: "#c7d2fe",
          fontWeight: 600,
          fontSize: "0.85rem",
          padding: "12px 16px",
          border: "1px solid rgba(102, 126, 234, 0.35)",
        },
      });
      setProducts([]);
      setPage(1);
      setHasMore(true);
      cacheDataRef.current.hasInitialFetch = false;
      await fetchProducts(true);
      toast.success("Products refreshed!", { id });
    } catch (err) {
      console.error("Error refreshing products:", err);
      toastError("Failed to refresh products");
    } finally {
      isRefreshingRef.current = false;
    }
  }, [fetchProducts]);

  const handleRefreshLocation = useCallback(
    () => fetchUserLocation(true),
    [fetchUserLocation]
  );
  const handleMessagesClick = useCallback(() => {
    if (!user) {
      handleAuthRequired();
      return;
    }
    navigate("/messages");
  }, [user, navigate, handleAuthRequired]);

  // Loader for infinite scroll
  if (initialLoad && products.length === 0) {
    return (
      <div
        className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}
        style={{ paddingBottom: `${bottomPadding}px` }}
      >
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div
      className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}
      style={{ paddingBottom: `${bottomPadding}px` }}
    >
      {/* NAVBAR */}
      <nav className="premium-navbar compact">
        <motion.button
          onClick={toggleMenu}
          className="nav-icon profile-icon-wrapper"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaUserCircle size={20} />
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
            <FaSearch size={12} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSearchRedirect();
              }}
              readOnly
            />
            {buyerLocation && (
              <motion.button
                className="location-refresh-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshLocation();
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Refresh location"
              >
                <FaLocationArrow size={10} style={{ color: "#10b981" }} />
              </motion.button>
            )}
          </motion.div>
        </div>

        <div className="nav-right">
          <PremiumStoreButton
            storeInfo={storeInfo}
            hasActiveSubscription={hasActiveSubscription}
            onStoreClick={() => {
              if (storeInfo && storeInfo.is_active) navigate(`/seller/dashboard`);
              else setShowStoreModal(true);
            }}
            onAuthRequired={handleAuthRequired}
          />
          <motion.button
            onClick={handleMessagesClick}
            className="nav-icon messages-wrapper"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Messages"
          >
            <FaEnvelope size={14} />
            {unreadMessagesCount > 0 && (
              <span className="notification-badge compact">
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
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
            <FaEye size={14} />
            {newOrdersCount > 0 && (
              <span className="notification-badge compact">
                {newOrdersCount > 99 ? "99+" : newOrdersCount}
              </span>
            )}
          </motion.button>
        </div>
      </nav>

      {/* SIDEBAR */}
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
                clearHomepageCache();
                supabase.auth.signOut();
                navigate("/auth");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateStoreModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        storeInfo={storeInfo}
        hasActiveSubscription={hasActiveSubscription}
      />

      {/* TAGLINE */}
      <div className="marketplace-tagline">
        <p className="tagline-text">
          Kenya's #1 Marketplace — Discover Amazing Deals!
        </p>
      </div>

      {/* PROMOTED CAROUSEL */}
      <div className="promoted-section-fixed">
        <PromotedCarousel />
      </div>

      {/* TABS */}
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
              {tab === "Near You" && buyerLocation && (
                <FaMapMarkerAlt style={{ marginRight: 2 }} size={10} />
              )}
              {tab === "Gaming" && <FaGamepad style={{ marginRight: 2 }} size={10} />}
              {tab === "Lipa Mdogomdogo" && (
                <FaMoneyBillWave style={{ marginRight: 2 }} size={10} />
              )}
              {tab}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* CONTENT */}
      <div className="content-below-tabs">
        {activeTab !== "Home" && (
          <>
            <FlashDeals limit={4} showViewMore={true} />
            <FeaturedHighlights />
          </>
        )}

        {activeTab === "Home" ? (
          <div className="home-sections-wrapper">
            <HomeTabSections />
          </div>
        ) : (
          <InfiniteScroll
            dataLength={filtered.length}
            next={() => {
              if (hasMore && !isFetchingProducts) fetchProducts();
            }}
            hasMore={hasMore && !isFetchingProducts}
            loader={
              isLoadingMore && filtered.length > 0 ? (
                <div className="loading-section">
                  <div className="skeleton-loader">
                    {[...Array(6)].map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : null
            }
            endMessage={
              filtered.length > 0 && (
                <div className="end-message">
                  <p>You've discovered all our products!</p>
                </div>
              )
            }
            scrollThreshold={0.9}
          >
            <motion.div className="product-grid" layout>
              {filtered.length === 0 ? (
                <EmptyTabState tabName={activeTab} />
              ) : (
                filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    buyerLocation={buyerLocation}
                    onClick={() => navigate(`/product/${p.id}`)}
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
});

TradeStore.displayName = "TradeStore";
export default TradeStore;