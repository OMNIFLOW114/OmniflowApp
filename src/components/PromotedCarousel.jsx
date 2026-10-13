// src/components/PromotedCarousel.jsx - CONSTANT FRAME, SWAPPING IMAGE
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import "./PromotedCarousel.css";

// Cache keys
const PROMOTED_CACHE_KEYS = {
  ITEMS: "promoted_items_v5",
  CACHE_TIMESTAMP: "promoted_cache_timestamp_v5",
};

const CACHE_EXPIRY = 10 * 60 * 1000;

const loadFromCache = (key, defaultValue = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    return data;
  } catch (error) {
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error(`Error saving cache ${key}:`, error);
  }
};

// Skeleton — same constant frame
const PromotedCarouselSkeleton = () => (
  <div className="promoted-carousel-clean">
    <div className="promoted-frame promoted-skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-content">
        <div className="skeleton-title" />
        <div className="skeleton-subtitle" />
        <div className="skeleton-button" />
      </div>
    </div>
    <div className="dots-indicator">
      {[1, 2, 3].map((i) => (
        <span key={i} className="dot" />
      ))}
    </div>
  </div>
);

const PromotedCarousel = () => {
  const [items, setItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data
      .publicUrl;
  };

  // ---- Fetch ----
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const cachedItems = loadFromCache(PROMOTED_CACHE_KEYS.ITEMS, null);
        if (cachedItems && cachedItems.length > 0) {
          setItems(cachedItems);
          setLoading(false);
        }

        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("promoted_products")
          .select(
            `
            *,
            products (id, name, price, discount, flash_sale_ends_at, image_gallery)
          `
          )
          .eq("active", true)
          .or(`ends_at.is.null,ends_at.gt.${now}`)
          .order("priority", { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          const processedItems = data.map((item) => ({
            ...item,
            imageUrl: getImageUrl(item.image_url),
            productImageUrl: item.products?.image_gallery?.[0]
              ? getImageUrl(item.products.image_gallery[0])
              : null,
          }));
          setItems(processedItems);
          saveToCache(PROMOTED_CACHE_KEYS.ITEMS, processedItems);
        }
      } catch (error) {
        console.error("Error fetching promotions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  // ---- Auto-play (5s, pause on hover) ----
  useEffect(() => {
    if (items.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [items, isHovered]);

  const handleClick = (item) => {
    if (!item) return;
    if (item.link_url) {
      window.open(item.link_url, "_blank", "noopener,noreferrer");
    } else if (item.product_id) {
      navigate(`/product/${item.product_id}`);
    }
  };

  const handleImageError = (itemId) => {
    setImageErrors((prev) => ({ ...prev, [itemId]: true }));
  };

  const goToSlide = useCallback((idx) => {
    setCurrentSlide(idx);
  }, []);

  if (!loading && items.length === 0) return null;
  if (loading && items.length === 0) return <PromotedCarouselSkeleton />;

  const current = items[currentSlide];

  return (
    <div
      className="promoted-carousel-clean"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="promoted-frame" onClick={() => handleClick(current)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="promoted-slide"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            {current && !imageErrors[current.id] && (
              <img
                src={current.imageUrl || current.productImageUrl}
                alt={current.title}
                className="promoted-image"
                loading={currentSlide === 0 ? "eager" : "lazy"}
                onError={() => handleImageError(current.id)}
              />
            )}

            {current && imageErrors[current.id] && (
              <div className="fallback-image">
                <span>{current.title?.charAt(0) || "P"}</span>
              </div>
            )}

            {current && (
              <div className="promoted-content">
                <h2 className="promoted-title">{current.title}</h2>

                {current.description && (
                  <p className="promoted-description">
                    {current.description}
                  </p>
                )}

                {current.cta_text && (
                  <button
                    className="promoted-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick(current);
                    }}
                  >
                    {current.cta_text}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots — still there for manual navigation */}
      {items.length > 1 && (
        <div className="dots-indicator">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${idx === currentSlide ? "active" : ""}`}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromotedCarousel;