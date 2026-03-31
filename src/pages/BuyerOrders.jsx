// src/pages/BuyerOrders.jsx - PREMIUM UPDATED VERSION
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  FaPaypal,
  FaTimes,
  FaChevronRight,
  FaHourglassHalf,
  FaInfoCircle,
  FaArrowLeft,
  FaSpinner,
  FaEye,
  FaCircle
} from "react-icons/fa";
import styles from "./BuyerOrders.module.css";

// Helper function for Kenyan price formatting
const formatKSH = (amount) => {
  const num = Number(amount || 0);
  if (Number.isInteger(num) || num % 1 === 0) {
    return `KSh ${num.toLocaleString('en-KE')}`;
  }
  return `KSh ${num.toLocaleString('en-KE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Skeleton Loader Component
const OrderCardSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.orderCard} ${styles.skeleton}`}>
      <div className={styles.orderRow}>
        <div className={styles.skeletonImage}></div>
        <div className={styles.orderDetails}>
          <div className={styles.orderHeaderRow}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonBadge}></div>
          </div>
          <div className={styles.skeletonStore}></div>
          <div className={styles.skeletonMeta}></div>
          <div className={styles.skeletonProgress}></div>
          <div className={styles.skeletonPrice}></div>
          <div className={styles.skeletonActions}></div>
        </div>
      </div>
    </div>
  );
};

// Progress Steps
const steps = [
  { key: "pending", label: "Pending", icon: <FaHourglassHalf /> },
  { key: "processing", label: "Processing", icon: <FaBox /> },
  { key: "shipped", label: "Shipped", icon: <FaShippingFast /> },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck /> },
  { key: "delivered", label: "Delivered", icon: <FaCheckCircle /> }
];

const getDeliveryTypeInfo = (type) => {
  if (type === 'self-delivery') {
    return {
      icon: <FaStore size={12} />,
      label: 'Self Delivery',
      color: '#F59E0B',
      bg: '#FEF3C7'
    };
  }
  return {
    icon: <FaMotorcycle size={12} />,
    label: 'Omniflow',
    color: '#3B82F6',
    bg: '#EFF6FF'
  };
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

const BuyerOrders = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  // M-Pesa payment hook
  const { initiateWalletDeposit, loading: mpesaLoading, pollingActive, currentCheckoutId, cancelPolling } = useMpesaPayment();
  
  const [tab, setTab] = useState(() => {
    return sessionStorage.getItem('buyerOrdersTab') || "all";
  });
  const [orders, setOrders] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Modal states
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpOrderId, setOtpOrderId] = useState(null);
  const [submittingOtp, setSubmittingOtp] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // M-Pesa payment state
  const [mpesaPaymentStep, setMpesaPaymentStep] = useState(1);
  const [mpesaOrderId, setMpesaOrderId] = useState(null);
  const [mpesaPaymentCheckoutId, setMpesaPaymentCheckoutId] = useState(null);
  const [mpesaPaymentAmount, setMpesaPaymentAmount] = useState(0);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");

  // Rating state
  const [hoveredRating, setHoveredRating] = useState({});

  // Admin constants
  const ADMIN_EMAIL = "omniflow718@gmail.com";
  const ADMIN_UUID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

  // Helper functions
  const isUuid = (v) =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const showError = (err, fallback = "Something went wrong") => {
    const msg = err?.message || err?.hint || err?.details || fallback;
    toast.error(msg);
    console.error("[Error]", err);
  };

  // Save tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('buyerOrdersTab', tab);
  }, [tab]);

  // ===== REALTIME ORDER UPDATES =====
  useEffect(() => {
    if (!user?.id) return;

    const orderChannel = supabase
      .channel('buyer-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order updated:', payload.new);
          
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === payload.new.id 
                ? { ...order, ...payload.new }
                : order
            )
          );

          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;

          if (oldStatus !== newStatus) {
            if (newStatus === 'shipped') {
              toast.success('Your order has been shipped! 🚚');
            } else if (newStatus === 'out for delivery') {
              toast.success('Your order is out for delivery! 📦');
            } else if (newStatus === 'delivered') {
              toast.success('Seller marked order as delivered! Please confirm delivery.', { icon: '✅' });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New order:', payload.new);
          fetchOrders();
          toast.success('New order created!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [user]);

  // ===== FETCHERS =====
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
      .select(
        `*, 
         product:products!orders_product_id_fkey(
           id, name, image_gallery, store_id, category, owner_id
         )`
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      showError(error, "Failed to load orders");
      return [];
    }

    const storeIds = [
      ...new Set(ordersData.map((o) => o.product?.store_id).filter(Boolean)),
    ];

    let storesData = [];
    if (storeIds.length) {
      const { data, error: storesError } = await supabase
        .from("stores")
        .select("id, name, location, delivery_type, owner_id")
        .in("id", storeIds);
      if (!storesError) storesData = data || [];
    }

    const productIds = ordersData.map(o => o.product?.id).filter(Boolean);
    let ratingsData = [];
    if (productIds.length > 0 && user?.id) {
      const { data, error: ratingsError } = await supabase
        .from("ratings")
        .select("product_id, rating")
        .eq("user_id", user.id)
        .in("product_id", productIds);
      
      if (!ratingsError && data) {
        ratingsData = data;
      }
    }

    const enriched = (ordersData || []).map((o) => {
      const store = storesData?.find((s) => s.id === o.product?.store_id);
      const deliveryType = store?.delivery_type || 'omniflow-managed';
      const deliveryInfo = getDeliveryTypeInfo(deliveryType);
      const existingRating = ratingsData.find(r => r.product_id === o.product?.id);
      
      return { 
        ...o, 
        store,
        delivery_type: deliveryType,
        delivery_info: deliveryInfo,
        has_rated: !!existingRating,
        user_rating: existingRating?.rating || null
      };
    });

    setOrders(enriched);
    return enriched;
  }

  async function fetchInstallments() {
    if (!user?.id) return [];
    const { data, error } = await supabase
      .from("installment_orders")
      .select(
        `
        *,
        products:product_id (id, name, image_gallery),
        seller:seller_id (id, full_name, email)
      `
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      showError(error, "Failed to load installment plans");
      return [];
    }
    setInstallments(data || []);
    return data || [];
  }

  // Initial load
  useEffect(() => {
    fetchData();
  }, [user, fetchData]);

  // ===== PROGRESS BAR =====
  const renderHorizontalProgress = (status, delivered) => {
    const currentStep = delivered ? 4 : getStatusStep(status);
    
    return (
      <div className={styles.orderProgressHorizontal}>
        {steps.map((step, index) => (
          <div key={step.key} className={styles.progressStepContainer}>
            <div className={`${styles.progressStep} ${index <= currentStep ? styles.active : ''}`}>
              <div className={styles.stepIcon}>{step.icon}</div>
            </div>
            {index < steps.length - 1 && (
              <div className={`${styles.progressLine} ${index < currentStep ? styles.active : ''}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ===== RATING FUNCTIONS =====
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
        }, {
          onConflict: 'user_id, product_id'
        });

      if (error) throw error;

      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? { ...o, has_rated: true, user_rating: rating }
            : o
        )
      );

      toast.dismiss(loadingToast);
      toast.success("Thank you for rating!", { icon: '⭐' });

    } catch (err) {
      console.error("Rating error:", err);
      toast.dismiss(loadingToast);
      showError(err, "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  }

  const renderRatingStars = (order) => {
    const isRated = order.has_rated;
    const currentRating = order.user_rating || 0;
    const hoverRating = hoveredRating[order.id] || 0;

    return (
      <div className={styles.ratingSection}>
        <span>{isRated ? 'Your rating:' : 'Rate this order:'}</span>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`${styles.star} ${
                (hoverRating >= star || (!hoverRating && currentRating >= star)) 
                  ? styles.active 
                  : ''
              }`}
              onMouseEnter={() => !isRated && !submittingRating && setHoveredRating(prev => ({ ...prev, [order.id]: star }))}
              onMouseLeave={() => !isRated && !submittingRating && setHoveredRating(prev => ({ ...prev, [order.id]: 0 }))}
              onClick={() => !isRated && !submittingRating && handleSubmitRating(order, star)}
              style={{ 
                cursor: isRated || submittingRating ? 'default' : 'pointer',
                opacity: submittingRating ? 0.5 : 1 
              }}
            >
              <FaStar />
            </span>
          ))}
          {isRated && (
            <span className={styles.ratedText}>✓ Rated</span>
          )}
        </div>
      </div>
    );
  };

  // ===== OTP DELIVERY CONFIRMATION =====
  function openOtpModal(order) {
    if (!order?.id) return;
    if (!order.delivery_otp) {
      toast.error("OTP not available yet");
      return;
    }
    setOtpValue(order.delivery_otp);
    setOtpOrderId(order.id);
    setOtpOpen(true);
  }

  async function submitOtp() {
    if (!otpOrderId || !otpValue || otpValue.length !== 6) {
      toast.error("Invalid OTP");
      return;
    }

    setSubmittingOtp(true);
    try {
      const { data, error } = await supabase.rpc("mark_order_delivered", {
        p_order: otpOrderId,
        p_otp: otpValue,
      });
      
      if (error) throw error;
      
      if (!data?.success) throw new Error(data?.error || 'Failed to confirm delivery');

      setOrders(prev =>
        prev.map(order =>
          order.id === otpOrderId
            ? { ...order, delivered: true, status: data.needs_payment ? 'delivered' : 'completed' }
            : order
        )
      );

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
      showError(err, "Failed to confirm delivery");
    } finally {
      setSubmittingOtp(false);
    }
  }

  // ===== PAYMENT FUNCTIONS =====
  const handleMpesaPayment = async (order, phoneNumber) => {
    setProcessingPayment(true);
    setMpesaPaymentStep(2);
    setMpesaOrderId(order.id);
    setMpesaPaymentAmount(order.balance_due);
    setMpesaPhoneNumber(phoneNumber);
    
    const loadingToast = toast.loading("Initiating M-Pesa payment...");
    
    try {
      const result = await initiateWalletDeposit(
        phoneNumber,
        order.balance_due,
        user.id,
        async (receipt, paidAmount) => {
          console.log('M-Pesa payment successful:', { receipt, paidAmount });
          
          const { data, error } = await supabase.rpc("pay_remaining_balance", {
            p_order: order.id,
            p_buyer: user.id,
          });
          
          if (error) throw error;
          
          if (!data?.success) throw new Error(data?.error || "Payment processing failed");
          
          await supabase
            .from("orders")
            .update({
              mpesa_receipt: receipt,
              updated_at: new Date().toISOString()
            })
            .eq("id", order.id);
          
          setOrders(prev =>
            prev.map(o =>
              o.id === order.id
                ? { 
                    ...o, 
                    balance_paid: true, 
                    balance_due: 0,
                    status: o.delivered ? 'completed' : 'balance_paid',
                    escrow_released: o.delivered ? true : o.escrow_released
                  }
                : o
            )
          );
          
          setMpesaPaymentStep(3);
          toast.dismiss(loadingToast);
          
          toast.success(
            <div>
              <strong>Payment successful!</strong>
              <br />
              <small>Amount: {formatKSH(paidAmount)}</small>
              <br />
              <small>Receipt: {receipt}</small>
            </div>,
            { duration: 8000, icon: '✅' }
          );
          
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
      console.error("M-Pesa error:", err);
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
      const { data, error } = await supabase.rpc("pay_remaining_balance", {
        p_order: order.id,
        p_buyer: user.id,
      });
      
      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || "Payment failed");
      }

      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? { 
                ...o, 
                balance_paid: true, 
                balance_due: 0,
                status: o.delivered ? 'completed' : 'balance_paid',
                escrow_released: o.delivered ? true : o.escrow_released
              }
            : o
        )
      );

      toast.dismiss(loadingToast);
      
      toast.success(
        <div>
          <strong>Payment successful!</strong>
          <br />
          <small>Amount paid: {formatKSH(order.balance_due)}</small>
        </div>,
        { duration: 5000 }
      );

      await fetchWallet();
      
      setPaymentModalOpen(false);
      setSelectedOrder(null);

    } catch (err) {
      console.error("Payment error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  }

  async function processPaypalPayment(order) {
    setProcessingPayment(true);
    const loadingToast = toast.loading("Redirecting to PayPal...");
    
    try {
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          orderId: order.id,
          amount: order.balance_due,
          buyerId: user.id
        }
      });
      
      if (error) throw error;
      
      toast.dismiss(loadingToast);
      
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
      
    } catch (err) {
      console.error("PayPal error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "PayPal payment failed");
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
      
      if (!phone) {
        toast.error("Phone number is required for M-Pesa payment");
        setProcessingPayment(false);
        return;
      }
      
      const phoneRegex = /^0[17]\d{8}$/;
      if (!phoneRegex.test(phone)) {
        toast.error("Please enter a valid M-Pesa phone number (e.g., 0712345678)");
        setProcessingPayment(false);
        return;
      }
      
      await handleMpesaPayment(selectedOrder, phone);
    } else if (paymentMethod === 'paypal') {
      await processPaypalPayment(selectedOrder);
    }
  }

  // Filter orders
  const activeOrders = useMemo(
    () => orders.filter((o) => !(o.status === "completed" || o.escrow_released)),
    [orders]
  );
  
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "completed" || o.escrow_released),
    [orders]
  );

  if (loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <h1>My Orders</h1>
          <div className={styles.skeletonWallet}></div>
        </div>
        <div className={styles.tabsContainer}>
          <div className={styles.tabsScroll}>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
          </div>
        </div>
        <div className={styles.ordersList}>
          {[1, 2, 3].map((i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* M-Pesa Payment Modal */}
      <AnimatePresence>
        {mpesaPaymentStep === 2 && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className={styles.paymentLoader}>
                <div className={styles.spinner}></div>
                <p>Waiting for M-Pesa payment...</p>
                <p className={styles.paymentInstruction}>
                  Please check your phone ({mpesaPhoneNumber}) and enter your M-Pesa PIN to complete the payment of {formatKSH(mpesaPaymentAmount)}
                </p>
                {mpesaPaymentCheckoutId && (
                  <p className={styles.referenceText}>Reference: {mpesaPaymentCheckoutId.slice(-8)}</p>
                )}
                <button 
                  onClick={() => {
                    cancelPolling();
                    setMpesaPaymentStep(1);
                    setProcessingPayment(false);
                  }}
                  className={styles.cancelBtn}
                >
                  Cancel Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {mpesaPaymentStep === 3 && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.successContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className={styles.successIcon}>✅</div>
              <h3>Payment Successful!</h3>
              <p>Your payment has been received.</p>
              <p>Redirecting to orders...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>My Orders</h1>
        <div className={styles.walletBadge}>
          <FaWallet size={14} />
          <span>{formatKSH(walletBalance)}</span>
          <button className={styles.refreshBtn} onClick={fetchData} disabled={refreshing}>
            <FaCircle className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsScroll}>
          <button
            className={`${styles.tabBtn} ${tab === "all" ? styles.active : ""}`}
            onClick={() => setTab("all")}
          >
            Active ({activeOrders.length})
          </button>
          <button
            className={`${styles.tabBtn} ${tab === "installments" ? styles.active : ""}`}
            onClick={() => setTab("installments")}
          >
            Installments ({installments.length})
          </button>
          <button
            className={`${styles.tabBtn} ${tab === "completed" ? styles.active : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed ({completedOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className={styles.ordersList}>
        {/* Active Orders */}
        {tab === "all" && (
          <>
            {activeOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <FaBox size={48} />
                <h3>No active orders</h3>
                <p>You don't have any active orders at the moment</p>
                <button className={styles.shopBtn} onClick={() => navigate('/student/marketplace')}>
                  Start Shopping
                </button>
              </div>
            ) : (
              activeOrders.map((order) => {
                const sellerMarkedDelivered = order.status?.toLowerCase() === "delivered";
                const buyerConfirmed = !!order.delivered;
                
                const canConfirmDelivery = sellerMarkedDelivered && !buyerConfirmed;
                const canPayRemaining = buyerConfirmed && order.balance_due > 0 && !order.balance_paid;
                const currentStatus = order.status;

                return (
                  <div className={styles.orderCard} key={order.id}>
                    <div className={styles.orderRow}>
                      <img
                        src={order.product?.image_gallery?.[0] || "/placeholder.png"}
                        alt={order.product?.name}
                        className={styles.orderImage}
                      />
                      <div className={styles.orderDetails}>
                        <div className={styles.orderHeaderRow}>
                          <h3 className={styles.productName}>{order.product?.name}</h3>
                          <div 
                            className={styles.deliveryBadge}
                            style={{ 
                              backgroundColor: order.delivery_info.bg, 
                              color: order.delivery_info.color 
                            }}
                          >
                            {order.delivery_info.icon}
                            <span>{order.delivery_info.label}</span>
                          </div>
                        </div>
                        
                        <p className={styles.storeName}>
                          <FaStore size={10} />
                          {order.store?.name || "Unknown Store"}
                        </p>
                        
                        <div className={styles.orderMeta}>
                          <span>
                            <FaClock size={10} />
                            {new Date(order.created_at).toLocaleDateString('en-KE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span>
                            <FaMapMarkerAlt size={10} />
                            {order.delivery_location?.split(',')[0] || "N/A"}
                          </span>
                        </div>

                        {renderHorizontalProgress(currentStatus, buyerConfirmed)}

                        {sellerMarkedDelivered && !buyerConfirmed && (
                          <div className={styles.statusMessageInfo}>
                            <FaTruck /> Seller marked as delivered - Please confirm delivery with OTP
                          </div>
                        )}

                        {buyerConfirmed && order.balance_due > 0 && !order.balance_paid && (
                          <div className={styles.statusMessageSuccess}>
                            <FaCheckCircle /> Delivery confirmed! Pay remaining balance to complete order
                          </div>
                        )}

                        <div className={styles.priceRow}>
                          <div className={styles.priceItem}>
                            <span className={styles.priceLabel}>Deposit</span>
                            <span className={styles.priceValuePaid}>{formatKSH(order.deposit_amount)}</span>
                          </div>
                          <FaChevronRight size={12} className={styles.priceSep} />
                          <div className={styles.priceItem}>
                            <span className={styles.priceLabel}>Balance</span>
                            <span className={styles.priceValueDue}>{formatKSH(order.balance_due)}</span>
                          </div>
                          <FaChevronRight size={12} className={styles.priceSep} />
                          <div className={styles.priceItem}>
                            <span className={styles.priceLabel}>Total</span>
                            <span className={styles.priceValueTotal}>{formatKSH(order.total_price)}</span>
                          </div>
                        </div>

                        <div className={styles.actionButtons}>
                          {canConfirmDelivery && (
                            <button
                              className={styles.actionBtnConfirm}
                              onClick={() => openOtpModal(order)}
                              disabled={processingAction}
                            >
                              <FaKey /> Confirm Delivery
                            </button>
                          )}

                          {canPayRemaining && (
                            <button
                              className={styles.actionBtnPay}
                              onClick={() => openPaymentModal(order)}
                              disabled={processingPayment || mpesaLoading}
                            >
                              <FaWallet /> Pay Balance
                            </button>
                          )}

                          {order.escrow_released && (
                            <div className={styles.statusBadgeCompleted}>
                              <FaCheckCircle /> Order Complete
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* Installments Tab */}
        {tab === "installments" && (
          <>
            {installments.length === 0 ? (
              <div className={styles.emptyState}>
                <FaBox size={48} />
                <h3>No installment plans</h3>
                <p>You don't have any active installment plans</p>
              </div>
            ) : (
              installments.map((order) => {
                const paidPercent = Math.floor(
                  (Number(order.amount_paid || 0) / Number(order.total_price || 1)) * 100
                );

                return (
                  <div className={styles.orderCard} key={order.id}>
                    <div className={styles.orderRow}>
                      <img
                        src={order.products?.image_gallery?.[0] || "/placeholder.png"}
                        alt={order.products?.name}
                        className={styles.orderImage}
                      />
                      <div className={styles.orderDetails}>
                        <h3 className={styles.productName}>{order.products?.name}</h3>
                        
                        <div className={styles.installmentProgress}>
                          <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${paidPercent}%` }} />
                          </div>
                          <span className={styles.progressText}>{paidPercent}% paid</span>
                        </div>

                        <div className={styles.installmentStats}>
                          <div className={styles.stat}>
                            <span>Total</span>
                            <strong>{formatKSH(order.total_price)}</strong>
                          </div>
                          <div className={styles.stat}>
                            <span>Paid</span>
                            <strong>{formatKSH(order.amount_paid)}</strong>
                          </div>
                          <div className={styles.stat}>
                            <span>Next Due</span>
                            <strong>{order.next_due_date?.slice(0, 10) || "—"}</strong>
                          </div>
                        </div>

                        <button 
                          className={styles.installmentLink} 
                          onClick={() => navigate('/student/my-installments')}
                        >
                          Manage Plan <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* Completed Orders Tab */}
        {tab === "completed" && (
          <>
            {completedOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <FaCheckCircle size={48} />
                <h3>No completed orders</h3>
                <p>Your completed orders will appear here</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <div className={styles.orderCard} key={order.id}>
                  <div className={styles.orderRow}>
                    <img
                      src={order.product?.image_gallery?.[0] || "/placeholder.png"}
                      alt={order.product?.name}
                      className={styles.orderImage}
                    />
                    <div className={styles.orderDetails}>
                      <div className={styles.orderHeaderRow}>
                        <h3 className={styles.productName}>{order.product?.name}</h3>
                        <div className={styles.completedBadge}>
                          <FaCheckCircle size={12} />
                          <span>Completed</span>
                        </div>
                      </div>

                      <p className={styles.storeName}>
                        <FaStore size={10} />
                        {order.store?.name || "Unknown Store"}
                      </p>

                      <div className={styles.orderMeta}>
                        <span>
                          <FaClock size={10} />
                          {new Date(order.updated_at || order.created_at).toLocaleDateString('en-KE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className={styles.priceRow}>
                        <div className={styles.priceItem}>
                          <span className={styles.priceLabel}>Total Paid</span>
                          <span className={styles.priceValueTotal}>{formatKSH(order.total_price)}</span>
                        </div>
                      </div>

                      {renderRatingStars(order)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* OTP Modal */}
      <AnimatePresence>
        {otpOpen && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className={styles.modalHeader}>
                <h3>Confirm Delivery</h3>
                <button className={styles.closeBtn} onClick={() => setOtpOpen(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Enter the 6-digit OTP to confirm delivery</p>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  placeholder="000000"
                  className={styles.otpInput}
                />
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setOtpOpen(false)}>
                  Cancel
                </button>
                <button
                  className={styles.modalBtnConfirm}
                  onClick={submitOtp}
                  disabled={submittingOtp || otpValue.length !== 6}
                >
                  {submittingOtp ? "Confirming..." : "Confirm Delivery"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModalOpen && selectedOrder && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className={styles.modalHeader}>
                <h3>Pay Balance</h3>
                <button className={styles.closeBtn} onClick={() => setPaymentModalOpen(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.paymentAmount}>
                  <span>Amount Due:</span>
                  <strong>{formatKSH(selectedOrder.balance_due)}</strong>
                </div>

                <div className={styles.paymentMethods}>
                  <button
                    className={`${styles.paymentMethod} ${paymentMethod === 'wallet' ? styles.selected : ''}`}
                    onClick={() => setPaymentMethod('wallet')}
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaWallet size={20} />
                    <div className={styles.methodInfo}>
                      <span className={styles.methodName}>Omniflow Wallet</span>
                      <span className={styles.methodBalance}>Balance: {formatKSH(walletBalance)}</span>
                    </div>
                    {paymentMethod === 'wallet' && <div className={styles.checkIndicator}>✓</div>}
                  </button>

                  <button
                    className={`${styles.paymentMethod} ${paymentMethod === 'mpesa' ? styles.selected : ''}`}
                    onClick={() => setPaymentMethod('mpesa')}
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaMobile size={20} />
                    <div className={styles.methodInfo}>
                      <span className={styles.methodName}>M-Pesa</span>
                      <span className={styles.methodBalance}>Pay via M-PESA</span>
                    </div>
                    {paymentMethod === 'mpesa' && <div className={styles.checkIndicator}>✓</div>}
                  </button>

                  <button
                    className={`${styles.paymentMethod} ${paymentMethod === 'paypal' ? styles.selected : ''}`}
                    onClick={() => setPaymentMethod('paypal')}
                    disabled={processingPayment}
                  >
                    <FaPaypal size={20} />
                    <div className={styles.methodInfo}>
                      <span className={styles.methodName}>PayPal</span>
                      <span className={styles.methodBalance}>International payments</span>
                    </div>
                    {paymentMethod === 'paypal' && <div className={styles.checkIndicator}>✓</div>}
                  </button>
                </div>
                
                {paymentMethod === 'mpesa' && (
                  <div className={styles.mpesaInfo}>
                    <FaInfoCircle size={14} />
                    <small>You will be prompted to enter your M-Pesa phone number after clicking "Pay Now"</small>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button 
                  className={styles.modalBtnCancel} 
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button
                  className={styles.modalBtnConfirm}
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