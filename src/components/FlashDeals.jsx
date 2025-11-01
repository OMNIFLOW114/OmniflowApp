import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { FaBolt, FaTags, FaStar } from "react-icons/fa";
import "./FlashDeals.css";

const FlashDeals = () => {
  const navigate = useNavigate();
  const [flashDeals, setFlashDeals] = useState([]);
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState("light");

  /* ---------- Theme detection (unchanged) ---------- */
  useEffect(() => {
    const detect = () =>
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

    setTheme(detect());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);

    const saved = localStorage.getItem("theme") ||
      document.documentElement.getAttribute("data-theme") ||
      (document.documentElement.classList.contains("dark") ? "dark" : "light");
    if (saved) setTheme(saved);

    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ---------- Fetch active flash sales ---------- */
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, rating, category,
          stock_quantity, image_gallery, flash_sale_ends_at,
          stores(id, is_active)
        `)
        .eq("is_flash_sale", true)
        .gt("flash_sale_ends_at", new Date().toISOString())
        .eq("visibility", "public")
        .eq("status", "active");

      if (error) return console.error(error);

      const active = data.filter((p) => p.stores?.is_active);
      const withImg = active.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0]),
        flash_price: p.price * (1 - (p.discount || 0) / 100),
      }));
      setFlashDeals(withImg);
    };
    fetch();
  }, []);

  /* ---------- Real-time clock & auto-expire ---------- */
  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setNow(n);
      setFlashDeals((prev) =>
        prev.filter((p) => new Date(p.flash_sale_ends_at) > n)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getImageUrl = (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const getTimeLeft = (end) => {
    const diff = new Date(end) - now;
    if (diff <= 0) return null;
    const h = String(Math.floor(diff / 36e5)).padStart(2, "0");
    const m = String(Math.floor((diff % 36e5) / 6e4)).padStart(2, "0");
    const s = String(Math.floor((diff % 6e4) / 1e3)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleClick = (id) => navigate(`/product/${id}`);

  /* ---------- Kenyan price formatter ---------- */
  const fmt = (num) =>
    Number(num || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  if (!flashDeals.length) return null;

  return (
    <section className={`flash-deals-section ${theme}`} data-theme={theme}>
      <header className="flash-header">
        <FaBolt className="flash-icon" />
        <h2>Flash Deals</h2>
        <p>Hurry up! Limited-time offers.</p>
      </header>

      <div className="flash-carousel">
        {flashDeals.map((p) => {
          const timeLeft = getTimeLeft(p.flash_sale_ends_at);
          if (!timeLeft) return null;

          return (
            <div key={p.id} className="flash-card" onClick={() => handleClick(p.id)}>
              <div className="flash-img-wrapper">
                <img src={p.imageUrl} alt={p.name} className="flash-img" />
                {p.discount > 0 && (
                  <span className="discount-badge">-{p.discount}%</span>
                )}
              </div>

              <div className="flash-content">
                <h3 className="flash-name">{p.name}</h3>

                <div className="flash-rating">
                  {[...Array(Math.round(p.rating || 0))].map((_, i) => (
                    <FaStar key={i} className="star-filled" />
                  ))}
                </div>

                <p className="flash-category">
                  <FaTags /> {p.category}
                </p>

                <div className="flash-pricing">
                  <span className="flash-price">KSH {fmt(p.flash_price)}</span>
                  {p.discount > 0 && (
                    <span className="original-price">KSH {fmt(p.price)}</span>
                  )}
                </div>

                <div className="flash-meta">
                  <span className="flash-stock">Stock: {p.stock_quantity}</span>
                  <span className="flash-timer">Timer {timeLeft}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FlashDeals;