import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  FaHeart, FaTrash, FaShoppingCart, FaTag, 
  FaStar, FaStarHalfAlt, FaRegStar, FaStore
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Wishlist.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (amount === undefined || amount === null) return "0";
  const num = Number(amount);
  if (isNaN(num)) return "0";
  return num.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Gold Rating Stars
const RatingStars = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="rating-stars">
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`full-${i}`} className="star gold-filled" />
      ))}
      {hasHalfStar && <FaStarHalfAlt className="star gold-half" />}
      {[...Array(emptyStars)].map((_, i) => (
        <FaRegStar key={`empty-${i}`} className="star gold-empty" />
      ))}
    </div>
  );
};

// Cache keys
const WISHLIST_CACHE_KEYS = {
  ITEMS: 'wishlist_items_final_v3',
  CACHE_TIMESTAMP: 'wishlist_cache_timestamp_final_v3'
};

const WISHLIST_CACHE_EXPIRY = 15 * 60 * 1000;

const loadWishlistFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > WISHLIST_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    return data;
  } catch (error) {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveWishlistToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error("Cache error:", error);
  }
};

// Clear wishlist cache completely
const clearWishlistCache = () => {
  localStorage.removeItem(WISHLIST_CACHE_KEYS.ITEMS);
  localStorage.removeItem(WISHLIST_CACHE_KEYS.CACHE_TIMESTAMP);
};

// Skeleton Loading - Matches Exact Card Layout
const WishlistSkeleton = () => (
  <div className="wishlist-page">
    <div className="wishlist-container">
      <div className="wishlist-header-skeleton">
        <div className="skeleton-title"></div>
        <div className="skeleton-stats">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
      </div>
      <div className="wishlist-grid-skeleton">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image"></div>
            <div className="skeleton-info">
              <div className="skeleton-store"></div>
              <div className="skeleton-title-line"></div>
              <div className="skeleton-rating"></div>
              <div className="skeleton-price"></div>
              <div className="skeleton-actions"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Wishlist = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState(() => 
    loadWishlistFromCache(WISHLIST_CACHE_KEYS.ITEMS, [])
  );
  const [loading, setLoading] = useState(true);
  const [removingItems, setRemovingItems] = useState(new Set());
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({ isFetching: false, lastFetchTime: 0 });

  const fetchWishlistItems = useCallback(async (forceRefresh = false) => {
    if (cacheDataRef.current.isFetching || !user?.id) return;
    
    if (!forceRefresh && wishlistItems.length > 0) {
      setLoading(false);
      return;
    }
    
    if (!forceRefresh && cacheDataRef.current.lastFetchTime > 0 && 
        Date.now() - cacheDataRef.current.lastFetchTime < 30000) {
      setLoading(false);
      return;
    }
    
    cacheDataRef.current.isFetching = true;
    setLoading(true);
    
    try {
      // Fetch wishlist items directly from database (source of truth)
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlist_items")
        .select(`
          id, 
          product_id, 
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (wishlistError) throw wishlistError;

      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        // Clear cache when wishlist is empty
        clearWishlistCache();
        setLoading(false);
        cacheDataRef.current.isFetching = false;
        return;
      }

      const productIds = wishlistData.map(item => item.product_id).filter(Boolean);
      
      // Fetch products with their stores
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          discount,
          stock_quantity,
          image_gallery,
          image_url,
          store_id,
          stores (
            id,
            name
          )
        `)
        .in("id", productIds);

      if (productsError) throw productsError;

      // Fetch ratings from ratings table
      let ratingsMap = new Map();
      if (productIds.length > 0) {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("ratings")
          .select("product_id, rating")
          .in("product_id", productIds);
        
        if (!ratingsError && ratingsData) {
          const ratingAggregate = new Map();
          ratingsData.forEach(r => {
            if (!ratingAggregate.has(r.product_id)) {
              ratingAggregate.set(r.product_id, { total: 0, count: 0 });
            }
            const current = ratingAggregate.get(r.product_id);
            current.total += r.rating;
            current.count += 1;
            ratingAggregate.set(r.product_id, current);
          });
          
          ratingAggregate.forEach((value, productId) => {
            ratingsMap.set(productId, value.total / value.count);
          });
        }
      }
      
      // Fetch review counts
      let reviewCountMap = new Map();
      if (productIds.length > 0) {
        const { data: reviewCounts, error: reviewError } = await supabase
          .from("ratings")
          .select("product_id")
          .in("product_id", productIds);
        
        if (!reviewError && reviewCounts) {
          const countMap = new Map();
          reviewCounts.forEach(r => {
            countMap.set(r.product_id, (countMap.get(r.product_id) || 0) + 1);
          });
          reviewCountMap = countMap;
        }
      }
      
      // Combine data
      const combinedItems = wishlistData.map(wishlistItem => {
        const product = productsData?.find(p => p.id === wishlistItem.product_id);
        return {
          id: wishlistItem.id,
          product_id: wishlistItem.product_id,
          created_at: wishlistItem.created_at,
          products: product ? {
            ...product,
            avg_rating: ratingsMap.get(wishlistItem.product_id) || 0,
            review_count: reviewCountMap.get(wishlistItem.product_id) || 0,
            stores: product.stores || { name: "Store" }
          } : null
        };
      }).filter(item => item.products !== null);
      
      setWishlistItems(combinedItems);
      saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, combinedItems);
      cacheDataRef.current.lastFetchTime = Date.now();
      
    } catch (error) {
      console.error("Wishlist error:", error);
      if (wishlistItems.length === 0) {
        toast.error("Failed to load wishlist");
      }
    } finally {
      setLoading(false);
      cacheDataRef.current.isFetching = false;
    }
  }, [user, wishlistItems.length]);

  useEffect(() => {
    fetchWishlistItems();
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, [fetchWishlistItems]);

  useEffect(() => {
    if (isMountedRef.current && wishlistItems.length > 0) {
      saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, wishlistItems);
    }
  }, [wishlistItems]);

  // Handle permanent deletion from database and cache
  const handleRemoveFromWishlist = useCallback(async (wishlistId, productName) => {
    setRemovingItems(prev => new Set(prev).add(wishlistId));
    
    try {
      // Delete from database - PERMANENT DELETION
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", wishlistId);
      
      if (error) throw error;

      // Update state immediately
      setWishlistItems(prev => {
        const newItems = prev.filter(item => item.id !== wishlistId);
        // Update cache with new items
        saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, newItems);
        return newItems;
      });
      
      toast.success(`${productName || 'Item'} permanently removed from wishlist`);
      
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove item");
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

    try {
      // Check if already in cart
      const { data: existingCart } = await supabase
        .from("cart_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", item.product_id)
        .maybeSingle();

      if (existingCart) {
        toast.error("Already in cart");
        return;
      }

      // Add to cart
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: item.product_id,
          quantity: 1
        });

      if (insertError) throw insertError;

      // Remove from wishlist (permanent)
      const { error: deleteError } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      // Update state and cache
      setWishlistItems(prev => {
        const newItems = prev.filter(i => i.id !== item.id);
        saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, newItems);
        return newItems;
      });
      
      toast.success(`Added to cart!`);
      
    } catch (error) {
      console.error("Move to cart error:", error);
      toast.error("Failed to add to cart");
    }
  }, [user]);

  // Real-time subscription for wishlist changes
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch to ensure data is in sync
          fetchWishlistItems(true);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchWishlistItems]);

  const totalItems = wishlistItems.length;
  const totalValue = wishlistItems.reduce((acc, item) => {
    if (!item.products) return acc;
    const price = Number(item.products.price) || 0;
    const discount = Number(item.products.discount) || 0;
    const finalPrice = price * (1 - discount / 100);
    return acc + finalPrice;
  }, 0);

  if (loading && wishlistItems.length === 0) {
    return <WishlistSkeleton />;
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        {/* Header */}
        <div className="wishlist-header">
          <div className="header-left">
            <FaHeart className="header-icon" />
            <h1>Wishlist</h1>
            <span className="count-badge">{totalItems} items</span>
          </div>
          <div className="header-right">
            <div className="value-card">
              <span className="value-label">Total Value</span>
              <span className="value-amount">KES {formatKenyanMoney(totalValue)}</span>
            </div>
          </div>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaHeart />
            </div>
            <h2>Your wishlist is empty</h2>
            <p>Add items you love to see them here</p>
            <button className="shop-now" onClick={() => navigate("/")}>
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            <AnimatePresence>
              {wishlistItems.map((item, index) => {
                const product = item.products;
                const isRemoving = removingItems.has(item.id);
                if (!product) return null;

                const price = Number(product.price) || 0;
                const discount = Number(product.discount) || 0;
                const finalPrice = price * (1 - discount / 100);
                const imageUrl = product.image_gallery?.[0] || product.image_url || "/placeholder.jpg";
                const rating = product.avg_rating || 0;
                const reviewCount = product.review_count || 0;
                const store = product.stores;

                return (
                  <motion.div
                    key={item.id}
                    className="wishlist-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    layout
                  >
                    {/* Discount Badge */}
                    {discount > 0 && (
                      <div className="discount-circle">
                        <FaTag />
                        <span>{discount}%</span>
                      </div>
                    )}

                    {/* Product Image - Bigger and Full */}
                    <div className="item-image" onClick={() => navigate(`/product/${product.id}`)}>
                      <img src={imageUrl} alt={product.name} />
                    </div>

                    {/* Product Info */}
                    <div className="item-info">
                      {/* Store Name */}
                      <div className="store-row">
                        <FaStore className="store-icon" />
                        <span className="store-name">{store?.name || "Store"}</span>
                      </div>

                      {/* Product Name */}
                      <h3 onClick={() => navigate(`/product/${product.id}`)}>
                        {product.name}
                      </h3>

                      {/* Rating with Gold Stars */}
                      <div className="rating-row">
                        <RatingStars rating={rating} />
                        <span className="rating-value">{rating.toFixed(1)}</span>
                        <span className="review-count">({reviewCount})</span>
                      </div>

                      {/* Price Section */}
                      <div className="price-row">
                        <span className="current-price">KES {formatKenyanMoney(finalPrice)}</span>
                        {discount > 0 && (
                          <span className="original-price">KES {formatKenyanMoney(price)}</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="action-row">
                        <button
                          className="add-cart-btn"
                          onClick={() => handleMoveToCart(item)}
                          disabled={isRemoving}
                        >
                          <FaShoppingCart />
                          <span>Add to Cart</span>
                        </button>
                        
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveFromWishlist(item.id, product.name)}
                          disabled={isRemoving}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        
        <div className="bottom-space"></div>
      </div>
    </div>
  );
});

Wishlist.displayName = 'Wishlist';
export default Wishlist;