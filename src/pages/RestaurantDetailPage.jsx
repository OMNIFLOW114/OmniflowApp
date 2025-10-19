// src/pages/RestaurantDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaStar, FaClock, FaShoppingCart,
  FaPhone, FaMapMarkerAlt, FaUtensils, FaBolt,
  FaPlus, FaMinus, FaWhatsapp
} from "react-icons/fa";
import "./RestaurantDetailPage.css";

const RestaurantDetailPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    loadRestaurantData();
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
    } finally {
      setLoading(false);
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
      alert("Please login to place an order");
      return;
    }
    navigate('/student/checkout', { 
      state: { 
        restaurant, 
        cart, 
        total: getTotalPrice() + (restaurant?.delivery_fee || 0) 
      } 
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading restaurant...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="error-screen">
        <h2>Restaurant not found</h2>
        <button onClick={() => navigate('/student/marketplace')}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="restaurant-detail-page">
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
        <h1>{restaurant.name}</h1>
        <div className="header-actions">
          <motion.button
            className="cart-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaShoppingCart />
            {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
          </motion.button>
        </div>
      </header>

      <div className="restaurant-content">
        {/* Restaurant Header */}
        <section className="restaurant-header">
          <div className="restaurant-cover">
            {restaurant.cover_image_url ? (
              <img src={restaurant.cover_image_url} alt={restaurant.name} />
            ) : (
              <div className="cover-placeholder">
                <FaUtensils />
              </div>
            )}
          </div>
          
          <div className="restaurant-info">
            <h2>{restaurant.name}</h2>
            <p className="cuisine">{restaurant.cuisine_type}</p>
            
            <div className="restaurant-meta">
              <div className="meta-item">
                <FaStar />
                <span>{restaurant.rating || 'New'} ({restaurant.total_ratings || 0})</span>
              </div>
              <div className="meta-item">
                <FaClock />
                <span>{restaurant.delivery_time_range}</span>
              </div>
              <div className="meta-item">
                <FaMapMarkerAlt />
                <span>{restaurant.location_description}</span>
              </div>
            </div>

            {restaurant.special_offers && restaurant.special_offers.length > 0 && (
              <div className="special-offers">
                <FaBolt />
                <span>{restaurant.special_offers[0]}</span>
              </div>
            )}
          </div>
        </section>

        {/* Menu Categories */}
        <section className="menu-categories">
          <div className="categories-scroll">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </section>

        {/* Menu Items */}
        <section className="menu-items">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <motion.div
                key={item.id}
                className="menu-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p className="item-description">{item.description}</p>
                  <div className="item-meta">
                    {item.is_vegetarian && <span className="veg-badge">Vegetarian</span>}
                    {item.spicy_level > 0 && (
                      <span className="spicy-badge">
                        Spicy {item.spicy_level}/3
                      </span>
                    )}
                  </div>
                  <div className="item-price">KSh {item.price}</div>
                </div>
                
                <div className="item-actions">
                  {item.image_url && (
                    <div className="item-image">
                      <img src={item.image_url} alt={item.name} />
                    </div>
                  )}
                  <motion.button
                    className="add-to-cart-btn"
                    onClick={() => addToCart(item)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaPlus />
                  </motion.button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="empty-menu">
              <p>No menu items available in this category.</p>
            </div>
          )}
        </section>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <motion.div
          className="cart-summary"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-total">KSh {item.price * item.quantity}</span>
                </div>
                <div className="quantity-controls">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <FaMinus />
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <FaPlus />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="cart-total">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>KSh {getTotalPrice()}</span>
            </div>
            <div className="total-line">
              <span>Delivery:</span>
              <span>KSh {restaurant.delivery_fee || 0}</span>
            </div>
            <div className="total-line grand-total">
              <span>Total:</span>
              <span>KSh {getTotalPrice() + (restaurant.delivery_fee || 0)}</span>
            </div>
            
            <motion.button
              className="checkout-btn"
              onClick={handleCheckout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Checkout
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;