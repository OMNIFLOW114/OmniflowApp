// src/components/SellerOrdersTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaClipboardCheck, FaBox, FaUser, FaEye, FaFileInvoice,
  FaBan, FaSearch, FaTruck, FaShippingFast, FaCheckCircle,
  FaSync, FaSpinner
} from "react-icons/fa";
import "./SellerOrdersTab.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const TABS = [
  {
    key: "new",
    label: "New Orders",
    icon: <FaClipboardCheck />,
    statuses: ["pending", "deposit_paid"],
    color: "#F59E0B",
    emptyIcon: <FaClipboardCheck size={48} />,
    emptyText: "No new orders yet",
    emptySub: "New orders from buyers will appear here",
  },
  {
    key: "pending",
    label: "Pending",
    icon: <FaTruck />,
    statuses: ["processing", "shipped", "out for delivery", "out_for_delivery", "on_delivery"],
    color: "#3B82F6",
    emptyIcon: <FaTruck size={48} />,
    emptyText: "Nothing pending",
    emptySub: "Orders you're processing or delivering will appear here",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: <FaCheckCircle />,
    statuses: ["delivered", "completed"],
    color: "#10B981",
    emptyIcon: <FaCheckCircle size={48} />,
    emptyText: "No delivered orders yet",
    emptySub: "Completed deliveries will appear here",
  },
];

// ─── SKELETON ─────────────────────────────────────────────────
const OrderCardSkeleton = () => (
  <div className="seller-order-card seller-order-skeleton">
    <div className="seller-order-card-main">
      <div className="seller-order-image">
        <div className="sk-box sk-image" />
      </div>
      <div className="seller-order-info">
        <div className="seller-order-top-row">
          <div className="sk-box sk-id" />
          <div className="sk-box sk-badge" />
        </div>
        <div className="sk-box sk-title" />
        <div className="seller-order-meta">
          <div className="sk-box sk-meta" />
          <div className="sk-box sk-meta" />
          <div className="sk-box sk-meta" />
        </div>
      </div>
      <div className="seller-order-amount">
        <div className="sk-box sk-price" />
        <div className="sk-box sk-deposit" />
      </div>
    </div>
    <div className="seller-order-card-actions">
      <div className="sk-box sk-btn" />
      <div className="sk-box sk-btn" />
      <div className="sk-box sk-btn" />
    </div>
  </div>
);

const TabsSkeleton = () => (
  <div className="seller-orders-tabs">
    {[1, 2, 3].map(i => (
      <div key={i} className="seller-orders-tab" style={{ pointerEvents: "none" }}>
        <div className="sk-box" style={{ width: 22, height: 22, borderRadius: 11 }} />
        <div className="sk-box" style={{ width: 80, height: 14, borderRadius: 6 }} />
        <div className="sk-box" style={{ width: 22, height: 22, borderRadius: 11 }} />
      </div>
    ))}
  </div>
);

const SellerOrdersTab = ({
  orders,
  loading,
  onRefresh,
  onStatusUpdate,
  onGenerateInvoice,
  initialTab = "new",
  onTabChange,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const tabCounts = useMemo(() => {
    return TABS.reduce((acc, tab) => {
      acc[tab.key] = orders.filter(o =>
        tab.statuses.includes((o.status || "").toLowerCase())
      ).length;
      return acc;
    }, {});
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const activeTabConfig = TABS.find(t => t.key === activeTab);
    if (!activeTabConfig) return [];
    return orders
      .filter(o => activeTabConfig.statuses.includes((o.status || "").toLowerCase()))
      .filter(o => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.id?.toLowerCase().includes(q) ||
          o.product?.name?.toLowerCase().includes(q) ||
          o.buyer?.name?.toLowerCase().includes(q) ||
          o.buyer?.phone?.toLowerCase().includes(q)
        );
      });
  }, [orders, activeTab, searchQuery]);

  const handleTabClick = useCallback((tabKey) => {
    setActiveTab(tabKey);
    onTabChange?.(tabKey);
  }, [onTabChange]);

  const openOrder = useCallback((order) => {
    navigate(`/seller/order/${order.id}`, {
      state: { fromTab: activeTab },
    });
  }, [navigate, activeTab]);

  const handleReject = async (order, e) => {
    e.stopPropagation();
    const reason = prompt(
      "Why are you rejecting this order? (refund will be issued to buyer)\n\nExamples: Out of stock, Unable to deliver, Wrong pricing"
    );
    if (!reason || !reason.trim()) return;

    setUpdatingId(order.id);
    try {
      const { data, error } = await supabase.rpc("reject_seller_order", {
        p_order_id: order.id,
        p_seller_id: order.seller_id,
        p_reason: reason.trim(),
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Rejection failed");

      toast.success("Order rejected — buyer refunded", { duration: 4000 });
      onRefresh?.();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(err.message || "Failed to reject order");
    } finally {
      setUpdatingId(null);
    }
  };

  const getBadge = (order) => {
    const status = (order.status || "").toLowerCase();
    const statusMap = {
      pending: { label: "New", color: "#F59E0B" },
      deposit_paid: { label: "Deposit Paid", color: "#F59E0B" },
      processing: { label: "Processing", color: "#3B82F6" },
      shipped: { label: "Shipped", color: "#8B5CF6" },
      "out for delivery": { label: "Out for Delivery", color: "#EC4899" },
      out_for_delivery: { label: "Out for Delivery", color: "#EC4899" },
      on_delivery: { label: "Out for Delivery", color: "#EC4899" },
      delivered: { label: "Delivered", color: "#10B981" },
      completed: { label: "Completed", color: "#10B981" },
    };
    return statusMap[status] || { label: order.status || "Unknown", color: "#6B7280" };
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="seller-orders-root">
      {/* Header */}
      <div className="seller-orders-header">
        <div>
          <h2 className="seller-orders-title">Order Management</h2>
          <p className="seller-orders-subtitle">
            {loading ? "Loading..." : `${orders.length} total order${orders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button className="seller-orders-refresh" onClick={onRefresh} disabled={loading}>
          {loading ? <FaSpinner className="spin" /> : <FaSync />}
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs — show skeleton if loading */}
      {loading ? (
        <TabsSkeleton />
      ) : (
        <div className="seller-orders-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`seller-orders-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabClick(tab.key)}
              style={activeTab === tab.key ? {
                borderBottomColor: tab.color,
                color: tab.color,
              } : {}}
            >
              <span className="seller-orders-tab-icon">{tab.icon}</span>
              <span className="seller-orders-tab-label">{tab.label}</span>
              <span
                className="seller-orders-tab-count"
                style={activeTab === tab.key ? {
                  background: tab.color,
                  color: "white",
                } : { background: "rgba(0,0,0,0.05)" }}
              >
                {tabCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search — show skeleton if loading */}
      {loading ? (
        <div className="seller-orders-search">
          <div className="sk-box" style={{ width: "100%", height: 20, borderRadius: 6 }} />
        </div>
      ) : (
        <div className="seller-orders-search">
          <FaSearch className="seller-orders-search-icon" />
          <input
            type="text"
            placeholder="Search by order ID, product, or buyer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="seller-orders-search-clear" onClick={() => setSearchQuery("")}>
              ×
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="seller-orders-list">
          {[1, 2, 3, 4].map(i => <OrderCardSkeleton key={i} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="seller-orders-empty">
          {TABS.find(t => t.key === activeTab)?.emptyIcon}
          <p>{searchQuery ? "No orders match your search" : TABS.find(t => t.key === activeTab)?.emptyText}</p>
          <small>{searchQuery ? "Try a different search" : TABS.find(t => t.key === activeTab)?.emptySub}</small>
        </div>
      ) : (
        <div className="seller-orders-list">
          <AnimatePresence>
            {filteredOrders.map((order, index) => {
              const badge = getBadge(order);
              const isNew = activeTab === "new";
              const isDelivered = activeTab === "delivered";

              return (
                <motion.div
                  key={order.id}
                  className={`seller-order-card ${isDelivered ? "is-delivered" : ""}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => openOrder(order)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="seller-order-card-main">
                    <div className="seller-order-image">
                      <img
                        src={order.product?.image_gallery?.[0] || "/placeholder.jpg"}
                        alt={order.product?.name || "Product"}
                        onError={(e) => e.target.src = "/placeholder.jpg"}
                      />
                    </div>
                    <div className="seller-order-info">
                      <div className="seller-order-top-row">
                        <span className="seller-order-id">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className="seller-order-badge"
                          style={{ background: `${badge.color}18`, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <h4 className="seller-order-product-name">
                        {order.product?.name || "Unknown Product"}
                      </h4>
                      <div className="seller-order-meta">
                        <span><FaBox size={10} /> Qty: {order.quantity || 1}</span>
                        <span><FaUser size={10} /> {order.buyer?.name || "Anonymous"}</span>
                        <span>{timeAgo(order.created_at)}</span>
                      </div>
                    </div>
                    <div className="seller-order-amount">
                      <span className="seller-order-price">{formatKSH(order.total_price)}</span>
                      <span className="seller-order-deposit">
                        Deposit: {formatKSH(order.deposit_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="seller-order-card-actions">
                    <button
                      className="seller-order-action-btn view"
                      onClick={(e) => { e.stopPropagation(); openOrder(order); }}
                    >
                      <FaEye size={11} /> View Details
                    </button>
                    <button
                      className="seller-order-action-btn invoice"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateInvoice?.(order);
                      }}
                    >
                      <FaFileInvoice size={11} /> Invoice
                    </button>
                    {isNew && (
                      <button
                        className="seller-order-action-btn reject"
                        onClick={(e) => handleReject(order, e)}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <FaSpinner size={11} className="spin" />
                        ) : (
                          <>
                            <FaBan size={11} /> Reject
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SellerOrdersTab;