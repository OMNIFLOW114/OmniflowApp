// src/pages/CampusNearbyRestaurants.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaHeart, FaMapMarkerAlt, FaUtensils, FaClock, FaFilter, FaPhone
} from "react-icons/fa";
import styles from "./CampusNearbyRestaurants.module.css";

const CampusNearbyRestaurants = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCampus, setFilterCampus] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [userCampus, setUserCampus] = useState("");

  useEffect(() => {
    loadUserCampus();
  }, [user]);

  useEffect(() => {
    loadRestaurants();
    loadCampuses();
  }, [filterCampus]);

  const loadUserCampus = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('student_campus_profiles')
        .select('campus_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setUserCampus(data.campus_name);
        setFilterCampus(data.campus_name);
      }
    } catch (error) {
      console.error('Error loading campus:', error);
    }
  };

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campus_restaurants')
        .select('*')
        .eq('is_active', true);
      
      if (filterCampus) {
        query = query.eq('campus_name', filterCampus);
      }
      
      const { data, error } = await query
        .order('rating', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const loadCampuses = async () => {
    try {
      const { data } = await supabase
        .from('campus_restaurants')
        .select('campus_name')
        .not('campus_name', 'is', null);
      
      const uniqueCampuses = [...new Set(data?.map(item => item.campus_name).filter(Boolean))];
      setCampuses(uniqueCampuses);
    } catch (error) {
      console.error('Error loading campuses:', error);
    }
  };

  const RestaurantCard = ({ restaurant }) => (
    <motion.div
      className={styles.restaurantCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/restaurant/${restaurant.id}`)}
    >
      <div className={styles.cardImage}>
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={restaurant.name} />
        ) : (
          <div className={styles.imagePlaceholder}>🍔</div>
        )}
        <div className={styles.ratingBadge}>
          <FaStar /> {restaurant.rating || 'New'}
        </div>
        <button className={styles.favoriteBtn} onClick={(e) => { e.stopPropagation(); toast.success("Added to favorites"); }}>
          <FaHeart />
        </button>
      </div>
      <div className={styles.cardInfo}>
        <h4 className={styles.restaurantName}>{restaurant.name}</h4>
        <p className={styles.cuisine}>{restaurant.cuisine_type || "Various Cuisine"}</p>
        <div className={styles.restaurantDetails}>
          <span><FaClock /> {restaurant.delivery_time_range || '20-30 min'}</span>
          <span><FaMapMarkerAlt /> {restaurant.campus_name}</span>
        </div>
        <div className={styles.orderInfo}>
          <span className={styles.minOrder}>Min: KSh {restaurant.min_order_amount || 0}</span>
          <span className={styles.deliveryFee}>
            {restaurant.delivery_fee === 0 ? 'Free Delivery' : `Delivery: KSh ${restaurant.delivery_fee}`}
          </span>
        </div>
        {restaurant.special_offers?.length > 0 && (
          <div className={styles.specialOffer}>
            🎉 {restaurant.special_offers[0]}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Nearby Restaurants</h1>
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
        ) : restaurants.length > 0 ? (
          <>
            <div className={styles.resultsHeader}>
              <span><FaUtensils /> {restaurants.length} restaurants near you</span>
              {userCampus && (
                <span className={styles.campusNote}>Showing results for {userCampus}</span>
              )}
            </div>
            <div className={styles.restaurantsGrid}>
              {restaurants.map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>No restaurants found</h3>
            <p>Be the first to start a food business on campus!</p>
            <button onClick={() => navigate('/student/start-restaurant')}>Start a Restaurant</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CampusNearbyRestaurants;