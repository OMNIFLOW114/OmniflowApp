// src/pages/ProductDetailPage.jsx - PRODUCTION READY
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaHeart, FaShare,
  FaMapMarkerAlt, FaUniversity, FaWhatsapp,
  FaShieldVirus, FaCheck, FaClock, FaTag,
  FaStore, FaUser, FaEye, FaThumbsUp, FaFlag
} from "react-icons/fa";
import styles from "./ProductDetailPage.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const ProductDetailPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    loadProductData();
    checkIfFavorite();
  }, [id, user]);

  const loadProductData = async () => {
    setLoading(true);
    try {
      // Load product details
      const { data: productData, error: productError } = await supabase
        .from('campus_products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Load seller info from profiles
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, created_at, campus_name')
        .eq('id', productData.seller_user_id)
        .single();

      if (!sellerError && sellerData) {
        setSeller(sellerData);
      } else {
        // Fallback - get from auth users
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', productData.seller_user_id)
          .single();
        setSeller(userData || { full_name: 'Student Seller' });
      }

      // Increment view count
      await supabase
        .from('campus_products')
        .update({ view_count: (productData.view_count || 0) + 1 })
        .eq('id', id);

      // Load related products (same category)
      const { data: relatedData } = await supabase
        .from('campus_products')
        .select('*')
        .eq('category', productData.category)
        .eq('status', 'available')
        .neq('id', id)
        .limit(6);
      
      setRelatedProducts(relatedData || []);

    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product details');
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
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please login to add favorites');
      navigate('/auth');
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
        toast.success('Removed from favorites');
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
          .update({ like_count: (product?.like_count || 0) + 1 })
          .eq('id', id);
        
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product.title,
      text: `Check out this product: ${product.title} for ${formatKenyanPrice(product.price)} on ComradeMarket!`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
        setShowShareOptions(true);
      }
    } else {
      setShowShareOptions(true);
      // Copy to clipboard fallback
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setShowShareOptions(false), 2000);
    }
  };

  const contactSeller = () => {
    if (!user) {
      toast.error('Please login to contact seller');
      navigate('/auth');
      return;
    }
    
    const message = `Hi! I'm interested in your product: ${product.title} (${formatKenyanPrice(product.price)})`;
    const phoneNumber = seller?.phone || '254700000000';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const buyNow = () => {
    if (!user) {
      toast.error('Please login to buy products');
      navigate('/auth');
      return;
    }
    navigate('/student/checkout-product', { state: { product, seller } });
  };

  const reportProduct = async () => {
    if (!user) {
      toast.error('Please login to report');
      return;
    }
    
    setReporting(true);
    try {
      const { error } = await supabase
        .from('product_reports')
        .insert([{
          product_id: id,
          user_id: user.id,
          reason: 'Reported by user',
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      toast.success('Product reported. We will review it.');
    } catch (error) {
      console.error('Error reporting product:', error);
      toast.error('Failed to report product');
    } finally {
      setReporting(false);
    }
  };

  const RelatedProductCard = ({ product: related }) => (
    <motion.div
      className={styles.relatedCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/product/${related.id}`)}
    >
      <div className={styles.relatedImage}>
        {related.images && related.images[0] ? (
          <img src={related.images[0]} alt={related.title} />
        ) : (
          <div className={styles.imagePlaceholder}>📚</div>
        )}
      </div>
      <div className={styles.relatedInfo}>
        <h4>{related.title}</h4>
        <div className={styles.relatedPrice}>{formatKenyanPrice(related.price)}</div>
      </div>
    </motion.div>
  );

  // Loading Skeleton
  const SkeletonLoader = () => (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonActions}></div>
      </div>
      <div className={styles.skeletonImage}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitleLarge}></div>
        <div className={styles.skeletonPrice}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonSeller}></div>
      </div>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  if (!product) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔍</div>
          <h2>Product not found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/student/marketplace')} className={styles.errorBtn}>
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Product Details</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={toggleFavorite}>
            <FaHeart className={isFavorite ? styles.favorited : ''} />
          </button>
          <button className={styles.iconBtn} onClick={handleShare}>
            <FaShare />
          </button>
          <button className={styles.iconBtn} onClick={reportProduct} disabled={reporting}>
            <FaFlag />
          </button>
        </div>
      </header>

      {/* Share Options Modal */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div
            className={styles.shareModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareOptions(false)}
          >
            <motion.div
              className={styles.shareContent}
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Share via</h3>
              <div className={styles.shareOptions}>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>
                  WhatsApp
                </button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>
                  Twitter
                </button>
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>
                  Facebook
                </button>
                <button onClick={() => navigator.clipboard.writeText(window.location.href)}>
                  Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.content}>
        {/* Image Gallery */}
        <section className={styles.imageGallery}>
          <div className={styles.mainImage}>
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[currentImageIndex]} 
                alt={product.title} 
              />
            ) : (
              <div className={styles.imagePlaceholderLarge}>
                {product.category === 'textbooks' ? '📚' : 
                 product.category === 'electronics' ? '💻' : 
                 product.category === 'clothing' ? '👕' : '🛒'}
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className={styles.imageThumbnails}>
              {product.images.map((image, index) => (
                <button
                  key={index}
                  className={`${styles.thumbnail} ${currentImageIndex === index ? styles.active : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={image} alt={`${product.title} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Product Info */}
        <section className={styles.productInfo}>
          <div className={styles.productHeader}>
            <h2>{product.title}</h2>
            <div className={styles.price}>{formatKenyanPrice(product.price)}</div>
          </div>

          <div className={styles.productMeta}>
            <span className={`${styles.condition} ${styles[product.condition]}`}>
              {product.condition?.replace('_', ' ').toUpperCase() || 'GOOD'}
            </span>
            <span className={styles.views}>
              <FaEye /> {product.view_count || 0} views
            </span>
            <span className={styles.likes}>
              <FaHeart /> {product.like_count || 0}
            </span>
          </div>

          <div className={styles.productDescription}>
            <h4>Description</h4>
            <p>{product.description}</p>
          </div>

          {/* Product Details */}
          <div className={styles.productDetails}>
            <h4>Details</h4>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <strong>Category:</strong>
                <span>{product.category?.charAt(0).toUpperCase() + product.category?.slice(1) || 'General'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>Negotiable:</strong>
                <span className={product.is_negotiable ? styles.negotiableYes : styles.negotiableNo}>
                  {product.is_negotiable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className={styles.detailItem}>
                <strong>Campus:</strong>
                <span><FaUniversity /> {product.campus_name || 'Campus'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>Posted:</strong>
                <span><FaClock /> {new Date(product.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Meeting Places */}
          {product.meeting_places && product.meeting_places.length > 0 && (
            <div className={styles.meetingPlaces}>
              <h4>Meeting Places</h4>
              <div className={styles.placesList}>
                {product.meeting_places.map((place, index) => (
                  <div key={index} className={styles.placeItem}>
                    <FaMapMarkerAlt />
                    {place}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className={styles.productTags}>
              <h4>Tags</h4>
              <div className={styles.tagsList}>
                {product.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>#{tag.replace('_', ' ')}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Seller Info */}
        <section className={styles.sellerSection}>
          <h3>Seller Information</h3>
          <div className={styles.sellerCard}>
            <div className={styles.sellerAvatar}>
              {seller?.avatar_url ? (
                <img src={seller.avatar_url} alt={seller.full_name} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {seller?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className={styles.sellerInfo}>
              <h4>{seller?.full_name || 'Student Seller'}</h4>
              <div className={styles.sellerStats}>
                <span><FaStar /> {product.seller_rating || '5.0'}</span>
                <span><FaCheck /> Verified Student</span>
              </div>
              <p className={styles.memberSince}>
                <FaStore /> Member since {new Date(seller?.created_at).getFullYear() || '2024'}
              </p>
            </div>
            <button className={styles.contactSellerBtn} onClick={contactSeller}>
              <FaWhatsapp /> Contact
            </button>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className={styles.relatedSection}>
            <h3>You might also like</h3>
            <div className={styles.relatedGrid}>
              {relatedProducts.slice(0, 4).map(related => (
                <RelatedProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}

        {/* Safety Tips */}
        <section className={styles.safetyTips}>
          <h4><FaShieldVirus /> Safety Tips</h4>
          <ul>
            <li>Meet in public places on campus (library, cafeteria, student center)</li>
            <li>Inspect the item thoroughly before paying</li>
            <li>Never send advance payments or deposits</li>
            <li>Trust your instincts - if it seems too good to be true, it probably is</li>
            <li>Keep all communication within the platform</li>
          </ul>
        </section>
      </div>

      {/* Fixed Action Bar */}
      <motion.div
        className={styles.actionBar}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className={styles.actionContent}>
          <div className={styles.priceSection}>
            <span className={styles.priceLarge}>{formatKenyanPrice(product.price)}</span>
            {product.is_negotiable && (
              <span className={styles.negotiable}>Price negotiable</span>
            )}
          </div>
          
          <div className={styles.actionButtons}>
            <button className={styles.contactActionBtn} onClick={contactSeller}>
              <FaWhatsapp /> Chat
            </button>
            <button className={styles.buyActionBtn} onClick={buyNow}>
              Buy Now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetailPage;