// src/pages/StudentEarningsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaMoneyBillWave, FaWallet, FaDownload,
  FaChartLine, FaShoppingBag, FaMotorcycle, FaGraduationCap,
  FaUtensils, FaFilter, FaCalendar, FaTrophy
} from "react-icons/fa";
import "./StudentEarningsPage.css";

const StudentEarningsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingEarnings: 0,
    withdrawnAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => {
    loadEarningsData();
  }, [user, timeFilter]);

  const loadEarningsData = async () => {
    try {
      // Load earnings
      let query = supabase
        .from('student_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply time filter
      if (timeFilter !== 'all') {
        const date = new Date();
        let startDate;
        
        switch (timeFilter) {
          case 'week':
            startDate = new Date(date.setDate(date.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(date.setMonth(date.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(date.setFullYear(date.getFullYear() - 1));
            break;
          default:
            startDate = null;
        }
        
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      const { data: earningsData } = await query;

      setEarnings(earningsData || []);

      // Calculate stats
      const totalEarnings = earningsData?.reduce((sum, earning) => sum + parseFloat(earning.amount), 0) || 0;
      const availableBalance = earningsData
        ?.filter(e => e.status === 'available')
        .reduce((sum, earning) => sum + parseFloat(earning.amount), 0) || 0;
      const pendingEarnings = earningsData
        ?.filter(e => e.status === 'pending')
        .reduce((sum, earning) => sum + parseFloat(earning.amount), 0) || 0;
      const withdrawnAmount = earningsData
        ?.filter(e => e.status === 'withdrawn')
        .reduce((sum, earning) => sum + parseFloat(earning.amount), 0) || 0;

      setStats({
        totalEarnings,
        availableBalance,
        pendingEarnings,
        withdrawnAmount
      });

    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEarnings = earnings.filter(earning => {
    if (activeFilter === 'all') return true;
    return earning.status === activeFilter;
  });

  const getSourceIcon = (sourceType) => {
    switch (sourceType) {
      case 'product_sale':
        return <FaShoppingBag />;
      case 'service':
        return <FaGraduationCap />;
      case 'delivery':
        return <FaMotorcycle />;
      case 'restaurant':
        return <FaUtensils />;
      default:
        return <FaMoneyBillWave />;
    }
  };

  const getSourceLabel = (sourceType) => {
    switch (sourceType) {
      case 'product_sale':
        return 'Product Sale';
      case 'service':
        return 'Service';
      case 'delivery':
        return 'Delivery';
      case 'restaurant':
        return 'Restaurant';
      default:
        return 'Other';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'withdrawn':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const handleWithdraw = async () => {
    if (stats.availableBalance < 100) {
      alert('Minimum withdrawal amount is KSh 100');
      return;
    }

    try {
      // In a real app, integrate with M-Pesa or other payment gateway
      alert(`Withdrawal request for KSh ${stats.availableBalance} submitted!`);
      
      // Mark earnings as withdrawn
      const availableEarnings = earnings.filter(e => e.status === 'available');
      const withdrawalPromises = availableEarnings.map(earning =>
        supabase
          .from('student_earnings')
          .update({ 
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString()
          })
          .eq('id', earning.id)
      );

      await Promise.all(withdrawalPromises);
      
      // Reload data
      loadEarningsData();
      
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Error processing withdrawal');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading your earnings...</p>
      </div>
    );
  }

  return (
    <div className="student-earnings-page">
      {/* Header */}
      <header className="page-header">
        <motion.button
          className="back-btn"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft />
        </motion.button>
        <h1>My Earnings</h1>
      </header>

      {/* Stats Cards */}
      <section className="stats-section">
        <div className="stats-grid">
          <motion.div
            className="stat-card total"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon">
              <FaChartLine />
            </div>
            <div className="stat-info">
              <h3>KSh {stats.totalEarnings.toLocaleString()}</h3>
              <p>Total Earnings</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card available"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon">
              <FaWallet />
            </div>
            <div className="stat-info">
              <h3>KSh {stats.availableBalance.toLocaleString()}</h3>
              <p>Available Balance</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon">
              <FaMoneyBillWave />
            </div>
            <div className="stat-info">
              <h3>KSh {stats.pendingEarnings.toLocaleString()}</h3>
              <p>Pending</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card withdrawn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="stat-icon">
              <FaDownload />
            </div>
            <div className="stat-info">
              <h3>KSh {stats.withdrawnAmount.toLocaleString()}</h3>
              <p>Withdrawn</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Withdrawal Section */}
      {stats.availableBalance > 0 && (
        <section className="withdrawal-section">
          <div className="withdrawal-card">
            <div className="withdrawal-info">
              <h3>Ready to Withdraw</h3>
              <p>KSh {stats.availableBalance.toLocaleString()} available</p>
            </div>
            <motion.button
              className="withdraw-btn"
              onClick={handleWithdraw}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaDownload />
              Withdraw to M-Pesa
            </motion.button>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Time Period</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </section>

      {/* Earnings List */}
      <section className="earnings-section">
        <h2>Earnings History</h2>
        
        {filteredEarnings.length === 0 ? (
          <div className="empty-earnings">
            <div className="empty-icon">
              <FaTrophy />
            </div>
            <h3>No earnings yet</h3>
            <p>Start selling products, offering services, or delivering to earn money!</p>
            <motion.button
              className="start-earning-btn"
              onClick={() => navigate('/student/marketplace')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Earning
            </motion.button>
          </div>
        ) : (
          <div className="earnings-list">
            {filteredEarnings.map((earning, index) => (
              <motion.div
                key={earning.id}
                className="earning-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="earning-icon">
                  {getSourceIcon(earning.source_type)}
                </div>
                
                <div className="earning-details">
                  <h4>{getSourceLabel(earning.source_type)}</h4>
                  <p>{earning.description || 'Earnings'}</p>
                  <span className="earning-date">
                    {new Date(earning.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="earning-amount">
                  <span className="amount">+ KSh {earning.amount}</span>
                  <span 
                    className="status-badge"
                    style={{ color: getStatusColor(earning.status) }}
                  >
                    {earning.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <section className="quick-stats-section">
        <h3>Earnings by Source</h3>
        <div className="source-stats">
          {['product_sale', 'service', 'delivery', 'restaurant'].map(sourceType => {
            const sourceEarnings = earnings
              .filter(e => e.source_type === sourceType)
              .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            
            if (sourceEarnings === 0) return null;
            
            return (
              <div key={sourceType} className="source-stat">
                <div className="source-icon">
                  {getSourceIcon(sourceType)}
                </div>
                <div className="source-info">
                  <span className="source-label">
                    {getSourceLabel(sourceType)}
                  </span>
                  <span className="source-amount">
                    KSh {sourceEarnings.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default StudentEarningsPage;