import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { FaStar, FaUser } from "react-icons/fa";
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
          id, name, price, discount, stock_quantity,
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

      // Fetch average ratings for each product
      const processed = await Promise.all(
        valid.map(async (p) => {
          const { data: ratingsData, error: ratingsError } = await supabase
            .from("ratings")
            .select("rating")
            .eq("product_id", p.id);

          if (ratingsError) {
            console.error(`Error fetching ratings for product ${p.id}:`, ratingsError);
          }

          const avgRating = ratingsData?.length > 0
            ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
            : 0;

          return {
            ...p,
            avg_rating: avgRating,
            imageUrl: getImageUrl(p.image_gallery?.[0])
          };
        })
      );

      setProducts(processed);
    };

    fetchFeatured();
  }, []);

  const handleClick = (id) => {
    navigate(`/product/${id}`);
  };

  if (products.length === 0) return null;

  return (
    <section className="featured-highlights-container">
      <h2 className="section-title">🌟 Featured Highlights</h2>
      <div className="featured-carousel">
        {products.map((p) => (
          <div className="featured-card" key={p.id} onClick={() => handleClick(p.id)}>
            <div className="image-container">
              <img
                src={p.imageUrl}
                alt={p.name}
                className="featured-image"
                loading="lazy"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
              {p.discount > 0 && (
                <span className="discount-badge">-{p.discount}% OFF</span>
              )}
            </div>
            <div className="featured-info">
              <h3 className="product-name">{p.name}</h3>
              <div className="rating">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={i < Math.round(p.avg_rating || 0) ? "star-filled" : "star-empty"}
                  />
                ))}
              </div>
              <div className="price-section">
                <span className="price">KSH {Number(p.price).toLocaleString()}</span>
              </div>
              <div className="meta">
                <span><FaUser className="icon" /> Seller Hidden</span>
                <span>Stock: {p.stock_quantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedHighlights;