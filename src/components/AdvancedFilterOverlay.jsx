import React, { useState, useEffect } from "react";
import { FaFilter, FaTimes, FaSlidersH, FaFire, FaStar, FaCheck, FaBolt } from "react-icons/fa";
import "./AdvancedFilterOverlay.css";

const AdvancedFilterOverlay = ({ filters, setFilters, onClose, productCount }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [activeTab, setActiveTab] = useState("quick");

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

  const applyFilters = () => {
    setFilters(localFilters);
    onClose();
  };

  const resetFilters = () => {
    const resetFilters = {
      category: "",
      minPrice: "",
      maxPrice: "",
      minRating: 0,
      inStock: false,
      sortBy: "newest",
      tags: []
    };
    setLocalFilters(resetFilters);
    setFilters(resetFilters);
  };

  const quickFilters = [
    { key: "flash", label: "Flash Sale", icon: FaBolt, value: "flash" },
    { key: "trending", label: "Trending", icon: FaFire, value: "trending" },
    { key: "featured", label: "Featured", icon: FaStar, value: "featured" },
    { key: "discounted", label: "Discounted", value: "discounted" }
  ];

  const handleQuickFilter = (filterKey) => {
    setLocalFilters(prev => ({
      ...prev,
      quickFilter: prev.quickFilter === filterKey ? "" : filterKey
    }));
  };

  const categories = [
    { value: "electronics", label: "Electronics", count: 124 },
    { value: "fashion", label: "Fashion", count: 89 },
    { value: "home", label: "Home & Garden", count: 67 },
    { value: "sports", label: "Sports", count: 45 },
    { value: "beauty", label: "Beauty", count: 56 }
  ];

  const priceRanges = [
    { label: "Under KSH 1,000", min: 0, max: 1000 },
    { label: "KSH 1,000 - 5,000", min: 1000, max: 5000 },
    { label: "KSH 5,000 - 20,000", min: 5000, max: 20000 },
    { label: "Over KSH 20,000", min: 20000, max: 1000000 }
  ];

  return (
    <div className="filter-overlay">
      <div className="filter-header">
        <div className="filter-title">
          <FaSlidersH />
          <h2>Filters & Sorting</h2>
          <span className="product-count">{productCount} products</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="filter-tabs">
        <button 
          className={`tab-btn ${activeTab === "quick" ? "active" : ""}`}
          onClick={() => setActiveTab("quick")}
        >
          <FaBolt /> Quick Filters
        </button>
        <button 
          className={`tab-btn ${activeTab === "advanced" ? "active" : ""}`}
          onClick={() => setActiveTab("advanced")}
        >
          <FaFilter /> Advanced
        </button>
      </div>

      <div className="filter-content">
        {activeTab === "quick" && (
          <div className="quick-filters">
            <h4>Popular Filters</h4>
            <div className="quick-filter-grid">
              {quickFilters.map((filter) => {
                const IconComponent = filter.icon;
                return (
                  <button
                    key={filter.key}
                    className={`quick-filter-btn ${localFilters.quickFilter === filter.value ? "active" : ""}`}
                    onClick={() => handleQuickFilter(filter.value)}
                  >
                    {filter.icon && <IconComponent />}
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="price-range-quick">
              <h4>Price Range</h4>
              <div className="price-buttons">
                {priceRanges.map((range, index) => (
                  <button
                    key={index}
                    className={`price-btn ${localFilters.minPrice == range.min && localFilters.maxPrice == range.max ? "active" : ""}`}
                    onClick={() => setLocalFilters(prev => ({
                      ...prev,
                      minPrice: range.min,
                      maxPrice: range.max
                    }))}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="advanced-filters">
            <div className="filter-section">
              <h4>Categories</h4>
              <div className="category-list">
                {categories.map(category => (
                  <label key={category.value} className="category-item">
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={localFilters.category === category.value}
                      onChange={handleChange}
                    />
                    <span className="checkmark"></span>
                    <span className="category-label">{category.label}</span>
                    <span className="category-count">({category.count})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Customer Ratings</h4>
              <div className="rating-filters">
                {[4, 3, 2, 1].map(rating => (
                  <label key={rating} className="rating-item">
                    <input
                      type="radio"
                      name="minRating"
                      value={rating}
                      checked={parseInt(localFilters.minRating) === rating}
                      onChange={handleChange}
                    />
                    <span className="checkmark"></span>
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className={i < rating ? "star-filled" : "star-empty"} />
                      ))}
                    </div>
                    <span className="rating-text">{rating}+ Stars</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Custom Price Range</h4>
              <div className="custom-price-range">
                <div className="price-inputs">
                  <input
                    type="number"
                    name="minPrice"
                    value={localFilters.minPrice}
                    onChange={handleChange}
                    placeholder="Min price"
                  />
                  <span className="separator">to</span>
                  <input
                    type="number"
                    name="maxPrice"
                    value={localFilters.maxPrice}
                    onChange={handleChange}
                    placeholder="Max price"
                  />
                </div>
              </div>
            </div>

            <div className="filter-section">
              <h4>Sort By</h4>
              <select 
                name="sortBy" 
                value={localFilters.sortBy} 
                onChange={handleChange}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="inStock"
                checked={localFilters.inStock}
                onChange={handleChange}
              />
              <span className="checkmark"></span>
              Show only in-stock items
            </label>
          </div>
        )}
      </div>

      <div className="filter-actions">
        <button className="reset-btn" onClick={resetFilters}>
          Reset All
        </button>
        <button className="apply-btn" onClick={applyFilters}>
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilterOverlay;