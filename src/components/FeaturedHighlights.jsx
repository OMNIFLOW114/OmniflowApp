import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { FaStar, FaUser, FaFire, FaCrown, FaEye, FaShoppingBag } from "react-icons/fa";
import "./FeaturedHighlights.css";

// Cache keys for localStorage
const FEATURED_CACHE_KEYS = {
  PRODUCTS: 'featured_products',
  CACHE_TIMESTAMP: 'featured_cache_timestamp',
  THEME: 'featured_theme'
};

// Cache expiry time (10 minutes for featured products)
const FEATURED_CACHE_EXPIRY = 10 * 60 * 1000;

// Cache utility functions
const loadFeaturedFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - timestamp > FEATURED_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading featured cache ${key}:`, error);
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveFeaturedToCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving featured cache ${key}:`, error);
  }
};

const clearFeaturedCache = () => {
  Object.values(FEATURED_CACHE_KEYS).forEach(key => {
    if (key !== FEATURED_CACHE_KEYS.THEME) {
      localStorage.removeItem(key);
    }
  });
};

// Skeleton component
const FeaturedSkeleton = () => (
  <section className="featured-highlights loading">
    <div className="featured-section-header">
      <h2 className="featured-section-title">
        <FaCrown className="featured-section-icon" /> Featured Products
      </h2>
      <p className="featured-section-subtitle">Handpicked quality products from verified sellers</p>
    </div>
    <div className="featured-carousel">
      {[...Array(6)].map((_, index) => (
        <div className="featured-card-skeleton" key={index}>
          <div className="featured-image-skeleton"></div>
          <div className="featured-card-info">
            <div className="featured-product-meta">
              <div className="featured-category-tag"></div>
              <div className="featured-stock-status"></div>
            </div>
            <h3 className="featured-product-name"></h3>
            <div className="featured-rating-container">
              <div className="featured-stars"></div>
              <span className="featured-rating-text"></span>
            </div>
            <div className="featured-price-container">
              <div className="featured-price-main"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// Theme detection function (outside component)
const detectTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme) return htmlTheme;
  
  const htmlClass = document.documentElement.className;
  if (htmlClass.includes('dark')) return 'dark';
  if (htmlClass.includes('light')) return 'light';
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

// Main component
const FeaturedHighlights = memo(() => {
  const navigate = useNavigate();
  const [products, setProducts] = useState(() => 
    loadFeaturedFromCache(FEATURED_CACHE_KEYS.PRODUCTS, [])
  );
  const [loading, setLoading] = useState(() => 
    loadFeaturedFromCache(FEATURED_CACHE_KEYS.PRODUCTS, []).length === 0
  );
  const [theme, setTheme] = useState(() => 
    loadFeaturedFromCache(FEATURED_CACHE_KEYS.THEME, "light")
  );
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isFetching: false,
    lastFetchTime: 0
  });

  // Detect theme
  useEffect(() => {
    const currentTheme = detectTheme();
    setTheme(currentTheme);
    saveFeaturedToCache(FEATURED_CACHE_KEYS.THEME, currentTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      saveFeaturedToCache(FEATURED_CACHE_KEYS.THEME, newTheme);
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }, []);

  const fetchFeaturedProducts = useCallback(async (forceRefresh = false) => {
    // Skip if already fetching
    if (cacheDataRef.current.isFetching) return;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh && products.length > 0) {
      setLoading(false);
      return;
    }
    
    // Don't fetch if cache is still fresh (less than 30 seconds old)
    if (!forceRefresh && cacheDataRef.current.lastFetchTime > 0 && 
        Date.now() - cacheDataRef.current.lastFetchTime < 30000) {
      setLoading(false);
      return;
    }
    
    cacheDataRef.current.isFetching = true;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          price, 
          discount, 
          stock_quantity,
          image_gallery, 
          is_featured, 
          is_rare_drop,
          views, 
          orders,
          created_at,
          sold_count,
          stores(id, name, is_active, is_verified)
        `)
        .eq("is_featured", true)
        .eq("visibility", "public")
        .eq("status", "active")
        .eq("stores.is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      const validProducts = (data || []).filter(p => p.stores?.is_active);

      const productsWithRatings = await Promise.all(
        validProducts.map(async (p) => {
          try {
            const { data: ratingsData } = await supabase
              .from("ratings")
              .select("rating")
              .eq("product_id", p.id);

            const ratings = ratingsData || [];
            const ratingCount = ratings.length;
            const avgRating = ratingCount > 0 
              ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount
              : 0;

            return {
              ...p,
              avg_rating: parseFloat(avgRating.toFixed(1)),
              rating_count: ratingCount,
              imageUrl: getImageUrl(p.image_gallery?.[0]),
              hasDiscount: parseFloat(p.discount || 0) > 0,
              discountedPrice: parseFloat(p.discount || 0) > 0 
                ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
                : parseFloat(p.price),
              sold_count: p.sold_count || p.orders || 0
            };
          } catch (ratingError) {
            console.error("Error fetching ratings for product:", p.id, ratingError);
            return {
              ...p,
              avg_rating: 0,
              rating_count: 0,
              imageUrl: getImageUrl(p.image_gallery?.[0]),
              hasDiscount: parseFloat(p.discount || 0) > 0,
              discountedPrice: parseFloat(p.discount || 0) > 0 
                ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
                : parseFloat(p.price),
              sold_count: p.sold_count || p.orders || 0
            };
          }
        })
      );

      setProducts(productsWithRatings);
      saveFeaturedToCache(FEATURED_CACHE_KEYS.PRODUCTS, productsWithRatings);
      cacheDataRef.current.lastFetchTime = Date.now();
      
    } catch (error) {
      console.error("Error fetching featured products:", error);
      // Keep cached data if fetch fails
      if (products.length === 0) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      cacheDataRef.current.isFetching = false;
    }
  }, [products.length, getImageUrl]);

  // Initial fetch only if no cached products
  useEffect(() => {
    if (products.length === 0 && !cacheDataRef.current.isFetching) {
      fetchFeaturedProducts();
    } else {
      setLoading(false);
    }
    isMountedRef.current = true;
  }, [products.length, fetchFeaturedProducts]);

  // Background refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!cacheDataRef.current.isFetching) {
        fetchFeaturedProducts(true);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [fetchFeaturedProducts]);

  // Handle pull-to-refresh for featured section
  useEffect(() => {
    let startY = 0;
    let isRefreshing = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const featuredSection = document.querySelector('.featured-highlights');
      if (!featuredSection) return;
      
      const rect = featuredSection.getBoundingClientRect();
      const isAtTop = window.scrollY <= rect.top + 100;
      
      if (isAtTop && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 80) {
          isRefreshing = true;
          clearFeaturedCache();
          fetchFeaturedProducts(true).finally(() => {
            isRefreshing = false;
          });
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [fetchFeaturedProducts]);

  const handleClick = useCallback((id) => {
    navigate(`/product/${id}`);
  }, [navigate]);

  if (loading && products.length === 0) {
    return <FeaturedSkeleton />;
  }

  if (products.length === 0 && !loading) {
    // Don't render anything if no featured products
    return null;
  }

  return (
    <section 
      className="featured-highlights"
      data-theme={theme}
    >
      <div className="featured-section-header">
        <h2 className="featured-section-title">
          <FaCrown className="featured-section-icon" /> Featured Products
        </h2>
        <p className="featured-section-subtitle">Handpicked quality products from verified sellers</p>
      </div>
      
      <div className="featured-carousel">
        {products.map((product) => (
          <div 
            className="featured-card" 
            key={product.id} 
            onClick={() => handleClick(product.id)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleClick(product.id)}
          >
            <div className="featured-product-badges">
              {product.is_rare_drop && (
                <span className="featured-badge featured-badge-rare">
                  <FaCrown size={8} /> Rare
                </span>
              )}
              {product.hasDiscount && (
                <span className="featured-badge featured-badge-discount">
                  -{product.discount}%
                </span>
              )}
              {product.views > 100 && (
                <span className="featured-badge featured-badge-trending">
                  <FaFire size={8} /> Trending
                </span>
              )}
            </div>

            <div className="featured-image-container">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="featured-image"
                loading="lazy"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            </div>

            <div className="featured-card-info">
              <div className="featured-product-meta">
                <div className="featured-category-tag">
                  <FaShoppingBag size={8} /> Featured
                </div>
                <div className="featured-stock-status">
                  {product.stock_quantity > 0 ? (
                    <span className="featured-in-stock">In Stock</span>
                  ) : (
                    <span className="featured-out-of-stock">Out of Stock</span>
                  )}
                </div>
              </div>

              <h3 className="featured-product-name" title={product.name}>
                {product.name.length > 40 ? product.name.substring(0, 40) + "..." : product.name}
              </h3>

              <div className="featured-rating-container">
                <div className="featured-stars">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={i < Math.round(product.avg_rating || 0) ? "featured-star-filled" : "featured-star-empty"}
                      size={10}
                    />
                  ))}
                </div>
                <span className="featured-rating-text">
                  ({product.rating_count || 0})
                </span>
              </div>

              <div className="featured-price-container">
                <div className="featured-price-main">
                  <span className="featured-current-price">
                    KSH {Number(product.discountedPrice).toLocaleString("en-KE")}
                  </span>
                  {product.hasDiscount && (
                    <span className="featured-original-price">
                      KSH {Number(product.price).toLocaleString("en-KE")}
                    </span>
                  )}
                </div>
              </div>

              <div className="featured-seller-info">
                <FaUser size={10} />
                <span className="featured-seller-name">
                  {product.stores?.name || "Verified Seller"}
                </span>
                {product.stores?.is_verified && (
                  <span className="featured-verified-badge">✓</span>
                )}
              </div>

              <div className="featured-product-stats">
                <div className="featured-stat">
                  <FaEye size={10} />
                  <span>{product.views || 0}</span>
                </div>
                {product.sold_count > 0 && (
                  <div className="featured-stat">
                    <FaShoppingBag size={10} />
                    <span>{product.sold_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

FeaturedHighlights.displayName = 'FeaturedHighlights';

export default FeaturedHighlights;