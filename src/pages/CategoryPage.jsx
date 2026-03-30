// src/pages/CategoryPage.jsx - Category Products Page
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { FaArrowLeft, FaSearch, FaFilter, FaStar, FaHeart, FaMapMarkerAlt } from "react-icons/fa";
import styles from "./CategoryPage.module.css";

const CategoryPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryId } = useParams();
  const categoryName = location.state?.categoryName || categoryId || "Category";
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategoryProducts();
  }, [categoryId]);

  const loadCategoryProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campus_products')
        .select('*')
        .eq('status', 'available')
        .eq('category', categoryId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const ProductCard = ({ product }) => (
    <motion.div
      className={styles.productCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/product/${product.id}`)}
    >
      <div className={styles.productImage}>
        {product.images && product.images[0] ? (
          <img src={product.images[0]} alt={product.title} />
        ) : (
          <div className={styles.imagePlaceholder}>📚</div>
        )}
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productTitle}>{product.title}</h3>
        <div className={styles.productRating}>
          <FaStar /> {product.view_count || 0} views
        </div>
        <div className={styles.productPrice}>KSh {product.price?.toLocaleString()}</div>
        <div className={styles.productLocation}>
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
        <h1>{categoryName}</h1>
        <button className={styles.searchBtn} onClick={() => navigate('/student/search')}>
          <FaSearch />
        </button>
      </header>

      <div className={styles.searchBar}>
        <FaSearch />
        <input
          type="text"
          placeholder={`Search in ${categoryName}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FaFilter />
      </div>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={styles.skeletonCard}></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className={styles.productsGrid}>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h3>No products found</h3>
            <p>Be the first to sell something in this category!</p>
            <button onClick={() => navigate('/student/sell-product')}>Sell an Item</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryPage;