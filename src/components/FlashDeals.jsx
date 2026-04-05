// src/components/FlashDeals.jsx - UPDATED WITH RETENTION & MINIMIZED SIZE
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBolt, FaTags, FaStar, FaArrowRight, FaClock, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./FlashDeals.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (!amount && amount !== 0) return "KSh 0";
  return `KSh ${Number(amount).toLocaleString("en-KE")}`;
};

// Cache keys for localStorage
const FLASH_CACHE_KEYS = {
  PRODUCTS: 'flash_deals_products_v3',
  CACHE_TIMESTAMP: 'flash_cache_timestamp_v3',
  DATA_VERSION: 'flash_data_version'
};

const FLASH_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache

const loadFlashFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > FLASH_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    return data;
  } catch (error) {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveFlashToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error(`Error saving cache ${key}:`, error);
  }
};

// Skeleton Component - Minimized for homepage
const FlashDealsSkeleton = () => (
  <section className="flash-deals-section loading">
    <div className="flash-header">
      <div className="flash-header-left">
        <div className="skeleton-icon"></div>
        <div className="flash-header-text">
          <div className="skeleton-title"></div>
          <div className="skeleton-subtitle"></div>
        </div>
      </div>
    </div>
    <div className="flash-carousel">
      {[...Array(4)].map((_, index) => (
        <div className="flash-card-skeleton" key={index}>
          <div className="flash-image-skeleton"></div>
          <div className="flash-content-skeleton">
            <div className="skeleton-name"></div>
            <div className="skeleton-price"></div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// Timer Component - Minimized
const FlashTimer = ({ endTime, now }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(endTime) - now;
      if (diff <= 0) return null;
      const hours = Math.floor(diff / 36e5);
      const minutes = Math.floor((diff % 36e5) / 6e4);
      const seconds = Math.floor((diff % 6e4) / 1e3);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      if (!newTime) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, now]);

  if (!timeLeft) return null;

  return (
    <div className="flash-timer">
      <FaClock />
      <span>{timeLeft}</span>
    </div>
  );
};

// Main Component
const FlashDeals = memo(({ limit = 4, showViewMore = true }) => {
  const navigate = useNavigate();
  const [flashDeals, setFlashDeals] = useState(() => loadFlashFromCache(FLASH_CACHE_KEYS.PRODUCTS, []));
  const [loading, setLoading] = useState(() => loadFlashFromCache(FLASH_CACHE_KEYS.PRODUCTS, []).length === 0);
  const [now, setNow] = useState(new Date());
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const initialLoadDone = useRef(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check scroll position for arrows
  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [checkScrollPosition, flashDeals]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted) setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isMounted]);

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }, []);

  const fetchFlashDeals = useCallback(async () => {
    // Skip if already loaded and not forcing refresh
    if (initialLoadDone.current && flashDeals.length > 0) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, category,
          stock_quantity, image_gallery, flash_sale_ends_at,
          stores(id, is_active)
        `)
        .eq("is_flash_sale", true)
        .gt("flash_sale_ends_at", new Date().toISOString())
        .eq("visibility", "public")
        .eq("status", "active")
        .eq("stores.is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit + 2);

      if (error) throw error;

      const active = data.filter((p) => p.stores?.is_active);
      const withDetails = active.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0]),
        flash_price: p.price * (1 - (p.discount || 0) / 100)
      }));

      setFlashDeals(withDetails);
      saveFlashToCache(FLASH_CACHE_KEYS.PRODUCTS, withDetails);
      initialLoadDone.current = true;
    } catch (error) {
      console.error("Error fetching flash deals:", error);
    } finally {
      setLoading(false);
    }
  }, [getImageUrl, limit, flashDeals.length]);

  // Initial load - only if no cached data
  useEffect(() => {
    if (flashDeals.length === 0 && !initialLoadDone.current) {
      fetchFlashDeals();
    } else {
      setLoading(false);
      initialLoadDone.current = true;
    }
    setIsMounted(true);
    return () => setIsMounted(false);
  }, [fetchFlashDeals, flashDeals.length]);

  const handleClick = useCallback((id) => {
    navigate(`/product/${id}`);
  }, [navigate]);

  // Navigate to Flash Sales page
  const handleViewAllFlashSales = useCallback(() => {
    navigate('/flash-sales');
  }, [navigate]);

  // Filter active deals and limit
  const activeDeals = flashDeals.filter(p => new Date(p.flash_sale_ends_at) > now);
  const displayDeals = activeDeals.slice(0, limit);

  if (loading && flashDeals.length === 0) {
    return <FlashDealsSkeleton />;
  }

  if (displayDeals.length === 0) {
    return null;
  }

  return (
    <section className="flash-deals-section">
      <div className="flash-header">
        <div className="flash-header-left">
          <div className="flash-icon-wrapper">
            <FaBolt className="flash-icon" />
          </div>
          <div className="flash-header-text">
            <h2>Flash Deals</h2>
            <p>Limited-time offers</p>
          </div>
        </div>

        {showViewMore && activeDeals.length > limit && (
          <button className="flash-view-more" onClick={handleViewAllFlashSales}>
            See All <FaArrowRight />
          </button>
        )}
      </div>

      <div className="flash-carousel-wrapper">
        {!isMobile && showLeftArrow && (
          <button className="flash-scroll-btn left" onClick={() => scroll('left')}>
            <FaChevronLeft />
          </button>
        )}

        <div className="flash-carousel" ref={scrollContainerRef}>
          {displayDeals.map((product, index) => (
            <motion.div
              className="flash-card"
              key={product.id}
              onClick={() => handleClick(product.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className="flash-image-container">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="flash-image"
                  loading="lazy"
                  onError={(e) => (e.target.src = "/placeholder.jpg")}
                />
                {product.discount > 0 && (
                  <span className="flash-discount-badge">-{product.discount}%</span>
                )}
                <FlashTimer endTime={product.flash_sale_ends_at} now={now} />
              </div>

              <div className="flash-card-info">
                <h3 className="flash-product-name" title={product.name}>
                  {product.name.length > 30 ? product.name.substring(0, 27) + "..." : product.name}
                </h3>

                <div className="flash-price-container">
                  <span className="flash-current-price">
                    {formatKenyanMoney(product.flash_price)}
                  </span>
                  {product.discount > 0 && (
                    <span className="flash-original-price">
                      {formatKenyanMoney(product.price)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!isMobile && showRightArrow && (
          <button className="flash-scroll-btn right" onClick={() => scroll('right')}>
            <FaChevronRight />
          </button>
        )}
      </div>

      {/* Bottom "See All" button */}
      {showViewMore && activeDeals.length > limit && (
        <div className="flash-footer">
          <button className="flash-view-all-btn" onClick={handleViewAllFlashSales}>
            View All Flash Deals <FaArrowRight />
          </button>
        </div>
      )}
    </section>
  );
});

FlashDeals.displayName = 'FlashDeals';
export default FlashDeals;