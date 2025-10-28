import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import {
  FaSearch, FaTags, FaStar, FaBolt,
  FaFire, FaSlidersH,
  FaHeart, FaShoppingCart, FaUser
} from "react-icons/fa";

import AdvancedFilterOverlay from "@/components/AdvancedFilterOverlay";

import "./SearchPage.css";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ProductCard component
const ProductCard = ({ product, onClick, onAuthRequired }) => {
  const { user } = useAuth();
  
  const getBadge = () => {
    if (product.is_flash_sale) return <span className="badge flash"><FaBolt /> Flash</span>;
    if (product.is_trending) return <span className="badge trending"><FaFire /> Trending</span>;
    if (product.is_featured) return <span className="badge featured">Featured</span>;
    return null;
  };

  const hasDiscount = parseFloat(product.discount) > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - parseFloat(product.discount) / 100)
    : product.price;

  const averageRating = product.average_rating || 0;
  const ratingCount = product.rating_count || 0;

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (!user) {
      onAuthRequired();
      return;
    }
    toast.success("Added to wishlist!");
  };

  const handleCartClick = (e) => {
    e.stopPropagation();
    if (!user) {
      onAuthRequired();
      return;
    }
    toast.success("Added to cart!");
  };

  return (
    <motion.div 
      className="product-card" 
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="product-img-wrapper">
        <img
          src={product.imageUrl}
          alt={product.name}
          onError={(e) => { e.target.src = "/placeholder.jpg"; }}
        />
        {getBadge()}
        
        <div className="product-quick-actions">
          <motion.button 
            className="quick-action-btn wishlist-btn"
            onClick={handleWishlistClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaHeart />
          </motion.button>
          <motion.button 
            className="quick-action-btn cart-btn"
            onClick={handleCartClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaShoppingCart />
          </motion.button>
        </div>
      </div>
      
      <div className="product-card-content">
        <h3>{product.name}</h3>
        
        <div className="stars">
          {[...Array(5)].map((_, i) => (
            <FaStar key={i} className={i < Math.round(averageRating) ? "star-filled" : "star-empty"} />
          ))}
          <span className="rating-text">({averageRating.toFixed(1)})</span>
        </div>

        <div className="price-container">
          <div className="price-main-row">
            {hasDiscount && (
              <span className="price-old">
                KSH {Number(product.price).toLocaleString("en-KE")}
              </span>
            )}
            {hasDiscount && (
              <span className="discount">-{product.discount}%</span>
            )}
          </div>
          <span className="price-new">
            KSH {Number(hasDiscount ? discountedPrice : product.price).toLocaleString("en-KE")}
          </span>
        </div>

        <div className="product-info">
          <div className="info-row category-row">
            <span><FaTags /> {product.category || "Uncategorized"}</span>
          </div>
          <div className="info-row stock-row">
            <span>Stock: {product.stock_quantity}</span>
          </div>
        </div>

        <div className="seller-row">
          <FaUser /> Verified Seller
        </div>
      </div>
    </motion.div>
  );
};

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    minRating: 0,
    inStock: false,
    sortBy: "newest",
    quickFilter: "",
  });
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  const handleAuthRequired = () => {
    toast.error("Please log in to continue");
    navigate("/auth");
  };

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setSearchHistory(history);

    if (location.state?.query) {
      setQuery(location.state.query);
    }
  }, [location]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("users").select("dark_mode").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setIsDarkMode(data.dark_mode);
          document.body.setAttribute("data-theme", data.dark_mode ? "dark" : "light");
        }
      });
  }, [user]);

  const getImageUrl = (path) => {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const fetchPopularProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`id, name, description, price, discount, stock_quantity,
        category, tags, image_gallery, created_at, views,
        is_featured, is_rare_drop, is_flash_sale, is_trending,
        stores(id, is_active)`)
      .eq("visibility", "public")
      .eq("status", "active")
      .order("views", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to load popular products:", error);
      return;
    }

    const valid = data.filter((p) => p.stores?.is_active);

    const productIds = valid.map((p) => p.id);
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("product_ratings")
      .select("product_id, avg_rating, rating_count")
      .in("product_id", productIds);

    if (ratingsError) {
      console.error("Failed to load ratings:", ratingsError);
    }

    const ratingsAvgMap = new Map(ratingsData?.map((r) => [r.product_id, r.avg_rating]) || []);
    const ratingsCountMap = new Map(ratingsData?.map((r) => [r.product_id, r.rating_count]) || []);

    const withImagesAndRatings = valid.map((p) => ({
      ...p,
      imageUrl: getImageUrl(p.image_gallery?.[0]),
      average_rating: ratingsAvgMap.get(p.id) || 0,
      rating_count: ratingsCountMap.get(p.id) || 0
    }));

    setPopularProducts(withImagesAndRatings);
  };

  const fetchSearchResults = async () => {
    if (!debouncedQuery) {
      setProducts([]);
      setRelatedProducts([]);
      fetchPopularProducts();
      return;
    }

    let supabaseQuery = supabase
      .from("products")
      .select(`id, name, description, price, discount, stock_quantity,
        category, tags, image_gallery, created_at, views,
        is_featured, is_rare_drop, is_flash_sale, is_trending,
        stores(id, is_active)`)
      .eq("visibility", "public")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);

    supabaseQuery = supabaseQuery.ilike("name", `%${debouncedQuery}%`);

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
      return;
    }

    const valid = data.filter((p) => p.stores?.is_active);

    const productIds = valid.map((p) => p.id);
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("product_ratings")
      .select("product_id, avg_rating, rating_count")
      .in("product_id", productIds);

    if (ratingsError) {
      console.error("Failed to load ratings:", ratingsError);
      toast.error("Failed to load product ratings");
    }

    const ratingsAvgMap = new Map(ratingsData?.map((r) => [r.product_id, r.avg_rating]) || []);
    const ratingsCountMap = new Map(ratingsData?.map((r) => [r.product_id, r.rating_count]) || []);

    const withImagesAndRatings = valid.map((p) => ({
      ...p,
      imageUrl: getImageUrl(p.image_gallery?.[0]),
      average_rating: ratingsAvgMap.get(p.id) || 0,
      rating_count: ratingsCountMap.get(p.id) || 0
    }));

    setProducts(withImagesAndRatings);

    if (withImagesAndRatings.length === 0) {
      fetchPopularProducts();
    }
  };

  useEffect(() => {
    fetchSearchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    let result = [...products];

    if (filters.category) {
      result = result.filter((p) => p.category?.toLowerCase().trim() === filters.category.toLowerCase().trim());
    }

    if (filters.minPrice) {
      result = result.filter((p) => parseFloat(p.price) >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p) => parseFloat(p.price) <= parseFloat(filters.maxPrice));
    }

    if (filters.minRating) {
      result = result.filter((p) => p.average_rating >= filters.minRating);
    }

    if (filters.inStock) {
      result = result.filter((p) => p.stock_quantity > 0);
    }

    if (filters.quickFilter) {
      switch (filters.quickFilter) {
        case "flash":
          result = result.filter((p) => p.is_flash_sale);
          break;
        case "trending":
          result = result.filter((p) => p.is_trending || p.views > 20);
          break;
        case "featured":
          result = result.filter((p) => p.is_featured);
          break;
        case "discounted":
          result = result.filter((p) => parseFloat(p.discount || 0) > 0);
          break;
        default:
          break;
      }
    }

    switch (filters.sortBy) {
      case "price-low":
        result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case "price-high":
        result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case "rating":
        result.sort((a, b) => parseFloat(b.average_rating) - parseFloat(a.average_rating));
        break;
      case "popular":
        result.sort((a, b) => parseFloat(b.views) - parseFloat(a.views));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    setFiltered(result);
  }, [products, filters]);

  useEffect(() => {
    if (products.length > 0) {
      const fetchRelated = async () => {
        const mainCategory = products[0].category;
        if (!mainCategory) return;

        const { data, error } = await supabase
          .from("products")
          .select(`id, name, description, price, discount, stock_quantity,
            category, tags, image_gallery, created_at, views,
            is_featured, is_rare_drop, is_flash_sale, is_trending,
            stores(id, is_active)`)
          .eq("visibility", "public")
          .eq("status", "active")
          .eq("category", mainCategory)
          .not("id", "in", `(${products.map((p) => p.id).join(",")})`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Failed to load related products:", error);
          return;
        }

        const valid = data.filter((p) => p.stores?.is_active);

        const productIds = valid.map((p) => p.id);
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("product_ratings")
          .select("product_id, avg_rating, rating_count")
          .in("product_id", productIds);

        if (ratingsError) {
          console.error("Failed to load ratings:", ratingsError);
        }

        const ratingsAvgMap = new Map(ratingsData?.map((r) => [r.product_id, r.avg_rating]) || []);
        const ratingsCountMap = new Map(ratingsData?.map((r) => [r.product_id, r.rating_count]) || []);

        const withImagesAndRatings = valid.map((p) => ({
          ...p,
          imageUrl: getImageUrl(p.image_gallery?.[0]),
          average_rating: ratingsAvgMap.get(p.id) || 0,
          rating_count: ratingsCountMap.get(p.id) || 0
        }));

        setRelatedProducts(withImagesAndRatings);
      };

      fetchRelated();
    } else if (debouncedQuery && products.length === 0) {
      setRelatedProducts([]);
      fetchPopularProducts();
    }
  }, [products, debouncedQuery]);

  const handleProductClick = (productId) => {
    if (debouncedQuery && !searchHistory.includes(debouncedQuery)) {
      const newHistory = [debouncedQuery, ...searchHistory].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    }
    navigate(`/product/${productId}`);
  };

  return (
    <div className={`marketplace-wrapper ${isDarkMode ? "dark" : "light"}`}>
      <nav className="premium-navbar">
        <div className="nav-center">
          <motion.div 
            className="search-bar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <FaSearch />
            <input
              type="text"
              placeholder="Search thousands of products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </motion.div>
        </div>

        <div className="nav-right">
          <motion.button
            onClick={() => {
              if (!user) {
                handleAuthRequired();
                return;
              }
              navigate("/cart");
            }}
            className="nav-icon"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaShoppingCart size={20} />
          </motion.button>
        </div>
      </nav>

      {debouncedQuery && <h2 className="search-title">Results for "{debouncedQuery}"</h2>}

      <motion.button 
        className="glass-button" 
        onClick={() => setShowFilterOverlay(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaSlidersH style={{ marginRight: 6 }} /> Filters
      </motion.button>

      {!debouncedQuery && searchHistory.length > 0 && (
        <div className="search-history">
          <h3>Recent Searches</h3>
          <ul>
            {searchHistory.map((h, i) => (
              <li key={i} onClick={() => setQuery(h)} style={{ cursor: "pointer" }}>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!debouncedQuery && searchHistory.length === 0 && (
        <div className="no-results">
          <p>No recent searches. Start typing to search products!</p>
        </div>
      )}

      {debouncedQuery && filtered.length === 0 && (
        <div className="no-results">
          <p>No results found for "{debouncedQuery}".</p>
          {popularProducts.length > 0 && <p>Check out these popular products:</p>}
        </div>
      )}

      {filtered.length > 0 && (
        <motion.div className="product-grid" layout>
          {filtered.map((p) => (
            <ProductCard 
              key={p.id} 
              product={p} 
              onClick={() => handleProductClick(p.id)}
              onAuthRequired={handleAuthRequired}
            />
          ))}
        </motion.div>
      )}

      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h2>Related Products</h2>
          <motion.div className="product-grid" layout>
            {relatedProducts.map((p) => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onClick={() => handleProductClick(p.id)}
                onAuthRequired={handleAuthRequired}
              />
            ))}
          </motion.div>
        </div>
      )}

      {(!debouncedQuery || filtered.length === 0) && popularProducts.length > 0 && (
        <div className="related-products">
          <h2>Popular Products</h2>
          <motion.div className="product-grid" layout>
            {popularProducts.map((p) => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onClick={() => handleProductClick(p.id)}
                onAuthRequired={handleAuthRequired}
              />
            ))}
          </motion.div>
        </div>
      )}

      {showFilterOverlay && (
        <AdvancedFilterOverlay
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFilterOverlay(false)}
          productCount={filtered.length}
        />
      )}
    </div>
  );
};

export default SearchPage;