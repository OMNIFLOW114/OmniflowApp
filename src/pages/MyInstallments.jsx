// src/pages/MyInstallments.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-toastify";
import { useDarkMode } from "@/context/DarkModeContext";
import "./MyInstallments.css";

const POLL_INTERVAL_MS = 60_000;

export default function MyInstallments({ user }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);
  const [totalInvested, setTotalInvested] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [nextPayment, setNextPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function startUp() {
    await Promise.all([fetchOrders(), fetchWallet()]);
    setTimeout(() => checkRemindersAndNotify(), 300);
  }

  async function fetchOrders() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("installment_orders")
      .select(`
        *,
        products:product_id (id, name, image_gallery, description, category),
        seller:seller_id (id, full_name, email, phone, avatar_url)
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchOrders error:", error);
      toast.error("Failed to load installment plans");
      setOrders([]);
    } else {
      setOrders(data || []);
      calculateTotalInvested(data || []);
    }
    setIsLoading(false);
  }

  function calculateTotalInvested(orders) {
    const invested = orders.reduce((total, order) => {
      return total + Number(order.amount_paid || 0);
    }, 0);
    setTotalInvested(invested);
  }

  async function fetchWallet() {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!error && data) setWalletBalance(Number(data.balance));
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
      default:
        return true;
    }
  });

  // reminders
  async function checkRemindersAndNotify() {
    if (!orders?.length) return;
    for (const o of orders) {
      const days = daysBetween(o.next_due_date);
      const remaining = Number(o.total_price || 0) - Number(o.amount_paid || 0);

      if (o.status !== "completed" && days != null && days < 0) {
        toast.warn(
          `Order ${o.id.slice(0, 8)} is overdue by ${Math.abs(days)} day(s).`
        );
      } else if (o.status !== "completed" && days != null && days <= 3) {
        toast.info(
          `Order ${o.id.slice(0, 8)} due in ${days} day(s). Amount: OMC ${formatCurrency(
            o.installment_amount
          )}.`
        );
      }
    }
  }

  async function openModal(order) {
    setSelectedOrder(order);
    setModalOpen(true);
    setPaymentHistory([]);
    setNextPayment(null);

    const { data, error } = await supabase
      .from("installment_payments")
      .select("*")
      .eq("order_id", order.id)
      .eq("buyer_id", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("fetch payments error", error);
      toast.error("Failed to load schedule");
      return;
    }

    setPaymentHistory(data || []);
    const next = (data || []).find((p) => p.status === "pending");
    setNextPayment(next ?? null);

    fetchWallet();
  }

  async function payNextInstallment(extra = false) {
    if (!selectedOrder) return;
    if (!nextPayment) {
      toast.error("No pending installment found for this order.");
      return;
    }

    const amount = Number(nextPayment.amount);

    if (paymentMethod === "wallet") {
      if (walletBalance == null) {
        toast.error("Wallet balance unknown. Try again.");
        return;
      }
      if (walletBalance < amount) {
        toast.error("Insufficient wallet balance. Please top up.");
        return;
      }
    }

    setLoadingOrderId(selectedOrder.id);
    const toastId = toast.loading("Processing payment…");

    try {
      const { error: rpcError } = await supabase.rpc(
        "record_installment_payment",
        {
          p_buyer: user.id,
          p_order_id: selectedOrder.id,
          p_payment_method: paymentMethod,
          p_extra: extra || false,
        }
      );

      if (rpcError) throw rpcError;

      toast.dismiss(toastId);
      toast.success("Payment successful");

      await Promise.all([fetchOrders(), fetchWallet()]);
      await openModal(selectedOrder);
    } catch (err) {
      console.error("payNextInstallment error:", err);
      toast.dismiss(toastId);
      const message =
        err?.message ||
        err?.error_description ||
        "Payment failed. Please try again.";
      toast.error(message);
    } finally {
      setLoadingOrderId(null);
    }
  }

  return (
    <div className={`installment-dashboard ${darkMode ? "dark-mode" : ""}`}>
      {/* Header */}
      <header className="installment-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="title">Lipa Mdogo Mdogo</h1>
            <p className="subtitle">
              Manage your installment plans
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-label">Wallet</div>
                <div className="stat-value">OMC {walletBalance != null ? formatCurrency(walletBalance) : "..."}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <div className="stat-label">Paid</div>
                <div className="stat-value">OMC {formatCurrency(totalInvested)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <div className="stat-label">Active</div>
                <div className="stat-value">{orders.filter(o => o.status === 'active').length}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <QuickStats orders={orders} formatCurrency={formatCurrency} />

      {/* Tab Navigation */}
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
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({orders.filter(o => o.status === 'completed').length})
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
            <p>Loading your plans...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No {activeTab !== 'all' ? activeTab : ''} plans</h3>
            <p>
              {activeTab === 'all' 
                ? "Start shopping with Lipa Mdogo Mdogo"
                : `No ${activeTab} installment plans`
              }
            </p>
            <button className="btn primary" onClick={() => window.location.href = '/products'}>
              Browse Products
            </button>
          </div>
        ) : (
          <section className="cards-grid">
            {filteredOrders.map((order) => (
              <InstallmentCard
                key={order.id}
                order={order}
                walletBalance={walletBalance}
                formatCurrency={formatCurrency}
                daysBetween={daysBetween}
                loadingOrderId={loadingOrderId}
                openModal={openModal}
                fetchOrders={fetchOrders}
              />
            ))}
          </section>
        )}
      </main>

      {/* Payment Modal */}
      {modalOpen && selectedOrder && (
        <PaymentModal
          selectedOrder={selectedOrder}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          walletBalance={walletBalance}
          formatCurrency={formatCurrency}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          payNextInstallment={payNextInstallment}
          loadingOrderId={loadingOrderId}
          paymentHistory={paymentHistory}
          nextPayment={nextPayment}
        />
      )}
    </div>
  );
}

/* --------------------------
   Sub Components
---------------------------*/

function QuickStats({ orders, formatCurrency }) {
  const totalActive = orders.filter(o => o.status === 'active').length;
  const totalCompleted = orders.filter(o => o.status === 'completed').length;
  const totalOverdue = orders.filter(o => {
    const days = (new Date(o.next_due_date) - new Date()) / (1000 * 60 * 60 * 24);
    return o.status !== 'completed' && days < 0;
  }).length;

  return (
    <div className="quick-stats">
      <div className="stat-item">
        <div className="stat-number">{totalActive}</div>
        <div className="stat-label">Active Plans</div>
      </div>
      <div className="stat-item">
        <div className="stat-number">{totalCompleted}</div>
        <div className="stat-label">Completed</div>
      </div>
      <div className="stat-item">
        <div className="stat-number">{totalOverdue}</div>
        <div className="stat-label">Overdue</div>
      </div>
    </div>
  );
}

function InstallmentCard({
  order,
  walletBalance,
  formatCurrency,
  daysBetween,
  loadingOrderId,
  openModal,
  fetchOrders,
}) {
  const days = daysBetween(order.next_due_date);
  const paid = Number(order.amount_paid || 0);
  const total = Number(order.total_price || 0);
  const paidPercent = Math.floor((paid / Math.max(total, 1)) * 100);
  const remain = Math.max(total - paid, 0);
  const dueSoon =
    order.status !== "completed" && days != null && days <= 3 && days >= 0;
  const overdue =
    order.status !== "completed" && days != null && days < 0;

  const getStatusVariant = () => {
    if (order.status === 'completed') return 'completed';
    if (overdue) return 'overdue';
    if (dueSoon) return 'due-soon';
    return 'active';
  };

  return (
    <article
      className={`installment-card card-${getStatusVariant()}`}
      aria-labelledby={`order-title-${order.id}`}
    >
      <div className="card-header">
        <div className="product-image">
          <img
            src={order.products?.image_gallery?.[0] || "/placeholder.png"}
            alt={order.products?.name || "Product"}
          />
        </div>
        <div className="card-info">
          <h3 id={`order-title-${order.id}`} className="product-title">
            {order.products?.name || "Product"}
          </h3>
          <div className="product-meta">
            <span className="category">{order.products?.category || "General"}</span>
            <span className={`status status-${getStatusVariant()}`}>
              {order.status === 'completed' ? 'Completed' : 
               overdue ? `Overdue` :
               dueSoon ? `Due soon` : 'Active'}
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
          <div className="detail-item">
            <span className="detail-label">Next Payment</span>
            <span className="detail-value">OMC {formatCurrency(order.installment_amount)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Due Date</span>
            <span className={`detail-value ${overdue ? 'overdue' : dueSoon ? 'due-soon' : ''}`}>
              {order.next_due_date ? new Date(order.next_due_date).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn btn-primary"
          onClick={() => openModal(order)}
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
        
        <button className="btn btn-ghost" onClick={() => openModal(order)}>
          Details
        </button>
      </div>
    </article>
  );
}

function PaymentModal({
  selectedOrder,
  modalOpen,
  setModalOpen,
  walletBalance,
  formatCurrency,
  paymentMethod,
  setPaymentMethod,
  payNextInstallment,
  loadingOrderId,
  paymentHistory,
  nextPayment,
}) {
  const paid = Number(selectedOrder.amount_paid || 0);
  const total = Number(selectedOrder.total_price || 0);
  const paidPercent = Math.floor((paid / Math.max(total, 1)) * 100);

  return (
    <div className="modal-overlay" onClick={() => setModalOpen(false)}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pay Installment</h2>
          <button className="modal-close" onClick={() => setModalOpen(false)}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="product-summary">
            <img
              src={selectedOrder.products?.image_gallery?.[0] || "/placeholder.png"}
              alt={selectedOrder.products?.name}
              className="product-image"
            />
            <div className="product-info">
              <h3>{selectedOrder.products?.name}</h3>
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

          <div className="payment-section">
            <div className="payment-amount-card">
              <div className="amount-display">
                <span className="amount-label">Amount Due</span>
                <span className="amount-value">
                  OMC {formatCurrency(nextPayment ? nextPayment.amount : selectedOrder.installment_amount)}
                </span>
              </div>
              
              <div className="wallet-info">
                <span>Wallet: OMC {formatCurrency(walletBalance)}</span>
                {paymentMethod === 'wallet' && walletBalance < (nextPayment?.amount || selectedOrder.installment_amount) && (
                  <span className="insufficient">Insufficient</span>
                )}
              </div>

              <div className="payment-methods">
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
                    <span className="method-name">Wallet</span>
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

                  <label className={`method-option ${paymentMethod === 'paypal' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                    />
                    <span className="method-icon">🌐</span>
                    <span className="method-name">PayPal</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="schedule-section">
            <h4>Payment Schedule</h4>
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
                      {payment.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={() => payNextInstallment(false)}
            disabled={!nextPayment || loadingOrderId === selectedOrder.id || 
              (paymentMethod === 'wallet' && walletBalance < (nextPayment?.amount || selectedOrder.installment_amount))}
          >
            {loadingOrderId === selectedOrder.id ? (
              <>
                <div className="btn-spinner"></div>
                Processing...
              </>
            ) : (
              `Pay OMC ${formatCurrency(nextPayment ? nextPayment.amount : selectedOrder.installment_amount)}`
            )}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => payNextInstallment(true)}
            disabled={!nextPayment || loadingOrderId === selectedOrder.id}
          >
            Pay Extra
          </button>
        </div>
      </div>
    </div>
  );
}