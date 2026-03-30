// src/pages/StudentMarketplace.jsx - FINAL UPDATED VERSION
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import { 
  FaFire, FaStar, FaSearch, FaClock, FaBolt, 
  FaHeart, FaBell, FaUniversity, FaMapMarkerAlt,
  FaUser, FaArrowRight, FaTag, FaGem, FaCrown, 
  FaChevronLeft, FaChevronRight, FaPlus, FaMoon, FaSun,
  FaStore, FaUtensils, FaGraduationCap, FaLaptop, FaBook, FaTshirt,
  FaMobile, FaHeadphones, FaGamepad, FaCamera, FaStopwatch
} from "react-icons/fa";
import styles from "./StudentMarketplace.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const StudentMarketplace = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  
  // State Management
  const [userProfile, setUserProfile] = useState(null);
  const [campusProfile, setCampusProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Data States
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [campusDeals, setCampusDeals] = useState([]);
  const [error, setError] = useState(null);
  
  // UI States
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const categoriesScrollRef = useRef(null);
  const scrollRefs = {
    flash: useRef(null),
    trending: useRef(null),
    recommended: useRef(null),
    restaurants: useRef(null),
    services: useRef(null)
  };

  // Categories - All categories for horizontal scroll
  const categories = [
    { id: "textbooks", name: "Textbooks", icon: <FaBook />, color: "#10B981" },
    { id: "electronics", name: "Electronics", icon: <FaLaptop />, color: "#3B82F6" },
    { id: "clothing", name: "Clothing", icon: <FaTshirt />, color: "#EF4444" },
    { id: "food", name: "Food", icon: <FaUtensils />, color: "#F59E0B" },
    { id: "services", name: "Services", icon: <FaGraduationCap />, color: "#8B5CF6" },
    { id: "phones", name: "Phones", icon: <FaMobile />, color: "#EC4899" },
    { id: "accessories", name: "Accessories", icon: <FaHeadphones />, color: "#06B6D4" },
    { id: "gaming", name: "Gaming", icon: <FaGamepad />, color: "#84CC16" },
    { id: "cameras", name: "Cameras", icon: <FaCamera />, color: "#F97316" },
    { id: "watches", name: "Watches", icon: <FaStopwatch />, color: "#A855F7" },
    { id: "furniture", name: "Furniture", icon: "🛋️", color: "#14B8A6" },
    { id: "sports", name: "Sports", icon: "⚽", color: "#EAB308" }
  ];

  // Hero Banners
  const heroBanners = [
    {
      id: 1,
      title: "Back to Campus Sale",
      subtitle: "Up to 50% off on textbooks & electronics",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800",
      cta: "Shop Now",
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
      id: 2,
      title: "Campus Food Festival",
      subtitle: "Get KSh 100 off your first food order",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      cta: "Order Food",
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    },
    {
      id: 3,
      title: "Earn While You Learn",
      subtitle: "Start your side hustle today",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
      cta: "Start Earning",
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    }
  ];

  // Auto-scroll hero banners
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (profileData) {
        setUserProfile(profileData);
      } else {
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "Student",
          email: user.email,
          profile_completed: false
        };
        await supabase.from('profiles').insert([newProfile]);
        setUserProfile(newProfile);
      }
      
      const { data: campusData } = await supabase
        .from('student_campus_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (campusData) {
        setCampusProfile(campusData);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setError("Unable to load profile");
    }
  }, [user]);

  // Load marketplace data
  const loadMarketplaceData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      const [
        productsRes,
        restaurantsRes,
        servicesRes,
        dealsRes
      ] = await Promise.all([
        supabase
          .from('campus_products')
          .select('*')
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('campus_restaurants')
          .select('*')
          .eq('is_active', true)
          .order('rating', { ascending: false, nullsLast: true })
          .limit(8),
        supabase
          .from('student_services')
          .select('*')
          .eq('is_active', true)
          .order('total_orders', { ascending: false, nullsLast: true })
          .limit(8),
        supabase
          .from('campus_deals')
          .select('*')
          .eq('is_active', true)
          .gte('valid_until', new Date().toISOString())
          .limit(6)
      ]);
      
      const allProducts = productsRes.data || [];
      
      setTrendingProducts([...allProducts].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10));
      setRecommendedProducts(allProducts.slice(0, 12));
      setFeaturedProducts([...allProducts].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 8));
      setFlashSales([...allProducts].filter(p => p.price > 5000).slice(0, 6));
      setNearbyRestaurants(restaurantsRes.data || []);
      setPopularServices(servicesRes.data || []);
      setCampusDeals(dealsRes.data || []);
      
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      setError("Failed to load marketplace");
      toast.error("Failed to load marketplace");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    if (userProfile) {
      loadMarketplaceData();
    }
  }, [loadMarketplaceData, userProfile]);

  // Scroll handlers for categories
  const scrollCategories = (direction) => {
    if (categoriesScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      categoriesScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Scroll handlers for sections
  const scrollHorizontal = (ref, direction) => {
    if (ref?.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Navigation handlers - CORRECTED REDIRECTS
  const handleCategoryClick = (categoryId, categoryName) => {
    navigate(`/student/category/${categoryId}`, { state: { categoryName, categoryId } });
  };

  const handleSeeAllClick = (section) => {
    // Map section names to correct routes
    const sectionRoutes = {
      'flash-sales': '/student/campus-flash-sales',
      'trending': '/student/campus-trending-now',
      'recommended': '/student/campus-recommended',
      'restaurants': '/student/campus-nearby-restaurants',
      'services': '/student/campus-popular-services',
      'deals': '/student/campus-deals'
    };
    
    const route = sectionRoutes[section];
    if (route) {
      navigate(route);
    } else {
      // Fallback for any other sections
      navigate(`/student/${section}`);
    }
  };

  const handleSearchClick = () => {
    navigate('/student/campus-search');
  };

  // Loading Skeleton
  const SkeletonLoader = () => (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTopNav}>
          <div className={styles.skeletonCircle}></div>
          <div className={styles.skeletonCampusBadge}></div>
          <div className={styles.skeletonCircle}></div>
          <div className={styles.skeletonCircle}></div>
        </div>
        <div className={styles.skeletonSearchBar}></div>
      </div>
      <div className={styles.skeletonHero}></div>
      <div className={styles.skeletonCategories}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className={styles.skeletonCategory}></div>
        ))}
      </div>
      <div className={styles.skeletonSection}>
        <div className={styles.skeletonSectionHeader}></div>
        <div className={styles.skeletonHorizontal}>
          {[1,2,3,4].map(i => (
            <div key={i} className={styles.skeletonCard}></div>
          ))}
        </div>
      </div>
    </div>
  );

  // Product Card Component - WITH KENYAN PRICE FORMATTING
  const ProductCard = ({ product, variant = 'default' }) => (
    <motion.div
      className={`${styles.productCard} ${variant === 'flash' ? styles.flash : ''}`}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={() => navigate(`/student/product/${product.id}`)}
    >
      <div className={styles.productImageContainer}>
        {variant === 'flash' && <span className={styles.discountBadge}>FLASH</span>}
        {product.images && product.images[0] ? (
          <img src={product.images[0]} alt={product.title} loading="lazy" />
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
      <div className={styles.productInfo}>
        <h4 className={styles.productTitle}>{product.title}</h4>
        <div className={styles.productRating}>
          <FaStar className={styles.starIcon} />
          <span>{product.view_count || 0} views</span>
        </div>
        <div className={styles.productPrice}>{formatKenyanPrice(product.price)}</div>
        <div className={styles.productLocation}>
          <FaMapMarkerAlt className={styles.locationIcon} />
          <span>{product.campus_name || "Campus"}</span>
        </div>
      </div>
    </motion.div>
  );

  // Restaurant Card - WITH KENYAN PRICE FORMATTING
  const RestaurantCard = ({ restaurant }) => (
    <motion.div
      className={styles.restaurantCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/restaurant/${restaurant.id}`)}
    >
      <div className={styles.restaurantImage}>
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={restaurant.name} />
        ) : (
          <div className={styles.imagePlaceholder}>🍔</div>
        )}
        <div className={styles.restaurantRating}><FaStar /> {restaurant.rating || 'New'}</div>
      </div>
      <div className={styles.restaurantInfo}>
        <h4>{restaurant.name}</h4>
        <p className={styles.cuisine}>{restaurant.cuisine_type || "Various Cuisine"}</p>
        <div className={styles.deliveryInfo}>
          <FaClock /> {restaurant.delivery_time_range || '20-30 min'}
          <span className={styles.deliveryFee}>
            {restaurant.delivery_fee === 0 ? 'Free' : formatKenyanPrice(restaurant.delivery_fee || 50)}
          </span>
        </div>
      </div>
    </motion.div>
  );

  // Service Card - WITH KENYAN PRICE FORMATTING
  const ServiceCard = ({ service }) => {
    const formatServicePrice = () => {
      if (service.price_range) return service.price_range;
      if (service.price_amount) return formatKenyanPrice(service.price_amount);
      return 'KSh 500';
    };
    
    return (
      <motion.div
        className={styles.serviceCard}
        whileHover={{ y: -4 }}
        onClick={() => navigate(`/student/service/${service.id}`)}
      >
        <div className={styles.serviceIcon}>
          {service.category === 'academic' ? '📚' : service.category === 'technical' ? '💻' : '🔧'}
        </div>
        <div className={styles.serviceInfo}>
          <h4>{service.title}</h4>
          <p>{service.description?.substring(0, 60)}...</p>
          <div className={styles.serviceFooter}>
            <span className={styles.servicePrice}>{formatServicePrice()}</span>
            <span className={styles.serviceOrders}>{service.total_orders || 0} orders</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // Scroll Section Component
  const ScrollSection = ({ title, icon, items, renderItem, seeAllLink, scrollKey }) => (
    <section className={styles.scrollSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.titleWrapper}>
          {icon && <span className={styles.sectionIcon}>{icon}</span>}
          <h2>{title}</h2>
        </div>
        <div className={styles.sectionActions}>
          <button className={styles.scrollBtn} onClick={() => scrollHorizontal(scrollRefs[scrollKey], 'left')}>
            <FaChevronLeft />
          </button>
          <button className={styles.scrollBtn} onClick={() => scrollHorizontal(scrollRefs[scrollKey], 'right')}>
            <FaChevronRight />
          </button>
          {seeAllLink && (
            <button className={styles.seeAllLink} onClick={() => handleSeeAllClick(seeAllLink)}>
              See All <FaArrowRight />
            </button>
          )}
        </div>
      </div>
      <div className={styles.horizontalScroll} ref={scrollRefs[scrollKey]}>
        {items.length > 0 ? items.map(item => renderItem(item)) : (
          <div className={styles.emptyScroll}><p>No items available</p></div>
        )}
      </div>
    </section>
  );

  if (loading) return <SkeletonLoader />;

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.topNav}>
          <button className={styles.profileIcon} onClick={() => navigate('/student/profile')}>
            <FaUser />
          </button>
          
          <div className={styles.campusDisplay}>
            <FaUniversity />
            <span>{campusProfile?.campus_name?.split(' ').slice(0, 2).join(' ') || 'Select Campus'}</span>
          </div>
          
          <div className={styles.headerRight}>
            <button className={styles.themeToggle} onClick={toggleDarkMode}>
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className={styles.notificationIcon} onClick={() => navigate('/student/notifications')}>
              <FaBell />
              <span className={styles.notificationBadge}>3</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchBar} onClick={handleSearchClick}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search products, services, restaurants..."
              value={searchQuery}
              readOnly
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Banner */}
        <section className={styles.heroSection}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHeroIndex}
              className={styles.heroBanner}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              style={{ background: heroBanners[activeHeroIndex].color }}
            >
              <div className={styles.heroContent}>
                <h1>{heroBanners[activeHeroIndex].title}</h1>
                <p>{heroBanners[activeHeroIndex].subtitle}</p>
                <button className={styles.heroCta}>
                  {heroBanners[activeHeroIndex].cta} <FaArrowRight />
                </button>
              </div>
              <div className={styles.heroImage}>
                <img src={heroBanners[activeHeroIndex].image} alt="Hero" />
              </div>
            </motion.div>
          </AnimatePresence>
          <div className={styles.heroIndicators}>
            {heroBanners.map((_, idx) => (
              <button
                key={idx}
                className={`${styles.indicator} ${activeHeroIndex === idx ? styles.active : ''}`}
                onClick={() => setActiveHeroIndex(idx)}
              />
            ))}
          </div>
        </section>

        {/* Categories - Horizontally Scrollable */}
        <section className={styles.categoriesSection}>
          <div className={styles.categoriesScroll} ref={categoriesScrollRef}>
            {categories.map(category => (
              <motion.button
                key={category.id}
                className={styles.categoryChip}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryClick(category.id, category.name)}
              >
                <span className={styles.categoryIcon} style={{ color: category.color }}>
                  {category.icon}
                </span>
                <span className={styles.categoryName}>{category.name}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Flash Sales */}
        {flashSales.length > 0 && (
          <ScrollSection
            title="Flash Sales"
            icon={<FaBolt />}
            items={flashSales}
            renderItem={(item) => <ProductCard key={item.id} product={item} variant="flash" />}
            seeAllLink="flash-sales"
            scrollKey="flash"
          />
        )}

        {/* Trending Now */}
        <ScrollSection
          title="Trending Now"
          icon={<FaFire />}
          items={trendingProducts}
          renderItem={(item) => <ProductCard key={item.id} product={item} />}
          seeAllLink="trending"
          scrollKey="trending"
        />

        {/* Deals Banner */}
        {campusDeals.length > 0 && (
          <section className={styles.dealsBannerSection}>
            <div className={styles.dealsBanner}>
              <div className={styles.dealsContent}>
                <div className={styles.dealsTag}><FaTag /> Limited Time Offers</div>
                <h2>Exclusive Campus Deals</h2>
                <p>Special discounts for students only</p>
                <button onClick={() => handleSeeAllClick('deals')}>
                  View All Deals <FaArrowRight />
                </button>
              </div>
              <div className={styles.dealsCountdown}>
                <div className={styles.countdownItem}><span>24</span><label>Hours</label></div>
                <div className={styles.countdownItem}><span>59</span><label>Mins</label></div>
                <div className={styles.countdownItem}><span>59</span><label>Secs</label></div>
              </div>
            </div>
          </section>
        )}

        {/* Recommended for You */}
        <ScrollSection
          title="Recommended for You"
          icon={<FaGem />}
          items={recommendedProducts}
          renderItem={(item) => <ProductCard key={item.id} product={item} />}
          seeAllLink="recommended"
          scrollKey="recommended"
        />

        {/* Nearby Restaurants */}
        <ScrollSection
          title="Nearby Restaurants"
          icon={<FaUtensils />}
          items={nearbyRestaurants}
          renderItem={(item) => <RestaurantCard key={item.id} restaurant={item} />}
          seeAllLink="restaurants"
          scrollKey="restaurants"
        />

        {/* Popular Services */}
        <ScrollSection
          title="Popular Services"
          icon={<FaGraduationCap />}
          items={popularServices}
          renderItem={(item) => <ServiceCard key={item.id} service={item} />}
          seeAllLink="services"
          scrollKey="services"
        />

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className={styles.featuredSection}>
            <div className={styles.sectionHeader}>
              <h2><FaCrown className={styles.crownIcon} /> Featured Products</h2>
            </div>
            <div className={styles.featuredGrid}>
              {featuredProducts.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <div className={styles.bottomSpacing} />
      </main>

      {/* FAB */}
      <motion.button
        className={styles.fabButton}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/student/sell-product')}
      >
        <FaPlus />
      </motion.button>
    </div>
  );
};

export default StudentMarketplace;