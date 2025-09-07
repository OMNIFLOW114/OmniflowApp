import React from "react";

const options = [
  { label: "Default", value: null },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Rating: High to Low", value: "rating_desc" },
  { label: "Rating: Low to High", value: "rating_asc" },
];

export default function SortDropdown({ onSortChange }) {
  return (
    <select
      onChange={(e) => onSortChange(e.target.value || null)}
      className="sort-dropdown"
      aria-label="Sort products"
      defaultValue=""
    >
      {options.map((opt) => (
        <option key={opt.value || "default"} value={opt.value || ""}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
