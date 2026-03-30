import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiDownload, 
  FiCreditCard, 
  FiBriefcase, 
  FiPercent, 
  FiBarChart2, 
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiShoppingBag,
  FiTrendingUp,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiPackage,
  FiClock,
  FiRotateCcw,
  FiSend,
  FiLock,
  FiLogOut,
  FiSmartphone,
  FiInfo,
  FiLoader
} from "react-icons/fi";
import { 
  FaCrown, 
  FaMoneyBillWave, 
  FaChartLine, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaWallet,
  FaHandHoldingUsd
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";
import "./AdminWallet.css";

const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

const EARNING_SOURCES = [
  { key: "commission", label: "Total Commission Earned", icon: <FiPercent />, color: "#8b5cf6" },
  { key: "escrow", label: "Current Escrow Balance", icon: <FaShieldAlt />, color: "#f59e0b" },
  { key: "withdrawals", label: "Total Withdrawn", icon: <FiSend />, color: "#ef4444" },
  { key: "refunds", label: "Refunds Processed", icon: <FiRotateCcw />, color: "#10b981" },
  { key: "all", label: "All Transactions", icon: <FiBarChart2 />, color: "#3b82f6" }
];

const formatKSH = (num) => {
  if (num === undefined || num === null) return "KSH 0";
  const value = Number(num);
  if (isNaN(value)) return "KSH 0";
  
  return `KSH ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function AdminWalletDashboard() {
  const navigate = useNavigate();
  
  // Auth states - MUST be declared first
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  
  // Wallet states
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [escrowOrders, setEscrowOrders] = useState([]);
  const [pendingSellerPayouts, setPendingSellerPayouts] = useState([]);
  const [totals, setTotals] = useState({});
  const [selectedSource, setSelectedSource] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [escrowPage, setEscrowPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Withdrawal states
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);
  
  // B2C Payment states
  const [b2cProcessing, setB2cProcessing] = useState(false);
  const [b2cStep, setB2cStep] = useState(1);
  const [b2cType, setB2cType] = useState(null);
  const [b2cAmount, setB2cAmount] = useState(0);
  const [b2cPhone, setB2cPhone] = useState("");
  const [b2cCheckoutId, setB2cCheckoutId] = useState(null);

  const TRANSACTIONS_PER_PAGE = 10;
  const MAX_WITHDRAWAL = 450000;
  const MIN_WITHDRAWAL = 100;

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const walletChannel = supabase
      .channel(`admin_wallet_${ADMIN_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${ADMIN_ID}`,
        },
        (payload) => {
          if (payload.new?.balance !== undefined) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();
    
    const transactionsChannel = supabase
      .channel(`admin_transactions_${ADMIN_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${ADMIN_ID}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        setError('Authentication error');
        setAuthChecked(true);
        return;
      }

      if (!session) {
        navigate('/login');
        setAuthChecked(true);
        return;
      }

      if (session.user.id !== ADMIN_ID) {
        await supabase.auth.signOut();
        navigate('/login');
        setAuthChecked(true);
        return;
      }

      setIsAuthenticated(true);
      setAuthChecked(true);
      fetchData();
      
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Failed to verify authentication');
      setAuthChecked(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchTransactions(),
        fetchEscrowOrders(),
        fetchPendingSellerPayouts(),
        fetchWithdrawHistory()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", ADMIN_ID)
      .maybeSingle();
    
    if (!error && data) {
      setBalance(data.balance || 0);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", ADMIN_ID)
      .in("type", ["commission", "escrow_receive", "admin_withdrawal", "admin_refund"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data);
      
      const grouped = data.reduce((acc, txn) => {
        if (txn.type === 'commission') acc.commission = (acc.commission || 0) + txn.amount;
        if (txn.type === 'escrow_receive') acc.escrow = (acc.escrow || 0) + txn.amount;
        if (txn.type === 'admin_withdrawal') acc.withdrawals = (acc.withdrawals || 0) + txn.amount;
        if (txn.type === 'admin_refund') acc.refunds = (acc.refunds || 0) + txn.amount;
        return acc;
      }, {});
      
      setTotals(grouped);
    }
  };

  const fetchEscrowOrders = async () => {
    // Get orders that have deposit paid but not yet fully paid out to seller
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        seller_id,
        product_id,
        status,
        delivered,
        balance_paid,
        deposit_amount,
        total_price,
        delivery_location,
        buyer_phone,
        created_at,
        products:product_id (name, category, image_gallery)
      `)
      .or(`status.eq.deposit_paid,status.eq.processing,status.eq.balance_paid,status.eq.delivered`)
      .eq("escrow_released", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const enriched = data.map(order => ({
        ...order,
        product: order.products?.[0] || null,
        deposit_amount: order.deposit_amount || order.total_price * 0.25,
        remaining_amount: order.total_price - (order.deposit_amount || order.total_price * 0.25),
        is_delivered: order.delivered || false,
        is_fully_paid: order.balance_paid || false
      }));
      setEscrowOrders(enriched);
    }
  };

  const fetchPendingSellerPayouts = async () => {
    // Get orders that are delivered and fully paid, but not yet released to seller
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        seller_id,
        product_id,
        total_price,
        commission_amount,
        commission_rate,
        status,
        delivered,
        balance_paid,
        created_at,
        products:product_id (name, category, image_gallery),
        seller:users!orders_seller_id_fkey (id, full_name, email, phone)
      `)
      .eq("delivered", true)
      .eq("balance_paid", true)
      .eq("escrow_released", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Calculate seller amount using commission data
      const enriched = await Promise.all(data.map(async (order) => {
        // Get commission calculation
        const { data: commissionData } = await supabase
          .rpc('calculate_order_commission', {
            p_product_id: order.product_id,
            p_total_amount: order.total_price
          });
        
        const commission = commissionData?.[0] || {
          commission_rate: order.commission_rate || 0.09,
          commission_amount: order.commission_amount || (order.total_price * 0.09),
          seller_amount: order.total_price - (order.commission_amount || (order.total_price * 0.09))
        };
        
        return {
          ...order,
          product: order.products?.[0] || null,
          seller: order.seller?.[0] || null,
          seller_amount: commission.seller_amount,
          commission_rate: commission.commission_rate,
          commission_amount: commission.commission_amount
        };
      }));
      
      setPendingSellerPayouts(enriched);
    }
  };

  const fetchWithdrawHistory = async () => {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", ADMIN_ID)
      .eq("type", "admin_withdrawal")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setWithdrawHistory(data);
    }
  };

  // ============================================================
  // B2C Withdrawal (Admin to Admin's M-Pesa)
  // ============================================================
  const handleB2CWithdrawal = async () => {
    const amountNum = Number(withdrawAmount);
    
    if (!withdrawAmount || amountNum < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal amount is KSH ${MIN_WITHDRAWAL}`);
      return;
    }

    if (amountNum > MAX_WITHDRAWAL) {
      toast.error(`Maximum withdrawal amount is KSH ${MAX_WITHDRAWAL}`);
      return;
    }

    if (amountNum > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!withdrawPhone || !/^0[17]\d{8}$/.test(withdrawPhone)) {
      toast.error("Please enter a valid M-Pesa phone number");
      return;
    }

    setProcessingWithdrawal(true);
    setB2cStep(2);
    setB2cType('withdrawal');
    setB2cAmount(amountNum);
    setB2cPhone(withdrawPhone);
    
    const loadingToast = toast.loading("Processing withdrawal...");

    try {
      // Call B2C endpoint
      const { data, error } = await supabase.functions.invoke('mpesa/b2c', {
        body: {
          amount: amountNum,
          phoneNumber: withdrawPhone,
          type: 'withdrawal',
          reason: 'Admin withdrawal'
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (!data?.success) {
        throw new Error(data?.error || 'Withdrawal failed');
      }
      
      setB2cCheckoutId(data.conversationID);
      
      // Record withdrawal transaction
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: ADMIN_ID,
          type: 'admin_withdrawal',
          amount: amountNum,
          status: 'completed',
          description: `Withdrawal to ${withdrawPhone} via B2C`,
          metadata: {
            phone: withdrawPhone,
            conversation_id: data.conversationID,
            receipt: data.receipt
          },
          created_at: new Date().toISOString()
        });
      
      // Update wallet balance
      await supabase
        .from("wallets")
        .update({ 
          balance: balance - amountNum,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", ADMIN_ID);
      
      setBalance(balance - amountNum);
      
      toast.dismiss(loadingToast);
      toast.success(
        `Withdrawal initiated!\nAmount: ${formatKSH(amountNum)}\nWill be sent to ${withdrawPhone}`,
        { duration: 5000 }
      );
      
      setTimeout(() => {
        setWithdrawModalOpen(false);
        setWithdrawAmount("");
        setWithdrawPhone("");
        setB2cStep(1);
        setProcessingWithdrawal(false);
        fetchData();
      }, 2000);
      
    } catch (err) {
      console.error("Withdrawal error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to process withdrawal");
      setB2cStep(1);
      setProcessingWithdrawal(false);
    }
  };

  // ============================================================
  // Release Payment to Seller - FIXED to use RPC
  // ============================================================
  const releaseToSeller = async (order) => {
    if (!order?.id) return;
    
    setActionLoading(true);
    const loadingToast = toast.loading(`Processing seller payout...`);
    
    try {
      // Call the release_escrow_to_seller RPC function
      const { data, error } = await supabase.rpc('release_escrow_to_seller', {
        p_order: order.id
      });
      
      if (error) throw new Error(error.message);
      
      if (!data?.success) {
        throw new Error(data?.error || 'Payout failed');
      }
      
      toast.dismiss(loadingToast);
      toast.success(
        <div>
          <strong>Payment Released!</strong>
          <br />
          <small>Seller received: {formatKSH(data.seller_amount)}</small>
          <br />
          <small>Platform commission: {formatKSH(data.commission_amount)} ({Math.round(data.commission_rate * 100)}%)</small>
        </div>,
        { duration: 5000 }
      );
      
      // Refresh data
      await fetchData();
      
    } catch (err) {
      console.error("Payout error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to release payment to seller");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // B2C Refund to Buyer
  // ============================================================
  const processB2CRefund = async () => {
    if (!selectedOrder) return;
    if (!refundReason.trim()) {
      toast.error("Please provide a refund reason");
      return;
    }

    const buyerPhone = selectedOrder.buyer_phone;
    
    if (!buyerPhone || !/^0[17]\d{8}$/.test(buyerPhone)) {
      toast.error("Invalid buyer phone number");
      return;
    }

    setProcessingRefund(true);
    setB2cStep(2);
    setB2cType('refund');
    setB2cAmount(selectedOrder.deposit_amount);
    setB2cPhone(buyerPhone);
    
    const loadingToast = toast.loading("Processing refund...");

    try {
      const { data, error } = await supabase.functions.invoke('mpesa/b2c', {
        body: {
          amount: selectedOrder.deposit_amount,
          phoneNumber: buyerPhone,
          type: 'refund',
          orderId: selectedOrder.id,
          reason: refundReason
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (!data?.success) {
        throw new Error(data?.error || 'Refund failed');
      }
      
      setB2cCheckoutId(data.conversationID);
      
      // Update order status
      await supabase
        .from("orders")
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          refund_reason: refundReason,
          refund_receipt: data.conversationID,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedOrder.id);
      
      // Record refund transaction
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: ADMIN_ID,
          type: 'admin_refund',
          amount: selectedOrder.deposit_amount,
          status: 'completed',
          order_id: selectedOrder.id,
          description: `Refund to buyer ${buyerPhone} for order ${selectedOrder.id.slice(0, 8)}`,
          metadata: {
            buyer_phone: buyerPhone,
            refund_reason: refundReason,
            conversation_id: data.conversationID
          },
          created_at: new Date().toISOString()
        });
      
      // Update wallet balance
      await supabase
        .from("wallets")
        .update({ 
          balance: balance - selectedOrder.deposit_amount,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", ADMIN_ID);
      
      setBalance(balance - selectedOrder.deposit_amount);
      
      toast.dismiss(loadingToast);
      toast.success(
        `Refund initiated!\nAmount: ${formatKSH(selectedOrder.deposit_amount)}\nWill be sent to buyer: ${buyerPhone}`,
        { duration: 5000 }
      );
      
      setTimeout(() => {
        setRefundModalOpen(false);
        setSelectedOrder(null);
        setRefundReason("");
        setB2cStep(1);
        setProcessingRefund(false);
        fetchData();
      }, 2000);
      
    } catch (err) {
      console.error("Refund error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to process refund");
      setB2cStep(1);
      setProcessingRefund(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const totalCommission = totals.commission || 0;
  const totalEscrow = balance; // Current balance is the escrow amount
  const totalWithdrawn = totals.withdrawals || 0;
  const totalRefunds = totals.refunds || 0;

  const csvData = transactions.map((txn) => ({
    Type: txn.type === 'commission' ? 'Commission Earned' : 
          txn.type === 'escrow_receive' ? 'Escrow Received' :
          txn.type === 'admin_withdrawal' ? 'Withdrawal' :
          txn.type === 'admin_refund' ? 'Refund Sent' : txn.type,
    Amount: `${txn.amount} KSH`,
    Description: txn.description || "-",
    OrderID: txn.order_id || "-",
    Date: new Date(txn.created_at).toLocaleString(),
  }));

  const filteredTransactions = selectedSource === "all"
    ? transactions
    : transactions.filter(t => {
        if (selectedSource === 'commission') return t.type === 'commission';
        if (selectedSource === 'escrow') return t.type === 'escrow_receive';
        if (selectedSource === 'withdrawals') return t.type === 'admin_withdrawal';
        if (selectedSource === 'refunds') return t.type === 'admin_refund';
        return true;
      });

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * TRANSACTIONS_PER_PAGE,
    page * TRANSACTIONS_PER_PAGE
  );

  const paginatedEscrow = escrowOrders.slice(
    (escrowPage - 1) * TRANSACTIONS_PER_PAGE,
    escrowPage * TRANSACTIONS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE);
  const totalEscrowPages = Math.ceil(escrowOrders.length / TRANSACTIONS_PER_PAGE);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  if (!authChecked) {
    return (
      <div className="admin-wallet-loading">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-wallet-error">
        <FiAlertCircle size={48} />
        <h3>Authentication Error</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/login')} className="error-btn">
          Go to Login
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-wallet-loading">
        <div className="loading-spinner"></div>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-wallet-loading">
        <div className="loading-spinner"></div>
        <p>Loading wallet data...</p>
      </div>
    );
  }

  return (
    <div className="admin-wallet-container">
      {/* B2C Processing Modal */}
      {b2cStep === 2 && (
        <div className="b2c-modal">
          <div className="b2c-modal-content">
            <div className="payment-loader">
              <div className="spinner"></div>
              <p>{b2cType === 'withdrawal' ? 'Processing Withdrawal...' : 'Processing Refund...'}</p>
              <p className="payment-instruction">
                {b2cType === 'withdrawal' 
                  ? `Please wait. Funds will be sent to ${b2cPhone}`
                  : `Please wait. Refund will be sent to buyer's phone: ${b2cPhone}`}
              </p>
              <p className="payment-instruction">Amount: {formatKSH(b2cAmount)}</p>
              {b2cCheckoutId && (
                <p className="reference-text">Reference: {b2cCheckoutId.slice(-8)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Header */}
      <div className="security-header">
        <div className="security-indicators">
          <span className="security-badge">
            <FiShield /> Secure Session
          </span>
          <span className="security-badge">
            <FiLock /> Admin Access
          </span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <FiLogOut /> Logout
        </button>
      </div>

      <motion.div
        className="admin-wallet-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <div className="header-icon-wrapper">
              <FaMoneyBillWave className="header-icon" />
            </div>
            <div className="header-title-text">
              <h1>Admin Wallet</h1>
              <p>Protected by Supabase RLS • B2C Enabled</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <FiDollarSign className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatKSH(balance).replace('KSH ', '')}</span>
                <span className="stat-label">Available Balance</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper earnings">
                <FiPercent className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatKSH(totalCommission).replace('KSH ', '')}</span>
                <span className="stat-label">Total Commission Earned</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper escrow">
                <FaShieldAlt className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatKSH(totalEscrow).replace('KSH ', '')}</span>
                <span className="stat-label">Current Escrow Balance</span>
              </div>
            </div>
            <div className="stat-card withdraw-stat" onClick={() => setWithdrawModalOpen(true)}>
              <div className="stat-icon-wrapper withdraw">
                <FiSend className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatKSH(totalWithdrawn).replace('KSH ', '')}</span>
                <span className="stat-label">Total Withdrawn</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Withdraw Button */}
      <div className="withdraw-actions">
        <motion.button
          className="withdraw-main-btn"
          onClick={() => setWithdrawModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={processingWithdrawal}
        >
          <FiSend /> {processingWithdrawal ? "Processing..." : "Withdraw to M-Pesa (B2C)"}
        </motion.button>
        <motion.button
          className="history-btn"
          onClick={() => setShowWithdrawHistory(!showWithdrawHistory)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiClock /> {showWithdrawHistory ? 'Hide History' : 'Show History'}
        </motion.button>
      </div>

      {/* Withdraw History */}
      <AnimatePresence>
        {showWithdrawHistory && withdrawHistory.length > 0 && (
          <motion.div
            className="withdraw-history"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4>Recent Withdrawals</h4>
            <div className="history-list">
              {withdrawHistory.map((withdraw) => (
                <div key={withdraw.id} className="history-item">
                  <div className="history-icon">
                    <FiSend />
                  </div>
                  <div className="history-details">
                    <span className="history-amount">{formatKSH(withdraw.amount)}</span>
                    <span className="history-method">M-Pesa (B2C)</span>
                    <span className="history-date">{formatDate(withdraw.created_at)}</span>
                  </div>
                  <span className={`history-status ${withdraw.status}`}>
                    {withdraw.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiBarChart2 /> 
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'escrow' ? 'active' : ''}`}
          onClick={() => setActiveTab('escrow')}
        >
          <FaShieldAlt /> 
          <span>Escrow Management ({escrowOrders.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          <FaHandHoldingUsd /> 
          <span>Seller Payouts ({pendingSellerPayouts.length})</span>
        </button>
      </div>

      <div className="admin-wallet-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Earnings Cards */}
            <motion.div
              className="earnings-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="section-header">
                <h2>Earnings Breakdown</h2>
                <p>Platform commission and transaction summary</p>
              </div>

              <div className="earnings-grid">
                {EARNING_SOURCES.map((source, index) => {
                  let amount = 0;
                  if (source.key === 'commission') amount = totalCommission;
                  if (source.key === 'escrow') amount = totalEscrow;
                  if (source.key === 'withdrawals') amount = totalWithdrawn;
                  if (source.key === 'refunds') amount = totalRefunds;
                  if (source.key === 'all') amount = totalCommission + totalEscrow - totalWithdrawn - totalRefunds;
                  const totalAll = totalCommission + totalEscrow;
                  const percent = totalAll > 0 ? ((amount / totalAll) * 100).toFixed(1) : "0.0";

                  return (
                    <motion.div
                      key={source.key}
                      className={`earning-card ${selectedSource === source.key ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSource(source.key);
                        setPage(1);
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="card-header">
                        <div 
                          className="source-icon"
                          style={{ backgroundColor: `${source.color}15` }}
                        >
                          <span style={{ color: source.color }}>{source.icon}</span>
                        </div>
                        <div className="source-info">
                          <h3>{source.label}</h3>
                          <span className="amount">{formatKSH(amount)}</span>
                        </div>
                      </div>
                      <div className="card-footer">
                        <div className="percentage">
                          <FiPercent className="percent-icon" />
                          <span>{percent}%</span>
                        </div>
                        {selectedSource === source.key && (
                          <div className="selected-indicator"></div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Transactions Table */}
            <motion.div
              className="transactions-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="section-header">
                <h2>
                  {selectedSource === "all" ? "All Transactions" : 
                   selectedSource === "commission" ? "Commission Transactions" :
                   selectedSource === "escrow" ? "Escrow Transactions" :
                   selectedSource === "withdrawals" ? "Withdrawal History" :
                   selectedSource === "refunds" ? "Refund History" :
                   "Transaction History"}
                </h2>
                <span className="transaction-count">{filteredTransactions.length} transactions</span>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <FiDollarSign className="empty-icon" />
                  <h3>No transactions found</h3>
                  <p>No transactions available for the selected source</p>
                </div>
              ) : (
                <>
                  <div className="transactions-table">
                    <div className="table-container">
                      <table className="transactions-table-content">
                        <thead>
                          <tr>
                            <th>Date & Time</th>
                            <th>Amount</th>
                            <th>Type</th>
                            <th>Reference</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTransactions.map((transaction, index) => (
                            <motion.tr
                              key={transaction.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="transaction-row"
                            >
                              <td className="date-cell">
                                <FiCalendar className="date-icon" />
                                {formatDate(transaction.created_at)}
                              </td>
                              <td className="amount-cell">
                                <span className={`amount-value ${transaction.type === 'admin_withdrawal' || transaction.type === 'admin_refund' ? 'negative' : ''}`}>
                                  {transaction.type === 'admin_withdrawal' || transaction.type === 'admin_refund' ? '- ' : '+ '}
                                  {formatKSH(transaction.amount)}
                                </span>
                              </td>
                              <td className="type-cell">
                                <span className={`type-badge ${transaction.type}`}>
                                  {transaction.type === 'commission' && 'Commission Earned'}
                                  {transaction.type === 'escrow_receive' && 'Escrow Deposit'}
                                  {transaction.type === 'admin_withdrawal' && 'Withdrawal'}
                                  {transaction.type === 'admin_refund' && 'Refund Sent'}
                                </span>
                              </td>
                              <td className="order-cell">
                                {transaction.order_id ? (
                                  <span className="order-id" title={transaction.order_id}>
                                    {transaction.order_id.slice(0, 12)}...
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="message-cell" title={transaction.description}>
                                {transaction.description?.slice(0, 50) || "—"}
                                {transaction.description?.length > 50 ? '...' : ''}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="pagination-btn"
                      >
                        <FiChevronLeft />
                        <span>Previous</span>
                      </button>
                      
                      <div className="pagination-info">
                        Page {page} of {totalPages}
                      </div>
                      
                      <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="pagination-btn"
                      >
                        <span>Next</span>
                        <FiChevronRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}

        {/* Escrow Management Tab */}
        {activeTab === 'escrow' && (
          <motion.div
            className="escrow-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="section-header">
              <h2>Escrow Holdings</h2>
              <p>Manage deposits held in escrow</p>
            </div>

            <div className="escrow-summary">
              <div className="summary-card">
                <div className="summary-icon blue">
                  <FaShieldAlt />
                </div>
                <div className="summary-details">
                  <span className="summary-label">Total in Escrow</span>
                  <span className="summary-value">{formatKSH(totalEscrow)}</span>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon orange">
                  <FiPackage />
                </div>
                <div className="summary-details">
                  <span className="summary-label">Active Orders</span>
                  <span className="summary-value">{escrowOrders.length}</span>
                </div>
              </div>
            </div>

            {escrowOrders.length === 0 ? (
              <div className="empty-state">
                <FaShieldAlt className="empty-icon" />
                <h3>No escrow holdings</h3>
                <p>All deposits have been released or refunded</p>
              </div>
            ) : (
              <>
                <div className="escrow-grid">
                  {paginatedEscrow.map((order) => {
                    const orderDate = new Date(order.created_at);
                    const daysInEscrow = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
                    const buyerPhone = order.buyer_phone || "Not provided";
                    const depositPaid = order.deposit_amount;
                    const remainingAmount = order.total_price - depositPaid;

                    return (
                      <motion.div
                        key={order.id}
                        className="escrow-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="escrow-card-header">
                          <div className="product-info">
                            {order.product?.image_gallery?.[0] && (
                              <img 
                                src={order.product.image_gallery[0]} 
                                alt={order.product.name}
                                className="product-thumb"
                              />
                            )}
                            <div className="product-details">
                              <h4 title={order.product?.name}>{order.product?.name?.slice(0, 30) || 'Unknown Product'}</h4>
                              <span className="product-category">{order.product?.category || 'Uncategorized'}</span>
                            </div>
                          </div>
                          <span className="escrow-amount">{formatKSH(order.total_price)}</span>
                        </div>

                        <div className="escrow-card-body">
                          <div className="payment-breakdown">
                            <div className="breakdown-item">
                              <span>Deposit (25%):</span>
                              <strong>{formatKSH(depositPaid)}</strong>
                            </div>
                            {!order.is_fully_paid && (
                              <div className="breakdown-item">
                                <span>Remaining:</span>
                                <strong>{formatKSH(remainingAmount)}</strong>
                              </div>
                            )}
                            {order.is_fully_paid && (
                              <div className="breakdown-item success">
                                <FiCheckCircle size={12} />
                                <span>Fully Paid</span>
                              </div>
                            )}
                          </div>

                          <div className="order-details">
                            <div className="detail-row">
                              <FiPackage />
                              <span>Order: {order.id.slice(0, 8)}...</span>
                            </div>
                            <div className="detail-row">
                              <FiSmartphone />
                              <span>Buyer: {buyerPhone}</span>
                            </div>
                            <div className="detail-row">
                              <FiClock />
                              <span>{daysInEscrow} days in escrow</span>
                            </div>
                          </div>

                          <div className="order-status">
                            <span className={`status-badge ${order.status}`}>
                              {order.status === 'deposit_paid' ? 'Deposit Paid' : 
                               order.status === 'balance_paid' ? 'Fully Paid' :
                               order.status === 'delivered' ? 'Delivered' : order.status}
                            </span>
                            {order.delivered && (
                              <span className="status-badge delivered">Delivered</span>
                            )}
                            {order.is_fully_paid && (
                              <span className="status-badge paid">Fully Paid</span>
                            )}
                          </div>
                        </div>

                        <div className="escrow-card-footer">
                          <button
                            className="refund-btn"
                            onClick={() => {
                              setSelectedOrder(order);
                              setRefundModalOpen(true);
                            }}
                            disabled={processingRefund}
                          >
                            <FiRotateCcw /> {processingRefund ? "Processing..." : "Refund Deposit"}
                          </button>
                          <button
                            className="details-btn"
                            onClick={() => {
                              toast.info(`Order ${order.id.slice(0, 8)} details: Status: ${order.status}, Total: ${formatKSH(order.total_price)}`);
                            }}
                          >
                            <FiEye /> Details
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {totalEscrowPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => setEscrowPage(p => Math.max(p - 1, 1))}
                      disabled={escrowPage === 1}
                      className="pagination-btn"
                    >
                      <FiChevronLeft />
                      <span>Previous</span>
                    </button>
                    
                    <div className="pagination-info">
                      Page {escrowPage} of {totalEscrowPages}
                    </div>
                    
                    <button
                      onClick={() => setEscrowPage(p => Math.min(p + 1, totalEscrowPages))}
                      disabled={escrowPage === totalEscrowPages}
                      className="pagination-btn"
                    >
                      <span>Next</span>
                      <FiChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Seller Payouts Tab */}
        {activeTab === 'payouts' && (
          <motion.div
            className="payouts-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="section-header">
              <h2>Pending Seller Payouts</h2>
              <p>Orders that are delivered and fully paid, waiting for payment to sellers</p>
            </div>

            {pendingSellerPayouts.length === 0 ? (
              <div className="empty-state">
                <FaHandHoldingUsd className="empty-icon" />
                <h3>No pending payouts</h3>
                <p>All sellers have been paid</p>
              </div>
            ) : (
              <div className="payouts-grid">
                {pendingSellerPayouts.map((order) => {
                  const sellerAmount = order.seller_amount;
                  const commissionAmount = order.commission_amount;
                  const commissionRate = order.commission_rate;

                  return (
                    <motion.div
                      key={order.id}
                      className="payout-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="payout-card-header">
                        <div className="product-info">
                          {order.product?.image_gallery?.[0] && (
                            <img 
                              src={order.product.image_gallery[0]} 
                              alt={order.product.name}
                              className="product-thumb"
                            />
                          )}
                          <div className="product-details">
                            <h4>{order.product?.name?.slice(0, 40) || 'Unknown Product'}</h4>
                            <span className="order-date">Order: {order.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="payout-card-body">
                        <div className="seller-info">
                          <div className="info-row">
                            <FiUser />
                            <span>{order.seller?.full_name || 'Unknown Seller'}</span>
                          </div>
                          <div className="info-row">
                            <FiSmartphone />
                            <span>{order.seller?.phone || 'No phone'}</span>
                          </div>
                          <div className="info-row">
                            <FiMail />
                            <span>{order.seller?.email || 'No email'}</span>
                          </div>
                        </div>

                        <div className="amount-breakdown">
                          <div className="breakdown-row">
                            <span>Total Order:</span>
                            <strong>{formatKSH(order.total_price)}</strong>
                          </div>
                          <div className="breakdown-row commission">
                            <span>Platform Fee ({(commissionRate * 100).toFixed(1)}%):</span>
                            <span className="commission-amount">- {formatKSH(commissionAmount)}</span>
                          </div>
                          <div className="breakdown-row seller-amount">
                            <span>Seller Receives:</span>
                            <strong className="seller-payout">{formatKSH(sellerAmount)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="payout-card-footer">
                        <button
                          className="release-btn"
                          onClick={() => releaseToSeller(order)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <><FiLoader className="animate-spin" /> Processing...</>
                          ) : (
                            <><FiSend /> Release {formatKSH(sellerAmount)} to Seller</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {withdrawModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="withdraw-modal"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="modal-header">
                <h3>Withdraw to M-Pesa (B2C)</h3>
                <button
                  className="close-btn"
                  onClick={() => setWithdrawModalOpen(false)}
                  disabled={processingWithdrawal}
                >
                  <FiXCircle />
                </button>
              </div>

              <div className="modal-body">
                <div className="security-notice">
                  <FiShield /> <span>B2C Transfer • Instant • Zero Fees</span>
                </div>

                <div className="balance-preview">
                  <span>Available Balance:</span>
                  <strong className="balance-amount">{formatKSH(balance)}</strong>
                </div>

                <div className="form-group">
                  <label>Amount to Withdraw *</label>
                  <div className="amount-input-group">
                    <span className="currency-symbol">KSH</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      min={MIN_WITHDRAWAL}
                      max={Math.min(balance, MAX_WITHDRAWAL)}
                      step="100"
                      disabled={processingWithdrawal}
                    />
                  </div>
                  <small>Min: KSH {MIN_WITHDRAWAL} • Max: KSH {Math.min(balance, MAX_WITHDRAWAL).toLocaleString()}</small>
                </div>

                <div className="form-group">
                  <label>M-Pesa Phone Number *</label>
                  <div className="phone-input-group">
                    <FiSmartphone className="input-icon" />
                    <input
                      type="tel"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="0712345678"
                      disabled={processingWithdrawal}
                      maxLength="10"
                    />
                  </div>
                  <small>Funds will be sent to this M-Pesa number</small>
                </div>

                <div className="info-box">
                  <FiInfo size={16} />
                  <p>
                    <strong>B2C Transfer:</strong> Funds will be sent from your Paybill to your M-Pesa account.
                    No STK push required - money will arrive instantly.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="cancel-btn"
                  onClick={() => setWithdrawModalOpen(false)}
                  disabled={processingWithdrawal}
                >
                  Cancel
                </button>
                <button
                  className="withdraw-btn"
                  onClick={handleB2CWithdrawal}
                  disabled={
                    processingWithdrawal || 
                    !withdrawAmount || 
                    Number(withdrawAmount) < MIN_WITHDRAWAL || 
                    Number(withdrawAmount) > Math.min(balance, MAX_WITHDRAWAL) ||
                    !withdrawPhone ||
                    withdrawPhone.length !== 10
                  }
                >
                  {processingWithdrawal ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Processing...
                    </>
                  ) : (
                    `Withdraw ${formatKSH(Number(withdrawAmount) || 0)} via B2C`
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {refundModalOpen && selectedOrder && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="refund-modal"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="modal-header">
                <h3>Refund Deposit to Buyer</h3>
                <button
                  className="close-btn"
                  onClick={() => setRefundModalOpen(false)}
                  disabled={processingRefund}
                >
                  <FiXCircle />
                </button>
              </div>

              <div className="modal-body">
                <div className="refund-preview">
                  <div className="preview-row">
                    <span>Product:</span>
                    <strong>{selectedOrder.product?.name || 'Unknown'}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Order ID:</span>
                    <code>{selectedOrder.id.slice(0, 12)}...</code>
                  </div>
                  <div className="preview-row">
                    <span>Buyer Phone:</span>
                    <strong>{selectedOrder.buyer_phone || 'Not provided'}</strong>
                  </div>
                  <div className="preview-row highlight">
                    <span>Refund Amount:</span>
                    <strong className="amount">{formatKSH(selectedOrder.deposit_amount)}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Refund Reason *</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    disabled={processingRefund}
                  >
                    <option value="">Select reason</option>
                    <option value="buyer_cancelled">Buyer Cancelled Order</option>
                    <option value="item_damaged">Item Damaged/Broken</option>
                    <option value="wrong_item">Wrong Item Sent</option>
                    <option value="item_not_received">Item Not Received</option>
                    <option value="seller_unresponsive">Seller Unresponsive</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {refundReason === 'other' && (
                  <div className="form-group">
                    <label>Specify Reason</label>
                    <textarea
                      placeholder="Please provide details..."
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      disabled={processingRefund}
                      rows="2"
                    />
                  </div>
                )}

                <div className="warning-box">
                  <FaExclamationTriangle />
                  <p>
                    This will refund the deposit to the buyer's M-Pesa account via B2C transfer.
                    The buyer will receive the money instantly. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="cancel-btn"
                  onClick={() => setRefundModalOpen(false)}
                  disabled={processingRefund}
                >
                  Cancel
                </button>
                <button
                  className="refund-btn"
                  onClick={processB2CRefund}
                  disabled={processingRefund || !refundReason}
                >
                  {processingRefund ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Processing...
                    </>
                  ) : (
                    'Process B2C Refund'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .b2c-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
        }
        
        .b2c-modal-content {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #00A74E;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .payment-instruction {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          color: #666;
        }
        
        .reference-text {
          font-size: 0.8rem;
          color: #999;
          margin-top: 0.5rem;
        }
        
        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
          font-size: 0.85rem;
        }
        
        .breakdown-item.success {
          color: #10b981;
        }
        
        .amount-breakdown {
          margin: 0.75rem 0;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
        }
        
        .breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          padding: 0.25rem 0;
        }
        
        .breakdown-row.commission {
          color: #f59e0b;
          border-top: 1px solid #e5e7eb;
          margin-top: 0.25rem;
          padding-top: 0.5rem;
        }
        
        .breakdown-row.seller-amount {
          font-weight: 600;
          margin-top: 0.25rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .seller-payout {
          color: #10b981;
          font-size: 1rem;
        }
        
        .release-btn {
          width: 100%;
          padding: 0.6rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        
        .release-btn:hover {
          background: #059669;
        }
        
        .release-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .payouts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1rem;
        }
        
        .payout-card {
          background: white;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          transition: all 0.2s;
        }
        
        .payout-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .payout-card-header {
          padding: 1rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .product-info {
          display: flex;
          gap: 0.75rem;
        }
        
        .product-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 0.5rem;
        }
        
        .product-details h4 {
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }
        
        .order-date {
          font-size: 0.7rem;
          color: #6b7280;
        }
        
        .payout-card-body {
          padding: 1rem;
        }
        
        .seller-info {
          margin-bottom: 1rem;
        }
        
        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #4b5563;
          padding: 0.25rem 0;
        }
        
        .payout-card-footer {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}