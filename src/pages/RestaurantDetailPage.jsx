// src/pages/RestaurantDetailPage.jsx - PREMIUM UPDATED VERSION
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaClock, FaShoppingCart,
  FaPhone, FaMapMarkerAlt, FaUtensils, FaBolt,
  FaPlus, FaMinus, FaWhatsapp, FaShare, FaHeart,
  FaFlag, FaCheck, FaTimes, FaSpinner, FaTruck,
  FaMotorcycle, FaInfoCircle, FaTag, FaPercent
} from "react-icons/fa";
import styles from "./RestaurantDetailPage.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

// Skeleton Loader Component
const RestaurantDetailSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonCartBtn}></div>
      </div>
      <div className={styles.skeletonCover}></div>
      <div className={styles.skeletonInfo}>
        <div className={styles.skeletonTitleLarge}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonMeta}></div>
      </div>
      <div className={styles.skeletonCategories}>
        {[1,2,3,4].map(i => <div key={i} className={styles.skeletonCategory}></div>)}
      </div>
      <div className={styles.skeletonMenuItems}>
        {[1,2,3].map(i => <div key={i} className={styles.skeletonMenuItem}></div>)}
      </div>
    </div>
  );
};

// Cart Modal Component
const CartModal = ({ isOpen, onClose, cart, restaurant, updateQuantity, removeFromCart, getTotalPrice, handleCheckout }) => {
  const { darkMode } = useDarkMode();
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <motion.div 
        className={styles.cartModal}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Your Order</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {cart.length === 0 ? (
            <div className={styles.emptyCart}>
              <FaShoppingCart className={styles.emptyIcon} />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className={styles.cartItemsList}>
                {cart.map(item => (
                  <div key={item.id} className={styles.cartItemModal}>
                    <div className={styles.cartItemInfo}>
                      <span className={styles.cartItemName}>{item.name}</span>
                      <span className={styles.cartItemPrice}>{formatKenyanPrice(item.price * item.quantity)}</span>
                    </div>
                    <div className={styles.cartItemControls}>
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <FaMinus />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <FaPlus />
                      </button>
                      <button className={styles.removeItemBtn} onClick={() => removeFromCart(item.id)}>
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={styles.cartSummary}>
                <div className={styles.summaryRow}>
                  <span>Subtotal:</span>
                  <span>{formatKenyanPrice(getTotalPrice())}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Delivery Fee:</span>
                  <span>{restaurant?.delivery_fee === 0 ? 'Free' : formatKenyanPrice(restaurant?.delivery_fee || 0)}</span>
                </div>
                <div className={styles.summaryRowTotal}>
                  <span>Total:</span>
                  <span>{formatKenyanPrice(getTotalPrice() + (restaurant?.delivery_fee || 0))}</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {cart.length > 0 && (
          <div className={styles.modalFooter}>
            <button className={styles.checkoutBtn} onClick={handleCheckout}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const RestaurantDetailPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    loadRestaurantData();
    checkIfFavorite();
  }, [id]);
  
  const loadRestaurantData = async () => {
    try {
      const { data: restaurantData, error } = await supabase
        .from('campus_restaurants')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setRestaurant(restaurantData);
      
      // Load menu items
      const { data: menuData } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('restaurant_id', id)
        .eq('is_available', true)
        .order('category');
        
      setMenuItems(menuData || []);
      
    } catch (error) {
      console.error('Error loading restaurant:', error);
      toast.error('Failed to load restaurant');
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
        .eq('entity_type', 'restaurant')
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
          .eq('entity_type', 'restaurant')
          .eq('entity_id', id);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('student_favorites')
          .insert([{
            user_id: user.id,
            entity_type: 'restaurant',
            entity_id: id
          }]);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };
  
  const handleShare = async () => {
    const shareData = {
      title: restaurant.name,
      text: `Check out ${restaurant.name} on ComradeMarket!`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        setShowShareOptions(true);
      }
    } else {
      setShowShareOptions(true);
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setShowShareOptions(false), 2000);
    }
  };
  
  const categories = ['all', ...new Set(menuItems.map(item => item.category))];
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);
    
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`Added ${item.name} to cart`);
  };
  
  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };
  
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(itemId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };
  
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/auth');
      return;
    }
    setShowCartModal(false);
    navigate('/student/checkout', { 
      state: { 
        restaurant, 
        cart, 
        total: getTotalPrice() + (restaurant?.delivery_fee || 0),
        fromCart: false
      } 
    });
  };
  
  const contactRestaurant = () => {
    const phone = restaurant?.contact_phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error('Phone number not available');
    }
  };
  
  if (loading) return <RestaurantDetailSkeleton />;
  
  if (!restaurant) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🍽️</div>
          <h2>Restaurant not found</h2>
          <p>The restaurant you're looking for doesn't exist or has been removed.</p>
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
        <h1>{restaurant.name}</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={toggleFavorite}>
            <FaHeart className={isFavorite ? styles.favorited : ''} />
          </button>
          <button className={styles.iconBtn} onClick={handleShare}>
            <FaShare />
          </button>
          <button className={styles.cartBtn} onClick={() => setShowCartModal(true)}>
            <FaShoppingCart />
            {cart.length > 0 && <span className={styles.cartBadge}>{cart.length}</span>}
          </button>
        </div>
      </header>
      
      {/* Share Modal */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div className={styles.shareModal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareOptions(false)}>
            <motion.div className={styles.shareContent} initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()}>
              <h3>Share via</h3>
              <div className={styles.shareOptions}>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>WhatsApp</button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>Twitter</button>
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>Facebook</button>
                <button onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy Link</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Cart Modal */}
      <CartModal 
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        restaurant={restaurant}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        getTotalPrice={getTotalPrice}
        handleCheckout={handleCheckout}
      />
      
      {/* Restaurant Cover */}
      <div className={styles.coverSection}>
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={restaurant.name} className={styles.coverImage} />
        ) : (
          <div className={styles.coverPlaceholder}>
            <FaUtensils />
          </div>
        )}
        {restaurant.special_offers?.length > 0 && (
          <div className={styles.specialBadge}>
            <FaTag /> {restaurant.special_offers[0]}
          </div>
        )}
      </div>
      
      {/* Restaurant Info */}
      <div className={styles.infoSection}>
        <div className={styles.restaurantHeader}>
          <div>
            <h2>{restaurant.name}</h2>
            <p className={styles.cuisine}>{restaurant.cuisine_type}</p>
          </div>
          <div className={styles.ratingBadge}>
            <FaStar /> {restaurant.rating || 'New'}
          </div>
        </div>
        
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <FaClock />
            <span>{restaurant.delivery_time_range}</span>
          </div>
          <div className={styles.metaItem}>
            <FaMapMarkerAlt />
            <span>{restaurant.location_description}</span>
          </div>
          <div className={styles.metaItem}>
            <FaTruck />
            <span>Min: {formatKenyanPrice(restaurant.min_order_amount)}</span>
          </div>
          <div className={styles.metaItem}>
            <FaMotorcycle />
            <span>{restaurant.delivery_fee === 0 ? 'Free Delivery' : `Delivery: ${formatKenyanPrice(restaurant.delivery_fee)}`}</span>
          </div>
        </div>
        
        <div className={styles.actionButtonsInfo}>
          <button className={styles.contactBtn} onClick={contactRestaurant}>
            <FaPhone /> Call
          </button>
          <button className={styles.whatsappBtn} onClick={() => window.open(`https://wa.me/${restaurant.contact_phone}`)}>
            <FaWhatsapp /> WhatsApp
          </button>
        </div>
      </div>
      
      {/* Menu Categories */}
      <div className={styles.categoriesSection}>
        <div className={styles.categoriesScroll}>
          {categories.map(category => (
            <button
              key={category}
              className={`${styles.categoryBtn} ${activeCategory === category ? styles.active : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category === 'all' ? 'All Items' : category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Menu Items */}
      <div className={styles.menuSection}>
        {filteredItems.length > 0 ? (
          <div className={styles.menuGrid}>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                className={styles.menuItem}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={styles.menuItemInfo}>
                  <h4>{item.name}</h4>
                  {item.description && (
                    <p className={styles.itemDescription}>{item.description}</p>
                  )}
                  <div className={styles.itemMeta}>
                    {item.is_vegetarian && <span className={styles.vegBadge}>🌱 Veg</span>}
                    {item.spicy_level > 0 && (
                      <span className={styles.spicyBadge}>
                        🌶️ Spicy {item.spicy_level}/3
                      </span>
                    )}
                  </div>
                  <div className={styles.itemPrice}>{formatKenyanPrice(item.price)}</div>
                </div>
                
                <div className={styles.menuItemActions}>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className={styles.itemImage} />
                  )}
                  <button 
                    className={styles.addBtn}
                    onClick={() => addToCart(item)}
                  >
                    <FaPlus />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyMenu}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>No items in this category</h3>
            <p>Try selecting a different category</p>
          </div>
        )}
      </div>
      
      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <motion.button
          className={styles.floatingCart}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCartModal(true)}
        >
          <FaShoppingCart />
          <span className={styles.floatingCartCount}>{cart.length}</span>
          <span className={styles.floatingCartTotal}>{formatKenyanPrice(getTotalPrice() + (restaurant.delivery_fee || 0))}</span>
        </motion.button>
      )}
      
      {/* Bottom Spacing for Navigation */}
      <div className={styles.bottomSpacing} />
    </div>
  );
};

export default RestaurantDetailPage;