// src/components/FlashDeals.jsx - RED URGENCY, CLEAN CARD, FULL IMAGE
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  memo,
} from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBolt, FaClock, FaArrowRight } from "react-icons/fa";
import "./FlashDeals.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// ------------------------------------------------------------------
// CACHE
// ------------------------------------------------------------------
const CACHE_KEY = "flash_deals_products_v5";
const CACHE_EXPIRY = 5 * 60 * 1000;

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
    console.error("FlashDeals cache save failed:", err);
  }
};

// ------------------------------------------------------------------
// SKELETON
// ------------------------------------------------------------------
const FlashDealsSkeleton = () => (
  <section className="flash-deals-v2 flash-skeleton">
    <div className="flash-header">
      <div className="flash-header-left">
        <div className="sk-icon" />
        <div>
          <div className="sk-line sk-title" />
          <div className="sk-line sk-sub" />
        </div>
      </div>
    </div>
    <div className="flash-strip">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flash-tile-skeleton">
          <div className="sk-image" />
          <div className="sk-body">
            <div className="sk-line sk-name" />
            <div className="sk-line sk-price" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ------------------------------------------------------------------
// TIMER
// ------------------------------------------------------------------
const FlashTimer = memo(({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) return null;
      const h = Math.floor(diff / 3.6e6);
      const m = Math.floor((diff % 3.6e6) / 6e4);
      const s = Math.floor((diff % 6e4) / 1e3);
      return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    };

    setTimeLeft(tick());
    const interval = setInterval(() => {
      const next = tick();
      setTimeLeft(next);
      if (!next) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  if (!timeLeft) return null;

  return (
    <span className="flash-timer">
      <FaClock size={9} />
      {timeLeft}
    </span>
  );
});
FlashTimer.displayName = "FlashTimer";

// ------------------------------------------------------------------
// MAIN
// ------------------------------------------------------------------
const FlashDeals = memo(({ limit = 4, showViewMore = true }) => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState(() => loadCache(CACHE_KEY, []));
  const [loading, setLoading] = useState(
    () => loadCache(CACHE_KEY, []).length === 0
  );
  const initialFetchDone = useRef(false);

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data
      .publicUrl;
  }, []);

  const fetchDeals = useCallback(async () => {
    if (initialFetchDone.current && deals.length > 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id, name, price, discount, stock_quantity,
          image_gallery, image_url, flash_sale_ends_at,
          stores!inner(id, is_active)
        `
        )
        .eq("is_flash_sale", true)
        .gt("flash_sale_ends_at", nowIso)
        .eq("visibility", "public")
        .eq("status", "active")
        .eq("stores.is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit + 3);

      if (error) throw error;

      const enriched = (data || []).map((p) => {
        const firstImg =
          (Array.isArray(p.image_gallery) && p.image_gallery[0]) ||
          p.image_url ||
          null;
        return {
          ...p,
          imageUrl: getImageUrl(firstImg),
          flash_price: Number(p.price) * (1 - (Number(p.discount) || 0) / 100),
        };
      });

      setDeals(enriched);
      saveCache(CACHE_KEY, enriched);
      initialFetchDone.current = true;
    } catch (err) {
      console.error("[FlashDeals] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [getImageUrl, limit, deals.length]);

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDeals = deals.filter(
    (p) => new Date(p.flash_sale_ends_at) > new Date()
  );
  const displayDeals = activeDeals.slice(0, limit);

  if (loading && deals.length === 0) return <FlashDealsSkeleton />;
  if (displayDeals.length === 0) return null;

  return (
    <section className="flash-deals-v2">
      <div className="flash-header">
        <div className="flash-header-left">
          <span className="flash-icon-wrap">
            <FaBolt size={12} />
          </span>
          <div>
            <h2 className="flash-title">Flash Deals</h2>
            <p className="flash-subtitle">Limited-time offers</p>
          </div>
        </div>

        {showViewMore && activeDeals.length > limit && (
          <button
            className="flash-view-more"
            onClick={() => navigate("/flash-sales")}
          >
            See all <FaArrowRight size={10} />
          </button>
        )}
      </div>

      {/* ---- Connected horizontal strip of cards ---- */}
      <div className="flash-strip">
        {displayDeals.map((product, index) => (
          <motion.div
            key={product.id}
            className="flash-tile"
            onClick={() => navigate(`/product/${product.id}`)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div className="flash-media">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="flash-image"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.target.src = "/placeholder.jpg";
                }}
              />
              {product.discount > 0 && (
                <span className="flash-discount">
                  -{Number(product.discount).toFixed(0)}%
                </span>
              )}
              <FlashTimer endTime={product.flash_sale_ends_at} />
            </div>

            <div className="flash-body">
              <h3 className="flash-name" title={product.name}>
                {product.name}
              </h3>

              {/* Old price (left, strikethrough) — New price (right, green) */}
              <div className="flash-prices">
                {product.discount > 0 && (
                  <span className="flash-price-old">
                    {formatKSH(product.price)}
                  </span>
                )}
                <span className="flash-price-current">
                  {formatKSH(product.flash_price)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
});

FlashDeals.displayName = "FlashDeals";
export default FlashDeals;