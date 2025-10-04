import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiDownload, 
  FiCreditCard, 
  FiBriefcase, 
  FiAward, 
  FiPercent, 
  FiBarChart2, 
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiShoppingBag,
  FiTrendingUp
} from "react-icons/fi";
import { FaCrown, FaMoneyBillWave, FaChartLine } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { CSVLink } from "react-csv";
import "./AdminWallet.css";

const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

const EARNING_SOURCES = [
  { key: "wallet", label: "Wallet Transfers", icon: <FiCreditCard />, color: "var(--accent-primary)" },
  { key: "marketplace", label: "Marketplace Sales", icon: <FiBriefcase />, color: "var(--success-color)" },
  { key: "premium", label: "Premium Upgrades", icon: <FaCrown />, color: "var(--gold-color)" },
  { key: "all", label: "All Earnings", icon: <FiBarChart2 />, color: "var(--accent-secondary)" }
];

const formatOMC = (num) =>
  `${Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} OMC`;

export default function AdminWalletDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({});
  const [selectedSource, setSelectedSource] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const TRANSACTIONS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBalance(), fetchTransactions()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", ADMIN_ID)
      .single();

    if (!error && data) setBalance(data.balance);
  };

  const fetchTransactions = async () => {
    const { data, error, count } = await supabase
      .from("wallet_transactions")
      .select("*", { count: 'exact' })
      .eq("user_id", ADMIN_ID)
      .eq("type", "commission")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data);
      setTotalCount(count || 0);

      // Group by known sources
      const grouped = data.reduce((acc, txn) => {
        const src = txn.source?.toLowerCase() || "uncategorized";
        acc[src] = (acc[src] || 0) + txn.amount;
        return acc;
      }, {});
      setTotals(grouped);
    } else {
      toast.error("Failed to fetch transactions");
    }
  };

  const refreshData = async () => {
    setActionLoading(true);
    await fetchData();
    setActionLoading(false);
    toast.success('Data refreshed successfully');
  };

  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);

  const csvData = transactions.map((txn) => ({
    Type: txn.type,
    Source: txn.source || "Uncategorized",
    Amount: `${txn.amount} OMC`,
    Message: txn.message || "-",
    Date: new Date(txn.created_at).toLocaleString(),
  }));

  const filteredTransactions =
    selectedSource === "all"
      ? transactions
      : transactions.filter(
          (txn) =>
            (txn.source?.toLowerCase() || "uncategorized") === selectedSource &&
            txn.type === "commission"
        );

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * TRANSACTIONS_PER_PAGE,
    page * TRANSACTIONS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE);

  const getSourceIcon = (sourceKey) => {
    const source = EARNING_SOURCES.find(s => s.key === sourceKey);
    return source ? source.icon : <FiCreditCard />;
  };

  const getSourceColor = (sourceKey) => {
    const source = EARNING_SOURCES.find(s => s.key === sourceKey);
    return source ? source.color : 'var(--text-muted)';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      <motion.div
        className="admin-wallet-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <FaMoneyBillWave className="header-icon" />
            <div>
              <h1>Wallet Oversight</h1>
              <p>Monitor commission earnings and financial transactions</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <FiDollarSign className="stat-icon" />
              <div>
                <span className="stat-number">{formatOMC(balance)}</span>
                <span className="stat-label">Current Balance</span>
              </div>
            </div>
            <div className="stat-card">
              <FaChartLine className="stat-icon" />
              <div>
                <span className="stat-number">{formatOMC(totalAll)}</span>
                <span className="stat-label">Total Commissions</span>
              </div>
            </div>
            <div className="stat-card">
              <FiTrendingUp className="stat-icon" />
              <div>
                <span className="stat-number">{totalCount}</span>
                <span className="stat-label">Transactions</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="admin-wallet-content">
        {/* Controls Section */}
        <motion.section
          className="controls-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="controls-left">
            <motion.button
              className="refresh-btn"
              onClick={refreshData}
              disabled={actionLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {actionLoading ? (
                <div className="loading-dots"></div>
              ) : (
                <>
                  <FiRefreshCw />
                  Refresh Data
                </>
              )}
            </motion.button>
          </div>
          <div className="controls-right">
            <CSVLink
              data={csvData}
              filename="admin_commissions.csv"
              className="export-btn"
            >
              <FiDownload />
              Export CSV
            </CSVLink>
          </div>
        </motion.section>

        {/* Earnings Cards */}
        <motion.section
          className="earnings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="section-header">
            <h2>Commission Sources</h2>
            <p>Breakdown of earnings by transaction type</p>
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
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="card-header">
                    <div 
                      className="source-icon"
                      style={{ backgroundColor: `${source.color}15`, color: source.color }}
                    >
                      {source.icon}
                    </div>
                    <div className="source-info">
                      <h3>{source.label}</h3>
                      <span className="amount">{formatOMC(amount)}</span>
                    </div>
                  </div>
                  <div className="card-footer">
                    <div className="percentage">
                      <FiPercent className="percent-icon" />
                      <span>{percent}% of total</span>
                    </div>
                    {selectedSource === source.key && (
                      <div className="selected-indicator"></div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Transactions Section */}
        <motion.section
          className="transactions-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="section-header">
            <h2>
              {selectedSource === "all" ? "All Commission Transactions" : 
               selectedSource === "marketplace" ? "Marketplace Commissions" :
               selectedSource === "wallet" ? "Wallet Transfer Commissions" :
               "Premium Upgrade Commissions"}
              <span className="transaction-count">({filteredTransactions.length} transactions)</span>
            </h2>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <FiDollarSign className="empty-icon" />
              <h3>No transactions found</h3>
              <p>No commission transactions available for the selected source</p>
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
                        {selectedSource === "all" && <th>Source</th>}
                        {selectedSource === "marketplace" && (
                          <>
                            <th>Order ID</th>
                            <th>Seller ID</th>
                          </>
                        )}
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
                            <span className="amount-value">{formatOMC(transaction.amount)}</span>
                          </td>
                          {selectedSource === "all" && (
                            <td className="source-cell">
                              <div 
                                className="source-badge"
                                style={{ 
                                  backgroundColor: `${getSourceColor(transaction.source?.toLowerCase())}15`,
                                  color: getSourceColor(transaction.source?.toLowerCase())
                                }}
                              >
                                {getSourceIcon(transaction.source?.toLowerCase())}
                                {transaction.source || "Uncategorized"}
                              </div>
                            </td>
                          )}
                          {selectedSource === "marketplace" && (
                            <>
                              <td className="order-cell">
                                {transaction.order_id || "—"}
                              </td>
                              <td className="seller-cell">
                                {transaction.seller_id ? (
                                  <div className="seller-info">
                                    <FiUser className="seller-icon" />
                                    {transaction.seller_id}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </>
                          )}
                          <td className="message-cell">
                            {transaction.message || "Commission earnings"}
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
                    Previous
                  </button>
                  
                  <div className="pagination-info">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </div>
                  
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="pagination-btn"
                  >
                    Next
                    <FiChevronRight />
                  </button>
                </motion.div>
              )}
            </>
          )}
        </motion.section>
      </div>
    </div>
  );
}