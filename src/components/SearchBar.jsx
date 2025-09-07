import React, { useState, useEffect, useRef } from "react";

export default function SearchBar({ onSearch }) {
  const [input, setInput] = useState("");
  const debounceTimeout = useRef(null);

  useEffect(() => {
    // Debounce input to reduce number of calls
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      onSearch(input.trim());
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [input, onSearch]);

  const handleChange = (e) => {
    setInput(e.target.value);
  };

  const clearSearch = () => {
    setInput("");
    onSearch("");
  };

  return (
    <div className="search-bar">
      <input
        type="search"
        value={input}
        onChange={handleChange}
        placeholder="Search products..."
        aria-label="Search products"
        className="search-input"
        autoComplete="off"
      />
      {input && (
        <button
          type="button"
          aria-label="Clear search"
          className="search-clear-btn"
          onClick={clearSearch}
        >
          &times;
        </button>
      )}
    </div>
  );
}
