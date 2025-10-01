import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { FiArrowLeft, FiDollarSign, FiTrendingUp, FiUsers, FiShoppingCart, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './AdminPages.css';

const FinancialControl = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    totalCommissions: 0,
    pendingPayouts: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    try {
      // Calculate date ranges
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch orders for revenue calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_price, created_at')
        .gte('created_at', startDate.toISOString());

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
      const todayRevenue = ordersData
        .filter(order => new Date(order.created_at).toDateString() === new Date().toDateString())
        .reduce((sum, order) => sum + (order.total_price || 0), 0);
      
      const commissionTransactions = transactionsData.filter(t => t.type === 'commission');
      const totalCommissions = commissionTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      const pendingPayouts = transactionsData
        .filter(t => t.type === 'withdraw' && t.status === 'pending')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setStats({
        totalRevenue,
        todayRevenue,
        totalCommissions,
        pendingPayouts
      });

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ['Date', 'Type', 'Amount', 'Status', 'Description'];
    const csvData = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.type,
      t.amount,
      t.status,
      t.description || ''
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  const getTransactionColor = (type) => {
    const colors = {
      deposit: 'var(--success-color)',
      withdraw: 'var(--danger-color)',
      commission: 'var(--warning-color)',
      purchase: 'var(--info-color)',
      default: 'var(--gray-color)'
    };
    return colors[type] || colors.default;
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <button className="back-button" onClick={() => navigate('/admin-overview')}>
          <FiArrowLeft />
          Back to Dashboard
        </button>
        <div className="header-content">
          <h1>Financial Control</h1>
          <p>Monitor revenue, commissions, and financial transactions</p>
        </div>
        <button className="add-button" onClick={handleExport}>
          <FiDownload />
          Export Report
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="filter-section">
        <div className="date-filter">
          <label>Time Period:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="stats-grid financial-stats">
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)15', color: 'var(--success-color)' }}>
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <h3>${stats.totalRevenue.toLocaleString()}</h3>
            <span>Total Revenue</span>
          </div>
        </motion.div>

        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)15', color: 'var(--info-color)' }}>
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <h3>${stats.todayRevenue.toLocaleString()}</h3>
            <span>Today's Revenue</span>
          </div>
        </motion.div>

        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)15', color: 'var(--warning-color)' }}>
            <FiUsers />
          </div>
          <div className="stat-content">
            <h3>${stats.totalCommissions.toLocaleString()}</h3>
            <span>Platform Commissions</span>
          </div>
        </motion.div>

        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)15', color: 'var(--danger-color)' }}>
            <FiShoppingCart />
          </div>
          <div className="stat-content">
            <h3>${stats.pendingPayouts.toLocaleString()}</h3>
            <span>Pending Payouts</span>
          </div>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <div className="table-section">
        <h2>Recent Transactions</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Description</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 50).map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td>
                    <span 
                      className="type-badge"
                      style={{ 
                        backgroundColor: `${getTransactionColor(transaction.type)}15`,
                        color: getTransactionColor(transaction.type)
                      }}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="amount-cell">
                    ${parseFloat(transaction.amount || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`status-badge ${transaction.status}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td>{transaction.description || 'N/A'}</td>
                  <td>{transaction.user_id ? transaction.user_id.substring(0, 8) + '...' : 'System'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="empty-state">
            <FiDollarSign size={48} />
            <h3>No transactions found</h3>
            <p>No financial transactions recorded for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialControl;