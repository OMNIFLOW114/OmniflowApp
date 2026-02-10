import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaHeart, FaTrash, FaShoppingCart, FaEye, FaTag, FaFire, FaArrowDown } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Wishlist.css";

// Cache keys for localStorage
const WISHLIST_CACHE_KEYS = {
  ITEMS: 'wishlist_items',
  CACHE_TIMESTAMP: 'wishlist_cache_timestamp',
  LAST_UPDATED: 'wishlist_last_updated'
};

// Cache expiry time (15 minutes)
const WISHLIST_CACHE_EXPIRY = 15 * 60 * 1000;

// Cache utility functions
const loadWishlistFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - timestamp > WISHLIST_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading wishlist cache ${key}:`, error);
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveWishlistToCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving wishlist cache ${key}:`, error);
  }
};

const clearWishlistCache = () => {
  Object.values(WISHLIST_CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Skeleton loading component
const WishlistSkeleton = () => (
  <div className="wishlist-container">
    <div className="wishlist-header skeleton">
      <div className="skeleton-title"></div>
    </div>
    <div className="wishlist-stats skeleton">
      {[...Array(2)].map((_, index) => (
        <div key={index} className="stat-card skeleton">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      ))}
    </div>
    <div className="wishlist-grid">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="wishlist-card skeleton">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-price"></div>
            <div className="skeleton-line skeleton-actions"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main component
const Wishlist = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState(() => 
    loadWishlistFromCache(WISHLIST_CACHE_KEYS.ITEMS, [])
  );
  const [loading, setLoading] = useState(() => 
    loadWishlistFromCache(WISHLIST_CACHE_KEYS.ITEMS, []).length === 0
  );
  const [removingItems, setRemovingItems] = useState(new Set());
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isFetching: false,
    lastFetchTime: 0
  });

  const fetchWishlistItems = useCallback(async (forceRefresh = false) => {
    // Skip if already fetching or no user
    if (cacheDataRef.current.isFetching || !user?.id) return;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh && wishlistItems.length > 0) {
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
        .from("wishlist_items")
        .select("id, product_id, created_at, products (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Wishlist fetch error:", error);
        toast.error("Failed to load wishlist.");
        return;
      }

      const items = data || [];
      setWishlistItems(items);
      saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, items);
      cacheDataRef.current.lastFetchTime = Date.now();
      
    } catch (error) {
      console.error("Wishlist error:", error);
      // Keep cached data if fetch fails
      if (wishlistItems.length === 0) {
        toast.error("Failed to load wishlist.");
      }
    } finally {
      setLoading(false);
      cacheDataRef.current.isFetching = false;
    }
  }, [user, wishlistItems.length]);

  // Initial fetch only if no cached items
  useEffect(() => {
    if (wishlistItems.length === 0 && !cacheDataRef.current.isFetching) {
      fetchWishlistItems();
    } else {
      setLoading(false);
    }
    isMountedRef.current = true;
  }, [wishlistItems.length, fetchWishlistItems]);

  // Save wishlist items to cache whenever they change
  useEffect(() => {
    if (isMountedRef.current && wishlistItems.length > 0) {
      saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, wishlistItems);
    }
  }, [wishlistItems]);

  // Background refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!cacheDataRef.current.isFetching && user?.id) {
        fetchWishlistItems(true);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [fetchWishlistItems, user]);

  const handleRemoveFromWishlist = useCallback(async (wishlistId, productName) => {
    setRemovingItems(prev => new Set(prev).add(wishlistId));
    
    try {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;

      setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistId));
      toast.success(`${productName || 'Item'} removed from wishlist.`);
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove item.");
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(wishlistId);
        return newSet;
      });
    }
  }, []);

  const handleMoveToCart = useCallback(async (item) => {
    if (!user?.id) {
      toast.error("Please login to add to cart");
      return;
    }

    const { error: insertError } = await supabase.from("cart_items").insert([
      {
        user_id: user.id,
        product_id: item.product_id,
        quantity: 1,
      },
    ]);

    if (insertError) {
      toast.error("Already in cart or failed.");
      return;
    }

    await handleRemoveFromWishlist(item.id, item.products?.name);
    toast.success("Added to cart!");
  }, [user, handleRemoveFromWishlist]);

  const getPriceDrop = useCallback((product) => {
    const originalPrice = Number(product.original_price) || Number(product.price) * 1.2;
    const currentPrice = Number(product.price);
    const dropPercentage = ((originalPrice - currentPrice) / originalPrice) * 100;
    return dropPercentage > 0 ? Math.round(dropPercentage) : 0;
  }, []);

  // Calculate stats
  const totalItems = wishlistItems.length;
  const priceDropCount = wishlistItems.filter(item => getPriceDrop(item.products) > 0).length;

  if (loading && wishlistItems.length === 0) {
    return <WishlistSkeleton />;
  }

  return (
    <div className="wishlist-container">
      <motion.div 
        className="wishlist-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>
          <FaHeart className="heart-icon" />
          My Wishlist
          {wishlistItems.length > 0 && (
            <span className="item-count">({totalItems})</span>
          )}
        </h1>
      </motion.div>

      {wishlistItems.length === 0 ? (
        <motion.div 
          className="empty-wishlist"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="empty-heart">
            <FaHeart />
          </div>
          <h2>No items in wishlist</h2>
          <p className="empty-subtitle">Add products you love to see them here</p>
          <motion.button 
            className="browse-products-btn"
            onClick={() => navigate("/products")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Discover Products
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div className="wishlist-stats">
            <motion.div 
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="stat-icon">
                <FaHeart />
              </div>
              <div className="stat-content">
                <span className="stat-number">{totalItems}</span>
                <span className="stat-label">Items</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="stat-card price-drop-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="stat-icon">
                <FaArrowDown />
              </div>
              <div className="stat-content">
                <span className="stat-number">
                  {priceDropCount}
                </span>
                <span className="stat-label">Price Drops</span>
              </div>
            </motion.div>
          </div>

          <div className="section-title">
            <h3>Your Saved Items</h3>
            <p className="section-subtitle">Ready to purchase when you are</p>
          </div>

          <div className="wishlist-grid">
            <AnimatePresence>
              {wishlistItems.map((item, index) => {
                const product = item.products;
                if (!product) return null;

                const priceDrop = getPriceDrop(product);
                const isOnSale = product.discount > 0;
                const isRemoving = removingItems.has(item.id);
                const isPopular = product.popularity_score > 80;
                const isBestSeller = product.bestseller || false;

                return (
                  <motion.div
                    key={item.id}
                    className="wishlist-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, x: 100 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    layout
                  >
                    <div className="card-badges">
                      {isOnSale && (
                        <span className="sale-badge">
                          <FaTag /> {product.discount}% OFF
                        </span>
                      )}
                      {priceDrop > 0 && (
                        <span className="price-drop-badge">
                          <FaArrowDown /> {priceDrop}% OFF
                        </span>
                      )}
                      {isBestSeller && (
                        <span className="bestseller-badge">
                          <FaFire /> Best Seller
                        </span>
                      )}
                    </div>

                    <motion.div 
                      className="wishlist-image"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <img
                        src={product.image_gallery?.[0] || product.image_url || "/placeholder.jpg"}
                        alt={product.name}
                        onClick={() => navigate(`/product/${product.id}`)}
                      />
                    </motion.div>
                    
                    <div className="wishlist-info">
                      <h4 onClick={() => navigate(`/product/${product.id}`)}>
                        {product.name}
                      </h4>
                      
                      <div className="price-section">
                        <div className="price-row">
                          <p className="current-price">
                            KSH {Number(product.price).toLocaleString()}
                          </p>
                          {isOnSale && (
                            <p className="original-price">
                              KSH {Number(product.original_price || product.price * 1.2).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {priceDrop > 0 && (
                          <p className="price-drop-text">
                            <FaArrowDown /> Price dropped {priceDrop}%
                          </p>
                        )}
                      </div>

                      <div className="product-urgency">
                        {isPopular && (
                          <span className="popular-tag">
                            <FaFire /> Popular Now
                          </span>
                        )}
                        {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                          <span className="low-stock-tag">
                            Only {product.stock_quantity} left
                          </span>
                        )}
                      </div>

                      <div className="wishlist-actions">
                        <motion.button 
                          className="cart-btn"
                          onClick={() => handleMoveToCart(item)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={isRemoving}
                        >
                          <FaShoppingCart /> Buy Now
                        </motion.button>
                        
                        <div className="action-icons">
                          <motion.button
                            className="icon-btn view-btn"
                            onClick={() => navigate(`/product/${product.id}`)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isRemoving}
                            title="View Details"
                          >
                            <FaEye />
                          </motion.button>

                          <motion.button
                            className="icon-btn remove-btn"
                            onClick={() => handleRemoveFromWishlist(item.id, product.name)}
                            disabled={isRemoving}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title="Remove from Wishlist"
                          >
                            <FaTrash />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
      
      {/* Bottom spacing for bottom navigation */}
      <div className="bottom-spacing"></div>
    </div>
  );
});

Wishlist.displayName = 'Wishlist';

export default Wishlist;