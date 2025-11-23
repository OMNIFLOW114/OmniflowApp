// src/pages/MyInstallments.jsx - COMPLETE FLEXIBLE PAYMENT SYSTEM
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-toastify";
import { useDarkMode } from "@/context/DarkModeContext";
import "./MyInstallments.css";

const POLL_INTERVAL_MS = 30_000;

export default function MyInstallments({ user }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);
  const [totalInvested, setTotalInvested] = useState(0);
  const [financialHealth, setFinancialHealth] = useState({ score: 0, status: 'Good' });
  const [stores, setStores] = useState({});

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [nextPayment, setNextPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomPayment, setShowCustomPayment] = useState(false);

  const { darkMode } = useDarkMode();
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    startUp();

    pollRef.current = setInterval(() => {
      fetchOrders();
      fetchWallet();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user?.id]);

  async function startUp() {
    await Promise.all([fetchOrders(), fetchWallet(), fetchFinancialHealth()]);
    setTimeout(() => checkRemindersAndNotify(), 300);
  }

  async function fetchOrders() {
    setIsLoading(true);
    
    try {
      // First, get all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("installment_orders")
        .select(`
          *,
          products:product_id (id, name, image_gallery, description, category, price),
          seller:seller_id (id, full_name, email, phone, avatar_url)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Get unique seller IDs from orders
      const sellerIds = [...new Set(ordersData?.map(order => order.seller_id).filter(Boolean) || [])];
      
      let storesData = {};
      
      if (sellerIds.length > 0) {
        // Fetch stores for these sellers
        const { data: storesResponse, error: storesError } = await supabase
          .from("stores")
          .select("id, owner_id, name, description, verified, seller_score")
          .in("owner_id", sellerIds);

        if (!storesError && storesResponse) {
          // Create a mapping of owner_id -> store
          storesData = storesResponse.reduce((acc, store) => {
            acc[store.owner_id] = store;
            return acc;
          }, {});
        }
      }

      setStores(storesData);
      
      // Combine orders with store data
      const ordersWithStores = ordersData?.map(order => ({
        ...order,
        store: storesData[order.seller_id] || null
      })) || [];

      setOrders(ordersWithStores);
      calculateTotalInvested(ordersWithStores);

    } catch (error) {
      console.error("fetchOrders error:", error);
      toast.error("Failed to load installment plans");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchFinancialHealth() {
    try {
      const { data, error } = await supabase
        .rpc('get_buyer_financial_health', { p_buyer_id: user.id });

      if (!error && data) {
        setFinancialHealth(data);
      } else {
        const healthScore = calculateFallbackHealthScore();
        setFinancialHealth({ score: healthScore, status: getHealthStatus(healthScore) });
      }
    } catch (error) {
      console.error("Financial health error:", error);
      const healthScore = calculateFallbackHealthScore();
      setFinancialHealth({ score: healthScore, status: getHealthStatus(healthScore) });
    }
  }

  function calculateFallbackHealthScore() {
    let score = 100;
    const now = new Date();
    
    orders.forEach(order => {
      if (order.status !== 'completed') {
        const dueDate = new Date(order.next_due_date);
        const daysLate = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysLate > 0) {
          score -= Math.min(20, daysLate * 2);
        }
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  function getHealthStatus(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  }

  function calculateTotalInvested(orders) {
    const invested = orders.reduce((total, order) => {
      return total + Number(order.amount_paid || 0);
    }, 0);
    setTotalInvested(invested);
  }

  async function fetchWallet() {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setWalletBalance(Number(data.balance));
      } else {
        setWalletBalance(0);
      }
    } catch (error) {
      console.error("Wallet fetch error:", error);
      setWalletBalance(0);
    }
  }

  function daysBetween(dateStr) {
    if (!dateStr) return null;
    const diff =
      (new Date(dateStr).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
  }

  function formatCurrency(n) {
    if (n == null) return "—";
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    switch (activeTab) {
      case 'active':
        return order.status === 'active';
      case 'completed':
        return order.status === 'completed';
      case 'overdue':
        const days = daysBetween(order.next_due_date);
        return order.status !== 'completed' && days != null && days < 0;
      case 'dueSoon':
        const dueDays = daysBetween(order.next_due_date);
        return order.status !== 'completed' && dueDays != null && dueDays <= 3 && dueDays >= 0;
      default:
        return true;
    }
  });

  // Enhanced reminders with smarter notifications
  async function checkRemindersAndNotify() {
    if (!orders?.length) return;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const order of orders) {
      if (order.status === "completed") continue;
      
      const dueDate = new Date(order.next_due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const remaining = Number(order.total_price || 0) - Number(order.amount_paid || 0);

      if (daysUntilDue < 0) {
        const lastNotified = localStorage.getItem(`overdue_notified_${order.id}`);
        const lastNotifiedDate = lastNotified ? new Date(lastNotified) : null;
        
        if (!lastNotifiedDate || lastNotifiedDate.toDateString() !== today.toDateString()) {
          toast.warn(
            `Order ${order.id.slice(0, 8)} is overdue by ${Math.abs(daysUntilDue)} day(s).`,
            { toastId: `overdue-${order.id}`, autoClose: 10000 }
          );
          localStorage.setItem(`overdue_notified_${order.id}`, today.toISOString());
        }
      } else if (daysUntilDue === 0) {
        toast.info(
          `Payment for Order ${order.id.slice(0, 8)} is due today. Amount: OMC ${formatCurrency(
            order.installment_amount
          )}.`,
          { toastId: `due-today-${order.id}`, autoClose: 8000 }
        );
      } else if (daysUntilDue <= 3) {
        const lastNotified = localStorage.getItem(`due_soon_notified_${order.id}`);
        
        if (!lastNotified) {
          toast.info(
            `Order ${order.id.slice(0, 8)} due in ${daysUntilDue} day(s). Amount: OMC ${formatCurrency(
              order.installment_amount
            )}.`,
            { toastId: `due-soon-${order.id}` }
          );
          localStorage.setItem(`due_soon_notified_${order.id}`, 'true');
        }
      }
    }
  }

  async function openOrderDetails(order) {
    setSelectedOrder(order);
    setPaymentHistory([]);
    setNextPayment(null);
    setCustomAmount("");
    setShowCustomPayment(false);

    try {
      const { data, error } = await supabase
        .from("installment_payments")
        .select("*")
        .eq("order_id", order.id)
        .eq("buyer_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;

      setPaymentHistory(data || []);
      const next = (data || []).find((p) => p.status === "pending");
      setNextPayment(next ?? null);

      fetchWallet();
    } catch (error) {
      console.error("fetch payments error", error);
      toast.error("Failed to load schedule");
    }
  }

  async function processPayment(orderId, paymentData) {
    setLoadingOrderId(orderId);
    const toastId = toast.loading("Processing payment…");

    try {
      const { data, error } = await supabase.rpc(
        "record_installment_payment",
        paymentData
      );

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || "Payment failed");
      }

      toast.dismiss(toastId);
      toast.success("Payment processed successfully");

      await Promise.all([fetchOrders(), fetchWallet(), fetchFinancialHealth()]);
      
      if (selectedOrder && selectedOrder.id === orderId) {
        await openOrderDetails(selectedOrder);
      }

      return data;
    } catch (err) {
      console.error("Payment error:", err);
      toast.dismiss(toastId);
      
      const errorMessage = err.message || "Payment failed. Please try again.";
      
      if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
        toast.error("Insufficient wallet balance. Please top up your wallet.");
      } else if (errorMessage.includes('ORDER_COMPLETED')) {
        toast.error("This order is already completed.");
      } else if (errorMessage.includes('NO_PENDING_PAYMENTS')) {
        toast.error("No pending payments found for this order.");
      } else if (errorMessage.includes('INVALID_AMOUNT')) {
        toast.error("Invalid payment amount. Please check the amount.");
      } else {
        toast.error(errorMessage);
      }
      
      throw err;
    } finally {
      setLoadingOrderId(null);
    }
  }

  async function payInstallment(order, amount = null) {
    const paymentAmount = amount || order.installment_amount;
    
    const paymentData = {
      p_buyer: user.id,
      p_order_id: order.id,
      p_payment_method: paymentMethod,
      p_amount: paymentAmount
    };

    return await processPayment(order.id, paymentData);
  }

  async function payCustomAmount(order) {
    if (!customAmount || customAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const remainingBalance = order.total_price - order.amount_paid;
    if (customAmount > remainingBalance) {
      toast.error(`Payment amount cannot exceed remaining balance of OMC ${formatCurrency(remainingBalance)}`);
      return;
    }

    await payInstallment(order, customAmount);
    setCustomAmount("");
    setShowCustomPayment(false);
  }

  async function payFullAmount(order) {
    const remainingBalance = order.total_price - order.amount_paid;
    await payInstallment(order, remainingBalance);
  }

  async function reschedulePayment(orderId, newDueDate) {
    const paymentData = {
      p_buyer: user.id,
      p_order_id: orderId,
      p_payment_method: 'system',
      p_is_reschedule: true,
      p_new_due_date: newDueDate
    };

    const result = await processPayment(orderId, paymentData);
    
    if (result && result.success) {
      toast.success(`Payment rescheduled to ${new Date(newDueDate).toLocaleDateString()}`);
    }
    
    return result;
  }

  const handleQuickPay = async (order) => {
    if (walletBalance >= order.installment_amount) {
      await payInstallment(order);
    } else {
      openOrderDetails(order);
    }
  };

  // Get seller display name - use store name if available, otherwise user's full name
  const getSellerDisplayName = (order) => {
    if (order.store && order.store.name) {
      return order.store.name;
    }
    return order.seller?.full_name || 'Seller';
  };

  // Redirect to OmniCash wallet
  const redirectToOmniCash = () => {
    window.location.href = '/omnicash-wallet';
  };

  return (
    <div className={`installment-dashboard ${darkMode ? "dark-mode" : ""}`}>
      {/* Optimized Header for Mobile */}
      <header className="installment-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="title">Lipa Mdogo Mdogo</h1>
            <p className="subtitle">
              Flexible installment payments - Pay any amount, anytime
            </p>
          </div>
          
          {/* Compact Stats Grid */}
          <div className="compact-stats-grid">
            <div className="stat-item compact">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">Wallet</div>
                <div className="stat-value">OMC {walletBalance != null ? formatCurrency(walletBalance) : "0.00"}</div>
              </div>
            </div>
            
            <div className="stat-item compact">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-label">Invested</div>
                <div className="stat-value">OMC {formatCurrency(totalInvested)}</div>
              </div>
            </div>
            
            <div className="stat-item compact financial-health">
              <div className="stat-icon">❤️</div>
              <div className="stat-content">
                <div className="stat-label">Health</div>
                <div className="stat-value">{financialHealth.status}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <button className="quick-action" onClick={redirectToOmniCash}>
          <span className="action-icon">💳</span>
          <span>Top Up</span>
        </button>
        <button className="quick-action" onClick={() => window.location.href = '/products?installment=true'}>
          <span className="action-icon">🛒</span>
          <span>Browse</span>
        </button>
        <button className="quick-action" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
          <span className="action-icon">{viewMode === 'grid' ? '☰' : '⏹️'}</span>
          <span>{viewMode === 'grid' ? 'List' : 'Grid'}</span>
        </button>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All ({orders.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({orders.filter(o => o.status === 'active').length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'dueSoon' ? 'active' : ''}`}
          onClick={() => setActiveTab('dueSoon')}
        >
          Due Soon ({orders.filter(o => {
            const days = daysBetween(o.next_due_date);
            return o.status !== 'completed' && days != null && days <= 3 && days >= 0;
          }).length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue ({orders.filter(o => {
            const days = daysBetween(o.next_due_date);
            return o.status !== 'completed' && days != null && days < 0;
          }).length})
        </button>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your installment plans...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No {activeTab !== 'all' ? activeTab : ''} installment plans</h3>
            <p>
              {activeTab === 'all' 
                ? "Get started with flexible payment plans"
                : `No ${activeTab} installment plans at the moment`
              }
            </p>
            <button className="btn primary" onClick={() => window.location.href = '/products?installment=true'}>
              Browse Products
            </button>
          </div>
        ) : (
          <section className={`cards-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
            {filteredOrders.map((order) => (
              <InstallmentCard
                key={order.id}
                order={order}
                walletBalance={walletBalance}
                formatCurrency={formatCurrency}
                daysBetween={daysBetween}
                loadingOrderId={loadingOrderId}
                openOrderDetails={openOrderDetails}
                handleQuickPay={handleQuickPay}
                reschedulePayment={reschedulePayment}
                viewMode={viewMode}
                getSellerDisplayName={getSellerDisplayName}
              />
            ))}
          </section>
        )}
      </main>

      {/* Order Details Panel */}
      {selectedOrder && (
        <OrderDetailsPanel
          selectedOrder={selectedOrder}
          setSelectedOrder={setSelectedOrder}
          walletBalance={walletBalance}
          formatCurrency={formatCurrency}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          payInstallment={payInstallment}
          payCustomAmount={payCustomAmount}
          payFullAmount={payFullAmount}
          loadingOrderId={loadingOrderId}
          paymentHistory={paymentHistory}
          nextPayment={nextPayment}
          reschedulePayment={reschedulePayment}
          customAmount={customAmount}
          setCustomAmount={setCustomAmount}
          showCustomPayment={showCustomPayment}
          setShowCustomPayment={setShowCustomPayment}
          getSellerDisplayName={getSellerDisplayName}
        />
      )}
    </div>
  );
}

// InstallmentCard Component
function InstallmentCard({
  order,
  walletBalance,
  formatCurrency,
  daysBetween,
  loadingOrderId,
  openOrderDetails,
  handleQuickPay,
  reschedulePayment,
  viewMode,
  getSellerDisplayName
}) {
  const days = daysBetween(order.next_due_date);
  const paid = Number(order.amount_paid || 0);
  const total = Number(order.total_price || 0);
  const retailPrice = Number(order.products?.price || total);
  const savings = retailPrice - total;
  const paidPercent = Math.floor((paid / Math.max(total, 1)) * 100);
  const remain = Math.max(total - paid, 0);
  const installmentsLeft = Math.ceil(remain / order.installment_amount);
  const dueSoon = order.status !== "completed" && days != null && days <= 3 && days >= 0;
  const overdue = order.status !== "completed" && days != null && days < 0;

  const getStatusVariant = () => {
    if (order.status === 'completed') return 'completed';
    if (overdue) return 'overdue';
    if (dueSoon) return 'due-soon';
    return 'active';
  };

  return (
    <article
      className={`installment-card card-${getStatusVariant()} ${viewMode}`}
      aria-labelledby={`order-title-${order.id}`}
    >
      <div className="card-header">
        <div className="product-image">
          <img
            src={order.products?.image_gallery?.[0] || "/placeholder.png"}
            alt={order.products?.name || "Product"}
            loading="lazy"
          />
          {savings > 0 && (
            <div className="savings-badge">Save OMC {formatCurrency(savings)}</div>
          )}
        </div>
        <div className="card-info">
          <h3 id={`order-title-${order.id}`} className="product-title">
            {order.products?.name || "Product"}
          </h3>
          <div className="product-meta">
            <span className="seller">By {getSellerDisplayName(order)}</span>
            <span className="category">{order.products?.category || "General"}</span>
            <span className={`status status-${getStatusVariant()}`}>
              {order.status === 'completed' ? 'Completed' : 
               overdue ? `Overdue by ${Math.abs(days)} days` :
               dueSoon ? `Due in ${days} days` : 'Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="card-body">
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-text">{Math.min(paidPercent, 100)}% paid</span>
            <span className="progress-amount">OMC {formatCurrency(paid)} / OMC {formatCurrency(total)}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(paidPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="payment-details">
          <div className="detail-row">
            <div className="detail-item">
              <span className="detail-label">Next Payment</span>
              <span className="detail-value">OMC {formatCurrency(order.installment_amount)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Due Date</span>
              <span className={`detail-value ${overdue ? 'overdue' : dueSoon ? 'due-soon' : ''}`}>
                {order.next_due_date ? new Date(order.next_due_date).toLocaleDateString() : "—"}
                {dueSoon && <span className="due-badge">Soon</span>}
                {overdue && <span className="overdue-badge">Overdue</span>}
              </span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-item">
              <span className="detail-label">Remaining Balance</span>
              <span className="detail-value">OMC {formatCurrency(remain)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Installments Left</span>
              <span className="detail-value">{installmentsLeft}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn btn-primary"
          onClick={() => handleQuickPay(order)}
          disabled={loadingOrderId === order.id || order.status === "completed"}
        >
          {loadingOrderId === order.id ? (
            <>
              <div className="btn-spinner"></div>
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </button>
        
        <button className="btn btn-secondary" onClick={() => openOrderDetails(order)}>
          Manage
        </button>

        {!overdue && order.status !== 'completed' && order.reschedule_count < 2 && (
          <button 
            className="btn btn-ghost" 
            onClick={() => {
              const newDate = new Date();
              newDate.setDate(newDate.getDate() + 7);
              reschedulePayment(order.id, newDate.toISOString().split('T')[0]);
            }}
          >
            Reschedule
          </button>
        )}
      </div>
    </article>
  );
}

// OrderDetailsPanel Component
function OrderDetailsPanel({
  selectedOrder,
  setSelectedOrder,
  walletBalance,
  formatCurrency,
  paymentMethod,
  setPaymentMethod,
  payInstallment,
  payCustomAmount,
  payFullAmount,
  loadingOrderId,
  paymentHistory,
  nextPayment,
  reschedulePayment,
  customAmount,
  setCustomAmount,
  showCustomPayment,
  setShowCustomPayment,
  getSellerDisplayName
}) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  
  const paid = Number(selectedOrder.amount_paid || 0);
  const total = Number(selectedOrder.total_price || 0);
  const paidPercent = Math.floor((paid / Math.max(total, 1)) * 100);
  const remaining = total - paid;
  const installmentAmount = nextPayment?.amount || selectedOrder.installment_amount;

  const handleReschedule = async () => {
    if (newDueDate) {
      await reschedulePayment(selectedOrder.id, newDueDate);
      setShowReschedule(false);
    }
  };

  const handlePayment = async () => {
    await payInstallment(selectedOrder);
  };

  const canPayWithWallet = paymentMethod !== 'wallet' || walletBalance >= installmentAmount;

  return (
    <div className="order-details-panel">
      <div className="panel-header">
        <h2>Installment Details</h2>
        <button className="panel-close" onClick={() => setSelectedOrder(null)}>
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Product Summary */}
        <div className="product-summary">
          <img
            src={selectedOrder.products?.image_gallery?.[0] || "/placeholder.png"}
            alt={selectedOrder.products?.name}
            className="product-image"
          />
          <div className="product-info">
            <h3>{selectedOrder.products?.name}</h3>
            <p className="seller-info">
              Sold by {getSellerDisplayName(selectedOrder)}
              {selectedOrder.store?.verified && (
                <span className="verified-badge"> ✓ Verified</span>
              )}
            </p>
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min(paidPercent, 100)}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {Math.min(paidPercent, 100)}% paid • OMC {formatCurrency(paid)} of OMC {formatCurrency(total)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Actions */}
        <div className="payment-actions">
          <div className="payment-amount-card">
            <div className="amount-display">
              <span className="amount-label">Amount Due</span>
              <span className="amount-value">
                OMC {formatCurrency(installmentAmount)}
              </span>
            </div>
            
            <div className="wallet-info">
              <span>Available Balance: OMC {formatCurrency(walletBalance)}</span>
              {paymentMethod === 'wallet' && !canPayWithWallet && (
                <span className="insufficient">Insufficient funds</span>
              )}
            </div>

            {/* Flexible Payment Options */}
            <div className="flexible-payments">
              <h4>Payment Options</h4>
              
              {/* Standard Payment */}
              <div className="payment-option">
                <div className="option-info">
                  <span className="option-title">Pay Standard Amount</span>
                  <span className="option-amount">OMC {formatCurrency(installmentAmount)}</span>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  onClick={handlePayment}
                  disabled={!nextPayment || loadingOrderId === selectedOrder.id || !canPayWithWallet}
                >
                  Pay Now
                </button>
              </div>

              {/* Custom Payment */}
              <div className="payment-option">
                <div className="option-info">
                  <span className="option-title">Pay Custom Amount</span>
                  <span className="option-description">Pay any amount you want</span>
                </div>
                {!showCustomPayment ? (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowCustomPayment(true)}
                    disabled={loadingOrderId === selectedOrder.id}
                  >
                    Custom Pay
                  </button>
                ) : (
                  <div className="custom-payment-input">
                    <div className="input-group">
                      <span className="currency-symbol">OMC</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="0.01"
                        max={remaining}
                        step="0.01"
                      />
                    </div>
                    <div className="custom-payment-actions">
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => payCustomAmount(selectedOrder)}
                        disabled={!customAmount || customAmount <= 0 || loadingOrderId === selectedOrder.id}
                      >
                        Pay OMC {formatCurrency(customAmount)}
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => setShowCustomPayment(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Payment */}
              {remaining > installmentAmount && (
                <div className="payment-option">
                  <div className="option-info">
                    <span className="option-title">Pay Full Balance</span>
                    <span className="option-amount">OMC {formatCurrency(remaining)}</span>
                  </div>
                  <button
                    className="btn btn-success btn-small"
                    onClick={() => payFullAmount(selectedOrder)}
                    disabled={loadingOrderId === selectedOrder.id || (paymentMethod === 'wallet' && walletBalance < remaining)}
                  >
                    Pay All
                  </button>
                </div>
              )}
            </div>

            <div className="payment-methods">
              <h4>Payment Method</h4>
              <div className="method-options">
                <label className={`method-option ${paymentMethod === 'wallet' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                  />
                  <span className="method-icon">💳</span>
                  <span className="method-name">Wallet Balance</span>
                </label>

                <label className={`method-option ${paymentMethod === 'mpesa' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mpesa"
                    checked={paymentMethod === 'mpesa'}
                    onChange={() => setPaymentMethod('mpesa')}
                  />
                  <span className="method-icon">📱</span>
                  <span className="method-name">M-Pesa</span>
                </label>

                <label className={`method-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <span className="method-icon">💳</span>
                  <span className="method-name">Credit/Debit Card</span>
                </label>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            {!showReschedule ? (
              <button
                className="btn btn-secondary"
                onClick={() => setShowReschedule(true)}
                disabled={selectedOrder.status === 'completed' || selectedOrder.reschedule_count >= 2}
              >
                {selectedOrder.reschedule_count > 0 ? `Reschedule (${2 - selectedOrder.reschedule_count} left)` : 'Reschedule Payment'}
              </button>
            ) : (
              <div className="reschedule-form">
                <label>New Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                <div className="reschedule-actions">
                  <button className="btn btn-primary" onClick={handleReschedule}>
                    Confirm Reschedule
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowReschedule(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="schedule-section">
          <div className="section-header">
            <h4>Payment Schedule</h4>
            <span className="remaining-balance">
              Remaining: OMC {formatCurrency(remaining)}
            </span>
          </div>
          <div className="schedule-list">
            {paymentHistory.length === 0 ? (
              <div className="no-schedule">No payment schedule available</div>
            ) : (
              paymentHistory.map((payment) => (
                <div key={payment.id} className={`schedule-item ${payment.status}`}>
                  <div className="schedule-date">
                    {new Date(payment.due_date).toLocaleDateString()}
                  </div>
                  <div className="schedule-amount">
                    OMC {formatCurrency(payment.amount)}
                  </div>
                  <div className={`schedule-status ${payment.status}`}>
                    {payment.status === 'paid' ? (
                      <>
                        <span className="status-icon">✅</span>
                        <span>Paid on {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'N/A'}</span>
                      </>
                    ) : (
                      <>
                        <span className="status-icon">⏳</span>
                        <span>Pending</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}