// src/pages/StorePage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, storage } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/AuthContext";
import { motion } from "framer-motion";

const StorePage = () => {
  const { storeId } = useParams();
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");

  const isOwner = currentUser?.uid === store?.ownerId;

  const fetchProducts = async () => {
    const snapshot = await getDocs(collection(db, "stores", storeId, "products"));
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProducts(list);
  };

  useEffect(() => {
    const fetchStore = async () => {
      const docRef = doc(db, "stores", storeId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setStore(snap.data());
      }
    };

    fetchStore();
    fetchProducts();
  }, [storeId]);

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    setFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleUpload = async () => {
    if (!form.name || !form.price || !file) {
      return setMessage("⚠️ All fields including image are required.");
    }

    try {
      const imageRef = ref(storage, `stores/${storeId}/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, "stores", storeId, "products"), {
        ...form,
        imageUrl,
        price: Number(form.price),
        createdAt: serverTimestamp(),
      });

      setMessage("✅ Product added!");
      setForm({ name: "", description: "", price: "" });
      setFile(null);
      setImagePreview(null);
      fetchProducts();
    } catch (err) {
      console.error("Upload failed:", err.message);
      setMessage("❌ Upload failed. Try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
        🏪 {store?.name || "Loading..."}
      </h1>
      <p className="text-center text-gray-600 mb-8">{store?.description}</p>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-blue-800 bg-blue-100 border border-blue-300 p-3 rounded mb-6"
        >
          {message}
        </motion.div>
      )}

      {isOwner && (
        <div className="bg-white p-6 rounded-xl shadow mb-10">
          <h2 className="text-xl font-semibold mb-4">📦 Add New Product</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="name"
              placeholder="Product name"
              className="p-3 border rounded"
              value={form.name}
              onChange={handleInput}
            />
            <input
              name="price"
              type="number"
              placeholder="Price in OmniCash"
              className="p-3 border rounded"
              value={form.price}
              onChange={handleInput}
            />
            <textarea
              name="description"
              placeholder="Product description"
              className="col-span-1 sm:col-span-2 p-3 border rounded"
              value={form.description}
              onChange={handleInput}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="col-span-1 sm:col-span-2"
            />
          </div>

          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded mt-4 mx-auto border"
            />
          )}

          <button
            onClick={handleUpload}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-semibold"
          >
            Upload Product
          </button>
        </div>
      )}

      {/* Products Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <motion.div
            key={p.id}
            className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition"
            whileHover={{ scale: 1.03 }}
          >
            <img
              src={p.imageUrl}
              alt={p.name}
              className="w-full h-40 object-cover rounded mb-3"
            />
            <h3 className="text-lg font-bold text-gray-800">{p.name}</h3>
            <p className="text-sm text-gray-600">{p.description}</p>
            <p className="text-sm font-semibold text-green-600 mt-2">
              💰 {p.price} OmniCash
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StorePage;
