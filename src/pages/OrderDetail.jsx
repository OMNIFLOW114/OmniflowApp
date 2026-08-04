// src/pages/OrderDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import { toast } from "react-hot-toast";
import {
  FaBox,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaStore,
  FaShippingFast,
  FaTruck,
  FaStar,
  FaWallet,
  FaKey,
  FaMotorcycle,
  FaMobile,
  FaTimes,
  FaSpinner,
  FaImage,
  FaShoppingBag,
  FaUser,
  FaPhone,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaMedal,
  FaInfoCircle,
  FaReceipt,
  FaTag,
  FaBoxes,
  FaMapPin
} from "react-icons/fa";
import styles from "./OrderDetail.module.css";

const formatKSH = (amount) => {
  const num = Number(amount || 0);
  return `KSh ${num.toLocaleString('en-KE', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const STEPS = [
  { key: "pending", label: "Order Placed", icon: <FaBox />, color: "#F59E0B" },
  { key: "processing", label: "Processing", icon: <FaClock />, color: "#3B82F6" },
  { key: "shipped", label: "Shipped", icon: <FaShippingFast />, color: "#8B5CF6" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck />, color: "#EC4899" },
  { key: "delivered", label: "Delivered", icon: <FaCheckCircle />, color: "#10B981" }
];

// ===== SKELETON LOADER =====
const OrderDetailSkeleton = () => {
  const { darkMode } = useDarkMode();
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonWrapper}>
        {/* Header Skeleton */}
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonBadge}></div>
        </div>

        {/* Order Summary Skeleton */}
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '50%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '40%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '30%' }}></div>
          </div>
        </div>

        {/* Progress Skeleton */}
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonProgress}></div>
        </div>

        {/* Details Grid Skeleton */}
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard}></div>
          <div className={styles.skeletonCard}></div>
          <div className={styles.skeletonCard}></div>
        </div>

        {/* Price Breakdown Skeleton */}
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonLine} style={{ width: '60%' }}></div>
          <div className={styles.skeletonLine} style={{ width: '80%' }}></div>
          <div className={styles.skeletonLine} style={{ width: '80%' }}></div>
          <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
        </div>

        {/* Rating Skeleton */}
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonStars}></div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className={styles.skeletonActions}>
          <div className={styles.skeletonBtn}></div>
        </div>
      </div>
    </div>
  );
};

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
  const [productInfo, setProductInfo] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

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

  const getDeliveryTypeInfo = (type) => {
    if (type === 'self-delivery') {
      return { icon: <FaStore size={14} />, label: 'Self Delivery', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
    }
    return { icon: <FaMotorcycle size={14} />, label: 'Omniflow Express', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' };
  };

  const fetchOrderDetails = useCallback(async () => {
    if (!user?.id || !orderId) return;

    setLoading(true);
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`*, product:products!orders_product_id_fkey(id, name, description, price, image_gallery, image_url, store_id, category, owner_id, weight_class, delivery_estimated_days)`)
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) {
        toast.error("Order not found");
        navigate("/orders");
        return;
      }

      // Fetch store info
      const storeId = orderData.product?.store_id;
      if (storeId) {
        const { data: storeData } = await supabase
          .from("stores")
          .select("id, name, location, delivery_type, contact_email, contact_phone, owner_id, county, description")
          .eq("id", storeId)
          .single();
        setStoreInfo(storeData);
        if (storeData) {
          setDeliveryInfo(getDeliveryTypeInfo(storeData.delivery_type));
          
          // Fetch seller info (store owner)
          if (storeData.owner_id) {
            const { data: sellerData } = await supabase
              .from("users")
              .select("id, full_name, email, phone, avatar_url, created_at")
              .eq("id", storeData.owner_id)
              .single();
            setSellerInfo(sellerData);
          }
        }
      }

      // Fetch product image
      let imageUrl = "/placeholder.png";
      if (orderData.product?.image_gallery?.length > 0 && orderData.product.image_gallery[0]) {
        imageUrl = orderData.product.image_gallery[0];
      } else if (orderData.product?.image_url) {
        imageUrl = orderData.product.image_url;
      }

      // Fetch user rating for this product
      let userRating = null;
      if (orderData.product?.id) {
        const { data: ratingData } = await supabase
          .from("ratings")
          .select("rating")
          .eq("user_id", user.id)
          .eq("product_id", orderData.product.id)
          .maybeSingle();
        if (ratingData) userRating = ratingData.rating;
      }

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setWalletBalance(Number(walletData?.balance || 0));

      setOrder({
        ...orderData,
        product_image: imageUrl,
        user_rating: userRating,
        has_rated: !!userRating
      });
      setProductInfo(orderData.product);

    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  }, [user, orderId, navigate]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // OTP Functions
  const openOtpModal = () => {
    if (!order?.id) {
      toast.error("Order not found");
      return;
    }
    if (!order.delivery_otp) {
      toast.error("OTP not available yet. Please wait for seller to provide OTP.");
      return;
    }
    setOtpValue("");
    setOtpOpen(true);
  };

  const submitOtp = async () => {
    if (!order?.id || !otpValue || otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setSubmittingOtp(true);
    try {
      const { data, error } = await supabase.rpc("mark_order_delivered", { 
        p_order: order.id, 
        p_otp: otpValue 
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to confirm delivery');

      setOrder(prev => ({ 
        ...prev, 
        delivered: true, 
        status: data.needs_payment ? 'delivered' : 'completed' 
      }));

      if (data.needs_payment) {
        toast.success("Delivery confirmed! You can now pay the remaining balance.");
      } else {
        toast.success("Delivery confirmed! Order completed.");
      }
      
      setOtpOpen(false);
      setOtpValue("");
      await fetchOrderDetails();
      
    } catch (err) {
      toast.error(err.message || "Failed to confirm delivery");
    } finally {
      setSubmittingOtp(false);
    }
  };

  // Payment Functions
  const handleMpesaPayment = async (phoneNumber) => {
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
          const { data, error } = await supabase.rpc("pay_remaining_balance", { 
            p_order: order.id, 
            p_buyer: user.id 
          });
          
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Payment processing failed");
          
          await supabase
            .from("orders")
            .update({ mpesa_receipt: receipt, updated_at: new Date().toISOString() })
            .eq("id", order.id);
          
          setOrder(prev => ({ 
            ...prev, 
            balance_paid: true, 
            balance_due: 0, 
            status: prev.delivered ? 'completed' : 'balance_paid' 
          }));
          
          setMpesaPaymentStep(3);
          toast.dismiss(loadingToast);
          toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, { duration: 8000, icon: '✅' });
          
          await fetchOrderDetails();
          
          setTimeout(() => {
            setPaymentModalOpen(false);
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
      
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.message || "M-Pesa payment failed");
      setMpesaPaymentStep(1);
      setProcessingPayment(false);
    }
  };

  const processWalletPayment = async () => {
    setProcessingPayment(true);
    const loadingToast = toast.loading("Processing payment...");

    try {
      const { data, error } = await supabase.rpc("pay_remaining_balance", { 
        p_order: order.id, 
        p_buyer: user.id 
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Payment failed");

      setOrder(prev => ({ 
        ...prev, 
        balance_paid: true, 
        balance_due: 0, 
        status: prev.delivered ? 'completed' : 'balance_paid' 
      }));

      toast.dismiss(loadingToast);
      toast.success(`Payment successful! Amount: ${formatKSH(order.balance_due)}`, { duration: 5000 });

      await fetchOrderDetails();
      setPaymentModalOpen(false);

    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentMethod("");
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === 'wallet') {
      await processWalletPayment();
    } else if (paymentMethod === 'mpesa') {
      const phone = prompt("Enter your M-Pesa phone number (e.g., 0712345678):", user?.phone || "");
      if (!phone || !/^0[17]\d{8}$/.test(phone)) {
        toast.error("Please enter a valid M-Pesa phone number");
        setProcessingPayment(false);
        return;
      }
      await handleMpesaPayment(phone);
    }
  };

  const handleSubmitRating = async (rating) => {
    if (!user?.id || !order?.product?.id) {
      toast.error("Please login to rate");
      return;
    }

    setProcessingAction(true);
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

      setOrder(prev => ({ ...prev, has_rated: true, user_rating: rating }));

      toast.dismiss(loadingToast);
      toast.success("Thank you for rating!", { icon: '⭐' });

    } catch (err) {
      console.error("Rating error:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to submit rating");
    } finally {
      setProcessingAction(false);
    }
  };

  // Show skeleton while loading
  if (loading) {
    return <OrderDetailSkeleton />;
  }

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
  const sellerMarkedDelivered = order.status?.toLowerCase() === "delivered";
  const buyerConfirmed = !!order.delivered;
  const canConfirmDelivery = sellerMarkedDelivered && !buyerConfirmed;
  const canPayRemaining = buyerConfirmed && order.balance_due > 0 && !order.balance_paid;

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header - No Back Button */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Order Details</h1>
        <span className={`${styles.statusBadge} ${order.status?.toLowerCase()}`}>
          {order.status || 'Pending'}
        </span>
      </header>

      {/* Order Summary Card - Full Image */}
      <div className={styles.orderSummaryCard}>
        <div className={styles.summaryImageFull}>
          {order.product_image && order.product_image !== "/placeholder.png" ? (
            <img 
              src={order.product_image} 
              alt={order.product?.name}
              className={styles.fullImage}
              onError={(e) => { e.target.src = "/placeholder.png"; }} 
            />
          ) : (
            <div className={styles.imagePlaceholderFull}>
              <FaImage size={48} />
            </div>
          )}
        </div>
        <div className={styles.summaryInfo}>
          <h2 className={styles.summaryProductName}>{order.product?.name || "Product"}</h2>
          <div className={styles.summaryMeta}>
            <span className={styles.summaryStore}>
              <FaStore /> {storeInfo?.name || "Unknown Store"}
            </span>
            <span className={styles.summaryDate}>
              <FaCalendarAlt /> {formatDate(order.created_at)}
            </span>
          </div>
          <div className={styles.summaryPrice}>
            <span className={styles.priceTotal}>{formatKSH(order.total_price)}</span>
            {order.deposit_amount > 0 && (
              <span className={styles.priceDeposit}>Deposit: {formatKSH(order.deposit_amount)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
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
                    className={`${styles.progressCircle} ${isActive ? styles.active : ''} ${isCurrent ? styles.current : ''}`}
                    style={{ 
                      borderColor: isActive ? step.color : '#e0e0e0',
                      background: isActive ? step.color : 'transparent'
                    }}
                  >
                    {isActive ? step.icon : <span className={styles.stepNumber}>{index + 1}</span>}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`${styles.progressLine} ${index < currentStep ? styles.activeLine : ''}`} />
                  )}
                </div>
                <div className={styles.progressLabel}>
                  <span className={`${styles.progressText} ${isActive ? styles.activeText : ''}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.progressStatus}>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} style={{ background: order.delivered ? '#10B981' : STEPS[currentStep]?.color || '#F59E0B' }} />
            <span className={styles.statusText}>
              {order.delivered ? "✓ Order Completed" : `${STEPS[currentStep]?.label || 'Pending'} in Progress`}
            </span>
          </div>
          {!order.delivered && (
            <div className={styles.statusETA}>
              <FaClock size={14} />
              <span>Estimated: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailsCard}>
          <h4 className={styles.cardTitle}><FaInfoCircle /> Order Information</h4>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Order ID</span>
            <span className={styles.detailValue}>{order.id?.slice(0, 8)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Quantity</span>
            <span className={styles.detailValue}>{order.quantity || 1}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Delivery Type</span>
            <span className={styles.detailValue} style={{ color: deliveryInfo?.color }}>
              {deliveryInfo?.icon} {deliveryInfo?.label || 'Standard'}
            </span>
          </div>
          {order.delivery_otp && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Delivery OTP</span>
              <span className={styles.detailValueOtp}>{order.delivery_otp}</span>
            </div>
          )}
        </div>

        <div className={styles.detailsCard}>
          <h4 className={styles.cardTitle}><FaMapPin /> Delivery Location</h4>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Address</span>
            <span className={styles.detailValue}>{order.delivery_location || "N/A"}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>County</span>
            <span className={styles.detailValue}>{storeInfo?.county || "N/A"}</span>
          </div>
          {storeInfo?.location && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Store Location</span>
              <span className={styles.detailValue}>{storeInfo.location}</span>
            </div>
          )}
        </div>

        {/* Seller Information - Fetched from backend */}
        <div className={styles.detailsCard}>
          <h4 className={styles.cardTitle}><FaUser /> Seller Information</h4>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Store Name</span>
            <span className={styles.detailValue}>{storeInfo?.name || "N/A"}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Seller Name</span>
            <span className={styles.detailValue}>{sellerInfo?.full_name || "N/A"}</span>
          </div>
          {storeInfo?.contact_email && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}>{storeInfo.contact_email}</span>
            </div>
          )}
          {storeInfo?.contact_phone && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>{storeInfo.contact_phone}</span>
            </div>
          )}
          {sellerInfo?.created_at && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Member Since</span>
              <span className={styles.detailValue}>{new Date(sellerInfo.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown - Green Amounts */}
      <div className={styles.priceBreakdown}>
        <h4 className={styles.cardTitle}><FaReceipt /> Price Breakdown</h4>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Deposit Paid</span>
          <span className={styles.priceValueGreen}>{formatKSH(order.deposit_amount)}</span>
        </div>
        <div className={styles.priceDivider} />
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Balance Due</span>
          <span className={`${styles.priceValueGreen} ${order.balance_due > 0 ? styles.due : styles.paid}`}>
            {order.balance_due > 0 ? formatKSH(order.balance_due) : "Paid"}
          </span>
        </div>
        <div className={styles.priceDivider} />
        <div className={styles.priceRow}>
          <span className={styles.priceLabelTotal}>Total</span>
          <span className={styles.priceValueTotalGreen}>{formatKSH(order.total_price)}</span>
        </div>
        {order.mpesa_receipt && (
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>M-Pesa Receipt</span>
            <span className={styles.priceValueReceipt}>{order.mpesa_receipt}</span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {sellerMarkedDelivered && !buyerConfirmed && (
        <div className={styles.statusMessageInfo}>
          <FaTruck className={styles.messageIcon} />
          <span>Seller marked as delivered - Please confirm delivery with OTP</span>
        </div>
      )}
      {buyerConfirmed && order.balance_due > 0 && !order.balance_paid && (
        <div className={styles.statusMessageSuccess}>
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

      {/* Rating Section */}
      <div className={styles.ratingSection}>
        <h4 className={styles.cardTitle}><FaStar /> Rate this Product</h4>
        <div className={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`${styles.star} ${(order.user_rating || 0) >= star ? styles.active : ''}`}
              onClick={() => !order.has_rated && !processingAction && handleSubmitRating(star)}
              disabled={order.has_rated || processingAction}
            >
              <FaStar />
            </button>
          ))}
          {order.has_rated && <span className={styles.ratedBadge}>✓ Rated</span>}
          {!order.has_rated && order.status === 'completed' && (
            <span className={styles.rateHint}>Tap a star to rate</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {(canConfirmDelivery || canPayRemaining) && (
        <div className={styles.actionButtons}>
          {canConfirmDelivery && (
            <button className={styles.actionBtnConfirm} onClick={openOtpModal} disabled={processingAction}>
              <FaKey /> Confirm Delivery with OTP
            </button>
          )}
          {canPayRemaining && (
            <button className={styles.actionBtnPay} onClick={openPaymentModal} disabled={processingPayment || mpesaLoading}>
              <FaMoneyBillWave /> Pay Balance
            </button>
          )}
        </div>
      )}

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
                <input 
                  type="text" 
                  maxLength={6} 
                  value={otpValue} 
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))} 
                  placeholder="000000" 
                  className={styles.otpInput} 
                  autoFocus
                />
                <div className={styles.otpHint}>
                  <FaKey size={14} />
                  <span>Check your SMS for the delivery OTP</span>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setOtpOpen(false)}>Cancel</button>
                <button 
                  className={styles.modalBtnConfirm} 
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
        {paymentModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>Pay Balance</h3>
                <button className={styles.closeBtn} onClick={() => setPaymentModalOpen(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.paymentAmount}>
                  <span>Amount Due:</span>
                  <strong>{formatKSH(order.balance_due)}</strong>
                </div>
                <p className={styles.paymentSubtitle}>Select payment method</p>
                <div className={styles.paymentMethods}>
                  <button 
                    className={`${styles.paymentMethod} ${paymentMethod === 'wallet' ? styles.selected : ''}`} 
                    onClick={() => setPaymentMethod('wallet')} 
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaWallet className={styles.paymentMethodIcon} />
                    <div>
                      <span className={styles.paymentMethodName}>Wallet</span>
                      <span className={styles.paymentMethodBalance}>Balance: {formatKSH(walletBalance)}</span>
                    </div>
                    {paymentMethod === 'wallet' && <div className={styles.checkIndicator}>✓</div>}
                  </button>
                  <button 
                    className={`${styles.paymentMethod} ${paymentMethod === 'mpesa' ? styles.selected : ''}`} 
                    onClick={() => setPaymentMethod('mpesa')} 
                    disabled={processingPayment || mpesaLoading}
                  >
                    <FaMobile className={styles.paymentMethodIcon} />
                    <div>
                      <span className={styles.paymentMethodName}>M-Pesa</span>
                      <span className={styles.paymentMethodBalance}>Pay via M-PESA</span>
                    </div>
                    {paymentMethod === 'mpesa' && <div className={styles.checkIndicator}>✓</div>}
                  </button>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalBtnCancel} onClick={() => setPaymentModalOpen(false)} disabled={processingPayment}>Cancel</button>
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

export default OrderDetail;