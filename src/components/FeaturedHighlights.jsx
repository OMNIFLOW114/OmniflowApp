// src/components/FeaturedHighlights.jsx - RATINGS, CENTERED NAME, FIT IMAGES
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  memo,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { motion } from "framer-motion";
import { FaCrown, FaArrowRight, FaStar, FaImage } from "react-icons/fa";
import "./FeaturedHighlights.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatRating = (r) => {
  const num = Number(r);
  if (!Number.isFinite(num)) return "0";
  if (num % 1 === 0) return Math.floor(num).toString();
  return num.toFixed(1);
};

const CACHE_KEY = "featured_products_v6"; // bumped due to shape change
const CACHE_EXPIRY = 10 * 60 * 1000;
const MAX_PREVIEW = 6;

const loadCache = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return fallback;
    }
    return data;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const saveCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (err) {
    console.error("Featured cache save failed:", err);
  }
};

// ---------- Small inline rating stars ----------
const MiniStars = ({ rating, count }) => {
  const numericRating = Number(rating);
  const safeRating = Number.isFinite(numericRating)
    ? Math.min(Math.max(numericRating, 0), 5)
    : 0;

  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating - fullStars >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

  const safeCount = Number(count);
  const hasCount = Number.isFinite(safeCount) && safeCount > 0;

  return (
    <div className="featured-rating-row">
      <div className="featured-stars">
        {Array.from({ length: fullStars }, (_, i) => (
          <FaStar key={`f-${i}`} className="star-filled" />
        ))}
        {hasHalfStar && <FaStar className="star-half" />}
        {Array.from({ length: emptyStars }, (_, i) => (
          <FaStar key={`e-${i}`} className="star-empty" />
        ))}
      </div>
      <span className="featured-rating-value">{formatRating(safeRating)}</span>
      {hasCount && (
        <span className="featured-rating-count">({safeCount})</span>
      )}
    </div>
  );
};

// ---------- Featured image with graceful fallback ----------
const FeaturedImage = ({ src, alt }) => {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="featured-image-fallback" aria-label={alt}>
        <FaImage />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="featured-image"
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
};

const FeaturedSkeleton = () => (
  <section className="featured-v2 featured-skeleton">
    <div className="featured-header">
      <div className="sk-icon" />
      <div className="sk-line sk-title" />
    </div>
    <div className="featured-scroll">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="featured-card-skeleton">
          <div className="sk-image" />
          <div className="sk-body">
            <div className="sk-line sk-name" />
            <div className="sk-line sk-price" />
            <div className="sk-line sk-rating" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

const FeaturedHighlights = memo(({ showViewMore = false }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState(() => loadCache(CACHE_KEY, []));
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(
    () => loadCache(CACHE_KEY, []).length === 0
  );
  const initialFetchDone = useRef(false);

  const getImageUrl = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data
      .publicUrl;
  }, []);

  const fetchFeatured = useCallback(async () => {
    if (initialFetchDone.current && products.length > 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error, count } = await supabase
        .from("products")
        .select(
          `
          id, name, price, discount, stock_quantity,
          image_gallery, image_url, is_featured, rating,
          stores!inner(id, name, is_active)
        `,
          { count: "exact" }
        )
        .eq("is_featured", true)
        .eq("visibility", "public")
        .eq("status", "active")
        .eq("stores.is_active", true)
        .order("created_at", { ascending: false })
        .limit(MAX_PREVIEW);

      if (error) throw error;

      const validProducts = data || [];
      const productIds = validProducts.map((p) => p.id);

      // ---- Fetch ratings for these products ----
      let ratingsMap = new Map();
      if (productIds.length > 0) {
        const { data: ratingsData, error: ratingsErr } = await supabase
          .from("ratings")
          .select("product_id, rating")
          .in("product_id", productIds);

        if (ratingsErr) {
          console.error("[FeaturedHighlights] ratings fetch error:", ratingsErr);
        } else {
          ratingsData?.forEach((r) => {
            if (!r.product_id) return;
            const num = Number(r.rating);
            if (!Number.isFinite(num) || num <= 0) return;
            if (!ratingsMap.has(r.product_id))
              ratingsMap.set(r.product_id, { total: 0, count: 0 });
            const cur = ratingsMap.get(r.product_id);
            cur.total += num;
            cur.count += 1;
          });
        }
      }

      const enriched = validProducts.map((p) => {
        const firstImg =
          (Array.isArray(p.image_gallery) && p.image_gallery[0]) ||
          p.image_url ||
          null;
        const hasDiscount = parseFloat(p.discount || 0) > 0;

        const ratingInfo = ratingsMap.get(p.id);
        const rawAvg = ratingInfo
          ? ratingInfo.total / ratingInfo.count
          : parseFloat(p.rating || 0) || 0;
        const avgRating = Number.isFinite(rawAvg)
          ? Math.min(Math.max(rawAvg, 0), 5)
          : 0;
        const ratingCount = ratingInfo ? ratingInfo.count : 0;

        return {
          ...p,
          imageUrl: getImageUrl(firstImg),
          hasDiscount,
          discountedPrice: hasDiscount
            ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
            : parseFloat(p.price),
          average_rating: avgRating,
          rating_count: ratingCount,
        };
      });

      setProducts(enriched);
      setTotalCount(count || enriched.length);
      saveCache(CACHE_KEY, enriched);
      initialFetchDone.current = true;
    } catch (err) {
      console.error("[FeaturedHighlights] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [getImageUrl, products.length]);

  useEffect(() => {
    fetchFeatured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && products.length === 0) return <FeaturedSkeleton />;
  if (products.length === 0 && !loading) return null;

  const shouldShowViewMore = showViewMore && totalCount > MAX_PREVIEW;

  return (
    <section className="featured-v2">
      <div className="featured-header">
        <div className="featured-title-wrap">
          <span className="featured-icon-wrap">
            <FaCrown size={11} />
          </span>
          <h2 className="featured-title">Featured</h2>
        </div>

        {shouldShowViewMore && (
          <button
            className="featured-view-more"
            onClick={() => navigate("/featured")}
          >
            View all {totalCount} <FaArrowRight size={10} />
          </button>
        )}
      </div>

      <div className="featured-scroll">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            className="featured-card"
            onClick={() => navigate(`/product/${product.id}`)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div className="featured-media">
              <FeaturedImage src={product.imageUrl} alt={product.name} />
              {product.hasDiscount && (
                <span className="featured-discount">
                  -{Number(product.discount).toFixed(0)}%
                </span>
              )}
            </div>

            <div className="featured-body">
              <h3 className="featured-name" title={product.name}>
                {product.name}
              </h3>

              <MiniStars
                rating={product.average_rating}
                count={product.rating_count}
              />

              <div className="featured-prices">
                <span className="featured-price-current">
                  {formatKSH(product.discountedPrice)}
                </span>
                {product.hasDiscount && (
                  <span className="featured-price-old">
                    {formatKSH(product.price)}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {shouldShowViewMore && (
        <button
          className="featured-view-all-bottom"
          onClick={() => navigate("/featured")}
        >
          View all {totalCount} featured products
          <FaArrowRight size={11} />
        </button>
      )}
    </section>
  );
});

FeaturedHighlights.displayName = "FeaturedHighlights";
export default FeaturedHighlights;