
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import {
  FiUsers,
  FiBriefcase,
  FiShoppingCart,
  FiAlertTriangle,
  FiClipboard,
  FiDollarSign,
  FiUser,
  FiActivity,
  FiTrendingUp,
  FiUserPlus,
  FiCheckCircle,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from "chart.js";


// Register Chart.js components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const DashboardOverview = ({ currentAdmin, isSuperAdmin, logActivity }) => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalProducts: 0,
    pendingApprovals: 0,
    todaysOrders: 0,
    totalAdmins: 0,
    revenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Sales ($)",
        data: [],
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
        fill: true,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { color: darkMode ? "#e2e8f0" : "#333" },
      },
      title: {
        display: true,
        text: "Monthly Sales Trend",
        color: darkMode ? "#e2e8f0" : "#333",
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Month", color: darkMode ? "#e2e8f0" : "#333" },
        grid: { color: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" },
      },
      y: {
        title: { display: true, text: "Sales ($)", color: darkMode ? "#e2e8f0" : "#333" },
        grid: { color: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" },
      },
    },
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [
        { count: totalUsers },
        { count: totalStores },
        { count: totalProducts },
        { count: pendingApprovals },
        { count: todaysOrders, data: ordersData },
        { count: totalAdmins },
        { data: activities },
        { data: admins },
        { data: notificationsData },
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('store_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('orders')
          .select('id, total_price', { count: 'exact' })
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .lte('created_at', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
        supabase.from('admin_users').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('admin_activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_notifications').select('id, title, message, created_at, is_read').eq('is_read', false).order('created_at', { ascending: false }).limit(10),
      ]);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data: salesData } = await supabase
        .from('orders')
        .select('total_price, created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      const monthlySales = Array(6).fill(0);
      const labels = Array(6).fill().map((_, i) => {
        const date = new Date(sixMonthsAgo);
        date.setMonth(sixMonthsAgo.getMonth() + i);
        return date.toLocaleString('default', { month: 'short' });
      });

      salesData.forEach(order => {
        const monthIndex = new Date(order.created_at).getMonth() - sixMonthsAgo.getMonth();
        if (monthIndex >= 0 && monthIndex < 6) {
          monthlySales[monthIndex] += order.total_price || 0;
        }
      });

      setChartData({
        labels,
        datasets: [
          {
            label: "Sales ($)",
            data: monthlySales,
            backgroundColor: "rgba(75, 192, 192, 0.5)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            fill: true,
          },
        ],
      });

      const revenue = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);

      setAdminStats({
        totalUsers: totalUsers || 0,
        totalStores: totalStores || 0,
        totalProducts: totalProducts || 0,
        pendingApprovals: pendingApprovals || 0,
        todaysOrders: todaysOrders || 0,
        totalAdmins: totalAdmins || 0,
        revenue: revenue || 0,
      });

      setRecentActivities(activities || []);
      setAdminUsers(admins || []);
      setNotifications(notificationsData.map(n => ({
        id: n.id,
        message: n.message,
        time: new Date(n.created_at).toLocaleTimeString(),
      })) || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data. Using defaults.');
      setAdminStats({
        totalUsers: 0,
        totalStores: 0,
        totalProducts: 0,
        pendingApprovals: 0,
        todaysOrders: 0,
        totalAdmins: 0,
        revenue: 0,
      });
      setChartData({
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Sales ($)",
            data: [12000, 19000, 15000, 22000, 18000, 25000],
            backgroundColor: "rgba(75, 192, 192, 0.5)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            fill: true,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAdmin?.permissions?.includes('view_dashboard') || isSuperAdmin) {
      fetchAdminData();
      logActivity('viewed_dashboard_overview');
    } else {
      toast.error('Access denied: Insufficient permissions');
    }
  }, [currentAdmin, isSuperAdmin]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard Overview...</p>
      </div>
    );
  }

  if (!currentAdmin?.permissions?.includes('view_dashboard') && !isSuperAdmin) {
    return null; // Parent AdminDashboard will handle redirect
  }

  const statCards = [
    {
      icon: <FiUsers />,
      title: "Total Users",
      value: adminStats.totalUsers.toLocaleString(),
      change: "+12%",
      trend: "up",
      color: "var(--success-color)",
    },
    {
      icon: <FiBriefcase />,
      title: "Total Stores",
      value: adminStats.totalStores.toLocaleString(),
      change: "+8%",
      trend: "up",
      color: "var(--warning-color)",
    },
    {
      icon: <FiShoppingCart />,
      title: "Total Products",
      value: adminStats.totalProducts.toLocaleString(),
      change: "+15%",
      trend: "up",
      color: "var(--info-color)",
    },
    {
      icon: <FiAlertTriangle />,
      title: "Pending Approvals",
      value: adminStats.pendingApprovals.toLocaleString(),
      change: "-5%",
      trend: "down",
      color: "var(--danger-color)",
    },
    {
      icon: <FiClipboard />,
      title: "Pending Installments",
      value: adminStats.todaysOrders.toLocaleString(),
      change: "+10%",
      trend: "up",
      color: "var(--indigo-color)",
    },
    {
      icon: <FiDollarSign />,
      title: "Today's Revenue",
      value: `$${adminStats.revenue.toLocaleString()}`,
      change: "+23%",
      trend: "up",
      color: "var(--gold-color)",
    },
  ];

  return (
    <div className="admin-content">
      {isSuperAdmin && (
        <motion.section
          className="super-admin-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="banner-content">
            <FaCrown className="banner-icon" />
            <div>
              <h3>Super Admin Privileges Active</h3>
              <p>You have full control over the entire system and can manage all admin users</p>
            </div>
          </div>
        </motion.section>
      )}

      <section className="stats-grid">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <h3>{stat.value}</h3>
              <span>{stat.title}</span>
              <div className={`stat-change ${stat.trend}`}>
                <FiTrendingUp />
                <span>{stat.change}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="dashboard-grid">
        <motion.section
          className="activities-section"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="section-header">
            <h2>Recent Activities</h2>
          </div>
          <div className="activities-list">
            {recentActivities.slice(0, 6).map((activity, index) => (
              <motion.div
                key={activity.id}
                className="activity-item"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="activity-avatar">
                  <FiUser />
                </div>
                <div className="activity-content">
                  <p>
                    <strong>System</strong>
                    {" "}{activity.action.replace(/_/g, ' ')}
                  </p>
                  <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="activity-badge">
                  <FiCheckCircle />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {isSuperAdmin && (
          <motion.section
            className="admin-users-section"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="section-header">
              <h2>Admin Users</h2>
              <span className="admin-count">{adminUsers.filter(a => a.is_active).length} Active</span>
            </div>
            <div className="admin-users-list">
              {adminUsers.slice(0, 5).map((admin, index) => (
                <motion.div
                  key={admin.id}
                  className="admin-user-item"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="admin-avatar">
                    {admin.role === 'super_admin' ? <FaCrown /> : <FiUser />}
                  </div>
                  <div className="admin-info">
                    <strong>{admin.email}</strong>
                    <span className={`admin-role ${admin.role}`}>
                      {admin.role.replace('_', ' ')}
                      {admin.role === 'super_admin' && ' 👑'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
