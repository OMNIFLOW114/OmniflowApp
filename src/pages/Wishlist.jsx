import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaHeart, FaTrash, FaShoppingCart, FaEye, FaTag, FaFire, FaArrowDown } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Wishlist.css";

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingItems, setRemovingItems] = useState(new Set());

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
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
    toast.success("Added to cart!");
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
          {wishlistItems.length > 0 && (
            <span className="item-count">({wishlistItems.length})</span>
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
                <span className="stat-number">{wishlistItems.length}</span>
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
                  {wishlistItems.filter(item => getPriceDrop(item.products) > 0).length}
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
};

export default Wishlist;