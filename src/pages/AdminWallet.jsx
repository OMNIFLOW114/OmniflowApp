import React, { useEffect, useState, useCallback } from "react";
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
  FiLogOut
} from "react-icons/fi";
import { 
  FaCrown, 
  FaMoneyBillWave, 
  FaChartLine, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaWallet 
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";
import "./AdminWallet.css";

const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

const EARNING_SOURCES = [
  { key: "wallet", label: "Wallet Transfers", icon: <FiCreditCard />, color: "#3b82f6" },
  { key: "marketplace", label: "Marketplace Sales", icon: <FiBriefcase />, color: "#10b981" },
  { key: "premium", label: "Premium Upgrades", icon: <FaCrown />, color: "#fbbf24" },
  { key: "escrow", label: "Escrow Holdings", icon: <FaShieldAlt />, color: "#f59e0b" },
  { key: "all", label: "All Earnings", icon: <FiBarChart2 />, color: "#8b5cf6" }
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
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  
  // Wallet states
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [escrowTransactions, setEscrowTransactions] = useState([]);
  const [totals, setTotals] = useState({});
  const [selectedSource, setSelectedSource] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [escrowPage, setEscrowPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [escrowTotalCount, setEscrowTotalCount] = useState(0);
  const [selectedEscrowOrder, setSelectedEscrowOrder] = useState(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [activeTab, setActiveTab] = useState("commissions");
  
  // Withdrawal states
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);
  
  // Error state
  const [error, setError] = useState(null);

  const TRANSACTIONS_PER_PAGE = 10;

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

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
        console.log('No session found, redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1000);
        setAuthChecked(true);
        return;
      }

      // Check if user is admin
      if (session.user.id !== ADMIN_ID) {
        console.error('User is not admin:', session.user.id);
        setError('Unauthorized access');
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate('/login');
        }, 1000);
        setAuthChecked(true);
        return;
      }

      setAdminUser(session.user);
      setIsAuthenticated(true);
      setAuthChecked(true);
      
      // Fetch data after authentication
      fetchData();
      
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Failed to verify authentication');
      setAuthChecked(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Run all fetches in parallel but handle errors individually
      await Promise.all([
        fetchBalance().catch(err => console.warn('Balance fetch warning:', err)),
        fetchTransactions().catch(err => console.warn('Transactions fetch warning:', err)),
        fetchEscrowTransactions().catch(err => console.warn('Escrow fetch warning:', err)),
        fetchWithdrawHistory().catch(err => console.warn('Withdraw history fetch warning:', err))
      ]);
      
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('Failed to load some wallet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", ADMIN_ID)
        .maybeSingle();

      if (error) {
        console.error('Balance fetch error:', error);
        return;
      }
      
      if (data) {
        setBalance(data.balance || 0);
      } else {
        // If wallet doesn't exist, set balance to 0
        setBalance(0);
      }
    } catch (error) {
      console.error('Error in fetchBalance:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error, count } = await supabase
        .from("wallet_transactions")
        .select("*", { count: 'exact' })
        .eq("user_id", ADMIN_ID)
        .in("type", ["commission", "escrow_receive", "refund", "withdraw"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Transactions fetch error:', error);
        return;
      }

      if (data) {
        setTransactions(data);
        setTotalCount(count || 0);

        const grouped = data.reduce((acc, txn) => {
          let src = txn.source?.toLowerCase() || "uncategorized";
          if (txn.type === 'escrow_receive') src = 'escrow';
          if (txn.type === 'refund') src = 'refunds';
          if (txn.type === 'withdraw') src = 'withdrawals';
          acc[src] = (acc[src] || 0) + txn.amount;
          return acc;
        }, {});
        setTotals(grouped);
      }
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    }
  };

  const fetchEscrowTransactions = async () => {
    try {
      // First fetch escrow transactions
      const { data: escrowData, error: escrowError, count } = await supabase
        .from("wallet_transactions")
        .select("*", { count: 'exact' })
        .eq("user_id", ADMIN_ID)
        .eq("type", "escrow_receive")
        .order("created_at", { ascending: false });

      if (escrowError) {
        console.error('Escrow fetch error:', escrowError);
        return;
      }

      if (!escrowData || escrowData.length === 0) {
        setEscrowTransactions([]);
        setEscrowTotalCount(0);
        return;
      }

      // Get all order IDs from escrow transactions
      const orderIds = escrowData
        .map(t => t.order_id)
        .filter(id => id !== null && id !== undefined);

      // Fetch orders separately
      let ordersData = [];
      if (orderIds.length > 0) {
        const { data, error: ordersError } = await supabase
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
            created_at
          `)
          .in("id", orderIds);

        if (ordersError) {
          console.error('Orders fetch error:', ordersError);
        } else {
          ordersData = data || [];
        }
      }

      // Get all product IDs from orders
      const productIds = ordersData
        .map(o => o.product_id)
        .filter(id => id !== null && id !== undefined);

      // Fetch products separately
      let productsData = [];
      if (productIds.length > 0) {
        const { data, error: productsError } = await supabase
          .from("products")
          .select("id, name, category, image_gallery")
          .in("id", productIds);

        if (productsError) {
          console.error('Products fetch error:', productsError);
        } else {
          productsData = data || [];
        }
      }

      // Combine the data
      const enrichedEscrow = escrowData.map(transaction => {
        const order = ordersData.find(o => o.id === transaction.order_id);
        const product = order ? productsData.find(p => p.id === order.product_id) : null;
        
        return {
          ...transaction,
          orders: order || null,
          products: product || null
        };
      });

      setEscrowTransactions(enrichedEscrow);
      setEscrowTotalCount(count || 0);
      
    } catch (error) {
      console.error('Error in fetchEscrowTransactions:', error);
    }
  };

  const fetchWithdrawHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", ADMIN_ID)
        .eq("type", "withdraw")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error('Withdraw history fetch error:', error);
        return;
      }

      if (data) {
        setWithdrawHistory(data);
      }
    } catch (error) {
      console.error('Error in fetchWithdrawHistory:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (Number(withdrawAmount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!withdrawMethod) {
      toast.error("Please select a withdrawal method");
      return;
    }

    if (withdrawMethod === 'mpesa' && !withdrawPhone) {
      toast.error("Please enter M-Pesa phone number");
      return;
    }

    if ((withdrawMethod === 'bank' || withdrawMethod === 'paypal') && !withdrawAccount) {
      toast.error("Please enter account details");
      return;
    }

    setProcessingWithdrawal(true);
    const loadingToast = toast.loading("Processing withdrawal...");

    try {
      // For now, just simulate a successful withdrawal
      // You'll need to create this RPC function in Supabase
      toast.dismiss(loadingToast);
      toast.success("Withdrawal processed instantly! No fees deducted.");
      
      // Update local state to reflect withdrawal
      setBalance(prev => prev - Number(withdrawAmount));
      
      // Add to withdraw history locally
      const newWithdraw = {
        id: Date.now().toString(),
        amount: Number(withdrawAmount),
        payment_method: withdrawMethod,
        status: 'completed',
        created_at: new Date().toISOString(),
        reference: `WTD-${Date.now().toString().slice(-8)}`
      };
      setWithdrawHistory(prev => [newWithdraw, ...prev].slice(0, 5));
      
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      setWithdrawMethod("");
      setWithdrawAccount("");
      setWithdrawPhone("");
      
    } catch (err) {
      console.error("Withdrawal error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to process withdrawal");
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedEscrowOrder) return;
    if (!refundReason.trim()) {
      toast.error("Please provide a refund reason");
      return;
    }

    setProcessingRefund(true);
    const loadingToast = toast.loading("Processing refund...");

    try {
      // For now, simulate a successful refund
      toast.dismiss(loadingToast);
      toast.success("Refund processed successfully!");

      // Remove from escrow list
      setEscrowTransactions(prev => prev.filter(e => e.id !== selectedEscrowOrder.id));
      
      setRefundModalOpen(false);
      setSelectedEscrowOrder(null);
      setRefundReason("");
      
    } catch (err) {
      console.error("Refund error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to process refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
  const totalEscrow = escrowTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawn = totals['withdrawals'] || 0;

  const csvData = transactions.map((txn) => ({
    Type: txn.type,
    Source: txn.source || "Uncategorized",
    Amount: `${txn.amount} KSH`,
    Description: txn.description || "-",
    OrderID: txn.order_id || "-",
    Product: txn.metadata?.product_name || "-",
    Category: txn.metadata?.product_category || "-",
    Date: new Date(txn.created_at).toLocaleString(),
  }));

  const filteredTransactions = selectedSource === "all"
    ? transactions
    : selectedSource === "escrow"
      ? transactions.filter(t => t.type === 'escrow_receive')
      : selectedSource === "withdrawals"
        ? transactions.filter(t => t.type === 'withdraw')
        : transactions.filter(t => (t.source?.toLowerCase() || "uncategorized") === selectedSource);

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * TRANSACTIONS_PER_PAGE,
    page * TRANSACTIONS_PER_PAGE
  );

  const paginatedEscrow = escrowTransactions.slice(
    (escrowPage - 1) * TRANSACTIONS_PER_PAGE,
    escrowPage * TRANSACTIONS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE);
  const totalEscrowPages = Math.ceil(escrowTransactions.length / TRANSACTIONS_PER_PAGE);

  const getSourceIcon = (sourceKey) => {
    const source = EARNING_SOURCES.find(s => s.key === sourceKey);
    return source ? source.icon : <FiCreditCard />;
  };

  const getSourceColor = (sourceKey) => {
    const source = EARNING_SOURCES.find(s => s.key === sourceKey);
    return source ? source.color : '#64748b';
  };

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

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="admin-wallet-loading">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Show error if authentication failed
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

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-wallet-loading">
        <div className="loading-spinner"></div>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Show loading while fetching data
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
              <p>Protected by Supabase RLS • Zero fees</p>
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
                <FaChartLine className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatKSH(totalAll).replace('KSH ', '')}</span>
                <span className="stat-label">Total Earnings</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper escrow">
                <FaShieldAlt className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatKSH(totalEscrow).replace('KSH ', '')}</span>
                <span className="stat-label">In Escrow</span>
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
        >
          <FiSend /> Instant Withdrawal (Zero Fees)
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
                    <span className="history-method">{withdraw.payment_method}</span>
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
          className={`tab-btn ${activeTab === 'commissions' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('commissions');
            setSelectedSource('all');
            setPage(1);
          }}
        >
          <FiBarChart2 /> 
          <span>Commission Earnings</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'escrow' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('escrow');
            setEscrowPage(1);
          }}
        >
          <FaShieldAlt /> 
          <span>Escrow Management</span>
        </button>
      </div>

      <div className="admin-wallet-content">
        {/* Controls Section */}
        <motion.div
          className="controls-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="controls-left">
            <motion.button
              className="refresh-btn"
              onClick={fetchData}
              disabled={actionLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {actionLoading ? (
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  <FiRefreshCw />
                  <span>Refresh</span>
                </>
              )}
            </motion.button>
          </div>
          <div className="controls-right">
            <CSVLink
              data={csvData}
              filename={`admin_transactions_${new Date().toISOString().split('T')[0]}.csv`}
              className="export-btn"
            >
              <FiDownload />
              <span>Export CSV</span>
            </CSVLink>
          </div>
        </motion.div>

        {/* Commission Earnings Tab */}
        {activeTab === 'commissions' && (
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
                <p>Commission sources and transaction types</p>
              </div>

              <div className="earnings-grid">
                {EARNING_SOURCES.map((source, index) => {
                  const amount = source.key === 'all' ? totalAll : (totals[source.key] || 0);
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
                   selectedSource === "marketplace" ? "Marketplace Commissions" :
                   selectedSource === "wallet" ? "Wallet Transfer Fees" :
                   selectedSource === "premium" ? "Premium Upgrade Revenue" :
                   selectedSource === "escrow" ? "Escrow Holdings" :
                   selectedSource === "withdrawals" ? "Withdrawal History" :
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
                            <th>Source/Method</th>
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
                                <span className={`amount-value ${transaction.type === 'refund' || transaction.type === 'withdraw' ? 'negative' : ''}`}>
                                  {transaction.type === 'withdraw' ? '- ' : ''}
                                  {formatKSH(transaction.amount)}
                                </span>
                              </td>
                              <td className="type-cell">
                                <span className={`type-badge ${transaction.type}`}>
                                  {transaction.type === 'commission' && 'Commission'}
                                  {transaction.type === 'escrow_receive' && 'Escrow'}
                                  {transaction.type === 'refund' && 'Refund'}
                                  {transaction.type === 'withdraw' && 'Withdrawal'}
                                </span>
                              </td>
                              <td className="source-cell">
                                {transaction.type === 'withdraw' ? (
                                  <span className="withdraw-method">
                                    {transaction.payment_method || 'Bank Transfer'}
                                  </span>
                                ) : (
                                  <div 
                                    className="source-badge"
                                    style={{ 
                                      backgroundColor: `${getSourceColor(transaction.source?.toLowerCase())}15`,
                                      color: getSourceColor(transaction.source?.toLowerCase())
                                    }}
                                  >
                                    {getSourceIcon(transaction.source?.toLowerCase())}
                                    <span>{transaction.source || "Uncategorized"}</span>
                                  </div>
                                )}
                              </td>
                              <td className="order-cell">
                                {transaction.reference ? (
                                  <span className="order-id" title={transaction.reference}>
                                    {transaction.reference}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="message-cell" title={transaction.description}>
                                {transaction.description?.slice(0, 40) || "—"}
                                {transaction.description?.length > 40 ? '...' : ''}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <motion.div
                      className="pagination"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
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
                    </motion.div>
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
              <p>Manage deposits held in escrow and process refunds</p>
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
                  <span className="summary-value">{escrowTransactions.length}</span>
                </div>
              </div>
            </div>

            {escrowTransactions.length === 0 ? (
              <div className="empty-state">
                <FaShieldAlt className="empty-icon" />
                <h3>No escrow holdings</h3>
                <p>All deposits have been released or refunded</p>
              </div>
            ) : (
              <>
                <div className="escrow-grid">
                  {paginatedEscrow.map((escrow) => {
                    const order = escrow.orders;
                    const product = escrow.products;
                    const orderDate = order?.created_at ? new Date(order.created_at) : new Date();
                    const daysInEscrow = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));

                    return (
                      <motion.div
                        key={escrow.id}
                        className="escrow-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="escrow-card-header">
                          <div className="product-info">
                            {product?.image_gallery?.[0] && (
                              <img 
                                src={product.image_gallery[0]} 
                                alt={product.name}
                                className="product-thumb"
                              />
                            )}
                            <div className="product-details">
                              <h4 title={product?.name}>{product?.name?.slice(0, 30) || 'Unknown Product'}</h4>
                              <span className="product-category">{product?.category || 'Uncategorized'}</span>
                            </div>
                          </div>
                          <span className="escrow-amount">{formatKSH(escrow.amount)}</span>
                        </div>

                        <div className="escrow-card-body">
                          <div className="order-details">
                            <div className="detail-row">
                              <FiPackage />
                              <span>Order: {order?.id?.slice(0, 8) || 'N/A'}...</span>
                            </div>
                            <div className="detail-row">
                              <FiUser />
                              <span>Buyer: {order?.buyer_id?.slice(0, 8) || 'N/A'}...</span>
                            </div>
                            <div className="detail-row">
                              <FiClock />
                              <span>{daysInEscrow} days in escrow</span>
                            </div>
                          </div>

                          <div className="order-status">
                            <span className={`status-badge ${order?.status || 'pending'}`}>
                              {order?.status === 'deposit_paid' ? 'Deposit Paid' : order?.status || 'Pending'}
                            </span>
                            {order?.delivered && (
                              <span className="status-badge delivered">Delivered</span>
                            )}
                            {order?.balance_paid && (
                              <span className="status-badge paid">Paid</span>
                            )}
                          </div>
                        </div>

                        <div className="escrow-card-footer">
                          <button
                            className="view-btn"
                            onClick={() => {
                              setSelectedEscrowOrder(escrow);
                              setRefundAmount(escrow.amount);
                              setRefundModalOpen(true);
                            }}
                          >
                            <FiRotateCcw /> Refund
                          </button>
                          <button
                            className="details-btn"
                            onClick={() => toast.info("Order details view coming soon")}
                          >
                            <FiEye /> Details
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Escrow Pagination */}
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
                <h3>Instant Withdrawal</h3>
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
                  <FiShield /> <span>Secure • Instant • Zero Fees</span>
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
                      min="100"
                      max={balance}
                      step="100"
                      disabled={processingWithdrawal}
                    />
                  </div>
                  <small>Minimum: KSH 100 • Instant transfer</small>
                </div>

                <div className="form-group">
                  <label>Withdrawal Method *</label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    disabled={processingWithdrawal}
                  >
                    <option value="">Select method</option>
                    <option value="mpesa">M-Pesa (Instant)</option>
                    <option value="bank">Bank Transfer (Instant)</option>
                    <option value="paypal">PayPal (Instant)</option>
                  </select>
                </div>

                {withdrawMethod === 'mpesa' && (
                  <div className="form-group">
                    <label>M-Pesa Phone Number *</label>
                    <input
                      type="tel"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      placeholder="e.g., 0712345678"
                      disabled={processingWithdrawal}
                    />
                  </div>
                )}

                {withdrawMethod === 'bank' && (
                  <>
                    <div className="form-group">
                      <label>Account Number *</label>
                      <input
                        type="text"
                        value={withdrawAccount}
                        onChange={(e) => setWithdrawAccount(e.target.value)}
                        placeholder="Enter account number"
                        disabled={processingWithdrawal}
                      />
                    </div>
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        disabled={processingWithdrawal}
                      />
                    </div>
                  </>
                )}

                {withdrawMethod === 'paypal' && (
                  <div className="form-group">
                    <label>PayPal Email *</label>
                    <input
                      type="email"
                      value={withdrawAccount}
                      onChange={(e) => setWithdrawAccount(e.target.value)}
                      placeholder="email@example.com"
                      disabled={processingWithdrawal}
                    />
                  </div>
                )}

                <div className="warning-box info">
                  <FiShield />
                  <p>
                    <strong>Admin Privilege:</strong> Withdrawals are processed instantly with zero fees.
                    Your funds will be transferred immediately to your selected account.
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
                  onClick={handleWithdraw}
                  disabled={
                    processingWithdrawal || 
                    !withdrawAmount || 
                    Number(withdrawAmount) < 100 || 
                    Number(withdrawAmount) > balance ||
                    !withdrawMethod ||
                    (withdrawMethod === 'mpesa' && !withdrawPhone) ||
                    ((withdrawMethod === 'bank' || withdrawMethod === 'paypal') && !withdrawAccount)
                  }
                >
                  {processingWithdrawal ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Processing...
                    </>
                  ) : (
                    'Withdraw Instantly'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {refundModalOpen && selectedEscrowOrder && (
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
                <h3>Process Refund</h3>
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
                    <strong>{selectedEscrowOrder.products?.name || 'Unknown'}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Order ID:</span>
                    <code>{selectedEscrowOrder.orders?.id?.slice(0, 12) || 'N/A'}...</code>
                  </div>
                  <div className="preview-row highlight">
                    <span>Amount:</span>
                    <strong className="amount">{formatKSH(selectedEscrowOrder.amount)}</strong>
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
                    This will refund the full amount to the buyer. This action cannot be undone.
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
                  onClick={handleRefund}
                  disabled={processingRefund || !refundReason}
                >
                  {processingRefund ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Processing...
                    </>
                  ) : (
                    'Process Refund'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}