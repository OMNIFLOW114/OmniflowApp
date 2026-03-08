import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
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
  FaInfoCircle
} from "react-icons/fa";
import { toast } from "react-toastify";
import "./BuyerOrders.css";

const BuyerOrders = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(() => {
    return sessionStorage.getItem('buyerOrdersTab') || "all";
  });
  const [orders, setOrders] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const [releasingOrderId, setReleasingOrderId] = useState(null);

  // Rating state
  const [hoveredRating, setHoveredRating] = useState({});

  // Refs
  const ordersListRef = useRef(null);

  // Admin constants
  const ADMIN_EMAIL = "omniflow718@gmail.com";
  const ADMIN_UUID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

  // --- helpers ---
  const isUuid = (v) =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const showError = (err, fallback = "Something went wrong") => {
    const msg = err?.message || err?.hint || err?.details || fallback;
    toast.error(msg);
    console.error("[Error]", err);
  };

  // ===== KENYAN CURRENCY FORMATTING =====
  const formatKSH = (amount) => {
    const num = Number(amount || 0);
    if (Number.isInteger(num) || num % 1 === 0) {
      return `KSH ${num.toLocaleString('en-KE')}`;
    }
    return `KSH ${num.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Get delivery type display info
  const getDeliveryTypeInfo = (type) => {
    if (type === 'self-delivery') {
      return {
        icon: <FaStore size={12} />,
        label: 'Self',
        color: '#f59e0b'
      };
    }
    return {
      icon: <FaMotorcycle size={12} />,
      label: 'Omniflow',
      color: '#3b82f6'
    };
  };

  // Save tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('buyerOrdersTab', tab);
  }, [tab]);

  // ===== REALTIME ORDER UPDATES =====
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to order changes
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
          
          // Update the order in local state
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === payload.new.id 
                ? { ...order, ...payload.new }
                : order
            )
          );

          // Show toast notification based on status change
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;

          if (oldStatus !== newStatus) {
            if (newStatus === 'shipped') {
              toast.info('Your order has been shipped! 🚚');
            } else if (newStatus === 'out for delivery') {
              toast.info('Your order is out for delivery! 📦');
            } else if (newStatus === 'delivered') {
              toast.success('Seller marked order as delivered! Please confirm delivery.', {
                icon: '✅'
              });
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
          // Fetch the full order with relations
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
  const fetchData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([fetchWallet(), fetchOrders(), fetchInstallments()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

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

    // Fetch existing ratings
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
  }, [user]);

  // ===== PROGRESS BAR =====
  const steps = [
    { key: "pending", label: "Pending", icon: <FaHourglassHalf /> },
    { key: "processing", label: "Processing", icon: <FaBox /> },
    { key: "shipped", label: "Shipped", icon: <FaShippingFast /> },
    { key: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck /> },
    { key: "delivered", label: "Delivered", icon: <FaCheckCircle /> }
  ];

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

  const renderHorizontalProgress = (status, delivered) => {
    const currentStep = delivered ? 4 : getStatusStep(status);
    
    return (
      <div className="order-progress-horizontal">
        {steps.map((step, index) => (
          <div key={step.key} className="progress-step-container">
            <div className={`progress-step ${index <= currentStep ? 'active' : ''}`}>
              <div className="step-icon">{step.icon}</div>
            </div>
            {index < steps.length - 1 && (
              <div className={`progress-line ${index < currentStep ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ===== SKELETON LOADER =====
  const OrderCardSkeleton = () => (
    <div className="order-card skeleton">
      <div className="order-row">
        <div className="skeleton-image"></div>
        <div className="order-details">
          <div className="order-header-row">
            <div className="skeleton-title"></div>
            <div className="skeleton-badge"></div>
          </div>
          <div className="skeleton-store"></div>
          <div className="skeleton-meta"></div>
          <div className="skeleton-progress"></div>
          <div className="skeleton-price"></div>
          <div className="skeleton-actions"></div>
        </div>
      </div>
    </div>
  );

  // ===== RATING FUNCTIONS =====
  async function handleSubmitRating(order, rating) {
    if (!user?.id) {
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
        }, {
          onConflict: 'user_id, product_id'
        });

      if (error) throw error;

      // Update local state
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
      setProcessingAction(false);
    }
  }

  const renderRatingStars = (order) => {
    const isRated = order.has_rated;
    const currentRating = order.user_rating || 0;
    const hoverRating = hoveredRating[order.id] || 0;

    return (
      <div className="rating-section">
        <span>{isRated ? 'Your rating:' : 'Rate this order:'}</span>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${
                (hoverRating >= star || (!hoverRating && currentRating >= star)) 
                  ? 'active' 
                  : ''
              }`}
              onMouseEnter={() => !isRated && !processingAction && setHoveredRating(prev => ({ ...prev, [order.id]: star }))}
              onMouseLeave={() => !isRated && !processingAction && setHoveredRating(prev => ({ ...prev, [order.id]: 0 }))}
              onClick={() => !isRated && !processingAction && handleSubmitRating(order, star)}
              style={{ 
                cursor: isRated || processingAction ? 'default' : 'pointer',
                opacity: processingAction ? 0.5 : 1 
              }}
            >
              <FaStar />
            </span>
          ))}
          {isRated && (
            <span className="rated-text">✓ Rated</span>
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
      const { error } = await supabase.rpc("mark_order_delivered", {
        p_order: otpOrderId,
        p_otp: otpValue,
      });
      if (error) throw error;

      // Update local state immediately
      setOrders(prev =>
        prev.map(order =>
          order.id === otpOrderId
            ? { ...order, delivered: true, status: 'delivered' }
            : order
        )
      );

      toast.success("Delivery confirmed! You can now pay the remaining balance.");
      setOtpOpen(false);
      setOtpOrderId(null);
      setOtpValue("");
    } catch (err) {
      showError(err, "Failed to confirm delivery");
    } finally {
      setSubmittingOtp(false);
    }
  }

  // ===== PAYMENT FUNCTIONS =====
  function openPaymentModal(order) {
    setSelectedOrder(order);
    setPaymentMethod("");
    setPaymentModalOpen(true);
  }

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

      // Update local state
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? { 
                ...o, 
                balance_paid: true, 
                balance_due: 0,
                status: o.delivered ? 'completed' : o.status,
                escrow_released: o.delivered ? true : o.escrow_released
              }
            : o
        )
      );

      toast.dismiss(loadingToast);
      
      // Show success with commission breakdown
      toast.success(
        <div>
          <strong>Payment successful!</strong>
          <br />
          <small style={{ fontSize: '0.8rem' }}>
            Platform fee: {(data.commission_rate * 100).toFixed(1)}% 
            (KSH {Number(data.commission_amount).toLocaleString()})
          </small>
          <br />
          <small style={{ fontSize: '0.7rem', color: '#666' }}>
            Ref: ORD-{order.id.slice(0, 8)}
          </small>
        </div>,
        { duration: 5000 }
      );

      // Refresh wallet balance
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

  async function processMpesaPayment(order) {
    setProcessingPayment(true);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");
    
    try {
      const { data, error } = await supabase.functions.invoke("initiate-mpesa", {
        body: {
          orderId: order.id,
          amount: order.balance_due,
          phone: user?.phone,
          buyerId: user.id
        }
      });
      
      if (error) throw error;
      
      toast.dismiss(loadingToast);
      toast.success("M-Pesa STK push sent. Check your phone to complete payment.");
      
      // Close modal after sending STK push
      setPaymentModalOpen(false);
      setSelectedOrder(null);
      
    } catch (err) {
      console.error("M-Pesa error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "M-Pesa payment failed");
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

  async function processPayment() {
    if (!selectedOrder || !paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === 'wallet') {
      await processWalletPayment(selectedOrder);
    } else if (paymentMethod === 'mpesa') {
      await processMpesaPayment(selectedOrder);
    } else if (paymentMethod === 'paypal') {
      await processPaypalPayment(selectedOrder);
    }
  }

  // ===== ESCROW RELEASE =====
  async function releaseEscrow(order) {
    if (!order?.id || releasingOrderId) return;
    
    setReleasingOrderId(order.id);
    const loadingToast = toast.loading("Completing order...");
    
    try {
      const { error } = await supabase.rpc("release_escrow_to_seller", {
        p_order: order.id,
      });
      
      if (error) throw error;
      
      // Update local state
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? { ...o, escrow_released: true, status: 'completed' }
            : o
        )
      );
      
      toast.dismiss(loadingToast);
      toast.success("Order completed! Payment released to seller.");
      
    } catch (err) {
      console.error("Escrow release error:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to release payment");
    } finally {
      setReleasingOrderId(null);
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
      <div className="orders-container">
        <div className="orders-header">
          <h1 className="orders-title">My Orders</h1>
          <div className="wallet-badge skeleton-badge"></div>
        </div>
        <div className="tabs-container">
          <div className="tabs-scroll">
            <div className="skeleton-tab"></div>
            <div className="skeleton-tab"></div>
            <div className="skeleton-tab"></div>
          </div>
        </div>
        <div className="orders-list">
          {[1, 2, 3].map((i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      {/* Header */}
      <div className="orders-header">
        <h1 className="orders-title">My Orders</h1>
        <div className="wallet-badge">
          <FaWallet size={14} />
          <span>{formatKSH(walletBalance)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-scroll">
          <button
            className={`tab-btn ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            Active ({activeOrders.length})
          </button>
          <button
            className={`tab-btn ${tab === "installments" ? "active" : ""}`}
            onClick={() => setTab("installments")}
          >
            Installments ({installments.length})
          </button>
          <button
            className={`tab-btn ${tab === "completed" ? "active" : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed ({completedOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-list" ref={ordersListRef}>
        {/* Active Orders */}
        {tab === "all" && (
          <>
            {activeOrders.length === 0 ? (
              <div className="empty-state">
                <FaBox size={48} />
                <p>No active orders</p>
                <button className="shop-btn" onClick={() => window.location.href = '/'}>
                  Start Shopping
                </button>
              </div>
            ) : (
              activeOrders.map((order) => {
                const sellerMarkedDelivered = order.status?.toLowerCase() === "delivered";
                const buyerConfirmed = !!order.delivered;
                
                // Show confirm delivery button only when seller marked delivered AND buyer hasn't confirmed
                const canConfirmDelivery = sellerMarkedDelivered && !buyerConfirmed;
                
                // Show pay balance only when buyer has confirmed delivery AND balance is not paid
                const canPayRemaining = buyerConfirmed && order.balance_due > 0 && !order.balance_paid;
                
                // Show complete button when delivered, paid, but escrow not released
                const canComplete = order.delivered && order.balance_paid && !order.escrow_released;

                // Get current status for progress bar
                const currentStatus = order.status;

                return (
                  <div className="order-card" key={order.id}>
                    <div className="order-row">
                      <img
                        src={order.product?.image_gallery?.[0] || "/placeholder.png"}
                        alt={order.product?.name}
                        className="order-image"
                      />
                      <div className="order-details">
                        <div className="order-header-row">
                          <h3 className="product-name">{order.product?.name}</h3>
                          <div 
                            className="delivery-badge"
                            style={{ 
                              backgroundColor: `${order.delivery_info.color}15`, 
                              color: order.delivery_info.color 
                            }}
                          >
                            {order.delivery_info.icon}
                            <span>{order.delivery_info.label}</span>
                          </div>
                        </div>
                        
                        <p className="store-name">
                          <FaStore size={10} />
                          {order.store?.name || "Unknown Store"}
                        </p>
                        
                        <div className="order-meta">
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

                        {/* Status Message */}
                        {sellerMarkedDelivered && !buyerConfirmed && (
                          <div className="status-message info">
                            <FaTruck /> Seller marked as delivered - Please confirm delivery with OTP
                          </div>
                        )}

                        {buyerConfirmed && order.balance_due > 0 && !order.balance_paid && (
                          <div className="status-message success">
                            <FaCheckCircle /> Delivery confirmed! Pay remaining balance to complete order
                          </div>
                        )}

                        <div className="price-row">
                          <div className="price-item">
                            <span className="price-label">Deposit</span>
                            <span className="price-value paid">{formatKSH(order.deposit_amount)}</span>
                          </div>
                          <FaChevronRight size={12} className="price-sep" />
                          <div className="price-item">
                            <span className="price-label">Balance</span>
                            <span className="price-value due">{formatKSH(order.balance_due)}</span>
                          </div>
                          <FaChevronRight size={12} className="price-sep" />
                          <div className="price-item">
                            <span className="price-label">Total</span>
                            <span className="price-value total">{formatKSH(order.total_price)}</span>
                          </div>
                        </div>

                        <div className="action-buttons">
                          {canConfirmDelivery && (
                            <button
                              className="action-btn confirm"
                              onClick={() => openOtpModal(order)}
                              disabled={processingAction}
                            >
                              <FaKey /> Confirm Delivery
                            </button>
                          )}

                          {canPayRemaining && (
                            <button
                              className="action-btn pay"
                              onClick={() => openPaymentModal(order)}
                              disabled={processingPayment}
                            >
                              <FaWallet /> Pay Balance
                            </button>
                          )}

                          {canComplete && (
                            <button
                              className="action-btn complete"
                              onClick={() => releaseEscrow(order)}
                              disabled={releasingOrderId === order.id}
                            >
                              {releasingOrderId === order.id ? "Completing..." : "Complete Order"}
                            </button>
                          )}

                          {order.escrow_released && (
                            <div className="status-badge completed">
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
              <div className="empty-state">
                <FaBox size={48} />
                <p>No installment plans</p>
              </div>
            ) : (
              installments.map((order) => {
                const paidPercent = Math.floor(
                  (Number(order.amount_paid || 0) / Number(order.total_price || 1)) * 100
                );

                return (
                  <div className="order-card" key={order.id}>
                    <div className="order-row">
                      <img
                        src={order.products?.image_gallery?.[0] || "/placeholder.png"}
                        alt={order.products?.name}
                        className="order-image"
                      />
                      <div className="order-details">
                        <h3 className="product-name">{order.products?.name}</h3>
                        
                        <div className="installment-progress">
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${paidPercent}%` }} />
                          </div>
                          <span className="progress-text">{paidPercent}% paid</span>
                        </div>

                        <div className="installment-stats">
                          <div className="stat">
                            <span>Total</span>
                            <strong>{formatKSH(order.total_price)}</strong>
                          </div>
                          <div className="stat">
                            <span>Paid</span>
                            <strong>{formatKSH(order.amount_paid)}</strong>
                          </div>
                          <div className="stat">
                            <span>Next</span>
                            <strong>{order.next_due_date?.slice(0, 10) || "—"}</strong>
                          </div>
                        </div>

                        <button 
                          className="installment-link" 
                          onClick={() => window.location.href = '/my-installments'}
                        >
                          Manage Plan
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
              <div className="empty-state">
                <FaCheckCircle size={48} />
                <p>No completed orders</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-row">
                    <img
                      src={order.product?.image_gallery?.[0] || "/placeholder.png"}
                      alt={order.product?.name}
                      className="order-image"
                    />
                    <div className="order-details">
                      <div className="order-header-row">
                        <h3 className="product-name">{order.product?.name}</h3>
                        <div className="completed-badge">
                          <FaCheckCircle size={12} />
                          <span>Completed</span>
                        </div>
                      </div>

                      <p className="store-name">
                        <FaStore size={10} />
                        {order.store?.name || "Unknown Store"}
                      </p>

                      <div className="order-meta">
                        <span>
                          <FaClock size={10} />
                          {new Date(order.updated_at || order.created_at).toLocaleDateString('en-KE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="price-row">
                        <div className="price-item">
                          <span className="price-label">Total Paid</span>
                          <span className="price-value total">{formatKSH(order.total_price)}</span>
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
      {otpOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Delivery</h3>
              <button className="close-btn" onClick={() => setOtpOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p>Enter the 6-digit OTP to confirm delivery</p>
              <input
                type="text"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                placeholder="000000"
                className="otp-input"
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setOtpOpen(false)}>
                Cancel
              </button>
              <button
                className="modal-btn confirm"
                onClick={submitOtp}
                disabled={submittingOtp || otpValue.length !== 6}
              >
                {submittingOtp ? "Confirming..." : "Confirm Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Pay Balance</h3>
              <button className="close-btn" onClick={() => setPaymentModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-amount">
                <span>Amount Due:</span>
                <strong>{formatKSH(selectedOrder.balance_due)}</strong>
              </div>

              <div className="payment-methods">
                <button
                  className={`payment-method ${paymentMethod === 'wallet' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('wallet')}
                  disabled={processingPayment}
                >
                  <FaWallet size={20} />
                  <div className="method-info">
                    <span className="method-name">Omniflow Wallet</span>
                    <span className="method-balance">Balance: {formatKSH(walletBalance)}</span>
                  </div>
                  {paymentMethod === 'wallet' && <div className="check-indicator">✓</div>}
                </button>

                <button
                  className={`payment-method ${paymentMethod === 'mpesa' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('mpesa')}
                  disabled={processingPayment}
                >
                  <FaMobile size={20} />
                  <div className="method-info">
                    <span className="method-name">M-Pesa</span>
                    <span className="method-balance">Pay via M-PESA</span>
                  </div>
                  {paymentMethod === 'mpesa' && <div className="check-indicator">✓</div>}
                </button>

                <button
                  className={`payment-method ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                  disabled={processingPayment}
                >
                  <FaPaypal size={20} />
                  <div className="method-info">
                    <span className="method-name">PayPal</span>
                    <span className="method-balance">International payments</span>
                  </div>
                  {paymentMethod === 'paypal' && <div className="check-indicator">✓</div>}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn cancel" 
                onClick={() => setPaymentModalOpen(false)}
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                className="modal-btn confirm"
                onClick={processPayment}
                disabled={processingPayment || !paymentMethod}
              >
                {processingPayment ? "Processing..." : "Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;