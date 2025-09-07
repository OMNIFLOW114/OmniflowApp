// components/FeaturedHighlights.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { FaStar, FaTags, FaUser } from "react-icons/fa";
import "./FeaturedHighlights.css";

const FeaturedHighlights = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  const getImageUrl = (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, discount, rating, category, stock_quantity,
          image_gallery, is_featured, stores(id, is_active)
        `)
        .eq("is_featured", true)
        .eq("visibility", "public")
        .eq("status", "active")
        .limit(6);

      if (error) {
        console.error("Error fetching featured products:", error);
        return;
      }

      const valid = data.filter((p) => p.stores?.is_active);

      const processed = valid.map((p) => ({
        ...p,
        imageUrl: getImageUrl(p.image_gallery?.[0])
      }));

      setProducts(processed);
    };

    fetchFeatured();
  }, []);

  const handleClick = (id) => {
    navigate(`/product/${id}`);
  };

  if (products.length === 0) return null;

  return (
    <div className="featured-highlights-container">
      <h2 className="section-title">🌟 Featured Highlights</h2>
      <div className="featured-grid">
        {products.map((p) => (
          <div className="featured-card" key={p.id} onClick={() => handleClick(p.id)}>
            <img
              src={p.imageUrl}
              alt={p.name}
              className="featured-image"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
            <div className="featured-info">
              <h3>{p.name}</h3>
              <div className="stars">
                {[...Array(Math.round(p.rating || 0))].map((_, i) => (
                  <FaStar key={i} className="star-filled" />
                ))}
              </div>
              <p className="category">
                <FaTags /> {p.category}
              </p>
              <div className="price-section">
                <span className="price">KSH {Number(p.price).toLocaleString()}</span>
                {p.discount > 0 && (
                  <span className="discount">-{p.discount}%</span>
                )}
              </div>
              <div className="meta">
                <span><FaUser /> Seller Hidden</span>
                <span>Stock: {p.stock_quantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedHighlights;
