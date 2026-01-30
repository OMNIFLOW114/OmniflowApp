import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { FaBolt, FaTags, FaStar, FaArrowRight } from "react-icons/fa";
import "./FlashDeals.css";

// Cache keys for localStorage
const FLASH_CACHE_KEYS = {
  PRODUCTS: 'flash_deals_products',
  CACHE_TIMESTAMP: 'flash_cache_timestamp',
  THEME: 'flash_theme',
  CURRENT_TIME: 'flash_current_time'
};

// Cache expiry time (2 minutes for flash deals - they expire fast!)
const FLASH_CACHE_EXPIRY = 2 * 60 * 1000;

// Cache utility functions
const loadFlashFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - timestamp > FLASH_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading flash cache ${key}:`, error);
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveFlashToCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving flash cache ${key}:`, error);
  }
};

const clearFlashCache = () => {
  Object.values(FLASH_CACHE_KEYS).forEach(key => {
    if (key !== FLASH_CACHE_KEYS.THEME) {
      localStorage.removeItem(key);
    }
  });
};

// Theme detection function (outside component)
const detectFlashTheme = () => {
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

// Skeleton component
const FlashDealsSkeleton = () => (
  <section className={`flash-deals-section loading`}>
    <header className="flash-header">
      <FaBolt className="flash-icon" />
      <div className="flash-header-text">
        <h2>Flash Deals</h2>
        <p>Hurry up! Limited-time offers.</p>
      </div>
    </header>

    <div className="flash-carousel">
      {[...Array(6)].map((_, index) => (
        <div className="flash-card-skeleton" key={index}>
          <div className="flash-img-skeleton"></div>
          <div className="flash-content-skeleton">
            <div className="flash-name-skeleton"></div>
            <div className="flash-rating-skeleton"></div>
            <div className="flash-category-skeleton"></div>
            <div className="flash-price-skeleton"></div>
            <div className="flash-meta-skeleton"></div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// Main component
const FlashDeals = memo(({ limit = 6, showViewMore = true }) => {
  const navigate = useNavigate();
  const [flashDeals, setFlashDeals] = useState(() => 
    loadFlashFromCache(FLASH_CACHE_KEYS.PRODUCTS, [])
  );
  const [now, setNow] = useState(() => {
    const cachedTime = loadFlashFromCache(FLASH_CACHE_KEYS.CURRENT_TIME);
    return cachedTime ? new Date(cachedTime) : new Date();
  });
  const [theme, setTheme] = useState(() => 
    loadFlashFromCache(FLASH_CACHE_KEYS.THEME, "light")
  );
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isFetching: false,
    lastFetchTime: 0,
    timerInterval: null,
    isComponentVisible: true
  });

  // Theme detection with caching
  useEffect(() => {
    const currentTheme = detectFlashTheme();
    setTheme(currentTheme);
    saveFlashToCache(FLASH_CACHE_KEYS.THEME, currentTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
      saveFlashToCache(FLASH_CACHE_KEYS.THEME, newTheme);
    };
    
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      cacheDataRef.current.isComponentVisible = !document.hidden;
      if (!document.hidden) {
        // Component is now visible, update time
        setNow(new Date());
        saveFlashToCache(FLASH_CACHE_KEYS.CURRENT_TIME, new Date().toISOString());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }, []);

  const fetchFlashDeals = useCallback(async (forceRefresh = false) => {
    // Skip if already fetching
    if (cacheDataRef.current.isFetching) return;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh && flashDeals.length > 0) {
      // Still need to filter expired deals
      const currentTime = new Date();
      const activeDeals = flashDeals.filter(p => new Date(p.flash_sale_ends_at) > currentTime);
      if (activeDeals.length > 0) {
        setFlashDeals(activeDeals);
        return;
      }
    }
    
    // Don't fetch if cache is still fresh (less than 30 seconds old for flash deals)
    if (!forceRefresh && cacheDataRef.current.lastFetchTime > 0 && 
        Date.now() - cacheDataRef.current.lastFetchTime < 30000) {
      return;
    }
    
    cacheDataRef.current.isFetching = true;
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, rating, category,
          stock_quantity, image_gallery, flash_sale_ends_at,
          stores(id, is_active)
        `)
        .eq("is_flash_sale", true)
        .gt("flash_sale_ends_at", new Date().toISOString())
        .eq("visibility", "public")
        .eq("status", "active")
        .order("flash_sale_ends_at", { ascending: true })
        .limit(limit + 3);

      if (error) {
        console.error("Error fetching flash deals:", error);
        return;
      }

      const active = data.filter((p) => p.stores?.is_active);
      const withImg = active.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0]),
        flash_price: p.price * (1 - (p.discount || 0) / 100),
      }));

      setFlashDeals(withImg);
      saveFlashToCache(FLASH_CACHE_KEYS.PRODUCTS, withImg);
      cacheDataRef.current.lastFetchTime = Date.now();
      
    } catch (error) {
      console.error("Error in flash deals fetch:", error);
      // Keep cached data if fetch fails
      if (flashDeals.length === 0) {
        setFlashDeals([]);
      }
    } finally {
      cacheDataRef.current.isFetching = false;
    }
  }, [flashDeals.length, getImageUrl, limit]);

  // Initial fetch only if no cached products
  useEffect(() => {
    if (flashDeals.length === 0 && !cacheDataRef.current.isFetching) {
      fetchFlashDeals();
    }
    isMountedRef.current = true;
  }, [flashDeals.length, fetchFlashDeals]);

  // Real-time clock & auto-expire with caching
  useEffect(() => {
    const updateTimeAndFilter = () => {
      if (!cacheDataRef.current.isComponentVisible) return;
      
      const currentTime = new Date();
      setNow(currentTime);
      saveFlashToCache(FLASH_CACHE_KEYS.CURRENT_TIME, currentTime.toISOString());
      
      // Filter expired deals
      setFlashDeals(prev => {
        const activeDeals = prev.filter(p => new Date(p.flash_sale_ends_at) > currentTime);
        if (activeDeals.length !== prev.length) {
          saveFlashToCache(FLASH_CACHE_KEYS.PRODUCTS, activeDeals);
        }
        return activeDeals;
      });
    };

    // Initial update
    updateTimeAndFilter();

    // Set interval for updates
    cacheDataRef.current.timerInterval = setInterval(updateTimeAndFilter, 1000);

    // Cleanup interval on unmount
    return () => {
      if (cacheDataRef.current.timerInterval) {
        clearInterval(cacheDataRef.current.timerInterval);
      }
    };
  }, []);

  // Background refresh every minute for flash deals
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!cacheDataRef.current.isFetching) {
        fetchFlashDeals(true);
      }
    }, 60 * 1000); // 1 minute
    
    return () => clearInterval(refreshInterval);
  }, [fetchFlashDeals]);

  // Handle pull-to-refresh for flash deals
  useEffect(() => {
    let startY = 0;
    let isRefreshing = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const flashSection = document.querySelector('.flash-deals-section');
      if (!flashSection) return;
      
      const rect = flashSection.getBoundingClientRect();
      const isAtTop = window.scrollY <= rect.top + 100;
      
      if (isAtTop && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 80) {
          isRefreshing = true;
          clearFlashCache();
          fetchFlashDeals(true).finally(() => {
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
  }, [fetchFlashDeals]);

  const getTimeLeft = useCallback((end) => {
    const diff = new Date(end) - now;
    if (diff <= 0) return null;
    const h = String(Math.floor(diff / 36e5)).padStart(2, "0");
    const m = String(Math.floor((diff % 36e5) / 6e4)).padStart(2, "0");
    const s = String(Math.floor((diff % 6e4) / 1e3)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [now]);

  const handleClick = useCallback((id) => {
    navigate(`/product/${id}`);
  }, [navigate]);

  const handleViewMore = useCallback(() => {
    navigate("/flash-sales");
  }, [navigate]);

  // Kenyan price formatter
  const fmt = useCallback((num) =>
    Number(num || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }), []);

  // Show skeleton only on initial load with no cache
  if (flashDeals.length === 0 && cacheDataRef.current.lastFetchTime === 0) {
    return <FlashDealsSkeleton />;
  }

  // Don't render anything if no flash deals
  if (!flashDeals.length) return null;

  // Limit to specified number for display
  const displayDeals = flashDeals.slice(0, limit).filter(p => {
    const timeLeft = getTimeLeft(p.flash_sale_ends_at);
    return timeLeft !== null;
  });

  if (displayDeals.length === 0) return null;

  return (
    <section className={`flash-deals-section ${theme}`} data-theme={theme}>
      <header className="flash-header">
        <FaBolt className="flash-icon" />
        <div className="flash-header-text">
          <h2>Flash Deals</h2>
          <p>Hurry up! Limited-time offers.</p>
        </div>
        
        {showViewMore && flashDeals.length > limit && (
          <button className="view-more-btn" onClick={handleViewMore}>
            View All Deals
            <FaArrowRight className="arrow-icon" />
          </button>
        )}
      </header>

      <div className="flash-carousel">
        {displayDeals.map((p) => {
          const timeLeft = getTimeLeft(p.flash_sale_ends_at);
          if (!timeLeft) return null;

          return (
            <div key={p.id} className="flash-card" onClick={() => handleClick(p.id)}>
              <div className="flash-img-wrapper">
                <img src={p.imageUrl} alt={p.name} className="flash-img" />
                {p.discount > 0 && (
                  <span className="discount-badge">-{p.discount}%</span>
                )}
              </div>

              <div className="flash-content">
                <h3 className="flash-name">{p.name}</h3>

                <div className="flash-rating">
                  {[...Array(Math.round(p.rating || 0))].map((_, i) => (
                    <FaStar key={i} className="star-filled" />
                  ))}
                </div>

                <p className="flash-category">
                  <FaTags /> {p.category}
                </p>

                <div className="flash-pricing">
                  <span className="flash-price">KSH {fmt(p.flash_price)}</span>
                  {p.discount > 0 && (
                    <span className="original-price">KSH {fmt(p.price)}</span>
                  )}
                </div>

                <div className="flash-meta">
                  <span className="flash-stock">Stock: {p.stock_quantity}</span>
                  <span className="flash-timer">Ends in {timeLeft}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showViewMore && flashDeals.length > limit && (
        <div className="flash-footer">
          <button className="view-more-bottom-btn" onClick={handleViewMore}>
            View All {flashDeals.length} Flash Sale Deals
            <FaArrowRight className="arrow-icon" />
          </button>
        </div>
      )}
    </section>
  );
});

FlashDeals.displayName = 'FlashDeals';

export default FlashDeals;