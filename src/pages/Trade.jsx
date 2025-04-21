import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/AuthContext";
import { motion } from "framer-motion";

const Trade = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
  });
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const logTransaction = async (item) => {
    const txRef = doc(
      db,
      "users",
      currentUser.uid,
      "transactions",
      Date.now().toString()
    );
    await setDoc(txRef, {
      type: "purchase",
      item: item.name,
      amount: item.price,
      timestamp: new Date().toISOString(),
    });
  };

  const handlePost = async () => {
    const { name, description, price, image } = form;
    if (!name || !description || !price) return setMessage("⚠️ All fields except image are required.");

    try {
      await addDoc(collection(db, "tradeItems"), {
        name,
        description,
        price: Number(price),
        image: image || "",
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setForm({ name: "", description: "", price: "", image: "" });
      setMessage("✅ Item posted successfully!");
      fetchItems();
    } catch (err) {
      console.error("Post error:", err.message);
      setMessage("❌ Failed to post item.");
    }
  };

  const handleBuy = async (item) => {
    const walletRef = doc(db, "wallets", currentUser.uid);
    const walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) return setMessage("❌ Wallet not found.");
    const balance = walletSnap.data().balance || 0;

    if (balance < item.price) return setMessage("❌ Not enough OmniCash.");

    try {
      await updateDoc(walletRef, {
        balance: increment(-item.price),
      });
      await logTransaction(item);
      setMessage(`✅ You bought ${item.name} for ${item.price} OmniCash!`);
    } catch (err) {
      console.error("Buy error:", err.message);
      setMessage("❌ Purchase failed.");
    }
  };

  const fetchItems = async () => {
    const snap = await getDocs(collection(db, "tradeItems"));
    let list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      list = list.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sortBy === "price") {
      list.sort((a, b) => a.price - b.price);
    } else {
      list.sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
    }

    setItems(list);
  };

  useEffect(() => {
    fetchItems();
  }, [search, sortBy]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">
        🛍️ Trade & Virtual Store
      </h1>

      {message && (
        <div className="mb-4 text-sm bg-blue-100 border border-blue-300 text-blue-800 p-3 rounded">
          {message}
        </div>
      )}

      {/* Post Form */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Post a Product/Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Item name"
            value={form.name}
            onChange={handleChange}
            className="p-3 border rounded"
          />
          <input
            type="number"
            name="price"
            placeholder="Price in OmniCash"
            value={form.price}
            onChange={handleChange}
            className="p-3 border rounded"
          />
          <input
            type="url"
            name="image"
            placeholder="Image URL (optional)"
            value={form.image}
            onChange={handleChange}
            className="p-3 border rounded"
          />
          <textarea
            name="description"
            placeholder="Item description"
            value={form.description}
            onChange={handleChange}
            className="p-3 border rounded col-span-1 md:col-span-2"
          />
        </div>
        <button
          onClick={handlePost}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-semibold"
        >
          Post Item
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <input
          type="text"
          placeholder="🔍 Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border rounded"
        />
        <select
          className="p-3 border rounded"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">🆕 Newest</option>
          <option value="price">💸 Price (Low to High)</option>
        </select>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition"
            whileHover={{ scale: 1.03 }}
          >
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-40 object-cover rounded mb-3"
              />
            )}
            <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
            <p className="text-gray-600 text-sm mb-2">{item.description}</p>
            <p className="text-green-600 font-semibold mb-2">
              {item.price} OmniCash
            </p>
            {item.userId === currentUser.uid ? (
              <p className="text-sm text-blue-500">✅ Your Listing</p>
            ) : (
              <button
                onClick={() => handleBuy(item)}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Buy
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Trade;
