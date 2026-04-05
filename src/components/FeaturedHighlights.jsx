// src/components/FeaturedHighlights.jsx - MINIMIZED WITH CACHING
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { motion } from "framer-motion";
import { FaStar, FaCrown, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./FeaturedHighlights.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (!amount && amount !== 0) return "KSh 0";
  return `KSh ${Number(amount).toLocaleString("en-KE")}`;
};

// Cache keys for localStorage
const FEATURED_CACHE_KEYS = {
  PRODUCTS: 'featured_products_v3',
  CACHE_TIMESTAMP: 'featured_cache_timestamp_v3',
};

const FEATURED_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes cache

const loadFeaturedFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > FEATURED_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    return data;
  } catch (error) {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveFeaturedToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error(`Error saving cache ${key}:`, error);
  }
};

// Minimized Skeleton Component
const FeaturedSkeleton = () => (
  <section className="featured-highlights loading">
    <div className="featured-section-header">
      <div className="skeleton-icon"></div>
      <div className="skeleton-title"></div>
    </div>
    <div className="featured-carousel">
      {[...Array(4)].map((_, index) => (
        <div className="featured-card-skeleton" key={index}>
          <div className="featured-image-skeleton"></div>
          <div className="featured-card-info-skeleton">
            <div className="skeleton-name"></div>
            <div className="skeleton-price"></div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// Main Component
const FeaturedHighlights = memo(() => {
  const navigate = useNavigate();
  const [products, setProducts] = useState(() => loadFeaturedFromCache(FEATURED_CACHE_KEYS.PRODUCTS, []));
  const [loading, setLoading] = useState(() => loadFeaturedFromCache(FEATURED_CACHE_KEYS.PRODUCTS, []).length === 0);
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
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
  }, [checkScrollPosition, products]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }, []);

  const fetchFeaturedProducts = useCallback(async () => {
    // Skip if already loaded
    if (initialLoadDone.current && products.length > 0) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, stock_quantity,
          image_gallery, is_featured,
          stores(id, name, is_active)
        `)
        .eq("is_featured", true)
        .eq("visibility", "public")
        .eq("status", "active")
        .eq("stores.is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      const validProducts = (data || []).filter(p => p.stores?.is_active);
      const productsWithDetails = validProducts.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0]),
        hasDiscount: parseFloat(p.discount || 0) > 0,
        discountedPrice: parseFloat(p.discount || 0) > 0
          ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
          : parseFloat(p.price)
      }));

      setProducts(productsWithDetails);
      saveFeaturedToCache(FEATURED_CACHE_KEYS.PRODUCTS, productsWithDetails);
      initialLoadDone.current = true;
    } catch (error) {
      console.error("Error fetching featured products:", error);
    } finally {
      setLoading(false);
    }
  }, [getImageUrl, products.length]);

  useEffect(() => {
    if (products.length === 0 && !initialLoadDone.current) {
      fetchFeaturedProducts();
    } else {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [fetchFeaturedProducts, products.length]);

  const handleClick = useCallback((id) => {
    navigate(`/product/${id}`);
  }, [navigate]);

  if (loading && products.length === 0) {
    return <FeaturedSkeleton />;
  }

  if (products.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="featured-highlights">
      <div className="featured-section-header">
        <div className="featured-title-wrapper">
          <FaCrown className="featured-section-icon" />
          <h2 className="featured-section-title">Featured</h2>
        </div>
      </div>

      <div className="featured-carousel-wrapper">
        {!isMobile && showLeftArrow && (
          <button className="featured-scroll-btn left" onClick={() => scroll('left')}>
            <FaChevronLeft />
          </button>
        )}

        <div className="featured-carousel" ref={scrollContainerRef}>
          {products.map((product, index) => (
            <motion.div
              className="featured-card"
              key={product.id}
              onClick={() => handleClick(product.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className="featured-image-container">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="featured-image"
                  loading="lazy"
                  onError={(e) => (e.target.src = "/placeholder.jpg")}
                />
                {product.hasDiscount && (
                  <span className="featured-discount-badge">-{product.discount}%</span>
                )}
              </div>

              <div className="featured-card-info">
                <h3 className="featured-product-name" title={product.name}>
                  {product.name.length > 30 ? product.name.substring(0, 27) + "..." : product.name}
                </h3>

                <div className="featured-price-container">
                  <span className="featured-current-price">
                    {formatKenyanMoney(product.discountedPrice)}
                  </span>
                  {product.hasDiscount && (
                    <span className="featured-original-price">
                      {formatKenyanMoney(product.price)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!isMobile && showRightArrow && (
          <button className="featured-scroll-btn right" onClick={() => scroll('right')}>
            <FaChevronRight />
          </button>
        )}
      </div>
    </section>
  );
});

FeaturedHighlights.displayName = 'FeaturedHighlights';
export default FeaturedHighlights;