// src/components/FlashSalesPage.jsx - PREMIUM UPDATED VERSION
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaBolt, FaSearch, FaClock, FaShoppingCart,
  FaFilter, FaTimes, FaArrowLeft, FaSpinner,
  FaChevronDown, FaChevronUp
} from "react-icons/fa";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import "./FlashSalesPage.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (!amount && amount !== 0) return "KSh 0";
  return `KSh ${Number(amount).toLocaleString("en-KE")}`;
};

// Cache keys
const FLASHSALES_CACHE_KEYS = {
  PRODUCTS: 'flashsales_products_v2',
  CATEGORIES: 'flashsales_categories_v2',
  CACHE_TIMESTAMP: 'flashsales_cache_timestamp_v2'
};

const CACHE_EXPIRY = 5 * 60 * 1000;

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
  } catch (error) {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error(`Error saving cache ${key}:`, error);
  }
};

// Skeleton Component
const FlashSalesSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`flash-sales-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="flash-sales-header">
        <div className="skeleton-back"></div>
        <div className="skeleton-title"></div>
        <div className="skeleton-search"></div>
      </div>
      <div className="skeleton-categories">
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton-category"></div>)}
      </div>
      <div className="flash-products-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flash-product-skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-name"></div>
            <div className="skeleton-price"></div>
            <div className="skeleton-button"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Product Card Component
const FlashProductCard = ({ product, onGrabNow, onClick }) => {
  const itemsLeft = Math.max(0, (product.initial_stock || 0) - (product.items_sold || 0));
  const stockPercentage = (itemsLeft / (product.initial_stock || 1)) * 100;
  const isLowStock = itemsLeft < 10 && itemsLeft > 0;
  const isOutOfStock = itemsLeft <= 0;

  return (
    <motion.div 
      className="flash-product-card"
      onClick={() => onClick(product.id)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flash-card-image">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {product.discount > 0 && (
          <span className="flash-discount-badge">-{product.discount}%</span>
        )}
        {isLowStock && (
          <span className="flash-lowstock-badge">🔥 Low Stock</span>
        )}
      </div>

      <div className="flash-card-info">
        <h3 className="flash-product-name" title={product.name}>
          {product.name}
        </h3>

        <div className="flash-timer">
          <FaClock />
          <span>{product.timeLeft || "Expired"}</span>
        </div>

        <div className="flash-pricing">
          <div className="flash-price">{formatKenyanMoney(product.flash_price)}</div>
          {product.discount > 0 && (
            <div className="flash-original-price">{formatKenyanMoney(product.price)}</div>
          )}
        </div>

        <div className="stock-progress-container">
          <div className="stock-progress-bar">
            <div 
              className={`stock-progress-fill ${isLowStock ? 'low' : isOutOfStock ? 'out' : ''}`}
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
          <div className="stock-progress-text">
            <span className="items-left">{itemsLeft} left</span>
            <span className="sold-count">{product.items_sold || 0} sold</span>
          </div>
        </div>

        <button 
          className="grab-button"
          onClick={(e) => onGrabNow(e, product)}
          disabled={isOutOfStock}
        >
          <FaShoppingCart />
          <span>{isOutOfStock ? "Out of Stock" : "Grab Now"}</span>
        </button>
      </div>
    </motion.div>
  );
};

// Main Component
const FlashSalesPage = () => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  const [flashProducts, setFlashProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [now, setNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState(["all"]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  // Helper functions
  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }, []);

  const calculateFlashPrice = useCallback((price, discount) => {
    const numPrice = Number(price) || 0;
    const numDiscount = Number(discount) || 0;
    return numPrice * (1 - numDiscount / 100);
  }, []);

  const calculateTimeLeft = useCallback((endTime) => {
    if (!endTime) return null;
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, []);

  const calculateProgressPercentage = useCallback((product) => {
    const sold = product.sold_count || 0;
    const total = product.initial_stock || (product.stock_quantity || 0) + sold;
    if (total === 0) return 0;
    return Math.min(100, (sold / total) * 100);
  }, []);

  // Fetch flash sales
  const fetchFlashSales = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && initialLoadDone.current && flashProducts.length > 0) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, category, stock_quantity,
          image_gallery, flash_sale_ends_at, sold_count, initial_stock,
          stores(id, name, is_active)
        `)
        .eq("is_flash_sale", true)
        .gt("flash_sale_ends_at", new Date().toISOString())
        .eq("visibility", "public")
        .eq("status", "active")
        .eq("stores.is_active", true)
        .order("flash_sale_ends_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const withCalculations = data.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0]),
        flash_price: calculateFlashPrice(p.price, p.discount),
        timeLeft: calculateTimeLeft(p.flash_sale_ends_at),
        items_sold: p.sold_count || 0,
        initial_stock: p.initial_stock || p.stock_quantity + (p.sold_count || 0),
        progress_percentage: calculateProgressPercentage(p)
      }));

      setFlashProducts(withCalculations);
      setFilteredProducts(withCalculations);
      saveToCache(FLASHSALES_CACHE_KEYS.PRODUCTS, withCalculations);
      
      const uniqueCategories = ["all", ...new Set(
        withCalculations.map(p => p.category).filter(Boolean).sort()
      )];
      setCategories(uniqueCategories);
      saveToCache(FLASHSALES_CACHE_KEYS.CATEGORIES, uniqueCategories);
      
      initialLoadDone.current = true;
    } catch (error) {
      console.error("Error fetching flash sales:", error);
      toast.error("Failed to load flash deals");
    } finally {
      setLoading(false);
    }
  }, [getImageUrl, calculateFlashPrice, calculateTimeLeft, calculateProgressPercentage, flashProducts.length]);

  // Load cached data on mount
  useEffect(() => {
    const cachedProducts = loadFromCache(FLASHSALES_CACHE_KEYS.PRODUCTS, null);
    const cachedCategories = loadFromCache(FLASHSALES_CACHE_KEYS.CATEGORIES, null);
    
    if (cachedProducts && cachedProducts.length > 0) {
      setFlashProducts(cachedProducts);
      setFilteredProducts(cachedProducts);
      setLoading(false);
      initialLoadDone.current = true;
    }
    
    if (cachedCategories && cachedCategories.length > 0) {
      setCategories(cachedCategories);
    }
    
    fetchFlashSales();
  }, [fetchFlashSales]);

  // Real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setFlashProducts(prev => 
        prev.map(p => ({
          ...p,
          timeLeft: calculateTimeLeft(p.flash_sale_ends_at)
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  // Filter logic
  useEffect(() => {
    let filtered = [...flashProducts];

    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      return new Date(a.flash_sale_ends_at) - new Date(b.flash_sale_ends_at);
    });

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, flashProducts]);

  // Handle grab now
  const handleGrabNow = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock_quantity <= 0) {
      toast.error("This product is out of stock");
      return;
    }
    
    try {
      const { data: seller, error: sellerError } = await supabase
        .from("stores")
        .select("id, name, contact_phone, location, owner_id")
        .eq("owner_id", product.owner_id)
        .single();
      
      if (sellerError) throw sellerError;
      
      navigate(`/checkout/${product.id}`, {
        state: {
          productId: product.id,
          product: product,
          seller: seller,
          storeId: seller.id,
          isFlashSale: true,
          flashPrice: product.flash_price,
          originalPrice: product.price,
          fromFlashSale: true
        }
      });
    } catch (error) {
      console.error("Navigation error:", error);
      navigate(`/product/${product.id}?flash=true`);
    }
  };

  const handleCardClick = (productId) => {
    navigate(`/product/${productId}?flash=true`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFlashSales(true);
    setIsRefreshing(false);
    toast.success("Flash deals refreshed!");
  };

  const visibleCategories = useMemo(() => {
    if (showAllCategories) return categories;
    return categories.slice(0, 6);
  }, [categories, showAllCategories]);

  if (loading && flashProducts.length === 0) {
    return <FlashSalesSkeleton />;
  }

  return (
    <div className={`flash-sales-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Header */}
      <header className="flash-sales-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Flash Sales</h1>
        <button className="refresh-btn" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <FaSpinner className="spinning" /> : <FaBolt />}
        </button>
      </header>

      {/* Search Bar */}
      <div className="flash-search-wrapper">
        <div className="flash-search-container">
          <FaSearch className="flash-search-icon" />
          <input
            type="text"
            placeholder="Search flash deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flash-search-input"
          />
          {searchTerm && (
            <button className="flash-clear-search" onClick={() => setSearchTerm("")}>
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flash-categories-wrapper">
        <div className="flash-categories-scroll">
          {visibleCategories.map(category => (
            <button
              key={category}
              className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category === "all" ? "All Deals" : category}
            </button>
          ))}
          {categories.length > 6 && (
            <button
              className="category-chip more-btn"
              onClick={() => setShowAllCategories(!showAllCategories)}
            >
              {showAllCategories ? <FaChevronUp /> : <FaChevronDown />}
              {showAllCategories ? "Less" : "More"}
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flash-stats-bar">
        <div className="flash-stats-item">
          <FaBolt className="stats-icon" />
          <span>{filteredProducts.length} Active Deals</span>
        </div>
        {selectedCategory !== "all" && (
          <div className="flash-stats-item category">
            <span>{selectedCategory}</span>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <main className="flash-products-grid">
        <AnimatePresence>
          {filteredProducts.length === 0 ? (
            <motion.div 
              className="flash-empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FaBolt className="empty-icon" />
              <h3>No flash deals found</h3>
              <p>Try a different category or check back later</p>
            </motion.div>
          ) : (
            <div className="flash-products-grid-inner">
              {filteredProducts.map((product) => (
                <FlashProductCard
                  key={product.id}
                  product={product}
                  onGrabNow={handleGrabNow}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Spacing */}
      <div className="bottom-spacing" />
    </div>
  );
};

export default FlashSalesPage;