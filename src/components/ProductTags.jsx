// components/ProductTags.jsx
import React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Leaf, Truck, Star, Sparkles } from "lucide-react";

const TAGS = [
  { name: "Eco-Friendly", icon: <Leaf className="w-4 h-4" /> },
  { name: "Made in Kenya", icon: <Star className="w-4 h-4" /> },
  { name: "Free Shipping", icon: <Truck className="w-4 h-4" /> },
  { name: "OmniVerified", icon: <BadgeCheck className="w-4 h-4" /> },
  { name: "Rare Drop", icon: <Sparkles className="w-4 h-4" /> },
];

export default function ProductTags({ selectedTags = [], onToggle }) {
  return (
    <motion.div
      className="w-full flex flex-wrap gap-2 px-4 py-4 sm:px-6 md:px-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {TAGS.map(({ name, icon }) => {
        const isActive = selectedTags.includes(name);

        return (
          <button
            key={name}
            onClick={() => onToggle(name)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-all shadow-sm ${
              isActive
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="text-xs">{icon}</span>
            <span>#{name}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
