// src/pages/ProductDetail.jsx - PHASE 2 (rebuilt, cached, fast, detailed)
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  FaMinus,
  FaPlus,
  FaCheckCircle,
  FaHome,
  FaChevronRight as FaBreadcrumbSep,
} from "react-icons/fa";
import styles from "./ProductDetail.module.css";

// ================================================================
// HELPERS
// ================================================================
const formatKenyanPrice = (price) => {
  if (price === null || price === undefined) return "KSh 0";
  const n = Number(price);
  if (!Number.isFinite(n)) return "KSh 0";
  return `KSh ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatRating = (rating) => {
  if (rating === undefined || rating === null) return "0";
  const n = Number(rating);
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? Math.floor(n).toString() : n.toFixed(1);
};

const CACHE_KEY_PREFIX = "pd_cache_";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

const loadCache = (productId) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + productId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY_PREFIX + productId);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const saveCache = (productId, data) => {
  try {
    localStorage.setItem(
      CACHE_KEY_PREFIX + productId,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    /* quota errors ignored */
  }
};

// Distance helper (mirrors TradeStore)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Delivery ETA estimator — uses distance + product.delivery_estimated_days
const estimateDeliveryDate = (distanceKm, estimatedDays) => {
  const today = new Date();
  let daysToAdd = estimatedDays || 3;
  if (distanceKm !== Infinity) {
    if (distanceKm <= 5) daysToAdd = 0;        // same day
    else if (distanceKm <= 30) daysToAdd = 1;  // next day
    else if (distanceKm <= 100) daysToAdd = 2;
    else daysToAdd = Math.max(3, estimatedDays || 3);
  }
  const eta = new Date(today);
  eta.setDate(today.getDate() + daysToAdd);

  if (daysToAdd === 0) return "Today";
  if (daysToAdd === 1) return "Tomorrow";
  return eta.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// ================================================================
// STAR RATING
// ================================================================
const StarRating = ({ rating, size = 16 }) => {
  const n = Number(rating) || 0;
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  const empty = Math.max(0, 5 - full - (half ? 1 : 0));
  return (
    <div className={styles.stars} style={{ fontSize: size }}>
      {Array.from({ length: full }).map((_, i) => (
        <FaStar key={`f${i}`} className={styles.starFilled} />
      ))}
      {half && <FaStarHalfAlt className={styles.starFilled} />}
      {Array.from({ length: empty }).map((_, i) => (
        <FaStar key={`e${i}`} className={styles.starEmpty} />
      ))}
    </div>
  );
};

// ================================================================
// SKELETON (only shown on cold first visit)
// ================================================================
const ProductDetailSkeleton = ({ darkMode }) => (
  <div
    className={`${styles.container} ${
      darkMode ? styles.darkMode : styles.lightMode
    }`}
  >
    <div className={styles.skeletonHeader}>
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonActions} />
    </div>
    <div className={styles.skeletonImage} />
    <div className={styles.skeletonContent}>
      <div className={styles.skeletonTitleLarge} />
      <div className={styles.skeletonPrice} />
      <div className={styles.skeletonMeta} />
      <div className={styles.skeletonSeller} />
      <div className={styles.skeletonText} />
      <div className={styles.skeletonButtons} />
    </div>
  </div>
);

// ================================================================
// MAIN
// ================================================================
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();

  // Preload payload from TradeStore (if any)
  const preload = location.state || {};
  const preloadedProduct = preload.product || null;
  const preloadedBuyerLocation = preload.buyerLocation || null;

  // ---------- state ----------
  const [product, setProduct] = useState(preloadedProduct);
  const [seller, setSeller] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(!preloadedProduct);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [activeInfoButton, setActiveInfoButton] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
  });

  // Buyer location — prefer preloaded, else read cache that TradeStore wrote
  const [buyerLocation] = useState(() => {
    if (preloadedBuyerLocation) return preloadedBuyerLocation;
    try {
      const raw = localStorage.getItem("trade_store_buyer_location");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.data || null;
    } catch {
      return null;
    }
  });

  // Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoPlayTimer = useRef(null);

  // ---------- mobile detection ----------
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ---------- main loader (parallelized + cached) ----------
  const loadData = useCallback(async () => {
    if (!id) return;

    // 1. Try localStorage cache first
    const cached = loadCache(id);
    if (cached) {
      setProduct(cached.product);
      setSeller(cached.seller);
      setStoreId(cached.storeId);
      setAverageRating(cached.averageRating || 0);
      setTotalRatings(cached.totalRatings || 0);
      setRatingBreakdown(cached.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
      setReviews(cached.reviews || []);
      setRelatedProducts(cached.relatedProducts || []);
      setSelectedVariant((cached.product?.variants || [])[0] || null);
      setLoading(false);
      // refresh silently in background
      refreshInBackground(cached.product);
      return;
    }

    // 2. Cold load
    setLoading(true);
    setError(null);

    try {
      // ---- parallel batch 1: product + user cart/wishlist flags ----
      const productPromise = supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      const cartPromise = user?.id
        ? supabase
            .from("cart_items")
            .select("id")
            .eq("product_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null });

      const wishlistPromise = user?.id
        ? supabase
            .from("wishlist_items")
            .select("id")
            .eq("product_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null });

      const [productRes, cartRes, wishlistRes] = await Promise.all([
        productPromise,
        cartPromise,
        wishlistPromise,
      ]);

      if (productRes.error || !productRes.data) {
        setError("Product not found");
        setLoading(false);
        return;
      }

      const rawProduct = productRes.data;

      // ---- normalize ----
      const parsedVariants = parseVariants(rawProduct);

      const safeProduct = {
        ...rawProduct,
        variants: parsedVariants,
        image_gallery: Array.isArray(rawProduct.image_gallery)
          ? rawProduct.image_gallery.filter(Boolean)
          : rawProduct.image_url
          ? [rawProduct.image_url]
          : [],
        tags: Array.isArray(rawProduct.tags) ? rawProduct.tags : [],
        keywords: Array.isArray(rawProduct.keywords) ? rawProduct.keywords : [],
        delivery_methods: rawProduct.delivery_methods || {},
        brand: rawProduct.brand || null,
      };

      setProduct(safeProduct);
      setSelectedVariant(parsedVariants[0] || null);
      setIsInCart(!!cartRes?.data);
      setIsInWishlist(!!wishlistRes?.data);

      // ---- parallel batch 2: ratings + store + related ----
      const ratingsPromise = supabase
        .from("ratings")
        .select("rating")
        .eq("product_id", id);

      const storePromise = supabase
        .from("stores")
        .select("id, name, contact_email, location, is_verified, owner_id, location_lat, location_lng")
        .eq("owner_id", safeProduct.owner_id)
        .maybeSingle();

      const relatedPromise = buildRelatedQuery(safeProduct);

      const reviewsPromise = supabase
        .from("ratings")
        .select("id, rating, comment, created_at, user_id")
        .eq("product_id", id)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      const [ratingsRes, storeRes, relatedRes, reviewsRes] = await Promise.all([
        ratingsPromise,
        storePromise,
        relatedPromise,
        reviewsPromise,
      ]);

      // ---- ratings summary ----
      const ratingsData = ratingsRes.data || [];
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratingsData.forEach((r) => {
        const k = Math.round(Number(r.rating));
        if (k >= 1 && k <= 5) breakdown[k] = (breakdown[k] || 0) + 1;
      });
      const avg =
        ratingsData.length > 0
          ? ratingsData.reduce((s, r) => s + Number(r.rating), 0) / ratingsData.length
          : Number(rawProduct.rating) || 0;
      const total = ratingsData.length || Number(rawProduct.total_ratings) || 0;

      setAverageRating(avg);
      setTotalRatings(total);
      setRatingBreakdown(breakdown);

      // ---- store ----
      if (storeRes.data) {
        setSeller(storeRes.data);
        setStoreId(storeRes.data.id);
      } else {
        setSeller(null);
        setStoreId(null);
      }

      // ---- related ----
      let related = relatedRes.data || [];
      // Deduplicate + drop self
      related = related.filter((r) => r.id !== id);

      // If we got fewer than 4, widen the search (fallback)
      if (related.length < 4 && safeProduct.category) {
        const { data: fallback } = await supabase
          .from("products")
          .select(
            "id, name, price, discount, rating, image_url, image_gallery, category, stock_quantity, stores!inner(is_active)"
          )
          .neq("id", id)
          .eq("status", "active")
          .eq("visibility", "public")
          .eq("stores.is_active", true)
          .limit(12);
        if (fallback) {
          const ids = new Set(related.map((r) => r.id));
          fallback.forEach((f) => {
            if (!ids.has(f.id) && related.length < 12) {
              related.push(f);
              ids.add(f.id);
            }
          });
        }
      }

      // ✅ FIX: Trim to 12, then batch-fetch real ratings
      related = related.slice(0, 12);

      if (related.length > 0) {
        const relatedIds = related.map((r) => r.id);
        const { data: relatedRatings, error: relatedRatingsErr } = await supabase
          .from("ratings")
          .select("product_id, rating")
          .in("product_id", relatedIds);

        if (relatedRatingsErr) {
          console.error("[ProductDetail] related ratings fetch error:", relatedRatingsErr);
        } else {
          // Build map: productId → { total, count }
          const ratingsMap = new Map();
          (relatedRatings || []).forEach((r) => {
            if (!r.product_id) return;
            const num = Number(r.rating);
            if (!Number.isFinite(num) || num <= 0) return;
            if (!ratingsMap.has(r.product_id)) {
              ratingsMap.set(r.product_id, { total: 0, count: 0 });
            }
            const cur = ratingsMap.get(r.product_id);
            cur.total += num;
            cur.count += 1;
          });

          // Merge real ratings onto each related product
          related = related.map((r) => {
            const info = ratingsMap.get(r.id);
            const avg = info && info.count > 0 ? info.total / info.count : 0;
            return {
              ...r,
              rating: avg,
              rating_count: info ? info.count : 0,
            };
          });
        }
      }

      setRelatedProducts(related);

      // ---- reviews (with batched author names) ----
      const rawReviews = reviewsRes.data || [];
      let enrichedReviews = [];
      if (rawReviews.length > 0) {
        const authorIds = [...new Set(rawReviews.map((r) => r.user_id).filter(Boolean))];
        let authorsMap = new Map();
        if (authorIds.length > 0) {
          const { data: authors } = await supabase
            .from("users")
            .select("id, full_name")
            .in("id", authorIds);
          (authors || []).forEach((a) => authorsMap.set(a.id, a.full_name));
        }
        enrichedReviews = rawReviews.map((r) => ({
          ...r,
          user_name: authorsMap.get(r.user_id) || "Anonymous",
        }));
      }
      setReviews(enrichedReviews);

      // ---- save cache ----
      saveCache(id, {
        product: safeProduct,
        seller: storeRes.data || null,
        storeId: storeRes.data?.id || null,
        averageRating: avg,
        totalRatings: total,
        ratingBreakdown: breakdown,
        reviews: enrichedReviews,
        relatedProducts: related,
      });

      setLoading(false);
    } catch (err) {
      console.error("[ProductDetail] load error:", err);
      setError("Failed to load product details");
      setLoading(false);
    }
  }, [id, user?.id]);

  // Background refresh — updates cache without re-showing skeleton
  const refreshInBackground = useCallback(
    async (cachedProduct) => {
      try {
        const { data: fresh } = await supabase
          .from("products")
          .select("price, discount, stock_quantity, rating, total_ratings, updated_at")
          .eq("id", id)
          .maybeSingle();
        if (fresh && cachedProduct) {
          const merged = { ...cachedProduct, ...fresh };
          setProduct(merged);
          // Update cache silently
          const c = loadCache(id);
          if (c) {
            saveCache(id, { ...c, product: merged });
          }
        }
      } catch {
        /* silent */
      }
    },
    [id]
  );

  useEffect(() => {
    loadData();
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [loadData]);

  // ---------- image carousel auto-play ----------
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

  // ---------- helpers ----------
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
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentImageIndex((p) =>
          p === product.image_gallery.length - 1 ? 0 : p + 1
        );
      } else {
        setCurrentImageIndex((p) =>
          p === 0 ? product.image_gallery.length - 1 : p - 1
        );
      }
    }
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };
  const handlePrevImage = () => {
    if (!product?.image_gallery?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((p) =>
      p === 0 ? product.image_gallery.length - 1 : p - 1
    );
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };
  const handleNextImage = () => {
    if (!product?.image_gallery?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((p) =>
      p === product.image_gallery.length - 1 ? 0 : p + 1
    );
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // ---------- actions ----------
  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} on OmniFlow`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* fall through */
      }
    }
    setShowShareOptions(true);
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    toast.success("Link copied to clipboard!");
    setTimeout(() => setShowShareOptions(false), 2200);
  };

  const handleReportProduct = () => {
    if (!user) {
      toast.error("Please login to report");
      return;
    }
    navigate(`/student/report-product/${product.id}`, {
      state: { productName: product.name, productId: product.id },
    });
  };

  const handleSendMessage = async () => {
    if (!user?.id) return toast.error("Login to send message");
    if (!message.trim()) return toast.error("Message is empty");
    if (!storeId) return toast.error("Seller info not available");
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
    if (error) return toast.error("Message failed to send");
    toast.success("Message sent!");
    setMessage("");
    navigate("/messages");
  };

  const handleAddToCart = async () => {
    if (!user?.id) return toast.error("Login to add to cart");
    setIsProcessing(true);
    const { error } = await supabase.from("cart_items").insert([
      {
        user_id: user.id,
        product_id: product.id,
        quantity,
        variant: selectedVariant || null,
      },
    ]);
    setIsProcessing(false);
    if (error) {
      toast.error(error.code === "23505" ? "Already in cart" : "Failed to add");
      return;
    }
    setIsInCart(true);
    toast.success("Added to cart!");
  };

  const handleAddToWishlist = async () => {
    if (!user?.id) return toast.error("Login to wishlist");
    setIsProcessing(true);
    const { error } = await supabase
      .from("wishlist_items")
      .insert([{ user_id: user.id, product_id: product.id }]);
    setIsProcessing(false);
    if (error) {
      toast.error(error.code === "23505" ? "Already in wishlist" : "Failed to add");
      return;
    }
    setIsInWishlist(true);
    toast.success("Added to wishlist!");
  };

  const handleCheckout = () => {
    if (!user?.id) return toast.error("Login to checkout");
    navigate(`/checkout/${product.id}`, {
      state: {
        product,
        productId: product.id,
        variant: selectedVariant,
        quantity,
        seller,
        storeId,
      },
    });
  };

  const handleRelatedProductClick = (productId) => {
    navigate(`/product/${productId}`);
    window.scrollTo(0, 0);
  };

  // ---------- derived values ----------
  const stockPercent = useMemo(() => {
    if (!product) return 0;
    const initial = Number(product.initial_stock || 0);
    const current = Number(product.stock_quantity || 0);
    if (initial > 0) return Math.min(100, Math.max(0, (current / initial) * 100));
    // Fallback heuristic: assume healthy if >10
    return Math.min(100, current * 5);
  }, [product]);

  const stockColor = stockPercent <= 10 ? "#EF4444" : stockPercent <= 30 ? "#F59E0B" : "#10B981";

  const hasDiscount = Number(product?.discount || 0) > 0;
  const discountedPrice = hasDiscount
    ? Number(product.price) * (1 - Number(product.discount) / 100)
    : Number(product?.price || 0);
  const savings = hasDiscount ? Number(product.price) - discountedPrice : 0;

  const displayRating = formatRating(averageRating);

  const distanceKm = useMemo(() => {
    if (!buyerLocation?.lat || !seller?.location_lat || !seller?.location_lng) {
      return Infinity;
    }
    return calculateDistance(
      buyerLocation.lat,
      buyerLocation.lng,
      seller.location_lat,
      seller.location_lng
    );
  }, [buyerLocation, seller]);

  const etaString = useMemo(
    () => estimateDeliveryDate(distanceKm, product?.delivery_estimated_days),
    [distanceKm, product?.delivery_estimated_days]
  );

  const dm = product?.delivery_methods || {};
  const offersPickup = dm.pickup === "Yes" || dm.pickup === true;
  const offersDoor = dm.door === "Yes" || dm.door === true;
  const pickupInfoText =
    typeof dm.pickup === "string" && !["Yes", "No"].includes(dm.pickup)
      ? dm.pickup
      : "Pickup available at seller's location.";
  const doorInfoText =
    typeof dm.door === "string" && !["Yes", "No"].includes(dm.door)
      ? dm.door
      : "Door delivery available. Cost calculated at checkout.";

  const variantOptions = product?.variants && Array.isArray(product.variants) ? product.variants : [];

  // Key specs bullets — auto-generated from product fields
  const specs = useMemo(() => {
    if (!product) return [];
    const s = [];
    if (product.brand) s.push({ label: "Brand", value: product.brand });
    if (product.category) s.push({ label: "Category", value: product.category.trim() });
    if (product.warranty) s.push({ label: "Warranty", value: product.warranty });
    if (product.return_policy) s.push({ label: "Returns", value: product.return_policy });
    if (product.delivery_estimated_days)
      s.push({ label: "Delivery", value: `${product.delivery_estimated_days} day(s)` });
    if (product.weight_class) s.push({ label: "Weight", value: product.weight_class });
    if (product.stock_quantity > 0) s.push({ label: "In stock", value: `${product.stock_quantity} units` });
    return s.slice(0, 6);
  }, [product]);

  const totalReviews = useMemo(
    () => Object.values(ratingBreakdown).reduce((s, n) => s + n, 0),
    [ratingBreakdown]
  );

  // ---------- early returns ----------
  if (loading) return <ProductDetailSkeleton darkMode={darkMode} />;
  if (error || !product) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔍</div>
          <h2>Product Not Found</h2>
          <p>{error || "The product you're looking for doesn't exist."}</p>
          <button onClick={() => navigate("/")} className={styles.errorBtn}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* ============ HEADER ============ */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <FaChevronLeft />
        </button>
        <h1 className={styles.headerTitle}>Product Details</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={handleShare} aria-label="Share">
            <FaShare />
          </button>
          <button className={styles.iconBtn} onClick={handleReportProduct} aria-label="Report">
            <FaFlag />
          </button>
        </div>
      </header>

      {/* ============ BREADCRUMB ============ */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <button onClick={() => navigate("/")} className={styles.breadcrumbLink}>
          <FaHome size={11} /> Home
        </button>
        {product.category && (
          <>
            <FaBreadcrumbSep size={8} className={styles.breadcrumbSep} />
            <span className={styles.breadcrumbCurrent}>
              {product.category.trim()}
            </span>
          </>
        )}
        <FaBreadcrumbSep size={8} className={styles.breadcrumbSep} />
        <span className={styles.breadcrumbCurrent} title={product.name}>
          {product.name.length > 24 ? product.name.slice(0, 24) + "…" : product.name}
        </span>
      </nav>

      {/* ============ SHARE MODAL ============ */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div
            className={styles.shareModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareOptions(false)}
          >
            <motion.div
              className={styles.shareContent}
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Share via</h3>
              <div className={styles.shareOptions}>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>WhatsApp</button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>Twitter</button>
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>Facebook</button>
                <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast.success("Copied!"))}>Copy Link</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ IMAGE CAROUSEL + THUMBNAILS ============ */}
      <div className={styles.imageCarouselSection}>
        <div
          className={styles.imageCarousel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={product.image_gallery?.[currentImageIndex] || product.image_url || "/placeholder.jpg"}
            alt={product.name}
            className={styles.carouselImage}
            onError={(e) => (e.target.src = "/placeholder.jpg")}
          />
          {product.image_gallery?.length > 1 && (
            <>
              {!isMobile && (
                <>
                  <button className={styles.carouselNavPrev} onClick={handlePrevImage} aria-label="Previous">
                    <FaChevronLeft />
                  </button>
                  <button className={styles.carouselNavNext} onClick={handleNextImage} aria-label="Next">
                    <FaChevronRight />
                  </button>
                </>
              )}
              <div className={styles.carouselCounter}>
                {currentImageIndex + 1} / {product.image_gallery.length}
              </div>
            </>
          )}
        </div>

        {product.image_gallery?.length > 1 && (
          <div className={styles.thumbnailStrip}>
            {product.image_gallery.map((src, idx) => (
              <button
                key={idx}
                className={`${styles.thumb} ${idx === currentImageIndex ? styles.thumbActive : ""}`}
                onClick={() => {
                  setCurrentImageIndex(idx);
                  setIsAutoPlaying(false);
                  setTimeout(() => setIsAutoPlaying(true), 5000);
                }}
                aria-label={`Image ${idx + 1}`}
              >
                <img src={src} alt={`${product.name} ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============ CONTENT ============ */}
      <div className={styles.content}>
        {/* ---- Title + meta ---- */}
        <div className={styles.productHeader}>
          <h1 className={styles.productTitle}>{product.name}</h1>

          {product.brand && (
            <div className={styles.brandRow}>
              <span className={styles.brandLabel}>Brand:</span>
              <span className={styles.brandValue}>{product.brand}</span>
            </div>
          )}

          <div className={styles.productPriceContainer}>
            {hasDiscount ? (
              <>
                <span className={styles.discountPrice}>{formatKenyanPrice(discountedPrice)}</span>
                <span className={styles.originalPrice}>{formatKenyanPrice(product.price)}</span>
                <span className={styles.discountBadge}>-{Number(product.discount).toFixed(0)}%</span>
                {savings > 0 && (
                  <span className={styles.savingsBadge}>
                    You save {formatKenyanPrice(savings)}
                  </span>
                )}
              </>
            ) : (
              <span className={styles.regularPrice}>{formatKenyanPrice(product.price)}</span>
            )}
          </div>

          <div className={styles.productRating}>
            <StarRating rating={averageRating} />
            <span className={styles.ratingValue}>{displayRating}</span>
            <span className={styles.ratingCount}>
              ({totalRatings} {totalRatings === 1 ? "review" : "reviews"})
            </span>
            {product.sold_count > 0 && (
              <>
                <span className={styles.dotSep}>·</span>
                <span className={styles.soldCount}>{product.sold_count} sold</span>
              </>
            )}
          </div>
        </div>

        {/* ---- Key specs bullets ---- */}
        {specs.length > 0 && (
          <div className={styles.specsBox}>
            {specs.map((s, i) => (
              <div key={i} className={styles.specItem}>
                <span className={styles.specLabel}>{s.label}</span>
                <span className={styles.specValue}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ---- Delivery ETA ---- */}
        <div className={styles.deliveryEtaBox}>
          <FaTruck className={styles.etaIcon} />
          <div className={styles.etaContent}>
            <span className={styles.etaLabel}>Estimated delivery</span>
            <span className={styles.etaValue}>
              {etaString}
              {distanceKm !== Infinity && (
                <span className={styles.etaDistance}>
                  {" "}· {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)}m` : `${distanceKm.toFixed(1)}km`} away
                </span>
              )}
            </span>
          </div>
        </div>

        {/* ---- Info pills ---- */}
        <div className={styles.infoButtons}>
          {offersPickup && (
            <button
              className={`${styles.infoBtn} ${activeInfoButton === "pickup" ? styles.active : ""}`}
              onClick={() => setActiveInfoButton(activeInfoButton === "pickup" ? null : "pickup")}
            >
              <FaMapMarkerAlt /><span>Pickup</span>
            </button>
          )}
          {offersDoor && (
            <button
              className={`${styles.infoBtn} ${activeInfoButton === "delivery" ? styles.active : ""}`}
              onClick={() => setActiveInfoButton(activeInfoButton === "delivery" ? null : "delivery")}
            >
              <FaTruck /><span>Delivery</span>
            </button>
          )}
          {product.warranty && (
            <button
              className={`${styles.infoBtn} ${activeInfoButton === "warranty" ? styles.active : ""}`}
              onClick={() => setActiveInfoButton(activeInfoButton === "warranty" ? null : "warranty")}
            >
              <FaShieldAlt /><span>Warranty</span>
            </button>
          )}
          {product.return_policy && (
            <button
              className={`${styles.infoBtn} ${activeInfoButton === "return" ? styles.active : ""}`}
              onClick={() => setActiveInfoButton(activeInfoButton === "return" ? null : "return")}
            >
              <FaUndo /><span>Returns</span>
            </button>
          )}
        </div>

        <AnimatePresence>
          {activeInfoButton === "pickup" && (
            <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <h4><FaMapMarkerAlt /> Pickup Information</h4>
              <p>{pickupInfoText}</p>
              {seller?.location && (
                <p className={styles.infoDetail}><strong>Location:</strong> {seller.location}</p>
              )}
            </motion.div>
          )}
          {activeInfoButton === "delivery" && (
            <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <h4><FaTruck /> Delivery Information</h4>
              <p>{doorInfoText}</p>
              {dm.fee && <p className={styles.deliveryFee}>Typical fee: {dm.fee}</p>}
            </motion.div>
          )}
          {activeInfoButton === "warranty" && (
            <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <h4><FaShieldAlt /> Warranty Details</h4>
              <p>{product.warranty}</p>
            </motion.div>
          )}
          {activeInfoButton === "return" && (
            <motion.div className={styles.infoPanel} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <h4><FaUndo /> Return Policy</h4>
              <p>{product.return_policy}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Variants ---- */}
        {variantOptions.length > 0 && (
          <div className={styles.variantsSection}>
            <h4>Select Variant</h4>
            <div className={styles.variantOptions}>
              {variantOptions.map((v, idx) => {
                const name = v.name || v.size || v.color || v.type || v.value || `Option ${idx + 1}`;
                const isSelected = JSON.stringify(selectedVariant) === JSON.stringify(v);
                return (
                  <button
                    key={idx}
                    className={`${styles.variantBtn} ${isSelected ? styles.selected : ""}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {isSelected && <FaCheckCircle size={10} />}
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Stock bar ---- */}
        <div className={styles.stockStatus}>
          <div className={styles.stockLabel}>
            <span>Stock Available</span>
            <span style={{ color: stockColor, fontWeight: 700 }}>
              {product.stock_quantity > 0
                ? `${product.stock_quantity} ${product.stock_quantity === 1 ? "unit" : "units"} left`
                : "Out of stock"}
            </span>
          </div>
          <div className={styles.stockBarContainer}>
            <div className={styles.stockBar}>
              <div className={styles.stockFill} style={{ width: `${stockPercent}%`, background: stockColor }} />
            </div>
            <span className={styles.stockPercent}>{Math.round(stockPercent)}%</span>
          </div>
        </div>

        {/* ---- Quantity selector ---- */}
        <div className={styles.quantityRow}>
          <span className={styles.quantityLabel}>Quantity</span>
          <div className={styles.quantityControl}>
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease"
            >
              <FaMinus size={11} />
            </button>
            <span className={styles.quantityValue}>{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(product.stock_quantity || 99, q + 1))}
              disabled={quantity >= (product.stock_quantity || 99)}
              aria-label="Increase"
            >
              <FaPlus size={11} />
            </button>
          </div>
        </div>

        {/* ---- Seller card ---- */}
        {seller && (
          <div className={styles.sellerCard}>
            <div className={styles.sellerHeader}>
              <div className={styles.sellerAvatar}><FaUser /></div>
              <div className={styles.sellerDetails}>
                <h4>
                  {seller.name || "Seller"}
                  {seller.is_verified && <span className={styles.verifiedBadge}>✓</span>}
                </h4>
                <div className={styles.sellerStats}>
                  <span><FaStar /> {displayRating}</span>
                  <span><FaStore /> Trusted seller</span>
                </div>
              </div>
            </div>
            <div className={styles.sellerContact}>
              {seller.location && (
                <div className={styles.contactItem}>
                  <FaMapMarkerAlt /><span>{seller.location}</span>
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

        {/* ---- Description ---- */}
        {product.description && (
          <div className={styles.descriptionSection}>
            <h4>Description</h4>
            <p>{product.description}</p>
          </div>
        )}

        {/* ---- Usage guide ---- */}
        {product.usage_guide && (
          <div className={styles.usageGuide}>
            <h4>How to Use</h4>
            <p>{product.usage_guide}</p>
          </div>
        )}

        {/* ---- Review histogram ---- */}
        {totalReviews > 0 && (
          <div className={styles.reviewHistogram}>
            <h4>Rating Breakdown</h4>
            <div className={styles.histogramContent}>
              <div className={styles.histogramLeft}>
                <div className={styles.histogramAvg}>{displayRating}</div>
                <StarRating rating={averageRating} size={14} />
                <div className={styles.histogramTotal}>{totalReviews} reviews</div>
              </div>
              <div className={styles.histogramRight}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingBreakdown[star] || 0;
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className={styles.histogramRow}>
                      <span className={styles.histogramStar}>{star}★</span>
                      <div className={styles.histogramBar}>
                        <div className={styles.histogramFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.histogramCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---- Ask seller ---- */}
        <div className={styles.askSeller}>
          <h4>Ask a Question</h4>
          <div className={styles.messageComposer}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask ${seller?.name || "the seller"} about this product...`}
              rows={3}
              disabled={sending}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
            >
              {sending ? <FaSpinner className={styles.spinning} /> : <FaPaperPlane />}
              <span>{sending ? "Sending..." : "Send Message"}</span>
            </button>
          </div>
        </div>

        {/* ---- Related products (grid, 2-col) ---- */}
        {relatedProducts.length > 0 && (
          <div className={styles.relatedProductsSection}>
            <h3>You may also like</h3>
            <div className={styles.relatedProductsGrid}>
              {relatedProducts.map((r) => {
                const rDiscount = Number(r.discount || 0);
                const rFinalPrice = rDiscount > 0
                  ? Number(r.price) * (1 - rDiscount / 100)
                  : Number(r.price);
                const rImage =
                  (Array.isArray(r.image_gallery) && r.image_gallery[0]) ||
                  r.image_url ||
                  "/placeholder.jpg";
                return (
                  <div
                    key={r.id}
                    className={styles.relatedCard}
                    onClick={() => handleRelatedProductClick(r.id)}
                  >
                    <div className={styles.relatedImageContainer}>
                      <img src={rImage} alt={r.name} className={styles.relatedImage} loading="lazy" />
                      {rDiscount > 0 && (
                        <span className={styles.relatedDiscount}>-{rDiscount.toFixed(0)}%</span>
                      )}
                    </div>
                    <div className={styles.relatedInfo}>
                      <h4 className={styles.relatedName} title={r.name}>{r.name}</h4>
                      <div className={styles.relatedPrices}>
                        <span className={styles.relatedCurrentPrice}>{formatKenyanPrice(rFinalPrice)}</span>
                        {rDiscount > 0 && (
                          <span className={styles.relatedOriginalPrice}>{formatKenyanPrice(r.price)}</span>
                        )}
                      </div>
                      <div className={styles.relatedRating}>
                        <StarRating rating={Number(r.rating || 0)} size={11} />
                        <span>{formatRating(Number(r.rating || 0))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Reviews ---- */}
        {reviews.length > 0 && (
          <div className={styles.reviewsSection}>
            <h3>Customer Reviews</h3>
            {reviews.map((r) => (
              <div key={r.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <strong>{r.user_name}</strong>
                  <StarRating rating={r.rating} size={13} />
                </div>
                <p className={styles.reviewComment}>"{r.comment}"</p>
                <span className={styles.reviewDate}>
                  {new Date(r.created_at).toLocaleDateString("en-KE", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer so sticky bar doesn't cover content on mobile */}
        <div className={styles.stickySpacer} />
      </div>

      {/* ============ STICKY MOBILE BOTTOM BAR ============ */}
      <div className={styles.stickyBar}>
        <button className={styles.stickyCartBtn} onClick={handleAddToCart} disabled={isInCart || isProcessing}>
          <FaShoppingCart size={16} />
          <span>{isInCart ? "In Cart" : "Add to Cart"}</span>
        </button>
        <button className={styles.stickyBuyBtn} onClick={handleCheckout} disabled={isProcessing}>
          Buy Now
        </button>
      </div>
    </div>
  );
}

// ================================================================
// OUTSIDE-COMPONENT HELPERS
// ================================================================

// Parse the free-text `variants` field into an array of {name} objects
function parseVariants(product) {
  if (!product) return [];
  let parsed = [];

  // Try `variants` first
  if (product.variants) {
    try {
      if (typeof product.variants === "string") {
        const trimmed = product.variants.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          parsed = JSON.parse(trimmed);
        } else {
          // CSV fallback
          parsed = trimmed.split(",").map((v) => ({ name: v.trim() })).filter((v) => v.name);
        }
      } else if (Array.isArray(product.variants)) {
        parsed = product.variants;
      }
    } catch {
      if (typeof product.variants === "string" && product.variants.trim()) {
        parsed = [{ name: product.variants.trim() }];
      }
    }
  }

  // Fall back to `variant_options` jsonb
  if (parsed.length === 0 && product.variant_options) {
    try {
      if (Array.isArray(product.variant_options)) parsed = product.variant_options;
      else if (typeof product.variant_options === "string") parsed = JSON.parse(product.variant_options);
      else if (typeof product.variant_options === "object") parsed = Object.values(product.variant_options);
    } catch {
      /* silent */
    }
  }

  // Normalize items to have `name`
  return parsed.map((v, i) => ({
    ...v,
    name: v.name || v.size || v.color || v.type || v.value || `Option ${i + 1}`,
  }));
}

// Build related products query — matches on category (case-insensitive), then tags
function buildRelatedQuery(product) {
  const category = (product.category || "").trim();

  let query = supabase
    .from("products")
    .select(
      "id, name, price, discount, rating, image_url, image_gallery, category, stock_quantity, stores!inner(is_active)"
    )
    .neq("id", product.id)
    .eq("status", "active")
    .eq("visibility", "public")
    .eq("stores.is_active", true);

  if (category) {
    // ilike on trimmed category — matches "Fashion" / "fashion" / "Fashion " etc.
    query = query.ilike("category", category);
  } else if (product.tags && product.tags.length > 0) {
    // Fall back to tag overlap if no category
    query = query.overlaps("tags", product.tags);
  } else {
    // No category, no tags → return trending
    query = query.order("trending_score", { ascending: false });
  }

  return query.limit(12);
}