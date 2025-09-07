// components/ProductFilters.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function ProductFilters({ onFiltersChange }) {
  const [categories, setCategories] = useState(["All"]);
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState("All");
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      try {
        const [{ data: catData, error: catError }, { data: tagData, error: tagError }] = await Promise.all([
          supabase.from("product_categories").select("name"),
          supabase.from("product_tags").select("name"),
        ]);

        if (catError || tagError) throw catError || tagError;

        setCategories(["All", ...(catData?.map((c) => c.name) || [])]);
        setTags(tagData?.map((t) => t.name) || []);
      } catch (err) {
        console.error("Filter fetch failed", err);
        toast.error("Failed to load filters.");
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    onFiltersChange({
      category: category === "All" ? null : category,
      tags: selectedTags,
    });
  }, [category, selectedTags, onFiltersChange]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {loading ? (
        <div className="flex items-center space-x-2 text-gray-500 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading filters...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Selector */}
          <div>
            <label htmlFor="category-select" className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Filter */}
          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-2">Tags</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
