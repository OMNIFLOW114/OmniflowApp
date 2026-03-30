// src/pages/CampusTrendingNow.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaHeart, FaMapMarkerAlt, FaFire, FaFilter, FaEye
} from "react-icons/fa";
import styles from "./CampusTrendingNow.module.css";

const CampusTrendingNow = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCampus, setFilterCampus] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [timeFrame, setTimeFrame] = useState("week");

  useEffect(() => {
    loadTrendingProducts();
    loadCampuses();
  }, [filterCampus, timeFrame]);

  const loadTrendingProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campus_products')
        .select('*')
        .eq('status', 'available')
        .order('view_count', { ascending: false });
      
      if (filterCampus) {
        query = query.eq('campus_name', filterCampus);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading trending products:', error);
      toast.error('Failed to load trending products');
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

  const ProductCard = ({ product, index }) => (
    <motion.div
      className={styles.productCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/product/${product.id}`)}
    >
      <div className={styles.rankBadge}>#{index + 1}</div>
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
        <div className={styles.trendingBadge}>
          <FaFire /> Trending
        </div>
        <button className={styles.wishlistBtn} onClick={(e) => { e.stopPropagation(); toast.success("Added to wishlist"); }}>
          <FaHeart />
        </button>
      </div>
      <div className={styles.cardInfo}>
        <h4 className={styles.cardTitle}>{product.title}</h4>
        <div className={styles.cardPrice}>KSh {product.price?.toLocaleString()}</div>
        <div className={styles.cardStats}>
          <span><FaEye /> {product.view_count || 0} views</span>
        </div>
        <div className={styles.cardMeta}>
          <FaMapMarkerAlt /> {product.campus_name}
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
        <h1>Trending Now</h1>
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
          <div className={styles.timeFrameButtons}>
            <button className={timeFrame === 'day' ? styles.active : ''} onClick={() => setTimeFrame('day')}>Today</button>
            <button className={timeFrame === 'week' ? styles.active : ''} onClick={() => setTimeFrame('week')}>This Week</button>
            <button className={timeFrame === 'month' ? styles.active : ''} onClick={() => setTimeFrame('month')}>This Month</button>
          </div>
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
              <span>🔥 {products.length} trending items right now</span>
            </div>
            <div className={styles.productsGrid}>
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔥</div>
            <h3>No trending items yet</h3>
            <p>Be the first to make something trend!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CampusTrendingNow;