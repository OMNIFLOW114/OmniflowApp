import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { FiArrowLeft, FiBarChart2, FiUsers, FiShoppingCart, FiDollarSign, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import './AdminPages.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ReportsAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [chartData, setChartData] = useState({
    sales: {},
    users: {},
    products: {},
    revenue: {}
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const [salesData, usersData, productsData, revenueData] = await Promise.all([
        fetchSalesData(),
        fetchUsersData(),
        fetchProductsData(),
        fetchRevenueData()
      ]);

      setChartData({
        sales: salesData,
        users: usersData,
        products: productsData,
        revenue: revenueData
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total_price')
      .gte('created_at', getStartDate())
      .order('created_at');

    if (error) throw error;

    const groupedData = groupDataByTime(data || [], 'total_price');
    return createChartConfig(groupedData, 'Sales', '#4f46e5');
  };

  const fetchUsersData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', getStartDate())
      .order('created_at');

    if (error) throw error;

    const groupedData = groupDataByTime(data || [], 'count');
    return createChartConfig(groupedData, 'New Users', '#10b981');
  };

  const fetchProductsData = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('created_at, category')
      .gte('created_at', getStartDate())
      .order('created_at');

    if (error) throw error;

    // Category distribution
    const categoryCounts = {};
    data?.forEach(product => {
      const category = product.category || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return {
      labels: Object.keys(categoryCounts),
      datasets: [
        {
          label: 'Products by Category',
          data: Object.values(categoryCounts),
          backgroundColor: [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
          ]
        }
      ]
    };
  };

  const fetchRevenueData = async () => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('created_at, amount, type')
      .gte('created_at', getStartDate())
      .in('type', ['commission', 'purchase'])
      .order('created_at');

    if (error) throw error;

    const revenueByType = {
      commission: groupDataByTime(data.filter(d => d.type === 'commission'), 'amount'),
      purchase: groupDataByTime(data.filter(d => d.type === 'purchase'), 'amount')
    };

    return {
      labels: Object.keys(revenueByType.commission),
      datasets: [
        {
          label: 'Commissions',
          data: Object.values(revenueByType.commission),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true
        },
        {
          label: 'Purchases',
          data: Object.values(revenueByType.purchase),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true
        }
      ]
    };
  };

  const getStartDate = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'quarter':
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    }
  };

  const groupDataByTime = (data, valueKey) => {
    const groups = {};
    data.forEach(item => {
      const date = new Date(item.created_at);
      let key;
      
      switch (timeRange) {
        case 'week':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'month':
        case 'quarter':
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        default:
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (valueKey === 'count') {
        groups[key] = (groups[key] || 0) + 1;
      } else {
        groups[key] = (groups[key] || 0) + (item[valueKey] || 0);
      }
    });

    return groups;
  };

  const createChartConfig = (data, label, color) => ({
    labels: Object.keys(data),
    datasets: [
      {
        label,
        data: Object.values(data),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        tension: 0.4
      }
    ]
  });

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
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
          <h1>Reports & Analytics</h1>
          <p>Comprehensive insights and platform analytics</p>
        </div>
        <button className="add-button">
          <FiDownload />
          Export Report
        </button>
      </div>

      {/* Time Range Filter */}
      <div className="filter-section">
        <div className="date-filter">
          <label>Time Period:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid">
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="chart-header">
            <h3>Sales Trend</h3>
            <FiShoppingCart />
          </div>
          <div className="chart-container">
            <Line data={chartData.sales} options={chartOptions} />
          </div>
        </motion.div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="chart-header">
            <h3>User Growth</h3>
            <FiUsers />
          </div>
          <div className="chart-container">
            <Bar data={chartData.users} options={chartOptions} />
          </div>
        </motion.div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="chart-header">
            <h3>Product Categories</h3>
            <FiBarChart2 />
          </div>
          <div className="chart-container">
            <Doughnut data={chartData.products} options={chartOptions} />
          </div>
        </motion.div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="chart-header">
            <h3>Revenue Streams</h3>
            <FiDollarSign />
          </div>
          <div className="chart-container">
            <Line data={chartData.revenue} options={chartOptions} />
          </div>
        </motion.div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-section">
        <h2>Key Performance Indicators</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">$12,458</div>
            <div className="metric-label">Total Revenue</div>
            <div className="metric-change positive">+12.5%</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">1,248</div>
            <div className="metric-label">New Users</div>
            <div className="metric-change positive">+8.3%</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">856</div>
            <div className="metric-label">Total Orders</div>
            <div className="metric-change positive">+15.2%</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">94.2%</div>
            <div className="metric-label">Success Rate</div>
            <div className="metric-change positive">+2.1%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;