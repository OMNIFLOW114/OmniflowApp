// src/pages/CreateStore.jsx
import React, { useState } from "react";
import { db } from "@/firebase";
import { useAuth } from "@/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const CreateStore = () => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ name: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      return setMessage("⚠️ Please fill in all fields.");
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "stores"), {
        ...form,
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setMessage("✅ Store created! Redirecting...");
      setTimeout(() => {
        navigate(`/store/${docRef.id}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to create store:", err.message);
      setMessage("❌ Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto px-4 py-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        🏪 Create Your Virtual Store
      </h1>

      <div className="bg-white shadow-md p-6 rounded-xl space-y-4">
        <div>
          <label className="block font-semibold mb-1">Store Name</label>
          <input
            type="text"
            name="name"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. OmniBoutique"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Description</label>
          <textarea
            name="description"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-400"
            placeholder="What do you sell or offer?"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition ${
            loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Creating Store..." : "Create Store"}
        </button>

        {message && (
          <p className="text-center text-sm text-gray-600 mt-4">{message}</p>
        )}
      </div>
    </motion.div>
  );
};

export default CreateStore;
