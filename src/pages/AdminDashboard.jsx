// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FiHome,
  FiShield,
  FiLayers,
  FiChevronLeft,
  FiChevronRight
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
  Legend,
  Filler
} from "chart.js";
import "./AdminDashboard.css";

// Register Chart.js components with Filler
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend, Filler);

const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start with sidebar closed
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

  // Role-based colors (by superiority)
  const roleColors = {
    super_admin: {
      primary: "#FFD700", // Gold
      secondary: "rgba(255, 215, 0, 0.1)",
      text: "#B8860B",
      badge: "linear-gradient(135deg, #FFD700, #FFA500)",
      dark: "rgba(255, 215, 0, 0.15)"
    },
    admin: {
      primary: "#DC2626", // Red
      secondary: "rgba(220, 38, 38, 0.1)",
      text: "#B91C1C",
      badge: "linear-gradient(135deg, #DC2626, #EF4444)",
      dark: "rgba(220, 38, 38, 0.15)"
    },
    moderator: {
      primary: "#2563EB", // Blue
      secondary: "rgba(37, 99, 235, 0.1)",
      text: "#1D4ED8",
      badge: "linear-gradient(135deg, #2563EB, #3B82F6)",
      dark: "rgba(37, 99, 235, 0.15)"
    },
    support: {
      primary: "#059669", // Green
      secondary: "rgba(5, 150, 105, 0.1)",
      text: "#047857",
      badge: "linear-gradient(135deg, #059669, #10B981)",
      dark: "rgba(5, 150, 105, 0.15)"
    }
  };

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

  // Enhanced logout function - Always redirects to admin-auth
  const handleAdminLogout = async () => {
    try {
      // Log activity before logout
      if (currentAdmin) {
        await logActivity('logged_out');
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      // Clear all states
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
      
      // Always redirect to admin login page immediately
      navigate('/admin-auth', { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
      
      // Still redirect to admin login even if there's an error
      navigate('/admin-auth', { replace: true });
    }
  };

  // Check admin access with proper fallback to admin-auth
  const hasAdminAccess = async () => {
    if (!user) {
      console.log('No user found, redirecting to admin-auth');
      navigate('/admin-auth', { replace: true });
      return false;
    }
    
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin access:', error);
        navigate('/admin-auth', { replace: true });
        return false;
      }

      if (adminData) {
        setCurrentAdmin(adminData);
        return true;
      }

      // Check if user is super admin
      if (user.email === SUPER_ADMIN_EMAIL) {
        // Create super admin record if it doesn't exist
        const { data: newAdmin, error: createError } = await supabase
          .from('admin_users')
          .insert([
            {
              user_id: user.id,
              email: user.email,
              role: 'super_admin',
              permissions: ['all'],
              is_active: true,
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (!createError && newAdmin) {
          setCurrentAdmin(newAdmin);
          return true;
        }
      }

      // If no admin access, redirect to admin login
      console.log('No admin access found, redirecting to admin-auth');
      navigate('/admin-auth', { replace: true });
      return false;
    } catch (error) {
      console.error('Error in hasAdminAccess:', error);
      navigate('/admin-auth', { replace: true });
      return false;
    }
  };

  // Get today's date in proper format for Supabase
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  };

  // Get start of month for chart data
  const getStartOfMonth = (monthsAgo = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  };

  // Fetch dashboard data with real database queries
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      
      // Fetch all data in parallel for better performance
      const [
        usersResponse,
        storesResponse,
        productsResponse,
        pendingApprovalsResponse,
        todaysOrdersResponse,
        adminsResponse,
        activitiesResponse,
        notificationsResponse,
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('store_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('orders')
          .select('id, total_price, created_at', { count: 'exact' })
          .gte('created_at', today),
        supabase.from('admin_users').select('id, email, role, is_active, created_at', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('admin_activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('admin_notifications').select('id, title, message, created_at, is_read').eq('is_read', false).order('created_at', { ascending: false }).limit(10),
      ]);

      // Calculate today's revenue
      let revenue = 0;
      if (todaysOrdersResponse.data) {
        revenue = todaysOrdersResponse.data.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0);
      }

      // Fetch sales data for chart - last 6 months
      const monthlySales = Array(6).fill(0);
      const labels = [];
      
      // Generate monthly data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const startOfMonth = getStartOfMonth(i);
        const endOfMonth = new Date(getStartOfMonth(i - 1));
        endOfMonth.setSeconds(endOfMonth.getSeconds() - 1);
        
        const monthDate = new Date(startOfMonth);
        labels.push(monthDate.toLocaleString('default', { month: 'short' }));
        
        // Fetch orders for this month
        const { data: monthlyOrders } = await supabase
          .from('orders')
          .select('total_price')
          .gte('created_at', startOfMonth)
          .lt('created_at', endOfMonth.toISOString());

        if (monthlyOrders) {
          monthlySales[5 - i] = monthlyOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0);
        }
      }

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

      // Update admin stats with real data
      setAdminStats({
        totalUsers: usersResponse.count || 0,
        totalStores: storesResponse.count || 0,
        totalProducts: productsResponse.count || 0,
        pendingApprovals: pendingApprovalsResponse.count || 0,
        todaysOrders: todaysOrdersResponse.count || 0,
        totalAdmins: adminsResponse.count || 0,
        revenue: revenue,
      });

      // Set recent activities
      setRecentActivities(activitiesResponse.data || []);

      // Fetch admin users with user details
      const { data: allAdmins } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      setAdminUsers(allAdmins || []);

      // Set notifications
      setNotifications(notificationsResponse.data?.map(n => ({
        id: n.id,
        message: n.message,
        time: new Date(n.created_at).toLocaleTimeString(),
      })) || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
      
      // Set fallback data
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
    if (!currentAdmin) return;
    
    try {
      await supabase
        .from('admin_activities')
        .insert({
          performed_by: currentAdmin.id,
          action,
          target_type,
          target_id,
          user_agent: navigator.userAgent,
          ip_address: '127.0.0.1',
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
      // First, find user by email in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', adminData.email.trim().toLowerCase())
        .single();

      if (userError || !userData) {
        toast.error('User with this email not found in the system');
        return;
      }

      // Check if user is already an admin
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (existingAdmin) {
        toast.error('This user is already an administrator');
        return;
      }

      // Create new admin
      const { data: newAdmin, error } = await supabase
        .from('admin_users')
        .insert([
          {
            user_id: userData.id,
            email: userData.email,
            role: adminData.role,
            permissions: availablePermissions[adminData.role] || [],
            is_active: true,
            created_by: currentAdmin.user_id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setAdminUsers(prev => [newAdmin, ...prev]);
      setShowAddAdmin(false);
      setNewAdminData({ email: '', role: 'moderator', permissions: [] });
      
      // Log activity
      await logActivity('admin_user_created', 'admin_user', newAdmin.id);
      toast.success(`New ${adminData.role} added successfully!`);
    } catch (error) {
      console.error('Error adding admin user:', error);
      toast.error('Failed to add admin user: ' + error.message);
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

      // Update local state
      setAdminUsers(prev =>
        prev.map(admin =>
          admin.id === adminId
            ? { ...admin, is_active: !currentStatus }
            : admin
        )
      );

      // Log activity
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
    setSidebarOpen(!sidebarOpen);
  };

  // Navigation handler
  const handleNavClick = (path) => {
    navigate(path);
    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Get role color
  const getRoleColor = (role) => {
    return roleColors[role] || roleColors.moderator;
  };

  // Initialize admin - with proper authentication checks
  useEffect(() => {
    const initializeAdmin = async () => {
      // If no user, redirect immediately to admin-auth
      if (!user) {
        console.log('No user found, redirecting to admin-auth');
        navigate('/admin-auth', { replace: true });
        setLoading(false);
        return;
      }

      // Check if user has admin access
      const isAdmin = await hasAdminAccess();
      if (!isAdmin) {
        console.log('User does not have admin access, redirecting to admin-auth');
        toast.error('Access denied: Admin privileges required');
        navigate('/admin-auth', { replace: true });
        return;
      }

      // If we have admin access, fetch data
      await fetchAdminData();
      await logActivity('logged_in');

      // Set up real-time subscription for notifications
      try {
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

        return () => {
          subscription.unsubscribe();
        };
      } catch (subscriptionError) {
        console.error('Error setting up subscription:', subscriptionError);
      }
    };

    initializeAdmin();
  }, [user, navigate]);

  // Redirect if no user or not admin - this runs on every render
  useEffect(() => {
    if (!user) {
      navigate('/admin-auth', { replace: true });
      return;
    }

    // Additional safety check - if we have a user but no currentAdmin after loading, redirect
    if (!loading && user && !currentAdmin) {
      console.log('User found but no admin access, redirecting to admin-auth');
      navigate('/admin-auth', { replace: true });
    }
  }, [user, currentAdmin, loading, navigate]);

  // Close sidebar when clicking on overlay (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Loading state
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  // If no current admin but we're not loading, show access denied
  if (!currentAdmin) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === 'super_admin';
  const currentRoleColor = getRoleColor(currentAdmin?.role);

  // Admin modules with role-based filtering
  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", desc: "Overview and analytics", path: "/admin-dashboard", requiredPermission: "view_dashboard" },
    { icon: <FiUsers />, title: "User Management", desc: "Manage users and permissions", path: "/admin/users", requiredPermission: "manage_users" },
    { icon: <FiBriefcase />, title: "Store Management", desc: "Oversee store accounts", path: "/admin/stores", requiredPermission: "manage_stores" },
    { icon: <FiShoppingCart />, title: "Product Management", desc: "Moderate products", path: "/admin/products", requiredPermission: "manage_products" },
    { icon: <FiPackage />, title: "Categories", desc: "Manage categories and tags", path: "/admin/categories", requiredPermission: "manage_categories" },
    { icon: <FiMessageSquare />, title: "Messages", desc: "Monitor conversations", path: "/admin/messages", requiredPermission: "manage_messages" },
    { icon: <FiDollarSign />, title: "Finance", desc: "Revenue and payments", path: "/admin/finance", requiredPermission: "manage_finance" },
    { icon: <FiCreditCard />, title: "Wallets", desc: "User wallet oversight", path: "/admin/wallet", requiredPermission: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings", desc: "Manage reviews", path: "/admin/ratings", requiredPermission: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installments", desc: "Payment plans", path: "/admin/installments", requiredPermission: "manage_installments" },
    { icon: <FiFileText />, title: "Reports", desc: "Analytics and insights", path: "/admin/reports", requiredPermission: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Users", desc: "Manage administrators", path: "/admin/admins", requiredPermission: "manage_admins" },
    { icon: <FiSettings />, title: "Settings", desc: "System configuration", path: "/admin/settings", requiredPermission: "manage_settings" },
    { icon: <FiDatabase />, title: "Database", desc: "Advanced operations", path: "/admin/database", requiredPermission: "manage_database" },
    { icon: <FiAward />, title: "Promotions", desc: "Offers and deals", path: "/admin/promotions", requiredPermission: "manage_promotions" },
  ].filter(module =>
    isSuperAdmin ||
    currentAdmin?.permissions?.includes(module.requiredPermission) ||
    currentAdmin?.permissions?.includes('all')
  );

  // Stats cards data with real data
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
      style={{
        '--super-admin-color': roleColors.super_admin.primary,
        '--admin-color': roleColors.admin.primary,
        '--moderator-color': roleColors.moderator.primary,
        '--support-color': roleColors.support.primary,
        '--current-role-color': currentRoleColor.primary,
        '--current-role-secondary': currentRoleColor.secondary,
        '--current-role-dark': currentRoleColor.dark,
      }}
    >
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Now toggleable */}
      <motion.aside
        className={`admin-sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`}
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <motion.div
              className="sidebar-logo"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200 }}
              style={{ 
                background: currentRoleColor.badge,
                color: isSuperAdmin ? '#000' : '#fff'
              }}
            >
              {isSuperAdmin ? <FaCrown /> : <FiShield />}
            </motion.div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  className="brand-text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div className="brand-name">OmniFlow</div>
                  <div className="brand-role">{isSuperAdmin ? "Super Admin" : "Admin Panel"}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="sidebar-close" onClick={toggleSidebar}>
            <FiChevronLeft />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-content">
          {/* Main Navigation */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    className="nav-section-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Main
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="nav-items">
                {adminModules.slice(0, 1).map((module, index) => (
                  <motion.button
                    key={module.path}
                    className={`nav-item ${location.pathname === module.path ? 'active' : ''}`}
                    onClick={() => handleNavClick(module.path)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="nav-icon">
                      {module.icon}
                    </div>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          className="nav-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {module.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {location.pathname === module.path && (
                      <motion.div 
                        className="nav-active-indicator"
                        layoutId="activeIndicator"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Management Section */}
            <div className="nav-section">
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    className="nav-section-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Management
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="nav-items">
                {adminModules.slice(1, 8).map((module, index) => (
                  <motion.button
                    key={module.path}
                    className={`nav-item ${location.pathname === module.path ? 'active' : ''}`}
                    onClick={() => handleNavClick(module.path)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index + 1) * 0.1 }}
                  >
                    <div className="nav-icon">
                      {module.icon}
                    </div>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          className="nav-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {module.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {location.pathname === module.path && (
                      <motion.div 
                        className="nav-active-indicator"
                        layoutId="activeIndicator"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* System Section */}
            <div className="nav-section">
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    className="nav-section-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    System
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="nav-items">
                {adminModules.slice(8).map((module, index) => (
                  <motion.button
                    key={module.path}
                    className={`nav-item ${location.pathname === module.path ? 'active' : ''}`}
                    onClick={() => handleNavClick(module.path)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index + 8) * 0.1 }}
                  >
                    <div className="nav-icon">
                      {module.icon}
                    </div>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          className="nav-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {module.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {location.pathname === module.path && (
                      <motion.div 
                        className="nav-active-indicator"
                        layoutId="activeIndicator"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <div className="admin-profile">
              <div 
                className="profile-avatar"
                style={{ 
                  background: currentRoleColor.badge,
                  color: isSuperAdmin ? '#000' : '#fff'
                }}
              >
                {isSuperAdmin ? <FaCrown /> : <FiUser />}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    className="profile-info"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <div className="profile-name">
                      {user.email === SUPER_ADMIN_EMAIL ? "Super Admin" : currentAdmin?.email?.split('@')[0] || "Admin"}
                    </div>
                    <div 
                      className="profile-role"
                      style={{ color: currentRoleColor.primary }}
                    >
                      {currentAdmin?.role?.charAt(0).toUpperCase() + currentAdmin?.role?.slice(1)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <motion.button
              className="logout-btn"
              onClick={handleAdminLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiLogOut />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Logout
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <FiChevronLeft /> : <FiMenu />}
            </button>
            <div className="breadcrumb">
              <h1>
                Dashboard Overview
                {isSuperAdmin && (
                  <span 
                    className="super-admin-badge"
                    style={{ background: roleColors.super_admin.badge }}
                  >
                    SUPER ADMIN
                  </span>
                )}
              </h1>
              <p>
                Welcome back, {user.email === SUPER_ADMIN_EMAIL ? "Super Admin" : currentAdmin?.role?.charAt(0).toUpperCase() + currentAdmin?.role?.slice(1)}
                {isSuperAdmin && " - Full system access granted"}
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
              <div 
                className="badge-icon"
                style={{ 
                  background: currentRoleColor.badge,
                  color: isSuperAdmin ? '#000' : '#fff'
                }}
              >
                {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
              </div>
              <div className="badge-info">
                <span 
                  className="badge-role"
                  style={{ color: currentRoleColor.primary }}
                >
                  {currentAdmin?.role?.toUpperCase()}
                </span>
                <span className="badge-status">● Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="admin-content">
          {/* Role-specific Banner */}
          {isSuperAdmin ? (
            <motion.section
              className="super-admin-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ background: roleColors.super_admin.badge }}
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
                style={{ background: roleColors.super_admin.primary }}
              >
                <FiUserPlus />
                Add New Admin
              </button>
            </motion.section>
          ) : (
            <motion.section
              className="role-welcome-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ 
                background: currentRoleColor.secondary,
                borderLeft: `4px solid ${currentRoleColor.primary}`
              }}
            >
              <div className="banner-content">
                <div 
                  className="role-icon"
                  style={{ color: currentRoleColor.primary }}
                >
                  {currentAdmin?.role === 'admin' && <FaShieldAlt />}
                  {currentAdmin?.role === 'moderator' && <FiUsers />}
                  {currentAdmin?.role === 'support' && <FiMessageSquare />}
                </div>
                <div>
                  <h3 style={{ color: currentRoleColor.primary }}>
                    {currentAdmin?.role?.charAt(0).toUpperCase() + currentAdmin?.role?.slice(1)} Dashboard
                  </h3>
                  <p>You have access to {currentAdmin?.permissions?.length || 0} system permissions</p>
                </div>
              </div>
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
                <div 
                  className="stat-icon"
                  style={{ 
                    background: currentRoleColor.secondary,
                    color: currentRoleColor.primary 
                  }}
                >
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

          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Modules Section */}
            <motion.section
              className="modules-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="section-header">
                <h2>Quick Access</h2>
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
                    style={{
                      '--role-color': currentRoleColor.primary,
                      '--role-secondary': currentRoleColor.secondary,
                    }}
                  >
                    <div 
                      className="module-icon"
                      style={{ 
                        background: currentRoleColor.secondary,
                        color: currentRoleColor.primary 
                      }}
                    >
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

            {/* Right Sidebar */}
            <div className="right-sidebar">
              {/* Admin Users Section (Super Admin Only) */}
              {isSuperAdmin && (
                <motion.section
                  className="admin-users-section"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="section-header">
                    <h2>Admin Team</h2>
                    <span className="admin-count">{adminUsers.filter(a => a.is_active).length} Active</span>
                  </div>
                  <div className="admin-users-list">
                    {adminUsers.slice(0, 5).map((admin, index) => {
                      const adminRoleColor = getRoleColor(admin.role);
                      return (
                        <motion.div
                          key={admin.id}
                          className="admin-user-item"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div 
                            className="admin-avatar"
                            style={{ 
                              background: adminRoleColor.badge,
                              color: admin.role === 'super_admin' ? '#000' : '#fff'
                            }}
                          >
                            {admin.role === 'super_admin' ? <FaCrown /> : <FiUser />}
                          </div>
                          <div className="admin-info">
                            <strong>
                              {admin.email || `Admin ${index + 1}`}
                            </strong>
                            <span 
                              className={`admin-role ${admin.role}`}
                              style={{ color: adminRoleColor.primary }}
                            >
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
                                style={{
                                  background: admin.is_active ? adminRoleColor.primary : '#6B7280',
                                }}
                              >
                                {admin.is_active ? <FiCheckCircle /> : <FiX />}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
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
                    style={{ color: currentRoleColor.primary }}
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
                      <div 
                        className="activity-avatar"
                        style={{ background: currentRoleColor.secondary }}
                      >
                        <FiUser style={{ color: currentRoleColor.primary }} />
                      </div>
                      <div className="activity-content">
                        <p>
                          <strong>System</strong>
                          {" "}{activity.action.replace(/_/g, ' ')}
                        </p>
                        <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div 
                        className="activity-badge"
                        style={{ color: currentRoleColor.primary }}
                      >
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
                  style={{ background: roleColors.super_admin.primary }}
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