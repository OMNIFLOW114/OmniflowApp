import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { FaBolt, FaTags, FaStar } from "react-icons/fa";
import "./FlashDeals.css";

const FlashDeals = () => {
  const navigate = useNavigate();
  const [flashDeals, setFlashDeals] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchFlashDeals = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, rating, category, stock_quantity, image_gallery,
          flash_sale_ends_at, stores(id, is_active)
        `)
        .eq("is_flash_sale", true)
        .gt("flash_sale_ends_at", new Date().toISOString())
        .eq("visibility", "public")
        .eq("status", "active");

      if (error) {
        console.error("Error fetching flash deals:", error);
        return;
      }

      const active = data.filter((p) => p.stores?.is_active);
      const withImages = active.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0]),
      }));

      setFlashDeals(withImages);
    };

    fetchFlashDeals();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setFlashDeals((prev) =>
        prev.filter((p) => new Date(p.flash_sale_ends_at) > new Date())
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getImageUrl = (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const getTimeLeft = (endTime) => {
    const diff = new Date(endTime) - now;
    if (diff <= 0) return null;
    const h = String(Math.floor(diff / 1000 / 60 / 60)).padStart(2, "0");
    const m = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, "0");
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleClick = (id) => {
    navigate(`/product/${id}`);
  };

  if (flashDeals.length === 0) return null;

  return (
    <div className="flash-deals-section">
      <div className="flash-header">
        <FaBolt className="flash-icon" />
        <h2>Flash Deals</h2>
        <p>Hurry up! Limited-time offers.</p>
      </div>
      <div className="flash-grid">
        {flashDeals.map((p) => {
          const timeLeft = getTimeLeft(p.flash_sale_ends_at);
          if (!timeLeft) return null;
          return (
            <div key={p.id} className="flash-card" onClick={() => handleClick(p.id)}>
              <img
                src={p.imageUrl}
                alt={p.name}
                className="flash-img"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
              <div className="flash-content">
                <h3>{p.name}</h3>
                <div className="stars">
                  {[...Array(Math.round(p.rating || 0))].map((_, i) => (
                    <FaStar key={i} className="star-filled" />
                  ))}
                </div>
                <p className="flash-category">
                  <FaTags /> {p.category}
                </p>
                <div className="flash-pricing">
                  <span>KSH {Number(p.price).toLocaleString()}</span>
                  {p.discount > 0 && <span className="discount">-{p.discount}%</span>}
                </div>
                <div className="flash-meta">
                  <span>Stock: {p.stock_quantity}</span>
                  <span className="flash-timer">⏱ {timeLeft}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlashDeals;
