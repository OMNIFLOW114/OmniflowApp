// src/pages/Cart.jsx - PREMIUM UPDATED VERSION
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaStore,
  FaChevronRight,
  FaCreditCard,
  FaHeart,
  FaTag,
  FaTruck,
  FaClock,
  FaPercent,
  FaArrowLeft,
  FaCheckCircle,
  FaSpinner,
  FaGift,
  FaShieldAlt
} from "react-icons/fa";
import styles from "./Cart.module.css";

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

// Cache keys for localStorage
const CART_CACHE_KEYS = {
  ITEMS: 'cart_items',
  CACHE_TIMESTAMP: 'cart_cache_timestamp',
  LAST_UPDATED: 'cart_last_updated'
};

// Cache expiry time (10 minutes)
const CART_CACHE_EXPIRY = 10 * 60 * 1000;

// Cache utility functions
const loadCartFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CART_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    return data;
  } catch (error) {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveCartToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error(`Error saving cart cache ${key}:`, error);
  }
};

// Skeleton loading component
const CartSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonActions}></div>
      </div>
      <div className={styles.skeletonStore}>
        <div className={styles.skeletonStoreHeader}></div>
        {[1,2].map(i => (
          <div key={i} className={styles.skeletonItem}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonInfo}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLineShort}></div>
              <div className={styles.skeletonPrice}></div>
            </div>
          </div>
        ))}
        <div className={styles.skeletonFooter}></div>
      </div>
    </div>
  );
};

// Empty Cart Component
const EmptyCart = () => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.emptyCart} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.emptyCartIcon}>
        <FaShoppingCart />
      </div>
      <h2>Your cart is empty</h2>
      <p>Browse our amazing products and add some items to your cart</p>
      <button className={styles.shopBtn} onClick={() => navigate("/student/marketplace")}>
        Start Shopping
      </button>
    </div>
  );
};

// Cart Item Component
const CartItem = memo(({ item, isUpdating, onUpdateQuantity, onRemove, onNavigate }) => {
  const { darkMode } = useDarkMode();
  const product = item.products;
  
  if (!product) return null;
  
  const price = Number(product.price) || 0;
  const discount = Number(product.discount) || 0;
  const discountedPrice = price - (price * discount / 100);
  const itemTotal = discountedPrice * item.quantity;
  const imageUrl = product.image_gallery?.[0] || product.image_url || "/placeholder.jpg";
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 10;
  const isOutOfStock = product.stock_quantity <= 0;
  
  return (
    <motion.div
      className={styles.cartItem}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      {/* Product Image */}
      <div className={styles.itemImage} onClick={() => onNavigate(`/student/product/${product.id}`)}>
        <img src={imageUrl} alt={product.name} loading="lazy" />
        {discount > 0 && (
          <div className={styles.discountBadge}>
            <FaPercent /> {discount}% OFF
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className={styles.itemDetails}>
        <h4 onClick={() => onNavigate(`/student/product/${product.id}`)}>
          {product.name}
        </h4>
        
        {item.variant && (
          <div className={styles.variantInfo}>
            {typeof item.variant === 'string' ? item.variant : JSON.stringify(item.variant)}
          </div>
        )}
        
        <div className={styles.priceSection}>
          <div className={styles.currentPrice}>
            {formatKenyanMoney(discountedPrice)}
          </div>
          {discount > 0 && (
            <div className={styles.originalPrice}>
              {formatKenyanMoney(price)}
            </div>
          )}
        </div>

        {/* Stock Status */}
        <div className={styles.stockStatus}>
          {isOutOfStock ? (
            <span className={styles.outOfStock}>Out of Stock</span>
          ) : isLowStock ? (
            <span className={styles.lowStock}>⚠️ Only {product.stock_quantity} left</span>
          ) : (
            <span className={styles.inStock}>✓ In Stock</span>
          )}
        </div>

        {/* Delivery Info */}
        <div className={styles.deliveryInfo}>
          <FaTruck className={styles.deliveryIcon} />
          <span>Delivery in 2-5 days</span>
        </div>
      </div>

      {/* Quantity and Actions */}
      <div className={styles.itemActions}>
        <div className={styles.quantityControl}>
          <button
            className={styles.qtyBtn}
            onClick={() => onUpdateQuantity(item.id, product.id, item.quantity - 1, product.name)}
            disabled={isUpdating || item.quantity <= 1 || isOutOfStock}
          >
            <FaMinus />
          </button>
          <span className={styles.qtyValue}>
            {isUpdating ? <FaSpinner className={styles.spinning} /> : item.quantity}
          </span>
          <button
            className={styles.qtyBtn}
            onClick={() => onUpdateQuantity(item.id, product.id, item.quantity + 1, product.name)}
            disabled={isUpdating || item.quantity >= product.stock_quantity || isOutOfStock}
          >
            <FaPlus />
          </button>
        </div>

        <div className={styles.itemTotal}>
          <span className={styles.totalLabel}>Total:</span>
          <span className={styles.totalValue}>{formatKenyanMoney(itemTotal)}</span>
        </div>

        <div className={styles.itemActionsButtons}>
          <button
            className={styles.wishlistBtn}
            onClick={() => toast.success("Added to wishlist")}
          >
            <FaHeart /> Save
          </button>
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(item.id, product.name)}
            disabled={isUpdating}
          >
            <FaTrash /> Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
});

CartItem.displayName = 'CartItem';

// Main Cart Component
const Cart = memo(() => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState(() => loadCartFromCache(CART_CACHE_KEYS.ITEMS, []));
  const [loading, setLoading] = useState(() => loadCartFromCache(CART_CACHE_KEYS.ITEMS, []).length === 0);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isFetching: false,
    lastFetchTime: 0
  });

  const fetchCartItems = useCallback(async (forceRefresh = false) => {
    if (cacheDataRef.current.isFetching || !user?.id) return;
    
    if (!forceRefresh && cartItems.length > 0) {
      setLoading(false);
      return;
    }
    
    cacheDataRef.current.isFetching = true;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id, 
          product_id, 
          quantity,
          variant,
          products (
            id,
            name,
            price,
            discount,
            stock_quantity,
            image_gallery,
            image_url,
            stores!inner (
              id,
              name,
              is_active,
              owner_id
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("products.stores.is_active", true);

      if (error) throw error;

      const items = data || [];
      setCartItems(items);
      saveCartToCache(CART_CACHE_KEYS.ITEMS, items);
      cacheDataRef.current.lastFetchTime = Date.now();
      
    } catch (error) {
      console.error("Cart error:", error);
      if (cartItems.length === 0) {
        toast.error("Failed to load cart");
      }
    } finally {
      setLoading(false);
      cacheDataRef.current.isFetching = false;
    }
  }, [user, cartItems.length]);

  // Initial fetch
  useEffect(() => {
    if (cartItems.length === 0 && !cacheDataRef.current.isFetching) {
      fetchCartItems();
    } else {
      setLoading(false);
    }
    isMountedRef.current = true;
  }, [cartItems.length, fetchCartItems]);

  // Save to cache
  useEffect(() => {
    if (isMountedRef.current && cartItems.length > 0) {
      saveCartToCache(CART_CACHE_KEYS.ITEMS, cartItems);
    }
  }, [cartItems]);

  const handleRemoveFromCart = useCallback(async (cartId, productName) => {
    setUpdatingItems(prev => new Set(prev).add(cartId));
    
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartId);
      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== cartId));
      toast.success(`${productName} removed from cart`);
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove item");
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
    }
  }, []);

  const handleUpdateQuantity = useCallback(async (cartId, productId, newQuantity, productName) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(cartId));
    
    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", cartId);
      if (error) throw error;

      setCartItems(prev => 
        prev.map(item => item.id === cartId ? { ...item, quantity: newQuantity } : item)
      );
    } catch (error) {
      console.error("Update quantity error:", error);
      toast.error("Failed to update quantity");
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
    }
  }, []);

  const handleCheckout = useCallback(async (storeId, storeName, storeItems) => {
    if (!user?.id) {
      toast.error("Please login to proceed to checkout");
      return;
    }

    const outOfStockItems = storeItems.filter(item => 
      item.products.stock_quantity < item.quantity
    );
    
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.products.name).join(", ");
      toast.error(`Some items are out of stock: ${itemNames}`);
      return;
    }

    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from("stores")
        .select("id, name, contact_phone, contact_email, location, owner_id")
        .eq("id", storeId)
        .single();

      if (sellerError) throw sellerError;

      const firstProductId = storeItems[0].products.id;
      navigate(`/checkout/${firstProductId}`, { 
        state: { 
          cartItems: storeItems,
          fromCart: true,
          storeId: storeId,
          seller: sellerData
        } 
      });
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to prepare checkout");
    }
  }, [user, navigate]);

  const calculateItemTotal = useCallback((item) => {
    const product = item.products;
    if (!product) return 0;
    const price = Number(product.price) || 0;
    const discount = Number(product.discount) || 0;
    const discountedPrice = price - (price * discount / 100);
    return discountedPrice * item.quantity;
  }, []);

  // Calculate totals
  const totalAmount = cartItems.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const totalSavings = cartItems.reduce((acc, item) => {
    const price = Number(item.products.price) || 0;
    const discount = Number(item.products.discount) || 0;
    const discountedPrice = price - (price * discount / 100);
    return acc + ((price - discountedPrice) * item.quantity);
  }, 0);

  // Group items by store
  const itemsByStore = cartItems.reduce((acc, item) => {
    const store = item.products.stores;
    const storeKey = `${store.id}-${store.name}`;
    if (!acc[storeKey]) {
      acc[storeKey] = { store, items: [] };
    }
    acc[storeKey].items.push(item);
    return acc;
  }, {});

  if (loading && cartItems.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Shopping Cart</h1>
        <div className={styles.headerActions}>
          <span className={styles.itemCount}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.content}>
        {cartItems.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className={styles.cartLayout}>
            {/* Cart Items */}
            <div className={styles.cartItems}>
              <AnimatePresence>
                {Object.entries(itemsByStore).map(([storeKey, storeData]) => {
                  const { store, items } = storeData;
                  const storeTotal = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
                  const storeItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
                  
                  return (
                    <motion.div 
                      key={storeKey}
                      className={styles.storeSection}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      {/* Store Header */}
                      <div className={styles.storeHeader}>
                        <FaStore className={styles.storeIcon} />
                        <div className={styles.storeInfo}>
                          <h3>{store.name}</h3>
                          <span className={styles.storeBadge}>Verified Seller</span>
                        </div>
                        <span className={styles.storeItemBadge}>{storeItemCount} items</span>
                      </div>
                      
                      {/* Items List */}
                      <div className={styles.storeItems}>
                        {items.map((item) => (
                          <CartItem
                            key={item.id}
                            item={item}
                            isUpdating={updatingItems.has(item.id)}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemove={handleRemoveFromCart}
                            onNavigate={navigate}
                          />
                        ))}
                      </div>

                      {/* Store Footer */}
                      <div className={styles.storeFooter}>
                        <div className={styles.storeTotal}>
                          <span>Subtotal ({storeItemCount} items):</span>
                          <span className={styles.storeTotalAmount}>{formatKenyanMoney(storeTotal)}</span>
                        </div>
                        <button
                          className={styles.checkoutBtn}
                          onClick={() => handleCheckout(store.id, store.name, items)}
                          disabled={items.some(item => item.products.stock_quantity < item.quantity)}
                        >
                          <FaCreditCard />
                          Checkout from {store.name}
                          <FaChevronRight />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className={styles.orderSummary}>
              <div className={styles.summaryCard}>
                <h3>Order Summary</h3>
                
                <div className={styles.summaryRow}>
                  <span>Subtotal ({totalItems} items)</span>
                  <span>{formatKenyanMoney(totalAmount)}</span>
                </div>
                
                {totalSavings > 0 && (
                  <div className={`${styles.summaryRow} ${styles.savings}`}>
                    <span>You save</span>
                    <span className={styles.savingsValue}>- {formatKenyanMoney(totalSavings)}</span>
                  </div>
                )}
                
                <div className={styles.summaryDivider} />
                
                <div className={`${styles.summaryRow} ${styles.total}`}>
                  <span>Total to pay</span>
                  <span className={styles.totalValue}>{formatKenyanMoney(totalAmount)}</span>
                </div>
                
                <div className={styles.shippingNote}>
                  <FaTruck />
                  <span>Shipping fees calculated at checkout</span>
                </div>
                
                <div className={styles.securityNote}>
                  <FaShieldAlt />
                  <span>Secure payment guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Spacing for Navigation */}
      <div className={styles.bottomSpacing} />
    </div>
  );
});

Cart.displayName = 'Cart';
export default Cart;