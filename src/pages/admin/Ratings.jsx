import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMenu,
  FiX,
  FiSearch,
  FiBell,
  FiLogOut,
  FiUser,
  FiShield,
  FiStar,
} from "react-icons/fi";
import { FaCrown, FaShieldAlt, FaChartLine, FaArrowUp, FaTrashRestore, FaFileExport, FaFilter } from "react-icons/fa";
import "./Ratings.css";

const RATINGS_PER_PAGE = 12;

const Ratings = () => {
  const { user, signOut } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [ratings, setRatings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  const SUPER_ADMIN_EMAIL = "omniflow718@gmail.com";

  const checkAdminAccess = async () => {
    try {
      const { data: adminData, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking admin access:", error);
        toast.error("Access check failed");
        navigate("/admin");
        return false;
      }

      if (adminData) {
        setCurrentAdmin(adminData);
        return true;
      }

      if (user.email === SUPER_ADMIN_EMAIL) {
        const { data: newAdmin, error: createError } = await supabase
          .from("admin_users")
          .insert([
            {
              user_id: user.id,
              role: "super_admin",
              permissions: ["all"],
              is_active: true,
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (createError && createError.code !== "23505") {
          console.error("Error creating super admin:", createError);
          toast.error("Failed to initialize super admin");
          return false;
        }

        setCurrentAdmin(newAdmin);
        return true;
      }

      toast.error("Access denied: Admin privileges required");
      navigate("/admin");
      return false;
    } catch (error) {
      console.error("Unexpected error in access check:", error);
      toast.error("Unexpected error checking access");
      navigate("/admin");
      return false;
    }
  };

  const fetchRatedOrders = async () => {
    setLoading(true);
    const from = (page - 1) * RATINGS_PER_PAGE;
    const to = from + RATINGS_PER_PAGE - 1;

    try {
      const [
        { data, error: fetchError },
        { count, error: countError }
      ] = await Promise.all([
        supabase
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
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("rating_submitted", true)
      ]);

      if (fetchError || countError) {
        console.error("Fetch error:", fetchError || countError);
        toast.error("Failed to fetch ratings");
      } else {
        setRatings(data || []);
        setFiltered(data || []);
        setTotalPages(Math.ceil((count || 0) / RATINGS_PER_PAGE));
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Unexpected error fetching ratings");
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteProduct = async (productId) => {
    setPromoting(productId);
    try {
      const { data: productData, error: fetchError } = await supabase
        .from("products")
        .select("search_boost_score")
        .eq("id", productId)
        .single();

      if (fetchError || !productData) {
        toast.error("Failed to fetch product data");
        setPromoting(null);
        return;
      }

      const newSearchBoost = (productData.search_boost_score || 0) + 10;

      const { error: updateError } = await supabase
        .from("products")
        .update({ search_boost_score: newSearchBoost })
        .eq("id", productId);

      if (updateError) {
        toast.error("Failed to promote product");
      } else {
        toast.success("Product promoted successfully!");
        setRatings((prev) =>
          prev.map((r) =>
            r.product.id === productId
              ? {
                  ...r,
                  product: { ...r.product, search_boost_score: newSearchBoost },
                }
              : r
          )
        );
        if (filter === "promoted") {
          setFiltered((prev) =>
            prev.map((r) =>
              r.product.id === productId
                ? {
                    ...r,
                    product: { ...r.product, search_boost_score: newSearchBoost },
                  }
                : r
            )
          );
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Unexpected error promoting product");
    } finally {
      setPromoting(null);
    }
  };

  const handleResetBoost = async (productId) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ search_boost_score: 0 })
        .eq("id", productId);

      if (error) {
        toast.error("Failed to reset boost");
      } else {
        toast.success("Boost score reset to 0");
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
        if (filter === "promoted") {
          setFiltered((prev) => prev.filter((r) => r.product.id !== productId));
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Unexpected error resetting boost");
    }
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    setPage(1); // Reset to first page on filter change
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
    setTotalPages(Math.ceil(filtered.length / RATINGS_PER_PAGE));
  };

  const exportToCSV = () => {
    try {
      const headers = ["Product", "Rating", "Buyer", "Rated On", "Boost Score"];
      const rows = filtered.map((r) => [
        `"${r.product?.name || "Unnamed Product"}"`,
        r.rating,
        `"${r.buyer?.email || "N/A"}"`,
        `"${new Date(r.created_at).toLocaleString()}"`,
        r.product?.search_boost_score || 0,
      ]);
      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `ratings_export_${new Date().toISOString()}.csv`);
      toast.success("Ratings exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export ratings");
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/admin");
      return;
    }

    const initialize = async () => {
      const hasAccess = await checkAdminAccess();
      if (hasAccess) {
        fetchRatedOrders();
      }
    };

    initialize();
  }, [user, page, navigate]);

  if (!user) {
    return null;
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const hasPermission = (permission) =>
    isSuperAdmin || currentAdmin?.permissions?.includes(permission) || currentAdmin?.permissions?.includes("all");

  if (!hasPermission("manage_ratings")) {
    toast.error("Access denied: Manage ratings permission required");
    navigate("/admin");
    return null;
  }

  const adminModules = [
    { icon: <FiStar />, title: "Ratings & Reviews", path: "/admin/ratings", requiredPermission: "manage_ratings", color: "var(--gold-color)" },
    // Add other modules as needed
  ].filter((module) => hasPermission(module.requiredPermission));

  return (
    <div className={`admin-layout ${darkMode ? "dark-mode" : ""}`}>
      <motion.aside
        className={`admin-sidebar ${sidebarOpen ? "open" : "collapsed"}`}
        initial={false}
        animate={{
          width: sidebarOpen ? 200 : 56,
          transition: { duration: 0.3, ease: "easeInOut" },
        }}
      >
        <div className="sidebar-header">
          <motion.div
            className="sidebar-logo"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
          </motion.div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                OmniFlow {isSuperAdmin && "Super "}Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="sidebar-nav">
          {adminModules.map((module, index) => (
            <motion.button
              key={index}
              className={`nav-item ${location.pathname === module.path ? "active" : ""}`}
              onClick={() => navigate(module.path)}
              whileHover={{ x: 8 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="nav-icon" style={{ color: module.color }}>
                {module.icon}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {module.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="profile-avatar">
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  className="profile-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="profile-name">
                    {user.email === SUPER_ADMIN_EMAIL ? "Super Admin" : "Admin"}
                    {isSuperAdmin && " 👑"}
                  </span>
                  <span className="profile-role">
                    {currentAdmin?.role?.replace("_", " ").toUpperCase() || "ADMIN"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            className="logout-btn"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiLogOut />
            {sidebarOpen && <span>Logout</span>}
          </motion.button>
        </div>
      </motion.aside>

      <main className={`admin-main ${sidebarOpen ? "" : "collapsed"}`}>
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <div className="breadcrumb">
              <h1>
                Ratings & Reviews
                {isSuperAdmin && <span className="super-admin-badge">SUPER ADMIN</span>}
              </h1>
              <p>Manage product ratings and search boost scores</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search ratings..."
                onChange={(e) => {
                  if (e.target.value) {
                    navigate(`/admin/ratings?q=${e.target.value}`);
                  }
                }}
              />
            </div>
            <button className="notifications-btn">
              <FiBell />
            </button>
            <div className="admin-badge">
              <div className="badge-icon">
                {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
              </div>
              <div className="badge-info">
                <span className="badge-role">
                  {currentAdmin?.role?.replace("_", " ").toUpperCase() || "ADMIN"}
                </span>
                <span className="badge-status">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <motion.section
            className="ratings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="section-header">
              <h2>Ratings & Promotions Dashboard</h2>
              <p>Monitor and manage product ratings and search visibility</p>
            </div>

            <div className="filter-bar">
              <FaFilter className="filter-icon" />
              <select
                className="filter-select"
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
              >
                <option value="all">All Ratings</option>
                <option value="top">Top Rated (4.5+)</option>
                <option value="low">Low Rated (≤2)</option>
                <option value="recent">Recent (Last 7 Days)</option>
                <option value="promoted">Promoted Products</option>
              </select>
              <motion.button
                className="export-btn"
                onClick={exportToCSV}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaFileExport /> Export CSV
              </motion.button>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading ratings...</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="empty-state">No matching ratings found.</p>
            ) : (
              <div className="ratings-grid">
                <AnimatePresence>
                  {filtered.slice((page - 1) * RATINGS_PER_PAGE, page * RATINGS_PER_PAGE).map((order, index) => (
                    <motion.div
                      key={order.id}
                      className="rating-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <img
                        src={order.product?.image_gallery?.[0] || "/placeholder.png"}
                        alt={order.product?.name}
                        className="product-img"
                      />
                      <div className="rating-info">
                        <h3>{order.product?.name || "Unnamed Product"}</h3>
                        <p>
                          <FiUser /> <strong>Buyer:</strong> {order.buyer?.email || "N/A"}
                        </p>
                        <p>
                          <FiStar /> <strong>Rating:</strong> {order.rating} / 5
                        </p>
                        <p>
                          <FaChartLine /> <strong>Rated:</strong>{" "}
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                        <p>
                          <FaChartLine /> <strong>Trending:</strong>{" "}
                          {order.product?.trending_score ?? "Auto"}
                        </p>
                        <p>
                          <FaArrowUp /> <strong>Search Boost:</strong>{" "}
                          {order.product?.search_boost_score || 0}
                        </p>
                        <div className="button-group">
                          <motion.button
                            className="promote-btn"
                            onClick={() => handlePromoteProduct(order.product.id)}
                            disabled={promoting === order.product.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
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
                          </motion.button>
                          <motion.button
                            className="reset-btn"
                            onClick={() => handleResetBoost(order.product.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FaTrashRestore /> Reset Boost
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="pagination">
              <motion.button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ← Prev
              </motion.button>
              <span>
                Page {page} of {totalPages}
              </span>
              <motion.button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Next →
              </motion.button>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default Ratings;