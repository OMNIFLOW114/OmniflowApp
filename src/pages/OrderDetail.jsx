// src/pages/OrderDetail.jsx - PHASE 4 (Cancel + Refund) + Buyer Updates Timeline
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import { toast } from "react-hot-toast";
import {
  FaBox, FaCheckCircle, FaClock, FaMapMarkerAlt, FaStore,
  FaShippingFast, FaTruck, FaStar, FaWallet, FaKey, FaMotorcycle,
  FaMobile, FaTimes, FaSpinner, FaImage, FaUser, FaMoneyBillWave,
  FaCalendarAlt, FaMedal, FaInfoCircle, FaReceipt, FaMapPin,
  FaBan, FaUndo, FaExclamationTriangle, FaArrowLeft, FaCommentDots,
} from "react-icons/fa";
import styles from "./OrderDetail.module.css";

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

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
};

const toastGuardRef = { current: {} };
const canShowToast = (id, windowMs = 4000) => {
  const now = Date.now();
  if (now - (toastGuardRef.current[id] || 0) < windowMs) return false;
  toastGuardRef.current[id] = now;
  return true;
};

const STEPS = [
  { key: "pending", label: "Order Placed", icon: <FaBox />, color: "#F59E0B" },
  { key: "processing", label: "Processing", icon: <FaClock />, color: "#3B82F6" },
  { key: "shipped", label: "Shipped", icon: <FaShippingFast />, color: "#8B5CF6" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck />, color: "#EC4899" },
  { key: "delivered", label: "Delivered", icon: <FaCheckCircle />, color: "#10B981" },
];

const REFUND_REASONS = [
  { value: "damaged", label: "Damaged / Broken" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "size_fit", label: "Size / Fit issue" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

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
  if (order.return_requested && ["pending", "approved"].includes((order.return_status || "").toLowerCase())) return false;
  return true;
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

const getDeliveryTypeInfo = (type) => {
  if (type === "self-delivery") {
    return { icon: <FaStore size={14} />, label: "Self Delivery", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" };
  }
  return { icon: <FaMotorcycle size={14} />, label: "Omniflow Express", color: "#3B82F6", bg: "rgba(59,130,246,0.1)" };
};

// ---------------------------------------------------------
// SKELETON
// ---------------------------------------------------------
const OrderDetailSkeleton = () => {
  const { darkMode } = useDarkMode();
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonWrapper}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonBadge}></div>
        </div>
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonLine} style={{ width: "70%" }}></div>
            <div className={styles.skeletonLine} style={{ width: "50%" }}></div>
            <div className={styles.skeletonLine} style={{ width: "40%" }}></div>
          </div>
        </div>
        <div className={styles.skeletonCard}><div className={styles.skeletonProgress}></div></div>
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard}></div>
          <div className={styles.skeletonCard}></div>
          <div className={styles.skeletonCard}></div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------
const OrderDetail = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { initiateWalletDeposit, loading: mpesaLoading, cancelPolling } = useMpesaPayment();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [mpesaPaymentStep, setMpesaPaymentStep] = useState(1);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [mpesaPaymentAmount, setMpesaPaymentAmount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [storeInfo, setStoreInfo] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [activeReturn, setActiveReturn] = useState(null);

  // ---- Order updates (seller → buyer timeline) ----
  const [updates, setUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundDescription, setRefundDescription] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // ---------------------------------------------------------
  // FETCH ORDER UPDATES (read-only, non-fatal)
  // ---------------------------------------------------------
  const fetchUpdates = useCallback(async () => {
    if (!orderId) return;
    setUpdatesLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_order_updates", { p_order_id: orderId });
      if (error) throw error;
      // Sort oldest → newest so the timeline reads top-to-bottom naturally
      const sorted = (data || []).slice().sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setUpdates(sorted);
    } catch (err) {
      console.warn("Failed to load order updates:", err);
      setUpdates([]);
    } finally {
      setUpdatesLoading(false);
    }
  }, [orderId]);

  // ---------------------------------------------------------
  // FETCH ORDER DETAILS (parallelized)
  // ---------------------------------------------------------
  const fetchOrderDetails = useCallback(async () => {
    if (!user?.id || !orderId) return;
    setLoading(true);
    try {
      // 1. Fetch order + product
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `*, product:products!orders_product_id_fkey(id, name, description, price, image_gallery, image_url, store_id, category, owner_id, weight_class, delivery_estimated_days)`
        )
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) {
        toast.error("Order not found");
        navigate("/orders");
        return;
      }

      // 2. Parallel: store, wallet, rating, return
      const storeId = orderData.product?.store_id;
      const productId = orderData.product?.id;

      const [storeRes, walletRes, ratingRes, returnRes] = await Promise.all([
        storeId
          ? supabase
              .from("stores")
              .select("id, name, location, delivery_type, contact_email, contact_phone, owner_id, county, description")
              .eq("id", storeId)
              .single()
          : Promise.resolve({ data: null }),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        productId
          ? supabase.from("ratings").select("rating").eq("user_id", user.id).eq("product_id", productId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("returns")
          .select("id, status, reason, buyer_refund_amount, seller_refund_amount, admin_refund_amount, refund_amount, created_at, approved_at, completed_at, admin_notes")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const storeData = storeRes.data;
      setStoreInfo(storeData);
      if (storeData) {
        setDeliveryInfo(getDeliveryTypeInfo(storeData.delivery_type));
        if (storeData.owner_id) {
          const { data: sellerData } = await supabase
            .from("users")
            .select("id, full_name, email, phone, avatar_url, created_at")
            .eq("id", storeData.owner_id)
            .single();
          setSellerInfo(sellerData);
        }
      }

      setWalletBalance(Number(walletRes.data?.balance || 0));

      const userRating = ratingRes.data?.rating || null;
      const returnData = returnRes.data || null;
      setActiveReturn(returnData);

      let imageUrl = "/placeholder.png";
      if (orderData.product?.image_gallery?.length > 0 && orderData.product.image_gallery[0]) {
        imageUrl = orderData.product.image_gallery[0];
      } else if (orderData.product?.image_url) {
        imageUrl = orderData.product.image_url;
      }

      setOrder({
        ...orderData,
        product_image: imageUrl,
        user_rating: userRating,
        has_rated: !!userRating,
      });

      // 3. Fetch seller updates (non-fatal)
      await fetchUpdates();
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  }, [user, orderId, navigate, fetchUpdates]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // ---------------------------------------------------------
  // REAL-TIME: orders UPDATE + order_updates INSERT
  // ---------------------------------------------------------
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`buyer-order-detail-${orderId}`)
      // Live status / balance / OTP / delivered flag changes
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const next = payload.new || {};
          setOrder((prev) => (prev ? { ...prev, ...next } : prev));

          // If the seller pushed a status change, refresh the full record + timeline
          // so derived fields (delivery info, updates list) stay in sync.
          if (next.status) {
            fetchUpdates();
          }
        }
      )
      // New seller message / status note
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_updates", filter: `order_id=eq.${orderId}` },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchUpdates]);

  // ---------------------------------------------------------
  // OTP
  // ---------------------------------------------------------
  const openOtpModal = () => {
    if (!order?.delivery_otp) return toast.error("OTP not available yet.");
    setOtpValue("");
    setOtpOpen(true);
  };

  const submitOtp = async () => {
    if (!order?.id || otpValue.length !== 6) return toast.error("Enter a valid 6-digit OTP");
    setSubmittingOtp(true);
    try {
      const { data, error } = await supabase.rpc("mark_order_delivered", { p_order: order.id, p_otp: otpValue });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to confirm delivery");

      setOrder((prev) => ({ ...prev, delivered: true, status: data.needs_payment ? "delivered" : "completed" }));
      toast.success(data.needs_payment ? "Delivery confirmed! Pay the balance to complete." : "Delivery confirmed! Order completed.");
      setOtpOpen(false);
      setOtpValue("");
      await fetchOrderDetails();
    } catch (err) {
      if (canShowToast("otp-error", 4000)) toast.error(err.message || "Failed to confirm delivery");
    } finally {
      setSubmittingOtp(false);
    }
  };

  // ---------------------------------------------------------
  // PAY BALANCE
  // ---------------------------------------------------------
  const handleMpesaPayment = async (phoneNumber) => {
    setProcessingPayment(true);
    setMpesaPaymentStep(2);
    setMpesaPaymentAmount(order.balance_due);
    setMpesaPhoneNumber(phoneNumber);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");
    try {
      await initiateWalletDeposit(
        phoneNumber,
        order.balance_due,
        user.id,
        async (receipt, paidAmount) => {
          const { data, error } = await supabase.rpc("pay_remaining_balance", { p_order: order.id, p_buyer: user.id });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Payment processing failed");
          await supabase.from("orders").update({ mpesa_receipt: receipt, updated_at: new Date().toISOString() }).eq("id", order.id);
          setOrder((prev) => ({ ...prev, balance_paid: true, balance_due: 0, status: prev.delivered ? "completed" : "balance_paid" }));
          setMpesaPaymentStep(3);
          toast.dismiss(loadingToast);
          if (canShowToast("mpesa-success", 60000)) toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, { duration: 6000, icon: "✅" });
          await fetchOrderDetails();
          setTimeout(() => {
            setPaymentModalOpen(false);
            setMpesaPaymentStep(1);
            setProcessingPayment(false);
          }, 3000);
        },
        (error) => {
          setMpesaPaymentStep(1);
          toast.dismiss(loadingToast);
          if (canShowToast("mpesa-fail", 4000)) toast.error(`Payment failed: ${error}.`);
          setProcessingPayment(false);
        }
      );
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("mpesa-error", 4000)) toast.error(err?.message || "M-Pesa payment failed");
      setMpesaPaymentStep(1);
      setProcessingPayment(false);
    }
  };

  const processWalletPayment = async () => {
    setProcessingPayment(true);
    const loadingToast = toast.loading("Processing payment...");
    try {
      const { data, error } = await supabase.rpc("pay_remaining_balance", { p_order: order.id, p_buyer: user.id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Payment failed");
      setOrder((prev) => ({ ...prev, balance_paid: true, balance_due: 0, status: prev.delivered ? "completed" : "balance_paid" }));
      toast.dismiss(loadingToast);
      if (canShowToast("wallet-pay-success", 60000)) toast.success(`Payment successful! Amount: ${formatKSH(order.balance_due)}`);
      await fetchOrderDetails();
      setPaymentModalOpen(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("wallet-pay-fail", 4000)) toast.error(err?.message || "Payment failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentMethod("");
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!paymentMethod) return toast.error("Select a payment method");
    if (paymentMethod === "wallet") return processWalletPayment();
    if (paymentMethod === "mpesa") {
      const phone = prompt("Enter your M-Pesa phone (e.g., 0712345678):", user?.phone || "");
      if (!phone || !/^0[17]\d{8}$/.test(phone)) {
        toast.error("Invalid M-Pesa number");
        setProcessingPayment(false);
        return;
      }
      await handleMpesaPayment(phone);
    }
  };

  // ---------------------------------------------------------
  // RATING
  // ---------------------------------------------------------
  const handleSubmitRating = async (rating) => {
    if (!user?.id || !order?.product?.id) return toast.error("Please login to rate");
    setProcessingAction(true);
    const loadingToast = toast.loading("Submitting rating...");
    try {
      const { error } = await supabase.from("ratings").upsert(
        { user_id: user.id, product_id: order.product.id, rating: Number(rating), created_at: new Date().toISOString() },
        { onConflict: "user_id, product_id" }
      );
      if (error) throw error;
      setOrder((prev) => ({ ...prev, has_rated: true, user_rating: rating }));
      toast.dismiss(loadingToast);
      if (canShowToast("rating-success", 4000)) toast.success("Thank you for rating!", { icon: "⭐" });
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("rating-error", 4000)) toast.error("Failed to submit rating");
    } finally {
      setProcessingAction(false);
    }
  };

  // ---------------------------------------------------------
  // CANCEL ORDER
  // ---------------------------------------------------------
  const openCancelModal = () => {
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelReason.trim()) return toast.error("Please tell us why you're cancelling");
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancel_buyer_order", {
        p_order_id: order.id,
        p_buyer_id: user.id,
        p_reason: cancelReason.trim(),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Cancellation failed");

      setOrder((prev) => ({
        ...prev,
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancelReason.trim(),
        cancellation_penalty: data.penalty,
      }));

      setCancelModalOpen(false);
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
      await fetchOrderDetails();
    } catch (err) {
      if (canShowToast("cancel-error", 4000)) toast.error(err?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  // ---------------------------------------------------------
  // REQUEST REFUND
  // ---------------------------------------------------------
  const openRefundModal = () => {
    setRefundReason("");
    setRefundDescription("");
    setRefundModalOpen(true);
  };

  const submitRefund = async () => {
    if (!refundReason) return toast.error("Please select a reason");
    if (refundDescription.trim().length < 10) return toast.error("Describe the issue (min 10 chars)");
    setSubmittingRefund(true);
    try {
      const { data, error } = await supabase.rpc("request_refund", {
        p_order_id: order.id,
        p_buyer_id: user.id,
        p_reason: refundReason,
        p_description: refundDescription.trim(),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Refund request failed");

      setOrder((prev) => ({ ...prev, return_requested: true, return_status: "pending", return_reason: refundReason }));
      setRefundModalOpen(false);
      if (canShowToast("refund-success", 60000)) {
        toast.success("Refund request submitted! Seller will review within 24h.", { duration: 6000 });
      }
      await fetchOrderDetails();
    } catch (err) {
      if (canShowToast("refund-error", 4000)) toast.error(err?.message || "Failed to submit refund");
    } finally {
      setSubmittingRefund(false);
    }
  };

  // ---------------------------------------------------------
  // RENDER GUARDS
  // ---------------------------------------------------------
  if (loading) return <OrderDetailSkeleton />;

  if (!order) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.errorContainer}>
          <h2>Order not found</h2>
          <button onClick={() => navigate("/orders")}>Back to Orders</button>
        </div>
      </div>
    );
  }

  const currentStep = order.delivered ? 4 : getStatusStep(order.status);
  const sellerMarkedDelivered = (order.status || "").toLowerCase() === "delivered";
  const buyerConfirmed = !!order.delivered;
  const canConfirmDelivery = sellerMarkedDelivered && !buyerConfirmed;
  const canPayRemaining = buyerConfirmed && order.balance_due > 0 && !order.balance_paid;
  const isCancelled = !!order.cancelled_at || (order.status || "").toLowerCase() === "cancelled";
  const isRefunded = (order.status || "").toLowerCase() === "refunded";
  const showCancel = canCancelOrder(order);
  const showRefund = canRequestRefund(order);
  const penalty = getCancellationPenalty(order.status, order.deposit_amount);
  const statusLower = (order.status || "").toLowerCase();

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/orders")}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.headerTitle}>Order Details</h1>
        <span className={`${styles.statusBadge} ${statusLower}`}>
          {isCancelled ? "Cancelled" : isRefunded ? "Refunded" : order.status || "Pending"}
        </span>
      </header>

      {/* Cancelled banner */}
      {isCancelled && (
        <div className={styles.cancelledBanner}>
          <FaBan size={18} />
          <div>
            <strong>This order was cancelled</strong>
            <p>{order.cancellation_reason || "No reason provided"}</p>
            {Number(order.cancellation_penalty) > 0 && (
              <span className={styles.cancelledPenalty}>
                Penalty applied: {formatKSH(order.cancellation_penalty)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Refunded banner */}
      {isRefunded && (
        <div className={styles.refundedBanner}>
          <FaUndo size={18} />
          <div>
            <strong>Refund processed</strong>
            {activeReturn && (
              <p>{formatKSH(activeReturn.buyer_refund_amount || 0)} refunded to your wallet</p>
            )}
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className={styles.orderSummaryCard}>
        <div className={styles.summaryImageFull}>
          {order.product_image && order.product_image !== "/placeholder.png" ? (
            <img src={order.product_image} alt={order.product?.name || "Product"} className={styles.fullImage} onError={(e) => (e.target.src = "/placeholder.png")} />
          ) : (
            <div className={styles.imagePlaceholderFull}><FaImage size={48} /></div>
          )}
        </div>
        <div className={styles.summaryInfo}>
          <h2 className={styles.summaryProductName}>{order.product?.name || "Product"}</h2>
          <div className={styles.summaryMeta}>
            <span className={styles.summaryStore}><FaStore /> {storeInfo?.name || "Unknown Store"}</span>
            <span className={styles.summaryDate}><FaCalendarAlt /> {formatDate(order.created_at)}</span>
          </div>
          <div className={styles.summaryPrice}>
            <span className={styles.priceTotal}>{formatKSH(order.total_price)}</span>
            {Number(order.deposit_amount) > 0 && (
              <span className={styles.priceDeposit}>Deposit: {formatKSH(order.deposit_amount)}</span>
            )}
          </div>
          {order.return_requested && (
            <div className={`${styles.refundStatusBox} ${styles["status_" + (order.return_status || "pending").toLowerCase()]}`}>
              <FaUndo size={11} /> Refund {(order.return_status || "pending").toLowerCase()}
              {activeReturn && activeReturn.buyer_refund_amount > 0 && (
                <span> · {formatKSH(activeReturn.buyer_refund_amount)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Tracker - hidden if cancelled */}
      {!isCancelled && (
        <div className={styles.progressSection}>
          <h3 className={styles.sectionTitle}>Order Progress</h3>
          <div className={styles.progressContainer}>
            {STEPS.map((step, index) => {
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;
              return (
                <div key={step.key} className={styles.progressStep}>
                  <div className={styles.progressConnector}>
                    <div
                      className={`${styles.progressCircle} ${isActive ? styles.active : ""} ${isCurrent ? styles.current : ""}`}
                      style={{ borderColor: isActive ? step.color : "#e0e0e0", background: isActive ? step.color : "transparent" }}
                    >
                      {isActive ? step.icon : <span className={styles.stepNumber}>{index + 1}</span>}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`${styles.progressLine} ${index < currentStep ? styles.activeLine : ""}`} />
                    )}
                  </div>
                  <div className={styles.progressLabel}>
                    <span className={`${styles.progressText} ${isActive ? styles.activeText : ""}`}>{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.progressStatus}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} style={{ background: order.delivered ? "#10B981" : STEPS[currentStep]?.color || "#F59E0B" }} />
              <span className={styles.statusText}>
                {order.delivered ? "✓ Order Completed" : `${STEPS[currentStep]?.label || "Pending"} in Progress`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============ ORDER UPDATES (seller → buyer timeline) ============ */}
      <div className={styles.updatesCard}>
        <div className={styles.updatesHeader}>
          <h3 className={styles.updatesTitle}>
            <FaCommentDots /> Order Updates
          </h3>
          {updates.length > 0 && (
            <span className={styles.updatesCount}>{updates.length}</span>
          )}
        </div>

        {updatesLoading && updates.length === 0 ? (
          <div className={styles.updatesLoading}>
            <FaSpinner className={styles.spinning} />
            <span>Loading updates…</span>
          </div>
        ) : updates.length === 0 ? (
          <div className={styles.updatesEmpty}>
            <FaCommentDots size={20} />
            <span>No updates yet. We'll show them here as soon as the seller posts one.</span>
          </div>
        ) : (
          <div className={styles.updatesList}>
            {updates.map((u) => {
              const type = (u.update_type || "note").toLowerCase();
              const isStatus = type === "status";
              return (
                <div key={u.id} className={`${styles.updateItem} ${isStatus ? styles.updateStatus : styles.updateNote}`}>
                  <div className={`${styles.updateDot} ${isStatus ? styles.dotStatus : styles.dotNote}`} />
                  <div className={styles.updateContent}>
                    <div className={styles.updateMeta}>
                      <span className={styles.updateSender}>{storeInfo?.name || "Seller"}</span>
                      <span className={`${styles.updateTypeChip} ${isStatus ? styles.chipStatus : styles.chipNote}`}>
                        {isStatus ? "STATUS" : "MESSAGE"}
                      </span>
                      <span className={styles.updateTime}>{timeAgo(u.created_at)}</span>
                    </div>
                    <p className={styles.updateMessage}>{u.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailsCard}>
          <h4 className={styles.cardTitle}><FaInfoCircle /> Order Information</h4>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Order ID</span><span className={styles.detailValue}>{order.id?.slice(0, 8).toUpperCase()}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Quantity</span><span className={styles.detailValue}>{order.quantity || 1}</span></div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Delivery Type</span>
            <span className={styles.detailValue} style={{ color: deliveryInfo?.color }}>{deliveryInfo?.icon} {deliveryInfo?.label || "Standard"}</span>
          </div>
          {order.delivery_otp && !order.delivered && (
            <div className={styles.detailRow}><span className={styles.detailLabel}>Delivery OTP</span><span className={styles.detailValueOtp}>{order.delivery_otp}</span></div>
          )}
        </div>

        <div className={styles.detailsCard}>
          <h4 className={styles.cardTitle}><FaMapPin /> Delivery Location</h4>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Address</span><span className={styles.detailValue}>{order.delivery_location || "N/A"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>County</span><span className={styles.detailValue}>{storeInfo?.county || "N/A"}</span></div>
        </div>

        <div className={styles.detailsCard}>
          <h4 className={styles.cardTitle}><FaUser /> Seller Information</h4>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Store Name</span><span className={styles.detailValue}>{storeInfo?.name || "N/A"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Seller Name</span><span className={styles.detailValue}>{sellerInfo?.full_name || "N/A"}</span></div>
          {storeInfo?.contact_phone && (
            <div className={styles.detailRow}><span className={styles.detailLabel}>Phone</span><span className={styles.detailValue}>{storeInfo.contact_phone}</span></div>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className={styles.priceBreakdown}>
        <h4 className={styles.cardTitle}><FaReceipt /> Price Breakdown</h4>
        <div className={styles.priceRow}><span className={styles.priceLabel}>Deposit Paid</span><span className={styles.priceValueGreen}>{formatKSH(order.deposit_amount)}</span></div>
        <div className={styles.priceDivider} />
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Balance Due</span>
          <span className={`${styles.priceValueGreen} ${order.balance_due > 0 ? styles.due : styles.paid}`}>
            {order.balance_due > 0 ? formatKSH(order.balance_due) : "Paid"}
          </span>
        </div>
        <div className={styles.priceDivider} />
        <div className={styles.priceRow}><span className={styles.priceLabelTotal}>Total</span><span className={styles.priceValueTotalGreen}>{formatKSH(order.total_price)}</span></div>
        {order.mpesa_receipt && (
          <div className={styles.priceRow}><span className={styles.priceLabel}>M-Pesa Receipt</span><span className={styles.priceValueReceipt}>{order.mpesa_receipt}</span></div>
        )}
      </div>

      {/* Refund breakdown - if a return exists */}
      {activeReturn && (
        <div className={styles.refundBreakdown}>
          <h4 className={styles.cardTitle}><FaUndo /> Refund Details</h4>
          <div className={styles.priceRow}><span className={styles.priceLabel}>Status</span><span className={`${styles.refundStatusPill} ${styles["status_" + (activeReturn.status || "pending").toLowerCase()]}`}>{(activeReturn.status || "pending").toUpperCase()}</span></div>
          <div className={styles.priceRow}><span className={styles.priceLabel}>Reason</span><span className={styles.priceValue}>{(activeReturn.reason || "").replace(/_/g, " ")}</span></div>
          <div className={styles.priceRow}><span className={styles.priceLabel}>Buyer Refund</span><span className={styles.priceValueGreen}>{formatKSH(activeReturn.buyer_refund_amount)}</span></div>
          <div className={styles.priceRow}><span className={styles.priceLabel}>Seller Deduction</span><span className={styles.priceValueDue}>{formatKSH(activeReturn.seller_refund_amount)}</span></div>
          <div className={styles.priceRow}><span className={styles.priceLabel}>Omniflow Absorbs</span><span className={styles.priceValue}>{formatKSH(activeReturn.admin_refund_amount)}</span></div>
          {activeReturn.admin_notes && (
            <div className={styles.refundAdminNote}><FaInfoCircle /> {activeReturn.admin_notes}</div>
          )}
        </div>
      )}

      {/* Status messages */}
      {sellerMarkedDelivered && !buyerConfirmed && (
        <div className={styles.statusMessageInfo}>
          <FaTruck className={styles.messageIcon} />
          <span>Seller marked as delivered — confirm with OTP</span>
        </div>
      )}
      {buyerConfirmed && order.balance_due > 0 && !order.balance_paid && (
        <div className={styles.statusMessageSuccess}>
          <FaCheckCircle className={styles.messageIcon} />
          <span>Delivery confirmed! Pay the balance to complete.</span>
        </div>
      )}
      {order.escrow_released && !isRefunded && (
        <div className={styles.statusMessageComplete}>
          <FaMedal className={styles.messageIcon} />
          <span>Order Complete! Thank you for shopping with us.</span>
        </div>
      )}

      {/* Rating Section - only on completed */}
      {(order.status || "").toLowerCase() === "completed" || order.escrow_released ? (
        <div className={styles.ratingSection}>
          <h4 className={styles.cardTitle}><FaStar /> Rate this Product</h4>
          <div className={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`${styles.star} ${(order.user_rating || 0) >= star ? styles.active : ""}`}
                onClick={() => !order.has_rated && !processingAction && handleSubmitRating(star)}
                disabled={order.has_rated || processingAction}
              >
                <FaStar />
              </button>
            ))}
            {order.has_rated && <span className={styles.ratedBadge}>✓ Rated</span>}
            {!order.has_rated && (order.status || "").toLowerCase() === "completed" && (
              <span className={styles.rateHint}>Tap a star to rate</span>
            )}
          </div>
        </div>
      ) : null}

      {/* Action Buttons */}
      {(canConfirmDelivery || canPayRemaining || showCancel || showRefund) && (
        <div className={styles.actionButtons}>
          {canConfirmDelivery && (
            <button className={styles.actionBtnConfirm} onClick={openOtpModal} disabled={processingAction}>
              <FaKey /> Confirm Delivery
            </button>
          )}
          {canPayRemaining && (
            <button className={styles.actionBtnPay} onClick={openPaymentModal} disabled={processingPayment || mpesaLoading}>
              <FaMoneyBillWave /> Pay Balance {formatKSH(order.balance_due)}
            </button>
          )}
          {showCancel && (
            <button className={styles.actionBtnCancel} onClick={openCancelModal} disabled={processingAction}>
              <FaBan /> Cancel Order
              {penalty > 0 && <span className={styles.cancelPenaltyHint}> ({formatKSH(penalty)} fee)</span>}
            </button>
          )}
          {showRefund && (
            <button className={styles.actionBtnRefund} onClick={openRefundModal} disabled={processingAction}>
              <FaUndo /> Request Refund
            </button>
          )}
        </div>
      )}

      {/* ============ CANCEL MODAL ============ */}
      <AnimatePresence>
        {cancelModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3><FaBan /> Cancel Order</h3>
                <button className={styles.closeBtn} onClick={() => setCancelModalOpen(false)} disabled={cancelling}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <p>Are you sure you want to cancel this order?</p>
                <div className={styles.cancelSummaryBox}>
                  <div className={styles.cancelSummaryRow}><span>Product:</span><strong>{order.product?.name}</strong></div>
                  <div className={styles.cancelSummaryRow}><span>Status:</span><strong style={{ textTransform: "capitalize" }}>{order.status}</strong></div>
                  <div className={styles.cancelSummaryRow}><span>Deposit paid:</span><strong>{formatKSH(order.deposit_amount)}</strong></div>
                  {penalty > 0 ? (
                    <>
                      <div className={styles.cancelSummaryRow}><span>Penalty (25%):</span><strong style={{ color: "#EF4444" }}>- {formatKSH(penalty)}</strong></div>
                      <div className={`${styles.cancelSummaryRow} ${styles.cancelSummaryTotal}`}><span>Refund:</span><strong style={{ color: "#10B981" }}>{formatKSH(Number(order.deposit_amount || 0) - penalty)}</strong></div>
                    </>
                  ) : (
                    <div className={`${styles.cancelSummaryRow} ${styles.cancelSummaryTotal}`}><span>Refund:</span><strong style={{ color: "#10B981" }}>{formatKSH(order.deposit_amount)}</strong></div>
                  )}
                </div>
                {penalty === 0 && (
                  <div className={styles.noPenaltyHint}><FaCheckCircle /> No penalty — order hasn't shipped for delivery yet</div>
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
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setCancelModalOpen(false)} disabled={cancelling}>Keep Order</button>
                <button className={styles.modalBtnDanger} onClick={submitCancel} disabled={cancelling || !cancelReason.trim()}>
                  {cancelling ? <FaSpinner className={styles.spinning} /> : <><FaBan /> Confirm Cancel</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ REFUND MODAL ============ */}
      <AnimatePresence>
        {refundModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3><FaUndo /> Request Refund</h3>
                <button className={styles.closeBtn} onClick={() => setRefundModalOpen(false)} disabled={submittingRefund}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <p>Tell us what went wrong and we'll process your request.</p>
                <div className={styles.refundInfoBox}>
                  <div className={styles.refundInfoRow}><span>Product:</span><strong>{order.product?.name}</strong></div>
                  <div className={styles.refundInfoRow}><span>You paid:</span><strong>{formatKSH(Number(order.total_price || 0) - Number(order.delivery_fee || 0))}</strong></div>
                </div>
                <label className={styles.cancelLabel}>Reason *</label>
                <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className={styles.cancelInput} disabled={submittingRefund}>
                  <option value="">Select reason...</option>
                  {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <label className={styles.cancelLabel} style={{ marginTop: 12 }}>Description *</label>
                <textarea
                  value={refundDescription}
                  onChange={(e) => setRefundDescription(e.target.value)}
                  placeholder="Describe the issue (at least 10 characters)..."
                  className={styles.cancelTextarea}
                  rows={4}
                  disabled={submittingRefund}
                />
                <div className={styles.refundNote}>
                  <FaExclamationTriangle size={11} />
                  <span>Seller reviews within 24h. Admin processes the wallet refund if approved.</span>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setRefundModalOpen(false)} disabled={submittingRefund}>Cancel</button>
                <button className={styles.modalBtnConfirm} onClick={submitRefund} disabled={submittingRefund || !refundReason || refundDescription.trim().length < 10}>
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
            <motion.div className={styles.modalContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>Confirm Delivery</h3>
                <button className={styles.closeBtn} onClick={() => setOtpOpen(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <p>Enter the 6-digit OTP to confirm delivery</p>
                <input type="text" maxLength={6} value={otpValue} onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))} placeholder="000000" className={styles.otpInput} autoFocus />
                <div className={styles.otpHint}><FaKey size={14} /><span>Check your SMS for the OTP</span></div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setOtpOpen(false)}>Cancel</button>
                <button className={styles.modalBtnConfirm} onClick={submitOtp} disabled={submittingOtp || otpValue.length !== 6}>
                  {submittingOtp ? <FaSpinner className={styles.spinning} /> : "Confirm Delivery"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>Pay Balance</h3>
                <button className={styles.closeBtn} onClick={() => setPaymentModalOpen(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.paymentAmount}><span>Amount Due:</span><strong>{formatKSH(order.balance_due)}</strong></div>
                <p className={styles.paymentSubtitle}>Select payment method</p>
                <div className={styles.paymentMethods}>
                  <button className={`${styles.paymentMethod} ${paymentMethod === "wallet" ? styles.selected : ""}`} onClick={() => setPaymentMethod("wallet")} disabled={processingPayment || mpesaLoading}>
                    <FaWallet className={styles.paymentMethodIcon} />
                    <div><span className={styles.paymentMethodName}>Wallet</span><span className={styles.paymentMethodBalance}>Balance: {formatKSH(walletBalance)}</span></div>
                    {paymentMethod === "wallet" && <div className={styles.checkIndicator}>✓</div>}
                  </button>
                  <button className={`${styles.paymentMethod} ${paymentMethod === "mpesa" ? styles.selected : ""}`} onClick={() => setPaymentMethod("mpesa")} disabled={processingPayment || mpesaLoading}>
                    <FaMobile className={styles.paymentMethodIcon} />
                    <div><span className={styles.paymentMethodName}>M-Pesa</span><span className={styles.paymentMethodBalance}>Pay via M-PESA</span></div>
                    {paymentMethod === "mpesa" && <div className={styles.checkIndicator}>✓</div>}
                  </button>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setPaymentModalOpen(false)} disabled={processingPayment}>Cancel</button>
                <button className={styles.modalBtnConfirm} onClick={processPayment} disabled={processingPayment || mpesaLoading || !paymentMethod}>
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

export default OrderDetail;