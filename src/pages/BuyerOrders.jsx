// src/pages/BuyerOrders.jsx - PHASE 4 (Cancel + Refund + Cancelled Tab)
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import { toast } from "react-hot-toast";
import {
  FaBox, FaCheckCircle, FaMapMarkerAlt, FaClock, FaStore,
  FaShippingFast, FaTruck, FaStar, FaWallet, FaKey, FaMotorcycle,
  FaMobile, FaTimes, FaChevronRight, FaHourglassHalf, FaArrowLeft,
  FaSpinner, FaCircle, FaImage, FaShoppingBag, FaUser, FaPhone,
  FaMoneyBillWave, FaCalendarAlt, FaClipboardCheck, FaRocket,
  FaGift, FaShieldAlt, FaMedal, FaWhatsapp, FaEye, FaBan,
  FaUndo, FaExclamationTriangle, FaCheck,
} from "react-icons/fa";
import styles from "./BuyerOrders.module.css";

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const toastGuardRef = { current: {} };
const canShowToast = (id, windowMs = 4000) => {
  const now = Date.now();
  if (now - (toastGuardRef.current[id] || 0) < windowMs) return false;
  toastGuardRef.current[id] = now;
  return true;
};

const STEPS = [
  { key: "pending", label: "Pending", icon: <FaHourglassHalf />, color: "#F59E0B" },
  { key: "processing", label: "Processing", icon: <FaBox />, color: "#3B82F6" },
  { key: "shipped", label: "Shipped", icon: <FaShippingFast />, color: "#8B5CF6" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck />, color: "#EC4899" },
  { key: "delivered", label: "Delivered", icon: <FaCheckCircle />, color: "#10B981" },
];

const getDeliveryTypeInfo = (type) => {
  if (type === "self-delivery") {
    return { icon: <FaStore size={12} />, label: "Self Delivery", color: "#F59E0B", bg: "#FEF3C7" };
  }
  return { icon: <FaMotorcycle size={12} />, label: "Omniflow", color: "#3B82F6", bg: "#EFF6FF" };
};

const getStatusStep = (status) => {
  if (!status) return 0;
  const map = {
    pending: 0,
    deposit_paid: 1,
    processing: 1,
    shipped: 2,
    on_delivery: 3,
    "out for delivery": 3,
    out_for_delivery: 3,
    delivered: 4,
    completed: 4,
    balance_paid: 4,
  };
  return map[status?.toLowerCase()] || 0;
};

// Cancellation rules: no penalty until out_for_delivery
const getCancellationPenalty = (status, depositAmount) => {
  const s = (status || "").toLowerCase();
  if (["out_for_delivery", "on_delivery", "out for delivery"].includes(s)) {
    return Math.round(Number(depositAmount || 0) * 0.25 * 100) / 100;
  }
  return 0;
};

const canCancelOrder = (order) => {
  if (!order) return false;
  if (order.delivered === true) return false;
  const s = (order.status || "").toLowerCase();
  return !["cancelled", "refunded", "completed", "delivered"].includes(s);
};

const canRequestRefund = (order) => {
  if (!order) return false;
  if (order.delivered !== true) return false;
  const s = (order.status || "").toLowerCase();
  if (["cancelled", "refunded"].includes(s)) return false;
  // Only if no existing open refund
  if (order.return_requested && ["pending", "approved"].includes((order.return_status || "").toLowerCase())) return false;
  return true;
};

const REFUND_REASONS = [
  { value: "damaged", label: "Damaged / Broken" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "size_fit", label: "Size / Fit issue" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

// ---------------------------------------------------------
// SKELETON
// ---------------------------------------------------------
const OrderCardSkeleton = () => (
  <div className={`${styles.orderCardModern} ${styles.skeleton}`}>
    <div className={styles.skeletonImage}></div>
    <div className={styles.orderHeaderInfo}>
      <div className={styles.skeletonTitle}></div>
      <div className={styles.skeletonStore}></div>
      <div className={styles.skeletonMeta}></div>
    </div>
  </div>
);

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------
const BuyerOrders = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { initiateWalletDeposit, loading: mpesaLoading, cancelPolling } = useMpesaPayment();

  const [tab, setTab] = useState(() => sessionStorage.getItem("buyerOrdersTab") || "all");
  const [orders, setOrders] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpOrderId, setOtpOrderId] = useState(null);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [mpesaPaymentStep, setMpesaPaymentStep] = useState(1);
  const [mpesaPaymentCheckoutId, setMpesaPaymentCheckoutId] = useState(null);
  const [mpesaPaymentAmount, setMpesaPaymentAmount] = useState(0);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [hoveredRating, setHoveredRating] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Refund modal state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundOrderTarget, setRefundOrderTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundDescription, setRefundDescription] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("buyerOrdersTab", tab);
  }, [tab]);

  // ---------------- REAL-TIME UPDATES ----------------
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("buyer-orders-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` },
        (payload) => {
          const oldOrder = orders.find((o) => o.id === payload.new.id);
          const oldStatus = oldOrder?.status;
          const newStatus = payload.new?.status;

          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );

          if (oldStatus !== newStatus && newStatus) {
            const statusMessages = {
              shipped: "Your order has been shipped! 🚚",
              out_for_delivery: "Your order is out for delivery! 📦",
              delivered: "Seller marked order as delivered! Please confirm delivery.",
              processing: "Seller is processing your order!",
            };
            if (statusMessages[newStatus] && canShowToast(`status-${payload.new.id}-${newStatus}`, 8000)) {
              toast.success(statusMessages[newStatus], { duration: 5000 });
            }
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, orders]);

  // ---------------- FETCH ----------------
  const fetchWallet = useCallback(async () => {
    if (!user?.id) return 0;
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    const balance = Number(data?.balance || 0);
    setWalletBalance(balance);
    return balance;
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return [];
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(
        `*, product:products!orders_product_id_fkey(id, name, image_gallery, image_url, store_id, category, owner_id)`
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (canShowToast("orders-load-error", 8000)) toast.error("Failed to load orders");
      return [];
    }

    const storeIds = [...new Set(ordersData.map((o) => o.product?.store_id).filter(Boolean))];
    const productIds = ordersData.map((o) => o.product?.id).filter(Boolean);

    const [storesRes, ratingsRes, returnsRes] = await Promise.all([
      storeIds.length
        ? supabase.from("stores").select("id, name, location, delivery_type, owner_id, contact_phone").in("id", storeIds)
        : Promise.resolve({ data: [] }),
      productIds.length
        ? supabase.from("ratings").select("product_id, rating").eq("user_id", user.id).in("product_id", productIds)
        : Promise.resolve({ data: [] }),
      supabase.from("returns").select("id, order_id, status").eq("buyer_id", user.id),
    ]);

    const storesData = storesRes.data || [];
    const ratingsData = ratingsRes.data || [];
    const returnsData = returnsRes.data || [];

    const enriched = ordersData.map((o) => {
      const store = storesData.find((s) => s.id === o.product?.store_id);
      const deliveryType = store?.delivery_type || "omniflow-managed";
      const deliveryInfo = getDeliveryTypeInfo(deliveryType);
      const existingRating = ratingsData.find((r) => r.product_id === o.product?.id);
      const existingReturn = returnsData.find((r) => r.order_id === o.id);

      let imageUrl = "/placeholder.png";
      if (o.product?.image_gallery?.length > 0 && o.product.image_gallery[0]) {
        imageUrl = o.product.image_gallery[0];
      } else if (o.product?.image_url) {
        imageUrl = o.product.image_url;
      }

      return {
        ...o,
        store,
        delivery_type: deliveryType,
        delivery_info: deliveryInfo,
        has_rated: !!existingRating,
        user_rating: existingRating?.rating || null,
        product_image: imageUrl,
        store_phone: store?.contact_phone || "",
        active_return: existingReturn,
      };
    });

    setOrders(enriched);
    return enriched;
  }, [user]);

  const fetchInstallments = useCallback(async () => {
    if (!user?.id) return [];
    const { data } = await supabase
      .from("installment_orders")
      .select(`*, products:product_id(id, name, image_gallery, image_url), seller:seller_id(id, full_name, email)`)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    setInstallments(data || []);
    return data || [];
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchWallet(), fetchOrders(), fetchInstallments()]);
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchWallet, fetchOrders, fetchInstallments]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------- PROGRESS BAR ----------------
  const renderProgressBar = (status, delivered) => {
    const currentStep = delivered ? 4 : getStatusStep(status);
    return (
      <div className={styles.modernProgressWrapper}>
        <div className={styles.modernProgressContainer}>
          {STEPS.map((step, index) => {
            const isActive = index <= currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={step.key} className={styles.modernProgressStep}>
                <div className={styles.modernProgressConnector}>
                  <div
                    className={`${styles.modernProgressCircle} ${isActive ? styles.active : ""} ${isCurrent ? styles.current : ""}`}
                    style={{
                      borderColor: isActive ? step.color : "#e0e0e0",
                      background: isActive ? step.color : "transparent",
                      color: isActive ? "#fff" : "#999",
                    }}
                  >
                    {isActive ? step.icon : <span className={styles.stepNumber}>{index + 1}</span>}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`${styles.modernProgressLine} ${index < currentStep ? styles.activeLine : ""}`} />
                  )}
                </div>
                <div className={styles.modernProgressLabel}>
                  <span className={`${styles.modernProgressText} ${isActive ? styles.activeText : ""}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.modernProgressStatus}>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} style={{ background: delivered ? "#10B981" : STEPS[currentStep]?.color || "#F59E0B" }} />
            <span className={styles.statusText}>
              {delivered ? "✓ Order Completed" : `${STEPS[currentStep]?.label || "Pending"} in Progress`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ---------------- RATING ----------------
  const renderRatingStars = (order) => {
    const isRated = order.has_rated;
    const currentRating = order.user_rating || 0;
    const hoverRating = hoveredRating[order.id] || 0;
    return (
      <div className={styles.ratingSectionModern}>
        <span className={styles.ratingLabel}>{isRated ? "Your rating" : "Rate this product"}</span>
        <div className={styles.starsModern}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`${styles.starModern} ${hoverRating >= star || (!hoverRating && currentRating >= star) ? styles.active : ""}`}
              onMouseEnter={() => !isRated && !submittingRating && setHoveredRating((p) => ({ ...p, [order.id]: star }))}
              onMouseLeave={() => !isRated && !submittingRating && setHoveredRating((p) => ({ ...p, [order.id]: 0 }))}
              onClick={() => !isRated && !submittingRating && handleSubmitRating(order, star)}
              disabled={isRated || submittingRating}
            >
              <FaStar />
            </button>
          ))}
          {isRated && <span className={styles.ratedBadge}>✓ Rated</span>}
        </div>
      </div>
    );
  };

  const handleSubmitRating = async (order, rating) => {
    if (!user?.id) {
      toast.error("Please login to rate");
      return;
    }
    setSubmittingRating(true);
    const loadingToast = toast.loading("Submitting rating...");
    try {
      const { error } = await supabase.from("ratings").upsert(
        {
          user_id: user.id,
          product_id: order.product.id,
          rating: Number(rating),
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id, product_id" }
      );
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, has_rated: true, user_rating: rating } : o)));
      toast.dismiss(loadingToast);
      if (canShowToast("rating-success", 4000)) toast.success("Thank you for rating!", { icon: "⭐" });
    } catch (err) {
      console.error("Rating error:", err);
      toast.dismiss(loadingToast);
      if (canShowToast("rating-error", 4000)) toast.error("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  // ---------------- OTP ----------------
  const openOtpModal = (order) => {
    if (!order?.delivery_otp) return toast.error("OTP not available yet. Wait for seller to provide it.");
    setOtpValue("");
    setOtpOrderId(order.id);
    setOtpOpen(true);
  };

  const submitOtp = async () => {
    if (!otpOrderId || otpValue.length !== 6) return toast.error("Enter a valid 6-digit OTP");
    setSubmittingOtp(true);
    try {
      const { data, error } = await supabase.rpc("mark_order_delivered", { p_order: otpOrderId, p_otp: otpValue });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to confirm delivery");
      setOrders((prev) =>
        prev.map((o) => (o.id === otpOrderId ? { ...o, delivered: true, status: data.needs_payment ? "delivered" : "completed" } : o))
      );
      toast.success(data.needs_payment ? "Delivery confirmed! You can now pay the balance." : "Delivery confirmed! Order completed.");
      setOtpOpen(false);
      setOtpOrderId(null);
      setOtpValue("");
      await fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to confirm delivery");
    } finally {
      setSubmittingOtp(false);
    }
  };

  // ---------------- PAY BALANCE ----------------
  const handleMpesaPayment = async (order, phoneNumber) => {
    setProcessingPayment(true);
    setMpesaPaymentStep(2);
    setMpesaPaymentAmount(order.balance_due);
    setMpesaPhoneNumber(phoneNumber);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");
    try {
      const result = await initiateWalletDeposit(
        phoneNumber,
        order.balance_due,
        user.id,
        async (receipt, paidAmount) => {
          const { data, error } = await supabase.rpc("pay_remaining_balance", { p_order: order.id, p_buyer: user.id });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Payment processing failed");
          await supabase.from("orders").update({ mpesa_receipt: receipt, updated_at: new Date().toISOString() }).eq("id", order.id);
          setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, balance_paid: true, balance_due: 0, status: o.delivered ? "completed" : "balance_paid" } : o))
          );
          setMpesaPaymentStep(3);
          toast.dismiss(loadingToast);
          if (canShowToast("balance-success", 60000)) toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, { duration: 6000, icon: "✅" });
          await fetchWallet();
          setTimeout(() => {
            setPaymentModalOpen(false);
            setSelectedOrder(null);
            setMpesaPaymentStep(1);
            setProcessingPayment(false);
          }, 3000);
        },
        (error) => {
          setMpesaPaymentStep(1);
          toast.dismiss(loadingToast);
          if (canShowToast("balance-fail", 4000)) toast.error(`Payment failed: ${error}. Please try again.`);
          setProcessingPayment(false);
        }
      );
      setMpesaPaymentCheckoutId(result?.checkoutRequestID);
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("balance-error", 4000)) toast.error(err?.message || "M-Pesa payment failed");
      setMpesaPaymentStep(1);
      setProcessingPayment(false);
    }
  };

  const processWalletPayment = async (order) => {
    setProcessingPayment(true);
    const loadingToast = toast.loading("Processing payment...");
    try {
      const { data, error } = await supabase.rpc("pay_remaining_balance", { p_order: order.id, p_buyer: user.id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Payment failed");
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, balance_paid: true, balance_due: 0, status: o.delivered ? "completed" : "balance_paid" } : o))
      );
      toast.dismiss(loadingToast);
      if (canShowToast("wallet-pay-success", 60000)) toast.success(`Payment successful! Amount: ${formatKSH(order.balance_due)}`, { duration: 5000 });
      await fetchWallet();
      setPaymentModalOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("wallet-pay-fail", 4000)) toast.error(err?.message || "Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentModal = (order) => {
    setSelectedOrder(order);
    setPaymentMethod("");
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!selectedOrder || !paymentMethod) return toast.error("Please select a payment method");
    if (paymentMethod === "wallet") return processWalletPayment(selectedOrder);
    if (paymentMethod === "mpesa") {
      const phone = prompt("Enter your M-Pesa phone number (e.g., 0712345678):", user?.phone || "");
      if (!phone || !/^0[17]\d{8}$/.test(phone)) {
        toast.error("Please enter a valid M-Pesa phone number");
        setProcessingPayment(false);
        return;
      }
      await handleMpesaPayment(selectedOrder, phone);
    }
  };

  // ---------------- CANCEL ORDER ----------------
  const openCancelModal = (order) => {
    setCancelOrderTarget(order);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelOrderTarget) return;
    if (!cancelReason.trim()) return toast.error("Please tell us why you're cancelling");
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancel_buyer_order", {
        p_order_id: cancelOrderTarget.id,
        p_buyer_id: user.id,
        p_reason: cancelReason.trim(),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Cancellation failed");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelOrderTarget.id
            ? { ...o, status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: cancelReason.trim() }
            : o
        )
      );

      setCancelModalOpen(false);
      setCancelOrderTarget(null);
      if (canShowToast("cancel-success", 60000)) {
        toast.success(
          <div>
            <strong>Order cancelled</strong>
            <br />
            <small>
              {data.refund_to_buyer > 0 ? `KSh ${data.refund_to_buyer} refunded to wallet` : "No refund needed"}
              {data.penalty > 0 ? ` · KSh ${data.penalty} penalty applied` : ""}
            </small>
          </div>,
          { duration: 6000 }
        );
      }
      await fetchWallet();
    } catch (err) {
      console.error("Cancel error:", err);
      if (canShowToast("cancel-error", 4000)) toast.error(err?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  // ---------------- REQUEST REFUND ----------------
  const openRefundModal = (order) => {
    setRefundOrderTarget(order);
    setRefundReason("");
    setRefundDescription("");
    setRefundModalOpen(true);
  };

  const submitRefund = async () => {
    if (!refundOrderTarget) return;
    if (!refundReason) return toast.error("Please select a reason");
    if (refundDescription.trim().length < 10) return toast.error("Please describe the issue (min 10 characters)");
    setSubmittingRefund(true);
    try {
      const { data, error } = await supabase.rpc("request_refund", {
        p_order_id: refundOrderTarget.id,
        p_buyer_id: user.id,
        p_reason: refundReason,
        p_description: refundDescription.trim(),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Refund request failed");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === refundOrderTarget.id
            ? { ...o, return_requested: true, return_status: "pending", return_reason: refundReason }
            : o
        )
      );

      setRefundModalOpen(false);
      setRefundOrderTarget(null);
      if (canShowToast("refund-success", 60000)) {
        toast.success("Refund request submitted! Seller will review within 24h.", { duration: 6000 });
      }
    } catch (err) {
      console.error("Refund error:", err);
      if (canShowToast("refund-error", 4000)) toast.error(err?.message || "Failed to submit refund request");
    } finally {
      setSubmittingRefund(false);
    }
  };

  // ---------------- NAVIGATION ----------------
  const navigateToOrderDetail = (orderId) => navigate(`/order/${orderId}`);
  const toggleOrderExpand = (orderId) => setExpandedOrders((p) => ({ ...p, [orderId]: !p[orderId] }));

  const activeOrders = useMemo(() => orders.filter((o) => !["completed", "refunded"].includes((o.status || "").toLowerCase()) && !o.escrow_released && !o.cancelled_at && !o.return_requested), [orders]);
  const completedOrders = useMemo(() => orders.filter((o) => (o.status === "completed" || o.escrow_released) && !o.return_requested), [orders]);
  const cancelledOrders = useMemo(() => orders.filter((o) => o.cancelled_at || (o.status || "").toLowerCase() === "cancelled"), [orders]);

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.headerModern}>
          <button className={styles.backBtnModern} onClick={() => navigate(-1)}><FaArrowLeft /></button>
          <div className={styles.headerCenter}>
            <h1 className={styles.headerTitle}>My Orders</h1>
            <p className={styles.headerSubtitle}>Track your purchases</p>
          </div>
        </div>
        <div className={styles.ordersListModern}>
          {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* M-Pesa Payment Modals */}
      <AnimatePresence>
        {mpesaPaymentStep === 2 && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.paymentLoaderModern}>
                <div className={styles.spinnerModern}></div>
                <h4 className={styles.paymentTitle}>Processing Payment</h4>
                <p className={styles.paymentInstruction}>Please check your phone ({mpesaPhoneNumber}) and enter your M-Pesa PIN</p>
                <p className={styles.paymentAmountModern}>Amount: <strong>{formatKSH(mpesaPaymentAmount)}</strong></p>
                <button onClick={() => { cancelPolling(); setMpesaPaymentStep(1); setProcessingPayment(false); }} className={styles.cancelBtnModern}>Cancel Payment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {mpesaPaymentStep === 3 && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.successContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.successIconModern}>✅</div>
              <h3 className={styles.successTitle}>Payment Successful!</h3>
              <p className={styles.successDesc}>Your payment has been received.</p>
              <p className={styles.successSub}>Redirecting...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={styles.headerModern}>
        <button className={styles.backBtnModern} onClick={() => navigate(-1)}><FaArrowLeft /></button>
        <div className={styles.headerCenter}>
          <h1 className={styles.headerTitle}>My Orders</h1>
          <p className={styles.headerSubtitle}>{activeOrders.length} active orders</p>
        </div>
        <div className={styles.walletBadgeModern}>
          <FaWallet className={styles.walletIcon} />
          <span className={styles.walletAmount}>{formatKSH(walletBalance)}</span>
          <button className={styles.refreshBtnModern} onClick={fetchData} disabled={refreshing}>
            <FaCircle className={refreshing ? styles.spinning : ""} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabsContainerModern}>
        <div className={styles.tabsScroll}>
          <button className={`${styles.tabBtnModern} ${tab === "all" ? styles.active : ""}`} onClick={() => setTab("all")}>
            <span className={styles.tabLabel}>Active</span>
            <span className={styles.tabBadge}>{activeOrders.length}</span>
          </button>
          <button className={`${styles.tabBtnModern} ${tab === "installments" ? styles.active : ""}`} onClick={() => setTab("installments")}>
            <span className={styles.tabLabel}>Installments</span>
            <span className={styles.tabBadge}>{installments.length}</span>
          </button>
          <button className={`${styles.tabBtnModern} ${tab === "completed" ? styles.active : ""}`} onClick={() => setTab("completed")}>
            <span className={styles.tabLabel}>Completed</span>
            <span className={styles.tabBadge}>{completedOrders.length}</span>
          </button>
          <button className={`${styles.tabBtnModern} ${tab === "cancelled" ? styles.active : ""}`} onClick={() => setTab("cancelled")}>
            <span className={styles.tabLabel}>Cancelled</span>
            <span className={styles.tabBadge}>{cancelledOrders.length}</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className={styles.ordersListModern}>
        {/* ============ ACTIVE TAB ============ */}
        {tab === "all" && (
          <>
            {activeOrders.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaShoppingBag size={48} /></div>
                <h3 className={styles.emptyTitle}>No Active Orders</h3>
                <p className={styles.emptyDesc}>You don't have any active orders right now</p>
                <button className={styles.shopBtnModern} onClick={() => navigate("/")}>
                  <FaShoppingBag /> Start Shopping
                </button>
              </motion.div>
            ) : (
              activeOrders.map((order, index) => {
                const sellerMarkedDelivered = (order.status || "").toLowerCase() === "delivered";
                const buyerConfirmed = !!order.delivered;
                const canConfirmDelivery = sellerMarkedDelivered && !buyerConfirmed;
                const canPayRemaining = buyerConfirmed && order.balance_due > 0 && !order.balance_paid;
                const isExpanded = expandedOrders[order.id] || false;
                const showCancel = canCancelOrder(order);
                const penalty = getCancellationPenalty(order.status, order.deposit_amount);
                const hasOpenRefund = order.return_requested && ["pending", "approved"].includes((order.return_status || "").toLowerCase());

                return (
                  <motion.div
                    className={styles.orderCardModern}
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={styles.orderCardInner}>
                      <div className={styles.orderCardHeader} onClick={() => navigateToOrderDetail(order.id)} style={{ cursor: "pointer" }}>
                        <div className={styles.orderImageContainer}>
                          {order.product_image && order.product_image !== "/placeholder.png" ? (
                            <img src={order.product_image} alt={order.product?.name} className={styles.orderImageModern} onError={(e) => { e.target.src = "/placeholder.png"; }} />
                          ) : (
                            <div className={styles.orderImagePlaceholderModern}><FaImage size={24} /></div>
                          )}
                        </div>
                        <div className={styles.orderHeaderInfo}>
                          <h3 className={styles.productNameModern}>{order.product?.name || "Product"}</h3>
                          <div className={styles.orderMetaRow}>
                            <span className={styles.metaItem}><FaStore size={12} /> {order.store?.name || "Unknown Store"}</span>
                            <span className={styles.metaItem}><FaCalendarAlt size={12} /> {new Date(order.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          <div className={styles.orderStatusRow}>
                            <span className={`${styles.orderStatusBadge} ${order.status?.toLowerCase()}`}>{order.status || "Pending"}</span>
                            <span className={styles.deliveryTypeBadge} style={{ backgroundColor: order.delivery_info.bg, color: order.delivery_info.color }}>
                              {order.delivery_info.icon}{order.delivery_info.label}
                            </span>
                            {hasOpenRefund && (
                              <span className={styles.refundBadgePending}><FaUndo size={9} /> Refund {(order.return_status || "").toLowerCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.orderCardActions}>
                          <button className={styles.viewDetailBtn} onClick={(e) => { e.stopPropagation(); navigateToOrderDetail(order.id); }} title="View">
                            <FaEye />
                          </button>
                          <button className={styles.expandToggle} onClick={(e) => { e.stopPropagation(); toggleOrderExpand(order.id); }}>
                            <FaChevronRight className={isExpanded ? styles.rotated : ""} />
                          </button>
                        </div>
                      </div>

                      {renderProgressBar(order.status, buyerConfirmed)}

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            className={styles.orderDetailsExpanded}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className={styles.priceBreakdownModern}>
                              <div className={styles.priceItemModern}>
                                <span className={styles.priceLabelModern}>Deposit Paid</span>
                                <span className={styles.priceValuePaidModern}>{formatKSH(order.deposit_amount)}</span>
                              </div>
                              <div className={styles.priceDividerModern} />
                              <div className={styles.priceItemModern}>
                                <span className={styles.priceLabelModern}>Balance Due</span>
                                <span className={styles.priceValueDueModern}>{formatKSH(order.balance_due)}</span>
                              </div>
                              <div className={styles.priceDividerModern} />
                              <div className={styles.priceItemModern}>
                                <span className={styles.priceLabelModern}>Total</span>
                                <span className={styles.priceValueTotalModern}>{formatKSH(order.total_price)}</span>
                              </div>
                            </div>

                            <div className={styles.orderDetailGrid}>
                              <div className={styles.detailItem}>
                                <FaMapMarkerAlt className={styles.detailIcon} />
                                <div>
                                  <span className={styles.detailLabel}>Delivery Location</span>
                                  <span className={styles.detailValue}>{order.delivery_location?.split(",")[0] || "N/A"}</span>
                                </div>
                              </div>
                              <div className={styles.detailItem}>
                                <FaBox className={styles.detailIcon} />
                                <div>
                                  <span className={styles.detailLabel}>Quantity</span>
                                  <span className={styles.detailValue}>{order.quantity || 1} item(s)</span>
                                </div>
                              </div>
                              {order.delivery_otp && (
                                <div className={styles.detailItem}>
                                  <FaKey className={styles.detailIcon} />
                                  <div>
                                    <span className={styles.detailLabel}>Delivery OTP</span>
                                    <span className={styles.detailValueOtp}>{order.delivery_otp}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {sellerMarkedDelivered && !buyerConfirmed && (
                              <div className={styles.statusMessageInfoModern}>
                                <FaTruck className={styles.messageIcon} />
                                <span>Seller marked as delivered - Please confirm delivery with OTP</span>
                              </div>
                            )}
                            {buyerConfirmed && order.balance_due > 0 && !order.balance_paid && (
                              <div className={styles.statusMessageSuccessModern}>
                                <FaCheckCircle className={styles.messageIcon} />
                                <span>Delivery confirmed! Pay remaining balance to complete order</span>
                              </div>
                            )}

                            <div className={styles.actionButtonsModern}>
                              <button className={styles.actionBtnViewDetail} onClick={() => navigateToOrderDetail(order.id)}>
                                <FaEye /> View Details
                              </button>
                              {canConfirmDelivery && (
                                <button className={styles.actionBtnConfirmModern} onClick={() => openOtpModal(order)} disabled={processingAction}>
                                  <FaKey /> Confirm Delivery
                                </button>
                              )}
                              {canPayRemaining && (
                                <button className={styles.actionBtnPayModern} onClick={() => openPaymentModal(order)} disabled={processingPayment || mpesaLoading}>
                                  <FaMoneyBillWave /> Pay Balance
                                </button>
                              )}
                              {showCancel && (
                                <button className={styles.actionBtnCancel} onClick={() => openCancelModal(order)} disabled={processingAction}>
                                  <FaBan /> Cancel Order
                                  {penalty > 0 && <span className={styles.cancelPenaltyHint}> ({formatKSH(penalty)} fee)</span>}
                                </button>
                              )}
                              <button
                                className={styles.actionBtnWhatsApp}
                                onClick={() => {
                                  const phone = order.store_phone || "";
                                  if (phone) window.open(`https://wa.me/254${phone.replace(/^0+/, "")}`, "_blank");
                                  else toast.error("Store phone not available");
                                }}
                              >
                                <FaWhatsapp /> Contact Seller
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {/* ============ INSTALLMENTS TAB ============ */}
        {tab === "installments" && (
          <>
            {installments.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaBox size={48} /></div>
                <h3 className={styles.emptyTitle}>No Installment Plans</h3>
                <p className={styles.emptyDesc}>You don't have any installment plans</p>
              </motion.div>
            ) : (
              installments.map((order, index) => {
                const paidPercent = Math.floor((Number(order.amount_paid || 0) / Number(order.total_price || 1)) * 100);
                let installImage = "/placeholder.png";
                if (order.products?.image_gallery?.length > 0 && order.products.image_gallery[0]) installImage = order.products.image_gallery[0];
                else if (order.products?.image_url) installImage = order.products.image_url;

                return (
                  <motion.div className={styles.orderCardModern} key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <div className={styles.orderCardInner}>
                      <div className={styles.orderCardHeader}>
                        <div className={styles.orderImageContainer}>
                          {installImage !== "/placeholder.png" ? (
                            <img src={installImage} alt={order.products?.name} className={styles.orderImageModern} onError={(e) => { e.target.src = "/placeholder.png"; }} />
                          ) : (
                            <div className={styles.orderImagePlaceholderModern}><FaImage size={24} /></div>
                          )}
                        </div>
                        <div className={styles.orderHeaderInfo}>
                          <h3 className={styles.productNameModern}>{order.products?.name || "Product"}</h3>
                          <div className={styles.orderMetaRow}>
                            <span className={styles.metaItem}><FaUser size={12} /> {order.seller?.full_name || "Seller"}</span>
                          </div>
                          <div className={styles.installmentProgressModern}>
                            <div className={styles.progressTrackModern}>
                              <div className={styles.progressFillModern} style={{ width: `${paidPercent}%` }} />
                            </div>
                            <span className={styles.progressTextModern}>{paidPercent}% paid</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.installmentStatsModern}>
                        <div className={styles.statModern}><span className={styles.statLabel}>Total</span><strong className={styles.statValue}>{formatKSH(order.total_price)}</strong></div>
                        <div className={styles.statDivider} />
                        <div className={styles.statModern}><span className={styles.statLabel}>Paid</span><strong className={styles.statValue}>{formatKSH(order.amount_paid)}</strong></div>
                        <div className={styles.statDivider} />
                        <div className={styles.statModern}><span className={styles.statLabel}>Next Due</span><strong className={styles.statValue}>{order.next_due_date?.slice(0, 10) || "—"}</strong></div>
                      </div>
                      <button className={styles.installmentLinkModern} onClick={() => navigate("/student/my-installments")}>
                        Manage Plan <FaChevronRight />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {/* ============ COMPLETED TAB ============ */}
        {tab === "completed" && (
          <>
            {completedOrders.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaCheckCircle size={48} /></div>
                <h3 className={styles.emptyTitle}>No Completed Orders</h3>
                <p className={styles.emptyDesc}>Your completed orders will appear here</p>
              </motion.div>
            ) : (
              completedOrders.map((order, index) => {
                const showRefund = canRequestRefund(order);
                return (
                  <motion.div className={styles.orderCardModern} key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <div className={styles.orderCardInner}>
                      <div className={styles.orderCardHeader} onClick={() => navigateToOrderDetail(order.id)} style={{ cursor: "pointer" }}>
                        <div className={styles.orderImageContainer}>
                          {order.product_image && order.product_image !== "/placeholder.png" ? (
                            <img src={order.product_image} alt={order.product?.name} className={styles.orderImageModern} onError={(e) => { e.target.src = "/placeholder.png"; }} />
                          ) : (
                            <div className={styles.orderImagePlaceholderModern}><FaImage size={24} /></div>
                          )}
                        </div>
                        <div className={styles.orderHeaderInfo}>
                          <div className={styles.completedHeader}>
                            <h3 className={styles.productNameModern}>{order.product?.name || "Product"}</h3>
                            <span className={styles.completedBadgeModern}><FaCheckCircle /> Completed</span>
                          </div>
                          <div className={styles.orderMetaRow}>
                            <span className={styles.metaItem}><FaStore size={12} /> {order.store?.name || "Unknown Store"}</span>
                            <span className={styles.metaItem}><FaCalendarAlt size={12} /> {new Date(order.updated_at || order.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          <div className={styles.priceBreakdownModern}>
                            <div className={styles.priceItemModern}>
                              <span className={styles.priceLabelModern}>Total Paid</span>
                              <span className={styles.priceValueTotalModern}>{formatKSH(order.total_price)}</span>
                            </div>
                          </div>
                          {renderRatingStars(order)}
                          {order.return_requested && (
                            <div className={`${styles.refundStatusBox} ${styles["status_" + (order.return_status || "").toLowerCase()]}`}>
                              <FaUndo size={11} /> Refund {order.return_status || "pending"}
                            </div>
                          )}
                          {showRefund && (
                            <button className={styles.actionBtnRefund} onClick={(e) => { e.stopPropagation(); openRefundModal(order); }}>
                              <FaUndo /> Request Refund
                            </button>
                          )}
                        </div>
                        <button className={styles.viewDetailBtn} onClick={(e) => { e.stopPropagation(); navigateToOrderDetail(order.id); }} title="View">
                          <FaEye />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {/* ============ CANCELLED TAB ============ */}
        {tab === "cancelled" && (
          <>
            {cancelledOrders.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaBan size={48} /></div>
                <h3 className={styles.emptyTitle}>No Cancelled Orders</h3>
                <p className={styles.emptyDesc}>Cancelled orders will appear here</p>
              </motion.div>
            ) : (
              cancelledOrders.map((order, index) => (
                <motion.div className={`${styles.orderCardModern} ${styles.cancelledCard}`} key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <div className={styles.orderCardInner}>
                    <div className={styles.orderCardHeader} onClick={() => navigateToOrderDetail(order.id)} style={{ cursor: "pointer" }}>
                      <div className={styles.orderImageContainer}>
                        {order.product_image && order.product_image !== "/placeholder.png" ? (
                          <img src={order.product_image} alt={order.product?.name} className={styles.orderImageModern} onError={(e) => { e.target.src = "/placeholder.png"; }} />
                        ) : (
                          <div className={styles.orderImagePlaceholderModern}><FaImage size={24} /></div>
                        )}
                      </div>
                      <div className={styles.orderHeaderInfo}>
                        <div className={styles.completedHeader}>
                          <h3 className={styles.productNameModern}>{order.product?.name || "Product"}</h3>
                          <span className={styles.cancelledBadgeModern}><FaBan /> Cancelled</span>
                        </div>
                        <div className={styles.orderMetaRow}>
                          <span className={styles.metaItem}><FaStore size={12} /> {order.store?.name || "Unknown Store"}</span>
                          <span className={styles.metaItem}><FaCalendarAlt size={12} /> {new Date(order.cancelled_at || order.updated_at || order.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                        {order.cancellation_reason && (
                          <div className={styles.cancelReasonBox}>
                            <strong>Reason:</strong> {order.cancellation_reason}
                          </div>
                        )}
                        {Number(order.cancellation_penalty) > 0 && (
                          <div className={styles.cancelPenaltyBox}>
                            <FaExclamationTriangle size={11} /> Penalty applied: {formatKSH(order.cancellation_penalty)}
                          </div>
                        )}
                        <div className={styles.priceBreakdownModern}>
                          <div className={styles.priceItemModern}>
                            <span className={styles.priceLabelModern}>Refunded</span>
                            <span className={styles.priceValuePaidModern}>{formatKSH(Number(order.deposit_amount || 0) - Number(order.cancellation_penalty || 0))}</span>
                          </div>
                        </div>
                      </div>
                      <button className={styles.viewDetailBtn} onClick={(e) => { e.stopPropagation(); navigateToOrderDetail(order.id); }} title="View">
                        <FaEye />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </>
        )}
      </div>

      {/* ============ CANCEL MODAL ============ */}
      <AnimatePresence>
        {cancelModalOpen && cancelOrderTarget && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeaderModern}>
                <h3 className={styles.modalTitle}><FaBan /> Cancel Order</h3>
                <button className={styles.closeBtnModern} onClick={() => setCancelModalOpen(false)} disabled={cancelling}><FaTimes /></button>
              </div>
              <div className={styles.modalBodyModern}>
                {(() => {
                  const penalty = getCancellationPenalty(cancelOrderTarget.status, cancelOrderTarget.deposit_amount);
                  const status = (cancelOrderTarget.status || "").toLowerCase();
                  const isLate = ["out_for_delivery", "on_delivery", "out for delivery"].includes(status);
                  return (
                    <>
                      <p className={styles.modalDesc}>Are you sure you want to cancel this order?</p>
                      <div className={styles.cancelSummaryBox}>
                        <div className={styles.cancelSummaryRow}>
                          <span>Product:</span>
                          <strong>{cancelOrderTarget.product?.name}</strong>
                        </div>
                        <div className={styles.cancelSummaryRow}>
                          <span>Current status:</span>
                          <strong style={{ textTransform: "capitalize" }}>{cancelOrderTarget.status}</strong>
                        </div>
                        <div className={styles.cancelSummaryRow}>
                          <span>Deposit paid:</span>
                          <strong>{formatKSH(cancelOrderTarget.deposit_amount)}</strong>
                        </div>
                        {penalty > 0 ? (
                          <>
                            <div className={styles.cancelSummaryRow}>
                              <span>Penalty (25%):</span>
                              <strong style={{ color: "#EF4444" }}>- {formatKSH(penalty)}</strong>
                            </div>
                            <div className={`${styles.cancelSummaryRow} ${styles.cancelSummaryTotal}`}>
                              <span>Refund to wallet:</span>
                              <strong style={{ color: "#10B981" }}>{formatKSH(Number(cancelOrderTarget.deposit_amount || 0) - penalty)}</strong>
                            </div>
                          </>
                        ) : (
                          <div className={`${styles.cancelSummaryRow} ${styles.cancelSummaryTotal}`}>
                            <span>Refund to wallet:</span>
                            <strong style={{ color: "#10B981" }}>{formatKSH(cancelOrderTarget.deposit_amount)}</strong>
                          </div>
                        )}
                      </div>
                      {!isLate && (
                        <div className={styles.noPenaltyHint}>
                          <FaCheckCircle /> No penalty since order hasn't shipped out for delivery yet
                        </div>
                      )}
                      <label className={styles.cancelLabel}>Why are you cancelling?</label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="e.g., Changed my mind, Found a better price, Ordered by mistake..."
                        className={styles.cancelTextarea}
                        rows={3}
                        disabled={cancelling}
                      />
                    </>
                  );
                })()}
              </div>
              <div className={styles.modalFooterModern}>
                <button className={styles.modalBtnCancelModern} onClick={() => setCancelModalOpen(false)} disabled={cancelling}>Keep Order</button>
                <button className={styles.modalBtnDangerModern} onClick={submitCancel} disabled={cancelling || !cancelReason.trim()}>
                  {cancelling ? <FaSpinner className={styles.spinning} /> : <><FaBan /> Confirm Cancel</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ REFUND MODAL ============ */}
      <AnimatePresence>
        {refundModalOpen && refundOrderTarget && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeaderModern}>
                <h3 className={styles.modalTitle}><FaUndo /> Request Refund</h3>
                <button className={styles.closeBtnModern} onClick={() => setRefundModalOpen(false)} disabled={submittingRefund}><FaTimes /></button>
              </div>
              <div className={styles.modalBodyModern}>
                <p className={styles.modalDesc}>Tell us what went wrong and we'll process your refund request.</p>
                <div className={styles.refundInfoBox}>
                  <div className={styles.refundInfoRow}>
                    <span>Product:</span>
                    <strong>{refundOrderTarget.product?.name}</strong>
                  </div>
                  <div className={styles.refundInfoRow}>
                    <span>You paid:</span>
                    <strong>{formatKSH(Number(refundOrderTarget.total_price || 0) - Number(refundOrderTarget.delivery_fee || 0))}</strong>
                  </div>
                </div>
                <label className={styles.cancelLabel}>Reason *</label>
                <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className={styles.cancelInput} disabled={submittingRefund}>
                  <option value="">Select a reason...</option>
                  {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <label className={styles.cancelLabel} style={{ marginTop: 12 }}>Description *</label>
                <textarea
                  value={refundDescription}
                  onChange={(e) => setRefundDescription(e.target.value)}
                  placeholder="Describe the issue with your product (at least 10 characters)..."
                  className={styles.cancelTextarea}
                  rows={4}
                  disabled={submittingRefund}
                />
                <div className={styles.refundNote}>
                  <FaExclamationTriangle size={11} />
                  <span>The seller will review your request within 24 hours. Admin will process the refund if approved.</span>
                </div>
              </div>
              <div className={styles.modalFooterModern}>
                <button className={styles.modalBtnCancelModern} onClick={() => setRefundModalOpen(false)} disabled={submittingRefund}>Cancel</button>
                <button className={styles.modalBtnConfirmModern} onClick={submitRefund} disabled={submittingRefund || !refundReason || refundDescription.trim().length < 10}>
                  {submittingRefund ? <FaSpinner className={styles.spinning} /> : "Submit Request"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP Modal */}
      <AnimatePresence>
        {otpOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeaderModern}>
                <h3 className={styles.modalTitle}>Confirm Delivery</h3>
                <button className={styles.closeBtnModern} onClick={() => setOtpOpen(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBodyModern}>
                <p className={styles.modalDesc}>Enter the 6-digit OTP to confirm delivery</p>
                <input
                  type="text" maxLength={6} value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000" className={styles.otpInputModern} autoFocus
                />
                <div className={styles.otpHint}><FaKey size={12} /><span>Check your SMS for the delivery OTP</span></div>
              </div>
              <div className={styles.modalFooterModern}>
                <button className={styles.modalBtnCancelModern} onClick={() => setOtpOpen(false)}>Cancel</button>
                <button className={styles.modalBtnConfirmModern} onClick={submitOtp} disabled={submittingOtp || otpValue.length !== 6}>
                  {submittingOtp ? <FaSpinner className={styles.spinning} /> : "Confirm Delivery"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModalOpen && selectedOrder && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeaderModern}>
                <h3 className={styles.modalTitle}>Pay Balance</h3>
                <button className={styles.closeBtnModern} onClick={() => setPaymentModalOpen(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBodyModern}>
                <div className={styles.paymentAmountModern}>
                  <span className={styles.paymentLabel}>Amount Due:</span>
                  <strong className={styles.paymentAmountValue}>{formatKSH(selectedOrder.balance_due)}</strong>
                </div>
                <p className={styles.paymentSubtitle}>Select payment method</p>
                <div className={styles.paymentMethodsModern}>
                  <button
                    className={`${styles.paymentMethodModern} ${paymentMethod === "wallet" ? styles.selected : ""}`}
                    onClick={() => setPaymentMethod("wallet")}
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaWallet className={styles.paymentMethodIcon} />
                    <div className={styles.paymentMethodInfo}>
                      <span className={styles.paymentMethodName}>Omniflow Wallet</span>
                      <span className={styles.paymentMethodBalance}>Balance: {formatKSH(walletBalance)}</span>
                    </div>
                    {paymentMethod === "wallet" && <div className={styles.checkIndicatorModern}>✓</div>}
                  </button>
                  <button
                    className={`${styles.paymentMethodModern} ${paymentMethod === "mpesa" ? styles.selected : ""}`}
                    onClick={() => setPaymentMethod("mpesa")}
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaMobile className={styles.paymentMethodIcon} />
                    <div className={styles.paymentMethodInfo}>
                      <span className={styles.paymentMethodName}>M-Pesa</span>
                      <span className={styles.paymentMethodBalance}>Pay via M-PESA</span>
                    </div>
                    {paymentMethod === "mpesa" && <div className={styles.checkIndicatorModern}>✓</div>}
                  </button>
                </div>
              </div>
              <div className={styles.modalFooterModern}>
                <button className={styles.modalBtnCancelModern} onClick={() => setPaymentModalOpen(false)} disabled={processingPayment}>Cancel</button>
                <button className={styles.modalBtnConfirmModern} onClick={processPayment} disabled={processingPayment || mpesaLoading || !paymentMethod}>
                  {processingPayment || mpesaLoading ? <FaSpinner className={styles.spinning} /> : "Pay Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BuyerOrders;