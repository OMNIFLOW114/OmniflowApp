// src/pages/ProductDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaStar, FaHeart, FaShare,
  FaMapMarkerAlt, FaUniversity, FaWhatsapp,
  FaShieldVirus, FaShippingFast, FaCheck
} from "react-icons/fa";
import "./ProductDetailPage.css";

const ProductDetailPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadProductData();
    checkIfFavorite();
  }, [id, user]);

  const loadProductData = async () => {
    try {
      const { data: productData, error } = await supabase
        .from('campus_products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(productData);

      // Load seller info
      const { data: sellerData } = await supabase
        .from('users')
        .select('full_name, avatar_url, rating, created_at')
        .eq('id', productData.seller_user_id)
        .single();

      setSeller(sellerData);

      // Increment view count
      await supabase
        .from('campus_products')
        .update({ view_count: (productData.view_count || 0) + 1 })
        .eq('id', id);

    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('student_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('entity_type', 'product')
        .eq('entity_id', id)
        .single();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      alert("Please login to add favorites");
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('student_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('entity_type', 'product')
          .eq('entity_id', id);
        setIsFavorite(false);
      } else {
        await supabase
          .from('student_favorites')
          .insert([{
            user_id: user.id,
            entity_type: 'product',
            entity_id: id
          }]);
        setIsFavorite(true);
        
        // Increment like count
        await supabase
          .from('campus_products')
          .update({ like_count: (product.like_count || 0) + 1 })
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const contactSeller = () => {
    if (!user) {
      alert("Please login to contact seller");
      return;
    }
    // Navigate to chat or open WhatsApp
    const message = `Hi! I'm interested in your product: ${product.title} (KSh ${product.price})`;
    const whatsappUrl = `https://wa.me/${seller?.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const buyNow = () => {
    if (!user) {
      alert("Please login to buy products");
      return;
    }
    navigate('/student/checkout-product', { state: { product, seller } });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="error-screen">
        <h2>Product not found</h2>
        <button onClick={() => navigate('/student/marketplace')}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      {/* Header */}
      <header className="page-header">
        <motion.button
          className="back-btn"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft />
        </motion.button>
        <h1>Product Details</h1>
        <div className="header-actions">
          <motion.button
            className="icon-btn"
            onClick={toggleFavorite}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaHeart className={isFavorite ? 'favorited' : ''} />
          </motion.button>
          <motion.button
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaShare />
          </motion.button>
        </div>
      </header>

      <div className="product-content">
        {/* Image Gallery */}
        <section className="image-gallery">
          <div className="main-image">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[currentImageIndex]} 
                alt={product.title} 
              />
            ) : (
              <div className="image-placeholder">
                {product.category === 'textbooks' ? '📚' : 
                 product.category === 'electronics' ? '💻' : 
                 product.category === 'clothing' ? '👕' : '🛒'}
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="image-thumbnails">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={image} alt={`${product.title} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Product Info */}
        <section className="product-info">
          <div className="product-header">
            <h2>{product.title}</h2>
            <div className="price">KSh {product.price}</div>
          </div>

          <div className="product-meta">
            <span className={`condition ${product.condition}`}>
              {product.condition.replace('_', ' ').toUpperCase()}
            </span>
            <span className="views">
              {product.view_count || 0} views
            </span>
            <span className="likes">
              <FaHeart /> {product.like_count || 0}
            </span>
          </div>

          <div className="product-description">
            <p>{product.description}</p>
          </div>

          {/* Product Details */}
          <div className="product-details">
            <div className="detail-item">
              <strong>Category:</strong>
              <span>{product.category}</span>
            </div>
            <div className="detail-item">
              <strong>Negotiable:</strong>
              <span>{product.is_negotiable ? 'Yes' : 'No'}</span>
            </div>
            <div className="detail-item">
              <strong>Campus:</strong>
              <span>
                <FaUniversity /> {product.campus_name}
              </span>
            </div>
          </div>

          {/* Meeting Places */}
          {product.meeting_places && product.meeting_places.length > 0 && (
            <div className="meeting-places">
              <h4>Meeting Places</h4>
              <div className="places-list">
                {product.meeting_places.map((place, index) => (
                  <div key={index} className="place-item">
                    <FaMapMarkerAlt />
                    {place}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="product-tags">
              <h4>Tags</h4>
              <div className="tags-list">
                {product.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Seller Info */}
        <section className="seller-section">
          <h3>Seller Information</h3>
          <div className="seller-card">
            <div className="seller-avatar">
              {seller?.avatar_url ? (
                <img src={seller.avatar_url} alt={seller.full_name} />
              ) : (
                <div className="avatar-placeholder">
                  {seller?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="seller-info">
              <h4>{seller?.full_name || 'Unknown Seller'}</h4>
              <div className="seller-stats">
                <span><FaStar /> {seller?.rating || '5.0'}</span>
                <span><FaCheck /> Verified Student</span>
              </div>
              <p className="member-since">
                Member since {new Date(seller?.created_at).getFullYear()}
              </p>
            </div>
            <motion.button
              className="contact-seller-btn"
              onClick={contactSeller}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaWhatsapp /> Contact
            </motion.button>
          </div>
        </section>

        {/* Safety Tips */}
        <section className="safety-tips">
          <h4>
            <FaShieldVirus /> Safety Tips
          </h4>
          <ul>
            <li>Meet in public places on campus</li>
            <li>Inspect the item before paying</li>
            <li>Don't send advance payments</li>
            <li>Trust your instincts</li>
          </ul>
        </section>
      </div>

      {/* Fixed Action Bar */}
      <motion.div
        className="action-bar"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className="action-content">
          <div className="price-section">
            <span className="price">KSh {product.price}</span>
            {product.is_negotiable && (
              <span className="negotiable">Price negotiable</span>
            )}
          </div>
          
          <div className="action-buttons">
            <motion.button
              className="contact-btn"
              onClick={contactSeller}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaWhatsapp /> Chat
            </motion.button>
            <motion.button
              className="buy-btn"
              onClick={buyNow}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Buy Now
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetailPage;