import React from "react";
import "./AdvancedFilterSidebar.css";

const AdvancedFilterSidebar = ({ filters, setFilters }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="filter-sidebar">
      <h3>🎯 Advanced Filters</h3>

      <div className="filter-group">
        <label htmlFor="category">Category</label>
        <select
          name="category"
          value={filters.category}
          onChange={handleChange}
        >
          <option value="">All</option>
          <option value="electronics">Electronics</option>
          <option value="fashion">Fashion</option>
          <option value="home">Home</option>
          <option value="accessories">Accessories</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Price Range (KSH)</label>
        <div className="price-range">
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleChange}
            placeholder="Min"
          />
          <span>–</span>
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleChange}
            placeholder="Max"
          />
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="minRating">Minimum Rating</label>
        <select
          name="minRating"
          value={filters.minRating}
          onChange={handleChange}
        >
          <option value={0}>Any</option>
          <option value={1}>★ 1+</option>
          <option value={2}>★ 2+</option>
          <option value={3}>★ 3+</option>
          <option value={4}>★ 4+</option>
          <option value={5}>★ 5</option>
        </select>
      </div>

      <div className="filter-group checkbox">
        <input
          type="checkbox"
          name="inStock"
          checked={filters.inStock}
          onChange={handleChange}
          id="inStock"
        />
        <label htmlFor="inStock">Only show in-stock</label>
      </div>
    </div>
  );
};

export default AdvancedFilterSidebar;
