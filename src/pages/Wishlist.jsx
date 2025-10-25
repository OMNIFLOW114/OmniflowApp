import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [removingItems, setRemovingItems] = useState(new Set());

  useEffect(() => {
    const fetchWishlist = async () => {
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
      } catch (error) {
        console.error("Wishlist error:", error);
        toast.error("Failed to load wishlist.");
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user]);

  const handleRemoveFromWishlist = async (wishlistId, productName) => {
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

    await handleRemoveFromWishlist(item.id, item.products?.name);
    toast.success("Moved to cart!");
  };

  const handlePriceAlert = (productId, targetPrice, productName) => {
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
    toast.success(`Price alert set for ${productName}! We'll notify you when the price drops.`);
  };

  const removePriceAlert = (productId, productName) => {
    const newAlerts = { ...priceAlerts };
    delete newAlerts[productId];
    setPriceAlerts(newAlerts);
    localStorage.setItem(`priceAlerts_${user.id}`, JSON.stringify(newAlerts));
    toast.success(`Price alert removed for ${productName}.`);
  };

  const getPriceDrop = (product) => {
    const originalPrice = Number(product.original_price) || Number(product.price) * 1.2;
    const currentPrice = Number(product.price);
    const dropPercentage = ((originalPrice - currentPrice) / originalPrice) * 100;
    return dropPercentage > 0 ? Math.round(dropPercentage) : 0;
  };

  // Skeleton loading component
  const WishlistSkeleton = () => (
    <div className="wishlist-container">
      <div className="wishlist-header skeleton">
        <div className="skeleton-title"></div>
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

  if (loading) return <WishlistSkeleton />;

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
        </h1>
        {isPremiumUser && (
          <div className="premium-badge">
            <FaCrown /> Premium Member
          </div>
        )}
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
          <h2>Your wishlist is empty</h2>
          <p className="empty-subtitle">Start adding items you love!</p>
          <motion.button 
            className="browse-products-btn"
            onClick={() => navigate("/products")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Browse Products
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div className="wishlist-stats">
            <motion.div 
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <span className="stat-number">{wishlistItems.length}</span>
              <span className="stat-label">Items Saved</span>
            </motion.div>
            <motion.div 
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <span className="stat-number">
                {wishlistItems.filter(item => getPriceDrop(item.products) > 0).length}
              </span>
              <span className="stat-label">Price Drops</span>
            </motion.div>
            {isPremiumUser && (
              <motion.div 
                className="stat-card premium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <span className="stat-number">
                  {Object.keys(priceAlerts).length}
                </span>
                <span className="stat-label">Active Alerts</span>
              </motion.div>
            )}
          </div>

          {!isPremiumUser && (
            <motion.div 
              className="premium-upsell-banner"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="upsell-content">
                <FaCrown className="crown-icon" />
                <div className="upsell-text">
                  <h4>Unlock Premium Wishlist Features</h4>
                  <p>Get price drop alerts, early access to sales, and exclusive deals</p>
                </div>
                <motion.button 
                  className="upgrade-btn"
                  onClick={() => navigate("/premium")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Upgrade Now
                </motion.button>
              </div>
            </motion.div>
          )}

          <div className="wishlist-grid">
            <AnimatePresence>
              {wishlistItems.map((item, index) => {
                const product = item.products;
                if (!product) return null;

                const priceDrop = getPriceDrop(product);
                const hasPriceAlert = priceAlerts[product.id];
                const isOnSale = product.discount > 0;
                const isRemoving = removingItems.has(item.id);

                return (
                  <motion.div
                    key={item.id}
                    className="wishlist-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: 100 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    layout
                  >
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

                    <motion.div 
                      className="wishlist-image"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
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
                        <motion.button 
                          className="move-to-cart"
                          onClick={() => handleMoveToCart(item)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={isRemoving}
                        >
                          <FaShoppingCart /> Add to Cart
                        </motion.button>
                        
                        <motion.button
                          className="view-details"
                          onClick={() => navigate(`/product/${product.id}`)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={isRemoving}
                        >
                          <FaEye /> Details
                        </motion.button>

                        {isPremiumUser ? (
                          hasPriceAlert ? (
                            <motion.button
                              className="remove-alert"
                              onClick={() => removePriceAlert(product.id, product.name)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={isRemoving}
                            >
                              <FaBell /> Alert Set
                            </motion.button>
                          ) : (
                            <motion.button
                              className="set-alert"
                              onClick={() => handlePriceAlert(product.id, Number(product.price) * 0.8, product.name)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={isRemoving}
                            >
                              <FaBell /> Price Alert
                            </motion.button>
                          )
                        ) : (
                          <motion.button
                            className="premium-feature"
                            onClick={() => navigate("/premium")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isRemoving}
                          >
                            <FaCrown /> Set Alert
                          </motion.button>
                        )}

                        <motion.button
                          className="remove"
                          onClick={() => handleRemoveFromWishlist(item.id, product.name)}
                          disabled={isRemoving}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FaTrash />
                          {isRemoving ? "..." : ""}
                        </motion.button>
                      </div>

                      {hasPriceAlert && (
                        <div className="price-alert-info">
                          <FaBell /> Alert set at KSH {priceAlerts[product.id].toLocaleString()}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {isPremiumUser && wishlistItems.length > 0 && (
            <motion.div 
              className="premium-features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h3>💎 Premium Benefits Activated</h3>
              <div className="features-grid">
                <motion.div 
                  className="feature-item"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaBell />
                  <h4>Price Alerts</h4>
                  <p>Get notified when prices drop on your wishlisted items</p>
                </motion.div>
                <motion.div 
                  className="feature-item"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaRocket />
                  <h4>Early Access</h4>
                  <p>Be the first to know about sales and new arrivals</p>
                </motion.div>
                <motion.div 
                  className="feature-item"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaCrown />
                  <h4>Exclusive Deals</h4>
                  <p>Special discounts only for premium members</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Wishlist;