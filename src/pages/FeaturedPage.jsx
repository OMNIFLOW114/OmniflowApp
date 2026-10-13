// src/pages/FeaturedPage.jsx - DEDICATED FEATURED PAGE
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useDarkMode } from "@/context/DarkModeContext";
import { FaArrowLeft, FaCrown, FaStar } from "react-icons/fa";
import "./FeaturedPage.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const PAGE_SIZE = 24;

const ProductCardSkeleton = () => (
  <div className="featured-page-card featured-page-skeleton">
    <div className="sk-image" />
    <div className="sk-body">
      <div className="sk-line sk-name" />
      <div className="sk-line sk-price" />
    </div>
  </div>
);

const FeaturedPage = memo(() => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);

  const getImageUrl = useCallback((path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data
      .publicUrl;
  }, []);

  const fetchPage = useCallback(
    async (pageNum = 1, replace = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (pageNum === 1) setLoading(replace ? false : true);
      else setIsLoadingMore(true);

      try {
        const offset = (pageNum - 1) * PAGE_SIZE;

        const { data, error, count } = await supabase
          .from("products")
          .select(
            `
            id, name, price, discount, stock_quantity,
            image_gallery, image_url, created_at,
            stores!inner(id, name, is_active)
          `,
            { count: "exact" }
          )
          .eq("is_featured", true)
          .eq("visibility", "public")
          .eq("status", "active")
          .eq("stores.is_active", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;

        const enriched = (data || []).map((p) => {
          const firstImg =
            (Array.isArray(p.image_gallery) && p.image_gallery[0]) ||
            p.image_url ||
            null;
          const hasDiscount = parseFloat(p.discount || 0) > 0;
          return {
            ...p,
            imageUrl: getImageUrl(firstImg),
            hasDiscount,
            discountedPrice: hasDiscount
              ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
              : parseFloat(p.price),
          };
        });

        if (replace || pageNum === 1) {
          setProducts(enriched);
        } else {
          setProducts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            enriched.forEach((p) => {
              if (!seen.has(p.id)) merged.push(p);
            });
            return merged;
          });
        }

        setTotalCount(count || enriched.length);
        setPage(pageNum);
        setHasMore(offset + enriched.length < (count || 0));
      } catch (err) {
        console.error("[FeaturedPage] fetch error:", err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [getImageUrl]
  );

  useEffect(() => {
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        if (!entries[0].isIntersecting) return;
        if (isFetchingRef.current) return;
        if (!hasMore) return;
        fetchPage(page + 1, false);
      },
      { rootMargin: "600px 0px", threshold: 0.01 }
    );
    observer.observe(sentinel);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore]);

  return (
    <div
      className={`featured-page ${darkMode ? "dark" : "light"}`}
    >
      {/* Header */}
      <header className="featured-page-header">
        <button
          className="featured-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <FaArrowLeft size={14} />
        </button>
        <div className="featured-page-header-text">
          <h1>
            <FaCrown size={14} className="featured-page-crown" /> Featured
          </h1>
          <p>
            {loading && totalCount === 0
              ? "Loading…"
              : `${totalCount} premium picks from top sellers`}
          </p>
        </div>
        <div className="featured-page-header-spacer" />
      </header>

      {/* Grid */}
      <div className="featured-page-grid">
        {loading && products.length === 0
          ? [...Array(12)].map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((product, index) => (
              <motion.div
                key={product.id}
                className="featured-page-card"
                onClick={() => navigate(`/product/${product.id}`)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.4) }}
              >
                <div className="featured-page-media">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="featured-page-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.src = "/placeholder.jpg";
                    }}
                  />
                  {product.hasDiscount && (
                    <span className="featured-page-discount">
                      -{Number(product.discount).toFixed(0)}%
                    </span>
                  )}
                  <span className="featured-page-badge">
                    <FaCrown size={8} /> Featured
                  </span>
                </div>
                <div className="featured-page-body">
                  <h3 title={product.name}>{product.name}</h3>
                  <div className="featured-page-prices">
                    <span className="featured-page-price-current">
                      {formatKSH(product.discountedPrice)}
                    </span>
                    {product.hasDiscount && (
                      <span className="featured-page-price-old">
                        {formatKSH(product.price)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="featured-page-empty">
          <FaStar size={40} className="featured-page-empty-icon" />
          <h3>No featured products yet</h3>
          <p>Sellers are working on it. Check back soon!</p>
          <button
            className="featured-page-empty-btn"
            onClick={() => navigate("/")}
          >
            Back to Marketplace
          </button>
        </div>
      )}

      {/* Loader */}
      {isLoadingMore && (
        <div className="featured-page-loading">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* End */}
      {!hasMore && products.length > 0 && (
        <p className="featured-page-end">You've seen all featured products</p>
      )}

      <div
        ref={sentinelRef}
        style={{ height: 1, width: "100%" }}
        aria-hidden="true"
      />
    </div>
  );
});

FeaturedPage.displayName = "FeaturedPage";
export default FeaturedPage;