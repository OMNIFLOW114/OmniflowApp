import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import SectionCard from "./SectionCard";
import "./HomeTabSections.css";

const sectionConfigs = [
  { title: "Top Picks For You", filter: (p) => p.rating >= 4 },
  { title: "New Arrivals", filter: (p) => true, sort: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  { title: "Flash Sale", filter: (p) => p.is_flash_sale },
  { title: "Trending Now", filter: (p) => p.trending_score >= 10, sort: (a, b) => b.trending_score - a.trending_score },
  { title: "Lipa Mdogo Mdogo", filter: (p) => p.lipa_polepole === true },
  { title: "Rare Drops", filter: (p) => p.is_rare_drop },
  { title: "Verified Products", filter: (p) => p.is_verified },
  { title: "Featured Picks", filter: (p) => p.is_featured },
  { title: "Top Rated", filter: (p) => p.total_ratings > 20 && p.rating >= 4.5 },
  { title: "Most Ordered", filter: (p) => p.orders > 5, sort: (a, b) => b.orders - a.orders },
  { title: "Most Viewed", filter: (p) => p.views > 50, sort: (a, b) => b.views - a.views },
  { title: "Phone Deals", filter: (p) => p.category?.toLowerCase().includes("phone") },
  { title: "Appliances", filter: (p) => p.category?.toLowerCase().includes("appliance") },
  { title: "Accessories", filter: (p) => p.category?.toLowerCase().includes("accessory") },
  { title: "High Discounts", filter: (p) => p.discount >= 10 },
];

const HomeTabSections = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("visibility", "public")
        .eq("status", "active");

      if (error) console.error("Failed to fetch products:", error);
      else setProducts(data);
    };

    fetchProducts();
  }, []);

  return (
    <div className="home-tab-sections">
      {sectionConfigs.map((config) => {
        const filtered = products.filter(config.filter);
        const sorted = config.sort ? [...filtered].sort(config.sort) : filtered;
        const topItems = sorted.slice(0, 10);

        return topItems.length > 0 ? (
          <SectionCard key={config.title} title={config.title} products={topItems} />
        ) : null;
      })}
    </div>
  );
};

export default HomeTabSections;
