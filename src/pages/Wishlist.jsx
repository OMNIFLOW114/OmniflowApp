import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaHeart, FaTrash, FaShoppingCart, FaCrown, FaEye, FaBell, FaRocket } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Wishlist.css";

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState({});

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user?.id) return;

      // Fetch user premium status
      const { data: userData } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      setIsPremiumUser(userData?.is_premium || false);

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product_id, created_at, products (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load wishlist.");
        return;
      }

      setWishlistItems(data || []);
      
      // Load price alerts from localStorage
      const savedAlerts = localStorage.getItem(`priceAlerts_${user.id}`);
      if (savedAlerts) {
        setPriceAlerts(JSON.parse(savedAlerts));
      }
      
      setLoading(false);
    };

    fetchWishlist();
  }, [user]);

  const handleRemoveFromWishlist = async (wishlistId) => {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", wishlistId);

    if (error) {
      toast.error("Failed to remove item.");
    } else {
      setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistId));
      toast.success("Removed from wishlist.");
    }
  };

  const handleMoveToCart = async (item) => {
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

    await handleRemoveFromWishlist(item.id);
    toast.success("Moved to cart!");
  };

  const handlePriceAlert = (productId, targetPrice) => {
    if (!isPremiumUser) {
      toast.error("Price alerts are a premium feature!");
      navigate("/premium");
      return;
    }

    const newAlerts = {
      ...priceAlerts,
      [productId]: targetPrice
    };
    
    setPriceAlerts(newAlerts);
    localStorage.setItem(`priceAlerts_${user.id}`, JSON.stringify(newAlerts));
    toast.success("Price alert set! We'll notify you when the price drops.");
  };

  const removePriceAlert = (productId) => {
    const newAlerts = { ...priceAlerts };
    delete newAlerts[productId];
    setPriceAlerts(newAlerts);
    localStorage.setItem(`priceAlerts_${user.id}`, JSON.stringify(newAlerts));
    toast.success("Price alert removed.");
  };

  const getPriceDrop = (product) => {
    const originalPrice = Number(product.original_price) || Number(product.price) * 1.2;
    const currentPrice = Number(product.price);
    const dropPercentage = ((originalPrice - currentPrice) / originalPrice) * 100;
    return dropPercentage > 0 ? Math.round(dropPercentage) : 0;
  };

  if (loading) return <div className="wishlist-container">Loading...</div>;

  return (
    <div className="wishlist-container">
      <div className="wishlist-header">
        <h2><FaHeart /> My Wishlist</h2>
        {isPremiumUser && (
          <div className="premium-badge">
            <FaCrown /> Premium Member
          </div>
        )}
      </div>

      {wishlistItems.length === 0 ? (
        <div className="empty-wishlist">
          <div className="empty-heart">
            <FaHeart />
          </div>
          <p className="empty">Your wishlist is empty</p>
          <p className="empty-subtitle">Start adding items you love!</p>
          <button 
            className="browse-products-btn"
            onClick={() => navigate("/products")}
          >
            Browse Products
          </button>
        </div>
      ) : (
        <>
          <div className="wishlist-stats">
            <div className="stat-card">
              <span className="stat-number">{wishlistItems.length}</span>
              <span className="stat-label">Items Saved</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {wishlistItems.filter(item => getPriceDrop(item.products) > 0).length}
              </span>
              <span className="stat-label">Price Drops</span>
            </div>
            {isPremiumUser && (
              <div className="stat-card premium">
                <span className="stat-number">
                  {Object.keys(priceAlerts).length}
                </span>
                <span className="stat-label">Active Alerts</span>
              </div>
            )}
          </div>

          {!isPremiumUser && (
            <div className="premium-upsell-banner">
              <div className="upsell-content">
                <FaCrown className="crown-icon" />
                <div className="upsell-text">
                  <h4>Unlock Premium Wishlist Features</h4>
                  <p>Get price drop alerts, early access to sales, and exclusive deals</p>
                </div>
                <button 
                  className="upgrade-btn"
                  onClick={() => navigate("/premium")}
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

          <div className="wishlist-grid">
            {wishlistItems.map((item) => {
              const product = item.products;
              if (!product) return null;

              const priceDrop = getPriceDrop(product);
              const hasPriceAlert = priceAlerts[product.id];
              const isOnSale = product.discount > 0;

              return (
                <div className="wishlist-card" key={item.id}>
                  <div className="card-badges">
                    {isOnSale && (
                      <span className="sale-badge">
                        -{product.discount}% OFF
                      </span>
                    )}
                    {priceDrop > 0 && (
                      <span className="price-drop-badge">
                        ⬇ {priceDrop}% Drop
                      </span>
                    )}
                    {product.is_featured && isPremiumUser && (
                      <span className="featured-badge">
                        <FaRocket /> Featured
                      </span>
                    )}
                  </div>

                  <img
                    src={product.image_gallery?.[0] || product.image_url}
                    alt={product.name}
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                  
                  <div className="wishlist-info">
                    <h4 onClick={() => navigate(`/product/${product.id}`)}>
                      {product.name}
                    </h4>
                    
                    <div className="price-section">
                      {isOnSale && (
                        <p className="original-price">
                          KSH {Number(product.original_price || product.price * 1.2).toLocaleString()}
                        </p>
                      )}
                      <p className="current-price">
                        KSH {Number(product.price).toLocaleString()}
                      </p>
                      {priceDrop > 0 && (
                        <p className="price-drop">
                          Price dropped {priceDrop}%!
                        </p>
                      )}
                    </div>

                    <div className="wishlist-buttons">
                      <button 
                        className="move-to-cart"
                        onClick={() => handleMoveToCart(item)}
                      >
                        <FaShoppingCart /> Add to Cart
                      </button>
                      
                      <button
                        className="view-details"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <FaEye /> Details
                      </button>

                      {isPremiumUser ? (
                        hasPriceAlert ? (
                          <button
                            className="remove-alert"
                            onClick={() => removePriceAlert(product.id)}
                          >
                            <FaBell /> Alert Set
                          </button>
                        ) : (
                          <button
                            className="set-alert"
                            onClick={() => handlePriceAlert(product.id, Number(product.price) * 0.8)}
                          >
                            <FaBell /> Price Alert
                          </button>
                        )
                      ) : (
                        <button
                          className="premium-feature"
                          onClick={() => navigate("/premium")}
                        >
                          <FaCrown /> Set Alert
                        </button>
                      )}

                      <button
                        className="remove"
                        onClick={() => handleRemoveFromWishlist(item.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {hasPriceAlert && (
                      <div className="price-alert-info">
                        <FaBell /> Alert set at KSH {priceAlerts[product.id].toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isPremiumUser && wishlistItems.length > 0 && (
            <div className="premium-features">
              <h3>💎 Premium Benefits Activated</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <FaBell />
                  <h4>Price Alerts</h4>
                  <p>Get notified when prices drop on your wishlisted items</p>
                </div>
                <div className="feature-item">
                  <FaRocket />
                  <h4>Early Access</h4>
                  <p>Be the first to know about sales and new arrivals</p>
                </div>
                <div className="feature-item">
                  <FaCrown />
                  <h4>Exclusive Deals</h4>
                  <p>Special discounts only for premium members</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Wishlist;