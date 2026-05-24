// src/pages/ProductDetail.jsx - FIXED RATING DISPLAY
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import {
  FaStar,
  FaStarHalfAlt,
  FaUser,
  FaHeart,
  FaShoppingCart,
  FaComment,
  FaMapMarkerAlt,
  FaTruck,
  FaUndo,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight,
  FaPaperPlane,
  FaShare,
  FaFlag,
  FaStore,
  FaSpinner,
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

// Helper function to format rating without .0 for whole numbers
const formatRating = (rating) => {
  if (rating === undefined || rating === null) return '0';
  // Check if it's a whole number (e.g., 4.0, 5.0)
  if (rating % 1 === 0) {
    return Math.floor(rating).toString();
  }
  // Show one decimal for non-whole numbers
  return rating.toFixed(1);
};

// Star Rating Component with half stars for decimal ratings
const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className={styles.stars}>
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`full-${i}`} className={styles.starFilled} />
      ))}
      {hasHalfStar && <FaStarHalfAlt className={styles.starFilled} />}
      {[...Array(emptyStars)].map((_, i) => (
        <FaStar key={`empty-${i}`} className={styles.starEmpty} />
      ))}
    </div>
  );
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
  const [relatedProducts, setRelatedProducts] = useState([]);

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
  const [reviews, setReviews] = useState([]);
  const [sellerScore, setSellerScore] = useState({ avgRating: 0, totalSales: 0 });
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  // Refs for caching
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoPlayTimer = useRef(null);
  const cachedData = useRef(null);

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
    loadProductData();
    return () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    };
  }, [id, user]);

  const loadProductData = async () => {
    // Check cache first
    if (cachedData.current && cachedData.current.productId === id) {
      setProduct(cachedData.current.product);
      setSeller(cachedData.current.seller);
      setStoreId(cachedData.current.storeId);
      setAverageRating(cachedData.current.averageRating);
      setTotalRatings(cachedData.current.totalRatings);
      setReviews(cachedData.current.reviews);
      setSellerScore(cachedData.current.sellerScore);
      setRelatedProducts(cachedData.current.relatedProducts || []);
      const safeVariants = cachedData.current.product?.variants || [];
      setSelectedVariant(safeVariants[0] || null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: p, error: pErr } = await supabase
        .from("products")
        .select(`
          *,
          variants,
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
      
      // Parse variants from the 'variants' column
      let parsedVariants = [];
      
      if (p.variants) {
        try {
          if (typeof p.variants === 'string') {
            if (p.variants.startsWith('[') || p.variants.startsWith('{')) {
              parsedVariants = JSON.parse(p.variants);
            } else {
              parsedVariants = p.variants.split(',').map(v => ({ 
                name: v.trim(),
                value: v.trim()
              }));
            }
          } else if (Array.isArray(p.variants)) {
            parsedVariants = p.variants;
          }
        } catch (e) {
          if (typeof p.variants === 'string' && p.variants.trim()) {
            parsedVariants = [{ name: p.variants, value: p.variants }];
          }
        }
      }
      
      // If no variants found, try variant_options
      if (parsedVariants.length === 0 && p.variant_options) {
        try {
          if (Array.isArray(p.variant_options)) {
            parsedVariants = p.variant_options;
          } else if (typeof p.variant_options === 'string') {
            parsedVariants = JSON.parse(p.variant_options);
          } else if (typeof p.variant_options === 'object') {
            parsedVariants = Object.values(p.variant_options);
          }
        } catch (e) {
          // Silent fail
        }
      }
      
      const safeProduct = {
        ...p,
        variants: parsedVariants,
        variant_options: Array.isArray(p.variant_options) ? p.variant_options : [],
        image_gallery: Array.isArray(p.image_gallery) ? p.image_gallery : (p.image_url ? [p.image_url] : []),
        tags: Array.isArray(p.tags) ? p.tags : [],
        delivery_methods: p.delivery_methods || {},
        keywords: Array.isArray(p.keywords) ? p.keywords : []
      };
      
      setProduct(safeProduct);
      
      if (parsedVariants.length > 0) {
        setSelectedVariant(parsedVariants[0]);
      }

      // Calculate average rating from ratings table
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("rating")
        .eq("product_id", safeProduct.id);
      
      const avgRating = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : (p.rating || 0);
      const totalRatingsCount = ratingsData?.length || p.total_ratings || 0;
      
      setAverageRating(avgRating);
      setTotalRatings(totalRatingsCount);

      // Seller info - WITHOUT contact phone number
      const { data: s, error: sErr } = await supabase
        .from("stores")
        .select("id, name, contact_email, location, is_verified, owner_id")
        .eq("owner_id", safeProduct.owner_id)
        .single();

      if (!sErr && s) {
        setSeller(s);
        setStoreId(s?.id);
        
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

      const totalSales = orders?.length || 0;
      setSellerScore({ avgRating: avgRating.toFixed(1), totalSales });

      // User-specific flags
      if (user?.id) {
        const [{ data: c }, { data: w }] = await Promise.all([
          supabase.from("cart_items").select("id").eq("product_id", safeProduct.id).eq("user_id", user.id).maybeSingle(),
          supabase.from("wishlist_items").select("id").eq("product_id", safeProduct.id).eq("user_id", user.id).maybeSingle(),
        ]);

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

      let enrichedReviews = [];
      if (rawRatings?.length) {
        enrichedReviews = await Promise.all(
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
        setReviews(enrichedReviews);
      }

      // Load related products from same category
      if (safeProduct.category) {
        const { data: related } = await supabase
          .from("products")
          .select("id, name, price, discount, rating, image_url, image_gallery")
          .eq("category", safeProduct.category)
          .neq("id", id)
          .eq("status", "active")
          .limit(10);
        
        if (related) {
          setRelatedProducts(related);
        }
      }
      
      // Cache the data
      cachedData.current = {
        productId: id,
        product: safeProduct,
        seller: s,
        storeId: s?.id,
        averageRating: avgRating,
        totalRatings: totalRatingsCount,
        reviews: enrichedReviews,
        sellerScore: { avgRating: avgRating.toFixed(1), totalSales },
        relatedProducts: relatedProducts || []
      };
      
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
      variant: selectedVariant
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
    navigate(`/checkout/${product.id}`, { 
      state: { 
        productId: product.id, 
        variant: selectedVariant, 
        seller, 
        storeId 
      } 
    });
  };

  const handleRelatedProductClick = (productId) => {
    navigate(`/product/${productId}`);
    window.scrollTo(0, 0);
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

  const stockPercent = product.initial_stock && product.initial_stock > 0
    ? Math.min(100, Math.max(0, (Number(product.stock_quantity || 0) / Number(product.initial_stock)) * 100))
    : 0;
  
  const getStockBarColor = () => {
    if (stockPercent <= 10) return "#EF4444";
    if (stockPercent <= 30) return "#F59E0B";
    return "#10B981";
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

  const variantOptions = product.variants && Array.isArray(product.variants) ? product.variants : [];

  // Format rating for display (removes .0 for whole numbers)
  const displayRating = formatRating(averageRating);

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
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
              {!isMobile && (
                <>
                  <button className={styles.carouselNavPrev} onClick={handlePrevImage}><FaChevronLeft /></button>
                  <button className={styles.carouselNavNext} onClick={handleNextImage}><FaChevronRight /></button>
                </>
              )}
              <div className={styles.carouselDots}>
                {product.image_gallery.map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`${styles.dot} ${idx === currentImageIndex ? styles.active : ''}`} 
                    onClick={() => { 
                      setCurrentImageIndex(idx); 
                      setIsAutoPlaying(false); 
                      setTimeout(() => setIsAutoPlaying(true), 5000); 
                    }} 
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
            <StarRating rating={averageRating} />
            <span className={styles.ratingCount}>({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})</span>
            <span className={styles.ratingValue}>{displayRating}</span>
          </div>
        </div>

        <div className={styles.infoButtons}>
          {offersPickup && <button className={`${styles.infoBtn} ${activeInfoButton === "pickup" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "pickup" ? null : "pickup")}><FaMapMarkerAlt /><span>Pickup</span></button>}
          {offersDoor && <button className={`${styles.infoBtn} ${activeInfoButton === "delivery" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "delivery" ? null : "delivery")}><FaTruck /><span>Delivery</span></button>}
          {product.warranty && <button className={`${styles.infoBtn} ${activeInfoButton === "warranty" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "warranty" ? null : "warranty")}><FaShieldAlt /><span>Warranty</span></button>}
          {product.return_policy && <button className={`${styles.infoBtn} ${activeInfoButton === "return" ? styles.active : ''}`} onClick={() => setActiveInfoButton(activeInfoButton === "return" ? null : "return")}><FaUndo /><span>Returns</span></button>}
        </div>

        <AnimatePresence>
          {activeInfoButton === "pickup" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaMapMarkerAlt /> Pickup Information</h4><p>{pickupInfoText}</p>{seller?.location && <p className={styles.infoDetail}><strong>Location:</strong> {seller.location}</p>}</motion.div>}
          {activeInfoButton === "delivery" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaTruck /> Delivery Information</h4><p>{doorInfoText}</p>{dm.fee && <p className={styles.deliveryFee}>Typical fee: {dm.fee}</p>}</motion.div>}
          {activeInfoButton === "warranty" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaShieldAlt /> Warranty Details</h4><p>{product.warranty}</p></motion.div>}
          {activeInfoButton === "return" && <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><h4><FaUndo /> Return Policy</h4><p>{product.return_policy}</p></motion.div>}
        </AnimatePresence>

        {variantOptions.length > 0 && (
          <div className={styles.variantsSection}>
            <h4>Select Variant:</h4>
            <div className={styles.variantOptions}>
              {variantOptions.map((variant, idx) => {
                const variantName = variant.name || variant.size || variant.color || variant.type || variant.value || `Option ${idx + 1}`;
                const variantPrice = variant.price || 0;
                const variantStock = variant.stock || variant.quantity || 0;
                
                return (
                  <button 
                    key={idx} 
                    className={`${styles.variantBtn} ${selectedVariant === variant ? styles.selected : ''}`} 
                    onClick={() => setSelectedVariant(variant)}
                  >
                    <span className={styles.variantName}>{variantName}</span>
                    {variantPrice > 0 && (
                      <span className={styles.variantPrice}>+{formatKenyanPrice(variantPrice)}</span>
                    )}
                    {variantStock > 0 && variantStock < 10 && (
                      <span className={styles.variantStockLow}>Only {variantStock} left</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

        {seller && (
          <div className={styles.sellerCard}>
            <div className={styles.sellerHeader}>
              <div className={styles.sellerAvatar}><FaUser /></div>
              <div className={styles.sellerDetails}>
                <h4>
                  {seller.name || seller.full_name}
                  {seller.is_verified && <span className={styles.verifiedBadge}>✓</span>}
                </h4>
                <div className={styles.sellerStats}>
                  <span><FaStar /> {sellerScore.avgRating}</span>
                  <span><FaStore /> {sellerScore.totalSales} sales</span>
                </div>
              </div>
            </div>
            <div className={styles.sellerContact}>
              {seller.location && (
                <div className={styles.contactItem}>
                  <FaMapMarkerAlt />
                  <span>{seller.location}</span>
                </div>
              )}
              {seller.contact_email && (
                <div className={styles.contactItem}>
                  <FaComment />
                  <a href={`mailto:${seller.contact_email}`}>{seller.contact_email}</a>
                </div>
              )}
            </div>
          </div>
        )}

        {product.description && (
          <div className={styles.descriptionSection}>
            <h4>Description</h4>
            <p>{product.description}</p>
          </div>
        )}

        {product.usage_guide && (
          <div className={styles.usageGuide}>
            <h4>How to Use</h4>
            <p>{product.usage_guide}</p>
          </div>
        )}

        <div className={styles.actionButtons}>
          <button className={styles.buyBtn} onClick={handleCheckout} disabled={isProcessing}>
            <FaShoppingCart /> Buy Now
          </button>
          <button className={styles.cartBtn} onClick={handleAddToCart} disabled={isInCart || isProcessing}>
            <FaShoppingCart /> {isInCart ? "In Cart" : "Add to Cart"}
          </button>
          <button className={styles.wishlistBtn} onClick={handleAddToWishlist} disabled={isInWishlist || isProcessing}>
            <FaHeart /> {isInWishlist ? "Wishlisted" : "Wishlist"}
          </button>
        </div>

        <div className={styles.askSeller}>
          <h4>Ask a Question</h4>
          <div className={styles.messageComposer}>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder={`Ask ${seller?.name || 'the seller'} about this product...`} 
              rows={3} 
              disabled={sending} 
            />
            <button className={styles.sendBtn} onClick={handleSendMessage} disabled={sending || !message.trim()}>
              {sending ? <FaSpinner className={styles.spinning} /> : <FaPaperPlane />}
              <span>{sending ? "Sending..." : "Send Message"}</span>
            </button>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className={styles.relatedProductsSection}>
            <h3>Related Products</h3>
            <div className={styles.relatedProductsGrid}>
              {relatedProducts.map((relatedProduct) => (
                <div 
                  key={relatedProduct.id} 
                  className={styles.relatedCard}
                  onClick={() => handleRelatedProductClick(relatedProduct.id)}
                >
                  <div className={styles.relatedImageContainer}>
                    <img 
                      src={relatedProduct.image_gallery?.[0] || relatedProduct.image_url} 
                      alt={relatedProduct.name}
                      className={styles.relatedImage}
                    />
                    {relatedProduct.discount > 0 && (
                      <span className={styles.relatedDiscount}>-{relatedProduct.discount}%</span>
                    )}
                  </div>
                  <div className={styles.relatedInfo}>
                    <h4 className={styles.relatedName}>{relatedProduct.name}</h4>
                    <div className={styles.relatedPrice}>
                      <span className={styles.relatedCurrentPrice}>
                        {formatKenyanPrice(relatedProduct.discount > 0 
                          ? relatedProduct.price * (1 - relatedProduct.discount / 100)
                          : relatedProduct.price)}
                      </span>
                    </div>
                    <div className={styles.relatedRating}>
                      <StarRating rating={relatedProduct.rating || 0} />
                      <span>{formatRating(relatedProduct.rating || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className={styles.reviewsSection}>
            <h3>Customer Reviews</h3>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <strong>{review.user_name}</strong>
                  <StarRating rating={review.rating} />
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