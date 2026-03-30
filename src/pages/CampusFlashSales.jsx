// src/pages/CampusFlashSales.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaHeart, FaMapMarkerAlt, FaBolt, FaClock, FaFilter
} from "react-icons/fa";
import styles from "./CampusFlashSales.module.css";

const CampusFlashSales = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("discount");
  const [filterCampus, setFilterCampus] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFlashSales();
    loadCampuses();
  }, [sortBy, filterCampus]);

  const loadFlashSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campus_products')
        .select('*')
        .eq('status', 'available');
      
      // Flash sales: products with price > 3000 (demo logic)
      // In production, you'd have a flash_sale field or discount field
      if (sortBy === 'discount') {
        query = query.gt('price', 3000).order('price', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.gt('price', 3000).order('created_at', { ascending: false });
      } else if (sortBy === 'popular') {
        query = query.gt('price', 3000).order('view_count', { ascending: false });
      } else if (sortBy === 'price_low') {
        query = query.gt('price', 3000).order('price', { ascending: true });
      } else if (sortBy === 'price_high') {
        query = query.gt('price', 3000).order('price', { ascending: false });
      }
      
      if (filterCampus) {
        query = query.eq('campus_name', filterCampus);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading flash sales:', error);
      toast.error('Failed to load flash sales');
    } finally {
      setLoading(false);
    }
  };

  const loadCampuses = async () => {
    try {
      const { data } = await supabase
        .from('campus_products')
        .select('campus_name')
        .not('campus_name', 'is', null);
      
      const uniqueCampuses = [...new Set(data?.map(item => item.campus_name).filter(Boolean))];
      setCampuses(uniqueCampuses);
    } catch (error) {
      console.error('Error loading campuses:', error);
    }
  };

  const ProductCard = ({ product }) => (
    <motion.div
      className={styles.productCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/product/${product.id}`)}
    >
      <div className={styles.cardImage}>
        {product.images && product.images[0] ? (
          <img src={product.images[0]} alt={product.title} />
        ) : (
          <div className={styles.imagePlaceholder}>
            {product.category === 'textbooks' ? '📚' : 
             product.category === 'electronics' ? '💻' : 
             product.category === 'clothing' ? '👕' : '🛒'}
          </div>
        )}
        <div className={styles.flashBadge}>
          <FaBolt /> FLASH SALE
        </div>
        <button className={styles.wishlistBtn} onClick={(e) => { e.stopPropagation(); toast.success("Added to wishlist"); }}>
          <FaHeart />
        </button>
      </div>
      <div className={styles.cardInfo}>
        <h4 className={styles.cardTitle}>{product.title}</h4>
        <div className={styles.cardPrice}>KSh {product.price?.toLocaleString()}</div>
        <div className={styles.cardMeta}>
          <FaMapMarkerAlt /> {product.campus_name}
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.viewsCount}>{product.view_count || 0} views</span>
          {product.is_negotiable && (
            <span className={styles.negotiableBadge}>Negotiable</span>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Flash Sales</h1>
        <button className={styles.filterBtn} onClick={() => setShowFilters(!showFilters)}>
          <FaFilter />
        </button>
      </header>

      {showFilters && (
        <div className={styles.filtersBar}>
          <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)}>
            <option value="">All Campuses</option>
            {campuses.map(campus => (
              <option key={campus} value={campus}>{campus}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="discount">Biggest Discount</option>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      )}

      <main className={styles.main}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={styles.skeletonCard}></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className={styles.resultsHeader}>
              <span>{products.length} flash deals available</span>
            </div>
            <div className={styles.productsGrid}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚡</div>
            <h3>No flash sales available</h3>
            <p>Check back later for amazing deals!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CampusFlashSales;