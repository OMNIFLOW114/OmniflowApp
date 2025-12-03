import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaFire, FaRocket, FaBolt, FaCreditCard,
  FaGem, FaStar, FaShoppingBag, FaEye, FaMobileAlt,
  FaHome, FaHeadphones, FaTag, FaChevronLeft, FaChevronRight,
  FaHeart, FaShoppingCart, FaExpand, FaRegClock,
  FaRegHeart, FaRegEye, FaTruck, FaShieldAlt,
  FaGamepad, FaLaptop, FaCamera, FaTshirt, FaCar,
  FaTools, FaBook, FaBaby, FaBeer, FaUtensils,
  FaMusic, FaFutbol, FaWrench, FaSeedling
} from "react-icons/fa";
import SectionCarousel from "./SectionCarousel";
import "./HomeTabSections.css";

const sectionConfigs = [
  {
    id: "trending",
    title: "🔥 Trending Now",
    icon: <FaFire />,
    color: "#FF6B6B",
    filter: (p) => p.views > 50 || p.trending_score > 10,
    sort: (a, b) => b.trending_score - a.trending_score,
    maxItems: 12,
    badge: "TRENDING"
  },
  {
    id: "flash-sale",
    title: "⚡ Flash Sale",
    icon: <FaBolt />,
    color: "#FF416C",
    filter: (p) => p.is_flash_sale === true,
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 10,
    badge: "SALE",
    timer: true
  },
  {
    id: "new-arrivals",
    title: "🚀 New Arrivals",
    icon: <FaRocket />,
    color: "#4776E6",
    filter: (p) => {
      const daysAgo = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24);
      return daysAgo < 30;
    },
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 12,
    badge: "NEW"
  },
  {
    id: "top-rated",
    title: "⭐ Top Rated",
    icon: <FaStar />,
    color: "#FFD700",
    filter: (p) => (p.avg_rating || p.rating) >= 4,
    sort: (a, b) => (b.avg_rating || b.rating) - (a.avg_rating || a.rating),
    maxItems: 10,
    badge: "RATED"
  },
  {
    id: "best-sellers",
    title: "🏆 Best Sellers",
    icon: <FaShoppingBag />,
    color: "#FF5F6D",
    filter: (p) => (p.order_count || p.orders || p.sold_count) > 10,
    sort: (a, b) => (b.order_count || b.orders || b.sold_count) - (a.order_count || a.orders || a.sold_count),
    maxItems: 12,
    badge: "BEST"
  },
  {
    id: "lipa-polepole",
    title: "💳 Lipa Mdogo Mdogo",
    icon: <FaCreditCard />,
    color: "#00b09b",
    filter: (p) => p.lipa_polepole === true,
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 8,
    badge: "INSTALL"
  },
  {
    id: "phones",
    title: "📱 Phones & Tablets",
    icon: <FaMobileAlt />,
    color: "#2193b0",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('phone') || cat.includes('mobile') || cat.includes('tablet') ||
             tags.some(tag => tag?.toLowerCase().includes('phone') || tag?.toLowerCase().includes('mobile') || tag?.toLowerCase().includes('tablet'));
    },
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 12,
    badge: "PHONE"
  },
  {
    id: "electronics",
    title: "💻 Electronics",
    icon: <FaLaptop />,
    color: "#667eea",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('electronic') || cat.includes('computer') || cat.includes('laptop') ||
             tags.some(tag => tag?.toLowerCase().includes('electronic') || tag?.toLowerCase().includes('computer') || tag?.toLowerCase().includes('laptop'));
    },
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 12,
    badge: "TECH"
  },
  {
    id: "fashion",
    title: "👕 Fashion",
    icon: <FaTshirt />,
    color: "#DD2476",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('fashion') || cat.includes('clothing') || cat.includes('wear') ||
             tags.some(tag => tag?.toLowerCase().includes('fashion') || tag?.toLowerCase().includes('clothing'));
    },
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 12,
    badge: "FASHION"
  },
  {
    id: "home",
    title: "🏠 Home & Living",
    icon: <FaHome />,
    color: "#FF512F",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('home') || cat.includes('furniture') || cat.includes('living') ||
             tags.some(tag => tag?.toLowerCase().includes('home') || tag?.toLowerCase().includes('furniture'));
    },
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 12,
    badge: "HOME"
  },
  {
    id: "appliances",
    title: "🔌 Appliances",
    icon: <FaTools />,
    color: "#8A2387",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('appliance') || cat.includes('kitchen') ||
             tags.some(tag => tag?.toLowerCase().includes('appliance') || tag?.toLowerCase().includes('kitchen'));
    },
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 10,
    badge: "APPLIANCE"
  },
  {
    id: "gaming",
    title: "🎮 Gaming",
    icon: <FaGamepad />,
    color: "#E94057",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('gaming') || cat.includes('game') || cat.includes('console') ||
             tags.some(tag => tag?.toLowerCase().includes('gaming') || tag?.toLowerCase().includes('game'));
    },
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 10,
    badge: "GAME"
  },
  {
    id: "automotive",
    title: "🚗 Automotive",
    icon: <FaCar />,
    color: "#4A00E0",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('auto') || cat.includes('car') || cat.includes('vehicle') ||
             tags.some(tag => tag?.toLowerCase().includes('auto') || tag?.toLowerCase().includes('car'));
    },
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 10,
    badge: "AUTO"
  },
  {
    id: "beauty",
    title: "💄 Beauty",
    icon: <FaGem />,
    color: "#834d9b",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('beauty') || cat.includes('cosmetic') || cat.includes('skin') ||
             tags.some(tag => tag?.toLowerCase().includes('beauty') || tag?.toLowerCase().includes('cosmetic'));
    },
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 10,
    badge: "BEAUTY"
  },
  {
    id: "sports",
    title: "⚽ Sports",
    icon: <FaFutbol />,
    color: "#00C9FF",
    filter: (p) => {
      const cat = p.category?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return cat.includes('sport') || cat.includes('fitness') ||
             tags.some(tag => tag?.toLowerCase().includes('sport') || tag?.toLowerCase().includes('fitness'));
    },
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 10,
    badge: "SPORT"
  },
  {
    id: "high-discounts",
    title: "🎯 High Discounts",
    icon: <FaTag />,
    color: "#FF8C00",
    filter: (p) => parseFloat(p.discount || 0) >= 20,
    sort: (a, b) => parseFloat(b.discount || 0) - parseFloat(a.discount || 0),
    maxItems: 10,
    badge: "SAVE"
  },
  {
    id: "verified",
    title: "🛡️ Verified Products",
    icon: <FaShieldAlt />,
    color: "#10b981",
    filter: (p) => p.is_verified === true,
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 10,
    badge: "VERIFIED"
  },
  {
    id: "rare-drops",
    title: "💎 Rare Drops",
    icon: <FaGem />,
    color: "#F27121",
    filter: (p) => p.is_rare_drop === true,
    sort: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    maxItems: 8,
    badge: "RARE"
  }
];

// Loading Skeleton Component
const SectionSkeleton = () => (
  <div className="section-skeleton">
    <div className="section-header-skeleton">
      <div className="section-title-skeleton"></div>
      <div className="section-nav-skeleton"></div>
    </div>
    <div className="carousel-skeleton">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="product-card-skeleton">
          <div className="product-image-skeleton"></div>
          <div className="product-content-skeleton">
            <div className="product-title-skeleton"></div>
            <div className="product-price-skeleton"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Compact Product Card Component (Alibaba Style)
const ProductCard = ({ product, sectionId }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const hasDiscount = parseFloat(product.discount || 0) > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - parseFloat(product.discount) / 100)
    : product.price;

  const rating = product.avg_rating || product.rating || 0;
  const ratingCount = product.rating_count || product.total_ratings || 0;

  return (
    <motion.div
      className="compact-product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="card-image-container">
        <img
          src={product.image_gallery?.[0] || product.image_url || "/placeholder.jpg"}
          alt={product.name}
          className="card-image"
          loading="lazy"
        />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="card-discount-badge">
            -{product.discount}%
          </div>
        )}

        {/* Quick Action */}
        <AnimatePresence>
          {isHovered && (
            <motion.button
              className="quick-wishlist-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaRegHeart />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="card-content">
        <h3 className="card-title" title={product.name}>
          {product.name.length > 40 ? product.name.substring(0, 40) + "..." : product.name}
        </h3>
        
        <div className="card-rating">
          <div className="rating-stars">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                className={i < Math.floor(rating) ? "star-filled" : "star-empty"}
                size={12}
              />
            ))}
          </div>
          <span className="rating-text">({ratingCount})</span>
        </div>

        <div className="card-price-row">
          <span className="current-price">
            KSH {Number(discountedPrice).toLocaleString("en-KE")}
          </span>
          {hasDiscount && (
            <span className="original-price">
              KSH {Number(product.price).toLocaleString("en-KE")}
            </span>
          )}
        </div>

        <div className="card-extra-info">
          {product.lipa_polepole && (
            <span className="installment-tag">
              <FaCreditCard size={10} /> Lipa Polepole
            </span>
          )}
          {product.free_shipping && (
            <span className="shipping-tag">
              <FaTruck size={10} /> Free Shipping
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const HomeTabSections = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSections, setActiveSections] = useState([]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("products")
        .select(`
          *,
          product_ratings (avg_rating, rating_count)
        `)
        .eq("visibility", "public")
        .eq("status", "active")
        .not("image_gallery", "is", null)
        .order("created_at", { ascending: false })
        .limit(800);

      if (fetchError) throw fetchError;

      // Transform data
      const transformedData = data.map(product => ({
        ...product,
        avg_rating: product.product_ratings?.[0]?.avg_rating || product.rating || 0,
        rating_count: product.product_ratings?.[0]?.rating_count || product.total_ratings || 0,
        views: product.views || 0,
        order_count: product.sold_count || product.orders || 0,
        tags: Array.isArray(product.tags) ? product.tags : 
              (typeof product.tags === 'string' ? JSON.parse(product.tags) : []),
        lipa_polepole: product.lipa_polepole === true || product.lipa_polepole === 'true',
        is_flash_sale: product.is_flash_sale === true || product.is_flash_sale === 'true',
        is_featured: product.is_featured === true || product.is_featured === 'true',
        is_rare_drop: product.is_rare_drop === true || product.is_rare_drop === 'true',
        is_verified: product.is_verified === true || product.is_verified === 'true',
        free_shipping: product.free_shipping || (product.delivery_capabilities?.free_shipping === true)
      }));

      setProducts(transformedData);

      // Determine which sections have products
      const sectionsWithProducts = sectionConfigs.filter(config => {
        const filtered = transformedData.filter(config.filter);
        return filtered.length >= 4;
      });

      setActiveSections(sectionsWithProducts);

    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading) {
    return (
      <div className="home-tab-sections">
        {[...Array(8)].map((_, i) => (
          <SectionSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="error-content">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchProducts}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (activeSections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-content">
          <FaShoppingBag size={48} />
          <h3>No Products Available</h3>
          <p>Check back soon for exciting new products!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-tab-sections">
      <AnimatePresence>
        {activeSections.map((section, index) => {
          const filtered = products.filter(section.filter);
          const sorted = section.sort ? [...filtered].sort(section.sort) : filtered;
          const sectionProducts = sorted.slice(0, section.maxItems);

          if (sectionProducts.length === 0) return null;

          return (
            <motion.section
              key={section.id}
              className="section-modern"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="section-header-modern">
                <div className="section-title-modern">
                  <div className="section-icon-modern" style={{ background: section.color }}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="section-title-text">{section.title}</h2>
                    <p className="section-count">{sectionProducts.length} products</p>
                  </div>
                </div>
                <button className="view-all-btn-modern">
                  View All <FaChevronRight size={12} />
                </button>
              </div>

              <SectionCarousel sectionId={section.id}>
                {sectionProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    sectionId={section.id}
                  />
                ))}
              </SectionCarousel>
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default HomeTabSections;