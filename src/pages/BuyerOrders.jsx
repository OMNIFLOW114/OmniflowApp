// src/pages/BuyerOrders.jsx - MODERNIZED VERSION
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import { toast } from "react-hot-toast";
import {
  FaBox,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaClock,
  FaStore,
  FaShippingFast,
  FaTruck,
  FaStar,
  FaWallet,
  FaKey,
  FaMotorcycle,
  FaMobile,
  FaTimes,
  FaChevronRight,
  FaHourglassHalf,
  FaArrowLeft,
  FaSpinner,
  FaCircle,
  FaImage,
  FaShoppingBag,
  FaUser,
  FaPhone,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaClipboardCheck,
  FaRocket,
  FaGift,
  FaShieldAlt,
  FaMedal,
  FaWhatsapp
} from "react-icons/fa";
import styles from "./BuyerOrders.module.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString('en-KE', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
};

const STEPS = [
  { key: "pending", label: "Pending", icon: <FaHourglassHalf />, color: "#F59E0B" },
  { key: "processing", label: "Processing", icon: <FaBox />, color: "#3B82F6" },
  { key: "shipped", label: "Shipped", icon: <FaShippingFast />, color: "#8B5CF6" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck />, color: "#EC4899" },
  { key: "delivered", label: "Delivered", icon: <FaCheckCircle />, color: "#10B981" }
];

const getDeliveryTypeInfo = (type) => {
  if (type === 'self-delivery') {
    return { icon: <FaStore size={12} />, label: 'Self Delivery', color: '#F59E0B', bg: '#FEF3C7' };
  }
  return { icon: <FaMotorcycle size={12} />, label: 'Omniflow', color: '#3B82F6', bg: '#EFF6FF' };
};

const getStatusStep = (status) => {
  if (!status) return 0;
  const statusMap = {
    'pending': 0,
    'deposit_paid': 1,
    'processing': 1,
    'shipped': 2,
    'on_delivery': 3,
    'out for delivery': 3,
    'delivered': 4,
    'completed': 4
  };
  return statusMap[status?.toLowerCase()] || 0;
};

const createOrderStatusNotification = async (userId, orderId, productName, oldStatus, newStatus) => {
  try {
    let title = "", message = "", type = "order";
    
    switch (newStatus) {
      case "processing":
        title = "Order Being Processed";
        message = `Your order "${productName.substring(0, 50)}" is now being processed by the seller.`;
        break;
      case "shipped":
        title = "Order Shipped! 🚚";
        message = `Great news! Your order "${productName.substring(0, 50)}" has been shipped!`;
        break;
      case "out_for_delivery":
        title = "Out for Delivery! 🚚";
        message = `Your order "${productName.substring(0, 50)}" is out for delivery.`;
        break;
      case "delivered":
        title = "Order Delivered! ✅";
        message = `Your order "${productName.substring(0, 50)}" has been marked as delivered. Please confirm with OTP.`;
        break;
      case "completed":
        title = "Order Completed! 🎉";
        message = `Congratulations! Your order "${productName.substring(0, 50)}" is now complete.`;
        break;
      default: return;
    }
    
    await supabase.from("notifications").insert({
      user_id: userId,
      title, message, type,
      read: false,
      metadata: { order_id: orderId, old_status: oldStatus, new_status: newStatus }
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

const OrderCardSkeleton = () => {
  const { darkMode } = useDarkMode();
  return (
    <div className={`${styles.orderCard} ${styles.skeleton}`}>
      <div className={styles.skeletonImage}></div>
      <div className={styles.orderDetails}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonStore}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonProgress}></div>
        <div className={styles.skeletonPrice}></div>
        <div className={styles.skeletonActions}></div>
      </div>
    </div>
  );
};

const BuyerOrders = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { initiateWalletDeposit, loading: mpesaLoading, cancelPolling } = useMpesaPayment();
  
  const [tab, setTab] = useState(() => sessionStorage.getItem('buyerOrdersTab') || "all");
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
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    sessionStorage.setItem('buyerOrdersTab', tab);
  }, [tab]);

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const orderChannel = supabase
      .channel('buyer-orders-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `buyer_id=eq.${user.id}`
      }, (payload) => {
        const oldOrder = orders.find(o => o.id === payload.new.id);
        const oldStatus = oldOrder?.status;
        const newStatus = payload.new?.status;
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === payload.new.id ? { ...order, ...payload.new } : order
          )
        );

        if (oldStatus !== newStatus && newStatus) {
          const productName = oldOrder?.product?.name || "your order";
          createOrderStatusNotification(user.id, payload.new.id, productName, oldStatus, newStatus);
          
          const statusMessages = {
            'shipped': 'Your order has been shipped! 🚚',
            'out_for_delivery': 'Your order is out for delivery! 📦',
            'delivered': 'Seller marked order as delivered! Please confirm delivery.',
            'processing': 'Seller is processing your order!'
          };
          if (statusMessages[newStatus]) {
            toast.success(statusMessages[newStatus], { duration: 5000 });
          }
        }
      })
      .subscribe();

    return () => supabase.removeChannel(orderChannel);
  }, [user, orders]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchWallet(), fetchOrders(), fetchInstallments()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  async function fetchWallet() {
    if (!user?.id) return 0;
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return 0;
    const balance = Number(data?.balance || 0);
    setWalletBalance(balance);
    return balance;
  }

  async function fetchOrders() {
    if (!user?.id) return [];
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`*, product:products!orders_product_id_fkey(id, name, image_gallery, image_url, store_id, category, owner_id)`)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load orders");
      return [];
    }

    const storeIds = [...new Set(ordersData.map((o) => o.product?.store_id).filter(Boolean))];
    let storesData = [];
    if (storeIds.length) {
      const { data } = await supabase.from("stores").select("id, name, location, delivery_type, owner_id").in("id", storeIds);
      if (data) storesData = data;
    }

    const productIds = ordersData.map(o => o.product?.id).filter(Boolean);
    let ratingsData = [];
    if (productIds.length > 0 && user?.id) {
      const { data } = await supabase.from("ratings").select("product_id, rating").eq("user_id", user.id).in("product_id", productIds);
      if (data) ratingsData = data;
    }

    const enriched = (ordersData || []).map((o) => {
      const store = storesData?.find((s) => s.id === o.product?.store_id);
      const deliveryType = store?.delivery_type || 'omniflow-managed';
      const deliveryInfo = getDeliveryTypeInfo(deliveryType);
      const existingRating = ratingsData.find(r => r.product_id === o.product?.id);
      
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
        product_image: imageUrl 
      };
    });

    setOrders(enriched);
    return enriched;
  }

  async function fetchInstallments() {
    if (!user?.id) return [];
    const { data, error } = await supabase
      .from("installment_orders")
      .select(`*, products:product_id(id, name, image_gallery, image_url), seller:seller_id(id, full_name, email)`)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load installment plans");
      return [];
    }
    setInstallments(data || []);
    return data || [];
  }

  useEffect(() => {
    fetchData();
  }, [user, fetchData]);

  // Modern Progress Bar with animated steps
  const renderModernProgressBar = (status, delivered) => {
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
                    className={`${styles.modernProgressCircle} ${isActive ? styles.active : ''} ${isCurrent ? styles.current : ''}`}
                    style={{ 
                      borderColor: isActive ? step.color : '#e0e0e0',
                      background: isActive ? step.color : 'transparent',
                      color: isActive ? '#fff' : '#999'
                    }}
                  >
                    {isActive ? step.icon : <span className={styles.stepNumber}>{index + 1}</span>}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`${styles.modernProgressLine} ${index < currentStep ? styles.activeLine : ''}`} />
                  )}
                </div>
                <div className={styles.modernProgressLabel}>
                  <span className={`${styles.modernProgressText} ${isActive ? styles.activeText : ''}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.modernProgressStatus}>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} style={{ background: delivered ? '#10B981' : STEPS[currentStep]?.color || '#F59E0B' }} />
            <span className={styles.statusText}>
              {delivered ? "✓ Order Completed" : `${STEPS[currentStep]?.label || 'Pending'} in Progress`}
            </span>
          </div>
          {!delivered && (
            <div className={styles.statusETA}>
              <FaClock size={12} />
              <span>Estimated delivery: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Rating Stars
  const renderRatingStars = (order) => {
    const isRated = order.has_rated;
    const currentRating = order.user_rating || 0;
    const hoverRating = hoveredRating[order.id] || 0;

    return (
      <div className={styles.ratingSectionModern}>
        <span className={styles.ratingLabel}>{isRated ? 'Your rating' : 'Rate this order'}</span>
        <div className={styles.starsModern}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`${styles.starModern} ${(hoverRating >= star || (!hoverRating && currentRating >= star)) ? styles.active : ''}`}
              onMouseEnter={() => !isRated && !submittingRating && setHoveredRating(prev => ({ ...prev, [order.id]: star }))}
              onMouseLeave={() => !isRated && !submittingRating && setHoveredRating(prev => ({ ...prev, [order.id]: 0 }))}
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

  async function handleSubmitRating(order, rating) {
    if (!user?.id) {
      toast.error("Please login to rate");
      return;
    }

    setSubmittingRating(true);
    const loadingToast = toast.loading("Submitting rating...");

    try {
      const { error } = await supabase
        .from("ratings")
        .upsert({
          user_id: user.id,
          product_id: order.product.id,
          rating: Number(rating),
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id, product_id' });

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, has_rated: true, user_rating: rating } : o));

      toast.dismiss(loadingToast);
      toast.success("Thank you for rating!", { icon: '⭐' });

    } catch (err) {
      console.error("Rating error:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  }

  // OTP Functions
  function openOtpModal(order) {
    if (!order?.id) {
      toast.error("Order not found");
      return;
    }
    if (!order.delivery_otp) {
      toast.error("OTP not available yet. Please wait for seller to provide OTP.");
      return;
    }
    setOtpValue("");
    setOtpOrderId(order.id);
    setOtpOpen(true);
  }

  async function submitOtp() {
    if (!otpOrderId || !otpValue || otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setSubmittingOtp(true);
    try {
      const { data, error } = await supabase.rpc("mark_order_delivered", { p_order: otpOrderId, p_otp: otpValue });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to confirm delivery');

      setOrders(prev => prev.map(order => order.id === otpOrderId ? { ...order, delivered: true, status: data.needs_payment ? 'delivered' : 'completed' } : order));

      if (data.needs_payment) {
        toast.success("Delivery confirmed! You can now pay the remaining balance.");
      } else {
        toast.success("Delivery confirmed! Order completed.");
      }
      
      setOtpOpen(false);
      setOtpOrderId(null);
      setOtpValue("");
      await fetchData();
      
    } catch (err) {
      toast.error(err.message || "Failed to confirm delivery");
    } finally {
      setSubmittingOtp(false);
    }
  }

  // Payment Functions
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
          
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, balance_paid: true, balance_due: 0, status: o.delivered ? 'completed' : 'balance_paid' } : o));
          
          setMpesaPaymentStep(3);
          toast.dismiss(loadingToast);
          toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, { duration: 8000, icon: '✅' });
          
          await fetchWallet();
          
          setTimeout(() => {
            setPaymentModalOpen(false);
            setSelectedOrder(null);
            setMpesaPaymentStep(1);
            setProcessingPayment(false);
          }, 3000);
        },
        (error) => {
          console.error('M-Pesa payment failed:', error);
          setMpesaPaymentStep(1);
          toast.dismiss(loadingToast);
          toast.error(`Payment failed: ${error}. Please try again.`);
          setProcessingPayment(false);
        }
      );
      
      setMpesaPaymentCheckoutId(result?.checkoutRequestID);
      
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.message || "M-Pesa payment failed");
      setMpesaPaymentStep(1);
      setProcessingPayment(false);
    }
  };

  async function processWalletPayment(order) {
    setProcessingPayment(true);
    const loadingToast = toast.loading("Processing payment...");

    try {
      const { data, error } = await supabase.rpc("pay_remaining_balance", { p_order: order.id, p_buyer: user.id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Payment failed");

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, balance_paid: true, balance_due: 0, status: o.delivered ? 'completed' : 'balance_paid' } : o));

      toast.dismiss(loadingToast);
      toast.success(`Payment successful! Amount: ${formatKSH(order.balance_due)}`, { duration: 5000 });

      await fetchWallet();
      setPaymentModalOpen(false);
      setSelectedOrder(null);

    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  }

  function openPaymentModal(order) {
    setSelectedOrder(order);
    setPaymentMethod("");
    setPaymentModalOpen(true);
  }

  async function processPayment() {
    if (!selectedOrder || !paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === 'wallet') {
      await processWalletPayment(selectedOrder);
    } else if (paymentMethod === 'mpesa') {
      const phone = prompt("Enter your M-Pesa phone number (e.g., 0712345678):", user?.phone || "");
      if (!phone || !/^0[17]\d{8}$/.test(phone)) {
        toast.error("Please enter a valid M-Pesa phone number");
        setProcessingPayment(false);
        return;
      }
      await handleMpesaPayment(selectedOrder, phone);
    }
  }

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const activeOrders = useMemo(() => orders.filter((o) => !(o.status === "completed" || o.escrow_released)), [orders]);
  const completedOrders = useMemo(() => orders.filter((o) => o.status === "completed" || o.escrow_released), [orders]);

  if (loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.headerModern}>
          <button className={styles.backBtnModern} onClick={() => navigate(-1)}><FaArrowLeft /></button>
          <div className={styles.headerCenter}>
            <h1 className={styles.headerTitle}>My Orders</h1>
            <p className={styles.headerSubtitle}>Track your purchases</p>
          </div>
          <div className={styles.skeletonWallet}></div>
        </div>
        <div className={styles.tabsContainerModern}>
          <div className={styles.tabsScroll}>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
          </div>
        </div>
        <div className={styles.ordersListModern}>
          {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* M-Pesa Payment Modal */}
      <AnimatePresence>
        {mpesaPaymentStep === 2 && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.paymentLoaderModern}>
                <div className={styles.spinnerModern}></div>
                <h4 className={styles.paymentTitle}>Processing Payment</h4>
                <p className={styles.paymentInstruction}>Please check your phone ({mpesaPhoneNumber}) and enter your M-Pesa PIN</p>
                <p className={styles.paymentAmountModern}>Amount: <strong>{formatKSH(mpesaPaymentAmount)}</strong></p>
                <button onClick={() => { cancelPolling(); setMpesaPaymentStep(1); setProcessingPayment(false); }} className={styles.cancelBtnModern}>
                  Cancel Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {mpesaPaymentStep === 3 && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.successContentModern} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.successIconModern}>✅</div>
              <h3 className={styles.successTitle}>Payment Successful!</h3>
              <p className={styles.successDesc}>Your payment has been received and confirmed.</p>
              <p className={styles.successSub}>Redirecting to orders...</p>
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
            <FaCircle className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabsContainerModern}>
        <div className={styles.tabsScroll}>
          <button 
            className={`${styles.tabBtnModern} ${tab === "all" ? styles.active : ""}`} 
            onClick={() => setTab("all")}
          >
            <span className={styles.tabLabel}>Active</span>
            <span className={styles.tabBadge}>{activeOrders.length}</span>
          </button>
          <button 
            className={`${styles.tabBtnModern} ${tab === "installments" ? styles.active : ""}`} 
            onClick={() => setTab("installments")}
          >
            <span className={styles.tabLabel}>Installments</span>
            <span className={styles.tabBadge}>{installments.length}</span>
          </button>
          <button 
            className={`${styles.tabBtnModern} ${tab === "completed" ? styles.active : ""}`} 
            onClick={() => setTab("completed")}
          >
            <span className={styles.tabLabel}>Completed</span>
            <span className={styles.tabBadge}>{completedOrders.length}</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className={styles.ordersListModern}>
        {tab === "all" && (
          <>
            {activeOrders.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaShoppingBag size={48} /></div>
                <h3 className={styles.emptyTitle}>No Active Orders</h3>
                <p className={styles.emptyDesc}>You don't have any active orders at the moment</p>
                <button className={styles.shopBtnModern} onClick={() => navigate('/student/marketplace')}>
                  <FaShopping /> Start Shopping
                </button>
              </motion.div>
            ) : (
              activeOrders.map((order, index) => {
                const sellerMarkedDelivered = order.status?.toLowerCase() === "delivered";
                const buyerConfirmed = !!order.delivered;
                const canConfirmDelivery = sellerMarkedDelivered && !buyerConfirmed;
                const canPayRemaining = buyerConfirmed && order.balance_due > 0 && !order.balance_paid;
                const isExpanded = expandedOrders[order.id] || false;

                return (
                  <motion.div 
                    className={styles.orderCardModern} 
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className={styles.orderCardInner}>
                      {/* Order Header */}
                      <div className={styles.orderCardHeader}>
                        <div className={styles.orderImageContainer}>
                          {order.product_image && order.product_image !== "/placeholder.png" ? (
                            <img 
                              src={order.product_image} 
                              alt={order.product?.name} 
                              className={styles.orderImageModern} 
                              onError={(e) => { e.target.src = "/placeholder.png"; }} 
                            />
                          ) : (
                            <div className={styles.orderImagePlaceholderModern}>
                              <FaImage size={24} />
                            </div>
                          )}
                        </div>
                        <div className={styles.orderHeaderInfo}>
                          <h3 className={styles.productNameModern}>{order.product?.name || "Product"}</h3>
                          <div className={styles.orderMetaRow}>
                            <span className={styles.metaItem}>
                              <FaStore size={12} />
                              {order.store?.name || "Unknown Store"}
                            </span>
                            <span className={styles.metaItem}>
                              <FaCalendarAlt size={12} />
                              {new Date(order.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className={styles.orderStatusRow}>
                            <span className={`${styles.orderStatusBadge} ${order.status?.toLowerCase()}`}>
                              {order.status || 'Pending'}
                            </span>
                            <span className={styles.deliveryTypeBadge} style={{ backgroundColor: order.delivery_info.bg, color: order.delivery_info.color }}>
                              {order.delivery_info.icon}
                              {order.delivery_info.label}
                            </span>
                          </div>
                        </div>
                        <button 
                          className={styles.expandToggle}
                          onClick={() => toggleOrderExpand(order.id)}
                        >
                          <FaChevronRight className={isExpanded ? styles.rotated : ''} />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      {renderModernProgressBar(order.status, buyerConfirmed)}

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            className={styles.orderDetailsExpanded}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* Price Breakdown */}
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

                            {/* Order Details */}
                            <div className={styles.orderDetailGrid}>
                              <div className={styles.detailItem}>
                                <FaMapMarkerAlt className={styles.detailIcon} />
                                <div>
                                  <span className={styles.detailLabel}>Delivery Location</span>
                                  <span className={styles.detailValue}>{order.delivery_location?.split(',')[0] || "N/A"}</span>
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

                            {/* Status Messages */}
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
                            {order.escrow_released && (
                              <div className={styles.statusMessageComplete}>
                                <FaMedal className={styles.messageIcon} />
                                <span>Order Complete! Thank you for shopping with us.</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className={styles.actionButtonsModern}>
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
                              <button 
                                className={styles.actionBtnWhatsApp}
                                onClick={() => {
                                  const phone = order.store?.phone || '';
                                  window.open(`https://wa.me/254${phone.replace(/^0+/, '')}`, '_blank');
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

        {tab === "installments" && (
          <>
            {installments.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaBox size={48} /></div>
                <h3 className={styles.emptyTitle}>No Installment Plans</h3>
                <p className={styles.emptyDesc}>You don't have any active installment plans</p>
              </motion.div>
            ) : (
              installments.map((order, index) => {
                const paidPercent = Math.floor((Number(order.amount_paid || 0) / Number(order.total_price || 1)) * 100);
                let installImage = "/placeholder.png";
                if (order.products?.image_gallery?.length > 0 && order.products.image_gallery[0]) {
                  installImage = order.products.image_gallery[0];
                } else if (order.products?.image_url) {
                  installImage = order.products.image_url;
                }

                return (
                  <motion.div 
                    className={styles.orderCardModern} 
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={styles.orderCardInner}>
                      <div className={styles.orderCardHeader}>
                        <div className={styles.orderImageContainer}>
                          {installImage !== "/placeholder.png" ? (
                            <img 
                              src={installImage} 
                              alt={order.products?.name} 
                              className={styles.orderImageModern} 
                              onError={(e) => { e.target.src = "/placeholder.png"; }} 
                            />
                          ) : (
                            <div className={styles.orderImagePlaceholderModern}>
                              <FaImage size={24} />
                            </div>
                          )}
                        </div>
                        <div className={styles.orderHeaderInfo}>
                          <h3 className={styles.productNameModern}>{order.products?.name || "Product"}</h3>
                          <div className={styles.orderMetaRow}>
                            <span className={styles.metaItem}>
                              <FaUser size={12} />
                              {order.seller?.full_name || "Seller"}
                            </span>
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
                        <div className={styles.statModern}>
                          <span className={styles.statLabel}>Total</span>
                          <strong className={styles.statValue}>{formatKSH(order.total_price)}</strong>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statModern}>
                          <span className={styles.statLabel}>Paid</span>
                          <strong className={styles.statValue}>{formatKSH(order.amount_paid)}</strong>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statModern}>
                          <span className={styles.statLabel}>Next Due</span>
                          <strong className={styles.statValue}>{order.next_due_date?.slice(0, 10) || "—"}</strong>
                        </div>
                      </div>

                      <button className={styles.installmentLinkModern} onClick={() => navigate('/student/my-installments')}>
                        Manage Plan <FaChevronRight />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {tab === "completed" && (
          <>
            {completedOrders.length === 0 ? (
              <motion.div className={styles.emptyStateModern} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.emptyIcon}><FaCheckCircle size={48} /></div>
                <h3 className={styles.emptyTitle}>No Completed Orders</h3>
                <p className={styles.emptyDesc}>Your completed orders will appear here</p>
              </motion.div>
            ) : (
              completedOrders.map((order, index) => (
                <motion.div 
                  className={styles.orderCardModern} 
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className={styles.orderCardInner}>
                    <div className={styles.orderCardHeader}>
                      <div className={styles.orderImageContainer}>
                        {order.product_image && order.product_image !== "/placeholder.png" ? (
                          <img 
                            src={order.product_image} 
                            alt={order.product?.name} 
                            className={styles.orderImageModern} 
                            onError={(e) => { e.target.src = "/placeholder.png"; }} 
                          />
                        ) : (
                          <div className={styles.orderImagePlaceholderModern}>
                            <FaImage size={24} />
                          </div>
                        )}
                      </div>
                      <div className={styles.orderHeaderInfo}>
                        <div className={styles.completedHeader}>
                          <h3 className={styles.productNameModern}>{order.product?.name || "Product"}</h3>
                          <span className={styles.completedBadgeModern}>
                            <FaCheckCircle /> Completed
                          </span>
                        </div>
                        <div className={styles.orderMetaRow}>
                          <span className={styles.metaItem}>
                            <FaStore size={12} />
                            {order.store?.name || "Unknown Store"}
                          </span>
                          <span className={styles.metaItem}>
                            <FaCalendarAlt size={12} />
                            {new Date(order.updated_at || order.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className={styles.priceBreakdownModern}>
                          <div className={styles.priceItemModern}>
                            <span className={styles.priceLabelModern}>Total Paid</span>
                            <span className={styles.priceValueTotalModern}>{formatKSH(order.total_price)}</span>
                          </div>
                        </div>
                        {renderRatingStars(order)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </>
        )}
      </div>

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
                  type="text" 
                  maxLength={6} 
                  value={otpValue} 
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))} 
                  placeholder="000000" 
                  className={styles.otpInputModern} 
                  autoFocus
                />
                <div className={styles.otpHint}>
                  <FaKey size={12} />
                  <span>Check your SMS for the delivery OTP</span>
                </div>
              </div>
              <div className={styles.modalFooterModern}>
                <button className={styles.modalBtnCancelModern} onClick={() => setOtpOpen(false)}>Cancel</button>
                <button 
                  className={styles.modalBtnConfirmModern} 
                  onClick={submitOtp} 
                  disabled={submittingOtp || otpValue.length !== 6}
                >
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
                    className={`${styles.paymentMethodModern} ${paymentMethod === 'wallet' ? styles.selected : ''}`} 
                    onClick={() => setPaymentMethod('wallet')} 
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaWallet className={styles.paymentMethodIcon} />
                    <div className={styles.paymentMethodInfo}>
                      <span className={styles.paymentMethodName}>Omniflow Wallet</span>
                      <span className={styles.paymentMethodBalance}>Balance: {formatKSH(walletBalance)}</span>
                    </div>
                    {paymentMethod === 'wallet' && <div className={styles.checkIndicatorModern}>✓</div>}
                  </button>
                  <button 
                    className={`${styles.paymentMethodModern} ${paymentMethod === 'mpesa' ? styles.selected : ''}`} 
                    onClick={() => setPaymentMethod('mpesa')} 
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaMobile className={styles.paymentMethodIcon} />
                    <div className={styles.paymentMethodInfo}>
                      <span className={styles.paymentMethodName}>M-Pesa</span>
                      <span className={styles.paymentMethodBalance}>Pay via M-PESA</span>
                    </div>
                    {paymentMethod === 'mpesa' && <div className={styles.checkIndicatorModern}>✓</div>}
                  </button>
                </div>
              </div>
              <div className={styles.modalFooterModern}>
                <button className={styles.modalBtnCancelModern} onClick={() => setPaymentModalOpen(false)} disabled={processingPayment}>Cancel</button>
                <button 
                  className={styles.modalBtnConfirmModern} 
                  onClick={processPayment} 
                  disabled={processingPayment || mpesaLoading || !paymentMethod}
                >
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