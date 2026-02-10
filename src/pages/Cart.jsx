import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaArrowLeft,
  FaLock,
  FaShippingFast,
  FaShieldAlt,
  FaStore
} from "react-icons/fa";
import "./Cart.css";

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
    
    // Check if cache is expired
    if (Date.now() - timestamp > CART_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading cart cache ${key}:`, error);
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveCartToCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving cart cache ${key}:`, error);
  }
};

const clearCartCache = () => {
  Object.values(CART_CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Skeleton loading component
const CartSkeleton = () => (
  <div className="cart-container">
    <div className="cart-header skeleton">
      <div className="skeleton-nav"></div>
      <div className="skeleton-title"></div>
    </div>
    <div className="cart-content">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="cart-item skeleton">
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
const Cart = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(() => 
    loadCartFromCache(CART_CACHE_KEYS.ITEMS, [])
  );
  const [loading, setLoading] = useState(() => 
    loadCartFromCache(CART_CACHE_KEYS.ITEMS, []).length === 0
  );
  const [updatingItems, setUpdatingItems] = useState(new Set());
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isFetching: false,
    lastFetchTime: 0,
    syncInProgress: false
  });

  const fetchCartItems = useCallback(async (forceRefresh = false) => {
    // Skip if already fetching
    if (cacheDataRef.current.isFetching || !user?.id) return;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh && cartItems.length > 0) {
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
            delivery_methods,
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

      if (error) {
        console.error("Cart fetch error:", error);
        toast.error("Failed to load cart.");
        return;
      }

      const items = data || [];
      setCartItems(items);
      saveCartToCache(CART_CACHE_KEYS.ITEMS, items);
      cacheDataRef.current.lastFetchTime = Date.now();
      
    } catch (error) {
      console.error("Cart error:", error);
      // Keep cached data if fetch fails
      if (cartItems.length === 0) {
        toast.error("Failed to load cart.");
      }
    } finally {
      setLoading(false);
      cacheDataRef.current.isFetching = false;
    }
  }, [user, cartItems.length]);

  // Initial fetch only if no cached items
  useEffect(() => {
    if (cartItems.length === 0 && !cacheDataRef.current.isFetching) {
      fetchCartItems();
    } else {
      setLoading(false);
    }
    isMountedRef.current = true;
  }, [cartItems.length, fetchCartItems]);

  // Save cart items to cache whenever they change
  useEffect(() => {
    if (isMountedRef.current && cartItems.length > 0) {
      saveCartToCache(CART_CACHE_KEYS.ITEMS, cartItems);
    }
  }, [cartItems]);

  // Background refresh every 2 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!cacheDataRef.current.isFetching && user?.id) {
        fetchCartItems(true);
      }
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => clearInterval(refreshInterval);
  }, [fetchCartItems, user]);

  const handleRemoveFromCart = useCallback(async (cartId, productName) => {
    setUpdatingItems(prev => new Set(prev).add(cartId));
    
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartId);

      if (error) throw error;

      setCartItems((prev) => prev.filter((item) => item.id !== cartId));
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
        prev.map(item => 
          item.id === cartId ? { ...item, quantity: newQuantity } : item
        )
      );
      
      if (newQuantity === 0) {
        toast.success(`${productName} removed from cart`);
      }
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
    console.log("🛒 Checkout clicked for store:", storeId, storeName);
    
    if (!user?.id) {
      toast.error("Please login to proceed to checkout");
      return;
    }

    if (storeItems.length === 0) {
      toast.error("No items found for this store");
      return;
    }

    // Check stock availability for all items in this store
    const outOfStockItems = storeItems.filter(item => 
      item.products.stock_quantity < item.quantity
    );
    
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.products.name).join(", ");
      toast.error(`Some items are out of stock: ${itemNames}`);
      return;
    }

    // Check if store is active
    const store = storeItems[0].products.stores;
    if (!store.is_active) {
      toast.error("This store is currently inactive");
      return;
    }

    // Get seller info for the store
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from("stores")
        .select("id, name, contact_phone, contact_email, location, owner_id")
        .eq("id", storeId)
        .single();

      if (sellerError) {
        console.error("Error fetching seller:", sellerError);
        toast.error("Failed to load store information");
        return;
      }

      console.log("✅ Proceeding to checkout with items:", storeItems);
      toast.success(`Proceeding to checkout for ${storeName}`);
      
      // Use the first product ID in the route to match your router setup
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
      console.error("Checkout preparation error:", error);
      toast.error("Failed to prepare checkout");
    }
  }, [user, navigate]);

  const calculateItemTotal = useCallback((item) => {
    const product = item.products;
    if (!product) return 0;
    
    const price = Number(product.price) || 0;
    const quantity = item.quantity || 1;
    const discount = Number(product.discount) || 0;
    const discountedPrice = price - (price * discount / 100);
    
    return discountedPrice * quantity;
  }, []);

  // Calculate totals
  const totalAmount = cartItems.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const shippingCost = Math.max(0, 200 - totalAmount * 0.05);

  // Group items by store
  const itemsByStore = cartItems.reduce((acc, item) => {
    const store = item.products.stores;
    const storeKey = `${store.id}-${store.name}`;
    if (!acc[storeKey]) {
      acc[storeKey] = {
        store: store,
        items: []
      };
    }
    acc[storeKey].items.push(item);
    return acc;
  }, {});

  // Calculate store-wise totals
  Object.keys(itemsByStore).forEach(storeKey => {
    const storeData = itemsByStore[storeKey];
    storeData.totalAmount = storeData.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    storeData.totalItems = storeData.items.reduce((acc, item) => acc + item.quantity, 0);
    storeData.shippingCost = Math.max(0, 200 - storeData.totalAmount * 0.05);
    storeData.finalAmount = storeData.totalAmount;
  });

  if (loading && cartItems.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="cart-container">
      {/* Header */}
      <motion.div 
        className="cart-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button 
          className="back-button"
          onClick={() => navigate("/")}
        >
          <FaArrowLeft /> Continue Shopping
        </button>
        
        <div className="cart-title-section">
          <h1>
            <FaShoppingCart className="cart-icon" />
            My Shopping Cart
          </h1>
          <p className="cart-subtitle">{totalItems} item{totalItems !== 1 ? 's' : ''} in your cart</p>
        </div>
      </motion.div>

      <div className="cart-layout">
        {/* Main Cart Content */}
        <div className="cart-content">
          {cartItems.length === 0 ? (
            <motion.div 
              className="empty-cart"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="empty-cart-icon">
                <FaShoppingCart />
              </div>
              <h2>Your cart is empty</h2>
              <p>Browse our amazing products and add some items to your cart</p>
              <motion.button 
                className="shop-now-btn"
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Shopping
              </motion.button>
            </motion.div>
          ) : (
            <AnimatePresence>
              {Object.entries(itemsByStore).map(([storeKey, storeData]) => {
                const { store, items, totalAmount, totalItems, shippingCost, finalAmount } = storeData;
                
                return (
                  <motion.div 
                    key={storeKey}
                    className="store-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="store-header">
                      <FaStore className="store-icon" />
                      <h3>{store.name}</h3>
                      <span className="store-item-count">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="store-items">
                      {items.map((item) => {
                        const product = item.products;
                        const isUpdating = updatingItems.has(item.id);
                        
                        if (!product) return null;

                        const price = Number(product.price) || 0;
                        const discount = Number(product.discount) || 0;
                        const discountedPrice = price - (price * discount / 100);
                        const itemTotal = calculateItemTotal(item);
                        const imageUrl = product.image_gallery?.[0] || product.image_url || "/placeholder.jpg";

                        return (
                          <motion.div
                            key={item.id}
                            className="cart-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            layout
                          >
                            <div className="item-image" onClick={() => navigate(`/product/${product.id}`)}>
                              <img src={imageUrl} alt={product.name} />
                              {discount > 0 && (
                                <span className="discount-badge">-{discount}%</span>
                              )}
                            </div>

                            <div className="item-details">
                              <h4 onClick={() => navigate(`/product/${product.id}`)}>
                                {product.name}
                              </h4>
                              
                              {item.variant && (
                                <div className="variant-info">
                                  <span>Variant: {typeof item.variant === 'string' ? item.variant : JSON.stringify(item.variant)}</span>
                                </div>
                              )}
                              
                              <div className="price-info">
                                <span className="current-price">
                                  KSH {discountedPrice.toLocaleString()}
                                </span>
                                {discount > 0 && (
                                  <span className="original-price">
                                    KSH {price.toLocaleString()}
                                  </span>
                                )}
                              </div>

                              <div className="stock-info">
                                {product.stock_quantity > 0 ? (
                                  <span className="in-stock">In Stock ({product.stock_quantity} available)</span>
                                ) : (
                                  <span className="out-of-stock">Out of Stock</span>
                                )}
                              </div>
                            </div>

                            <div className="item-controls">
                              <div className="quantity-controls">
                                <motion.button
                                  className="quantity-btn"
                                  onClick={() => handleUpdateQuantity(
                                    item.id, 
                                    product.id, 
                                    item.quantity - 1, 
                                    product.name
                                  )}
                                  disabled={isUpdating || item.quantity <= 1}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FaMinus />
                                </motion.button>
                                
                                <span className="quantity-display">
                                  {isUpdating ? "..." : item.quantity}
                                </span>
                                
                                <motion.button
                                  className="quantity-btn"
                                  onClick={() => handleUpdateQuantity(
                                    item.id, 
                                    product.id, 
                                    item.quantity + 1, 
                                    product.name
                                  )}
                                  disabled={isUpdating || item.quantity >= product.stock_quantity}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FaPlus />
                                </motion.button>
                              </div>

                              <div className="item-total">
                                KSH {itemTotal.toLocaleString()}
                              </div>

                              <motion.button
                                className="remove-btn"
                                onClick={() => handleRemoveFromCart(item.id, product.name)}
                                disabled={isUpdating}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FaTrash />
                                {isUpdating ? "..." : "Remove"}
                              </motion.button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Store-wise Checkout Button */}
                    <div className="store-checkout-section">
                      <div className="store-summary">
                        <div className="store-total">
                          <span>Store Total: KSH {finalAmount.toLocaleString()}</span>
                          <span className="shipping-info">
                            Shipping: KSH {shippingCost.toLocaleString()}
                          </span>
                        </div>
                        <motion.button
                          className="store-checkout-btn"
                          onClick={() => handleCheckout(store.id, store.name, items)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={items.some(item => item.products.stock_quantity < item.quantity)}
                        >
                          <FaLock className="lock-icon" />
                          Checkout {store.name}
                          <span className="checkout-store-total">
                            KSH {((finalAmount * 1.16) + shippingCost).toLocaleString()}
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Global Order Summary */}
        {cartItems.length > 0 && (
          <motion.div 
            className="order-summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="summary-card">
              <h3>Cart Summary</h3>
              
              <div className="summary-details">
                <div className="summary-row">
                  <span>Total Items</span>
                  <span>{totalItems}</span>
                </div>
                
                <div className="summary-row">
                  <span>Stores</span>
                  <span>{Object.keys(itemsByStore).length}</span>
                </div>
                
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>KSH {totalAmount.toLocaleString()}</span>
                </div>
                
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>KSH {shippingCost.toLocaleString()}</span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-row total">
                  <span>Estimated Total</span>
                  <span>KSH {((totalAmount * 1.16) + shippingCost).toLocaleString()}</span>
                </div>
              </div>

              <div className="security-features">
                <div className="security-item">
                  <FaLock className="security-icon" />
                  <span>Secure checkout</span>
                </div>
                <div className="security-item">
                  <FaShippingFast className="security-icon" />
                  <span>Store-wise delivery</span>
                </div>
                <div className="security-item">
                  <FaShieldAlt className="security-icon" />
                  <span>Buyer protection</span>
                </div>
              </div>

              <p className="secure-notice">
                🔒 Checkout per store for optimal delivery experience
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
});

Cart.displayName = 'Cart';

export default Cart;