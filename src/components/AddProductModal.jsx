import React, { useState } from "react";
import { supabase } from "@/supabase";
import { motion } from "framer-motion";
import "./AddProductModal.css";

export default function AddProductModal({ storeId, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    imageUrl: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.imageUrl) {
      return alert("Please fill all required fields.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("products").insert({
        ...form,
        store_id: storeId,
        price: Number(form.price),
        rating: 0,
        review_count: 0,
      });

      if (error) throw error;

      onAdded(); // Refresh product list in dashboard
      onClose();
    } catch (err) {
      alert("Failed to add product. Try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-content glow" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
        <h2 className="text-lg font-bold mb-4">➕ Add New Product</h2>

        <input name="name" type="text" placeholder="Product Name" className="modal-input" onChange={handleChange} />
        <input name="price" type="number" placeholder="Price (KES)" className="modal-input" onChange={handleChange} />
        <input name="imageUrl" type="text" placeholder="Image URL" className="modal-input" onChange={handleChange} />
        <input name="category" type="text" placeholder="Category (optional)" className="modal-input" onChange={handleChange} />

        <div className="flex gap-4 justify-end mt-6">
          <button onClick={onClose} className="btn-cancel">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-confirm">
            {loading ? "Saving..." : "Add Product"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
