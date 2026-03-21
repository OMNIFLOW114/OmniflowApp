// Cart.jsx - Jumia Style Cart Page (Kenyan Money Format)
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
  FaStore,
  FaChevronRight,
  FaCreditCard,
  FaHeart,
  FaTag,
  FaTruck,
  FaClock,
  FaPercent
} from "react-icons/fa";
import "./Cart.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (amount === undefined || amount === null) return "0.00";
  const num = Number(amount);
  if (isNaN(num)) return "0.00";
  // Format: 1,234,567.89
  return num.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

// Skeleton loading component
const CartSkeleton = () => (
  <div className="cart-page">
    <div className="cart-container">
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>
      </div>
      <div className="skeleton-store">
        <div className="skeleton-store-header"></div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton-item">
            <div className="skeleton-image"></div>
            <div className="skeleton-info">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-line price"></div>
            </div>
          </div>
        ))}
        <div className="skeleton-footer"></div>
      </div>
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
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  const isMountedRef = useRef(false);
  const cacheDataRef = useRef({
    isFetching: false,
    lastFetchTime: 0,
    syncInProgress: false
  });

  const fetchCartItems = useCallback(async (forceRefresh = false) => {
    if (cacheDataRef.current.isFetching || !user?.id) return;
    
    if (!forceRefresh && cartItems.length > 0) {
      setLoading(false);
      return;
    }
    
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
      if (cartItems.length === 0) {
        toast.error("Failed to load cart.");
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

  // Save cart items to cache
  useEffect(() => {
    if (isMountedRef.current && cartItems.length > 0) {
      saveCartToCache(CART_CACHE_KEYS.ITEMS, cartItems);
    }
  }, [cartItems]);

  // Background refresh
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!cacheDataRef.current.isFetching && user?.id) {
        fetchCartItems(true);
      }
    }, 2 * 60 * 1000);
    
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

    if (storeItems.length === 0) {
      toast.error("No items found for this store");
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

    const store = storeItems[0].products.stores;
    if (!store.is_active) {
      toast.error("This store is currently inactive");
      return;
    }

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

      toast.success(`Proceeding to checkout for ${storeName}`);
      
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
    storeData.finalAmount = storeData.totalAmount;
  });

  // Calculate total savings
  const totalSavings = cartItems.reduce((acc, item) => {
    const price = Number(item.products.price) || 0;
    const discount = Number(item.products.discount) || 0;
    const discountedPrice = price - (price * discount / 100);
    return acc + ((price - discountedPrice) * item.quantity);
  }, 0);

  if (loading && cartItems.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <h1>Shopping Cart</h1>
            <span className="cart-item-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          </div>
        </div>

        <div className="cart-layout">
          {/* Main Cart Content */}
          <div className="cart-content">
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">
                  <FaShoppingCart />
                </div>
                <h2>Your cart is empty</h2>
                <p>Browse our amazing products and add some items to your cart</p>
                <button className="btn-primary btn-large" onClick={() => navigate("/")}>
                  Start Shopping
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {Object.entries(itemsByStore).map(([storeKey, storeData]) => {
                  const { store, items, totalAmount, totalItems, finalAmount } = storeData;
                  
                  return (
                    <motion.div 
                      key={storeKey}
                      className="store-section"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Store Header */}
                      <div className="store-header">
                        <FaStore className="store-icon" />
                        <div className="store-info">
                          <h3>{store.name}</h3>
                          <span className="store-badge">Seller</span>
                        </div>
                        <span className="store-item-badge">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                      </div>
                      
                      {/* Items List */}
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
                              {/* Checkbox */}
                              <div className="item-select">
                                <input type="checkbox" className="item-checkbox" />
                              </div>
                              
                              {/* Product Image */}
                              <div className="item-image" onClick={() => navigate(`/product/${product.id}`)}>
                                <img src={imageUrl} alt={product.name} loading="lazy" />
                                {discount > 0 && (
                                  <div className="discount-badge">
                                    <FaPercent /> {discount}% OFF
                                  </div>
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="item-details">
                                <h4 onClick={() => navigate(`/product/${product.id}`)}>
                                  {product.name}
                                </h4>
                                
                                {item.variant && (
                                  <div className="variant-info">
                                    {typeof item.variant === 'string' ? item.variant : JSON.stringify(item.variant)}
                                  </div>
                                )}
                                
                                <div className="price-section">
                                  <div className="current-price">
                                    KES {formatKenyanMoney(discountedPrice)}
                                  </div>
                                  {discount > 0 && (
                                    <>
                                      <div className="original-price">
                                        KES {formatKenyanMoney(price)}
                                      </div>
                                      <div className="saved-price">
                                        Save KES {formatKenyanMoney(price - discountedPrice)}
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Stock Status */}
                                <div className="stock-status">
                                  {product.stock_quantity > 10 ? (
                                    <span className="in-stock">✓ In Stock</span>
                                  ) : product.stock_quantity > 0 ? (
                                    <span className="low-stock">⚠️ Only {product.stock_quantity} left</span>
                                  ) : (
                                    <span className="out-of-stock">✗ Out of Stock</span>
                                  )}
                                </div>

                                {/* Delivery Info */}
                                <div className="delivery-info">
                                  <FaTruck className="delivery-icon" />
                                  <span>Delivery in 2-5 days</span>
                                  <FaClock className="delivery-icon clock" />
                                  <span>Free shipping</span>
                                </div>
                              </div>

                              {/* Quantity and Actions */}
                              <div className="item-actions">
                                <div className="quantity-control">
                                  <button
                                    className="qty-btn"
                                    onClick={() => handleUpdateQuantity(
                                      item.id, 
                                      product.id, 
                                      item.quantity - 1, 
                                      product.name
                                    )}
                                    disabled={isUpdating || item.quantity <= 1}
                                  >
                                    <FaMinus />
                                  </button>
                                  <span className="qty-value">
                                    {isUpdating ? "..." : item.quantity}
                                  </span>
                                  <button
                                    className="qty-btn"
                                    onClick={() => handleUpdateQuantity(
                                      item.id, 
                                      product.id, 
                                      item.quantity + 1, 
                                      product.name
                                    )}
                                    disabled={isUpdating || item.quantity >= product.stock_quantity}
                                  >
                                    <FaPlus />
                                  </button>
                                </div>

                                <div className="item-total">
                                  <span className="total-label">Total:</span>
                                  <span className="total-value">KES {formatKenyanMoney(itemTotal)}</span>
                                </div>

                                <div className="item-actions-buttons">
                                  <button
                                    className="wishlist-btn"
                                    onClick={() => toast.success("Added to wishlist")}
                                  >
                                    <FaHeart />
                                    Save for later
                                  </button>
                                  <button
                                    className="remove-btn"
                                    onClick={() => handleRemoveFromCart(item.id, product.name)}
                                    disabled={isUpdating}
                                  >
                                    <FaTrash />
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Store Footer */}
                      <div className="store-footer">
                        <div className="store-total">
                          <span>Subtotal ({totalItems} items):</span>
                          <span className="store-total-amount">KES {formatKenyanMoney(finalAmount)}</span>
                        </div>
                        <button
                          className="checkout-btn"
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
            )}
          </div>

          {/* Horizontal Order Summary - Kenyan Style */}
          {cartItems.length > 0 && (
            <div className="order-summary-horizontal">
              <div className="summary-horizontal-card">
                <div className="summary-horizontal-item">
                  <span className="summary-label">Subtotal</span>
                  <span className="summary-value">KES {formatKenyanMoney(totalAmount)}</span>
                </div>
                
                {totalSavings > 0 && (
                  <div className="summary-horizontal-item savings">
                    <span className="summary-label">You save</span>
                    <span className="summary-value savings-value">- KES {formatKenyanMoney(totalSavings)}</span>
                  </div>
                )}
                
                <div className="summary-horizontal-item total">
                  <span className="summary-label">Total to pay</span>
                  <span className="summary-value total-value">KES {formatKenyanMoney(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

Cart.displayName = 'Cart';

export default Cart;