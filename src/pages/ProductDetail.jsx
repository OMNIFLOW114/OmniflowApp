// src/pages/ProductDetail.jsx - FIXED VERSION
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  FaShare,
  FaFlag,
  FaCheck,
  FaClock,
  FaEye,
  FaStore,
  FaWhatsapp,
  FaSpinner,
  FaTimes
} from "react-icons/fa";
import styles from "./ProductDetail.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

// Skeleton Loader Component
const ProductDetailSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonActions}></div>
      </div>
      <div className={styles.skeletonImage}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitleLarge}></div>
        <div className={styles.skeletonPrice}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonSeller}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonButtons}></div>
      </div>
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();

  // Core data
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [activeInfoButton, setActiveInfoButton] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
  const [sellerScore, setSellerScore] = useState({ avgRating: 0, totalSales: 0 });
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  // Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoPlayTimer = useRef(null);
  const hasLoaded = useRef(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (hasLoaded.current) return;
    loadProductData();
    return () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    };
  }, [id, user]);

  const loadProductData = async () => {
    setLoading(true);
    setError(null);
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
        setError("Product not found");
        setLoading(false);
        return;
      }
      
      // Ensure arrays are properly formatted
      const safeProduct = {
        ...p,
        variant_options: Array.isArray(p.variant_options) ? p.variant_options : [],
        image_gallery: Array.isArray(p.image_gallery) ? p.image_gallery : (p.image_url ? [p.image_url] : []),
        tags: Array.isArray(p.tags) ? p.tags : [],
        delivery_methods: p.delivery_methods || {},
        keywords: Array.isArray(p.keywords) ? p.keywords : []
      };
      
      setProduct(safeProduct);
      
      const safeVariants = safeProduct.variant_options || [];
      setSelectedVariant(safeVariants[0] || null);

      // Calculate average rating
      if (safeProduct.total_ratings > 0) {
        setAverageRating(safeProduct.rating || 0);
        setTotalRatings(safeProduct.total_ratings || 0);
      }

      // Seller info - using users table directly
      const { data: s, error: sErr } = await supabase
        .from("stores")
        .select("id, name, contact_phone, contact_email, location, is_verified, owner_id")
        .eq("owner_id", safeProduct.owner_id)
        .single();

      if (!sErr && s) {
        setSeller(s);
        setStoreId(s?.id);
        
        // Get seller name from users table
        const { data: userData } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("id", safeProduct.owner_id)
          .single();
        
        if (userData) {
          setSeller(prev => ({ ...prev, name: userData.full_name || prev.name }));
        }
      }

      // Seller stats
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("seller_id", safeProduct.owner_id);

      const inIds = safeVariants.length > 0
        ? safeVariants.map(v => v.product_id).concat(safeProduct.id)
        : [safeProduct.id];

      const { data: ratingsAll } = await supabase
        .from("ratings")
        .select("rating")
        .in("product_id", inIds);

      const totalSales = orders?.length || 0;
      const avgRating = ratingsAll && ratingsAll.length
        ? (ratingsAll.reduce((sum, r) => sum + r.rating, 0) / ratingsAll.length).toFixed(1)
        : "0.0";
      setSellerScore({ avgRating, totalSales });

      // User-specific flags
      if (user?.id) {
        const [{ data: r }, { data: c }, { data: w }] = await Promise.all([
          supabase.from("ratings").select("rating").eq("product_id", safeProduct.id).eq("user_id", user.id).maybeSingle(),
          supabase.from("cart_items").select("id").eq("product_id", safeProduct.id).eq("user_id", user.id).maybeSingle(),
          supabase.from("wishlist_items").select("id").eq("product_id", safeProduct.id).eq("user_id", user.id).maybeSingle(),
        ]);

        if (r) {
          setHasRated(true);
          setSelectedRating(r.rating);
        }
        setIsInCart(!!c);
        setIsInWishlist(!!w);
      }

      // Recent reviews
      const { data: rawRatings } = await supabase
        .from("ratings")
        .select("id, rating, comment, created_at, user_id")
        .eq("product_id", id)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (rawRatings?.length) {
        const enriched = await Promise.all(
          rawRatings.map(async (r) => {
            const { data: userData } = await supabase
              .from("users")
              .select("full_name")
              .eq("id", r.user_id)
              .single();
            return {
              ...r,
              user_name: userData?.full_name || "Anonymous",
            };
          })
        );
        setReviews(enriched);
      }
      
      hasLoaded.current = true;
    } catch (error) {
      console.error("Error loading product:", error);
      setError("Failed to load product details");
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  // Auto-play image carousel
  useEffect(() => {
    if (!product?.image_gallery?.length || !isAutoPlaying || loading) return;

    autoPlayTimer.current = setInterval(() => {
      setCurrentImageIndex((prev) => 
        prev === product.image_gallery.length - 1 ? 0 : prev + 1
      );
    }, 4000);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [product?.image_gallery?.length, isAutoPlaying, loading]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    touchStartX.current = e.touches[0].clientX;
    setIsAutoPlaying(false);
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isMobile || !product?.image_gallery?.length) return;
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        setCurrentImageIndex((prev) => prev === product.image_gallery.length - 1 ? 0 : prev + 1);
      } else {
        setCurrentImageIndex((prev) => prev === 0 ? product.image_gallery.length - 1 : prev - 1);
      }
    }
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // Desktop navigation buttons (only shown on desktop)
  const handlePrevImage = () => {
    if (!product?.image_gallery?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => prev === 0 ? product.image_gallery.length - 1 : prev - 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleNextImage = () => {
    if (!product?.image_gallery?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => prev === product.image_gallery.length - 1 ? 0 : prev + 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `Check out this product: ${product.name} for ${formatKenyanPrice(product.price)} on ComradeMarket!`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        setShowShareOptions(true);
      }
    } else {
      setShowShareOptions(true);
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setShowShareOptions(false), 2000);
    }
  };

  const handleReportProduct = async () => {
    if (!user) {
      toast.error('Please login to report');
      return;
    }
    
    // Navigate to report page
    navigate(`/student/report-product/${product.id}`, { 
      state: { 
        productName: product.name,
        productId: product.id
      } 
    });
  };

  const handleSendMessage = async () => {
    if (!user?.id) {
      toast.error("Login to send message");
      return;
    }
    if (!message.trim()) {
      toast.error("Message is empty");
      return;
    }
    if (!storeId) {
      toast.error("Seller information not available");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("store_messages").insert([{
      store_id: storeId,
      product_id: product.id,
      user_id: user.id,
      sender_role: "buyer",
      content: message.trim(),
      status: "sent",
    }]);
    setSending(false);
    if (error) {
      toast.error("Message failed to send");
    } else {
      toast.success("Message sent!");
      setMessage("");
      navigate("/messages");
    }
  };

  const handleRateProduct = async () => {
    if (!user?.id) {
      toast.error("Login to rate");
      return;
    }
    if (hasRated || selectedRating === 0) {
      toast.error("Already rated or select stars");
      return;
    }
    const { error } = await supabase.from("ratings").insert([{
      user_id: user.id,
      product_id: product.id,
      rating: selectedRating,
    }]);
    if (error) {
      toast.error("Rating failed");
    } else {
      setHasRated(true);
      toast.success("Thanks for rating!");
      // Refresh to update average rating
      loadProductData();
    }
  };

  const handleAddToCart = async () => {
    if (!user?.id) {
      toast.error("Login to add to cart");
      return;
    }
    setIsProcessing(true);
    const { error } = await supabase.from("cart_items").insert([{
      user_id: user.id,
      product_id: product.id,
      quantity: 1,
    }]);
    setIsProcessing(false);
    if (error) {
      toast.error(error.code === '23505' ? "Already in cart" : "Failed to add");
      return;
    }
    setIsInCart(true);
    toast.success("Added to cart!");
  };

  const handleAddToWishlist = async () => {
    if (!user?.id) {
      toast.error("Login to wishlist");
      return;
    }
    setIsProcessing(true);
    const { error } = await supabase.from("wishlist_items").insert([{ user_id: user.id, product_id: product.id }]);
    setIsProcessing(false);
    if (error) {
      toast.error(error.code === '23505' ? "Already in wishlist" : "Failed to add");
      return;
    }
    setIsInWishlist(true);
    toast.success("Added to wishlist!");
  };

  const handleCheckout = () => {
    if (!user?.id) {
      toast.error("Login to checkout");
      return;
    }
    navigate(`/checkout/${product.id}`, { state: { productId: product.id, variant: selectedVariant, seller, storeId } });
  };

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔍</div>
          <h2>Product Not Found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/student/marketplace')} className={styles.errorBtn}>
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Calculate stock percentage and determine color
  const stockPercent = product.initial_stock && product.initial_stock > 0
    ? Math.min(100, Math.max(0, (Number(product.stock_quantity || 0) / Number(product.initial_stock)) * 100))
    : 0;
  
  const getStockBarColor = () => {
    if (stockPercent <= 10) return "#EF4444"; // Red for low stock
    if (stockPercent <= 30) return "#F59E0B"; // Orange for medium low
    return "#10B981"; // Green for good stock
  };

  const hasDiscount = product.discount > 0;
  const discountedPrice = hasDiscount ? product.price * (1 - product.discount / 100) : product.price;
  const originalPriceDisplay = hasDiscount ? formatKenyanPrice(product.price) : null;
  const currentPriceDisplay = hasDiscount ? formatKenyanPrice(discountedPrice) : formatKenyanPrice(product.price);

  const dm = product.delivery_methods || {};
  const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true);
  const offersDoor = dm && (dm.door === "Yes" || dm.door === true);
  const pickupInfoText = typeof dm.pickup === "string" && !["Yes", "No"].includes(dm.pickup) ? dm.pickup : "Pickup available at seller's location.";
  const doorInfoText = typeof dm.door === "string" && !["Yes", "No"].includes(dm.door) ? dm.door : "Door delivery available. Cost calculated at checkout.";

  // Safely get variant options array
  const variantOptions = Array.isArray(product.variant_options) ? product.variant_options : [];

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header - No Back Button */}
      <header className={styles.header}>
        <div className={styles.headerLeft}></div>
        <h1>Product Details</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={handleShare}>
            <FaShare />
          </button>
          <button className={styles.iconBtn} onClick={handleReportProduct} disabled={reporting}>
            <FaFlag />
          </button>
        </div>
      </header>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div className={styles.shareModal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareOptions(false)}>
            <motion.div className={styles.shareContent} initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()}>
              <h3>Share via</h3>
              <div className={styles.shareOptions}>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>WhatsApp</button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>Twitter</button>
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>Facebook</button>
                <button onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy Link</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Carousel */}
      <div className={styles.imageCarouselSection}>
        <div 
          className={styles.imageCarousel} 
          onTouchStart={handleTouchStart} 
          onTouchMove={handleTouchMove} 
          onTouchEnd={handleTouchEnd}
        >
          <img src={product.image_gallery?.[currentImageIndex] || product.image_url} alt={product.name} className={styles.carouselImage} />
          {product.image_gallery?.length > 1 && (
            <>
              {/* Desktop navigation buttons - only visible on desktop */}
              {!isMobile && (
                <>
                  <button className={styles.carouselNavPrev} onClick={handlePrevImage}><FaChevronLeft /></button>
                  <button className={styles.carouselNavNext} onClick={handleNextImage}><FaChevronRight /></button>
                </>
              )}
              <div className={styles.carouselDots}>
                {product.image_gallery.map((_, idx) => (
                  <button key={idx} className={`${styles.dot} ${idx === currentImageIndex ? styles.active : ''}`} onClick={() => { setCurrentImageIndex(idx); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000); }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product Content */}
      <div className={styles.content}>
        <div className={styles.productHeader}>
          <h1 className={styles.productTitle}>{product.name}</h1>
          <div className={styles.productPriceContainer}>
            {hasDiscount ? (
              <>
                <span className={styles.discountPrice}>{currentPriceDisplay}</span>
                <span className={styles.originalPrice}>{originalPriceDisplay}</span>
                <span className={styles.discountBadge}>-{product.discount}%</span>
              </>
            ) : (
              <span className={styles.regularPrice}>{currentPriceDisplay}</span>
            )}
          </div>
          <div className={styles.productRating}>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <FaStar key={n} className={n <= (selectedRating || averageRating) ? styles.starFilled : styles.starEmpty} onClick={() => !hasRated && setSelectedRating(n)} style={{ cursor: !hasRated ? 'pointer' : 'default' }} />
              ))}
            </div>
            <span className={styles.ratingCount}>({totalRatings || product.review_count || 0} reviews)</span>
            {!hasRated && selectedRating > 0 && <button onClick={handleRateProduct} className={styles.rateButton}>Submit Rating</button>}
          </div>
        </div>

        {/* Info Buttons */}
        <div className={styles.infoButtons}>
          {offersPickup && <button className={`${styles.infoBtn} ${activeInfoButton === "pickup" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "pickup" ? null : "pickup")}><FaMapMarkerAlt /><span>Pickup</span></button>}
          {offersDoor && <button className={`${styles.infoBtn} ${activeInfoButton === "delivery" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "delivery" ? null : "delivery")}><FaTruck /><span>Delivery</span></button>}
          {product.warranty && <button className={`${styles.infoBtn} ${activeInfoButton === "warranty" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "warranty" ? null : "warranty")}><FaShieldAlt /><span>Warranty</span></button>}
          {product.return_policy && <button className={`${styles.infoBtn} ${activeInfoButton === "return" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "return" ? null : "return")}><FaUndo /><span>Returns</span></button>}
        </div>

        {/* Info Panels */}
        <AnimatePresence>
          {activeInfoButton === "pickup" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaMapMarkerAlt /> Pickup Information</h4><p>{pickupInfoText}</p>{seller?.location && <p className={styles.infoDetail}><strong>Location:</strong> {seller.location}</p>}</motion.div>}
          {activeInfoButton === "delivery" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaTruck /> Delivery Information</h4><p>{doorInfoText}</p>{dm.fee && <p className={styles.deliveryFee}>Typical fee: {dm.fee}</p>}</motion.div>}
          {activeInfoButton === "warranty" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaShieldAlt /> Warranty Details</h4><p>{product.warranty}</p></motion.div>}
          {activeInfoButton === "return" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaUndo /> Return Policy</h4><p>{product.return_policy}</p></motion.div>}
        </AnimatePresence>

        {/* Variants - Fixed with safe array check */}
        {variantOptions.length > 0 && (
          <div className={styles.variantsSection}>
            <h4>Select Variant:</h4>
            <div className={styles.variantOptions}>
              {variantOptions.map((variant, idx) => (
                <button key={idx} className={`${styles.variantBtn} ${selectedVariant === variant ? styles.selected : ''}`} onClick={() => setSelectedVariant(variant)}>
                  {variant.color || variant.name || `Option ${idx + 1}`}
                  {variant.price && <span className={styles.variantPrice}>+{formatKenyanPrice(variant.price)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stock Status - Enhanced Progress Bar with Dynamic Color */}
        <div className={styles.stockStatus}>
          <div className={styles.stockLabel}>
            <span>Stock Available</span>
            <span className={stockPercent <= 10 ? styles.lowStock : stockPercent <= 30 ? styles.mediumStock : styles.inStock}>
              {product.stock_quantity} {product.stock_quantity === 1 ? 'unit' : 'units'} left
            </span>
          </div>
          <div className={styles.stockBarContainer}>
            <div className={styles.stockBar}>
              <div 
                className={styles.stockFill} 
                style={{ 
                  width: `${stockPercent}%`,
                  background: getStockBarColor()
                }}
              />
            </div>
            <span className={styles.stockPercent}>{Math.round(stockPercent)}% remaining</span>
          </div>
        </div>

        {/* Seller Card */}
        {seller && (
          <div className={styles.sellerCard}>
            <div className={styles.sellerHeader}>
              <div className={styles.sellerAvatar}><FaUser /></div>
              <div className={styles.sellerDetails}>
                <h4>{seller.name || seller.full_name}{seller.is_verified && <span className={styles.verifiedBadge}>✓</span>}</h4>
                <div className={styles.sellerStats}>
                  <span><FaStar /> {sellerScore.avgRating}</span>
                  <span><FaStore /> {sellerScore.totalSales} sales</span>
                </div>
              </div>
            </div>
            <div className={styles.sellerContact}>
              {seller.contact_phone && <div className={styles.contactItem}><FaMobileAlt /><a href={`tel:${seller.contact_phone}`}>{seller.contact_phone}</a></div>}
              {seller.contact_email && <div className={styles.contactItem}><FaComment /><a href={`mailto:${seller.contact_email}`}>{seller.contact_email}</a></div>}
              {seller.location && <div className={styles.contactItem}><FaMapMarkerAlt /><span>{seller.location}</span></div>}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className={styles.descriptionSection}>
            <h4>Description</h4>
            <p>{product.description}</p>
          </div>
        )}

        {/* Usage Guide */}
        {product.usage_guide && (
          <div className={styles.usageGuide}>
            <h4>How to Use</h4>
            <p>{product.usage_guide}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={styles.buyBtn} onClick={handleCheckout} disabled={isProcessing}><FaShoppingCart /> Buy Now</button>
          <button className={styles.cartBtn} onClick={handleAddToCart} disabled={isInCart || isProcessing}><FaShoppingCart /> {isInCart ? "In Cart" : "Add to Cart"}</button>
          <button className={styles.wishlistBtn} onClick={handleAddToWishlist} disabled={isInWishlist || isProcessing}><FaHeart /> {isInWishlist ? "Wishlisted" : "Wishlist"}</button>
        </div>

        {/* Ask Seller */}
        <div className={styles.askSeller}>
          <h4>Ask a Question</h4>
          <div className={styles.messageComposer}>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Ask ${seller?.name || 'the seller'} about this product...`} rows={3} disabled={sending} />
            <button className={styles.sendBtn} onClick={handleSendMessage} disabled={sending || !message.trim()}>
              {sending ? <FaSpinner className={styles.spinning} /> : <FaPaperPlane />}
              <span>{sending ? "Sending..." : "Send Message"}</span>
            </button>
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className={styles.reviewsSection}>
            <h3>Customer Reviews</h3>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <strong>{review.user_name}</strong>
                  <div className={styles.reviewStars}>{[...Array(5)].map((_, i) => (<FaStar key={i} className={i < review.rating ? styles.starFilled : styles.starEmpty} />))}</div>
                </div>
                <p className={styles.reviewComment}>"{review.comment}"</p>
                <span className={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}