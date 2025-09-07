import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { motion } from "framer-motion";

const TrendingNow = () => {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    const fetchTrending = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, rating, review_count, image_url, image_gallery,
          users(id, name, verified)
        `)
        .eq("visibility", "public")
        .eq("status", "active")
        .gte("rating", 4)
        .order("trending_score", { ascending: false })
        .limit(12);

      if (!error) setTrending(data || []);
    };

    fetchTrending();
  }, []);

  return (
    <div className="trending-now-grid">
      {trending.map((product) => {
        const image = product.image_gallery?.[0] || product.image_url;
        return (
          <motion.div key={product.id} className="trending-card" whileHover={{ scale: 1.03 }}>
            <img src={image} alt={product.name} className="trending-img" />
            <h3>{product.name}</h3>
            <p>KSH {product.price}</p>
            <p>⭐ {product.rating} ({product.review_count || 0})</p>
            <p><strong>{product.users?.name}</strong> {product.users?.verified && "✔"}</p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TrendingNow;
