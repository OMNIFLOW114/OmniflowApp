// src/pages/admin/AdminWallet.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiDownload, FiCreditCard, FiBriefcase, FiPercent, FiBarChart2, FiDollarSign,
  FiChevronLeft, FiChevronRight, FiRefreshCw, FiCalendar, FiUser, FiShoppingBag,
  FiTrendingUp, FiShield, FiAlertCircle, FiCheckCircle, FiXCircle, FiEye,
  FiPackage, FiClock, FiRotateCcw, FiSend, FiLock, FiLogOut, FiSmartphone,
  FiInfo, FiLoader, FiMenu, FiBell, FiHome, FiUsers, FiSettings, FiMessageSquare,
  FiShoppingCart, FiTag, FiCreditCard as FiCreditCardIcon, FiDatabase, FiAward,
  FiClipboard, FiUserPlus, FiActivity, FiStar, FiFileText, FiMail
} from "react-icons/fi";
import { 
  FaCrown, FaMoneyBillWave, FaChartLine, FaShieldAlt, FaExclamationTriangle, 
  FaWallet, FaHandHoldingUsd, FaStore, FaShieldAlt as FaShieldAltIcon
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { CSVLink } from "react-csv";
import "./AdminWallet.css";

const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

const EARNING_SOURCES = [
  { key: "commission", label: "Total Commission", icon: <FiPercent />, color: "#8b5cf6" },
  { key: "escrow", label: "Escrow Balance", icon: <FaShieldAltIcon />, color: "#f59e0b" },
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

// Skeleton Components
const SidebarSkeleton = ({ collapsed }) => (
  <div className={`modern-sidebar ${collapsed ? "collapsed" : ""}`}>
    <div className="modern-sidebar-brand">
      <div className="sk-pulse" style={{ width: 40, height: 40, borderRadius: 12 }} />
      {!collapsed && <div className="sk-pulse" style={{ width: 100, height: 16, marginLeft: 12 }} />}
      <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: 6, marginLeft: "auto" }} />
    </div>
    <div className="modern-sidebar-nav">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="nav-item-skeleton">
          <div className="sk-pulse" style={{ width: 24, height: 24, borderRadius: 6 }} />
          {!collapsed && <div className="sk-pulse" style={{ width: "70%", height: 14 }} />}
        </div>
      ))}
    </div>
  </div>
);

export default function AdminWalletDashboard() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  
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

  // Role colors
  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)", accent: "rgba(245,158,11,0.15)" },
    admin: { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)", accent: "rgba(239,68,68,0.15)" },
    moderator: { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)", accent: "rgba(99,102,241,0.15)" },
    support: { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)", accent: "rgba(16,185,129,0.15)" },
  };

  const getRoleColor = (role) => roleColors[role] || roleColors.moderator;

  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", path: "/admin-dashboard", perm: "view_dashboard" },
    { icon: <FiUsers />, title: "User Management", path: "/admin/users", perm: "manage_users" },
    { icon: <FaStore />, title: "Store Management", path: "/admin/stores", perm: "manage_stores" },
    { icon: <FiShoppingCart />, title: "Products", path: "/admin/products", perm: "manage_products" },
    { icon: <FiTag />, title: "Categories", path: "/admin/categories", perm: "manage_categories" },
    { icon: <FiMessageSquare />, title: "Messages", path: "/admin/messages", perm: "manage_messages" },
    { icon: <FiDollarSign />, title: "Finance", path: "/admin/finance", perm: "manage_finance" },
    { icon: <FiCreditCardIcon />, title: "Wallets", path: "/admin/wallet", perm: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings", perm: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments", perm: "manage_installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports", perm: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Users", path: "/admin/admins", perm: "manage_admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings", perm: "manage_settings" },
    { icon: <FiDatabase />, title: "Database", path: "/admin/database", perm: "manage_database" },
    { icon: <FiAward />, title: "Promotions", path: "/admin/promotions", perm: "manage_promotions" },
  ];

  // Permission check
  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (data) {
        setCurrentAdmin(data);
        const hasPerm = data.role === "super_admin" || data.permissions?.includes("manage_wallets") || data.permissions?.includes("all");
        if (!hasPerm) {
          toast.error("You don't have permission to access wallet");
          navigate("/admin-dashboard", { replace: true });
          return false;
        }
        setHasAccess(true);
        return true;
      }
      navigate("/admin-dashboard", { replace: true });
      return false;
    } catch {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
  }, [user, navigate]);

  // Check authentication on mount
  useEffect(() => {
    const init = async () => {
      const ok = await checkAdminAccess();
      setAccessChecked(true);
      if (ok) await fetchData();
    };
    init();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!hasAccess) return;
    
    const walletChannel = supabase
      .channel(`admin_wallet_${ADMIN_ID}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${ADMIN_ID}` }, (payload) => {
        if (payload.new?.balance !== undefined) setBalance(payload.new.balance);
      })
      .subscribe();
    
    const transactionsChannel = supabase
      .channel(`admin_transactions_${ADMIN_ID}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${ADMIN_ID}` }, () => fetchData())
      .subscribe();
    
    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [hasAccess]);

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
    const { data, error } = await supabase.from("wallets").select("balance").eq("user_id", ADMIN_ID).maybeSingle();
    if (!error && data) setBalance(data.balance || 0);
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
    const { data, error } = await supabase
      .from("orders")
      .select(`id, buyer_id, seller_id, product_id, status, delivered, balance_paid, deposit_amount, total_price, delivery_location, buyer_phone, created_at, products:product_id (name, category, image_gallery)`)
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
    const { data, error } = await supabase
      .from("orders")
      .select(`id, buyer_id, seller_id, product_id, total_price, commission_amount, commission_rate, status, delivered, balance_paid, created_at, products:product_id (name, category, image_gallery), seller:users!orders_seller_id_fkey (id, full_name, email, phone)`)
      .eq("delivered", true)
      .eq("balance_paid", true)
      .eq("escrow_released", false)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const enriched = await Promise.all(data.map(async (order) => {
        const { data: commissionData } = await supabase.rpc('calculate_order_commission', { p_product_id: order.product_id, p_total_amount: order.total_price });
        const commission = commissionData?.[0] || { commission_rate: order.commission_rate || 0.09, commission_amount: order.commission_amount || (order.total_price * 0.09), seller_amount: order.total_price - (order.commission_amount || (order.total_price * 0.09)) };
        return { ...order, product: order.products?.[0] || null, seller: order.seller?.[0] || null, seller_amount: commission.seller_amount, commission_rate: commission.commission_rate, commission_amount: commission.commission_amount };
      }));
      setPendingSellerPayouts(enriched);
    }
  };

  const fetchWithdrawHistory = async () => {
    const { data, error } = await supabase.from("wallet_transactions").select("*").eq("user_id", ADMIN_ID).eq("type", "admin_withdrawal").order("created_at", { ascending: false }).limit(10);
    if (!error && data) setWithdrawHistory(data);
  };

  const releaseToSeller = async (order) => {
    if (!order?.id) return;
    setActionLoading(true);
    const loadingToast = toast.loading(`Processing seller payout...`);
    try {
      const { data, error } = await supabase.rpc('release_escrow_to_seller', { p_order: order.id });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Payout failed');
      toast.dismiss(loadingToast);
      toast.success(<div><strong>Payment Released!</strong><br /><small>Seller received: {formatKSH(data.seller_amount)}</small><br /><small>Platform commission: {formatKSH(data.commission_amount)} ({Math.round(data.commission_rate * 100)}%)</small></div>, { duration: 5000 });
      await fetchData();
    } catch (err) {
      console.error("Payout error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to release payment to seller");
    } finally {
      setActionLoading(false);
    }
  };

  const handleB2CWithdrawal = async () => {
    const amountNum = Number(withdrawAmount);
    if (!withdrawAmount || amountNum < MIN_WITHDRAWAL) { toast.error(`Minimum withdrawal amount is KSH ${MIN_WITHDRAWAL}`); return; }
    if (amountNum > MAX_WITHDRAWAL) { toast.error(`Maximum withdrawal amount is KSH ${MAX_WITHDRAWAL}`); return; }
    if (amountNum > balance) { toast.error("Insufficient balance"); return; }
    if (!withdrawPhone || !/^0[17]\d{8}$/.test(withdrawPhone)) { toast.error("Please enter a valid M-Pesa phone number"); return; }

    setProcessingWithdrawal(true);
    setB2cStep(2);
    setB2cType('withdrawal');
    setB2cAmount(amountNum);
    setB2cPhone(withdrawPhone);
    const loadingToast = toast.loading("Processing withdrawal...");

    try {
      const { data, error } = await supabase.functions.invoke('mpesa/b2c', { body: { amount: amountNum, phoneNumber: withdrawPhone, type: 'withdrawal', reason: 'Admin withdrawal' } });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Withdrawal failed');
      setB2cCheckoutId(data.conversationID);
      await supabase.from("wallet_transactions").insert({ user_id: ADMIN_ID, type: 'admin_withdrawal', amount: amountNum, status: 'completed', description: `Withdrawal to ${withdrawPhone} via B2C`, metadata: { phone: withdrawPhone, conversation_id: data.conversationID, receipt: data.receipt }, created_at: new Date().toISOString() });
      await supabase.from("wallets").update({ balance: balance - amountNum, updated_at: new Date().toISOString() }).eq("user_id", ADMIN_ID);
      setBalance(balance - amountNum);
      toast.dismiss(loadingToast);
      toast.success(`Withdrawal initiated!\nAmount: ${formatKSH(amountNum)}\nWill be sent to ${withdrawPhone}`, { duration: 5000 });
      setTimeout(() => { setWithdrawModalOpen(false); setWithdrawAmount(""); setWithdrawPhone(""); setB2cStep(1); setProcessingWithdrawal(false); fetchData(); }, 2000);
    } catch (err) {
      console.error("Withdrawal error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to process withdrawal");
      setB2cStep(1);
      setProcessingWithdrawal(false);
    }
  };

  const processB2CRefund = async () => {
    if (!selectedOrder) return;
    if (!refundReason.trim()) { toast.error("Please provide a refund reason"); return; }
    const buyerPhone = selectedOrder.buyer_phone;
    if (!buyerPhone || !/^0[17]\d{8}$/.test(buyerPhone)) { toast.error("Invalid buyer phone number"); return; }

    setProcessingRefund(true);
    setB2cStep(2);
    setB2cType('refund');
    setB2cAmount(selectedOrder.deposit_amount);
    setB2cPhone(buyerPhone);
    const loadingToast = toast.loading("Processing refund...");

    try {
      const { data, error } = await supabase.functions.invoke('mpesa/b2c', { body: { amount: selectedOrder.deposit_amount, phoneNumber: buyerPhone, type: 'refund', orderId: selectedOrder.id, reason: refundReason } });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Refund failed');
      setB2cCheckoutId(data.conversationID);
      await supabase.from("orders").update({ status: 'refunded', refunded_at: new Date().toISOString(), refund_reason: refundReason, refund_receipt: data.conversationID, updated_at: new Date().toISOString() }).eq("id", selectedOrder.id);
      await supabase.from("wallet_transactions").insert({ user_id: ADMIN_ID, type: 'admin_refund', amount: selectedOrder.deposit_amount, status: 'completed', order_id: selectedOrder.id, description: `Refund to buyer ${buyerPhone} for order ${selectedOrder.id.slice(0, 8)}`, metadata: { buyer_phone: buyerPhone, refund_reason: refundReason, conversation_id: data.conversationID }, created_at: new Date().toISOString() });
      await supabase.from("wallets").update({ balance: balance - selectedOrder.deposit_amount, updated_at: new Date().toISOString() }).eq("user_id", ADMIN_ID);
      setBalance(balance - selectedOrder.deposit_amount);
      toast.dismiss(loadingToast);
      toast.success(`Refund initiated!\nAmount: ${formatKSH(selectedOrder.deposit_amount)}\nWill be sent to buyer: ${buyerPhone}`, { duration: 5000 });
      setTimeout(() => { setRefundModalOpen(false); setSelectedOrder(null); setRefundReason(""); setB2cStep(1); setProcessingRefund(false); fetchData(); }, 2000);
    } catch (err) {
      console.error("Refund error:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to process refund");
      setB2cStep(1);
      setProcessingRefund(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const totalCommission = totals.commission || 0;
  const totalEscrow = balance;
  const totalWithdrawn = totals.withdrawals || 0;
  const totalRefunds = totals.refunds || 0;

  const csvData = transactions.map((txn) => ({
    Type: txn.type === 'commission' ? 'Commission Earned' : txn.type === 'escrow_receive' ? 'Escrow Received' : txn.type === 'admin_withdrawal' ? 'Withdrawal' : txn.type === 'admin_refund' ? 'Refund Sent' : txn.type,
    Amount: `${txn.amount} KSH`,
    Description: txn.description || "-",
    OrderID: txn.order_id || "-",
    Date: new Date(txn.created_at).toLocaleString(),
  }));

  const filteredTransactions = selectedSource === "all" ? transactions : transactions.filter(t => {
    if (selectedSource === 'commission') return t.type === 'commission';
    if (selectedSource === 'escrow') return t.type === 'escrow_receive';
    if (selectedSource === 'withdrawals') return t.type === 'admin_withdrawal';
    if (selectedSource === 'refunds') return t.type === 'admin_refund';
    return true;
  });

  const paginatedTransactions = filteredTransactions.slice((page - 1) * TRANSACTIONS_PER_PAGE, page * TRANSACTIONS_PER_PAGE);
  const paginatedEscrow = escrowOrders.slice((escrowPage - 1) * TRANSACTIONS_PER_PAGE, escrowPage * TRANSACTIONS_PER_PAGE);
  const totalPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE);
  const totalEscrowPages = Math.ceil(escrowOrders.length / TRANSACTIONS_PER_PAGE);
  const formatDate = (dateString) => { if (!dateString) return "N/A"; try { return new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return "Invalid date"; } };

  // Loading skeleton
  if (!accessChecked || !hasAccess || loading) {
    return (
      <div className={`wallet-modern-root ${darkMode ? "dark" : ""}`}>
        <SidebarSkeleton collapsed={sidebarCollapsed} />
        <main className="modern-main" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
          <div className="modern-topbar">
            <div className="topbar-left">
              <div className="sk-pulse" style={{ width: 120, height: 24, borderRadius: 6 }} />
              <div className="sk-pulse" style={{ width: 200, height: 14, marginTop: 4 }} />
            </div>
            <div className="topbar-right">
              <div className="sk-pulse" style={{ width: 180, height: 36, borderRadius: 40 }} />
              <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
            </div>
          </div>
          <div className="modern-content">
            <div className="stats-row">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="stat-block skeleton">
                  <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
                  <div><div className="sk-pulse" style={{ width: 60, height: 28 }} /><div className="sk-pulse" style={{ width: 80, height: 14, marginTop: 4 }} /></div>
                </div>
              ))}
            </div>
            <div className="tabs-pill">
              {[1, 2, 3].map(i => <div key={i} className="sk-pulse" style={{ width: 120, height: 36, borderRadius: 40 }} />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

  return (
    <div className={`wallet-modern-root ${darkMode ? "dark" : ""}`}>
      {/* B2C Processing Modal */}
      {b2cStep === 2 && (
        <div className="b2c-modal-overlay">
          <div className="b2c-modal-content">
            <div className="payment-loader">
              <div className="spinner"></div>
              <p>{b2cType === 'withdrawal' ? 'Processing Withdrawal...' : 'Processing Refund...'}</p>
              <p className="payment-instruction">{b2cType === 'withdrawal' ? `Please wait. Funds will be sent to ${b2cPhone}` : `Please wait. Refund will be sent to buyer's phone: ${b2cPhone}`}</p>
              <p className="payment-instruction">Amount: {formatKSH(b2cAmount)}</p>
              {b2cCheckoutId && <p className="reference-text">Reference: {b2cCheckoutId.slice(-8)}</p>}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div className="sidebar-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`modern-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="modern-sidebar-brand">
          <div className="brand-logo" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
            {isSuperAdmin ? <FaCrown /> : <FaShieldAltIcon />}
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">OmniFlow</div>
              <div className="brand-role">{isSuperAdmin ? "Super Admin" : "Admin Panel"}</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)}>
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="modern-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/wallet" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => navigate(module.path)}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
            </button>
          ))}
        </nav>

        <div className="modern-sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="profile-name">{currentAdmin?.email?.split("@")[0] || "Admin"}</div>
                <div className="profile-role" style={{ color: rc.primary }}>{currentAdmin?.role?.replace("_", " ")}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut /> {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="modern-main" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
        <header className="modern-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu /></button>
            <div>
              <h1>Admin Wallet</h1>
              <p>Protected by Supabase RLS • B2C Enabled</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="security-badge">
              <FiShield /> Secure Session
            </div>
            <button className="theme-toggle" onClick={toggleDarkMode}>{darkMode ? "☀️" : "🌙"}</button>
            <div className="role-badge">
              <div className="role-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown /> : <FaShieldAltIcon />}
              </div>
              <div>
                <span className="role-name" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase()}</span>
                <span className="role-status">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="modern-content">
          {/* Stats Cards */}
          <div className="stats-row">
            <div className="stat-block stat-block-primary">
              <div className="stat-icon"><FiDollarSign /></div>
              <div><span className="stat-value">{formatKSH(balance).replace('KSH ', '')}</span><span className="stat-label">Available Balance</span></div>
            </div>
            <div className="stat-block stat-block-success">
              <div className="stat-icon"><FiPercent /></div>
              <div><span className="stat-value">{formatKSH(totalCommission).replace('KSH ', '')}</span><span className="stat-label">Total Commission</span></div>
            </div>
            <div className="stat-block stat-block-warning">
              <div className="stat-icon"><FaShieldAltIcon /></div>
              <div><span className="stat-value">{formatKSH(totalEscrow).replace('KSH ', '')}</span><span className="stat-label">Escrow Balance</span></div>
            </div>
            <div className="stat-block stat-block-danger withdraw-stat" onClick={() => setWithdrawModalOpen(true)}>
              <div className="stat-icon"><FiSend /></div>
              <div><span className="stat-value">{formatKSH(totalWithdrawn).replace('KSH ', '')}</span><span className="stat-label">Total Withdrawn</span></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="withdraw-btn-primary" onClick={() => setWithdrawModalOpen(true)} disabled={processingWithdrawal}>
              <FiSend /> {processingWithdrawal ? "Processing..." : "Withdraw to M-Pesa (B2C)"}
            </button>
            <button className="history-btn-secondary" onClick={() => setShowWithdrawHistory(!showWithdrawHistory)}>
              <FiClock /> {showWithdrawHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          {/* Withdraw History */}
          <AnimatePresence>
            {showWithdrawHistory && withdrawHistory.length > 0 && (
              <motion.div className="withdraw-history-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <h4>Recent Withdrawals</h4>
                <div className="history-list">
                  {withdrawHistory.map((withdraw) => (
                    <div key={withdraw.id} className="history-item">
                      <div className="history-icon"><FiSend /></div>
                      <div className="history-details"><span className="history-amount">{formatKSH(withdraw.amount)}</span><span className="history-method">M-Pesa (B2C)</span><span className="history-date">{formatDate(withdraw.created_at)}</span></div>
                      <span className={`history-status ${withdraw.status}`}>{withdraw.status}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="tabs-pill">
            <button className={`pill ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><FiBarChart2 /> Overview</button>
            <button className={`pill ${activeTab === 'escrow' ? 'active' : ''}`} onClick={() => setActiveTab('escrow')}><FaShieldAltIcon /> Escrow ({escrowOrders.length})</button>
            <button className={`pill ${activeTab === 'payouts' ? 'active' : ''}`} onClick={() => setActiveTab('payouts')}><FaHandHoldingUsd /> Seller Payouts ({pendingSellerPayouts.length})</button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Earnings Breakdown */}
              <div className="section-header"><h2>Earnings Breakdown</h2><p>Platform commission and transaction summary</p></div>
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
                    <div key={source.key} className={`earning-card ${selectedSource === source.key ? 'selected' : ''}`} onClick={() => { setSelectedSource(source.key); setPage(1); }}>
                      <div className="card-header"><div className="source-icon" style={{ backgroundColor: `${source.color}15`, color: source.color }}>{source.icon}</div><div className="source-info"><h3>{source.label}</h3><span className="amount">{formatKSH(amount)}</span></div></div>
                      <div className="card-footer"><div className="percentage"><FiPercent className="percent-icon" /><span>{percent}%</span></div>{selectedSource === source.key && <div className="selected-indicator"></div>}</div>
                    </div>
                  );
                })}
              </div>

              {/* Transactions Table */}
              <div className="section-header"><h2>{selectedSource === "all" ? "All Transactions" : selectedSource === "commission" ? "Commission Transactions" : selectedSource === "escrow" ? "Escrow Transactions" : selectedSource === "withdrawals" ? "Withdrawal History" : "Refund History"}</h2><span className="count-badge">{filteredTransactions.length} transactions</span></div>
              {filteredTransactions.length === 0 ? (
                <div className="empty-state"><FiDollarSign className="empty-icon" /><h3>No transactions found</h3><p>No transactions available for the selected source</p></div>
              ) : (
                <>
                  <div className="transactions-table"><div className="table-container"><table><thead><tr><th>Date & Time</th><th>Amount</th><th>Type</th><th>Reference</th><th>Description</th></tr></thead><tbody>{paginatedTransactions.map((transaction, idx) => (<tr key={transaction.id}><td className="date-cell"><FiCalendar className="date-icon" />{formatDate(transaction.created_at)}</td><td className="amount-cell"><span className={`amount-value ${transaction.type === 'admin_withdrawal' || transaction.type === 'admin_refund' ? 'negative' : ''}`}>{transaction.type === 'admin_withdrawal' || transaction.type === 'admin_refund' ? '- ' : '+ '}{formatKSH(transaction.amount)}</span></td><td><span className={`type-badge ${transaction.type}`}>{transaction.type === 'commission' && 'Commission'}{transaction.type === 'escrow_receive' && 'Escrow'}{transaction.type === 'admin_withdrawal' && 'Withdrawal'}{transaction.type === 'admin_refund' && 'Refund'}</span></td><td className="order-cell">{transaction.order_id ? <span className="order-id" title={transaction.order_id}>{transaction.order_id.slice(0, 12)}...</span> : "—"}</td><td className="message-cell" title={transaction.description}>{transaction.description?.slice(0, 50) || "—"}{transaction.description?.length > 50 ? '...' : ''}</td></tr>))}</tbody></table></div></div>
                  {totalPages > 1 && (<div className="pagination"><button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}><FiChevronLeft /> Previous</button><span>Page {page} of {totalPages}</span><button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next <FiChevronRight /></button></div>)}
                </>
              )}
            </>
          )}

          {/* Escrow Tab */}
          {activeTab === 'escrow' && (
            <>
              <div className="section-header"><h2>Escrow Holdings</h2><p>Manage deposits held in escrow</p></div>
              <div className="escrow-summary"><div className="summary-card"><div className="summary-icon blue"><FaShieldAltIcon /></div><div><span className="summary-label">Total in Escrow</span><span className="summary-value">{formatKSH(totalEscrow)}</span></div></div><div className="summary-card"><div className="summary-icon orange"><FiPackage /></div><div><span className="summary-label">Active Orders</span><span className="summary-value">{escrowOrders.length}</span></div></div></div>
              {escrowOrders.length === 0 ? (<div className="empty-state"><FaShieldAltIcon className="empty-icon" /><h3>No escrow holdings</h3><p>All deposits have been released or refunded</p></div>) : (
                <>
                  <div className="escrow-grid">{paginatedEscrow.map((order) => (<div key={order.id} className="escrow-card"><div className="escrow-card-header"><div className="product-info">{order.product?.image_gallery?.[0] && <img src={order.product.image_gallery[0]} alt={order.product.name} className="product-thumb" />}<div><h4>{order.product?.name?.slice(0, 30) || 'Unknown Product'}</h4><span className="product-category">{order.product?.category || 'Uncategorized'}</span></div></div><span className="escrow-amount">{formatKSH(order.total_price)}</span></div><div className="escrow-card-body"><div className="payment-breakdown"><div className="breakdown-item"><span>Deposit (25%):</span><strong>{formatKSH(order.deposit_amount)}</strong></div>{!order.is_fully_paid && <div className="breakdown-item"><span>Remaining:</span><strong>{formatKSH(order.remaining_amount)}</strong></div>}{order.is_fully_paid && <div className="breakdown-item success"><FiCheckCircle /> Fully Paid</div>}</div><div className="order-details"><div className="detail-row"><FiPackage /><span>Order: {order.id.slice(0, 8)}...</span></div><div className="detail-row"><FiSmartphone /><span>Buyer: {order.buyer_phone || "Not provided"}</span></div><div className="detail-row"><FiClock /><span>{Math.floor((new Date() - new Date(order.created_at)) / (1000 * 60 * 60 * 24))} days in escrow</span></div></div><div className="order-status"><span className={`status-badge ${order.status}`}>{order.status === 'deposit_paid' ? 'Deposit Paid' : order.status === 'balance_paid' ? 'Fully Paid' : order.status === 'delivered' ? 'Delivered' : order.status}</span>{order.delivered && <span className="status-badge delivered">Delivered</span>}{order.is_fully_paid && <span className="status-badge paid">Fully Paid</span>}</div></div><div className="escrow-card-footer"><button className="refund-btn" onClick={() => { setSelectedOrder(order); setRefundModalOpen(true); }} disabled={processingRefund}><FiRotateCcw /> Refund Deposit</button><button className="details-btn" onClick={() => toast.info(`Order ${order.id.slice(0, 8)} details: Status: ${order.status}, Total: ${formatKSH(order.total_price)}`)}><FiEye /> Details</button></div></div>))}</div>
                  {totalEscrowPages > 1 && (<div className="pagination"><button onClick={() => setEscrowPage(p => Math.max(p - 1, 1))} disabled={escrowPage === 1}><FiChevronLeft /> Previous</button><span>Page {escrowPage} of {totalEscrowPages}</span><button onClick={() => setEscrowPage(p => Math.min(p + 1, totalEscrowPages))} disabled={escrowPage === totalEscrowPages}>Next <FiChevronRight /></button></div>)}
                </>
              )}
            </>
          )}

          {/* Seller Payouts Tab */}
          {activeTab === 'payouts' && (
            <>
              <div className="section-header"><h2>Pending Seller Payouts</h2><p>Orders delivered and fully paid, waiting for payment to sellers</p></div>
              {pendingSellerPayouts.length === 0 ? (<div className="empty-state"><FaHandHoldingUsd className="empty-icon" /><h3>No pending payouts</h3><p>All sellers have been paid</p></div>) : (
                <div className="payouts-grid">{pendingSellerPayouts.map((order) => (<div key={order.id} className="payout-card"><div className="payout-card-header"><div className="product-info">{order.product?.image_gallery?.[0] && <img src={order.product.image_gallery[0]} alt={order.product.name} className="product-thumb" />}<div><h4>{order.product?.name?.slice(0, 40) || 'Unknown Product'}</h4><span className="order-date">Order: {order.id.slice(0, 8)}...</span></div></div></div><div className="payout-card-body"><div className="seller-info"><div className="info-row"><FiUser /><span>{order.seller?.full_name || 'Unknown Seller'}</span></div><div className="info-row"><FiSmartphone /><span>{order.seller?.phone || 'No phone'}</span></div><div className="info-row"><FiMail /><span>{order.seller?.email || 'No email'}</span></div></div><div className="amount-breakdown"><div className="breakdown-row"><span>Total Order:</span><strong>{formatKSH(order.total_price)}</strong></div><div className="breakdown-row commission"><span>Platform Fee ({(order.commission_rate * 100).toFixed(1)}%):</span><span className="commission-amount">- {formatKSH(order.commission_amount)}</span></div><div className="breakdown-row seller-amount"><span>Seller Receives:</span><strong className="seller-payout">{formatKSH(order.seller_amount)}</strong></div></div></div><div className="payout-card-footer"><button className="release-btn" onClick={() => releaseToSeller(order)} disabled={actionLoading}>{actionLoading ? <><FiLoader className="animate-spin" /> Processing...</> : <><FiSend /> Release {formatKSH(order.seller_amount)} to Seller</>}</button></div></div>))}</div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {withdrawModalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-modern withdraw-modal" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="modal-header"><h3>Withdraw to M-Pesa (B2C)</h3><button className="close" onClick={() => setWithdrawModalOpen(false)} disabled={processingWithdrawal}><FiXCircle /></button></div>
              <div className="modal-body">
                <div className="security-notice"><FiShield /> B2C Transfer • Instant • Zero Fees</div>
                <div className="balance-preview"><span>Available Balance:</span><strong className="balance-amount">{formatKSH(balance)}</strong></div>
                <div className="form-group"><label>Amount to Withdraw *</label><div className="amount-input-group"><span className="currency-symbol">KSH</span><input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" min={MIN_WITHDRAWAL} max={Math.min(balance, MAX_WITHDRAWAL)} step="100" disabled={processingWithdrawal} /></div><small>Min: KSH {MIN_WITHDRAWAL} • Max: KSH {Math.min(balance, MAX_WITHDRAWAL).toLocaleString()}</small></div>
                <div className="form-group"><label>M-Pesa Phone Number *</label><div className="phone-input-group"><FiSmartphone className="input-icon" /><input type="tel" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0712345678" disabled={processingWithdrawal} maxLength="10" /></div><small>Funds will be sent to this M-Pesa number</small></div>
                <div className="info-box"><FiInfo /><p><strong>B2C Transfer:</strong> Funds will be sent from your Paybill to your M-Pesa account. No STK push required - money will arrive instantly.</p></div>
              </div>
              <div className="modal-footer"><button className="cancel" onClick={() => setWithdrawModalOpen(false)} disabled={processingWithdrawal}>Cancel</button><button className="submit withdraw" onClick={handleB2CWithdrawal} disabled={processingWithdrawal || !withdrawAmount || Number(withdrawAmount) < MIN_WITHDRAWAL || Number(withdrawAmount) > Math.min(balance, MAX_WITHDRAWAL) || !withdrawPhone || withdrawPhone.length !== 10}>{processingWithdrawal ? <><div className="loading-spinner-small"></div> Processing...</> : `Withdraw ${formatKSH(Number(withdrawAmount) || 0)} via B2C`}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {refundModalOpen && selectedOrder && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-modern refund-modal" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="modal-header"><h3>Refund Deposit to Buyer</h3><button className="close" onClick={() => setRefundModalOpen(false)} disabled={processingRefund}><FiXCircle /></button></div>
              <div className="modal-body">
                <div className="refund-preview"><div className="preview-row"><span>Product:</span><strong>{selectedOrder.product?.name || 'Unknown'}</strong></div><div className="preview-row"><span>Order ID:</span><code>{selectedOrder.id.slice(0, 12)}...</code></div><div className="preview-row"><span>Buyer Phone:</span><strong>{selectedOrder.buyer_phone || 'Not provided'}</strong></div><div className="preview-row highlight"><span>Refund Amount:</span><strong className="amount">{formatKSH(selectedOrder.deposit_amount)}</strong></div></div>
                <div className="form-group"><label>Refund Reason *</label><select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} disabled={processingRefund}><option value="">Select reason</option><option value="buyer_cancelled">Buyer Cancelled Order</option><option value="item_damaged">Item Damaged/Broken</option><option value="wrong_item">Wrong Item Sent</option><option value="item_not_received">Item Not Received</option><option value="seller_unresponsive">Seller Unresponsive</option><option value="other">Other</option></select></div>
                {refundReason === 'other' && (<div className="form-group"><textarea placeholder="Please provide details..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} disabled={processingRefund} rows="2" /></div>)}
                <div className="warning-box"><FaExclamationTriangle /><p>This will refund the deposit to the buyer's M-Pesa account via B2C transfer. The buyer will receive the money instantly. This action cannot be undone.</p></div>
              </div>
              <div className="modal-footer"><button className="cancel" onClick={() => setRefundModalOpen(false)} disabled={processingRefund}>Cancel</button><button className="submit refund" onClick={processB2CRefund} disabled={processingRefund || !refundReason}>{processingRefund ? <><div className="loading-spinner-small"></div> Processing...</> : 'Process B2C Refund'}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}