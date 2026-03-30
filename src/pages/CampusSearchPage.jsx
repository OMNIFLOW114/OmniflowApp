// src/pages/CampusSearchPage.jsx - MODERN POWERFUL SEARCH
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaSearch, FaFilter, FaStar, FaHeart, 
  FaMapMarkerAlt, FaTimes, FaSlidersH, FaCheck,
  FaUniversity, FaStore, FaUtensils, FaGraduationCap,
  FaClock, FaTag, FaFire, FaBolt, FaCrown
} from "react-icons/fa";
import styles from "./CampusSearchPage.module.css";

const CampusSearchPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get search query from URL
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';
  
  // States
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState({
    products: [],
    restaurants: [],
    services: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    campus: "",
    minPrice: "",
    maxPrice: "",
    condition: "",
    sortBy: "relevance",
    category: ""
  });
  const [campuses, setCampuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userCampus, setUserCampus] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([
    "Textbooks", "Laptop", "Phone", "TV", "Calculator", "Shoes"
  ]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent
  const saveToRecent = (query) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Load user campus
  useEffect(() => {
    loadUserCampus();
  }, [user]);

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
        setFilters(prev => ({ ...prev, campus: data.campus_name }));
      }
    } catch (error) {
      console.error('Error loading campus:', error);
    }
  };

  // Load filter options
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [campusesRes, categoriesRes] = await Promise.all([
        supabase.from('campus_products').select('campus_name').not('campus_name', 'is', null),
        supabase.from('campus_products').select('category').not('category', 'is', null)
      ]);
      
      const uniqueCampuses = [...new Set(campusesRes.data?.map(item => item.campus_name).filter(Boolean))];
      const uniqueCategories = [...new Set(categoriesRes.data?.map(item => item.category).filter(Boolean))];
      
      setCampuses(uniqueCampuses);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  // Advanced search function with full-text search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    saveToRecent(searchQuery);
    
    try {
      // Create search terms for better matching
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 2);
      const searchPattern = `%${searchQuery.toLowerCase()}%`;
      
      // Advanced search for products with multiple matching strategies
      let productsQuery = supabase
        .from('campus_products')
        .select('*')
        .eq('status', 'available');
      
      // Intelligent search - matches title, description, tags, and category
      if (searchTerms.length > 0) {
        // Build OR conditions for multiple search terms
        const conditions = searchTerms.map(term => 
          `title.ilike.%${term}%,description.ilike.%${term}%,tags.cs.{${term}},category.ilike.%${term}%`
        ).join(',');
        
        productsQuery = productsQuery.or(conditions);
      } else {
        productsQuery = productsQuery.ilike('title', searchPattern);
      }
      
      // Apply filters
      if (filters.campus) {
        productsQuery = productsQuery.eq('campus_name', filters.campus);
      }
      
      if (filters.category) {
        productsQuery = productsQuery.eq('category', filters.category);
      }
      
      if (filters.minPrice) {
        productsQuery = productsQuery.gte('price', parseFloat(filters.minPrice));
      }
      
      if (filters.maxPrice) {
        productsQuery = productsQuery.lte('price', parseFloat(filters.maxPrice));
      }
      
      if (filters.condition) {
        productsQuery = productsQuery.eq('condition', filters.condition);
      }
      
      // Apply sorting with relevance scoring
      if (filters.sortBy === 'price_low') {
        productsQuery = productsQuery.order('price', { ascending: true });
      } else if (filters.sortBy === 'price_high') {
        productsQuery = productsQuery.order('price', { ascending: false });
      } else if (filters.sortBy === 'newest') {
        productsQuery = productsQuery.order('created_at', { ascending: false });
      } else if (filters.sortBy === 'popular') {
        productsQuery = productsQuery.order('view_count', { ascending: false });
      } else {
        // Relevance: sort by title match first, then view count
        productsQuery = productsQuery.order('created_at', { ascending: false });
      }
      
      // Search restaurants
      let restaurantsQuery = supabase
        .from('campus_restaurants')
        .select('*')
        .eq('is_active', true)
        .ilike('name', searchPattern);
      
      if (filters.campus) {
        restaurantsQuery = restaurantsQuery.eq('campus_name', filters.campus);
      }
      
      // Search services
      let servicesQuery = supabase
        .from('student_services')
        .select('*')
        .eq('is_active', true)
        .ilike('title', searchPattern);
      
      if (filters.campus) {
        servicesQuery = servicesQuery.eq('campus_name', filters.campus);
      }
      
      const [productsRes, restaurantsRes, servicesRes] = await Promise.all([
        productsQuery.limit(100),
        restaurantsQuery.limit(50),
        servicesQuery.limit(50)
      ]);
      
      // Process and sort products by relevance
      let products = productsRes.data || [];
      
      // Calculate relevance score for each product
      products = products.map(product => {
        let score = 0;
        const title = product.title?.toLowerCase() || '';
        const desc = product.description?.toLowerCase() || '';
        const tags = product.tags?.join(' ').toLowerCase() || '';
        const category = product.category?.toLowerCase() || '';
        
        // Exact match gets highest score
        if (title === searchQuery.toLowerCase()) score += 100;
        
        // Title contains search term
        searchTerms.forEach(term => {
          if (title.includes(term)) score += 20;
          if (desc.includes(term)) score += 5;
          if (tags.includes(term)) score += 8;
          if (category.includes(term)) score += 10;
        });
        
        // Boost popular items
        score += (product.view_count || 0) / 100;
        
        return { ...product, relevanceScore: score };
      });
      
      // Sort by relevance score
      products.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      setSearchResults({
        products: products,
        restaurants: restaurantsRes.data || [],
        services: servicesRes.data || []
      });
      
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Failed to search');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  // Initial search on mount
  useEffect(() => {
    if (initialQuery) {
      performSearch();
    }
  }, []);

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/student/campus-search?q=${encodeURIComponent(searchQuery)}`);
      performSearch();
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      campus: userCampus || "",
      minPrice: "",
      maxPrice: "",
      condition: "",
      sortBy: "relevance",
      category: ""
    });
  };

  // Product Card Component with better details
  const ProductCard = ({ product }) => (
    <motion.div
      className={styles.resultCard}
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
        {product.view_count > 100 && (
          <div className={styles.trendingBadge}>
            <FaFire /> Trending
          </div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <h4 className={styles.cardTitle}>{product.title}</h4>
        <div className={styles.cardPrice}>KSh {product.price?.toLocaleString()}</div>
        <div className={styles.cardMeta}>
          <FaMapMarkerAlt /> {product.campus_name}
          {product.condition && (
            <span className={styles.conditionBadge}>{product.condition}</span>
          )}
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.viewsCount}>{product.view_count || 0} views</span>
          {product.is_negotiable && (
            <span className={styles.negotiableBadge}>Negotiable</span>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Restaurant Card
  const RestaurantCard = ({ restaurant }) => (
    <motion.div
      className={styles.resultCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/restaurant/${restaurant.id}`)}
    >
      <div className={styles.cardImage}>
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={restaurant.name} />
        ) : (
          <div className={styles.imagePlaceholder}>🍔</div>
        )}
        {restaurant.special_offers?.length > 0 && (
          <div className={styles.offerBadge}>
            <FaBolt /> Special
          </div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <h4 className={styles.cardTitle}>{restaurant.name}</h4>
        <div className={styles.cardRating}>
          <FaStar /> {restaurant.rating || 'New'} ({restaurant.total_ratings || 0} ratings)
        </div>
        <div className={styles.cardMeta}>
          <FaMapMarkerAlt /> {restaurant.campus_name}
          <FaClock /> {restaurant.delivery_time_range || '20-30 min'}
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.deliveryFee}>
            {restaurant.delivery_fee === 0 ? 'Free Delivery' : `Delivery: KSh ${restaurant.delivery_fee}`}
          </span>
        </div>
      </div>
    </motion.div>
  );

  // Service Card
  const ServiceCard = ({ service }) => (
    <motion.div
      className={styles.resultCard}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/service/${service.id}`)}
    >
      <div className={styles.cardImage}>
        <div className={styles.imagePlaceholder}>
          {service.category === 'academic' ? '📚' : 
           service.category === 'technical' ? '💻' : '🔧'}
        </div>
        {service.total_orders > 50 && (
          <div className={styles.popularBadge}>
            <FaCrown /> Popular
          </div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <h4 className={styles.cardTitle}>{service.title}</h4>
        <div className={styles.cardPrice}>
          {service.price_range || `KSh ${service.price_amount}`}
        </div>
        <div className={styles.cardMeta}>
          <FaMapMarkerAlt /> {service.campus_name}
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.serviceOrders}>
            {service.total_orders || 0} orders completed
          </span>
          <span className={styles.rating}>
            <FaStar /> {service.rating || '5.0'}
          </span>
        </div>
      </div>
    </motion.div>
  );

  const getResultsCount = () => {
    const counts = {
      products: searchResults.products.length,
      restaurants: searchResults.restaurants.length,
      services: searchResults.services.length
    };
    return counts[activeTab];
  };

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInputWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search products, restaurants, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button type="button" className={styles.clearBtn} onClick={() => setSearchQuery("")}>
                <FaTimes />
              </button>
            )}
          </div>
          <button type="submit" className={styles.searchBtn}>Search</button>
        </form>
        <button className={styles.filterBtn} onClick={() => setShowFilters(!showFilters)}>
          <FaSlidersH />
        </button>
      </header>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className={styles.filtersPanel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className={styles.filtersHeader}>
              <h3>Filters</h3>
              <button onClick={clearFilters} className={styles.clearFiltersBtn}>Clear All</button>
            </div>
            
            <div className={styles.filterGroup}>
              <label>🏛️ Institution / Campus</label>
              <select value={filters.campus} onChange={(e) => setFilters({...filters, campus: e.target.value})}>
                <option value="">All Campuses (Universities, Colleges, TVETs)</option>
                {campuses.map(campus => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
              <small className={styles.filterHint}>Showing products from {filters.campus || userCampus || 'your'} campus by default</small>
            </div>

            <div className={styles.filterGroup}>
              <label>📂 Category</label>
              <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>💰 Price Range</label>
              <div className={styles.priceRange}>
                <input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label>📦 Condition</label>
              <select value={filters.condition} onChange={(e) => setFilters({...filters, condition: e.target.value})}>
                <option value="">Any Condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>📊 Sort By</label>
              <select value={filters.sortBy} onChange={(e) => setFilters({...filters, sortBy: e.target.value})}>
                <option value="relevance">Relevance</option>
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>

            <button className={styles.applyFiltersBtn} onClick={() => {
              setShowFilters(false);
              performSearch();
            }}>
              Apply Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Suggestions (when no search performed) */}
      {!initialQuery && !loading && searchResults.products.length === 0 && (
        <div className={styles.suggestionsSection}>
          <div className={styles.recentSearches}>
            <h4>Recent Searches</h4>
            {recentSearches.length > 0 ? (
              <div className={styles.suggestionChips}>
                {recentSearches.map(term => (
                  <button key={term} onClick={() => {
                    setSearchQuery(term);
                    navigate(`/student/campus-search?q=${encodeURIComponent(term)}`);
                    performSearch();
                  }}>
                    <FaClock /> {term}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.noRecent}>No recent searches</p>
            )}
          </div>

          <div className={styles.trendingSearches}>
            <h4>Trending Now 🔥</h4>
            <div className={styles.suggestionChips}>
              {trendingSearches.map(term => (
                <button key={term} onClick={() => {
                  setSearchQuery(term);
                  navigate(`/student/campus-search?q=${encodeURIComponent(term)}`);
                  performSearch();
                }}>
                  <FaFire /> {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {searchResults.products.length > 0 || searchResults.restaurants.length > 0 || searchResults.services.length > 0 ? (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'products' ? styles.active : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <FaStore /> Products ({searchResults.products.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'restaurants' ? styles.active : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            <FaUtensils /> Restaurants ({searchResults.restaurants.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'services' ? styles.active : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <FaGraduationCap /> Services ({searchResults.services.length})
          </button>
        </div>
      ) : null}

      {/* Results */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={styles.skeletonCard}></div>
            ))}
          </div>
        ) : searchResults.products.length > 0 || searchResults.restaurants.length > 0 || searchResults.services.length > 0 ? (
          <>
            {activeTab === 'products' && (
              <>
                {searchResults.products.length > 0 ? (
                  <div className={styles.resultsGrid}>
                    {searchResults.products.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📦</div>
                    <h3>No products found</h3>
                    <p>Try different keywords or browse categories</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'restaurants' && (
              <>
                {searchResults.restaurants.length > 0 ? (
                  <div className={styles.resultsGrid}>
                    {searchResults.restaurants.map(restaurant => (
                      <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🍔</div>
                    <h3>No restaurants found</h3>
                    <p>Try searching with different keywords</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'services' && (
              <>
                {searchResults.services.length > 0 ? (
                  <div className={styles.resultsGrid}>
                    {searchResults.services.map(service => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🔧</div>
                    <h3>No services found</h3>
                    <p>Try searching with different keywords</p>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default CampusSearchPage;