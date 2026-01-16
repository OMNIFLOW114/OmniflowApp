import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { 
  FaBolt, FaSearch, FaClock, FaShoppingCart,
  FaFilter, FaTimes
} from "react-icons/fa";
import "./FlashSalesPage.css";

const FlashSalesPage = () => {
  const navigate = useNavigate();
  const [flashProducts, setFlashProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [now, setNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState(["all"]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  /* ---------- Fetch active flash sales ---------- */
  useEffect(() => {
    const fetchFlashSales = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            variant_options,
            image_gallery,
            delivery_methods,
            return_policy,
            warranty,
            usage_guide
          `)
          .eq("is_flash_sale", true)
          .gt("flash_sale_ends_at", new Date().toISOString())
          .eq("visibility", "public")
          .eq("status", "active")
          .order("flash_sale_ends_at", { ascending: true })
          .limit(50);

        if (error) {
          console.error("Error fetching flash sales:", error);
          return;
        }

        const withCalculations = data.map((p) => ({
          ...p,
          imageUrl: getImageUrl(p.image_gallery?.[0]),
          flash_price: calculateFlashPrice(p.price, p.discount),
          timeLeft: calculateTimeLeft(p.flash_sale_ends_at),
          items_sold: p.sold_count || 0,
          initial_stock: p.initial_stock || p.stock_quantity + (p.sold_count || 0),
          progress_percentage: calculateProgressPercentage(p),
          stock_percentage: ((p.stock_quantity || 0) / (p.initial_stock || 1)) * 100
        }));

        setFlashProducts(withCalculations);
        setFilteredProducts(withCalculations);
        
        // Extract unique categories
        const uniqueCategories = ["all", ...new Set(
          withCalculations
            .map(p => p.category)
            .filter(Boolean)
            .sort()
        )];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashSales();
  }, []);

  /* ---------- Real-time countdown ---------- */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setFlashProducts(prev => 
        prev.map(p => ({
          ...p,
          timeLeft: calculateTimeLeft(p.flash_sale_ends_at)
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* ---------- Filter logic ---------- */
  useEffect(() => {
    let filtered = [...flashProducts];

    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.tags && Array.isArray(product.tags) && 
          product.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Sort by ending soon by default
    filtered.sort((a, b) => {
      return new Date(a.flash_sale_ends_at) - new Date(b.flash_sale_ends_at);
    });

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, flashProducts]);

  /* ---------- Helper functions ---------- */
  const getImageUrl = (path) => {
    if (!path) return "/placeholder-product.jpg";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const calculateFlashPrice = (price, discount) => {
    const numPrice = Number(price) || 0;
    const numDiscount = Number(discount) || 0;
    return numPrice * (1 - numDiscount / 100);
  };

  const calculateTimeLeft = (endTime) => {
    if (!endTime) return null;
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const calculateProgressPercentage = (product) => {
    const sold = product.sold_count || 0;
    const total = product.initial_stock || (product.stock_quantity || 0) + sold;
    if (total === 0) return 0;
    return Math.min(100, (sold / total) * 100);
  };

  const handleGrabNow = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Grab now clicked for product:", product.id, product.name);
    
    try {
      // Fetch seller info first
      const { data: seller, error: sellerError } = await supabase
        .from("stores")
        .select("id, name, contact_phone, location, owner_id")
        .eq("owner_id", product.owner_id)
        .single();
      
      if (sellerError) {
        console.error("Error fetching seller:", sellerError);
        toast.error("Unable to load seller information");
        return;
      }
      
      // Check if product has delivery methods
      const dm = product.delivery_methods || {};
      const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== ""));
      const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== ""));
      
      // Set default delivery method
      const deliveryMethod = offersDoor ? "door" : offersPickup ? "pickup" : "";
      
      // Navigate to checkout with the same structure as product detail page
      navigate(`/checkout/${product.id}`, {
        state: {
          productId: product.id,
          product: product, // Pass full product object
          deliveryMethod: deliveryMethod,
          variant: product.variant_options?.[0] || null,
          seller: seller,
          storeId: seller.id,
          isFlashSale: true,
          flashPrice: product.flash_price,
          originalPrice: product.price,
          fromFlashSale: true
        }
      });
      
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback: redirect to product detail page instead
      navigate(`/product/${product.id}?flash=true`);
    }
  };

  const handleCardClick = (productId) => {
    // Navigate to product detail page when card is clicked
    navigate(`/product/${productId}?flash=true`);
  };

  const fmt = (num) => {
    if (!num && num !== 0) return "0";
    return Number(num).toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Get visible categories (limit to 5 initially)
  const visibleCategories = useMemo(() => {
    const baseCategories = categories.slice(0, 5);
    if (showAllCategories) {
      return categories;
    }
    return baseCategories;
  }, [categories, showAllCategories]);

  const FlashProductCard = ({ product }) => {
    const itemsLeft = Math.max(0, (product.initial_stock || 0) - (product.items_sold || 0));
    
    return (
      <div 
        className="flash-product-card"
        onClick={() => handleCardClick(product.id)}
        style={{ cursor: 'pointer' }}
      >
        {/* Product Image */}
        <div className="flash-card-image">
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
          
          {/* Minimal Discount Badge */}
          {product.discount > 0 && (
            <div className="flash-discount-badge">
              -{product.discount}%
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flash-card-info">
          {/* Product Name */}
          <h3 className="flash-product-name">{product.name}</h3>
          
          {/* Stock Progress Bar */}
          <div className="stock-progress-container">
            <div className="stock-progress-bar">
              <div 
                className="stock-progress-fill"
                style={{ width: `${product.progress_percentage}%` }}
              />
            </div>
            <div className="stock-progress-text">
              <span className="items-left">{itemsLeft} left</span>
              <span className="sold-count">{product.items_sold || 0} sold</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flash-timer">
            <FaClock className="timer-icon" />
            <span>{product.timeLeft || "Expired"}</span>
          </div>

          {/* Pricing */}
          <div className="flash-pricing">
            <div className="flash-price">KSH {fmt(product.flash_price)}</div>
            {product.discount > 0 && (
              <div className="flash-original-price">KSH {fmt(product.price)}</div>
            )}
          </div>

          {/* Grab Button */}
          <button 
            className="grab-button"
            onClick={(e) => handleGrabNow(e, product)}
            disabled={product.stock_quantity <= 0}
          >
            <FaShoppingCart />
            <span>GRAB NOW</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flash-sales-container">
      {/* Ultra Minimal Top Bar */}
      <div className="flash-top-nav">
        <div className="flash-search-wrapper">
          <div className="flash-search-container">
            <FaSearch className="flash-search-icon" />
            <input
              type="text"
              placeholder="Search flash deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flash-search-input"
            />
            {searchTerm && (
              <button 
                className="flash-clear-search" 
                onClick={() => setSearchTerm("")}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Categories */}
      <div className="flash-categories-tabs">
        <div className="categories-scroll">
          {visibleCategories.map(category => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category === "all" ? (
                "All"
              ) : (
                category
              )}
            </button>
          ))}
          
          {categories.length > 5 && !showAllCategories && (
            <button
              className="category-tab more-btn"
              onClick={() => setShowAllCategories(true)}
            >
              <FaFilter /> More
            </button>
          )}
          
          {showAllCategories && categories.length > 5 && (
            <button
              className="category-tab more-btn"
              onClick={() => setShowAllCategories(false)}
            >
              Less
            </button>
          )}
        </div>
      </div>

      {/* Active Deals Count - Minimal */}
      <div className="flash-header-info">
        <div className="flash-active-deals">
          <FaBolt className="flash-bolt-icon" />
          <span className="deal-count">{filteredProducts.length} deals</span>
          {selectedCategory !== "all" && (
            <span className="category-badge">{selectedCategory}</span>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <main className="flash-products-grid">
        {loading ? (
          <div className="flash-loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flash-product-skeleton">
                <div className="skeleton-image"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
                <div className="skeleton-button"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flash-empty-state">
            <FaBolt className="empty-icon" />
            <h3>No flash deals</h3>
            <p>Try a different category or check back later</p>
          </div>
        ) : (
          <div className="flash-grid-2col">
            {filteredProducts.map((product) => (
              <FlashProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FlashSalesPage;