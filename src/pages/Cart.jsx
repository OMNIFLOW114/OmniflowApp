import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaTrash, FaShoppingCart, FaPlus, FaMinus, FaCrown, FaShieldAlt, FaRocket, FaGift } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      if (!user?.id) return;

      // Fetch user premium status
      const { data: userData } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      setIsPremiumUser(userData?.is_premium || false);

      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, products (*)")
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to load cart.");
        return;
      }

      setCartItems(data || []);
      setLoading(false);
    };

    fetchCart();
  }, [user]);

  const handleRemoveFromCart = async (cartId) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", cartId);
    if (error) {
      toast.error("Failed to remove item.");
    } else {
      setCartItems((prev) => prev.filter((item) => item.id !== cartId));
      toast.success("Removed from cart.");
    }
  };

  const handleQuantityChange = async (cartId, newQuantity) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", cartId);

    if (error) {
      toast.error("Failed to update quantity.");
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === cartId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const handleCheckout = () => {
    toast.success("Redirecting to checkout...");
    navigate("/checkout");
  };

  const calculateSavings = (product) => {
    const originalPrice = Number(product.price) || 0;
    const discount = Number(product.discount) || 0;
    const quantity = product.quantity || 1;
    const discountedPrice = originalPrice - (originalPrice * discount) / 100;
    const totalSavings = (originalPrice - discountedPrice) * quantity;
    return totalSavings;
  };

  const totalAmount = cartItems.reduce((acc, item) => {
    const product = item.products;
    if (!product) return acc;
    const price = Number(product.price) || 0;
    const quantity = item.quantity || 1;
    const discountedPrice = price - (price * (Number(product.discount) || 0) / 100);
    return acc + discountedPrice * quantity;
  }, 0);

  const totalSavings = cartItems.reduce((acc, item) => {
    return acc + calculateSavings(item.products);
  }, 0);

  const premiumDiscount = isPremiumUser ? totalAmount * 0.1 : 0; // 10% additional discount for premium users
  const finalAmount = totalAmount - premiumDiscount;
  const shippingCost = isPremiumUser ? 0 : Math.max(0, 200 - totalAmount * 0.05); // Free shipping for premium

  if (loading) return <div className="cart-container">Loading...</div>;

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h2><FaShoppingCart /> My Cart</h2>
        {isPremiumUser && (
          <div className="premium-badge">
            <FaCrown /> Premium Member
          </div>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p className="empty">Your cart is empty</p>
          <button 
            className="continue-shopping-btn"
            onClick={() => navigate("/products")}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          <div className="cart-content">
            <div className="cart-items-section">
              <div className="premium-benefits-banner">
                {!isPremiumUser && (
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
                )}
                
                {isPremiumUser && (
                  <div className="premium-active">
                    <FaCrown className="crown-icon" />
                    <span>You're enjoying premium benefits: 10% extra discount & free shipping!</span>
                  </div>
                )}
              </div>

              <div className="cart-grid">
                {cartItems.map((item) => {
                  const product = item.products;
                  if (!product) return null;

                  const originalPrice = Number(product.price);
                  const discount = Number(product.discount) || 0;
                  const discountedPrice = originalPrice - (originalPrice * discount) / 100;
                  const itemSavings = calculateSavings(product);

                  return (
                    <div className="cart-card" key={item.id}>
                      <div className="cart-card-header">
                        {product.is_featured && (
                          <span className="featured-badge">
                            <FaRocket /> Featured
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="discount-badge">-{discount}%</span>
                        )}
                      </div>
                      
                      <img
                        src={product.image_gallery?.[0] || product.image_url}
                        alt={product.name}
                        onClick={() => navigate(`/product/${product.id}`)}
                      />
                      
                      <div className="cart-info">
                        <h4 onClick={() => navigate(`/product/${product.id}`)}>
                          {product.name}
                        </h4>
                        
                        <div className="price-section">
                          {discount > 0 && (
                            <p className="original-price">
                              KSH {originalPrice.toLocaleString()}
                            </p>
                          )}
                          <p className="current-price">
                            KSH {discountedPrice.toLocaleString()}
                          </p>
                          {itemSavings > 0 && (
                            <p className="savings">
                              You save: KSH {itemSavings.toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="quantity-controls">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <FaMinus />
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          >
                            <FaPlus />
                          </button>
                        </div>

                        <div className="cart-actions">
                          <button 
                            className="remove"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            <FaTrash /> Remove
                          </button>
                          <button 
                            className="wishlist-btn"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cart-summary-section">
              <div className="cart-summary">
                <h3>Order Summary</h3>
                
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>KSH {totalAmount.toLocaleString()}</span>
                </div>
                
                {totalSavings > 0 && (
                  <div className="summary-row savings">
                    <span>Savings:</span>
                    <span>- KSH {totalSavings.toLocaleString()}</span>
                  </div>
                )}
                
                {isPremiumUser && (
                  <div className="summary-row premium-discount">
                    <span>
                      <FaCrown /> Premium Discount (10%):
                    </span>
                    <span>- KSH {premiumDiscount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="summary-row shipping">
                  <span>Shipping:</span>
                  <span>
                    {shippingCost === 0 ? "FREE" : `KSH ${shippingCost.toLocaleString()}`}
                  </span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>KSH {(finalAmount + shippingCost).toLocaleString()}</span>
                </div>

                {!isPremiumUser && totalAmount > 1000 && (
                  <div className="premium-suggestion">
                    <FaGift className="gift-icon" />
                    <p>You qualify for free shipping with Premium!</p>
                    <button 
                      className="upgrade-now-btn"
                      onClick={() => navigate("/premium")}
                    >
                      Upgrade & Save
                    </button>
                  </div>
                )}

                <button className="checkout-btn" onClick={handleCheckout}>
                  <FaShieldAlt /> Secure Checkout
                </button>
                
                <div className="security-badge">
                  <FaShieldAlt /> Your payment is secure and encrypted
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;