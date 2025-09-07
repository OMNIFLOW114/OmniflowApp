import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import {
  FaChartLine,
  FaUserShield,
  FaStar,
  FaEye,
  FaArrowUp,
  FaSpinner,
  FaTrashRestore,
  FaFileExport,
  FaFilter,
} from "react-icons/fa";
import "./Ratings.css";

const Ratings = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user?.id) return;

    const fetchRatedOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          rating,
          rating_submitted,
          created_at,
          buyer:buyer_id(email),
          product:product_id(id, name, image_gallery, trending_score, search_boost_score)
        `)
        .eq("rating_submitted", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching ratings:", error);
        setLoading(false);
        return;
      }

      setRatings(data);
      setFiltered(data); // default
      setLoading(false);
    };

    fetchRatedOrders();
  }, [user]);

  const handlePromoteProduct = async (productId) => {
    setPromoting(productId);

    const { data: productData, error: fetchError } = await supabase
      .from("products")
      .select("search_boost_score")
      .eq("id", productId)
      .single();

    if (fetchError || !productData) {
      alert("❌ Failed to fetch product data.");
      setPromoting(null);
      return;
    }

    const newSearchBoost = (productData.search_boost_score || 0) + 10;

    const { error: updateError } = await supabase
      .from("products")
      .update({ search_boost_score: newSearchBoost })
      .eq("id", productId);

    if (updateError) {
      alert("❌ Failed to promote product.");
    } else {
      alert("🎉 Product promoted successfully!");
    }

    setPromoting(null);
  };

  const handleResetBoost = async (productId) => {
    const { error } = await supabase
      .from("products")
      .update({ search_boost_score: 0 })
      .eq("id", productId);

    if (error) {
      alert("❌ Failed to reset boost.");
    } else {
      alert("🔄 Boost score reset to 0.");
      setRatings((prev) =>
        prev.map((r) =>
          r.product.id === productId
            ? {
                ...r,
                product: { ...r.product, search_boost_score: 0 },
              }
            : r
        )
      );
    }
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    let filtered = ratings;

    if (value === "top") {
      filtered = ratings.filter((r) => r.rating >= 4.5);
    } else if (value === "low") {
      filtered = ratings.filter((r) => r.rating <= 2);
    } else if (value === "recent") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = ratings.filter(
        (r) => new Date(r.created_at) >= new Date(weekAgo)
      );
    } else if (value === "promoted") {
      filtered = ratings.filter((r) => r.product?.search_boost_score > 0);
    }

    setFiltered(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Product", "Rating", "Buyer", "Rated On", "Boost"];
    const rows = filtered.map((r) => [
      r.product?.name,
      r.rating,
      r.buyer?.email,
      new Date(r.created_at).toLocaleString(),
      r.product?.search_boost_score || 0,
    ]);
    const csv =
      headers.join(",") +
      "\n" +
      rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "ratings_export.csv");
  };

  if (!user || user.email !== "omniflow718@gmail.com") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="ratings-admin-container">
      <div className="ratings-header">
        <FaUserShield className="header-icon" />
        <h2>Admin Watchtower: Ratings & Promotions</h2>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <FaFilter />
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="all">All Ratings</option>
          <option value="top">Top Rated</option>
          <option value="low">Low Rated</option>
          <option value="recent">Recent</option>
          <option value="promoted">Promoted Only</option>
        </select>
        <button className="export-btn" onClick={exportToCSV}>
          <FaFileExport /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="loading-panel">
          <FaSpinner className="spinner" />
          <p>Loading ratings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="empty-state">No matching ratings found.</p>
      ) : (
        <div className="ratings-grid">
          {filtered.map((order) => (
            <div key={order.id} className="rating-card">
              <img
                src={order.product?.image_gallery?.[0] || "/placeholder.png"}
                alt={order.product?.name}
                className="product-img"
              />
              <div className="rating-info">
                <h3>{order.product?.name || "Unnamed Product"}</h3>
                <p>
                  <FaUserShield /> <strong>Buyer:</strong>{" "}
                  {order.buyer?.email}
                </p>
                <p>
                  <FaStar /> <strong>Rating:</strong> {order.rating} / 5
                </p>
                <p>
                  <FaChartLine /> <strong>Rated:</strong>{" "}
                  {new Date(order.created_at).toLocaleString()}
                </p>
                <p>
                  <FaEye /> <strong>Trending:</strong>{" "}
                  {order.product?.trending_score ?? "Auto"}
                </p>
                <p>
                  <FaChartLine /> <strong>Search Boost:</strong>{" "}
                  {order.product?.search_boost_score || 0}
                </p>

                <div className="button-group">
                  <button
                    className="promote-btn"
                    onClick={() => handlePromoteProduct(order.product.id)}
                    disabled={promoting === order.product.id}
                  >
                    {promoting === order.product.id ? (
                      <span>
                        <FaSpinner className="spinner" /> Promoting...
                      </span>
                    ) : (
                      <span>
                        <FaArrowUp /> Promote
                      </span>
                    )}
                  </button>

                  <button
                    className="reset-btn"
                    onClick={() => handleResetBoost(order.product.id)}
                  >
                    <FaTrashRestore /> Reset Boost
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Ratings;
