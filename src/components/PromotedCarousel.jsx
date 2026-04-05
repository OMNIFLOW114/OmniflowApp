// src/components/PromotedCarousel.jsx - CLEAN CLASSIC VERSION
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import "./PromotedCarousel.css";

// Cache keys
const PROMOTED_CACHE_KEYS = {
  ITEMS: 'promoted_items_v3',
  CACHE_TIMESTAMP: 'promoted_cache_timestamp_v3'
};

const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

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

// Skeleton Component
const PromotedCarouselSkeleton = () => (
  <div className="promoted-carousel-skeleton">
    <div className="skeleton-slide">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
  </div>
);

const PromotedCarousel = () => {
  const [items, setItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const navigate = useNavigate();

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        // Try to load from cache first
        const cachedItems = loadFromCache(PROMOTED_CACHE_KEYS.ITEMS, null);
        if (cachedItems && cachedItems.length > 0) {
          setItems(cachedItems);
          setLoading(false);
        }

        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("promoted_products")
          .select(`
            *,
            products (
              id, name, price, discount, flash_sale_ends_at, image_gallery
            )
          `)
          .eq("active", true)
          .or(`ends_at.is.null,ends_at.gt.${now}`)
          .order("priority", { ascending: false })
          .limit(5);

        if (!error && data && data.length > 0) {
          // Process images
          const processedItems = data.map(item => ({
            ...item,
            imageUrl: getImageUrl(item.image_url),
            productImageUrl: item.products?.image_gallery?.[0] 
              ? getImageUrl(item.products.image_gallery[0])
              : null
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

  // Auto-play with pause on hover
  useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    
    const interval = setInterval(() => {
      const next = (currentSlide + 1) % items.length;
      setCurrentSlide(next);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSlide, items, isHovered]);

  const handleClick = (item) => {
    if (item.link_url) {
      window.open(item.link_url, "_blank", "noopener,noreferrer");
    } else if (item.product_id) {
      navigate(`/product/${item.product_id}`);
    }
  };

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({ ...prev, [itemId]: true }));
  };

  const goToPrev = () => {
    const prev = (currentSlide - 1 + items.length) % items.length;
    setCurrentSlide(prev);
  };

  const goToNext = () => {
    const next = (currentSlide + 1) % items.length;
    setCurrentSlide(next);
  };

  // Don't render anything if no items and not loading
  if (!loading && items.length === 0) {
    return null;
  }

  if (loading && items.length === 0) {
    return <PromotedCarouselSkeleton />;
  }

  return (
    <div className="promoted-carousel-clean">
      <div 
        className="carousel-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="carousel-slide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {items[currentSlide] && (
              <div 
                className="slide-wrapper"
                onClick={() => handleClick(items[currentSlide])}
              >
                <div className="slide-image-container">
                  {!imageErrors[items[currentSlide].id] ? (
                    <img
                      src={items[currentSlide].imageUrl || items[currentSlide].productImageUrl}
                      alt={items[currentSlide].title}
                      className="slide-image"
                      onError={() => handleImageError(items[currentSlide].id)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="fallback-image">
                      <span>{items[currentSlide].title?.charAt(0) || 'P'}</span>
                    </div>
                  )}
                </div>

                <div className="slide-content">
                  <h2 className="slide-title">{items[currentSlide].title}</h2>
                  
                  {items[currentSlide].description && (
                    <p className="slide-description">{items[currentSlide].description}</p>
                  )}

                  {items[currentSlide].cta_text && (
                    <button className="slide-cta">
                      {items[currentSlide].cta_text}
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button className="nav-arrow prev" onClick={goToPrev}>
              <ChevronLeft size={24} />
            </button>
            <button className="nav-arrow next" onClick={goToNext}>
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {items.length > 1 && (
          <div className="dots-indicator">
            {items.map((_, idx) => (
              <button
                key={idx}
                className={`dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotedCarousel;