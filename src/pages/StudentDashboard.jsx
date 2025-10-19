// src/pages/StudentMarketplace.jsx - FIXED VERSION
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaStore, FaUtensils, FaMotorcycle, FaGraduationCap, 
  FaMoneyBillWave, FaGem, FaFire, FaStar, FaShoppingCart,
  FaSearch, FaFilter, FaClock, FaBolt, FaCoins, FaRocket,
  FaTshirt, FaLaptop, FaBook, FaHome, FaGamepad, FaMusic,
  FaHeart, FaBell, FaCrown, FaTrophy, FaShippingFast,
  FaUniversity, FaUsers, FaRegCompass, FaPlus, FaMapMarkerAlt,
  FaExclamationTriangle, FaUser
} from "react-icons/fa";
import "./StudentMarketplace.css";

const StudentMarketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("marketplace");
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketplaceData, setMarketplaceData] = useState({
    campusProducts: [],
    campusRestaurants: [],
    studentServices: [],
    campusDeals: [],
    trendingOpportunities: []
  });
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRestaurants: 0,
    totalServices: 0,
    activeDeals: 0
  });

  // Enhanced error handling
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadUserProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (userProfile) {
      loadMarketplaceData();
    }
  }, [userProfile, activeTab]);

  const loadUserProfile = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // First, try to get the user's profile from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to handle no rows
      
      if (profileError) throw profileError;
      
      if (profileData) {
        setUserProfile(profileData);
        
        // If profile exists but isn't completed, show a gentle reminder
        if (!profileData.profile_completed) {
          setError("Complete your profile to unlock all features");
        }
      } else {
        // If no profile exists, create a basic one
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "Student",
          email: user.email,
          profile_completed: false
        };
        
        // Insert the basic profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile]);
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
        
        setUserProfile(newProfile);
        setError("Welcome! Complete your profile to get started");
      }
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError("Unable to load profile information");
      // Set a fallback profile to prevent crashes
      setUserProfile({
        id: user.id,
        full_name: "Student",
        email: user.email,
        profile_completed: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Get campus from user's profile or use a default
  const getUserCampus = () => {
    // You can modify this logic based on where you store campus info in profiles
    // For now, using a default campus or city as campus
    return userProfile?.city || "University of Nairobi"; // Default campus
  };

  const loadMarketplaceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const campusName = getUserCampus();

      // Don't load data if campus isn't selected
      if (!campusName || campusName === "Select Campus") {
        setMarketplaceData({
          campusProducts: [],
          campusRestaurants: [],
          studentServices: [],
          campusDeals: [],
          trendingOpportunities: []
        });
        setStats({ totalProducts: 0, totalRestaurants: 0, totalServices: 0, activeDeals: 0 });
        return;
      }

      // Load products for user's campus
      const { data: products, error: productsError } = await supabase
        .from('campus_products')
        .select('*')
        .eq('campus_name', campusName)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(8);

      if (productsError) throw productsError;

      // Load restaurants for user's campus
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('campus_restaurants')
        .select('*')
        .eq('campus_name', campusName)
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (restaurantsError) throw restaurantsError;

      // Load services for user's campus
      const { data: services, error: servicesError } = await supabase
        .from('student_services')
        .select('*')
        .eq('campus_name', campusName)
        .eq('is_active', true)
        .order('total_orders', { ascending: false })
        .limit(6);

      if (servicesError) throw servicesError;

      // Load campus deals
      const { data: deals, error: dealsError } = await supabase
        .from('campus_deals')
        .select('*')
        .eq('campus_name', campusName)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .limit(4);

      if (dealsError) throw dealsError;

      // Load stats
      const { count: productsCount, error: productsCountError } = await supabase
        .from('campus_products')
        .select('*', { count: 'exact', head: true })
        .eq('campus_name', campusName)
        .eq('status', 'available');

      if (productsCountError) throw productsCountError;

      const { count: restaurantsCount, error: restaurantsCountError } = await supabase
        .from('campus_restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('campus_name', campusName)
        .eq('is_active', true);

      if (restaurantsCountError) throw restaurantsCountError;

      const { count: servicesCount, error: servicesCountError } = await supabase
        .from('student_services')
        .select('*', { count: 'exact', head: true })
        .eq('campus_name', campusName)
        .eq('is_active', true);

      if (servicesCountError) throw servicesCountError;

      const { count: dealsCount, error: dealsCountError } = await supabase
        .from('campus_deals')
        .select('*', { count: 'exact', head: true })
        .eq('campus_name', campusName)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString());

      if (dealsCountError) throw dealsCountError;

      setMarketplaceData({
        campusProducts: products || [],
        campusRestaurants: restaurants || [],
        studentServices: services || [],
        campusDeals: deals || [],
        trendingOpportunities: [
          {
            id: 1,
            name: "Assignment Help",
            category: "Academic",
            earnings: "KSh 500-2,000",
            students: "1.2k",
            icon: "📝",
            demand: "High"
          },
          {
            id: 2,
            name: "Code Mentorship",
            category: "Tech Skills",
            earnings: "KSh 1,000-5,000",
            students: "2.4k",
            icon: "💻",
            demand: "Very High"
          }
        ]
      });

      setStats({
        totalProducts: productsCount || 0,
        totalRestaurants: restaurantsCount || 0,
        totalServices: servicesCount || 0,
        activeDeals: dealsCount || 0
      });

    } catch (error) {
      console.error('Error loading marketplace data:', error);
      setError("Failed to load marketplace data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const businessCategories = [
    { 
      title: "Sell Products", 
      icon: <FaStore />, 
      desc: "Start your campus shop", 
      color: "#10B981", 
      earnings: "KSh 1K-50K/mo",
      route: "/student/sell-product"
    },
    { 
      title: "Food Business", 
      icon: <FaUtensils />, 
      desc: "Cook & earn big", 
      color: "#EF4444", 
      earnings: "KSh 5K-100K/mo",
      route: "/student/start-restaurant"
    },
    { 
      title: "Delivery Agent", 
      icon: <FaMotorcycle />, 
      desc: "Flexible delivery jobs", 
      color: "#3B82F6", 
      earnings: "KSh 3K-25K/mo",
      route: "/student/become-delivery-agent"
    },
    { 
      title: "Tutoring", 
      icon: <FaGraduationCap />, 
      desc: "Teach your strong subjects", 
      color: "#8B5CF6", 
      earnings: "KSh 2K-30K/mo",
      route: "/student/offer-service"
    },
    { 
      title: "Freelance", 
      icon: <FaCoins />, 
      desc: "Design, write, code", 
      color: "#F59E0B", 
      earnings: "KSh 4K-50K/mo",
      route: "/student/freelance"
    },
    { 
      title: "Event Planning", 
      icon: <FaRocket />, 
      desc: "Organize campus events", 
      color: "#EC4899", 
      earnings: "KSh 5K-100K/mo",
      route: "/student/event-planning"
    }
  ];

  const quickActions = [
    {
      label: "Sell Item",
      icon: <FaRocket />,
      route: "/student/sell-product",
      type: "primary"
    },
    {
      label: "Track Order", 
      icon: <FaShippingFast />,
      route: "/student/orders",
      type: "secondary"
    },
    {
      label: "My Earnings",
      icon: <FaTrophy />,
      route: "/student/earnings",
      type: "secondary"
    },
    {
      label: "My Profile",
      icon: <FaUser />,
      route: "/student/profile",
      type: "secondary"
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log("Searching for:", searchQuery);
    }
  };

  const ProductCard = ({ product }) => (
    <motion.div
      key={product.id}
      className="product-card premium"
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={() => navigate(`/student/product/${product.id}`)}
    >
      <div className="product-image">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.title} />
        ) : (
          <div className="placeholder-image">
            {product.category === 'textbooks' ? '📚' : 
             product.category === 'electronics' ? '💻' : 
             product.category === 'clothing' ? '👕' : '🛒'}
          </div>
        )}
      </div>
      
      <div className="product-content">
        <h4 className="product-name">{product.title}</h4>
        <p className="product-price">KSh {product.price?.toLocaleString()}</p>
        
        <div className="product-meta">
          <span className="condition">{product.condition}</span>
          <span className="rating">
            <FaStar /> {product.view_count || 0}
          </span>
        </div>
        
        <div className="product-footer">
          <span className="campus-tag">
            <FaMapMarkerAlt /> {product.campus_name}
          </span>
          <span className="delivery">Pickup</span>
        </div>
        
        <div className="product-actions">
          <motion.button 
            className="like-btn"
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              // Add to favorites logic
            }}
          >
            <FaHeart /> {product.like_count || 0}
          </motion.button>
          <motion.button 
            className="buy-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/student/product/${product.id}`);
            }}
          >
            View Details
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  const RestaurantCard = ({ restaurant }) => (
    <motion.div
      key={restaurant.id}
      className="restaurant-card premium"
      whileHover={{ y: -5 }}
      onClick={() => navigate(`/student/restaurant/${restaurant.id}`)}
    >
      <div className="restaurant-header">
        <div className="restaurant-image">
          {restaurant.cover_image_url ? (
            <img src={restaurant.cover_image_url} alt={restaurant.name} />
          ) : (
            <div className="placeholder-image">
              {restaurant.cuisine_type?.includes('Pizza') ? '🍕' : 
               restaurant.cuisine_type?.includes('Burger') ? '🍔' : '🍛'}
            </div>
          )}
        </div>
        <div className="restaurant-info">
          <h4>{restaurant.name}</h4>
          <p className="cuisine">{restaurant.cuisine_type}</p>
          <div className="rating-delivery">
            <span className="rating">⭐ {restaurant.rating || 'New'}</span>
            <span className="delivery-time">
              <FaClock /> {restaurant.delivery_time_range}
            </span>
          </div>
        </div>
      </div>
      
      {restaurant.special_offers && restaurant.special_offers.length > 0 && (
        <div className="restaurant-special">
          <FaBolt className="bolt-icon" />
          <span>{restaurant.special_offers[0]}</span>
        </div>
      )}
      
      <div className="restaurant-actions">
        <span className="min-order">Min: KSh {restaurant.min_order_amount}</span>
        <motion.button 
          className="order-now-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Order Now
        </motion.button>
      </div>
    </motion.div>
  );

  const ServiceCard = ({ service }) => (
    <motion.div
      key={service.id}
      className="service-card premium"
      whileHover={{ y: -5 }}
      onClick={() => navigate(`/student/service/${service.id}`)}
    >
      <div className="service-icon">
        {service.category === 'academic' ? '📚' : 
         service.category === 'technical' ? '💻' : 
         service.category === 'creative' ? '🎨' : '🔧'}
      </div>
      <div className="service-content">
        <h4>{service.title}</h4>
        <p className="service-desc">{service.description?.substring(0, 100)}...</p>
        <div className="service-meta">
          <span className="price">{service.price_range || `KSh ${service.price_amount}`}</span>
          <span className="rating">⭐ {service.rating || 'New'}</span>
        </div>
        <div className="service-tags">
          {service.tags?.slice(0, 2).map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const EmptyState = ({ icon, title, description, buttonText, onButtonClick }) => (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {buttonText && (
        <motion.button 
          className="primary-btn"
          whileHover={{ scale: 1.05 }}
          onClick={onButtonClick}
        >
          {buttonText}
        </motion.button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="loading-spinner"
        />
        <p>Loading Marketplace...</p>
      </div>
    );
  }

  return (
    <div className="student-marketplace premium-ui">
      {/* Premium Header */}
      <header className="premium-header">
        <div className="header-main">
          <div className="header-left">
            <motion.div 
              className="campus-badge"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/student/profile')}
            >
              <FaUniversity />
              <span>{getUserCampus()}</span>
            </motion.div>
          </div>
          
          <div className="header-center">
            <h1 className="app-title">
              <FaFire className="fire-icon" />
              Comrade<span className="highlight">Market</span>
            </h1>
            <p className="app-tagline">Kenya's #1 Campus Lifestyle App</p>
          </div>

          <div className="header-right">
            <motion.button 
              className="icon-btn notification-btn" 
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/student/notifications')}
            >
              <FaBell />
              <span className="notification-badge">3</span>
            </motion.button>
            <motion.button 
              className="icon-btn" 
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/student/favorites')}
            >
              <FaHeart />
            </motion.button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-number">{stats.totalProducts}</span>
            <span className="stat-label">Products</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalRestaurants}</span>
            <span className="stat-label">Restaurants</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalServices}</span>
            <span className="stat-label">Services</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.activeDeals}</span>
            <span className="stat-label">Deals</span>
          </div>
        </div>

        {/* Mega Search */}
        <form onSubmit={handleSearch} className="mega-search">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder={`Search in ${getUserCampus()}...`}
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <motion.button 
              type="button"
              className="filter-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFilter />
            </motion.button>
          </div>
        </form>
      </header>

      {/* Error Banner */}
      {error && (
        <motion.div 
          className="error-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FaExclamationTriangle />
          <span>{error}</span>
          <button onClick={() => {
            if (error.includes("profile")) {
              navigate('/student/profile');
            } else {
              loadMarketplaceData();
            }
          }}>
            {error.includes("profile") ? "Complete Profile" : "Retry"}
          </button>
        </motion.div>
      )}

      {/* Navigation Tabs - Premium */}
      <nav className="premium-tabs">
        {[
          { id: "marketplace", label: "Marketplace", icon: <FaStore />, badge: stats.totalProducts },
          { id: "food", label: "Campus Food", icon: <FaUtensils />, badge: stats.totalRestaurants },
          { id: "services", label: "Services", icon: <FaGem />, badge: stats.totalServices },
          { id: "earn", label: "Make Money", icon: <FaMoneyBillWave />, badge: "HOT" }
        ].map(tab => (
          <motion.button
            key={tab.id}
            className={`premium-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="tab-icon">{tab.icon}</div>
            <span className="tab-label">{tab.label}</span>
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </motion.button>
        ))}
      </nav>

      {/* Quick Actions */}
      <section className="quick-actions">
        {quickActions.map((action, index) => (
          <motion.button
            key={index}
            className={`action-btn ${action.type}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(action.route)}
          >
            {action.icon}
            <span>{action.label}</span>
          </motion.button>
        ))}
      </section>

      {/* Main Content with Bottom Navigation Spacing */}
      <main className="main-content-with-nav">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="tab-content-container"
          >
            {/* MARKETPLACE TAB */}
            {activeTab === 'marketplace' && (
              <div className="tab-content">
                <section className="featured-section premium">
                  <div className="section-header premium">
                    <div className="title-group">
                      <h2>🔥 Trending in {getUserCampus()}</h2>
                      <p>Most wanted items on campus right now</p>
                    </div>
                    <motion.button 
                      className="see-all-btn" 
                      whileHover={{ x: 5 }}
                      onClick={() => navigate('/student/products')}
                    >
                      See All <FaRegCompass />
                    </motion.button>
                  </div>

                  <div className="featured-grid">
                    {marketplaceData.campusProducts.length > 0 ? (
                      marketplaceData.campusProducts.map((product, index) => (
                        <ProductCard key={product.id} product={product} />
                      ))
                    ) : (
                      <EmptyState
                        icon="🛒"
                        title="No products yet"
                        description="Be the first to sell something on campus!"
                        buttonText="Sell Your First Item"
                        onButtonClick={() => navigate('/student/sell-product')}
                      />
                    )}
                  </div>
                </section>

                {/* Campus Deals */}
                {marketplaceData.campusDeals.length > 0 && (
                  <section className="deals-section premium">
                    <div className="section-header premium">
                      <h2>🎯 Campus Exclusive Deals</h2>
                      <motion.button className="see-all-btn" whileHover={{ x: 5 }}>
                        All Deals <FaRegCompass />
                      </motion.button>
                    </div>
                    <div className="deals-grid">
                      {marketplaceData.campusDeals.map(deal => (
                        <motion.div
                          key={deal.id}
                          className="deal-card premium"
                          whileHover={{ scale: 1.03 }}
                        >
                          <div className="deal-badge">HOT DEAL</div>
                          <div className="deal-content">
                            <h4>{deal.title}</h4>
                            <p>{deal.description}</p>
                            <div className="deal-prices">
                              <span className="original-price">KSh {deal.original_price}</span>
                              <span className="deal-price">KSh {deal.deal_price}</span>
                            </div>
                            <span className="deal-campus">{deal.campus_name}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* FOOD TAB */}
            {activeTab === 'food' && (
              <div className="tab-content">
                <section className="food-section premium">
                  <div className="section-header premium">
                    <div className="title-group">
                      <h2>🍔 Campus Food Delivery</h2>
                      <p>Hot meals delivered to your hostel</p>
                    </div>
                    <motion.button 
                      className="see-all-btn" 
                      whileHover={{ x: 5 }}
                      onClick={() => navigate('/student/restaurants')}
                    >
                      All Restaurants <FaRegCompass />
                    </motion.button>
                  </div>

                  <div className="restaurants-grid">
                    {marketplaceData.campusRestaurants.length > 0 ? (
                      marketplaceData.campusRestaurants.map(restaurant => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                      ))
                    ) : (
                      <EmptyState
                        icon="🍔"
                        title="No restaurants yet"
                        description="Start a food business on campus!"
                        buttonText="Start Food Business"
                        onButtonClick={() => navigate('/student/start-restaurant')}
                      />
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* SERVICES TAB */}
            {activeTab === 'services' && (
              <div className="tab-content">
                <section className="services-section premium">
                  <div className="section-header premium">
                    <div className="title-group">
                      <h2>🔧 Student Services</h2>
                      <p>Get help from fellow students</p>
                    </div>
                    <motion.button 
                      className="see-all-btn" 
                      whileHover={{ x: 5 }}
                      onClick={() => navigate('/student/services')}
                    >
                      All Services <FaRegCompass />
                    </motion.button>
                  </div>

                  <div className="services-grid">
                    {marketplaceData.studentServices.length > 0 ? (
                      marketplaceData.studentServices.map(service => (
                        <ServiceCard key={service.id} service={service} />
                      ))
                    ) : (
                      <EmptyState
                        icon="🔧"
                        title="No services yet"
                        description="Offer your skills to other students!"
                        buttonText="Offer a Service"
                        onButtonClick={() => navigate('/student/offer-service')}
                      />
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* EARN TAB */}
            {activeTab === 'earn' && (
              <div className="tab-content">
                <section className="earn-section premium">
                  <div className="section-header premium">
                    <div className="title-group">
                      <h2>💸 Make Serious Money on Campus</h2>
                      <p>Join thousands of students already earning</p>
                    </div>
                    <div className="earnings-preview">
                      <FaCoins className="coins-icon" />
                      <span>Start earning today!</span>
                    </div>
                  </div>

                  <div className="business-grid premium">
                    {businessCategories.map((business, index) => (
                      <motion.div
                        key={index}
                        className="business-card premium"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ 
                          y: -8, 
                          scale: 1.03,
                          boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
                        }}
                        style={{ borderTop: `4px solid ${business.color}` }}
                        onClick={() => navigate(business.route)}
                      >
                        <div className="business-header">
                          <div className="business-icon" style={{ color: business.color }}>
                            {business.icon}
                          </div>
                          <div className="business-earnings">
                            <span>{business.earnings}</span>
                          </div>
                        </div>
                        
                        <div className="business-content">
                          <h4>{business.title}</h4>
                          <p>{business.desc}</p>
                        </div>
                        
                        <motion.button 
                          className="start-earning-btn"
                          style={{ background: business.color }}
                          whileHover={{ 
                            scale: 1.05,
                            boxShadow: `0 8px 20px ${business.color}40`
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Start Earning <FaRocket />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <motion.button
        className="premium-fab"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/student/sell-product')}
      >
        <FaPlus />
      </motion.button>
    </div>
  );
};

export default StudentMarketplace;