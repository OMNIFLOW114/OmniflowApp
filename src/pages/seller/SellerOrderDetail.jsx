// src/pages/seller/SellerOrderDetail.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
  FaArrowLeft, FaBox, FaUser, FaPhone, FaMapMarkerAlt, FaTruck,
  FaCheckCircle, FaHourglassHalf, FaShippingFast, FaClipboardCheck,
  FaCommentDots, FaPaperPlane, FaFileInvoice, FaMoneyBillWave,
  FaSpinner, FaWhatsapp, FaCopy, FaShieldAlt, FaExclamationTriangle
} from "react-icons/fa";
import "./SellerOrderDetail.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const STEPS = [
  { key: "pending",        label: "Placed",         icon: <FaClipboardCheck /> },
  { key: "processing",     label: "Processing",     icon: <FaBox /> },
  { key: "shipped",        label: "Shipped",        icon: <FaShippingFast /> },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck /> },
  { key: "delivered",      label: "Delivered",      icon: <FaCheckCircle /> },
];

const STATUS_ORDER = {
  pending: 0,
  deposit_paid: 0,
  processing: 1,
  shipped: 2,
  out_for_delivery: 3,
  "out for delivery": 3,
  on_delivery: 3,
  delivered: 4,
  completed: 4,
};

const getStatusStep = (status) => STATUS_ORDER[(status || "").toLowerCase()] ?? 0;

// ─── SKELETON ─────────────────────────────────────────────────
const OrderDetailSkeleton = ({ darkMode }) => (
  <div className={`seller-order-detail-root ${darkMode ? "dark" : "light"}`}>
    <header className="sod-header sod-skeleton">
      <div className="sod-skel-circle" />
      <div style={{ flex: 1 }}>
        <div className="sod-skel-line" style={{ width: "40%", height: 18, marginBottom: 6 }} />
        <div className="sod-skel-line" style={{ width: "60%", height: 12 }} />
      </div>
      <div className="sod-skel-circle" />
    </header>
    <main className="sod-main">
      <div className="sod-skel-card">
        <div className="sod-skel-line" style={{ width: "100%", height: 80 }} />
      </div>
      <div className="sod-skel-card">
        <div className="sod-skel-line" style={{ width: "30%", height: 16, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 12 }}>
          <div className="sod-skel-line" style={{ width: 80, height: 80, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div className="sod-skel-line" style={{ width: "70%", height: 14, marginBottom: 8 }} />
            <div className="sod-skel-line" style={{ width: "40%", height: 12, marginBottom: 8 }} />
            <div className="sod-skel-line" style={{ width: "90%", height: 12 }} />
          </div>
        </div>
      </div>
      <div className="sod-skel-card">
        <div className="sod-skel-line" style={{ width: "30%", height: 16, marginBottom: 12 }} />
        <div className="sod-skel-line" style={{ width: "100%", height: 60, marginBottom: 8 }} />
        <div className="sod-skel-line" style={{ width: "100%", height: 40 }} />
      </div>
    </main>
  </div>
);

const SellerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();

  const [order, setOrder] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [store, setStore] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const handleBack = useCallback(() => {
  // Persist section so dashboard restores the right tab on mount
  sessionStorage.setItem("sellerDashboardSection", "orders");
  sessionStorage.setItem("sellerOrdersTab", "new");

  // Try browser history first — returns to where the seller came from
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    // Direct link / fresh load — go to dashboard route
    navigate("/store-dashboard");
  }
}, [navigate]);

  // -------------------------------------------------------
  // FETCH ORDER — buyer from orders.buyer_phone + users.name
  // -------------------------------------------------------
  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select(`
          *,
          product:product_id (id, name, image_gallery, image_url, category, weight_class),
          store:store_id (id, name, contact_phone, contact_email, location)
        `)
        .eq("id", id)
        .single();

      if (orderErr) throw orderErr;
      if (!orderData) {
        toast.error("Order not found");
        handleBack();
        return;
      }

      setOrder(orderData);
      setStore(orderData.store || null);

      // ✅ FIXED: fetch name from users.name only (schema-confirmed column)
      let buyerName = null;
      let buyerEmail = null;
      if (orderData.buyer_id) {
        try {
          const { data: userData } = await supabase
            .from("users")
            .select("name, email")
            .eq("id", orderData.buyer_id)
            .maybeSingle();
          if (userData) {
            buyerName = userData.name || null;
            buyerEmail = userData.email || null;
          }
        } catch (err) {
          console.warn("Buyer user lookup failed:", err);
        }
      }

      // ✅ FIXED: phone comes from orders.buyer_phone (more reliable than users.phone)
      setBuyer({
        name: buyerName,
        phone: orderData.buyer_phone || null,
        email: buyerEmail,
      });

      // Fetch updates (safe)
      try {
        const { data: updatesData } = await supabase.rpc("get_order_updates", {
          p_order_id: id,
        });
        setUpdates(updatesData || []);
      } catch {
        setUpdates([]);
      }
    } catch (err) {
      console.error("Fetch order error:", err);
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id, handleBack]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // -------------------------------------------------------
  // REAL-TIME
  // -------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`order-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          setOrder(prev => ({ ...prev, ...payload.new }));
          // Also update buyer phone if it changed
          if (payload.new.buyer_phone !== undefined) {
            setBuyer(prev => ({ ...prev, phone: payload.new.buyer_phone }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_updates", filter: `order_id=eq.${id}` },
        () => {
          supabase.rpc("get_order_updates", { p_order_id: id }).then(({ data }) => {
            setUpdates(data || []);
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  // -------------------------------------------------------
  // STATUS UPDATE
  // -------------------------------------------------------
  const updateStatus = async (newStatus, statusLabel) => {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      setOrder(prev => ({ ...prev, status: newStatus }));

      const statusMessages = {
        processing: `Good news! I've started processing your order #${order.id.slice(0, 8)}. I'll update you when it ships.`,
        shipped: `Your order #${order.id.slice(0, 8)} has been shipped! Track updates here.`,
        out_for_delivery: `Your order #${order.id.slice(0, 8)} is out for delivery today. Please be available to receive it.`,
        delivered: `Your order #${order.id.slice(0, 8)} has been delivered. Thank you for shopping with us!`,
      };

      if (statusMessages[newStatus]) {
        await supabase.rpc("add_order_update", {
          p_order_id: order.id,
          p_sender_id: user.id,
          p_message: statusMessages[newStatus],
          p_update_type: "status",
        });
      }

      toast.success(`Order marked as ${statusLabel}`, { icon: "✅" });
      await fetchOrder();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // -------------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------------
  const sendMessage = async () => {
    if (!newMessage.trim() || !order) return;
    setSendingMessage(true);
    try {
      const { data, error } = await supabase.rpc("add_order_update", {
        p_order_id: order.id,
        p_sender_id: user.id,
        p_message: newMessage.trim(),
        p_update_type: "note",
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send");

      setNewMessage("");
      toast.success("Message sent to buyer");
      await fetchOrder();
    } catch (err) {
      console.error("Send message error:", err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // -------------------------------------------------------
  // INVOICE (working PDF download)
  // -------------------------------------------------------
  const generateInvoice = useCallback(() => {
    if (!order) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("INVOICE", pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Invoice #: INV-${order.id.slice(0, 8).toUpperCase()}`, margin, y);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, y, { align: "right" });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(store?.name || "Your Store", margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      if (store?.contact_email) { doc.text(store.contact_email, margin, y); y += 6; }
      if (store?.contact_phone) { doc.text(store.contact_phone, margin, y); y += 6; }
      y += 9;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Bill To:", margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(buyer?.name || "Customer", margin, y);
      y += 5;
      if (buyer?.email) { doc.text(buyer.email, margin, y); y += 5; }
      if (buyer?.phone) { doc.text(buyer.phone, margin, y); y += 5; }
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Order Details:", margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Order ID: ${order.id.slice(0, 12)}...`, margin, y); y += 6;
      doc.text(`Product: ${order.product?.name || "N/A"}`, margin, y); y += 6;
      doc.text(`Quantity: ${order.quantity || 1}`, margin, y); y += 6;
      doc.text(`Delivery Location: ${order.delivery_location || "N/A"}`, margin, y); y += 12;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Subtotal: Ksh ${Number(order.total_price || 0) - Number(order.delivery_fee || 0)}`, margin, y); y += 7;
      doc.text(`Delivery Fee: Ksh ${order.delivery_fee || 0}`, margin, y); y += 7;
      doc.setFontSize(12);
      doc.text(`Total: Ksh ${order.total_price || 0}`, margin, y); y += 12;

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for shopping with us!", pageWidth / 2, y + 20, { align: "center" });

      doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
      toast.success("Invoice downloaded");
    } catch (err) {
      console.error("Invoice generation error:", err);
      toast.error("Failed to generate invoice");
    }
  }, [order, buyer, store]);

  // -------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------
  const callBuyer = () => {
    if (!buyer?.phone) return toast.error("Buyer has no phone number");
    window.location.href = `tel:${buyer.phone}`;
  };

  const whatsappBuyer = () => {
    if (!buyer?.phone) return toast.error("Buyer has no phone number");
    const phone = buyer.phone.replace(/^0+/, "");
    window.open(`https://wa.me/254${phone}`, "_blank");
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("Order ID copied");
  };

  const currentStep = order ? getStatusStep(order.status) : 0;
  const isDelivered = order && ["delivered", "completed"].includes((order.status || "").toLowerCase());
  const isNew = order && ["pending", "deposit_paid"].includes((order.status || "").toLowerCase());

  const nextStep = useMemo(() => {
    if (!order || isDelivered) return null;
    const step = currentStep;
    if (step === 0) return { status: "processing", label: "Start Processing" };
    if (step === 1) return { status: "shipped", label: "Mark as Shipped" };
    if (step === 2) return { status: "out for delivery", label: "Out for Delivery" };
    if (step === 3) return { status: "delivered", label: "Mark as Delivered" };
    return null;
  }, [order, currentStep, isDelivered]);

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

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  if (loading) return <OrderDetailSkeleton darkMode={darkMode} />;
  if (!order) return null;

  return (
    <div className={`seller-order-detail-root ${darkMode ? "dark" : "light"}`}>
      <header className="sod-header">
        <button className="sod-back" onClick={handleBack} aria-label="Back to orders">
          <FaArrowLeft />
        </button>
        <div className="sod-header-center">
          <h1 className="sod-title">
            Order #{order.id.slice(0, 8).toUpperCase()}
            <button className="sod-copy" onClick={copyOrderId} title="Copy Order ID">
              <FaCopy size={11} />
            </button>
          </h1>
          <p className="sod-subtitle">
            {timeAgo(order.created_at)} · {order.quantity || 1} item{(order.quantity || 1) > 1 ? "s" : ""}
          </p>
        </div>
        <button className="sod-invoice-btn" onClick={generateInvoice} title="Download invoice">
          <FaFileInvoice />
        </button>
      </header>

      <main className="sod-main">
        {/* PROGRESS */}
        <div className="sod-progress-card">
          <div className="sod-progress-steps">
            {STEPS.map((step, idx) => {
              const isActive = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="sod-step-wrapper">
                  <div className={`sod-step ${isActive ? "active" : ""} ${isCurrent ? "current" : ""}`}>
                    <div className="sod-step-icon">{step.icon}</div>
                  </div>
                  <span className={`sod-step-label ${isActive ? "active" : ""}`}>{step.label}</span>
                  {idx < STEPS.length - 1 && (
                    <div className={`sod-step-line ${idx < currentStep ? "completed" : ""}`} />
                  )}
                </div>
              );
            })}
          </div>

          {nextStep && !isDelivered && (
            <div className="sod-next-action">
              <div>
                <div className="sod-next-label">Next action</div>
                <div className="sod-next-value">{nextStep.label}</div>
              </div>
              <button
                className="sod-next-btn"
                onClick={() => updateStatus(nextStep.status, nextStep.label)}
                disabled={updatingStatus}
              >
                {updatingStatus ? <FaSpinner className="spin" /> : nextStep.label}
              </button>
            </div>
          )}

          {isDelivered && (
            <div className="sod-delivered-banner">
              <FaCheckCircle size={20} />
              <span>Order completed successfully</span>
            </div>
          )}
        </div>

        {/* PRODUCT */}
        <div className="sod-card">
          <h3 className="sod-card-title">Product</h3>
          <div className="sod-product">
            <img
              src={order.product?.image_gallery?.[0] || order.product?.image_url || "/placeholder.jpg"}
              alt={order.product?.name}
              className="sod-product-img"
              onError={(e) => e.target.src = "/placeholder.jpg"}
            />
            <div className="sod-product-info">
              <h4 className="sod-product-name">{order.product?.name || "Unknown Product"}</h4>
              <div className="sod-product-meta">
                <span>Qty: {order.quantity || 1}</span>
                <span>·</span>
                <span>{order.product?.category || "Uncategorized"}</span>
              </div>
              <div className="sod-product-pricing">
                <div className="sod-price-row">
                  <span>Product total</span>
                  <strong>{formatKSH(Number(order.total_price || 0) - Number(order.delivery_fee || 0))}</strong>
                </div>
                <div className="sod-price-row">
                  <span>Delivery fee</span>
                  <strong>{formatKSH(order.delivery_fee)}</strong>
                </div>
                <div className="sod-price-row sod-price-total">
                  <span>Total</span>
                  <strong>{formatKSH(order.total_price)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BUYER */}
        <div className="sod-card">
          <h3 className="sod-card-title">Buyer</h3>
          <div className="sod-buyer">
            <div className="sod-buyer-info">
              <div className="sod-buyer-avatar">
                <FaUser size={18} />
              </div>
              <div>
                <div className="sod-buyer-name">{buyer?.name || "Anonymous"}</div>
                <div className="sod-buyer-phone">{buyer?.phone || "No phone on file"}</div>
              </div>
            </div>
            <div className="sod-contact-buttons">
              <button className="sod-contact-btn call" onClick={callBuyer} disabled={!buyer?.phone}>
                <FaPhone size={12} /> Call
              </button>
              <button className="sod-contact-btn whatsapp" onClick={whatsappBuyer} disabled={!buyer?.phone}>
                <FaWhatsapp size={12} /> WhatsApp
              </button>
            </div>
          </div>

          <div className="sod-delivery-info">
            <div className="sod-delivery-row">
              <FaMapMarkerAlt size={12} />
              <span>{order.delivery_location || "No delivery address"}</span>
            </div>
            <div className="sod-delivery-row">
              <FaTruck size={12} />
              <span>Delivery method: {order.delivery_method || "Standard"}</span>
            </div>
            {order.delivery_estimated_days && (
              <div className="sod-delivery-row">
                <FaHourglassHalf size={12} />
                <span>Estimated delivery: {order.delivery_estimated_days} days</span>
              </div>
            )}
          </div>
        </div>

        {/* PAYMENT */}
        <div className="sod-card">
          <h3 className="sod-card-title">Payment & Escrow</h3>
          <div className="sod-payment-grid">
            <div className="sod-payment-item">
              <span className="sod-payment-label">Deposit paid</span>
              <strong className="sod-payment-value success">{formatKSH(order.deposit_amount)}</strong>
            </div>
            <div className="sod-payment-item">
              <span className="sod-payment-label">Balance due</span>
              <strong className={`sod-payment-value ${Number(order.balance_due) > 0 ? "warning" : "success"}`}>
                {Number(order.balance_due) > 0 ? formatKSH(order.balance_due) : "Paid"}
              </strong>
            </div>
          </div>

          {!order.escrow_released && !isDelivered && (
            <div className="sod-escrow-badge">
              <FaShieldAlt size={12} />
              <span>{formatKSH(order.deposit_amount)} held in escrow until delivery</span>
            </div>
          )}

          {order.mpesa_receipt && (
            <div className="sod-receipt">
              <span>M-Pesa Receipt:</span>
              <code>{order.mpesa_receipt}</code>
            </div>
          )}
        </div>

        {/* MESSAGES */}
        <div className="sod-card">
          <h3 className="sod-card-title">
            <FaCommentDots size={12} /> Buyer Messages & Updates
          </h3>

          <div className="sod-composer">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isNew
                  ? "Send a message to the buyer (e.g., 'Thanks for your order! I'll ship it tomorrow.')"
                  : currentStep === 3
                  ? "Send a delivery update (e.g., 'Your delivery is 30 minutes away')"
                  : isDelivered
                  ? "Send a follow-up (e.g., 'Thanks for shopping with us!')"
                  : "Send a message to the buyer..."
              }
              rows={3}
              maxLength={500}
            />
            <div className="sod-composer-actions">
              <span className="sod-composer-hint">{newMessage.length}/500 characters</span>
              <button
                className="sod-send-btn"
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? <FaSpinner className="spin" /> : <><FaPaperPlane size={11} /> Send</>}
              </button>
            </div>
          </div>

          {updates.length > 0 ? (
            <div className="sod-updates-list">
              {updates.map((update) => (
                <div key={update.id} className={`sod-update-item type-${update.update_type}`}>
                  <div className="sod-update-dot" />
                  <div className="sod-update-content">
                    <div className="sod-update-header">
                      <strong>You</strong>
                      <span className="sod-update-time">{timeAgo(update.created_at)}</span>
                    </div>
                    <p className="sod-update-message">{update.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sod-empty-updates">
              No messages yet. Send the buyer their first update.
            </div>
          )}
        </div>

        {/* REJECT */}
        {isNew && (
          <div className="sod-danger-zone">
            <div className="sod-danger-info">
              <FaExclamationTriangle size={14} />
              <div>
                <strong>Can't fulfill this order?</strong>
                <p>Rejecting will refund the buyer in full.</p>
              </div>
            </div>
            <button
              className="sod-reject-btn"
             onClick={() => {
              sessionStorage.setItem("sellerDashboardSection", "orders");
              sessionStorage.setItem("sellerOrdersTab", "new");
              sessionStorage.setItem("sellerRejectOrderId", order.id);

             if (window.history.length > 1) {
             navigate(-1);
             } else {
             navigate("/store-dashboard");
             }
             }}
            >
              Reject Order
            </button>
          </div>
        )}

        <div className="sod-spacer" />
      </main>
    </div>
  );
};

export default SellerOrderDetail;