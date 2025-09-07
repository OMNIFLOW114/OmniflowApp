import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import Slider from "react-slick";
import "./PromotedCarousel.css";

const PromotedCarousel = () => {
  const [items, setItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPromotions = async () => {
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
    };

    fetchPromotions();
  }, []);

  useEffect(() => {
    if (items.length > 1) {
      const interval = setInterval(() => {
        const next = (currentSlide + 1) % items.length;
        setCurrentSlide(next);
        sliderRef.current?.slickGoTo(next);
      }, 5000); // every 5s

      return () => clearInterval(interval);
    }
  }, [currentSlide, items]);

  const handleClick = (item) => {
    if (item.link_url) {
      window.open(item.link_url, "_blank");
    } else if (item.product_id) {
      navigate(`/product/${item.product_id}`);
    }
  };

  const renderCountdown = (endsAt) => {
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const settings = {
    ref: sliderRef,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    autoplay: false, // handled manually
    arrows: false,
    dots: true,
    pauseOnHover: true,
    speed: 1000,
    cssEase: "ease-in-out",
    beforeChange: (_, next) => setCurrentSlide(next),
  };

  return (
    <div className="promoted-carousel-container">
      <Slider {...settings} ref={sliderRef} className="promoted-carousel-slider">
        {items.map((item) => {
          const product = item.products || {};
          const hasFlashSale = product.flash_sale_ends_at;
          const discount = product.discount || 0;

          return (
            <div
              key={item.id}
              className="promoted-slide"
              onClick={() => handleClick(item)}
              style={{ backgroundColor: item.background_color || "#111" }}
            >
              <div className="promoted-content">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="promoted-image"
                />
                {item.hover_image_url && (
                  <img
                    src={item.hover_image_url}
                    alt="hover"
                    className="hover-image"
                  />
                )}

                <div className="promoted-overlay" />

                <div className="promoted-text">
                  <h2 className="promo-title">{item.title}</h2>

                  {item.tagline && (
                    <p className="graffiti-tagline">{item.tagline}</p>
                  )}

                  {item.cta_text && (
                    <button className="promo-button">{item.cta_text}</button>
                  )}

                  {hasFlashSale && (
                    <div className="flash-countdown">
                      ⏳ {renderCountdown(product.flash_sale_ends_at)}
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="discount-badge">-{discount}%</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default PromotedCarousel;
