// src/components/AdvancedFilterOverlay.jsx - UPDATED FOR YOUR DATABASE SCHEMA
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaFilter, FaTimes, FaSlidersH, FaFire, FaStar, FaCheck, FaBolt, FaTag, FaTshirt, FaLaptop, FaHome, FaFutbol, FaGem, FaSpinner,FaBook } from "react-icons/fa";
import { useDarkMode } from "@/context/DarkModeContext";
import styles from "./AdvancedFilterOverlay.module.css";

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (!amount && amount !== 0) return "KSh 0";
  return `KSh ${Number(amount).toLocaleString("en-KE")}`;
};

const AdvancedFilterOverlay = ({ filters, setFilters, onClose, productCount }) => {
  const { darkMode } = useDarkMode();
  const [localFilters, setLocalFilters] = useState(filters);
  const [activeTab, setActiveTab] = useState("quick");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalFilters(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const applyFilters = useCallback(async () => {
    setIsApplying(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    setFilters(localFilters);
    onClose();
    setIsApplying(false);
  }, [localFilters, setFilters, onClose]);

  const resetFilters = () => {
    const resetFilters = {
      category: "",
      minPrice: "",
      maxPrice: "",
      minRating: 0,
      inStock: false,
      sortBy: "newest",
      quickFilter: ""
    };
    setLocalFilters(resetFilters);
    setFilters(resetFilters);
  };

  const quickFilters = [
    { key: "flash", label: "Flash Sale", icon: FaBolt, color: "#EF4444" },
    { key: "trending", label: "Trending", icon: FaFire, color: "#F59E0B" },
    { key: "featured", label: "Featured", icon: FaStar, color: "#8B5CF6" },
    { key: "discounted", label: "Discounted", icon: FaTag, color: "#10B981" }
  ];

  const handleQuickFilter = (filterKey) => {
    setLocalFilters(prev => ({
      ...prev,
      quickFilter: prev.quickFilter === filterKey ? "" : filterKey
    }));
  };

  // Categories based on your products table
  const categories = [
    { value: "electronics", label: "Electronics", icon: FaLaptop, count: 0 },
    { value: "fashion", label: "Fashion", icon: FaTshirt, count: 0 },
    { value: "home", label: "Home & Garden", icon: FaHome, count: 0 },
    { value: "sports", label: "Sports", icon: FaFutbol, count: 0 },
    { value: "jewelry", label: "Jewelry", icon: FaGem, count: 0 },
    { value: "textbooks", label: "Textbooks", icon: FaBook, count: 0 },
    { value: "clothing", label: "Clothing", icon: FaTshirt, count: 0 },
    { value: "accessories", label: "Accessories", icon: FaGem, count: 0 }
  ];

  const priceRanges = [
    { label: "Under KSh 1,000", min: 0, max: 1000 },
    { label: "KSh 1,000 - 5,000", min: 1000, max: 5000 },
    { label: "KSh 5,000 - 20,000", min: 5000, max: 20000 },
    { label: "Over KSh 20,000", min: 20000, max: 1000000 }
  ];

  return (
    <motion.div 
      className={`${styles.filterOverlay} ${darkMode ? styles.darkMode : styles.lightMode}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div 
        className={styles.filterContainer}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.filterHeader}>
          <div className={styles.filterTitle}>
            <div className={styles.titleIcon}>
              <FaSlidersH />
            </div>
            <div>
              <h2>Filters & Sorting</h2>
              <span className={styles.productCount}>{productCount} products available</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.filterTabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === "quick" ? styles.active : ""}`}
            onClick={() => setActiveTab("quick")}
          >
            <FaBolt /> Quick Filters
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === "advanced" ? styles.active : ""}`}
            onClick={() => setActiveTab("advanced")}
          >
            <FaFilter /> Advanced
          </button>
        </div>

        {/* Content */}
        <div className={styles.filterContent}>
          <AnimatePresence mode="wait">
            {activeTab === "quick" && (
              <motion.div 
                key="quick"
                className={styles.quickFilters}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.filterGroup}>
                  <h4>Popular Filters</h4>
                  <div className={styles.quickFilterGrid}>
                    {quickFilters.map((filter) => {
                      const IconComponent = filter.icon;
                      return (
                        <button
                          key={filter.key}
                          className={`${styles.quickFilterBtn} ${localFilters.quickFilter === filter.key ? styles.active : ""}`}
                          onClick={() => handleQuickFilter(filter.key)}
                          style={{
                            borderColor: localFilters.quickFilter === filter.key ? filter.color : 'transparent',
                            background: localFilters.quickFilter === filter.key ? `${filter.color}15` : 'var(--bg-secondary)'
                          }}
                        >
                          <IconComponent style={{ color: filter.color }} />
                          <span>{filter.label}</span>
                          {localFilters.quickFilter === filter.key && <FaCheck className={styles.checkIcon} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <h4>Price Range</h4>
                  <div className={styles.priceGrid}>
                    {priceRanges.map((range, index) => (
                      <button
                        key={index}
                        className={`${styles.priceBtn} ${localFilters.minPrice == range.min && localFilters.maxPrice == range.max ? styles.active : ""}`}
                        onClick={() => setLocalFilters(prev => ({
                          ...prev,
                          minPrice: range.min,
                          maxPrice: range.max
                        }))}
                      >
                        <span className={styles.priceLabel}>{range.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "advanced" && (
              <motion.div 
                key="advanced"
                className={styles.advancedFilters}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Categories Section */}
                <div className={styles.filterGroup}>
                  <h4>Categories</h4>
                  <div className={styles.categoryGrid}>
                    {categories.map(category => {
                      const IconComponent = category.icon;
                      const isSelected = localFilters.category === category.value;
                      return (
                        <label key={category.value} className={`${styles.categoryItem} ${isSelected ? styles.selected : ''}`}>
                          <input
                            type="radio"
                            name="category"
                            value={category.value}
                            checked={isSelected}
                            onChange={handleChange}
                          />
                          <div className={styles.radioCustom}>
                            <div className={styles.radioInner}></div>
                          </div>
                          <div className={styles.categoryContent}>
                            <IconComponent className={styles.categoryIcon} />
                            <span className={styles.categoryLabel}>{category.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Ratings Section - Using products.rating field */}
                <div className={styles.filterGroup}>
                  <h4>Customer Ratings</h4>
                  <div className={styles.ratingGrid}>
                    {[4, 3, 2, 1].map(rating => {
                      const isSelected = parseInt(localFilters.minRating) === rating;
                      return (
                        <label key={rating} className={`${styles.ratingItem} ${isSelected ? styles.selected : ''}`}>
                          <input
                            type="radio"
                            name="minRating"
                            value={rating}
                            checked={isSelected}
                            onChange={handleChange}
                          />
                          <div className={styles.radioCustom}>
                            <div className={styles.radioInner}></div>
                          </div>
                          <div className={styles.ratingContent}>
                            <div className={styles.stars}>
                              {[...Array(5)].map((_, i) => (
                                <FaStar key={i} className={i < rating ? styles.starFilled : styles.starEmpty} />
                              ))}
                            </div>
                            <span className={styles.ratingText}>{rating}+ Stars</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Price Range */}
                <div className={styles.filterGroup}>
                  <h4>Custom Price Range</h4>
                  <div className={styles.customPriceRange}>
                    <div className={styles.priceInputs}>
                      <input
                        type="number"
                        name="minPrice"
                        value={localFilters.minPrice}
                        onChange={handleChange}
                        placeholder="Min price"
                        className={styles.priceInput}
                      />
                      <span className={styles.separator}>—</span>
                      <input
                        type="number"
                        name="maxPrice"
                        value={localFilters.maxPrice}
                        onChange={handleChange}
                        placeholder="Max price"
                        className={styles.priceInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Sort By - Matches products table fields */}
                <div className={styles.filterGroup}>
                  <h4>Sort By</h4>
                  <select 
                    name="sortBy" 
                    value={localFilters.sortBy} 
                    onChange={handleChange}
                    className={styles.sortSelect}
                  >
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="popular">Most Popular (Views)</option>
                  </select>
                </div>

                {/* In Stock Filter - Uses stock_quantity from products table */}
                <label className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={localFilters.inStock}
                    onChange={handleChange}
                  />
                  <span className={styles.checkboxCustom}>
                    <span className={styles.checkboxInner}></span>
                  </span>
                  <span>Show only in-stock items</span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className={styles.filterActions}>
          <button className={styles.resetBtn} onClick={resetFilters}>
            Reset All
          </button>
          <button className={styles.applyBtn} onClick={applyFilters} disabled={isApplying}>
            {isApplying ? <FaSpinner className={styles.spinning} /> : "Apply Filters"}
          </button>
        </div>
        
        {/* Bottom Spacing for Navigation */}
        <div className={styles.bottomSpacing} />
      </motion.div>
    </motion.div>
  );
};

export default AdvancedFilterOverlay;