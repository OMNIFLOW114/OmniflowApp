import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { FaStar, FaUser, FaFire, FaCrown, FaEye, FaShoppingBag } from "react-icons/fa";
import "./FeaturedHighlights.css";

const FeaturedHighlights = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");

  // Detect theme
  useEffect(() => {
    const detectTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      
      const htmlTheme = document.documentElement.getAttribute('data-theme');
      if (htmlTheme) return htmlTheme;
      
      const htmlClass = document.documentElement.className;
      if (htmlClass.includes('dark')) return 'dark';
      if (htmlClass.includes('light')) return 'light';
      
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      
      return 'light';
    };

    setTheme(detectTheme());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  const getImageUrl = (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, 
            name, 
            price, 
            discount, 
            stock_quantity,
            image_gallery, 
            is_featured, 
            is_rare_drop,
            views, 
            orders,
            created_at,
            sold_count,
            stores(id, name, is_active, is_verified)
          `)
          .eq("is_featured", true)
          .eq("visibility", "public")
          .eq("status", "active")
          .eq("stores.is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) throw error;

        const validProducts = (data || []).filter(p => p.stores?.is_active);

        const productsWithRatings = await Promise.all(
          validProducts.map(async (p) => {
            try {
              const { data: ratingsData } = await supabase
                .from("ratings")
                .select("rating")
                .eq("product_id", p.id);

              const ratings = ratingsData || [];
              const ratingCount = ratings.length;
              const avgRating = ratingCount > 0 
                ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount
                : 0;

              return {
                ...p,
                avg_rating: parseFloat(avgRating.toFixed(1)),
                rating_count: ratingCount,
                imageUrl: getImageUrl(p.image_gallery?.[0]),
                hasDiscount: parseFloat(p.discount || 0) > 0,
                discountedPrice: parseFloat(p.discount || 0) > 0 
                  ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
                  : parseFloat(p.price),
                sold_count: p.sold_count || p.orders || 0
              };
            } catch (ratingError) {
              console.error("Error fetching ratings for product:", p.id, ratingError);
              return {
                ...p,
                avg_rating: 0,
                rating_count: 0,
                imageUrl: getImageUrl(p.image_gallery?.[0]),
                hasDiscount: parseFloat(p.discount || 0) > 0,
                discountedPrice: parseFloat(p.discount || 0) > 0 
                  ? parseFloat(p.price) * (1 - parseFloat(p.discount) / 100)
                  : parseFloat(p.price),
                sold_count: p.sold_count || p.orders || 0
              };
            }
          })
        );

        setProducts(productsWithRatings);
      } catch (error) {
        console.error("Error fetching featured products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const handleClick = (id) => {
    navigate(`/product/${id}`);
  };

  if (loading) {
    return (
      <section className="featured-highlights loading">
        <div className="featured-section-header">
          <h2 className="featured-section-title">
            <FaCrown className="featured-section-icon" /> Featured Products
          </h2>
          <p className="featured-section-subtitle">Handpicked quality products from verified sellers</p>
        </div>
        <div className="featured-carousel">
          {[...Array(6)].map((_, index) => (
            <div className="featured-card-skeleton" key={index}>
              <div className="featured-image-skeleton"></div>
              <div className="featured-card-info">
                <div className="featured-product-meta">
                  <div className="featured-category-tag"></div>
                  <div className="featured-stock-status"></div>
                </div>
                <h3 className="featured-product-name"></h3>
                <div className="featured-rating-container">
                  <div className="featured-stars"></div>
                  <span className="featured-rating-text"></span>
                </div>
                <div className="featured-price-container">
                  <div className="featured-price-main"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section 
      className="featured-highlights"
      data-theme={theme}
    >
      <div className="featured-section-header">
        <h2 className="featured-section-title">
          <FaCrown className="featured-section-icon" /> Featured Products
        </h2>
        <p className="featured-section-subtitle">Handpicked quality products from verified sellers</p>
      </div>
      
      <div className="featured-carousel">
        {products.map((product) => (
          <div 
            className="featured-card" 
            key={product.id} 
            onClick={() => handleClick(product.id)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleClick(product.id)}
          >
            <div className="featured-product-badges">
              {product.is_rare_drop && (
                <span className="featured-badge featured-badge-rare">
                  <FaCrown size={8} /> Rare
                </span>
              )}
              {product.hasDiscount && (
                <span className="featured-badge featured-badge-discount">
                  -{product.discount}%
                </span>
              )}
              {product.views > 100 && (
                <span className="featured-badge featured-badge-trending">
                  <FaFire size={8} /> Trending
                </span>
              )}
            </div>

            <div className="featured-image-container">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="featured-image"
                loading="lazy"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            </div>

            <div className="featured-card-info">
              <div className="featured-product-meta">
                <div className="featured-category-tag">
                  <FaShoppingBag size={8} /> Featured
                </div>
                <div className="featured-stock-status">
                  {product.stock_quantity > 0 ? (
                    <span className="featured-in-stock">In Stock</span>
                  ) : (
                    <span className="featured-out-of-stock">Out of Stock</span>
                  )}
                </div>
              </div>

              <h3 className="featured-product-name" title={product.name}>
                {product.name.length > 40 ? product.name.substring(0, 40) + "..." : product.name}
              </h3>

              <div className="featured-rating-container">
                <div className="featured-stars">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={i < Math.round(product.avg_rating || 0) ? "featured-star-filled" : "featured-star-empty"}
                      size={10}
                    />
                  ))}
                </div>
                <span className="featured-rating-text">
                  ({product.rating_count || 0})
                </span>
              </div>

              <div className="featured-price-container">
                <div className="featured-price-main">
                  <span className="featured-current-price">
                    KSH {Number(product.discountedPrice).toLocaleString("en-KE")}
                  </span>
                  {product.hasDiscount && (
                    <span className="featured-original-price">
                      KSH {Number(product.price).toLocaleString("en-KE")}
                    </span>
                  )}
                </div>
              </div>

              <div className="featured-seller-info">
                <FaUser size={10} />
                <span className="featured-seller-name">
                  {product.stores?.name || "Verified Seller"}
                </span>
                {product.stores?.is_verified && (
                  <span className="featured-verified-badge">✓</span>
                )}
              </div>

              <div className="featured-product-stats">
                <div className="featured-stat">
                  <FaEye size={10} />
                  <span>{product.views || 0}</span>
                </div>
                {product.sold_count > 0 && (
                  <div className="featured-stat">
                    <FaShoppingBag size={10} />
                    <span>{product.sold_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedHighlights;