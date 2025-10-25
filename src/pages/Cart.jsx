import React, { useEffect, useState } from "react";
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
  FaStore,
  FaCrown
} from "react-icons/fa";
import "./Cart.css";

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user premium status
        const { data: userData } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", user.id)
          .single();

        setIsPremiumUser(userData?.is_premium || false);

        const { data, error } = await supabase
          .from("cart_items")
          .select(`
            id, 
            product_id, 
            quantity, 
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
                is_active
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

        setCartItems(data || []);
      } catch (error) {
        console.error("Cart error:", error);
        toast.error("Failed to load cart.");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  const handleRemoveFromCart = async (cartId, productName) => {
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
  };

  const handleUpdateQuantity = async (cartId, productId, newQuantity, productName) => {
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
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    // Check if all items are from active stores
    const inactiveStoreItems = cartItems.filter(item => !item.products.stores.is_active);
    if (inactiveStoreItems.length > 0) {
      toast.error("Some items are from inactive stores. Please remove them to continue.");
      return;
    }
    
    toast.success("Redirecting to secure checkout...");
    navigate("/checkout", { state: { cartItems } });
  };

  const calculateItemTotal = (item) => {
    const product = item.products;
    if (!product) return 0;
    
    const price = Number(product.price) || 0;
    const quantity = item.quantity || 1;
    const discount = Number(product.discount) || 0;
    const discountedPrice = price - (price * discount / 100);
    
    return discountedPrice * quantity;
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const premiumDiscount = isPremiumUser ? totalAmount * 0.1 : 0;
  const finalAmount = totalAmount - premiumDiscount;
  const shippingCost = isPremiumUser ? 0 : Math.max(0, 200 - totalAmount * 0.05);

  // Group items by store
  const itemsByStore = cartItems.reduce((acc, item) => {
    const storeName = item.products.stores?.name || "Unknown Store";
    if (!acc[storeName]) {
      acc[storeName] = [];
    }
    acc[storeName].push(item);
    return acc;
  }, {});

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

  if (loading) return <CartSkeleton />;

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
          {isPremiumUser && (
            <div className="premium-badge">
              <FaCrown /> Premium Member
            </div>
          )}
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
            <>
              {/* Premium Benefits Banner */}
              <div className="premium-benefits-banner">
                {!isPremiumUser ? (
                  <div className="premium-upsell">
                    <FaCrown className="crown-icon" />
                    <div className="upsell-content">
                      <h4>Go Premium for Better Benefits!</h4>
                      <p>Get 10% additional discount, free shipping, and priority support</p>
                      <button 
                        className="upgrade-btn"
                        onClick={() => navigate("/premium")}
                      >
                        Upgrade Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="premium-active">
                    <FaCrown className="crown-icon" />
                    <span>You're enjoying premium benefits: 10% extra discount & free shipping!</span>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {Object.entries(itemsByStore).map(([storeName, storeItems]) => (
                  <motion.div 
                    key={storeName}
                    className="store-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="store-header">
                      <FaStore className="store-icon" />
                      <h3>{storeName}</h3>
                    </div>
                    
                    <div className="store-items">
                      {storeItems.map((item) => {
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Order Summary */}
        {cartItems.length > 0 && (
          <motion.div 
            className="order-summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="summary-card">
              <h3>Order Summary</h3>
              
              <div className="summary-details">
                <div className="summary-row">
                  <span>Items ({totalItems})</span>
                  <span>KSH {totalAmount.toLocaleString()}</span>
                </div>
                
                {isPremiumUser && (
                  <div className="summary-row premium-discount">
                    <span>
                      <FaCrown /> Premium Discount (10%):
                    </span>
                    <span>- KSH {premiumDiscount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="summary-row">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? "free-shipping" : ""}>
                    {shippingCost === 0 ? "FREE" : `KSH ${shippingCost.toLocaleString()}`}
                  </span>
                </div>
                
                <div className="summary-row">
                  <span>Estimated Tax</span>
                  <span>KSH {(finalAmount * 0.16).toLocaleString()}</span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-row total">
                  <span>Total Amount</span>
                  <span>KSH {((finalAmount * 1.16) + shippingCost).toLocaleString()}</span>
                </div>
              </div>

              <div className="security-features">
                <div className="security-item">
                  <FaLock className="security-icon" />
                  <span>Secure checkout</span>
                </div>
                <div className="security-item">
                  <FaShippingFast className="security-icon" />
                  <span>Free campus delivery</span>
                </div>
                <div className="security-item">
                  <FaShieldAlt className="security-icon" />
                  <span>Buyer protection</span>
                </div>
              </div>

              <motion.button
                className="checkout-btn"
                onClick={handleCheckout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={cartItems.length === 0}
              >
                <FaLock className="lock-icon" />
                Proceed to Secure Checkout
                <span className="checkout-total">KSH {((finalAmount * 1.16) + shippingCost).toLocaleString()}</span>
              </motion.button>

              <p className="secure-notice">
                🔒 Your payment information is encrypted and secure
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Cart;