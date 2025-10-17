import React, { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import {
  FiUsers,
  FiSettings,
  FiBarChart2,
  FiBriefcase,
  FiMessageSquare,
  FiStar,
  FiShoppingCart,
  FiDollarSign,
  FiMenu,
  FiX,
  FiClipboard,
  FiUserPlus,
  FiActivity,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckCircle,
  FiSearch,
  FiBell,
  FiLogOut,
  FiUser,
  FiAward,
  FiPackage,
  FiCreditCard,
  FiFileText,
  FiDatabase,
} from "react-icons/fi";
import { FaCrown, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import "./AdminDashboard.css";

// Register Chart.js components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    role: 'moderator',
    permissions: [],
  });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Revenue ($)",
        data: [],
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
    ],
  });

  const SUPER_ADMIN_EMAIL = "omniflow718@gmail.com";

  // Role-based permissions
  const availablePermissions = {
    super_admin: ['all'],
    admin: [
      'view_dashboard',
      'manage_users',
      'manage_stores',
      'manage_products',
      'manage_categories',
      'manage_messages',
      'manage_finance',
      'manage_wallets',
      'manage_ratings',
      'manage_installments',
      'view_reports',
      'manage_promotions',
      'manage_admins',
      'manage_settings',
      'manage_database',
    ],
    moderator: [
      'view_dashboard',
      'manage_products',
      'manage_categories',
      'manage_installments',
      'manage_ratings',
      'view_reports',
    ],
    support: [
      'view_dashboard',
      'manage_users',
      'manage_messages',
      'manage_finance',
      'view_reports',
    ],
  };

  // Chart options with dark mode support
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: darkMode ? "#e2e8f0" : "#334155",
          font: { size: 12 }
        },
      },
      title: {
        display: true,
        text: "Monthly Revenue Trend",
        color: darkMode ? "#e2e8f0" : "#334155",
        font: { size: 16, weight: 'bold' }
      },
    },
    scales: {
      x: {
        grid: {
          color: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
        },
        ticks: {
          color: darkMode ? "#94a3b8" : "#64748b"
        }
      },
      y: {
        grid: {
          color: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
        },
        ticks: {
          color: darkMode ? "#94a3b8" : "#64748b",
          callback: (value) => `$${value.toLocaleString()}`
        }
      },
    },
  };

  // Enhanced logout function
  const handleAdminLogout = async () => {
    try {
      await logActivity('logged_out');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setCurrentAdmin(null);
      setAdminStats({
        totalUsers: 0,
        totalStores: 0,
        totalProducts: 0,
        pendingApprovals: 0,
        todaysOrders: 0,
        totalAdmins: 0,
        revenue: 0,
      });
      
      toast.success('Logged out successfully');
      
      setTimeout(() => {
        navigate('/admin-auth', { replace: true });
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout. Please try again.');
      
      setTimeout(() => {
        navigate('/admin-auth', { replace: true });
      }, 1500);
    }
  };

  // Admin creation function
  const createAdmin = async (userId, role) => {
    try {
      const permissions = availablePermissions[role] || [];
      const { data: newAdmin, error } = await supabase
        .from('admin_users')
        .insert([
          {
            user_id: userId,
            role,
            permissions,
            is_active: true,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error && error.code !== '23505') {
        console.error(`Error creating ${role}:`, error);
        return false;
      }

      if (newAdmin) {
        setCurrentAdmin(newAdmin);
        toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} privileges activated!`);
        return true;
      }

      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingAdmin) {
        setCurrentAdmin(existingAdmin);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Failed to initialize admin access');
      return false;
    }
  };

  // Check admin access
  const hasAdminAccess = async (userId, userEmail) => {
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin access:', error);
        return false;
      }

      if (adminData) {
        setCurrentAdmin(adminData);
        return true;
      }

      if (userEmail === SUPER_ADMIN_EMAIL) {
        return await createAdmin(userId, 'super_admin');
      }

      const { data: authUser, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting full user:', userError);
        return false;
      }

      const metadata = authUser.user?.user_metadata || {};
      const adminRole = metadata.role;
      if (adminRole && ['admin', 'moderator', 'support'].includes(adminRole)) {
        return await createAdmin(userId, adminRole);
      }

      return false;
    } catch (error) {
      console.error('Error in hasAdminAccess:', error);
      return false;
    }
  };

  // Fetch dashboard data
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

      // Sales data for chart
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

      salesData?.forEach(order => {
        const monthIndex = new Date(order.created_at).getMonth() - sixMonthsAgo.getMonth();
        if (monthIndex >= 0 && monthIndex < 6) {
          monthlySales[monthIndex] += order.total_price || 0;
        }
      });

      setChartData({
        labels,
        datasets: [
          {
            label: "Revenue ($)",
            data: monthlySales,
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      });

      const revenue = ordersData?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

      setAdminStats({
        totalUsers: totalUsers || 0,
        totalStores: totalStores || 0,
        totalProducts: totalProducts || 0,
        pendingApprovals: pendingApprovals || 0,
        todaysOrders: todaysOrders || 0,
        totalAdmins: totalAdmins || 0,
        revenue: revenue,
      });

      setRecentActivities(activities || []);
      setAdminUsers(admins || []);
      setNotifications(notificationsData?.map(n => ({
        id: n.id,
        message: n.message,
        time: new Date(n.created_at).toLocaleTimeString(),
      })) || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
      setChartData({
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Revenue ($)",
            data: [12000, 19000, 15000, 22000, 18000, 25000],
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  // Activity logging
  const logActivity = async (action, target_type = null, target_id = null) => {
    try {
      await supabase
        .from('admin_activities')
        .insert({
          performed_by: currentAdmin?.id,
          action,
          target_type,
          target_id,
          user_agent: navigator.userAgent,
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Add new admin user
  const addAdminUser = async (adminData) => {
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      toast.error('Only Super Admin can add new admins');
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminData.email)
        .single();

      if (userError || !userData) {
        toast.error('User with this email not found');
        return;
      }

      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (existingAdmin) {
        toast.error('User is already an admin');
        return;
      }

      const { data: newAdmin, error } = await supabase
        .from('admin_users')
        .insert([
          {
            user_id: userData.id,
            role: adminData.role,
            permissions: availablePermissions[adminData.role] || [],
            is_active: true,
            created_by: currentAdmin.user_id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setAdminUsers(prev => [newAdmin, ...prev]);
      setShowAddAdmin(false);
      setNewAdminData({ email: '', role: 'moderator', permissions: [] });
      await logActivity('admin_user_created', 'admin_user', newAdmin.id);
      toast.success(`New ${adminData.role} added successfully!`);
    } catch (error) {
      console.error('Error adding admin user:', error);
      toast.error('Failed to add admin user');
    }
  };

  // Toggle admin status
  const toggleAdminStatus = async (adminId, currentStatus) => {
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      toast.error('Only Super Admin can modify admin status');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', adminId);

      if (error) throw error;

      setAdminUsers(prev =>
        prev.map(admin =>
          admin.id === adminId
            ? { ...admin, is_active: !currentStatus }
            : admin
        )
      );

      await logActivity(
        currentStatus ? 'admin_deactivated' : 'admin_activated',
        'admin_user',
        adminId
      );

      toast.success(`Admin ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  // Navigation handler
  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false);
    }
  };

  // Initialize admin
  useEffect(() => {
    const initializeAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const isAdmin = await hasAdminAccess(user.id, user.email);
      if (!isAdmin) {
        toast.error('Access denied: Admin privileges required');
        navigate('/');
        return;
      }

      await fetchAdminData();
      await logActivity('logged_in');

      const subscription = supabase
        .channel('admin_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, 
          (payload) => {
            setNotifications(prev => [{
              id: payload.new.id,
              message: payload.new.message,
              time: new Date(payload.new.created_at).toLocaleTimeString(),
            }, ...prev.slice(0, 9)]);
          }
        )
        .subscribe();

      return () => supabase.removeChannel(subscription);
    };

    initializeAdmin();
  }, [user, navigate]);

  // Redirect if no user
  if (!user) {
    return <Navigate to="/admin-auth" replace />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === 'super_admin';

  // Admin modules with role-based filtering
  const adminModules = [
    { icon: <FiBarChart2 />, title: "Dashboard Overview", desc: "Real-time analytics and system metrics", path: "/admin-overview", requiredPermission: "view_dashboard" },
    { icon: <FiUsers />, title: "User Management", desc: "Manage users, permissions, and bans", path: "/admin/users", requiredPermission: "manage_users" },
    { icon: <FiBriefcase />, title: "Store Oversight", desc: "Monitor and manage store accounts", path: "/admin/stores", requiredPermission: "manage_stores" },
    { icon: <FiShoppingCart />, title: "Product Moderation", desc: "Approve, reject, and manage products", path: "/admin/products", requiredPermission: "manage_products" },
    { icon: <FiPackage />, title: "Category Management", desc: "Manage product categories and tags", path: "/admin/categories", requiredPermission: "manage_categories" },
    { icon: <FiMessageSquare />, title: "Message Monitoring", desc: "Monitor and moderate user conversations", path: "/admin/messages", requiredPermission: "manage_messages" },
    { icon: <FiDollarSign />, title: "Financial Control", desc: "Manage payments, commissions, and revenue", path: "/admin/finance", requiredPermission: "manage_finance" },
    { icon: <FiCreditCard />, title: "Wallet Oversight", desc: "Monitor and control user wallets", path: "/admin/wallet", requiredPermission: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings & Reviews", desc: "Manage product ratings and user reviews", path: "/admin/ratings", requiredPermission: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installment Oversight", desc: "Monitor and control installment plans", path: "/admin/installments", requiredPermission: "manage_installments" },
    { icon: <FiFileText />, title: "Reports & Analytics", desc: "Generate reports and business insights", path: "/admin/reports", requiredPermission: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Management", desc: "Manage admin users and permissions", path: "/admin/admins", requiredPermission: "manage_admins" },
    { icon: <FiSettings />, title: "System Settings", desc: "Configure system-wide settings", path: "/admin/settings", requiredPermission: "manage_settings" },
    { icon: <FiDatabase />, title: "Database Management", desc: "Advanced database operations", path: "/admin/database", requiredPermission: "manage_database" },
    { icon: <FiAward />, title: "Promotions & Offers", desc: "Manage promotions and special offers", path: "/admin/promotions", requiredPermission: "manage_promotions" },
  ].filter(module =>
    isSuperAdmin ||
    currentAdmin?.permissions?.includes(module.requiredPermission) ||
    currentAdmin?.permissions?.includes('all')
  );

  // Stats cards data
  const statCards = [
    { icon: <FiUsers />, title: "Total Users", value: adminStats.totalUsers.toLocaleString(), change: "+12%", trend: "up" },
    { icon: <FiBriefcase />, title: "Total Stores", value: adminStats.totalStores.toLocaleString(), change: "+8%", trend: "up" },
    { icon: <FiShoppingCart />, title: "Total Products", value: adminStats.totalProducts.toLocaleString(), change: "+15%", trend: "up" },
    { icon: <FiAlertTriangle />, title: "Pending Approvals", value: adminStats.pendingApprovals.toLocaleString(), change: "-5%", trend: "down" },
    { icon: <FiClipboard />, title: "Today's Orders", value: adminStats.todaysOrders.toLocaleString(), change: "+10%", trend: "up" },
    { icon: <FiDollarSign />, title: "Today's Revenue", value: `$${adminStats.revenue.toLocaleString()}`, change: "+23%", trend: "up" },
  ];

  return (
    <div 
      className={`admin-layout ${darkMode ? "dark-mode" : ""}`}
      data-role={currentAdmin?.role || 'admin'}
    >
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            className="mobile-sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`admin-sidebar ${sidebarOpen ? 'expanded' : 'collapsed'} ${mobileSidebarOpen ? 'mobile-open' : ''}`}
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 80,
          x: mobileSidebarOpen ? 0 : (window.innerWidth <= 768 ? -280 : 0),
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="sidebar-header">
          <motion.div
            className="sidebar-logo"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
          </motion.div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                OmniFlow {isSuperAdmin && "Super "}Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="sidebar-nav">
          {adminModules.map((module, index) => (
            <motion.button
              key={index}
              className={`nav-item ${location.pathname === module.path ? 'active' : ''}`}
              onClick={() => handleNavClick(module.path)}
              whileHover={{ x: 8 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="nav-icon">
                {module.icon}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {module.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="profile-avatar">
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  className="profile-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="profile-name">
                    {user.email === SUPER_ADMIN_EMAIL ? "Super Admin" : "Admin"}
                    {isSuperAdmin && " 👑"}
                  </span>
                  <span className="profile-role">
                    {currentAdmin?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            className="logout-btn"
            onClick={handleAdminLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiLogOut />
            {sidebarOpen && <span>Logout</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`admin-main ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen || mobileSidebarOpen ? <FiX /> : <FiMenu />}
            </button>
            <div className="breadcrumb">
              <h1>
                Admin Control Center
                {isSuperAdmin && <span className="super-admin-badge">SUPER ADMIN</span>}
              </h1>
              <p>
                Welcome back, {user.email === SUPER_ADMIN_EMAIL ? "Super Admin" : "Admin"}
                {isSuperAdmin && " - You have full system control"}
              </p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search admin panel..."
                onChange={(e) => {
                  if (e.target.value) {
                    navigate(`/admin/search?q=${e.target.value}`);
                  }
                }}
              />
            </div>
            <button className="notifications-btn">
              <FiBell />
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            <div className="admin-badge">
              <div className="badge-icon">
                {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
              </div>
              <div className="badge-info">
                <span className="badge-role">
                  {currentAdmin?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                </span>
                <span className="badge-status">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {/* Super Admin Banner */}
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
              <button
                className="add-admin-btn"
                onClick={() => setShowAddAdmin(true)}
              >
                <FiUserPlus />
                Add New Admin
              </button>
            </motion.section>
          )}

          {/* Stats Grid */}
          <section className="stats-grid">
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                className="stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="stat-icon">
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

          {/* Chart */}
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            <motion.section
              className="modules-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="section-header">
                <h2>Admin Modules</h2>
                <p>Manage different aspects of the platform</p>
              </div>
              <div className="modules-grid">
                {adminModules.map((module, index) => (
                  <motion.div
                    key={index}
                    className="module-card"
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(module.path)}
                  >
                    <div className="module-icon">
                      {module.icon}
                    </div>
                    <div className="module-content">
                      <h3>{module.title}</h3>
                      <p>{module.desc}</p>
                    </div>
                    <div className="module-arrow">
                      <FiActivity />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <div className="right-sidebar">
              {/* Admin Users Section */}
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
                          <strong>
                            {admin.role === 'super_admin' ? 'Super Admin' : `Admin ${index + 1}`}
                          </strong>
                          <span className={`admin-role ${admin.role}`}>
                            {admin.role.replace('_', ' ')}
                            {admin.role === 'super_admin' && ' 👑'}
                          </span>
                        </div>
                        <div className="admin-actions">
                          {admin.role !== 'super_admin' && (
                            <button
                              className={`status-btn ${admin.is_active ? 'active' : 'inactive'}`}
                              onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                              title={admin.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {admin.is_active ? <FiCheckCircle /> : <FiX />}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Activities Section */}
              <motion.section
                className="activities-section"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="section-header">
                  <h2>Recent Activities</h2>
                  <button 
                    className="view-all-btn" 
                    onClick={() => navigate('/admin/activities')}
                  >
                    View All
                  </button>
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
            </div>
          </div>
        </div>
      </main>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {showAddAdmin && isSuperAdmin && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddAdmin(false)}
          >
            <motion.div
              className="add-admin-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Add New Admin</h3>
                <button onClick={() => setShowAddAdmin(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-content">
                <div className="form-group">
                  <label>User Email</label>
                  <input
                    type="email"
                    placeholder="Enter user's email address"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Admin Role</label>
                  <select
                    value={newAdminData.role}
                    onChange={(e) => setNewAdminData(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="moderator">Moderator</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="permissions-info">
                  <h4>Permissions for {newAdminData.role}:</h4>
                  <ul>
                    {availablePermissions[newAdminData.role]?.map(permission => (
                      <li key={permission}>{permission.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowAddAdmin(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => addAdminUser(newAdminData)}
                  disabled={!newAdminData.email}
                >
                  <FiUserPlus />
                  Add Admin
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;