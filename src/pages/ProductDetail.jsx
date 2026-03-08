import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import {
  FaStar,
  FaUser,
  FaHeart,
  FaShoppingCart,
  FaComment,
  FaMapMarkerAlt,
  FaTruck,
  FaUndo,
  FaShieldAlt,
  FaMobileAlt,
  FaChevronLeft,
  FaChevronRight,
  FaPaperPlane,
} from "react-icons/fa";
import VerifiedBadge from "@/components/VerifiedBadge";
import "./ProductDetail.css";

// Custom hook for toast management
const useToast = () => {
  const toastIds = useRef(new Set());

  const showToast = useCallback((message, type = "success", options = {}) => {
    const toastId = `${message}-${Date.now()}`;
    
    if (!toastIds.current.has(toastId)) {
      toastIds.current.add(toastId);
      
      const toastFn = type === "error" ? toast.error : toast.success;
      toastFn(message, {
        id: toastId,
        duration: 3000,
        ...options,
      });

      setTimeout(() => {
        toastIds.current.delete(toastId);
      }, 3000);
    }
  }, []);

  return { showToast };
};

// Skeleton Loader Component
function ProductDetailSkeleton() {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`product-detail-skeleton ${darkMode ? 'dark' : ''}`}>
      {/* Image Skeleton */}
      <div className="skeleton-image-section">
        <div className="skeleton-image"></div>
      </div>
      
      <div className="skeleton-content">
        {/* Title Skeleton */}
        <div className="skeleton-title"></div>
        
        {/* Rating Skeleton */}
        <div className="skeleton-rating"></div>
        
        {/* Price Skeleton */}
        <div className="skeleton-price"></div>
        
        {/* Info Buttons Skeleton */}
        <div className="skeleton-info-buttons">
          <div className="skeleton-info-btn"></div>
          <div className="skeleton-info-btn"></div>
          <div className="skeleton-info-btn"></div>
        </div>
        
        {/* Variants Skeleton */}
        <div className="skeleton-variants">
          <div className="skeleton-variant-label"></div>
          <div className="skeleton-variant-options">
            <div className="skeleton-variant"></div>
            <div className="skeleton-variant"></div>
            <div className="skeleton-variant"></div>
          </div>
        </div>
        
        {/* Stock Skeleton */}
        <div className="skeleton-stock"></div>
        
        {/* Seller Card Skeleton */}
        <div className="skeleton-seller"></div>
        
        {/* Action Buttons Skeleton */}
        <div className="skeleton-actions">
          <div className="skeleton-action-btn"></div>
          <div className="skeleton-action-btn"></div>
          <div className="skeleton-action-btn"></div>
        </div>
        
        {/* Message Box Skeleton */}
        <div className="skeleton-message"></div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const { showToast } = useToast();

  // Core data
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // UI state
  const [activeInfoButton, setActiveInfoButton] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Buyer interactions
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Ratings & reviews
  const [hasRated, setHasRated] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviews, setReviews] = useState([]);

  // Seller performance
  const [sellerScore, setSellerScore] = useState({ avgRating: 0, totalSales: 0 });

  // Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoPlayTimer = useRef(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Prevent double loading
    if (hasLoaded.current) return;
    
    async function loadAll() {
      setLoading(true);
      try {
        // Product details
        const { data: p, error: pErr } = await supabase
          .from("products")
          .select(`
            *,
            variant_options,
            image_gallery,
            delivery_methods,
            return_policy,
            warranty,
            usage_guide
          `)
          .eq("id", id)
          .single();

        if (pErr || !p) {
          showToast("Product not found", "error");
          setLoading(false);
          return;
        }
        setProduct(p);
        const safeVariants = Array.isArray(p.variant_options) ? p.variant_options : [];
        p.variant_options = safeVariants;
        setSelectedVariant(safeVariants[0] || null);

        // Seller info - Using only columns that exist
        const { data: s, error: sErr } = await supabase
          .from("stores")
          .select("id, name, contact_phone, contact_email, location, is_verified")
          .eq("owner_id", p.owner_id)
          .single();

        if (sErr) {
          console.error("Seller fetch error:", sErr);
        } else {
          setSeller(s);
          setStoreId(s?.id);
        }

        // Seller stats
        const { data: orders } = await supabase
          .from("orders")
          .select("id")
          .eq("seller_id", p.owner_id);

        const inIds = Array.isArray(p.variant_options)
          ? p.variant_options.map(v => v.product_id).concat(p.id)
          : [p.id];

        const { data: ratingsAll } = await supabase
          .from("ratings")
          .select("rating")
          .in("product_id", inIds);

        const totalSales = orders?.length || 0;
        const avgRating =
          ratingsAll && ratingsAll.length
            ? (
                ratingsAll.reduce((sum, r) => sum + r.rating, 0) /
                ratingsAll.length
              ).toFixed(1)
            : "0.0";
        setSellerScore({ avgRating, totalSales });

        // User-specific flags
        if (user?.id) {
          const [{ data: r }, { data: c }, { data: w }] = await Promise.all([
            supabase
              .from("ratings")
              .select("rating")
              .eq("product_id", p.id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("cart_items")
              .select("id")
              .eq("product_id", p.id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("wishlist_items")
              .select("id")
              .eq("product_id", p.id)
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);

          if (r) {
            setHasRated(true);
            setSelectedRating(r.rating);
          }
          setIsInCart(!!c);
          setIsInWishlist(!!w);
        }

        // Recent reviews
        const { data: rawRatings, error: rawErr } = await supabase
          .from("ratings")
          .select("id, rating, comment, created_at, user_id")
          .eq("product_id", id)
          .not("comment", "is", null)
          .order("created_at", { ascending: false })
          .limit(3);

        if (!rawErr && rawRatings?.length) {
          const enriched = await Promise.all(
            rawRatings.map(async (r) => {
              const { data: profile } = await supabase
                .from("users")
                .select("email, phone, full_name")
                .eq("id", r.user_id)
                .single();
              const { data: order } = await supabase
                .from("orders")
                .select("id")
                .eq("buyer_id", r.user_id)
                .eq("product_id", id)
                .maybeSingle();
              return {
                ...r,
                profiles: profile,
                isVerified: !!order,
              };
            })
          );
          setReviews(enriched);
        }
        
        hasLoaded.current = true;
        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading product:", error);
        showToast("An error occurred while loading the product", "error");
      } finally {
        setLoading(false);
      }
    }

    loadAll();

    // Cleanup function
    return () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    };
  }, [id, user, showToast]); // Removed dependencies that cause reloads

  // Auto-play image carousel
  useEffect(() => {
    if (!product?.image_gallery?.length || !isAutoPlaying || loading || !dataLoaded) return;

    autoPlayTimer.current = setInterval(() => {
      setCurrentImageIndex((prev) => 
        prev === product.image_gallery.length - 1 ? 0 : prev + 1
      );
    }, 4000);

    return () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    };
  }, [product?.image_gallery?.length, isAutoPlaying, loading, dataLoaded]);

  // Touch handlers for manual swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsAutoPlaying(false);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!product?.image_gallery?.length) return;

    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next image
        setCurrentImageIndex((prev) => 
          prev === product.image_gallery.length - 1 ? 0 : prev + 1
        );
      } else {
        // Swipe right - previous image
        setCurrentImageIndex((prev) => 
          prev === 0 ? product.image_gallery.length - 1 : prev - 1
        );
      }
    }

    // Resume auto-play after manual interaction
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handlePrevImage = () => {
    if (!product?.image_gallery?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.image_gallery.length - 1 : prev - 1
    );
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleNextImage = () => {
    if (!product?.image_gallery?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => 
      prev === product.image_gallery.length - 1 ? 0 : prev + 1
    );
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleSendMessage = async () => {
    if (!user?.id) {
      showToast("Login to send message", "error");
      return;
    }
    if (!message.trim()) {
      showToast("Message is empty", "error");
      return;
    }
    if (!storeId) {
      showToast("Seller information not available", "error");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("store_messages").insert([
      {
        store_id: storeId,
        product_id: product.id,
        user_id: user.id,
        sender_role: "buyer",
        content: message.trim(),
        status: "sent",
      },
    ]);
    setSending(false);
    if (error) {
      console.error("Error sending message:", error);
      showToast("Message failed", "error");
    } else {
      showToast("Message sent! Redirecting to Messages...");
      setMessage("");
      navigate("/messages");
    }
  };

  const handleRateProduct = async () => {
    if (!user?.id) {
      showToast("Login to rate", "error");
      return;
    }
    if (hasRated || selectedRating === 0) {
      showToast("Already rated or select stars", "error");
      return;
    }
    const { error } = await supabase.from("ratings").insert([
      {
        user_id: user.id,
        product_id: product.id,
        rating: selectedRating,
        comment: null,
      },
    ]);
    if (error) {
      showToast("Rating failed", "error");
    } else {
      setHasRated(true);
      showToast("Thanks for rating!");
    }
  };

  const handleAddToCart = async () => {
    if (!user?.id) {
      showToast("Login to add to cart", "error");
      return;
    }
    setIsProcessing(true);
    const { error } = await supabase.from("cart_items").insert([
      {
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
      },
    ]);
    setIsProcessing(false);
    if (error) {
      if (error.code === '23505') {
        showToast("Already in cart", "error");
      } else {
        showToast("Failed to add to cart", "error");
      }
      return;
    }
    setIsInCart(true);
    showToast("Added to cart!");
  };

  const handleAddToWishlist = async () => {
    if (!user?.id) {
      showToast("Login to wishlist", "error");
      return;
    }
    setIsProcessing(true);
    const { error } = await supabase.from("wishlist_items").insert([
      { user_id: user.id, product_id: product.id },
    ]);
    setIsProcessing(false);
    if (error) {
      if (error.code === '23505') {
        showToast("Already in wishlist", "error");
      } else {
        showToast("Failed to add to wishlist", "error");
      }
      return;
    }
    setIsInWishlist(true);
    showToast("Wishlisted!");
  };

  const handleInfoButtonClick = (buttonName) => {
    setActiveInfoButton(activeInfoButton === buttonName ? null : buttonName);
  };

  const handleCheckout = () => {
    if (!user?.id) {
      showToast("Login to proceed to checkout", "error");
      return;
    }
    navigate(`/checkout/${product.id}`, {
      state: {
        productId: product.id,
        variant: selectedVariant || null,
        seller,
        storeId,
      },
    });
  };

  // Show skeleton while loading
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  // Show error if no product
  if (!product) {
    return (
      <div className={`product-detail-error ${darkMode ? 'dark' : ''}`}>
        <h2>Product Not Found</h2>
        <p>The product you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate("/")} className="btn btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const calculateOriginalPrice = () => {
    if (product.discount > 0) {
      return (+product.price / (1 - product.discount / 100)).toFixed(0);
    }
    return null;
  };

  const stockPercent =
    product.initial_stock && product.initial_stock > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (Number(product.stock_quantity || 0) /
              Number(product.initial_stock)) *
              100
          )
        )
      : 0;

  const dm = product.delivery_methods || {};
  const offersPickup =
    dm &&
    (dm.pickup === "Yes" ||
      dm.pickup === true ||
      (typeof dm.pickup === "string" && dm.pickup.trim() !== ""));
  const offersDoor =
    dm &&
    (dm.door === "Yes" ||
      dm.door === true ||
      (typeof dm.door === "string" && dm.door.trim() !== ""));

  const pickupInfoText =
    typeof dm.pickup === "string" && !["Yes", "No"].includes(dm.pickup)
      ? dm.pickup
      : "Pickup available. Exact pickup point will be shown at checkout.";
  const doorInfoText =
    typeof dm.door === "string" && !["Yes", "No"].includes(dm.door)
      ? dm.door
      : "Door delivery available. Cost depends on distance/urgency (calculated at checkout).";

  return (
    <div className={`product-detail-container ${darkMode ? 'dark' : ''}`}>
      {/* Image Carousel Section */}
      <div className="image-carousel-section">
        <div 
          className="image-carousel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            src={product.image_gallery?.[currentImageIndex] || product.image_url} 
            alt={`${product.name} - Image ${currentImageIndex + 1}`}
            className="carousel-image"
            loading="lazy"
          />
          
          {product.image_gallery?.length > 1 && (
            <>
              <button 
                className="carousel-nav prev"
                onClick={handlePrevImage}
                aria-label="Previous image"
              >
                <FaChevronLeft />
              </button>
              <button 
                className="carousel-nav next"
                onClick={handleNextImage}
                aria-label="Next image"
              >
                <FaChevronRight />
              </button>
              
              <div className="carousel-dots">
                {product.image_gallery.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setIsAutoPlaying(false);
                      setTimeout(() => setIsAutoPlaying(true), 5000);
                    }}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product Content */}
      <div className="product-content">
        {/* Header Section */}
        <div className="product-header">
          <h1 className="product-title">{product.name}</h1>
          
          <div className="product-rating">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <FaStar
                  key={n}
                  className={n <= (selectedRating || product.rating) ? "star-filled" : "star-empty"}
                  onClick={() => !hasRated && setSelectedRating(n)}
                  style={{ cursor: !hasRated ? 'pointer' : 'default' }}
                />
              ))}
            </div>
            <span className="rating-count">({product.review_count || 0} reviews)</span>
            {!hasRated && selectedRating > 0 && (
              <button onClick={handleRateProduct} className="rate-button">
                Submit Rating
              </button>
            )}
          </div>

          <div className="product-price">
            <span className="current-price">KSH {(+product.price).toLocaleString()}</span>
            {product.discount > 0 && (
              <>
                <span className="original-price">
                  KSH {calculateOriginalPrice().toLocaleString()}
                </span>
                <span className="discount-badge">-{product.discount}%</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Policies */}
        {(product.warranty || product.return_policy) && (
          <div className="quick-policies">
            {product.warranty && (
              <div className="policy-chip">
                <FaShieldAlt />
                <span>{product.warranty}</span>
              </div>
            )}
            {product.return_policy && (
              <div className="policy-chip">
                <FaUndo />
                <span>{product.return_policy}</span>
              </div>
            )}
          </div>
        )}

        {/* Info Buttons */}
        <div className="info-buttons">
          {offersPickup && (
            <button
              className={`info-btn ${activeInfoButton === "pickup" ? "active" : ""}`}
              onClick={() => handleInfoButtonClick("pickup")}
            >
              <FaMapMarkerAlt />
              <span>Pickup Info</span>
            </button>
          )}
          {offersDoor && (
            <button
              className={`info-btn ${activeInfoButton === "delivery" ? "active" : ""}`}
              onClick={() => handleInfoButtonClick("delivery")}
            >
              <FaTruck />
              <span>Delivery Info</span>
            </button>
          )}
          {product.warranty && (
            <button
              className={`info-btn ${activeInfoButton === "warranty" ? "active" : ""}`}
              onClick={() => handleInfoButtonClick("warranty")}
            >
              <FaShieldAlt />
              <span>Warranty</span>
            </button>
          )}
          {product.return_policy && (
            <button
              className={`info-btn ${activeInfoButton === "return" ? "active" : ""}`}
              onClick={() => handleInfoButtonClick("return")}
            >
              <FaUndo />
              <span>Returns</span>
            </button>
          )}
        </div>

        {/* Info Display Panels */}
        {activeInfoButton === "pickup" && (
          <div className="info-panel pickup-panel">
            <h4>
              <FaMapMarkerAlt /> Pickup Information
            </h4>
            <p>{pickupInfoText}</p>
            {seller?.location && (
              <p className="info-detail">
                <strong>Location:</strong> {seller.location}
              </p>
            )}
          </div>
        )}

        {activeInfoButton === "delivery" && (
          <div className="info-panel delivery-panel">
            <h4>
              <FaTruck /> Delivery Information
            </h4>
            <p>{doorInfoText}</p>
            {dm.fee && <p className="delivery-fee">Typical fee: {dm.fee}</p>}
          </div>
        )}

        {activeInfoButton === "warranty" && (
          <div className="info-panel warranty-panel">
            <h4>
              <FaShieldAlt /> Warranty Details
            </h4>
            <p>{product.warranty}</p>
          </div>
        )}

        {activeInfoButton === "return" && (
          <div className="info-panel return-panel">
            <h4>
              <FaUndo /> Return Policy
            </h4>
            <p>{product.return_policy}</p>
          </div>
        )}

        {/* Variants */}
        {Array.isArray(product.variant_options) && product.variant_options.length > 0 && (
          <div className="variants-section">
            <h4>Select Variant:</h4>
            <div className="variant-options">
              {product.variant_options.map((variant, index) => (
                <button
                  key={index}
                  className={`variant-btn ${selectedVariant === variant ? "selected" : ""}`}
                  onClick={() => setSelectedVariant(variant)}
                >
                  {variant.color || variant.name || `Option ${index + 1}`}
                  {variant.price && (
                    <span className="variant-price">+KSH {variant.price}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Usage Guide */}
        {product.usage_guide && (
          <div className="usage-guide">
            <h4>How to Use</h4>
            <p>{product.usage_guide}</p>
          </div>
        )}

        {/* Stock Status */}
        <div className="stock-status">
          <div className="stock-label">
            <span>Stock Available</span>
            <span className={product.stock_quantity < 10 ? "low-stock" : ""}>
              {product.stock_quantity} left
            </span>
          </div>
          <div className="stock-bar">
            <div 
              className="stock-fill" 
              style={{ width: `${stockPercent}%` }}
            />
          </div>
        </div>

        {/* Seller Information - Enhanced */}
        {seller && (
          <div className="seller-card">
            <div className="seller-header">
              <div className="seller-avatar">
                <FaUser />
              </div>
              <div className="seller-details">
                <h4>
                  {seller.name}
                  {seller.is_verified && <VerifiedBadge />}
                </h4>
                <div className="seller-stats">
                  <span className="seller-rating">
                    <FaStar /> {sellerScore.avgRating}
                  </span>
                  <span className="seller-sales">
                    {sellerScore.totalSales} sales
                  </span>
                </div>
              </div>
            </div>
            
            <div className="seller-contact">
              {seller.contact_phone && (
                <div className="contact-item">
                  <FaMobileAlt className="contact-icon" />
                  <a href={`tel:${seller.contact_phone}`} className="contact-link">
                    {seller.contact_phone}
                  </a>
                </div>
              )}
              {seller.contact_email && (
                <div className="contact-item">
                  <FaComment className="contact-icon" />
                  <a href={`mailto:${seller.contact_email}`} className="contact-link">
                    {seller.contact_email}
                  </a>
                </div>
              )}
              {seller.location && (
                <div className="contact-item">
                  <FaMapMarkerAlt className="contact-icon" />
                  <span>{seller.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleCheckout}
            disabled={isProcessing}
          >
            <FaShoppingCart />
            Buy Now
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleAddToCart}
            disabled={isInCart || isProcessing}
          >
            <FaShoppingCart />
            {isInCart ? "In Cart" : "Add to Cart"}
          </button>

          <button
            className="btn btn-outline"
            onClick={handleAddToWishlist}
            disabled={isInWishlist || isProcessing}
          >
            <FaHeart />
            {isInWishlist ? "Wishlisted" : "Wishlist"}
          </button>
        </div>

        {/* Quick Navigation */}
        <div className="quick-nav">
          <button className="nav-btn" onClick={() => navigate("/cart")}>
            <FaShoppingCart />
            <span>Cart</span>
          </button>
          <button className="nav-btn" onClick={() => navigate("/wishlist")}>
            <FaHeart />
            <span>Wishlist</span>
          </button>
          <button className="nav-btn" onClick={() => navigate("/orders")}>
            <FaUser />
            <span>Orders</span>
          </button>
        </div>

        {/* Ask Seller - Redesigned */}
        <div className="ask-seller">
          <h4>Ask a Question</h4>
          <div className="message-composer">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask ${seller?.name || 'the seller'} about this product...`}
              rows="3"
              disabled={sending}
            />
            <button 
              className="send-message-btn"
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
            >
              <FaPaperPlane />
              <span>{sending ? "Sending..." : "Send Message"}</span>
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="reviews-section">
            <h3>Customer Reviews</h3>
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <strong>{review.profiles?.full_name || "Anonymous"}</strong>
                    {review.isVerified && (
                      <span className="verified-purchase">Verified Purchase</span>
                    )}
                  </div>
                  <div className="review-stars">
                    {[...Array(5)].map((_, i) => (
                      <FaStar 
                        key={i} 
                        className={i < review.rating ? "star-filled" : "star-empty"} 
                      />
                    ))}
                  </div>
                </div>
                <p className="review-comment">"{review.comment}"</p>
                <span className="review-date">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}