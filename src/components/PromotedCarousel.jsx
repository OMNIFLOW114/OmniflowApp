import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import Slider from "react-slick";
import { ChevronLeft, ChevronRight, Zap, Clock, Shield, Truck, Star, Flame, Sparkles } from 'lucide-react';
import "./PromotedCarousel.css";

const PromotedCarousel = () => {
  const [items, setItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("promoted_products")
          .select(`
            *,
            products (
              price,
              discount,
              flash_sale_ends_at
            )
          `)
          .eq("active", true)
          .or(`ends_at.is.null,ends_at.gt.${now}`)
          .order("priority", { ascending: false });

        if (!error && data) setItems(data);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      }
    };

    fetchPromotions();
  }, []);

  // Real-time countdown timer
  useEffect(() => {
    const updateTimers = () => {
      const newTimeLeft = {};
      items.forEach(item => {
        if (item.products?.flash_sale_ends_at) {
          const end = new Date(item.products.flash_sale_ends_at).getTime();
          const now = Date.now();
          const diff = Math.max(0, end - now);
          
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            newTimeLeft[item.id] = { hours, minutes, seconds };
          }
        }
      });
      setTimeLeft(newTimeLeft);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [items]);

  // Auto-play with pause on hover
  useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    
    const interval = setInterval(() => {
      const next = (currentSlide + 1) % items.length;
      setCurrentSlide(next);
      sliderRef.current?.slickGoTo(next);
    }, 6000);

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

  const getBadge = (item) => {
    // Flash Sale - Red icon, no background
    if (item.products?.flash_sale_ends_at) {
      return {
        type: 'flash',
        icon: <Zap size={20} />,
        color: '#ff0000' // Bright red
      };
    }
    // Mega Deal
    if (item.priority >= 100) {
      return {
        type: 'mega',
        icon: <Sparkles size={20} />,
        color: '#7d3cff' // Purple
      };
    }
    // Hot Deal
    if (item.priority >= 80) {
      return {
        type: 'hot',
        icon: <Flame size={20} />,
        color: '#ff6b6b' // Orange-red
      };
    }
    // Discount
    if (item.products?.discount >= 30) {
      return {
        type: 'discount',
        icon: <Zap size={20} />,
        color: '#00c48c' // Green
      };
    }
    return null;
  };

  const settings = {
    ref: sliderRef,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    autoplay: false,
    arrows: false,
    dots: false,
    speed: 800,
    cssEase: "cubic-bezier(0.25, 0.1, 0.15, 1)",
    beforeChange: (_, next) => setCurrentSlide(next),
    pauseOnHover: true
  };

  return (
    <div className="nexus-carousel">
      <div className="carousel-header">
        <h2 className="section-title">Today's Top Picks</h2>
        <div className="slide-indicator">
          <span className="current">{String(currentSlide + 1).padStart(2, '0')}</span>
          <span className="separator">/</span>
          <span className="total">{String(items.length).padStart(2, '0')}</span>
        </div>
      </div>

      <div 
        className="carousel-main"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Slider {...settings} className="nexus-slider">
          {items.map((item) => {
            const product = item.products || {};
            const badge = getBadge(item);
            const timer = timeLeft[item.id];
            const hasImageError = imageErrors[item.id];

            return (
              <div key={item.id} className="nexus-slide">
                <div 
                  className="slide-container"
                  onClick={() => handleClick(item)}
                >
                  {/* Smart Image Container */}
                  <div className="smart-image-frame">
                    {!hasImageError ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="slide-image"
                        onError={() => handleImageError(item.id)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="fallback-image">
                        <span>{item.title.charAt(0)}</span>
                      </div>
                    )}

                    {/* Multi-layer gradient */}
                    <div className="gradient-base"></div>
                    <div className="gradient-overlay"></div>

                    {/* Icon Badge - No background, just colored icon */}
                    {badge && (
                      <div 
                        className="icon-badge no-bg"
                        style={{ color: badge.color }}
                      >
                        <span className="badge-icon">{badge.icon}</span>
                      </div>
                    )}

                    {/* Content Layer */}
                    <div className="content-layer">
                      <div className="content-wrapper">
                        {item.tagline && (
                          <span className="product-tag">{item.tagline}</span>
                        )}
                        
                        <h3 className="product-title">{item.title}</h3>
                        
                        {/* Price Display - Green color */}
                        {product.price && (
                          <div className="price-block">
                            {product.discount > 0 ? (
                              <>
                                <span className="current-price green-price">
                                  KSH {Math.round(product.price * (1 - product.discount/100)).toLocaleString()}
                                </span>
                                <span className="old-price">
                                  KSH {product.price.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <span className="current-price green-price">
                                KSH {product.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Flash Timer */}
                        {timer && (
                          <div className="timer-block">
                            <Clock size={14} />
                            <span className="timer-numbers">
                              {String(timer.hours).padStart(2, '0')}h {String(timer.minutes).padStart(2, '0')}m {String(timer.seconds).padStart(2, '0')}s
                            </span>
                          </div>
                        )}

                        {/* CTA Button - Red */}
                        {item.cta_text && (
                          <button className="cta-button red-button">
                            {item.cta_text}
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="trust-badges">
                      <span className="trust-badge">
                        <Shield size={10} />
                        Secure
                      </span>
                      <span className="trust-badge">
                        <Truck size={10} />
                        Fast
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button 
              className="nav-arrow prev"
              onClick={() => sliderRef.current?.slickPrev()}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className="nav-arrow next"
              onClick={() => sliderRef.current?.slickNext()}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Progress Dots */}
        {items.length > 1 && (
          <div className="progress-dots">
            {items.map((_, idx) => (
              <button
                key={idx}
                className={`progress-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSlide(idx);
                  sliderRef.current?.slickGoTo(idx);
                }}
              >
                <span className="dot-fill"></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotedCarousel;