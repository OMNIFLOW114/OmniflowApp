// src/pages/Wishlist.jsx - PREMIUM UPDATED VERSION
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { 
  FaHeart, FaTrash, FaShoppingCart, FaTag, 
  FaStar, FaStarHalfAlt, FaRegStar, FaStore,
  FaArrowLeft, FaSpinner, FaEye, FaClock,
  FaTruck, FaShieldAlt
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import styles from "./Wishlist.module.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (amount === undefined || amount === null) return "KSh 0";
  const num = Number(amount);
  if (isNaN(num)) return "KSh 0";
  return `KSh ${num.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

// Gold Rating Stars Component
const RatingStars = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={styles.ratingStars}>
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`full-${i}`} className={styles.starFilled} />
      ))}
      {hasHalfStar && <FaStarHalfAlt className={styles.starHalf} />}
      {[...Array(emptyStars)].map((_, i) => (
        <FaRegStar key={`empty-${i}`} className={styles.starEmpty} />
      ))}
    </div>
  );
};

// Cache keys
const WISHLIST_CACHE_KEYS = {
  ITEMS: 'wishlist_items_v4',
  CACHE_TIMESTAMP: 'wishlist_cache_timestamp_v4'
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

// Skeleton Loading Component
const WishlistSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonStats}></div>
      </div>
      <div className={styles.skeletonGrid}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonInfo}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLineShort}></div>
              <div className={styles.skeletonPrice}></div>
              <div className={styles.skeletonButtons}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty Wishlist Component
const EmptyWishlist = () => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.emptyState} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.emptyIcon}>
        <FaHeart />
      </div>
      <h2>Your wishlist is empty</h2>
      <p>Add items you love to see them here</p>
      <button className={styles.shopBtn} onClick={() => navigate("/student/marketplace")}>
        Start Shopping
      </button>
    </div>
  );
};

// Wishlist Item Component
const WishlistItem = memo(({ item, index, onRemove, onMoveToCart, isRemoving }) => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  const product = item.products;
  
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
      className={styles.wishlistItem}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      layout
    >
      {/* Discount Badge */}
      {discount > 0 && (
        <div className={styles.discountBadge}>
          <FaTag />
          <span>{discount}% OFF</span>
        </div>
      )}

      {/* Product Image */}
      <div className={styles.itemImage} onClick={() => navigate(`/student/product/${product.id}`)}>
        <img src={imageUrl} alt={product.name} loading="lazy" />
      </div>

      {/* Product Info */}
      <div className={styles.itemInfo}>
        {/* Store Name */}
        <div className={styles.storeRow}>
          <FaStore className={styles.storeIcon} />
          <span className={styles.storeName}>{store?.name || "Store"}</span>
          <span className={styles.verifiedBadge}>✓ Verified</span>
        </div>

        {/* Product Name */}
        <h3 className={styles.productName} onClick={() => navigate(`/student/product/${product.id}`)}>
          {product.name}
        </h3>

        {/* Rating */}
        <div className={styles.ratingRow}>
          <RatingStars rating={rating} />
          <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
          <span className={styles.reviewCount}>({reviewCount} reviews)</span>
        </div>

        {/* Price Section */}
        <div className={styles.priceRow}>
          <span className={styles.currentPrice}>{formatKenyanMoney(finalPrice)}</span>
          {discount > 0 && (
            <span className={styles.originalPrice}>{formatKenyanMoney(price)}</span>
          )}
        </div>

        {/* Stock Status */}
        <div className={styles.stockStatus}>
          {product.stock_quantity > 10 ? (
            <span className={styles.inStock}>✓ In Stock</span>
          ) : product.stock_quantity > 0 ? (
            <span className={styles.lowStock}>⚠️ Only {product.stock_quantity} left</span>
          ) : (
            <span className={styles.outOfStock}>✗ Out of Stock</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionRow}>
          <button
            className={styles.addCartBtn}
            onClick={() => onMoveToCart(item)}
            disabled={isRemoving || product.stock_quantity <= 0}
          >
            <FaShoppingCart />
            <span>Add to Cart</span>
          </button>
          
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(item.id, product.name)}
            disabled={isRemoving}
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

WishlistItem.displayName = 'WishlistItem';

// Main Wishlist Component
const Wishlist = memo(() => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
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
    
    cacheDataRef.current.isFetching = true;
    setLoading(true);
    
    try {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlist_items")
        .select(`id, product_id, created_at`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (wishlistError) throw wishlistError;

      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        setLoading(false);
        cacheDataRef.current.isFetching = false;
        return;
      }

      const productIds = wishlistData.map(item => item.product_id).filter(Boolean);
      
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, stock_quantity,
          image_gallery, image_url, store_id,
          stores (id, name)
        `)
        .in("id", productIds);

      if (productsError) throw productsError;

      // Fetch ratings
      let ratingsMap = new Map();
      if (productIds.length > 0) {
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("product_id, rating")
          .in("product_id", productIds);
        
        if (ratingsData) {
          const ratingAggregate = new Map();
          ratingsData.forEach(r => {
            if (!ratingAggregate.has(r.product_id)) {
              ratingAggregate.set(r.product_id, { total: 0, count: 0 });
            }
            const current = ratingAggregate.get(r.product_id);
            current.total += r.rating;
            current.count += 1;
          });
          
          ratingAggregate.forEach((value, productId) => {
            ratingsMap.set(productId, value.total / value.count);
          });
        }
      }
      
      // Fetch review counts
      let reviewCountMap = new Map();
      if (productIds.length > 0) {
        const { data: reviewCounts } = await supabase
          .from("ratings")
          .select("product_id")
          .in("product_id", productIds);
        
        if (reviewCounts) {
          const countMap = new Map();
          reviewCounts.forEach(r => {
            countMap.set(r.product_id, (countMap.get(r.product_id) || 0) + 1);
          });
          reviewCountMap = countMap;
        }
      }
      
      const combinedItems = wishlistData.map(wishlistItem => {
        const product = productsData?.find(p => p.id === wishlistItem.product_id);
        return {
          id: wishlistItem.id,
          product_id: wishlistItem.product_id,
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

  const handleRemoveFromWishlist = useCallback(async (wishlistId, productName) => {
    setRemovingItems(prev => new Set(prev).add(wishlistId));
    
    try {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", wishlistId);
      
      if (error) throw error;

      setWishlistItems(prev => {
        const newItems = prev.filter(item => item.id !== wishlistId);
        saveWishlistToCache(WISHLIST_CACHE_KEYS.ITEMS, newItems);
        return newItems;
      });
      
      toast.success(`${productName || 'Item'} removed from wishlist`);
      
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

      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: item.product_id,
          quantity: 1
        });

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

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

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('wishlist-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wishlist_items',
        filter: `user_id=eq.${user.id}`
      }, () => fetchWishlistItems(true))
      .subscribe();

    return () => subscription.unsubscribe();
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
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>My Wishlist</h1>
        <div className={styles.headerStats}>
          <span className={styles.itemCount}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.content}>
        {wishlistItems.length === 0 ? (
          <EmptyWishlist />
        ) : (
          <>
            {/* Stats Bar */}
            <div className={styles.statsBar}>
              <div className={styles.statCard}>
                <FaHeart className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{totalItems}</span>
                  <span className={styles.statLabel}>Items</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <FaShoppingCart className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{formatKenyanMoney(totalValue)}</span>
                  <span className={styles.statLabel}>Total Value</span>
                </div>
              </div>
            </div>

            {/* Wishlist Grid */}
            <div className={styles.wishlistGrid}>
              <AnimatePresence>
                {wishlistItems.map((item, index) => (
                  <WishlistItem
                    key={item.id}
                    item={item}
                    index={index}
                    isRemoving={removingItems.has(item.id)}
                    onRemove={handleRemoveFromWishlist}
                    onMoveToCart={handleMoveToCart}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
      
      {/* Bottom Spacing for Navigation */}
      <div className={styles.bottomSpacing} />
    </div>
  );
});

Wishlist.displayName = 'Wishlist';
export default Wishlist;