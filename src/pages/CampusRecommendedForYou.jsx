// src/pages/CampusRecommendedForYou.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaHeart, FaMapMarkerAlt, FaGem, FaFilter, FaUser
} from "react-icons/fa";
import styles from "./CampusRecommendedForYou.module.css";

const CampusRecommendedForYou = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCampus, setFilterCampus] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [userInterests, setUserInterests] = useState([]);

  useEffect(() => {
    loadUserInterests();
  }, [user]);

  useEffect(() => {
    loadRecommendedProducts();
    loadCampuses();
  }, [filterCampus, userInterests]);

  const loadUserInterests = async () => {
    if (!user?.id) return;
    try {
      // Load user's past purchases, viewed products, etc.
      const { data: views } = await supabase
        .from('campus_products')
        .select('category')
        .eq('seller_user_id', user.id)
        .limit(10);
      
      const categories = views?.map(v => v.category).filter(Boolean);
      const uniqueCategories = [...new Set(categories)];
      setUserInterests(uniqueCategories);
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  const loadRecommendedProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campus_products')
        .select('*')
        .eq('status', 'available');
      
      if (filterCampus) {
        query = query.eq('campus_name', filterCampus);
      }
      
      // Recommend based on user interests
      if (userInterests.length > 0) {
        query = query.in('category', userInterests);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast.error('Failed to load recommendations');
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
        <div className={styles.recommendReason}>
          {userInterests.includes(product.category) && (
            <span>Based on your interests</span>
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
        <h1>Recommended For You</h1>
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
              <span><FaGem /> Personalized picks just for you</span>
            </div>
            <div className={styles.productsGrid}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✨</div>
            <h3>No recommendations yet</h3>
            <p>Start browsing to get personalized recommendations</p>
            <button onClick={() => navigate('/student/marketplace')}>Browse Marketplace</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CampusRecommendedForYou;