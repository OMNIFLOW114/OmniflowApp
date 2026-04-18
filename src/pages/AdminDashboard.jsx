// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/supabase";
import {
  FiUsers, FiSettings, FiBriefcase, FiMessageSquare,
  FiStar, FiShoppingCart, FiDollarSign, FiMenu, FiX, FiClipboard,
  FiUserPlus, FiActivity, FiTrendingUp, FiAlertTriangle, FiCheckCircle,
  FiSearch, FiBell, FiLogOut, FiUser, FiAward, FiPackage, FiCreditCard,
  FiFileText, FiDatabase, FiHome, FiShield, FiChevronLeft, FiChevronRight,
  FiTrendingDown, FiRefreshCw, FiEye, FiDownload, FiAlertCircle
} from "react-icons/fi";
import { FaCrown, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, CategoryScale, LinearScale,
  PointElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import Papa from "papaparse";
import "./AdminDashboard.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend, Filler);

// ─── Page Cache ───────────────────────────────────────────────────────────────
const pageCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCached = (key) => {
  const entry = pageCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { pageCache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => pageCache.set(key, { data, timestamp: Date.now() });

// ─── Skeleton Component (receives darkMode) ──────────────────────────────────
const DashboardSkeleton = ({ darkMode }) => (
  <div className={`adm-root skeleton ${darkMode ? "dark" : ""}`}>
    <aside className="adm-sidebar" style={{ width: 260 }}>
      <div className="adm-sidebar-brand">
        <div className="sk-pulse" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div className="sk-pulse" style={{ width: 100, height: 16, marginLeft: 12 }} />
      </div>
      <div className="adm-nav" style={{ padding: 12 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="sk-pulse" style={{ height: 36, marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
    </aside>
    <main className="adm-main">
      <div className="adm-topbar">
        <div className="topbar-left">
          <div className="sk-pulse" style={{ width: 120, height: 20, borderRadius: 4 }} />
          <div className="sk-pulse" style={{ width: 180, height: 14, marginTop: 6, borderRadius: 4 }} />
        </div>
        <div className="topbar-right">
          <div className="sk-pulse" style={{ width: 180, height: 36, borderRadius: 8 }} />
          <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
        </div>
      </div>
      <div className="adm-content">
        <div className="stats-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="stat-card sk-card">
              <div className="stat-card-inner">
                <div className="sk-pulse sk-icon-box" />
                <div className="sk-lines">
                  <div className="sk-pulse" style={{ width: "60%", height: 28, marginBottom: 8 }} />
                  <div className="sk-pulse" style={{ width: "80%", height: 14, marginBottom: 8 }} />
                  <div className="sk-pulse" style={{ width: "40%", height: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div className="sk-pulse" style={{ width: 150, height: 20 }} />
            <div className="sk-pulse" style={{ width: 100, height: 32, borderRadius: 6 }} />
          </div>
          <div className="sk-pulse" style={{ height: 260, width: "100%", borderRadius: 12 }} />
        </div>
        <div className="dashboard-grid">
          <div className="section-card">
            <div className="section-header">
              <div className="sk-pulse" style={{ width: 120, height: 20 }} />
              <div className="sk-pulse" style={{ width: 60, height: 24, borderRadius: 20 }} />
            </div>
            <div className="modules-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className="module-card sk-card">
                  <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div className="sk-pulse" style={{ width: "70%", height: 16, marginBottom: 6 }} />
                    <div className="sk-pulse" style={{ width: "90%", height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="right-col">
            <div className="section-card">
              <div className="section-header">
                <div className="sk-pulse" style={{ width: 100, height: 20 }} />
                <div className="sk-pulse" style={{ width: 50, height: 24, borderRadius: 20 }} />
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="activity-item">
                  <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 18 }} />
                  <div style={{ flex: 1 }}>
                    <div className="sk-pulse" style={{ width: "70%", height: 14, marginBottom: 6 }} />
                    <div className="sk-pulse" style={{ width: "40%", height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);

// ─── Role Config ──────────────────────────────────────────────────────────────
const roleColors = {
  super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)", text: "#92400E", accent: "rgba(245,158,11,0.15)" },
  admin:       { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)", text: "#991B1B", accent: "rgba(239,68,68,0.15)" },
  moderator:   { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)", text: "#3730A3", accent: "rgba(99,102,241,0.15)" },
  support:     { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)", text: "#065F46", accent: "rgba(16,185,129,0.15)" },
};

const availablePermissions = {
  super_admin: ["all"],
  admin: ["view_dashboard","manage_users","manage_stores","manage_products","manage_categories","manage_messages","manage_finance","manage_wallets","manage_ratings","manage_installments","view_reports","manage_promotions","manage_admins","manage_settings","manage_database"],
  moderator: ["view_dashboard","manage_products","manage_categories","manage_installments","manage_ratings","view_reports"],
  support: ["view_dashboard","manage_users","manage_messages","manage_finance","view_reports"],
};

const SUPER_ADMIN_EMAIL = "omniflow718@gmail.com";

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Data state
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [adminStats, setAdminStats] = useState({ totalUsers:0,totalStores:0,totalProducts:0,pendingApprovals:0,todaysOrders:0,totalAdmins:0,revenue:0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newAdminData, setNewAdminData] = useState({ email:"", role:"moderator", permissions:[] });
  const [chartData, setChartData] = useState({ labels:[], datasets:[{ label:"Revenue ($)",data:[],backgroundColor:"rgba(99,102,241,0.15)",borderColor:"#6366F1",borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:"#6366F1",pointRadius:4 }] });

  const subscriptionRef = useRef(null);
  const autoRefreshRef = useRef(null);
  const isInitialMount = useRef(true);

  const getRoleColor = useCallback((role) => roleColors[role] || roleColors.moderator, []);
  
  const hasPermission = useCallback((perm) => {
    if (!currentAdmin) return false;
    return currentAdmin.role === "super_admin" || currentAdmin.permissions?.includes("all") || currentAdmin.permissions?.includes(perm);
  }, [currentAdmin]);

  // ── Check Admin Access ──────────────────────────────────────────────────────
  const checkAdminAccess = useCallback(async () => {
    if (!user) { navigate("/admin-auth", { replace: true }); return false; }
    try {
      const { data, error } = await supabase.from("admin_users").select("*").eq("user_id", user.id).eq("is_active", true).single();
      if (data) { setCurrentAdmin(data); return true; }
      if (user.email === SUPER_ADMIN_EMAIL) {
        const { data: newAdmin, error: ce } = await supabase.from("admin_users").insert([{ user_id:user.id, email:user.email, role:"super_admin", permissions:["all"], is_active:true, created_by:user.id }]).select().single();
        if (!ce && newAdmin) { setCurrentAdmin(newAdmin); return true; }
      }
      navigate("/admin-auth", { replace: true }); return false;
    } catch { navigate("/admin-auth", { replace: true }); return false; }
  }, [user, navigate]);

  // ── Fetch Real Notifications (safe) ─────────────────────────────────────────
  const fetchRealNotifications = useCallback(async () => {
    try {
      let pendingStores = [];
      try {
        const { data, error } = await supabase
          .from("store_requests")
          .select("id, created_at")
          .eq("status", "pending")
          .limit(5);
        if (!error && data) {
          pendingStores = data.map(s => ({
            id: `store_${s.id}`,
            message: `New store request pending approval`,
            time: new Date(s.created_at).toLocaleTimeString(),
            type: "store_request"
          }));
        }
      } catch (err) {}

      let pendingProducts = [];
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, created_at, name")
          .eq("status", "pending")
          .limit(5);
        if (!error && data) {
          pendingProducts = data.map(p => ({
            id: `prod_${p.id}`,
            message: `Product "${p.name || 'item'}" pending approval`,
            time: new Date(p.created_at).toLocaleTimeString(),
            type: "product"
          }));
        }
      } catch (err) {}

      const { data: adminNotifs } = await supabase
        .from("admin_notifications")
        .select("id, title, message, created_at, is_read")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      const combined = [
        ...pendingStores,
        ...pendingProducts,
        ...(adminNotifs || []).map(n => ({
          id: n.id,
          message: n.message,
          time: new Date(n.created_at).toLocaleTimeString(),
          type: "admin"
        }))
      ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
      
      setNotifications(combined);
    } catch (err) {
      console.warn("Could not fetch notifications", err);
    }
  }, []);

  // ── Log Activity ────────────────────────────────────────────────────────────
  const logActivity = useCallback(async (action, target_type=null, target_id=null) => {
    if (!currentAdmin) return;
    try {
      await supabase.from("admin_activities").insert({ performed_by:currentAdmin.id, action, target_type, target_id, user_agent:navigator.userAgent, ip_address:"127.0.0.1" });
    } catch {}
  }, [currentAdmin]);

  // ── Fetch Dashboard Data ────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (force = false) => {
    const cacheKey = "admin-dashboard-data";
    if (!force) {
      const cached = getCached(cacheKey);
      if (cached) {
        setAdminStats(cached.adminStats);
        setRecentActivities(cached.recentActivities);
        setAdminUsers(cached.adminUsers);
        setChartData(cached.chartData);
        setLastRefresh(cached.lastRefresh);
        setLoading(false);
        setHasError(false);
        return;
      }
    }

    setLoading(true);
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const todayISO = today.toISOString();

      const [usersRes, storesRes, productsRes, pendingRes, ordersRes, adminsRes, activitiesRes] = await Promise.all([
        supabase.from("users").select("id",{count:"exact",head:true}),
        supabase.from("stores").select("id",{count:"exact",head:true}),
        supabase.from("products").select("id",{count:"exact",head:true}),
        supabase.from("store_requests").select("id",{count:"exact",head:true}).eq("status","pending"),
        supabase.from("orders").select("id,total_price,created_at",{count:"exact"}).gte("created_at",todayISO),
        supabase.from("admin_users").select("id",{count:"exact",head:true}).eq("is_active",true),
        supabase.from("admin_activities").select("*").order("created_at",{ascending:false}).limit(10),
      ]);

      const revenue = (ordersRes.data||[]).reduce((s,o)=>s+(parseFloat(o.total_price)||0),0);

      // Chart: last 6 months
      const labels=[]; const monthlySales=Array(6).fill(0);
      for (let i=5;i>=0;i--) {
        const start=new Date(); start.setMonth(start.getMonth()-i); start.setDate(1); start.setHours(0,0,0,0);
        const end=new Date(start); end.setMonth(end.getMonth()+1); end.setSeconds(end.getSeconds()-1);
        labels.push(start.toLocaleString("default",{month:"short"}));
        const {data:mo}=await supabase.from("orders").select("total_price").gte("created_at",start.toISOString()).lt("created_at",end.toISOString());
        monthlySales[5-i]=(mo||[]).reduce((s,o)=>s+(parseFloat(o.total_price)||0),0);
      }

      const newChartData = {
        labels,
        datasets:[{
          label:"Revenue ($)", data:monthlySales,
          backgroundColor:"rgba(99,102,241,0.1)",
          borderColor:"#6366F1", borderWidth:2, fill:true, tension:0.4,
          pointBackgroundColor:"#6366F1", pointBorderColor:"#fff", pointBorderWidth:2, pointRadius:5,
        }]
      };

      const newStats = { totalUsers:usersRes.count||0, totalStores:storesRes.count||0, totalProducts:productsRes.count||0, pendingApprovals:pendingRes.count||0, todaysOrders:ordersRes.count||0, totalAdmins:adminsRes.count||0, revenue };
      const {data:allAdmins}=await supabase.from("admin_users").select("*").order("created_at",{ascending:false});
      const now=new Date();

      setAdminStats(newStats);
      setRecentActivities(activitiesRes.data||[]);
      setAdminUsers(allAdmins||[]);
      setChartData(newChartData);
      setLastRefresh(now);
      setHasError(false);

      setCache(cacheKey,{ adminStats:newStats, recentActivities:activitiesRes.data||[], adminUsers:allAdmins||[], chartData:newChartData, lastRefresh:now });
    } catch (err) {
      console.error(err);
      setHasError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Add Admin ───────────────────────────────────────────────────────────────
  const addAdminUser = async () => {
    if (currentAdmin?.role !== "super_admin") { toast.error("Only Super Admin can add admins"); return; }
    if (!newAdminData.email) { toast.error("Email is required"); return; }
    try {
      const {data:ud,error:ue}=await supabase.from("users").select("id,email").eq("email",newAdminData.email.trim().toLowerCase()).single();
      if (ue||!ud) { toast.error("User not found"); return; }
      const {data:ex}=await supabase.from("admin_users").select("id").eq("user_id",ud.id).single();
      if (ex) { toast.error("User is already an admin"); return; }
      const {data:na,error:ae}=await supabase.from("admin_users").insert([{ user_id:ud.id, email:ud.email, role:newAdminData.role, permissions:availablePermissions[newAdminData.role]||[], is_active:true, created_by:currentAdmin.user_id }]).select().single();
      if (ae) throw ae;
      setAdminUsers(p=>[na,...p]);
      setShowAddAdmin(false);
      setNewAdminData({email:"",role:"moderator",permissions:[]});
      pageCache.delete("admin-dashboard-data");
      await logActivity("admin_user_created","admin_user",na.id);
      toast.success(`New ${newAdminData.role} added!`);
    } catch(e) { toast.error("Failed: "+e.message); }
  };

  // ── Toggle Admin Status ─────────────────────────────────────────────────────
  const toggleAdminStatus = async (adminId, currentStatus) => {
    if (currentAdmin?.role !== "super_admin") { toast.error("Only Super Admin can do this"); return; }
    try {
      await supabase.from("admin_users").update({is_active:!currentStatus}).eq("id",adminId);
      setAdminUsers(p=>p.map(a=>a.id===adminId?{...a,is_active:!currentStatus}:a));
      pageCache.delete("admin-dashboard-data");
      await logActivity(currentStatus?"admin_deactivated":"admin_activated","admin_user",adminId);
      toast.success(`Admin ${currentStatus?"deactivated":"activated"}!`);
    } catch { toast.error("Failed to update admin status"); }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logActivity("logged_out");
      await supabase.auth.signOut();
      pageCache.clear();
      toast.success("Logged out successfully");
      navigate("/admin-auth",{replace:true});
    } catch { navigate("/admin-auth",{replace:true}); }
  };

  // ── Export Chart Data ───────────────────────────────────────────────────────
  const exportChartData = () => {
    if (!chartData.labels.length) return;
    const csvData = chartData.labels.map((label, i) => ({
      Month: label,
      Revenue: chartData.datasets[0].data[i]
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${new Date().toISOString().slice(0,19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported revenue data");
  };

  // ── Retry on error ──────────────────────────────────────────────────────────
  const retryFetch = async () => {
    setHasError(false);
    await fetchDashboardData(true);
  };

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const ok = await checkAdminAccess();
      if (!ok) return;
      await fetchDashboardData();
      await fetchRealNotifications();
      await logActivity("logged_in");

      try {
        subscriptionRef.current = supabase.channel("admin_notifs")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, async () => {
            await fetchRealNotifications();
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "store_requests" }, async () => {
            await fetchRealNotifications();
          })
          .subscribe();
      } catch {}
    };
    init();
    return () => { subscriptionRef.current?.unsubscribe(); };
  }, [checkAdminAccess, fetchDashboardData, fetchRealNotifications, logActivity]);

  useEffect(() => {
    if (!currentAdmin) return;
    const statsSub = supabase.channel("stats-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchDashboardData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => fetchDashboardData(false))
      .subscribe();
    return () => statsSub.unsubscribe();
  }, [currentAdmin, fetchDashboardData]);

  useEffect(() => {
    if (!currentAdmin) return;
    autoRefreshRef.current = setInterval(() => fetchDashboardData(false), 30000);
    return () => clearInterval(autoRefreshRef.current);
  }, [currentAdmin, fetchDashboardData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Back online – refreshing data");
      fetchDashboardData(true);
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You are offline. Showing cached data.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
      if (window.innerWidth < 768) setSidebarCollapsed(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showNotifications && !e.target.closest(".notif-dropdown") && !e.target.closest(".icon-btn")) {
        setShowNotifications(false);
      }
      if (sidebarOpen && window.innerWidth < 1024 && !e.target.closest(".adm-sidebar") && !e.target.closest(".mobile-menu-btn")) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifications, sidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        fetchDashboardData(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector(".search-bar input")?.focus();
      }
      if (e.key === "Escape") {
        setShowAddAdmin(false);
        setShowNotifications(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchDashboardData]);

  // Redirect if no admin after loading finished
  useEffect(() => {
    if (!loading && !currentAdmin && user) {
      navigate("/admin-auth", { replace: true });
    }
  }, [loading, currentAdmin, user, navigate]);

  // ── Memoized values ────────────────────────────────────────────────────────
  const chartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: darkMode ? "#94a3b8" : "#64748b", font: { size: 12, family: "'DM Sans',sans-serif" } } },
      tooltip: {
        backgroundColor: darkMode ? "#1e293b" : "#fff",
        titleColor: darkMode ? "#e2e8f0" : "#1e293b",
        bodyColor: darkMode ? "#94a3b8" : "#64748b",
        borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        borderWidth: 1, padding: 12, cornerRadius: 8,
        callbacks: { label: (ctx) => `$${ctx.parsed.y.toLocaleString()}` }
      }
    },
    scales: {
      x: { grid: { color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }, ticks: { color: darkMode ? "#475569" : "#94a3b8", font: { size: 11 } }, border: { display: false } },
      y: { grid: { color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }, ticks: { color: darkMode ? "#475569" : "#94a3b8", font: { size: 11 }, callback: v => `$${v.toLocaleString()}` }, border: { display: false } }
    }
  }), [darkMode]);

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);
  
  const adminModules = useMemo(() => [
    { icon:<FiHome/>, title:"Dashboard", desc:"Analytics & overview", path:"/admin-dashboard", perm:"view_dashboard" },
    { icon:<FiUsers/>, title:"Users", desc:"Manage platform users", path:"/admin/users", perm:"manage_users" },
    { icon:<FiBriefcase/>, title:"Stores", desc:"Oversee store accounts", path:"/admin/stores", perm:"manage_stores" },
    { icon:<FiShoppingCart/>, title:"Products", desc:"Moderate listings", path:"/admin/products", perm:"manage_products" },
    { icon:<FiPackage/>, title:"Categories", desc:"Tags & categories", path:"/admin/categories", perm:"manage_categories" },
    { icon:<FiMessageSquare/>, title:"Messages", desc:"Monitor conversations", path:"/admin/messages", perm:"manage_messages" },
    { icon:<FiDollarSign/>, title:"Finance", desc:"Revenue & payments", path:"/admin/finance", perm:"manage_finance" },
    { icon:<FiCreditCard/>, title:"Wallets", desc:"User wallet oversight", path:"/admin/wallet", perm:"manage_wallets" },
    { icon:<FiStar/>, title:"Ratings", desc:"Reviews & ratings", path:"/admin/ratings", perm:"manage_ratings" },
    { icon:<FiClipboard/>, title:"Installments", desc:"Payment plans", path:"/admin/installments", perm:"manage_installments" },
    { icon:<FiFileText/>, title:"Reports", desc:"Analytics & insights", path:"/admin/reports", perm:"view_reports" },
    { icon:<FiUserPlus/>, title:"Admins", desc:"Manage admin team", path:"/admin/admins", perm:"manage_admins" },
    { icon:<FiSettings/>, title:"Settings", desc:"System configuration", path:"/admin/settings", perm:"manage_settings" },
    { icon:<FiDatabase/>, title:"Database", desc:"Advanced operations", path:"/admin/database", perm:"manage_database" },
    { icon:<FiAward/>, title:"Promotions", desc:"Offers & deals", path:"/admin/promotions", perm:"manage_promotions" },
  ].filter(m => isSuperAdmin || hasPermission(m.perm)), [isSuperAdmin, hasPermission]);

  const statCards = [
    { icon:<FiUsers/>, label:"Total Users", value:adminStats.totalUsers.toLocaleString(), change:"+12%", up:true, color:"#6366F1" },
    { icon:<FiBriefcase/>, label:"Total Stores", value:adminStats.totalStores.toLocaleString(), change:"+8%", up:true, color:"#10B981" },
    { icon:<FiShoppingCart/>, label:"Products", value:adminStats.totalProducts.toLocaleString(), change:"+15%", up:true, color:"#F59E0B" },
    { icon:<FiAlertTriangle/>, label:"Pending Approvals", value:adminStats.pendingApprovals.toLocaleString(), change:"-5%", up:false, color:"#EF4444" },
    { icon:<FiClipboard/>, label:"Today's Orders", value:adminStats.todaysOrders.toLocaleString(), change:"+10%", up:true, color:"#8B5CF6" },
    { icon:<FiDollarSign/>, label:"Today's Revenue", value:`$${adminStats.revenue.toLocaleString()}`, change:"+23%", up:true, color:"#06B6D4" },
  ];

  // Show skeleton while loading OR if no admin (but still loading? Actually if loading false and no admin, redirect happens)
  if (loading || !currentAdmin) {
    return <DashboardSkeleton darkMode={darkMode} />;
  }

  return (
    <div className={`adm-root${darkMode ? " dark" : ""}`}>
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`adm-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="adm-sidebar-brand">
          <div className="brand-logo" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
            {isSuperAdmin ? <FaCrown /> : <FiShield />}
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">OmniFlow</div>
              <div className="brand-role">{isSuperAdmin ? "Super Admin" : "Admin Panel"}</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)} title={sidebarCollapsed ? "Expand" : "Collapse"}>
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="adm-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(m => (
            <button
              key={m.path}
              className={`nav-item${location.pathname === m.path ? " active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => {
                navigate(m.path);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? m.title : undefined}
            >
              <span className="nav-icon">{m.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{m.title}</span>}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            {!sidebarCollapsed && (
              <div style={{ overflow: "hidden" }}>
                <div className="profile-name">{user?.email === SUPER_ADMIN_EMAIL ? "Super Admin" : currentAdmin?.email?.split("@")[0] || "Admin"}</div>
                <div className="profile-role" style={{ color: rc.primary }}>{currentAdmin?.role?.replace("_", " ")}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <FiLogOut style={{ fontSize: 16, flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <div>
              <div className="topbar-title">
                Dashboard
                {isSuperAdmin && <span className="super-badge" style={{ background: rc.badge }}>SUPER ADMIN</span>}
              </div>
              <div className="topbar-sub">
                Welcome back, {user?.email === SUPER_ADMIN_EMAIL ? "Super Admin" : currentAdmin?.role?.charAt(0).toUpperCase() + (currentAdmin?.role?.slice(1) || "")}
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Search admin panel... (Ctrl+K)"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value) navigate(`/admin/search?q=${e.target.value}`); }}
              />
            </div>

            {isOffline && (
              <div className="offline-indicator">
                <FiAlertCircle /> Offline
              </div>
            )}

            <div style={{ position: "relative" }}>
              <button className="icon-btn" onClick={() => setShowNotifications(p => !p)}>
                <FiBell />
                {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div className="notif-dropdown" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="notif-header">Notifications</div>
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No pending notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="notif-item">
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{n.time}</div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="icon-btn theme-toggle" onClick={toggleDarkMode}>
              {darkMode ? "☀️" : "🌙"}
            </button>

            <div className="role-chip">
              <div className="role-chip-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown style={{ fontSize: 10 }} /> : <FaShieldAlt style={{ fontSize: 10 }} />}
              </div>
              <div>
                <div className="role-chip-label" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase()}</div>
                <div className="role-chip-status">● Online</div>
              </div>
            </div>
          </div>
        </header>

        <div className="adm-content">
          {hasError && (
            <div className="error-banner">
              <FiAlertCircle />
              <span>Failed to load dashboard data</span>
              <button onClick={retryFetch}>Retry</button>
            </div>
          )}

          {isSuperAdmin ? (
            <div className="role-banner" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))`, borderColor: "rgba(245,158,11,0.25)", color: "#92400E" }}>
              <div className="banner-inner">
                <div className="banner-icon-wrap" style={{ background: "rgba(245,158,11,0.2)" }}>
                  <FaCrown style={{ color: "#F59E0B" }} />
                </div>
                <div>
                  <div className="banner-title" style={{ color: darkMode ? "#FCD34D" : "#92400E" }}>Super Admin Privileges Active</div>
                  <div className="banner-sub" style={{ color: darkMode ? "rgba(252,211,77,0.7)" : "#B45309" }}>Full system control — you can manage all admin users and settings</div>
                </div>
              </div>
              <button className="add-admin-btn" style={{ background: rc.badge }} onClick={() => setShowAddAdmin(true)}>
                <FiUserPlus /> Add Admin
              </button>
            </div>
          ) : (
            <div className="role-banner" style={{ background: rc.accent, borderColor: rc.primary + "33" }}>
              <div className="banner-inner">
                <div className="banner-icon-wrap" style={{ background: rc.primary + "22" }}>
                  <FaShieldAlt style={{ color: rc.primary }} />
                </div>
                <div>
                  <div className="banner-title" style={{ color: rc.primary }}>{currentAdmin?.role?.charAt(0).toUpperCase() + (currentAdmin?.role?.slice(1) || "")} Dashboard</div>
                  <div className="banner-sub" style={{ color: rc.primary + "aa" }}>You have access to {currentAdmin?.permissions?.length || 0} system permissions</div>
                </div>
              </div>
            </div>
          )}

          <div className="stats-grid">
            {statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card-inner">
                  <div className="stat-icon" style={{ background: s.color + "18", color: s.color }}>{s.icon}</div>
                  <div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                    <span className={`stat-change ${s.up ? "up" : "down"}`}>
                      {s.up ? <FiTrendingUp style={{ fontSize: 11 }} /> : <FiTrendingDown style={{ fontSize: 11 }} />}
                      {s.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div>
                <div className="chart-title">Revenue Trend</div>
                <div className="chart-sub">
                  Last 6 months · Updated {lastRefresh ? (() => {
                    const diff = Math.floor((new Date() - lastRefresh) / 1000);
                    if (diff < 60) return "just now";
                    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
                    return `${Math.floor(diff / 3600)} hours ago`;
                  })() : "never"}
                </div>
              </div>
              <div className="chart-actions">
                <button className="chart-refresh" onClick={() => fetchDashboardData(true)}>
                  <FiRefreshCw size={12} /> Refresh
                </button>
                <button className="chart-refresh" onClick={exportChartData}>
                  <FiDownload size={12} /> Export
                </button>
              </div>
            </div>
            <div className="chart-wrap">
              {chartData?.labels?.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="chart-fallback">No data available</div>
              )}
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="section-card">
              <div className="section-header">
                <div>
                  <div className="section-title">Quick Access</div>
                  <div className="section-sub">Navigate platform modules</div>
                </div>
                <span className="section-count">{adminModules.length} modules</span>
              </div>
              <div className="modules-grid">
                {adminModules.map((m, i) => (
                  <div key={i} className="module-card" onClick={() => navigate(m.path)}>
                    <div className="module-icon" style={{ background: rc.accent, color: rc.primary }}>{m.icon}</div>
                    <div style={{ overflow: "hidden" }}>
                      <div className="module-title">{m.title}</div>
                      <div className="module-desc">{m.desc}</div>
                    </div>
                    <div className="module-arrow"><FiChevronRight /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="right-col">
              {isSuperAdmin && (
                <div className="section-card">
                  <div className="section-header">
                    <div>
                      <div className="section-title">Admin Team</div>
                      <div className="section-sub">Active administrators</div>
                    </div>
                    <span className="section-count">{adminUsers.filter(a => a.is_active).length} active</span>
                  </div>
                  {adminUsers.slice(0, 5).map(admin => {
                    const arc = getRoleColor(admin.role);
                    return (
                      <div key={admin.id} className="admin-user-row">
                        <div className="user-avatar" style={{ background: arc.badge, color: admin.role === "super_admin" ? "#000" : "#fff" }}>
                          {admin.role === "super_admin" ? <FaCrown style={{ fontSize: 12 }} /> : <FiUser style={{ fontSize: 12 }} />}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div className="user-email" title={admin.email}>{admin.email}</div>
                          <div className="user-role" style={{ color: arc.primary }}>{admin.role.replace("_", " ")}{admin.role === "super_admin" ? " 👑" : ""}</div>
                        </div>
                        {admin.role !== "super_admin" && (
                          <button
                            className="toggle-btn"
                            style={{ background: admin.is_active ? arc.primary + "18" : "rgba(100,116,139,0.1)", color: admin.is_active ? arc.primary : "#64748B" }}
                            onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                            title={admin.is_active ? "Deactivate" : "Activate"}
                          >
                            {admin.is_active ? <FiCheckCircle /> : <FiX />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ paddingTop: 12 }}>
                    <button className="view-all-btn" style={{ color: rc.primary }} onClick={() => navigate("/admin/admins")}>
                      <FiEye style={{ marginRight: 4, fontSize: 12 }} /> View All Admins
                    </button>
                  </div>
                </div>
              )}

              <div className="section-card">
                <div className="section-header">
                  <div>
                    <div className="section-title">Recent Activity</div>
                    <div className="section-sub">Latest system events</div>
                  </div>
                  <button className="view-all-btn" style={{ color: rc.primary }} onClick={() => navigate("/admin/activities")}>
                    View All
                  </button>
                </div>
                {recentActivities.slice(0, 6).map((a, i) => (
                  <div key={a.id || i} className="activity-item">
                    <div className="activity-avatar" style={{ background: rc.accent, color: rc.primary }}>
                      <FiActivity />
                    </div>
                    <div>
                      <div className="activity-text activity-action">{a.action?.replace(/_/g, " ")}</div>
                      <div className="activity-time">{new Date(a.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddAdmin && isSuperAdmin && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddAdmin(false)}>
            <motion.div className="modal-box" initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Admin</h3>
                <button className="modal-close" onClick={() => setShowAddAdmin(false)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">User Email</label>
                  <input type="email" className="form-input" placeholder="user@example.com" value={newAdminData.email} onChange={e => setNewAdminData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newAdminData.role} onChange={e => setNewAdminData(p => ({ ...p, role: e.target.value }))}>
                    <option value="moderator">Moderator</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Permissions granted</label>
                  <div className="perm-list">
                    {(availablePermissions[newAdminData.role] || []).map(p => (
                      <span key={p} className="perm-chip">{p.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowAddAdmin(false)}>Cancel</button>
                <button className="btn-confirm" style={{ background: rc.badge }} onClick={addAdminUser} disabled={!newAdminData.email}>
                  <FiUserPlus /> Add Admin
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