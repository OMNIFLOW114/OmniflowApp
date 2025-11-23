// src/components/InstallmentOrdersTab.jsx - ENHANCED VERSION
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-toastify";
import { 
  FaChartLine, 
  FaMoneyBillWave, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaEye,
  FaCalendar,
  FaUser,
  FaBox
} from "react-icons/fa";
import "./InstallmentOrdersTab.css";

const InstallmentOrdersTab = ({ sellerId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    completedOrders: 0,
    overdueOrders: 0,
    averageCompletionRate: 0,
    totalEarned: 0,
    pendingAmount: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (sellerId) {
      fetchOrders();
      fetchAnalytics();
    }
  }, [sellerId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("installment_orders")
      .select(`
        *,
        products:product_id (id, name, price, image_gallery),
        buyers:buyer_id (id, full_name, email, phone),
        installment_payments(*)
      `)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders.");
      console.error(error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const { data: ordersData, error } = await supabase
      .from("installment_orders")
      .select("total_price, amount_paid, status, created_at")
      .eq("seller_id", sellerId);

    if (!error && ordersData) {
      const totalRevenue = ordersData.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
      const totalEarned = ordersData.reduce((sum, order) => sum + Number(order.amount_paid || 0), 0);
      const activeOrders = ordersData.filter(order => order.status === 'active').length;
      const completedOrders = ordersData.filter(order => order.status === 'completed').length;
      const overdueOrders = ordersData.filter(order => order.status === 'overdue').length;
      
      const completionRate = ordersData.length > 0 
        ? (completedOrders / ordersData.length) * 100 
        : 0;

      setAnalytics({
        totalRevenue,
        activeOrders,
        completedOrders,
        overdueOrders,
        averageCompletionRate: completionRate,
        totalEarned,
        pendingAmount: totalRevenue - totalEarned
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FaCheckCircle className="status-icon completed" />;
      case 'overdue': return <FaExclamationTriangle className="status-icon overdue" />;
      case 'active': return <FaClock className="status-icon active" />;
      default: return <FaClock className="status-icon" />;
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) return <div className="loading">Loading installment orders...</div>;

  return (
    <div className="installments-dashboard">
      {/* Analytics Overview */}
      <div className="analytics-overview">
        <h2>
          <FaChartLine className="section-icon" />
          Lipa Mdogo Mdogo Analytics
        </h2>
        
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-icon total-revenue">
              <FaMoneyBillWave />
            </div>
            <div className="analytics-info">
              <h3>Ksh {analytics.totalRevenue.toLocaleString()}</h3>
              <p>Total Revenue</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon active">
              <FaClock />
            </div>
            <div className="analytics-info">
              <h3>{analytics.activeOrders}</h3>
              <p>Active Plans</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon completed">
              <FaCheckCircle />
            </div>
            <div className="analytics-info">
              <h3>{analytics.completedOrders}</h3>
              <p>Completed</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon overdue">
              <FaExclamationTriangle />
            </div>
            <div className="analytics-info">
              <h3>{analytics.overdueOrders}</h3>
              <p>Overdue</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon earned">
              <FaMoneyBillWave />
            </div>
            <div className="analytics-info">
              <h3>Ksh {analytics.totalEarned.toLocaleString()}</h3>
              <p>Amount Received</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon pending">
              <FaClock />
            </div>
            <div className="analytics-info">
              <h3>Ksh {analytics.pendingAmount.toLocaleString()}</h3>
              <p>Pending Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-section">
        <h3>Installment Orders</h3>
        
        {orders.length === 0 ? (
          <div className="empty-state">
            <FaBox size={48} />
            <p>No installment orders yet</p>
            <small>When customers purchase your Lipa Mdogo Mdogo products, they'll appear here</small>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => {
              const progress = (order.amount_paid / order.total_price) * 100;
              const daysUntilDue = getDaysUntilDue(order.next_due_date);
              const paidInstallments = order.installment_payments?.filter(p => p.status === 'paid').length || 0;
              const totalInstallments = order.installment_count;

              return (
                <div className="installment-order-card" key={order.id}>
                  <div className="order-header">
                    <div className="product-info">
                      <div className="product-image">
                        <img
                          src={order.products?.image_gallery?.[0] || "/placeholder.png"}
                          alt={order.products?.name}
                        />
                      </div>
                      <div className="product-details">
                        <h4>{order.products?.name || "Unnamed Product"}</h4>
                        <p className="order-id">Order: {order.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="order-status">
                      {getStatusIcon(order.status)}
                      <span className={`status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="buyer-info">
                    <FaUser className="info-icon" />
                    <span>{order.buyers?.full_name || order.buyers?.email || "Unknown Buyer"}</span>
                    {order.buyers?.phone && <span className="phone">• {order.buyers.phone}</span>}
                  </div>

                  <div className="financial-info">
                    <div className="amount-row">
                      <span>Total Price:</span>
                      <strong>Ksh {order.total_price?.toLocaleString()}</strong>
                    </div>
                    <div className="amount-row">
                      <span>Paid:</span>
                      <strong className="paid-amount">Ksh {order.amount_paid?.toLocaleString()}</strong>
                    </div>
                    <div className="amount-row">
                      <span>Remaining:</span>
                      <strong className="remaining-amount">
                        Ksh {(order.total_price - order.amount_paid)?.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="progress-section">
                    <div className="progress-header">
                      <span>Progress: {progress.toFixed(1)}%</span>
                      <span>{paidInstallments}/{totalInstallments} installments paid</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="schedule-info">
                    <div className="schedule-item">
                      <FaCalendar className="schedule-icon" />
                      <div>
                        <span className="label">Next Due:</span>
                        <span className={`value ${daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 3 ? 'due-soon' : ''}`}>
                          {order.next_due_date 
                            ? new Date(order.next_due_date).toLocaleDateString()
                            : 'N/A'
                          }
                          {daysUntilDue !== null && (
                            <span className="days-badge">
                              {daysUntilDue < 0 
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : `${daysUntilDue} days left`
                              }
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="schedule-item">
                      <FaMoneyBillWave className="schedule-icon" />
                      <div>
                        <span className="label">Next Amount:</span>
                        <span className="value">Ksh {order.installment_amount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button 
                      className="btn-view-details"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <FaEye /> View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, onUpdate }) => {
  const [payments, setPayments] = useState(order.installment_payments || []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content order-details-modal">
        <div className="modal-header">
          <h3>Order Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="order-summary">
            <h4>{order.products?.name}</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span>Buyer:</span>
                <span>{order.buyers?.full_name || order.buyers?.email}</span>
              </div>
              <div className="summary-item">
                <span>Order Date:</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              <div className="summary-item">
                <span>Status:</span>
                <span className={`status ${order.status}`}>{order.status}</span>
              </div>
              <div className="summary-item">
                <span>Total Price:</span>
                <span>Ksh {order.total_price?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="payment-history">
            <h4>Payment History</h4>
            {payments.length === 0 ? (
              <p className="no-payments">No payments recorded yet</p>
            ) : (
              <div className="payments-list">
                {payments.map((payment) => (
                  <div key={payment.id} className={`payment-item ${payment.status}`}>
                    <div className="payment-info">
                      <span className="amount">Ksh {payment.amount?.toLocaleString()}</span>
                      <span className="date">{formatDate(payment.paid_date || payment.due_date)}</span>
                    </div>
                    <div className="payment-status">
                      <span className={`status ${payment.status}`}>{payment.status}</span>
                      {payment.payment_method && (
                        <span className="method">via {payment.payment_method}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallmentOrdersTab;