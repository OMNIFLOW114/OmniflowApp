// src/components/Discover.jsx
import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collectionGroup,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { motion } from "framer-motion";

const Discover = () => {
  const [products, setProducts] = useState([]);
  const [businessPosts, setBusinessPosts] = useState([]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const productQuery = query(collectionGroup(db, "products"), orderBy("createdAt", "desc"));
        const productSnap = await getDocs(productQuery);
        const productList = productSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "product",
        }));

        const businessSnap = await getDocs(collection(db, "businessPosts"));
        const businessList = businessSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "business",
        }));

        setProducts(productList);
        setBusinessPosts(businessList);
      } catch (error) {
        console.error("Failed to fetch discover content:", error.message);
      }
    };

    fetchContent();
  }, []);

  const combinedItems = [...products, ...businessPosts];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-600 mb-6">
        🔍 Discover New Opportunities
      </h1>

      {combinedItems.length === 0 ? (
        <p className="text-center text-gray-500">Nothing to explore yet. Be the first to post!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {combinedItems.map((item, index) => (
            <motion.div
              key={index}
              className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition"
              whileHover={{ scale: 1.05 }}
            >
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                {item.name || item.title}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {item.description?.substring(0, 120) || "No description available."}
              </p>
              {item.price && (
                <p className="text-sm font-semibold text-green-600">
                  💰 {item.price} OmniCash
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2 capitalize">
                {item.type === "product" ? "🛒 Store Product" : "📢 Business Opportunity"}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Discover;
