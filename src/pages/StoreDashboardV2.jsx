import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaBox, FaCommentDots, FaUpload, FaClipboardCheck, FaBoxOpen,
  FaUser, FaMoneyBillAlt, FaMoneyBillWave, FaArrowLeft, FaArrowRight,
  FaChartLine, FaCreditCard, FaMoneyCheckAlt, FaShoppingBag, FaDollarSign,
  FaStore, FaUsers, FaStar, FaBell, FaShoppingCart, FaTimes, FaBars,
  FaWallet, FaReceipt, FaDownload, FaFilter, FaEdit, FaFire, FaCheck,
  FaTruck, FaShippingFast, FaHourglassHalf, FaCheckCircle, FaExclamationTriangle,
  FaInfoCircle, FaCamera, FaImage, FaTrash, FaPlus, FaSave, FaUndo,
  FaSun, FaMoon, FaSearch, FaCog, FaSignOutAlt, FaCopy, FaShare,
  FaEye, FaEyeSlash, FaArrowUp, FaArrowDown, FaHistory, FaMoneyBillWaveAlt,
  FaPercentage, FaTable, FaChartPie, FaPlusCircle, FaClock, FaChartBar,
  FaTicketAlt, FaGift, FaUsers as FaCustomers, FaFileInvoice, FaCalendarAlt,
  FaExchangeAlt, FaShippingFast as FaDelivery, FaTachometerAlt
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InstallmentOrdersTab from '../components/InstallmentOrdersTab';
import InstallmentSetupModal from '../components/InstallmentSetupModal';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import './StoreDashboardV2.css';

// App categories
const APP_CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'fashion', label: 'Fashion', icon: '👕' },
  { id: 'home-living', label: 'Home & Living', icon: '🏠' },
  { id: 'beauty-health', label: 'Beauty & Health', icon: '💄' },
  { id: 'sports-outdoors', label: 'Sports & Outdoors', icon: '⚽' },
  { id: 'automotive', label: 'Automotive', icon: '🚗' },
  { id: 'books-media', label: 'Books & Media', icon: '📚' },
  { id: 'toys-kids', label: 'Toys & Kids', icon: '🧸' },
  { id: 'food-beverages', label: 'Food & Beverages', icon: '🍔' },
  { id: 'pet-supplies', label: 'Pet Supplies', icon: '🐕' },
  { id: 'office-supplies', label: 'Office Supplies', icon: '📎' },
  { id: 'other', label: 'Other', icon: '📦' }
];

// Commission rates by category
const COMMISSION_RATES = [
  { category: 'electronics', rate: 5, minRate: 3, maxRate: 8, description: 'Electronics & Gadgets' },
  { category: 'fashion', rate: 8, minRate: 5, maxRate: 12, description: 'Clothing & Accessories' },
  { category: 'home-living', rate: 7, minRate: 4, maxRate: 10, description: 'Home & Living' },
  { category: 'beauty-health', rate: 6, minRate: 4, maxRate: 9, description: 'Beauty & Health' },
  { category: 'sports-outdoors', rate: 6, minRate: 4, maxRate: 9, description: 'Sports & Outdoors' },
  { category: 'automotive', rate: 5, minRate: 3, maxRate: 8, description: 'Automotive' },
  { category: 'books-media', rate: 4, minRate: 2, maxRate: 6, description: 'Books & Media' },
  { category: 'toys-kids', rate: 6, minRate: 4, maxRate: 9, description: 'Toys & Kids' },
  { category: 'food-beverages', rate: 7, minRate: 5, maxRate: 10, description: 'Food & Beverages' },
  { category: 'pet-supplies', rate: 5, minRate: 3, maxRate: 8, description: 'Pet Supplies' },
  { category: 'office-supplies', rate: 4, minRate: 2, maxRate: 6, description: 'Office Supplies' },
  { category: 'other', rate: 9, minRate: 7, maxRate: 12, description: 'Other Products' }
];

// Status flow
const STATUS_FLOW = [
  { value: 'pending', label: 'Pending', icon: <FaHourglassHalf />, color: '#F59E0B', step: 1, nextStatus: 'processing', prevStatus: null },
  { value: 'processing', label: 'Processing', icon: <FaBox />, color: '#3B82F6', step: 2, nextStatus: 'shipped', prevStatus: 'pending' },
  { value: 'shipped', label: 'Shipped', icon: <FaShippingFast />, color: '#8B5CF6', step: 3, nextStatus: 'out for delivery', prevStatus: 'processing' },
  { value: 'out for delivery', label: 'Out for Delivery', icon: <FaTruck />, color: '#EC4899', step: 4, nextStatus: 'delivered', prevStatus: 'shipped' },
  { value: 'delivered', label: 'Delivered', icon: <FaCheckCircle />, color: '#10B981', step: 5, nextStatus: null, prevStatus: 'out for delivery' }
];

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const StoreDashboardV2 = () => {
  const { user } = useContext(AuthContext);
  const [section, setSection] = useState('overview');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [files, setFiles] = useState([]);
  const [products, setProducts] = useState([]);
  const [store, setStore] = useState(null);
  const [editedProductIds, setEditedProductIds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [lipaPolepole, setLipaPolepole] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState(30);
  const [installments, setInstallments] = useState([]);
  const [currentImageIndices, setCurrentImageIndices] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(false);
  const [newPaymentNotification, setNewPaymentNotification] = useState(false);
  const [installmentModalProduct, setInstallmentModalProduct] = useState(null);
  const [flashSaleModalProduct, setFlashSaleModalProduct] = useState(null);
  const [flashSaleDuration, setFlashSaleDuration] = useState(24);
  const [flashSaleDiscount, setFlashSaleDiscount] = useState(10);
  const [loadingFlashSale, setLoadingFlashSale] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [incompleteItems, setIncompleteItems] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('v2_darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  // NEW STATE VARIABLES FOR ADDED FEATURES
  const [coupons, setCoupons] = useState([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [selfDeliveryModalOpen, setSelfDeliveryModalOpen] = useState(false);
  const [selfDeliveryData, setSelfDeliveryData] = useState({
    fleet_size: 1,
    coverage_radius: 50,
    base_fee: 100,
    rate_per_km: 15
  });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({ dailySales: [], totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, weeklyGrowth: 0, monthlyGrowth: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Payout states
  const [sellerPayouts, setSellerPayouts] = useState([]);
  const [totalPayouts, setTotalPayouts] = useState(0);
  const [pendingPayoutsList, setPendingPayoutsList] = useState([]);
  const [completedPayoutsList, setCompletedPayoutsList] = useState([]);
  
  const [dashboardStats, setDashboardStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    lipaPolepoleEarnings: 0,
    thisMonthEarnings: 0,
    totalOrders: 0,
    successfulOrders: 0,
    totalRevenue: 0,
    walletBalance: 0,
    pendingOrders: 0,
    incompleteProducts: 0,
    unreadMessages: 0,
    totalViews: 0,
    conversionRate: 0
  });
  
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [lipaPolepoleProducts, setLipaPolepoleProducts] = useState([]);
  const [storePerformance, setStorePerformance] = useState({
    sellerScore: 0,
    totalRatings: 0,
    averageRating: 0,
    totalViews: 0
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    discount: '',
    category: '',
    stock_quantity: '',
    description: '',
    tags: '',
    variants: '',
    warranty: '',
    return_policy: '',
    return_policy_days: 7,
    delivery_methods: { pickup: true, door: true, express: false, same_day: false, standard: true },
    delivery_estimated_days: 3,
    free_delivery_threshold: 5000,
    delivery_notes: '',
    usage_guide: '',
    commission_rate: 5
  });

  const [loadingPost, setLoadingPost] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [editModalProduct, setEditModalProduct] = useState(null);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('v2_darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add('v2-dark-mode');
    } else {
      document.body.classList.remove('v2-dark-mode');
    }
  }, [darkMode]);

  // Get status info
  const getStatusInfo = (status) => {
    return STATUS_FLOW.find(s => s.value === status?.toLowerCase()) || STATUS_FLOW[0];
  };

  const getNextStatus = (currentStatus) => {
    const current = getStatusInfo(currentStatus);
    if (current.nextStatus) {
      return STATUS_FLOW.find(s => s.value === current.nextStatus);
    }
    return null;
  };

  const getPreviousStatus = (currentStatus) => {
    const current = getStatusInfo(currentStatus);
    if (current.prevStatus) {
      return STATUS_FLOW.find(s => s.value === current.prevStatus);
    }
    return null;
  };

  const handleMarkForInstallment = (product) => { setInstallmentModalProduct(product); };
  const handleFlashSaleRequest = (product) => { setFlashSaleModalProduct(product); };

  // ========== NEW FEATURE FUNCTIONS ==========

  // Fetch analytics data with growth calculations
  const fetchAnalytics = async () => {
    if (!store) return;
    setLoadingAnalytics(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: allOrders } = await supabase
        .from('orders')
        .select('created_at, total_price, status')
        .eq('store_id', store.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      // Calculate daily sales for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const dailySalesMap = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailySalesMap[dateStr] = { date: dateStr, sales: 0, orders: 0 };
      }
      
      let totalRevenue = 0;
      let totalDeliveredOrders = 0;
      let lastWeekRevenue = 0;
      let thisWeekRevenue = 0;
      const now = new Date();
      
      (allOrders || []).forEach(order => {
        totalRevenue += order.total_price || 0;
        if (order.status === 'delivered') totalDeliveredOrders++;
        
        const orderDate = new Date(order.created_at);
        const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailySalesMap[dateStr]) {
          dailySalesMap[dateStr].sales += order.total_price || 0;
          dailySalesMap[dateStr].orders++;
        }
        
        // Calculate weekly growth
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 7 && daysAgo < 14) {
          lastWeekRevenue += order.total_price || 0;
        } else if (daysAgo < 7) {
          thisWeekRevenue += order.total_price || 0;
        }
      });
      
      const weeklyGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
      
      // Calculate monthly growth
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      
      let lastMonthRevenue = 0;
      let thisMonthRevenue = 0;
      (allOrders || []).forEach(order => {
        const orderDate = new Date(order.created_at);
        if (orderDate >= lastMonthStart && orderDate < thisMonthStart) {
          lastMonthRevenue += order.total_price || 0;
        } else if (orderDate >= thisMonthStart) {
          thisMonthRevenue += order.total_price || 0;
        }
      });
      
      const monthlyGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      
      setAnalyticsData({
        dailySales: Object.values(dailySalesMap),
        totalOrders: allOrders?.length || 0,
        totalRevenue,
        avgOrderValue: totalDeliveredOrders > 0 ? totalRevenue / totalDeliveredOrders : 0,
        weeklyGrowth,
        monthlyGrowth
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch coupons
  const fetchCoupons = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error && error.code !== 'PGRST116') throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  // Create coupon
  const createCoupon = async (couponData) => {
    try {
      const { error } = await supabase.from('coupons').insert([{
        ...couponData,
        store_id: store.id,
        used_count: 0,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      toast.success('Coupon created successfully!');
      fetchCoupons();
      setCouponModalOpen(false);
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    }
  };

  // Update coupon
  const updateCoupon = async (id, couponData) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', id);
      if (error) throw error;
      toast.success('Coupon updated successfully!');
      fetchCoupons();
      setCouponModalOpen(false);
      setEditingCoupon(null);
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon');
    }
  };

  // Delete coupon
  const deleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('buyer_id, buyer:buyer_id(name, email, phone), total_price, created_at, status')
        .eq('store_id', store.id)
        .eq('status', 'delivered');
      
      if (error && error.code !== 'PGRST116') throw error;
      
      const customerMap = new Map();
      (data || []).forEach(order => {
        if (order.buyer_id && order.buyer) {
          if (!customerMap.has(order.buyer_id)) {
            customerMap.set(order.buyer_id, {
              id: order.buyer_id,
              name: order.buyer.name || 'Anonymous',
              email: order.buyer.email,
              phone: order.buyer.phone,
              total_orders: 0,
              total_spent: 0,
              last_order_date: order.created_at
            });
          }
          const customer = customerMap.get(order.buyer_id);
          customer.total_orders++;
          customer.total_spent += order.total_price;
          if (new Date(order.created_at) > new Date(customer.last_order_date)) {
            customer.last_order_date = order.created_at;
          }
        }
      });
      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Fetch returns
  const fetchReturns = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*, product:product_id(name, image_gallery), order:order_id(total_price, created_at)')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      if (error && error.code !== 'PGRST116') throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    }
  };

  // Process return
  const processReturn = async (returnId, action, adminNotes) => {
    try {
      if (action === 'approve') {
        const { data, error } = await supabase.rpc('process_return_refund', {
          p_return_id: returnId
        });
        if (error) throw error;
        toast.success('Return approved and refund processed!');
      } else {
        const { error } = await supabase
          .from('returns')
          .update({ status: 'rejected', admin_notes: adminNotes, approved_at: new Date().toISOString() })
          .eq('id', returnId);
        if (error) throw error;
        toast.success('Return rejected');
      }
      fetchReturns();
      fetchDashboardData();
      setReturnModalOpen(false);
      setSelectedReturn(null);
    } catch (error) {
      console.error('Error processing return:', error);
      toast.error('Failed to process return');
    }
  };

  // Fetch low stock alerts
  const fetchLowStockAlerts = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select('*, product:product_id(name, image_gallery, price, stock_quantity)')
        .eq('store_id', store.id)
        .eq('is_resolved', false);
      if (error && error.code !== 'PGRST116') throw error;
      setLowStockAlerts(data || []);
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
    }
  };

  // Fetch store settings (with error handling for missing table)
  const fetchStoreSettings = async () => {
    if (!store) return;
    try {
      // First check if the table exists by trying to select from it
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();
      
      // If table doesn't exist (PGRST116), we'll use store data as fallback
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist yet, use store data
        setStoreSettings({
          delivery_type: store.delivery_type || 'omniflow-managed',
          has_delivery_fleet: store.has_delivery_fleet || false,
          delivery_fleet_size: store.delivery_fleet_size || 0,
          delivery_coverage_radius: store.delivery_coverage_radius || 50,
          delivery_base_fee: store.delivery_base_fee || 100,
          delivery_rate_per_km: store.delivery_rate_per_km || 15
        });
        return;
      }
      if (error) throw error;
      
      if (data) {
        setStoreSettings(data);
      } else {
        // No settings found, use store defaults
        setStoreSettings({
          delivery_type: store.delivery_type || 'omniflow-managed',
          has_delivery_fleet: store.has_delivery_fleet || false,
          delivery_fleet_size: store.delivery_fleet_size || 0,
          delivery_coverage_radius: store.delivery_coverage_radius || 50,
          delivery_base_fee: store.delivery_base_fee || 100,
          delivery_rate_per_km: store.delivery_rate_per_km || 15
        });
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
      // Fallback to store data
      setStoreSettings({
        delivery_type: store.delivery_type || 'omniflow-managed',
        has_delivery_fleet: store.has_delivery_fleet || false,
        delivery_fleet_size: store.delivery_fleet_size || 0,
        delivery_coverage_radius: store.delivery_coverage_radius || 50,
        delivery_base_fee: store.delivery_base_fee || 100,
        delivery_rate_per_km: store.delivery_rate_per_km || 15
      });
    }
  };

  // Update store settings
  const updateStoreSettings = async (settings) => {
    try {
      // Try to upsert into store_settings table
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: store.id,
          ...settings,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Also update stores table
      const { error: storeError } = await supabase
        .from('stores')
        .update({
          delivery_type: settings.delivery_type,
          has_delivery_fleet: settings.has_delivery_fleet,
          delivery_fleet_size: settings.delivery_fleet_size,
          delivery_coverage_radius: settings.delivery_coverage_radius,
          delivery_base_fee: settings.delivery_base_fee,
          delivery_rate_per_km: settings.delivery_rate_per_km
        })
        .eq('id', store.id);
      if (storeError) throw storeError;
      
      toast.success('Store settings updated successfully!');
      fetchStoreSettings();
      setSelfDeliveryModalOpen(false);
    } catch (error) {
      console.error('Error updating store settings:', error);
      toast.error('Failed to update store settings');
    }
  };

  // Generate invoice PDF
  const generateInvoice = (order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;
    
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Invoice #: INV-${order.id.slice(0, 8).toUpperCase()}`, margin, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
    y += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(store?.name || 'Your Store', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(store?.contact_email || '', margin, y);
    y += 6;
    doc.text(store?.contact_phone || '', margin, y);
    y += 15;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Bill To:', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(order.buyer?.name || 'Customer', margin, y);
    y += 5;
    if (order.buyer?.email) doc.text(order.buyer.email, margin, y);
    y += 5;
    if (order.buyer?.phone) doc.text(order.buyer.phone, margin, y);
    y += 15;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Order Details:', margin, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Order ID: ${order.id.slice(0, 12)}...`, margin, y);
    y += 6;
    doc.text(`Product: ${order.product?.name || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`Quantity: ${order.quantity || 1}`, margin, y);
    y += 6;
    doc.text(`Delivery Location: ${order.delivery_location || 'N/A'}`, margin, y);
    y += 15;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Subtotal: Ksh ${formatPrice((order.total_price || 0) - (order.delivery_fee || 0))}`, margin, y);
    y += 7;
    doc.text(`Delivery Fee: Ksh ${formatPrice(order.delivery_fee || 0)}`, margin, y);
    y += 7;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total: Ksh ${formatPrice(order.total_price || 0)}`, margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Commission (${((order.commission_rate || 0.05) * 100).toFixed(1)}%): Ksh ${formatPrice(order.commission_amount || 0)}`, margin, y);
    y += 15;
    
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for shopping with us!', pageWidth / 2, y + 30, { align: 'center' });
    
    doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
  };

  const submitFlashSaleRequest = async () => {
    if (!flashSaleModalProduct) return;
    setLoadingFlashSale(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(flashSaleDuration));
      const { error } = await supabase.from('flash_sale_requests').insert({
        product_id: flashSaleModalProduct.id,
        store_id: flashSaleModalProduct.store_id,
        requested_duration_hours: parseInt(flashSaleDuration),
        requested_discount_percent: parseInt(flashSaleDiscount),
        status: 'pending',
        expires_at: expiresAt.toISOString()
      });
      if (error) throw error;
      toast.success('Flash sale request submitted for admin review!');
      setFlashSaleModalProduct(null);
      setFlashSaleDuration(24);
      setFlashSaleDiscount(10);
    } catch (error) {
      console.error('Flash sale request error:', error);
      toast.error('Failed to submit flash sale request');
    } finally {
      setLoadingFlashSale(false);
    }
  };

  const fetchSellerPayouts = async () => {
    if (!store || !user) return;
    try {
      const { data: completedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*, product:product_id(name, price, category)')
        .eq('store_id', store.id)
        .eq('escrow_released', true)
        .order('updated_at', { ascending: false });
      
      if (ordersError && ordersError.code !== 'PGRST116') throw ordersError;
      
      const payouts = (completedOrders || []).map(order => ({
        id: order.id,
        orderId: order.id.slice(0, 8).toUpperCase(),
        productName: order.product?.name || 'Unknown Product',
        amount: order.price_paid || order.total_price || 0,
        commissionAmount: order.commission_amount || 0,
        netAmount: (order.price_paid || order.total_price || 0) - (order.commission_amount || 0),
        status: 'completed',
        date: order.updated_at,
        paymentMethod: order.payment_method || 'Wallet',
        reference: `PAY-${order.id.slice(0, 8)}`
      }));
      
      setSellerPayouts(payouts);
      setTotalPayouts(payouts.reduce((sum, p) => sum + p.netAmount, 0));
      
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('*, product:product_id(name, price, category)')
        .eq('store_id', store.id)
        .eq('status', 'delivered')
        .eq('escrow_released', false)
        .order('created_at', { ascending: false });
      
      const pending = (pendingOrders || []).map(order => ({
        id: order.id,
        orderId: order.id.slice(0, 8).toUpperCase(),
        productName: order.product?.name || 'Unknown Product',
        amount: order.price_paid || order.total_price || 0,
        commissionAmount: order.commission_amount || 0,
        netAmount: (order.price_paid || order.total_price || 0) - (order.commission_amount || 0),
        status: 'pending',
        date: order.created_at,
        paymentMethod: order.payment_method || 'Wallet',
        reference: `PND-${order.id.slice(0, 8)}`
      }));
      
      setPendingPayoutsList(pending);
      const completed = payouts.slice(0, 20);
      setCompletedPayoutsList(completed);
      
    } catch (error) {
      console.error('Error fetching seller payouts:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!store || !user) return;
    setLoadingEarnings(true);
    try {
      // Get store data including seller_score from stores table
      const { data: storeData } = await supabase
        .from('stores')
        .select('seller_score, total_orders, successful_orders')
        .eq('id', store.id)
        .maybeSingle();

      if (storeData) {
        setStorePerformance({
          sellerScore: storeData.seller_score || 0,
          totalRatings: storeData.successful_orders || 0,
          averageRating: storeData.seller_score || 0,
          totalViews: 0
        });
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_price, status, created_at, escrow_released, price_paid, delivery_fee, commission_amount')
        .eq('store_id', store.id);
      
      const hasNewOrders = ordersData?.some(order => {
        const diffHours = Math.abs(new Date() - new Date(order.created_at)) / (1000 * 60 * 60);
        return diffHours < 24;
      });
      
      const pendingOrders = ordersData?.filter(o => 
        !['delivered', 'completed', 'cancelled'].includes(o.status?.toLowerCase())
      ).length || 0;

      setNewOrderNotification(hasNewOrders);

      const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const totalEarnings = ordersData?.reduce((sum, o) => sum + (o.price_paid || 0), 0) || 0;
      const pendingPayouts = ordersData?.filter(o => !o.escrow_released && ['delivered', 'completed'].includes(o.status?.toLowerCase()))
        .reduce((sum, o) => sum + ((o.price_paid || 0) - (o.commission_amount || 0)), 0) || 0;
      const completedPayouts = ordersData?.filter(o => o.escrow_released)
        .reduce((sum, o) => sum + ((o.price_paid || 0) - (o.commission_amount || 0)), 0) || 0;
      
      const now = new Date();
      const thisMonthEarnings = ordersData?.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((sum, o) => sum + (o.price_paid || 0), 0) || 0;

      const { data: installmentData } = await supabase
        .from('installment_orders')
        .select('total_price, amount_paid, status')
        .eq('seller_id', user.id);
      
      const lipaPolepoleEarnings = installmentData?.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.amount_paid || 0), 0) || 0;

      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const walletBalance = walletData?.balance || 0;

      const successfulOrders = ordersData?.filter(o => ['delivered', 'completed'].includes(o.status?.toLowerCase())).length || 0;

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, warranty, return_policy, delivery_methods, views')
        .eq('store_id', store.id);
      
      const incompleteProducts = productsData?.filter(p => 
        !p.warranty || !p.return_policy || !p.delivery_methods
      ).length || 0;

      const totalViews = productsData?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;

      const { data: messagesData } = await supabase
        .from('store_messages')
        .select('id')
        .eq('store_id', store.id);
      
      const unreadMessages = messagesData?.length || 0;

      setDashboardStats({
        totalEarnings, pendingPayouts, completedPayouts, lipaPolepoleEarnings,
        thisMonthEarnings, totalOrders: ordersData?.length || 0,
        successfulOrders, totalRevenue, walletBalance,
        pendingOrders, incompleteProducts, unreadMessages,
        totalViews,
        conversionRate: totalViews > 0 ? ((successfulOrders / totalViews) * 100).toFixed(1) : 0
      });

      const incomplete = [];
      if (pendingOrders > 0) incomplete.push({ type: 'orders', count: pendingOrders, message: `${pendingOrders} pending orders` });
      if (incompleteProducts > 0) incomplete.push({ type: 'products', count: incompleteProducts, message: `${incompleteProducts} products need warranty/return policy` });
      if (unreadMessages > 0) incomplete.push({ type: 'messages', count: unreadMessages, message: `${unreadMessages} unread messages` });
      if (lowStockAlerts.length > 0) incomplete.push({ type: 'stock', count: lowStockAlerts.length, message: `${lowStockAlerts.length} products low on stock` });
      setIncompleteItems(incomplete);

      const { data: paymentData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setNewPaymentNotification(paymentData && paymentData.length > 0);

      if (paymentData) {
        setPaymentHistory(paymentData.map(p => ({
          id: p.id, amount: p.amount, created_at: p.created_at, status: p.status,
          payment_method: p.payment_method || 'Wallet',
          reference_id: p.reference || `TXN-${p.id.slice(0, 8)}`,
          type: p.type, description: p.description
        })));
      }
      
      await fetchSellerPayouts();
      await fetchAnalytics();
      await fetchCoupons();
      await fetchCustomers();
      await fetchReturns();
      await fetchLowStockAlerts();
      await fetchStoreSettings();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { error } = await supabase.from('orders')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(),
          delivered: newStatus === 'delivered' ? true : false
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      const statusInfo = STATUS_FLOW.find(s => s.value === newStatus);
      toast.success(`Order #${orderId.slice(0, 8)} is now ${statusInfo?.label || newStatus}`);
      fetchDashboardData();
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const fetchUserInfo = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('users').select('name, email, avatar_url').eq('id', user.id).single();
      if (data) setUserInfo(data);
    } catch (error) { console.error('Error fetching user info:', error); }
  };

  useEffect(() => { fetchUserInfo(); }, [user]);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const { data } = await supabase.from('stores').select('*').eq('owner_id', user?.id).single();
        if (data) setStore(data);
      } catch (error) { console.error('Error fetching store:', error); }
    };
    if (user) fetchStore();
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!store) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, buyer:buyer_id(name, phone, email), product:product_id(name, price, image_gallery, category)')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false });
        if (error && error.code !== 'PGRST116') { console.error("Failed to load orders:", error); }
        else { setOrders(data || []); }
      } catch (error) { console.error("Failed to load orders:", error); }
    };
    fetchOrders();
  }, [store]);

  // Updated navItems with new sections
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaHome />, notification: incompleteItems.length > 0 },
    { id: 'analytics', label: 'Analytics', icon: <FaChartBar />, notification: false },
    { id: 'products', label: 'Products', icon: <FaBox />, notification: dashboardStats.incompleteProducts > 0 },
    { id: 'orders', label: 'Orders', icon: <FaClipboardCheck />, notification: dashboardStats.pendingOrders > 0 },
    { id: 'inventory', label: 'Inventory', icon: <FaBoxOpen />, notification: lowStockAlerts.length > 0 },
    { id: 'coupons', label: 'Coupons', icon: <FaTicketAlt />, notification: false },
    { id: 'customers', label: 'Customers', icon: <FaCustomers />, notification: false },
    { id: 'returns', label: 'Returns', icon: <FaExchangeAlt />, notification: returns?.filter(r => r.status === 'pending').length > 0 },
    { id: 'earnings', label: 'Earnings', icon: <FaChartLine />, notification: false },
    { id: 'payments', label: 'Payments', icon: <FaCreditCard />, notification: newPaymentNotification || pendingPayoutsList.length > 0 },
    { id: 'commission', label: 'Commission', icon: <FaPercentage />, notification: false },
    { id: 'lipa-products', label: 'Lipa Products', icon: <FaShoppingBag />, notification: false },
    { id: 'installments', label: 'Lipa Orders', icon: <FaMoneyBillWave />, notification: false },
    { id: 'store', label: 'Store Settings', icon: <FaStore />, notification: false },
    { id: 'chat', label: 'Support', icon: <FaCommentDots />, notification: dashboardStats.unreadMessages > 0 },
  ];

  const fetchProducts = async () => {
    if (!store) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase.from('products').select('*')
        .eq('store_id', store?.id).order('created_at', { ascending: false });
      if (error && error.code !== 'PGRST116') {
        console.error("Failed to load products:", error);
        return;
      }
      if (data) {
        setProducts(data);
        setCurrentImageIndices(data.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}));
      }
    } catch (error) { console.error("Failed to load products:", error); }
    finally { setLoadingProducts(false); }
  };

  const handleAddInstallment = () => {
    setInstallments([...installments, { percent: '', due_in_days: '' }]);
  };

  const removeInstallment = (index) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (lipaPolepole && installments.length > 0) {
      const totalPercent = parseFloat(initialDeposit || 0) +
        installments.reduce((acc, i) => acc + parseFloat(i.percent || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01 && totalPercent > 0) {
        toast.warn(`Total percentage is ${totalPercent.toFixed(1)}%, must be exactly 100%`);
      }
    }
  }, [initialDeposit, installments]);

  useEffect(() => {
    if (store) {
      fetchProducts();
      fetchDashboardData();
      const fetchLipaProducts = async () => {
        try {
          const { data, error } = await supabase.from('products').select('*')
            .eq('store_id', store.id).eq('lipa_polepole', true)
            .order('created_at', { ascending: false });
          if (!error && data) setLipaPolepoleProducts(data);
        } catch (error) { console.error('Error fetching Lipa products:', error); }
      };
      fetchLipaProducts();
    }
  }, [store]);

  const fetchMessages = async () => {
    if (!store) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase.from('store_messages').select('*')
        .eq('store_id', store?.id).order('created_at', { ascending: true });
      if (error && error.code !== 'PGRST116') {
        console.error("Failed to load messages:", error);
        return;
      }
      if (data) setMessages(data);
    } catch (error) { console.error("Failed to load messages:", error); }
    finally { setLoadingMessages(false); }
  };

  useEffect(() => { if (store) fetchMessages(); }, [store]);

  useEffect(() => {
    if (!store) return;
    const channel = supabase.channel(`store-messages-${store.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_messages', filter: `store_id=eq.${store.id}` },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [store]);

  // Real-time subscriptions for new features
  useEffect(() => {
    if (!store?.id) return;
    
    const orderChannel = supabase.channel(`store-orders-${store.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          toast.info('New order received!');
          fetchDashboardData();
          setOrders(prev => [payload.new, ...prev]);
        })
      .subscribe();
    
    const lowStockChannel = supabase.channel(`low-stock-${store.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'low_stock_alerts', filter: `store_id=eq.${store.id}` },
        () => {
          toast.warning('Low stock alert! Some products need restocking.');
          fetchLowStockAlerts();
        })
      .subscribe();
    
    const returnChannel = supabase.channel(`returns-${store.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'returns', filter: `seller_id=eq.${user?.id}` },
        () => {
          toast.info('New return request received!');
          fetchReturns();
        })
      .subscribe();
    
    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(lowStockChannel);
      supabase.removeChannel(returnChannel);
    };
  }, [store?.id, user?.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => {
      if (files.length + acceptedFiles.length > 10) {
        toast.error('Maximum 10 images allowed');
        return;
      }
      setFiles(prev => [...prev, ...acceptedFiles]);
      toast.success(`Added ${acceptedFiles.length} image(s)`);
    },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 10
  });

  const handleCameraClick = async () => {
    if (cameraPermission === 'denied') {
      toast.error('Camera access denied');
      return;
    }
    
    if (cameraPermission !== 'granted') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setCameraPermission('granted');
        toast.success('Camera access granted');
        return true;
      } catch (error) {
        setCameraPermission('denied');
        toast.error('Camera access denied');
        return false;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      toast.info('Camera opened');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast.error('Could not access camera');
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !store) { toast.error('Message cannot be empty'); return; }
    try {
      const { error } = await supabase.from('store_messages').insert({
        store_id: store.id, user_id: user.id, sender_role: 'seller', content: message
      });
      if (error) throw error;
      toast.success("Message sent.");
      setMessage('');
      fetchDashboardData();
    } catch (error) { toast.error("Failed to send message."); }
  };

  const uploadImage = async (file) => {
    const filePath = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  };

  const handleProductPost = async (e) => {
    e.preventDefault();
    if (!store || !user) { toast.error('Store or user information missing'); return; }
    if (files.length < 3) { toast.error('Please upload at least 3 product images'); return; }

    setLoadingPost(true);
    setUploadProgress([]);

    try {
      const imageUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => [...prev, { file: file.name, status: 'uploading' }]);
        try {
          const url = await uploadImage(file);
          if (url) {
            imageUrls.push(url);
            setUploadProgress(prev => [...prev.slice(0, -1), { file: file.name, status: 'completed' }]);
          }
        } catch (error) {
          setUploadProgress(prev => [...prev.slice(0, -1), { file: file.name, status: 'failed' }]);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (imageUrls.length < 3) { 
        toast.error('At least 3 images are required'); 
        setLoadingPost(false); 
        return; 
      }

      const categoryCommission = COMMISSION_RATES.find(c => c.category === newProduct.category)?.rate || 9;

      const newProductData = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        discount: parseFloat(newProduct.discount) || 0,
        category: newProduct.category,
        stock_quantity: parseInt(newProduct.stock_quantity),
        description: newProduct.description,
        tags: newProduct.tags ? newProduct.tags.split(',').map(t => t.trim()) : [],
        variants: newProduct.variants || null,
        warranty: newProduct.warranty,
        return_policy: newProduct.return_policy,
        return_policy_days: parseInt(newProduct.return_policy_days) || 7,
        delivery_methods: newProduct.delivery_methods,
        delivery_estimated_days: parseInt(newProduct.delivery_estimated_days) || 3,
        free_delivery_threshold: parseFloat(newProduct.free_delivery_threshold) || 5000,
        delivery_notes: newProduct.delivery_notes,
        usage_guide: newProduct.usage_guide,
        commission_rate: categoryCommission / 100,
        owner_id: user.id,
        store_id: store.id,
        image_gallery: imageUrls,
        lipa_polepole: lipaPolepole,
        installment_plan: lipaPolepole ? {
          initial_percent: parseFloat(initialDeposit),
          installments: installments.map(item => ({
            percent: parseFloat(item.percent),
            due_in_days: parseInt(item.due_in_days)
          }))
        } : null
      };

      const { error } = await supabase.from('products').insert([newProductData]).select();
      if (error) throw error;
      toast.success("Product posted successfully!");

      setFiles([]);
      setUploadProgress([]);
      setNewProduct({
        name: '', price: '', discount: '', category: '', stock_quantity: '', description: '',
        tags: '', variants: '', warranty: '', return_policy: '', return_policy_days: 7,
        delivery_methods: { pickup: true, door: true, express: false, same_day: false, standard: true },
        delivery_estimated_days: 3, free_delivery_threshold: 5000,
        delivery_notes: '', usage_guide: '', commission_rate: 5
      });
      setLipaPolepole(false);
      setInitialDeposit(30);
      setInstallments([]);
      await fetchProducts();
      fetchDashboardData();
    } catch (error) {
      console.error('Product post error:', error);
      toast.error("Failed to post product.");
    } finally {
      setLoadingPost(false);
    }
  };

  const handleProductDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success("Product deleted!");
      fetchProducts();
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  const confirmDelete = (id) => setConfirmingDeleteId(id);
  const cancelDelete = () => setConfirmingDeleteId(null);

  const handleConfirmDelete = async () => {
    if (!confirmingDeleteId) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', confirmingDeleteId);
      if (error) throw error;
      toast.success('Product deleted!');
      fetchProducts();
      fetchDashboardData();
    } catch (error) {
      toast.error('Delete failed!');
    }
    setConfirmingDeleteId(null);
  };

  const handleEditClick = (product) => {
    if (!editedProductIds.includes(product.id)) setEditModalProduct(product);
  };

  const handleImageChange = (productId, direction) => {
    setCurrentImageIndices(prev => {
      const images = products.find(p => p.id === productId)?.image_gallery || [];
      const cur = prev[productId] || 0;
      const newIndex = direction === 'next'
        ? (cur + 1) % images.length
        : (cur - 1 + images.length) % images.length;
      return { ...prev, [productId]: newIndex };
    });
  };

  const generateReceipt = (payment) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Receipt - ${payment.reference_id}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}.details{margin:20px 0}.detail-row{display:flex;justify-content:space-between;margin:8px 0}.footer{margin-top:30px;text-align:center;font-size:12px;color:#666}</style>
      </head><body>
      <div class="header"><h2>PAYMENT RECEIPT</h2><p>Reference: ${payment.reference_id}</p></div>
      <div class="details">
        <div class="detail-row"><strong>Date:</strong>${new Date(payment.created_at).toLocaleDateString()}</div>
        <div class="detail-row"><strong>Amount:</strong>Ksh ${payment.amount?.toLocaleString()}</div>
        <div class="detail-row"><strong>Type:</strong>${payment.type}</div>
        <div class="detail-row"><strong>Status:</strong>${payment.status}</div>
        <div class="detail-row"><strong>Method:</strong>${payment.payment_method}</div>
        <div class="detail-row"><strong>Description:</strong>${payment.description || 'N/A'}</div>
      </div>
      <div class="footer"><p>Generated on ${new Date().toLocaleDateString()}</p></div>
      </body></html>`);
    w.document.close();
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(price || 0);

  useEffect(() => {
    if (!store) return;
    const orderChannel = supabase.channel(`store-orders-${store.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          setNewOrderNotification(true);
          toast.info('New order received!');
          fetchDashboardData();
          setOrders(prev => [payload.new, ...prev]);
        })
      .subscribe();
    return () => supabase.removeChannel(orderChannel);
  }, [store]);

  const sectionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    const s = STATUS_FLOW.find(s => s.value === status?.toLowerCase());
    return s?.color || '#6b7280';
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const renderOrderProgress = (currentStatus) => {
    const currentStep = STATUS_FLOW.find(s => s.value === currentStatus?.toLowerCase())?.step || 1;
    
    return (
      <div className="v2-order-progress">
        {STATUS_FLOW.map((step, idx) => (
          <React.Fragment key={step.value}>
            <div className={`v2-progress-step ${step.step <= currentStep ? 'v2-progress-completed' : ''} ${step.value === currentStatus?.toLowerCase() ? 'v2-progress-active' : ''}`}>
              <div className="v2-progress-icon">{step.icon}</div>
              <span className="v2-progress-label">{step.label}</span>
            </div>
            {idx < STATUS_FLOW.length - 1 && (
              <div className={`v2-progress-line ${step.step < currentStep ? 'v2-progress-line-completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div className="v2-skeleton-card">
      <div className="v2-skeleton-icon"></div>
      <div className="v2-skeleton-content">
        <div className="v2-skeleton-title"></div>
        <div className="v2-skeleton-value"></div>
      </div>
    </div>
  );

  return (
    <div className={`v2-dashboard ${darkMode ? 'v2-dark' : ''}`}>
      {/* Mobile Header */}
      <div className="v2-mobile-header">
        <button 
          className="v2-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <div className="v2-mobile-info">
          <span className="v2-store-name">{store?.name || 'My Store'}</span>
          <span className="v2-seller-name">Hi, {userInfo?.name || 'Seller'}</span>
        </div>
        <button 
          className="v2-theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="v2-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`v2-sidebar ${mobileMenuOpen ? 'v2-sidebar-open' : ''}`}>
        <div className="v2-sidebar-header">
          <FaStore className="v2-logo" />
          <div>
            <h2>Seller Hub</h2>
            <p className="v2-store-status">{store?.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
        
        <nav className="v2-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`v2-nav-item ${section === item.id ? 'v2-nav-active' : ''}`}
              onClick={() => {
                setSection(item.id);
                setMobileMenuOpen(false);
              }}
            >
              <span className="v2-nav-icon">{item.icon}</span>
              <span className="v2-nav-label">{item.label}</span>
              {item.notification && <span className="v2-nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="v2-sidebar-footer">
          <div className="v2-user-info">
            <div className="v2-avatar">
              {userInfo?.avatar_url ? (
                <img src={userInfo.avatar_url} alt={userInfo.name} />
              ) : (
                <FaUser />
              )}
            </div>
            <div className="v2-user-details">
              <span className="v2-user-name">{userInfo?.name || 'Seller'}</span>
              <span className="v2-user-email">{userInfo?.email || ''}</span>
            </div>
          </div>
          <div className="v2-sidebar-actions">
            <button className="v2-icon-btn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className="v2-icon-btn" onClick={() => setShowSettings(true)}>
              <FaCog />
            </button>
            <button className="v2-icon-btn" onClick={() => supabase.auth.signOut()}>
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="v2-main">
        {/* Top Bar */}
        <div className="v2-topbar">
          <div className="v2-topbar-left">
            <h1 className="v2-page-title">{navItems.find(i => i.id === section)?.label || 'Dashboard'}</h1>
            <div className="v2-search-box">
              <FaSearch />
              <input
                type="text"
                placeholder={`Search ${section}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="v2-topbar-right">
            <button className="v2-share-btn" onClick={handleShare}>
              <FaShare /> Share
            </button>
            <button className="v2-tutorial-btn" onClick={() => setShowTutorial(true)}>
              <FaInfoCircle />
            </button>
          </div>
        </div>

        {/* Incomplete Items Banner */}
        {incompleteItems.length > 0 && (
          <motion.div 
            className="v2-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FaExclamationTriangle />
            <div className="v2-banner-content">
              <strong>Items needing attention:</strong>
              <div className="v2-banner-items">
                {incompleteItems.map((item, i) => (
                  <span key={i} className="v2-banner-item">{item.message}</span>
                ))}
              </div>
            </div>
            <button className="v2-banner-close" onClick={() => setIncompleteItems([])}>
              <FaTimes />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ========== OVERVIEW SECTION ========== */}
          {section === 'overview' && (
            <motion.div
              key="overview"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="v2-section-header">
                <h2 className="v2-section-title">Dashboard Overview</h2>
                <div className="v2-performance-badge">
                  <FaStar /> Score: {storePerformance.sellerScore.toFixed(1)}
                </div>
              </div>
              
              <div className="v2-stats-grid">
                <div className="v2-stat-card v2-stat-blue">
                  <div className="v2-stat-icon"><FaBox /></div>
                  <div className="v2-stat-content">
                    <h3>Total Products</h3>
                    <p className="v2-stat-value">{products.length}</p>
                  </div>
                </div>

                <div className="v2-stat-card v2-stat-green">
                  <div className="v2-stat-icon"><FaClipboardCheck /></div>
                  <div className="v2-stat-content">
                    <h3>Total Orders</h3>
                    <p className="v2-stat-value">{dashboardStats.totalOrders}</p>
                  </div>
                </div>

                <div className="v2-stat-card v2-stat-purple">
                  <div className="v2-stat-icon"><FaMoneyCheckAlt /></div>
                  <div className="v2-stat-content">
                    <h3>Total Earnings</h3>
                    <p className="v2-stat-value">Ksh {dashboardStats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>

                <div className="v2-stat-card v2-stat-orange">
                  <div className="v2-stat-icon"><FaWallet /></div>
                  <div className="v2-stat-content">
                    <h3>Wallet Balance</h3>
                    <p className="v2-stat-value">Ksh {dashboardStats.walletBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="v2-overview-grid">
                <div className="v2-recent-products">
                  <h3>Recent Products</h3>
                  {loadingProducts ? (
                    <div className="v2-loading">Loading...</div>
                  ) : products.length === 0 ? (
                    <div className="v2-empty-state">
                      <FaBox size={48} />
                      <p>No products yet</p>
                      <button className="v2-btn-primary" onClick={() => setSection('products')}>
                        Add Your First Product
                      </button>
                    </div>
                  ) : (
                    <div className="v2-product-grid">
                      {products.slice(0, 4).map(p => (
                        <div key={p.id} className="v2-product-card">
                          <img src={p.image_gallery?.[0] || '/placeholder.jpg'} alt={p.name} />
                          <div className="v2-product-card-info">
                            <h4>{p.name}</h4>
                            <p className="v2-price">Ksh {formatPrice(p.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="v2-quick-actions">
                  <h3>Quick Actions</h3>
                  <button className="v2-quick-btn" onClick={() => setSection('products')}>
                    <FaPlus /> Add Product
                  </button>
                  <button className="v2-quick-btn" onClick={() => setSection('orders')}>
                    <FaClipboardCheck /> View Orders
                  </button>
                  <button className="v2-quick-btn" onClick={() => setSection('earnings')}>
                    <FaChartLine /> Check Earnings
                  </button>
                  <button className="v2-quick-btn" onClick={() => setSection('chat')}>
                    <FaCommentDots /> Support Chat
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========== ANALYTICS SECTION ========== */}
          {section === 'analytics' && (
            <motion.div
              key="analytics"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Analytics Dashboard</h2>
              
              {loadingAnalytics ? (
                <div className="v2-skeleton-grid"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
              ) : (
                <>
                  <div className="v2-analytics-summary">
                    <div className="v2-analytics-card">
                      <h4>Total Revenue</h4>
                      <p className="v2-analytics-value">Ksh {analyticsData.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="v2-analytics-card">
                      <h4>Total Orders</h4>
                      <p className="v2-analytics-value">{analyticsData.totalOrders}</p>
                    </div>
                    <div className="v2-analytics-card">
                      <h4>Avg Order Value</h4>
                      <p className="v2-analytics-value">Ksh {formatPrice(analyticsData.avgOrderValue)}</p>
                    </div>
                    <div className="v2-analytics-card">
                      <h4>Weekly Growth</h4>
                      <p className={`v2-analytics-value ${analyticsData.weeklyGrowth >= 0 ? 'v2-growth-positive' : 'v2-growth-negative'}`}>
                        {analyticsData.weeklyGrowth >= 0 ? '+' : ''}{analyticsData.weeklyGrowth.toFixed(1)}%
                      </p>
                    </div>
                    <div className="v2-analytics-card">
                      <h4>Monthly Growth</h4>
                      <p className={`v2-analytics-value ${analyticsData.monthlyGrowth >= 0 ? 'v2-growth-positive' : 'v2-growth-negative'}`}>
                        {analyticsData.monthlyGrowth >= 0 ? '+' : ''}{analyticsData.monthlyGrowth.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="v2-chart-container">
                    <h3>📈 Sales Trend (Last 7 Days)</h3>
                    <p className="v2-chart-subtitle">Track your daily sales performance and order volume</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.dailySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value, name) => name === 'sales' ? `Ksh ${value?.toLocaleString()}` : value} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#4F46E5" name="Sales (Ksh)" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" name="Orders" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="v2-insights-box">
                    <h4>📊 Key Insights</h4>
                    <ul>
                      <li>Your best performing day this week: <strong>
                        {analyticsData.dailySales.reduce((best, day) => day.sales > best.sales ? day : best, { sales: 0, date: 'N/A' }).date}
                      </strong> with Ksh {formatPrice(analyticsData.dailySales.reduce((best, day) => day.sales > best.sales ? day : best, { sales: 0 }).sales)}</li>
                      <li>Average daily orders: <strong>{(analyticsData.dailySales.reduce((sum, day) => sum + day.orders, 0) / 7).toFixed(1)}</strong> orders per day</li>
                      <li>Your store has generated <strong>Ksh {formatPrice(analyticsData.totalRevenue)}</strong> in total revenue</li>
                      {analyticsData.weeklyGrowth >= 0 ? (
                        <li className="v2-growth-positive">📈 Weekly revenue is up {analyticsData.weeklyGrowth.toFixed(1)}% compared to last week!</li>
                      ) : (
                        <li className="v2-growth-negative">📉 Weekly revenue is down {Math.abs(analyticsData.weeklyGrowth).toFixed(1)}% compared to last week</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ========== PRODUCTS SECTION ========== */}
          {section === 'products' && (
            <motion.div
              key="products"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Product Management</h2>

              {/* Add Product Form */}
              <div className="v2-add-product">
                <h3>Add New Product</h3>
                <form onSubmit={handleProductPost}>
                  <div className="v2-form-row">
                    <div className="v2-form-group">
                      <label>Product Name *</label>
                      <input
                        type="text"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        required
                        placeholder="e.g., Premium Wireless Headphones"
                      />
                    </div>
                    <div className="v2-form-group">
                      <label>Price (Ksh) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="v2-form-row">
                    <div className="v2-form-group">
                      <label>Category *</label>
                      <select
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        required
                        className="v2-category-select"
                      >
                        <option value="">Select category</option>
                        {APP_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="v2-form-group">
                      <label>Stock Quantity *</label>
                      <input
                        type="number"
                        value={newProduct.stock_quantity}
                        onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                        required
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="v2-form-row">
                    <div className="v2-form-group">
                      <label>Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newProduct.discount}
                        onChange={e => setNewProduct({...newProduct, discount: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div className="v2-form-group">
                      <label>Tags (comma separated)</label>
                      <input
                        type="text"
                        value={newProduct.tags}
                        onChange={e => setNewProduct({...newProduct, tags: e.target.value})}
                        placeholder="electronics, audio, wireless"
                      />
                    </div>
                  </div>

                  <div className="v2-form-group">
                    <label>Description *</label>
                    <textarea
                      rows="4"
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      required
                      placeholder="Detailed product description..."
                    />
                  </div>

                  {/* Lipa Polepole Toggle */}
                  <div className="v2-lipa-toggle-section">
                    <label className="v2-toggle-label">
                      <input
                        type="checkbox"
                        checked={lipaPolepole}
                        onChange={(e) => setLipaPolepole(e.target.checked)}
                      />
                      <span className="v2-toggle-slider-small"></span>
                      <span className="v2-toggle-text">Enable Lipa Polepole (Installment Payments)</span>
                    </label>
                  </div>

                  {/* Installment Configuration */}
                  {lipaPolepole && (
                    <div className="v2-installment-config">
                      <h4>Installment Plan Setup</h4>
                      <div className="v2-form-group">
                        <label>Initial Deposit (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={initialDeposit}
                          onChange={e => setInitialDeposit(e.target.value)}
                          placeholder="e.g., 30"
                        />
                        <small>Percentage to pay upfront</small>
                      </div>

                      <div className="v2-installments-list">
                        <label>Installments</label>
                        {installments.map((inst, index) => (
                          <div key={index} className="v2-installment-item">
                            <input
                              type="number"
                              placeholder="Percent"
                              min="1"
                              max="99"
                              value={inst.percent}
                              onChange={e => {
                                const newInstallments = [...installments];
                                newInstallments[index].percent = e.target.value;
                                setInstallments(newInstallments);
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Due in days"
                              min="1"
                              value={inst.due_in_days}
                              onChange={e => {
                                const newInstallments = [...installments];
                                newInstallments[index].due_in_days = e.target.value;
                                setInstallments(newInstallments);
                              }}
                            />
                            <button
                              type="button"
                              className="v2-remove-installment"
                              onClick={() => removeInstallment(index)}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="v2-add-installment"
                          onClick={handleAddInstallment}
                        >
                          <FaPlusCircle /> Add Installment
                        </button>
                      </div>
                      <div className="v2-installment-note">
                        <FaInfoCircle />
                        <small>Total of initial deposit + all installments must equal 100%</small>
                      </div>
                    </div>
                  )}

                  {/* Image Upload */}
                  <div className="v2-upload-group">
                    <label>Product Images * (Minimum 3)</label>
                    <div className="v2-upload-area">
                      <div
                        {...getRootProps()}
                        className={`v2-dropzone ${isDragActive ? 'v2-dropzone-active' : ''}`}
                      >
                        <input {...getInputProps()} />
                        <FaUpload size={24} />
                        <p>Drag & drop or click to upload</p>
                        <small>PNG, JPG, WEBP up to 5MB</small>
                      </div>
                      <button
                        type="button"
                        className="v2-camera-btn"
                        onClick={handleCameraClick}
                      >
                        <FaCamera /> Take Photo
                      </button>
                    </div>

                    {files.length > 0 && (
                      <div className="v2-preview-grid">
                        {files.map((file, i) => (
                          <div key={i} className="v2-preview-item">
                            <img src={URL.createObjectURL(file)} alt="preview" />
                            <button
                              type="button"
                              onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="v2-submit-btn"
                    disabled={loadingPost || files.length < 3}
                  >
                    {loadingPost ? (
                      <>
                        <div className="v2-spinner" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <FaSave /> Post Product
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Products List */}
              <div className="v2-products-list">
                <div className="v2-list-header">
                  <h3>Your Products ({filteredProducts.length})</h3>
                </div>

                {loadingProducts ? (
                  <div className="v2-loading">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="v2-empty-state">
                    <FaBox size={48} />
                    <p>No products found</p>
                  </div>
                ) : (
                  <div className="v2-products-grid">
                    {filteredProducts.map(p => {
                      const images = p.image_gallery?.length ? p.image_gallery : ['/placeholder.jpg'];
                      const currentIndex = currentImageIndices[p.id] || 0;

                      return (
                        <div key={p.id} className="v2-product-item">
                          <div className="v2-product-item-image">
                            <img src={images[currentIndex]} alt={p.name} />
                            {images.length > 1 && (
                              <div className="v2-image-nav">
                                <button
                                  onClick={() => handleImageChange(p.id, 'prev')}
                                  disabled={currentIndex === 0}
                                >
                                  <FaArrowLeft />
                                </button>
                                <span>{currentIndex + 1}/{images.length}</span>
                                <button
                                  onClick={() => handleImageChange(p.id, 'next')}
                                  disabled={currentIndex === images.length - 1}
                                >
                                  <FaArrowRight />
                                </button>
                              </div>
                            )}
                            <div className="v2-product-badges">
                              {p.lipa_polepole && <span className="v2-badge v2-badge-lipa">Lipa</span>}
                              {p.discount > 0 && <span className="v2-badge v2-badge-discount">-{p.discount}%</span>}
                              {p.stock_quantity <= 10 && p.stock_quantity > 0 && <span className="v2-badge v2-badge-lowstock">Low Stock</span>}
                              {p.stock_quantity === 0 && <span className="v2-badge v2-badge-out">Out of Stock</span>}
                            </div>
                          </div>

                          <div className="v2-product-item-info">
                            <h4>{p.name}</h4>
                            <p className="v2-price">Ksh {formatPrice(p.price)}</p>
                            <p className="v2-stock">Stock: {p.stock_quantity}</p>
                          </div>

                          <div className="v2-product-item-actions">
                            <button onClick={() => handleEditClick(p)}>
                              <FaEdit /> Edit
                            </button>
                            <button onClick={() => handleFlashSaleRequest(p)}>
                              <FaFire /> Flash Sale
                            </button>
                            <button onClick={() => confirmDelete(p.id)}>
                              <FaTrash /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ========== ORDERS SECTION ========== */}
          {section === 'orders' && (
            <motion.div
              key="orders"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Order Management</h2>

              {orders.length === 0 ? (
                <div className="v2-empty-state">
                  <FaClipboardCheck size={48} />
                  <p>No orders yet</p>
                  <p>When customers place orders, they'll appear here</p>
                </div>
              ) : (
                <div className="v2-orders-grid">
                  {filteredOrders.map(order => {
                    const currentStatus = getStatusInfo(order.status);
                    const nextStatus = getNextStatus(order.status);
                    const prevStatus = getPreviousStatus(order.status);
                    const statusColor = currentStatus?.color || '#6b7280';
                    
                    return (
                      <div key={order.id} className="v2-order-card">
                        <div className="v2-order-header">
                          <div className="v2-order-id">
                            <span className="v2-order-id-label">Order #</span>
                            <span className="v2-order-id-value">{order.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="v2-order-date">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                          <div className="v2-order-status" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {currentStatus?.icon}
                            <span>{order.status}</span>
                          </div>
                        </div>

                        <div className="v2-order-body">
                          <div className="v2-order-product">
                            <img 
                              src={order.product?.image_gallery?.[0] || '/placeholder.jpg'} 
                              alt={order.product?.name}
                            />
                            <div>
                              <h4>{order.product?.name || 'Unknown Product'}</h4>
                              <p>Quantity: {order.quantity || 1}</p>
                              <p className="v2-product-category">{order.product?.category || 'Uncategorized'}</p>
                            </div>
                          </div>

                          <div className="v2-order-pricing">
                            <div className="v2-price-row">
                              <span>Product Total:</span>
                              <span>Ksh {formatPrice(order.total_price - (order.delivery_fee || 0))}</span>
                            </div>
                            <div className="v2-price-row">
                              <span>Delivery Fee:</span>
                              <span>Ksh {formatPrice(order.delivery_fee || 0)}</span>
                            </div>
                            <div className="v2-price-row v2-price-total">
                              <span>Total:</span>
                              <span>Ksh {formatPrice(order.total_price)}</span>
                            </div>
                          </div>

                          <div className="v2-order-buyer">
                            <FaUser />
                            <div>
                              <p>{order.buyer?.name || 'Anonymous'}</p>
                              {order.buyer?.phone && <small>{order.buyer.phone}</small>}
                            </div>
                          </div>
                        </div>

                        <div className="v2-order-progress-container">
                          {renderOrderProgress(order.status)}
                        </div>

                        <div className="v2-order-actions">
                          {prevStatus && (
                            <button 
                              className="v2-order-action-btn v2-order-action-prev"
                              onClick={() => updateOrderStatus(order.id, prevStatus.value)}
                              disabled={updatingOrderId === order.id}
                            >
                              <FaArrowUp /> Back to {prevStatus.label}
                            </button>
                          )}
                          
                          {nextStatus ? (
                            <button 
                              className="v2-order-action-btn v2-order-action-next"
                              onClick={() => updateOrderStatus(order.id, nextStatus.value)}
                              disabled={updatingOrderId === order.id}
                            >
                              <FaArrowDown /> Mark as {nextStatus.label}
                              {updatingOrderId === order.id && <div className="v2-spinner-small" />}
                            </button>
                          ) : (
                            <button className="v2-order-action-btn v2-order-action-success" disabled>
                              <FaCheck /> Order Completed
                            </button>
                          )}

                          <button 
                            className="v2-order-action-btn v2-order-action-details"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                          >
                            <FaEye /> View Details
                          </button>
                          
                          <button 
                            className="v2-order-action-btn v2-order-action-invoice"
                            onClick={() => generateInvoice(order)}
                          >
                            <FaFileInvoice /> Invoice
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== INVENTORY SECTION (Low Stock Alerts) ========== */}
          {section === 'inventory' && (
            <motion.div
              key="inventory"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Inventory Management</h2>
              
              <div className="v2-low-stock-section">
                <h3><FaExclamationTriangle /> Low Stock Alerts</h3>
                {lowStockAlerts.length === 0 ? (
                  <div className="v2-empty-state">
                    <FaCheckCircle size={48} />
                    <p>No low stock alerts - all products have sufficient inventory</p>
                  </div>
                ) : (
                  <div className="v2-low-stock-grid">
                    {lowStockAlerts.map(alert => (
                      <div key={alert.id} className="v2-low-stock-card">
                        <img src={alert.product?.image_gallery?.[0] || '/placeholder.jpg'} alt={alert.product?.name} />
                        <div className="v2-low-stock-info">
                          <h4>{alert.product?.name}</h4>
                          <p className="v2-stock-warning">⚠️ Only {alert.current_stock} left in stock</p>
                          <p className="v2-stock-threshold">Threshold: {alert.threshold} units</p>
                          <button className="v2-btn-small" onClick={() => { setSection('products'); setSearchTerm(alert.product?.name || ''); }}>Restock Now</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ========== COUPONS SECTION ========== */}
          {section === 'coupons' && (
            <motion.div
              key="coupons"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="v2-section-header">
                <h2 className="v2-section-title">Coupon Management</h2>
                <button className="v2-btn-primary" onClick={() => { setEditingCoupon(null); setCouponModalOpen(true); }}>➕ Create Coupon</button>
              </div>

              {coupons.length === 0 ? (
                <div className="v2-empty-state">
                  <FaTicketAlt size={48} />
                  <p>No coupons created yet</p>
                  <button className="v2-btn-primary" onClick={() => { setEditingCoupon(null); setCouponModalOpen(true); }}>Create your first coupon</button>
                </div>
              ) : (
                <div className="v2-coupons-grid">
                  {coupons.map(coupon => (
                    <div key={coupon.id} className={`v2-coupon-card ${coupon.is_active && new Date(coupon.valid_until) > new Date() ? 'active' : 'expired'}`}>
                      <div className="v2-coupon-header">
                        <span className="v2-coupon-code">{coupon.code}</span>
                        <span className="v2-coupon-status">{coupon.is_active && new Date(coupon.valid_until) > new Date() ? 'Active' : 'Expired'}</span>
                      </div>
                      <div className="v2-coupon-body">
                        <p className="v2-coupon-discount">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `Ksh ${formatPrice(coupon.discount_value)} OFF`}</p>
                        {coupon.min_order_amount > 0 && <p>Min Order: Ksh {formatPrice(coupon.min_order_amount)}</p>}
                        <p>Used: {coupon.used_count} / {coupon.usage_limit || '∞'}</p>
                        <p>Valid until: {new Date(coupon.valid_until).toLocaleDateString()}</p>
                      </div>
                      <div className="v2-coupon-actions">
                        <button onClick={() => { setEditingCoupon(coupon); setCouponModalOpen(true); }}>✏️ Edit</button>
                        <button onClick={() => deleteCoupon(coupon.id)}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== CUSTOMERS SECTION ========== */}
          {section === 'customers' && (
            <motion.div
              key="customers"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Customer Management</h2>
              
              {customers.length === 0 ? (
                <div className="v2-empty-state">
                  <FaUsers size={48} />
                  <p>No customers yet</p>
                </div>
              ) : (
                <div className="v2-customers-table-wrapper">
                  <table className="v2-customers-table">
                    <thead>
                      <tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total Spent</th><th>Last Order</th></tr>
                    </thead>
                    <tbody>
                      {customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(customer => (
                        <tr key={customer.id}>
                          <td data-label="Customer"><strong>{customer.name}</strong></td>
                          <td data-label="Contact">{customer.email || customer.phone || 'N/A'}</td>
                          <td data-label="Orders">{customer.total_orders}</td>
                          <td data-label="Total Spent">Ksh {formatPrice(customer.total_spent)}</td>
                          <td data-label="Last Order">{new Date(customer.last_order_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ========== RETURNS SECTION ========== */}
          {section === 'returns' && (
            <motion.div
              key="returns"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Returns Management</h2>
              
              {returns.length === 0 ? (
                <div className="v2-empty-state">
                  <FaExchangeAlt size={48} />
                  <p>No return requests</p>
                </div>
              ) : (
                <div className="v2-returns-grid">
                  {returns.map(returnReq => (
                    <div key={returnReq.id} className="v2-return-card">
                      <div className="v2-return-header">
                        <span className="v2-return-id">Return #{returnReq.id.slice(0, 8)}</span>
                        <span className={`v2-return-status v2-status-${returnReq.status}`}>{returnReq.status}</span>
                      </div>
                      <div className="v2-return-body">
                        <p><strong>Product:</strong> {returnReq.product?.name}</p>
                        <p><strong>Reason:</strong> {returnReq.reason}</p>
                        <p><strong>Order Total:</strong> Ksh {formatPrice(returnReq.order?.total_price)}</p>
                        <p><strong>Refund Amount:</strong> Ksh {formatPrice(returnReq.refund_amount)}</p>
                        <p><strong>Buyer Gets:</strong> 95% (Ksh {formatPrice(returnReq.buyer_refund_amount)})</p>
                      </div>
                      {returnReq.status === 'pending' && (
                        <div className="v2-return-actions">
                          <button className="v2-btn-success" onClick={() => { setSelectedReturn(returnReq); setReturnModalOpen(true); }}>✅ Approve</button>
                          <button className="v2-btn-danger" onClick={() => { setSelectedReturn(returnReq); setReturnModalOpen(true); }}>❌ Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== EARNINGS SECTION ========== */}
          {section === 'earnings' && (
            <motion.div
              key="earnings"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Earnings Overview</h2>
              
              {loadingEarnings ? (
                <div className="v2-skeleton-grid">
                  {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <>
                  <div className="v2-earnings-grid">
                    <div className="v2-earnings-card v2-earnings-total">
                      <div className="v2-earnings-icon"><FaMoneyCheckAlt /></div>
                      <div className="v2-earnings-info">
                        <h4>Total Earnings</h4>
                        <p className="v2-earnings-amount">Ksh {dashboardStats.totalEarnings.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="v2-earnings-card v2-earnings-wallet">
                      <div className="v2-earnings-icon"><FaWallet /></div>
                      <div className="v2-earnings-info">
                        <h4>Wallet Balance</h4>
                        <p className="v2-earnings-amount">Ksh {dashboardStats.walletBalance.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="v2-earnings-card v2-earnings-pending">
                      <div className="v2-earnings-icon"><FaCreditCard /></div>
                      <div className="v2-earnings-info">
                        <h4>Pending Payouts</h4>
                        <p className="v2-earnings-amount">Ksh {dashboardStats.pendingPayouts.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="v2-earnings-card v2-earnings-completed">
                      <div className="v2-earnings-icon"><FaCheckCircle /></div>
                      <div className="v2-earnings-info">
                        <h4>Completed Payouts</h4>
                        <p className="v2-earnings-amount">Ksh {dashboardStats.completedPayouts.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="v2-earnings-card v2-earnings-month">
                      <div className="v2-earnings-icon"><FaChartLine /></div>
                      <div className="v2-earnings-info">
                        <h4>This Month</h4>
                        <p className="v2-earnings-amount">Ksh {dashboardStats.thisMonthEarnings.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="v2-earnings-card v2-earnings-lipa">
                      <div className="v2-earnings-icon"><FaMoneyBillWave /></div>
                      <div className="v2-earnings-info">
                        <h4>Lipa Polepole</h4>
                        <p className="v2-earnings-amount">Ksh {dashboardStats.lipaPolepoleEarnings.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="v2-performance-section">
                    <h3>Performance Metrics</h3>
                    <div className="v2-performance-metrics">
                      <div className="v2-metric">
                        <span className="v2-metric-label">Total Revenue</span>
                        <span className="v2-metric-value">Ksh {dashboardStats.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="v2-metric">
                        <span className="v2-metric-label">Success Rate</span>
                        <span className="v2-metric-value">
                          {dashboardStats.totalOrders > 0
                            ? ((dashboardStats.successfulOrders / dashboardStats.totalOrders) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="v2-metric">
                        <span className="v2-metric-label">Total Orders</span>
                        <span className="v2-metric-value">{dashboardStats.totalOrders}</span>
                      </div>
                      <div className="v2-metric">
                        <span className="v2-metric-label">Conversion Rate</span>
                        <span className="v2-metric-value">{dashboardStats.conversionRate}%</span>
                      </div>
                    </div>
                  </div>

                  {paymentHistory.length > 0 && (
                    <div className="v2-recent-transactions">
                      <h3>Recent Transactions</h3>
                      <div className="v2-transactions-table-wrapper">
                        <table className="v2-transactions-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Reference</th>
                              <th>Type</th>
                              <th>Amount</th>
                              <th>Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentHistory.map(payment => (
                              <tr key={payment.id}>
                                <td data-label="Date">{new Date(payment.created_at).toLocaleDateString()}</td>
                                <td data-label="Reference" className="v2-ref">{payment.reference_id}</td>
                                <td data-label="Type">
                                  <span className={`v2-transaction-type v2-type-${payment.type}`}>
                                    {payment.type}
                                  </span>
                                </td>
                                <td data-label="Amount" className="v2-amount">Ksh {payment.amount.toLocaleString()}</td>
                                <td data-label="Receipt">
                                  <button 
                                    className="v2-receipt-btn-small"
                                    onClick={() => generateReceipt(payment)}
                                  >
                                    <FaReceipt />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ========== PAYMENTS SECTION ========== */}
          {section === 'payments' && (
            <motion.div
              key="payments"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Seller Payouts</h2>
              
              {loadingEarnings ? (
                <div className="v2-skeleton-grid">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : (
                <>
                  <div className="v2-payout-summary-grid">
                    <div className="v2-payout-card v2-payout-total">
                      <div className="v2-payout-icon"><FaMoneyBillWaveAlt /></div>
                      <div className="v2-payout-info">
                        <h4>Total Payouts Received</h4>
                        <p className="v2-payout-amount">Ksh {totalPayouts.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="v2-payout-card v2-payout-pending">
                      <div className="v2-payout-icon"><FaHourglassHalf /></div>
                      <div className="v2-payout-info">
                        <h4>Pending Payouts</h4>
                        <p className="v2-payout-amount">Ksh {dashboardStats.pendingPayouts.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {pendingPayoutsList.length > 0 && (
                    <div className="v2-pending-payouts">
                      <h3><FaClock /> Pending Payouts ({pendingPayoutsList.length})</h3>
                      <div className="v2-payout-list">
                        {pendingPayoutsList.map(payout => (
                          <div key={payout.id} className="v2-payout-item pending">
                            <div className="v2-payout-details">
                              <span className="v2-payout-order">Order #{payout.orderId}</span>
                              <span className="v2-payout-product">{payout.productName}</span>
                            </div>
                            <div className="v2-payout-net-amount">
                              <span>Net Amount:</span>
                              <span className="v2-net-amount">Ksh {payout.netAmount.toLocaleString()}</span>
                            </div>
                            <div className="v2-payout-status">
                              <span className="status-badge status-pending">Pending</span>
                              <small>{new Date(payout.date).toLocaleDateString()}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedPayoutsList.length > 0 && (
                    <div className="v2-completed-payouts">
                      <h3><FaHistory /> Payout History ({completedPayoutsList.length})</h3>
                      <div className="v2-payout-list">
                        {completedPayoutsList.map(payout => (
                          <div key={payout.id} className="v2-payout-item completed">
                            <div className="v2-payout-details">
                              <span className="v2-payout-order">Order #{payout.orderId}</span>
                              <span className="v2-payout-product">{payout.productName}</span>
                            </div>
                            <div className="v2-payout-net-amount">
                              <span>Amount:</span>
                              <span className="v2-net-amount">Ksh {payout.netAmount.toLocaleString()}</span>
                            </div>
                            <div className="v2-payout-status">
                              <span className="status-badge status-completed">Paid</span>
                              <small>{new Date(payout.date).toLocaleDateString()}</small>
                            </div>
                            <button 
                              className="v2-receipt-btn-small"
                              onClick={() => generateReceipt({
                                reference_id: payout.reference,
                                amount: payout.netAmount,
                                created_at: payout.date,
                                status: 'completed',
                                type: 'sale',
                                description: `Payout for order ${payout.orderId}`
                              })}
                            >
                              <FaReceipt />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingPayoutsList.length === 0 && completedPayoutsList.length === 0 && (
                    <div className="v2-empty-state">
                      <FaMoneyBillWaveAlt size={48} />
                      <p>No payouts yet</p>
                      <small>When orders are completed, payouts will appear here</small>
                    </div>
                  )}

                  <div className="v2-payout-info-section">
                    <h4>How Payouts Work</h4>
                    <div className="v2-info-grid">
                      <div className="v2-info-step">
                        <span className="v2-step-num">1</span>
                        <div>
                          <strong>Order Completed</strong>
                          <p>Customer confirms delivery with OTP</p>
                        </div>
                      </div>
                      <div className="v2-info-step">
                        <span className="v2-step-num">2</span>
                        <div>
                          <strong>Remaining Balance Paid</strong>
                          <p>Customer pays the 75% balance</p>
                        </div>
                      </div>
                      <div className="v2-info-step">
                        <span className="v2-step-num">3</span>
                        <div>
                          <strong>Commission Deducted</strong>
                          <p>Platform fee based on category</p>
                        </div>
                      </div>
                      <div className="v2-info-step">
                        <span className="v2-step-num">4</span>
                        <div>
                          <strong>Escrow Released</strong>
                          <p>Net amount sent to your wallet</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ========== COMMISSION SECTION ========== */}
          {section === 'commission' && (
            <motion.div
              key="commission"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Commission Rates</h2>
              
              <div className="v2-commission-info">
                <div className="v2-commission-header">
                  <FaPercentage />
                  <p>Platform fees are calculated based on product category. These rates apply to the total order amount including delivery fee.</p>
                </div>
                
                <div className="v2-commission-table-wrapper">
                  <table className="v2-commission-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Rate</th>
                        <th>Range</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMMISSION_RATES.map(rate => (
                        <tr key={rate.category}>
                          <td data-label="Category" className="v2-category-cell">
                            <span className="v2-category-name">{rate.category}</span>
                          </td>
                          <td data-label="Rate" className="v2-rate-cell">
                            <span className="v2-commission-rate">{rate.rate}%</span>
                          </td>
                          <td data-label="Range" className="v2-range-cell">
                            {rate.minRate}% - {rate.maxRate}%
                          </td>
                          <td data-label="Description" className="v2-desc-cell">{rate.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="v2-commission-note">
                  <FaInfoCircle />
                  <div>
                    <strong>How commissions work:</strong>
                    <p>When a customer completes payment for an order, the commission is automatically deducted from the total amount. The remaining balance is released to your wallet after order completion.</p>
                    <p className="v2-example">Example: For a Ksh 1,000 product in Electronics (5% commission), Ksh 50 goes to platform fee, and you receive Ksh 950.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========== LIPA PRODUCTS SECTION ========== */}
          {section === 'lipa-products' && (
            <motion.div
              key="lipa-products"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Lipa Polepole Products</h2>
              
              {lipaPolepoleProducts.length === 0 ? (
                <div className="v2-empty-state">
                  <FaShoppingBag size={48} />
                  <p>No Lipa Polepole products</p>
                  <small>Enable "Lipa Polepole" when creating a product to see it here</small>
                </div>
              ) : (
                <div className="v2-products-grid">
                  {lipaPolepoleProducts.map(p => (
                    <div key={p.id} className="v2-product-item">
                      <div className="v2-product-item-image">
                        <img src={p.image_gallery?.[0] || '/placeholder.jpg'} alt={p.name} />
                        <div className="v2-product-badges">
                          <span className="v2-badge v2-badge-lipa">Lipa Polepole</span>
                        </div>
                      </div>
                      <div className="v2-product-item-info">
                        <h4>{p.name}</h4>
                        <p className="v2-price">Ksh {formatPrice(p.price)}</p>
                        {p.installment_plan && (
                          <div className="v2-installment-info">
                            <small>Initial: {p.installment_plan.initial_percent}%</small>
                            <small>{p.installment_plan.installments?.length} installments</small>
                          </div>
                        )}
                      </div>
                      <div className="v2-product-item-actions">
                        <button onClick={() => handleEditClick(p)}>
                          <FaEdit /> Edit
                        </button>
                        <button onClick={() => confirmDelete(p.id)}>
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== INSTALLMENTS SECTION ========== */}
          {section === 'installments' && (
            <motion.div
              key="installments"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Lipa Polepole Orders</h2>
              <InstallmentOrdersTab sellerId={user?.id} />
            </motion.div>
          )}

          {/* ========== STORE SETTINGS SECTION ========== */}
          {section === 'store' && (
            <motion.div
              key="store"
              className="v2-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Store Customization</h2>
              
              <div className="v2-store-settings-form">
                <div className="v2-form-group">
                  <label>Store Name</label>
                  <input type="text" id="storeName" defaultValue={store?.name} />
                </div>
                <div className="v2-form-group">
                  <label>Store Description</label>
                  <textarea id="storeDesc" defaultValue={store?.description} rows="3" />
                </div>
                <div className="v2-form-group">
                  <label>Contact Email</label>
                  <input type="email" id="storeEmail" defaultValue={store?.contact_email} />
                </div>
                <div className="v2-form-group">
                  <label>Contact Phone</label>
                  <input type="tel" id="storePhone" defaultValue={store?.contact_phone} />
                </div>
                
                <h3>Delivery Settings</h3>
                <div className="v2-delivery-cards">
                  <label className={`v2-delivery-card ${storeSettings?.delivery_type === 'self-delivery' ? 'selected' : ''}`}>
                    <input type="radio" name="delivery_type" value="self-delivery" defaultChecked={storeSettings?.delivery_type === 'self-delivery'} />
                    <span>🚚</span>
                    <h4>Self-Delivery</h4>
                    <p>I have my own delivery fleet</p>
                  </label>
                  <label className={`v2-delivery-card ${storeSettings?.delivery_type === 'omniflow-managed' ? 'selected' : ''}`}>
                    <input type="radio" name="delivery_type" value="omniflow-managed" defaultChecked={storeSettings?.delivery_type === 'omniflow-managed'} />
                    <span>🛵</span>
                    <h4>Omniflow Managed</h4>
                    <p>We handle delivery for you</p>
                  </label>
                </div>

                <div id="selfDeliveryFields" style={{ display: (storeSettings?.delivery_type === 'self-delivery') ? 'block' : 'none' }}>
                  <div className="v2-form-row">
                    <div className="v2-form-group"><label>Fleet Size</label><input type="number" id="fleetSize" defaultValue={storeSettings?.delivery_fleet_size || 1} /></div>
                    <div className="v2-form-group"><label>Coverage Radius (km)</label><input type="number" id="coverageRadius" defaultValue={storeSettings?.delivery_coverage_radius || 50} /></div>
                  </div>
                  <div className="v2-form-row">
                    <div className="v2-form-group"><label>Base Fee (Ksh)</label><input type="number" id="baseFee" defaultValue={storeSettings?.delivery_base_fee || 100} /></div>
                    <div className="v2-form-group"><label>Rate per KM (Ksh)</label><input type="number" id="ratePerKm" defaultValue={storeSettings?.delivery_rate_per_km || 15} /></div>
                  </div>
                </div>

                <button className="v2-btn-primary" onClick={() => {
                  const deliveryType = document.querySelector('input[name="delivery_type"]:checked')?.value;
                  const isSelfDelivery = deliveryType === 'self-delivery';
                  
                  if (isSelfDelivery) {
                    // Show modal to confirm delivery details
                    setSelfDeliveryData({
                      fleet_size: parseInt(document.getElementById('fleetSize')?.value || 1),
                      coverage_radius: parseInt(document.getElementById('coverageRadius')?.value || 50),
                      base_fee: parseFloat(document.getElementById('baseFee')?.value || 100),
                      rate_per_km: parseFloat(document.getElementById('ratePerKm')?.value || 15)
                    });
                    setSelfDeliveryModalOpen(true);
                  } else {
                    // Direct update for Omniflow Managed
                    updateStoreSettings({
                      delivery_type: deliveryType,
                      has_delivery_fleet: false,
                      delivery_fleet_size: 0,
                      delivery_coverage_radius: 50,
                      delivery_base_fee: 100,
                      delivery_rate_per_km: 15
                    });
                  }
                }}>💾 Save Settings</button>
              </div>
            </motion.div>
          )}

          {/* ========== CHAT SECTION ========== */}
          {section === 'chat' && (
            <motion.div
              key="chat"
              className="v2-section v2-chat-section"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className="v2-section-title">Support Chat</h2>
              
              <div className="v2-chat-container">
                <div className="v2-chat-messages">
                  {loadingMessages ? (
                    <div className="v2-loading">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="v2-empty-chat">
                      <FaCommentDots size={48} />
                      <p>No messages yet</p>
                      <small>Start a conversation with support</small>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isSeller = msg.sender_role === 'seller';
                      return (
                        <div key={i} className={`v2-chat-message ${isSeller ? 'v2-chat-seller' : 'v2-chat-support'}`}>
                          <div className="v2-chat-message-content">
                            <p>{msg.content}</p>
                            <span className="v2-chat-time">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="v2-chat-input">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={handleSend} 
                    disabled={!message.trim()}
                    className={!message.trim() ? 'v2-disabled' : ''}
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ========== MODALS ========== */}

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal v2-tutorial-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="v2-modal-header">
                <h2>Welcome to Seller Hub!</h2>
                <button className="v2-modal-close" onClick={() => setShowTutorial(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="v2-tutorial-steps">
                <div className="v2-tutorial-step">
                  <span className="v2-step-number">1</span>
                  <div>
                    <h4>Add Products</h4>
                    <p>Upload products with at least 3 high-quality images</p>
                  </div>
                </div>
                <div className="v2-tutorial-step">
                  <span className="v2-step-number">2</span>
                  <div>
                    <h4>Track Earnings</h4>
                    <p>Monitor your sales and revenue in real-time</p>
                  </div>
                </div>
                <div className="v2-tutorial-step">
                  <span className="v2-step-number">3</span>
                  <div>
                    <h4>Manage Orders</h4>
                    <p>Update order status as you process and ship orders</p>
                  </div>
                </div>
                <div className="v2-tutorial-step">
                  <span className="v2-step-number">4</span>
                  <div>
                    <h4>Get Paid</h4>
                    <p>Track payouts from completed orders</p>
                  </div>
                </div>
              </div>
              <button className="v2-btn-primary v2-btn-full" onClick={() => setShowTutorial(false)}>
                Get Started
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmingDeleteId && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal v2-confirm-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete this product? This action cannot be undone.</p>
              <div className="v2-modal-actions">
                <button className="v2-btn-danger" onClick={handleConfirmDelete}>
                  Yes, Delete
                </button>
                <button className="v2-btn-secondary" onClick={cancelDelete}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editModalProduct && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal v2-edit-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>Edit Product</h3>
                <button className="v2-modal-close" onClick={() => setEditModalProduct(null)}>
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const updates = {
                  name: form.name.value,
                  description: form.description.value,
                  category: form.category.value,
                  price: parseFloat(form.price.value),
                  stock_quantity: parseInt(form.stock.value),
                  discount: parseFloat(form.discount.value) || 0,
                  tags: form.tags.value ? form.tags.value.split(',').map(t => t.trim()) : [],
                };
                try {
                  const { error } = await supabase.from('products').update(updates).eq('id', editModalProduct.id);
                  if (error) throw error;
                  toast.success('Product updated!');
                  fetchProducts();
                  setEditModalProduct(null);
                } catch {
                  toast.error('Update failed');
                }
              }}>
                <div className="v2-form-group">
                  <label>Product Name</label>
                  <input name="name" defaultValue={editModalProduct.name} required />
                </div>
                <div className="v2-form-group">
                  <label>Description</label>
                  <textarea name="description" defaultValue={editModalProduct.description} required rows="3" />
                </div>
                <div className="v2-form-row">
                  <div className="v2-form-group">
                    <label>Category</label>
                    <select name="category" defaultValue={editModalProduct.category} required>
                      {APP_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="v2-form-group">
                    <label>Price (Ksh)</label>
                    <input name="price" type="number" step="0.01" defaultValue={editModalProduct.price} required />
                  </div>
                </div>
                <div className="v2-form-row">
                  <div className="v2-form-group">
                    <label>Stock Quantity</label>
                    <input name="stock" type="number" defaultValue={editModalProduct.stock_quantity} required />
                  </div>
                  <div className="v2-form-group">
                    <label>Discount (%)</label>
                    <input name="discount" type="number" defaultValue={editModalProduct.discount || 0} />
                  </div>
                </div>
                <div className="v2-form-group">
                  <label>Tags (comma separated)</label>
                  <input name="tags" defaultValue={editModalProduct.tags?.join(', ') || ''} />
                </div>
                <div className="v2-modal-actions">
                  <button type="submit" className="v2-btn-primary">
                    <FaSave /> Save Changes
                  </button>
                  <button type="button" className="v2-btn-secondary" onClick={() => setEditModalProduct(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Sale Modal */}
      <AnimatePresence>
        {flashSaleModalProduct && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal v2-flash-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>Request Flash Sale</h3>
                <button className="v2-modal-close" onClick={() => setFlashSaleModalProduct(null)}>
                  <FaTimes />
                </button>
              </div>
              <p>Product: <strong>{flashSaleModalProduct.name}</strong></p>
              <div className="v2-form-group">
                <label>Duration (Hours)</label>
                <select value={flashSaleDuration} onChange={e => setFlashSaleDuration(e.target.value)}>
                  {[6, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
              </div>
              <div className="v2-form-group">
                <label>Discount %</label>
                <input
                  type="number"
                  min="5"
                  max="70"
                  value={flashSaleDiscount}
                  onChange={e => setFlashSaleDiscount(e.target.value)}
                />
              </div>
              <div className="v2-price-preview">
                <div>
                  <span>Current Price:</span>
                  <span>Ksh {formatPrice(flashSaleModalProduct.price)}</span>
                </div>
                <div className="v2-flash-price">
                  <span>Flash Price:</span>
                  <span>Ksh {formatPrice(flashSaleModalProduct.price * (1 - flashSaleDiscount / 100))}</span>
                </div>
              </div>
              <div className="v2-modal-actions">
                <button 
                  className="v2-btn-primary" 
                  onClick={submitFlashSaleRequest} 
                  disabled={loadingFlashSale}
                >
                  {loadingFlashSale ? 'Submitting...' : 'Submit Request'}
                </button>
                <button className="v2-btn-secondary" onClick={() => setFlashSaleModalProduct(null)}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderDetails && selectedOrder && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal v2-order-details-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>Order Details</h3>
                <button className="v2-modal-close" onClick={() => setShowOrderDetails(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <div className="v2-order-details-content">
                <div className="v2-detail-group">
                  <h4>Order Information</h4>
                  <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                  <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  <p><strong>Status:</strong> 
                    <span className="v2-status-badge" style={{ backgroundColor: `${getStatusColor(selectedOrder.status)}20`, color: getStatusColor(selectedOrder.status) }}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>

                <div className="v2-detail-group">
                  <h4>Product Details</h4>
                  <p><strong>Product:</strong> {selectedOrder.product?.name}</p>
                  <p><strong>Quantity:</strong> {selectedOrder.quantity || 1}</p>
                  <p><strong>Category:</strong> {selectedOrder.product?.category || 'N/A'}</p>
                </div>

                <div className="v2-detail-group">
                  <h4>Payment Details</h4>
                  <p><strong>Subtotal:</strong> Ksh {formatPrice(selectedOrder.total_price - (selectedOrder.delivery_fee || 0))}</p>
                  <p><strong>Delivery Fee:</strong> Ksh {formatPrice(selectedOrder.delivery_fee || 0)}</p>
                  <p><strong>Total:</strong> Ksh {formatPrice(selectedOrder.total_price)}</p>
                  <p><strong>Payment Method:</strong> {selectedOrder.payment_method || 'Wallet'}</p>
                </div>

                <div className="v2-detail-group">
                  <h4>Buyer Information</h4>
                  <p><strong>Name:</strong> {selectedOrder.buyer?.name || 'Anonymous'}</p>
                  {selectedOrder.buyer?.phone && <p><strong>Phone:</strong> {selectedOrder.buyer.phone}</p>}
                  {selectedOrder.buyer?.email && <p><strong>Email:</strong> {selectedOrder.buyer.email}</p>}
                  <p><strong>Delivery Location:</strong> {selectedOrder.delivery_location || 'Not specified'}</p>
                </div>
              </div>

              <div className="v2-modal-actions">
                <button className="v2-btn-primary" onClick={() => setShowOrderDetails(false)}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal v2-settings-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>Settings</h3>
                <button className="v2-modal-close" onClick={() => setShowSettings(false)}>
                  <FaTimes />
                </button>
              </div>

              <div className="v2-settings-content">
                <div className="v2-setting-item">
                  <span>Dark Mode</span>
                  <label className="v2-toggle">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={() => setDarkMode(!darkMode)}
                    />
                    <span className="v2-toggle-slider"></span>
                  </label>
                </div>

                <div className="v2-setting-item">
                  <span>Notifications</span>
                  <label className="v2-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="v2-toggle-slider"></span>
                  </label>
                </div>

                <div className="v2-setting-item">
                  <span>Email Updates</span>
                  <label className="v2-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="v2-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== COUPON MODAL ========== */}
      <AnimatePresence>
        {couponModalOpen && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
                <button onClick={() => { setCouponModalOpen(false); setEditingCoupon(null); }}>✕</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const couponData = {
                  code: formData.get('code').toUpperCase(),
                  discount_type: formData.get('discount_type'),
                  discount_value: parseFloat(formData.get('discount_value')),
                  min_order_amount: parseFloat(formData.get('min_order_amount')) || 0,
                  max_discount: parseFloat(formData.get('max_discount')) || null,
                  usage_limit: parseInt(formData.get('usage_limit')) || null,
                  valid_from: new Date(formData.get('valid_from')).toISOString(),
                  valid_until: new Date(formData.get('valid_until')).toISOString(),
                  description: formData.get('description')
                };
                if (editingCoupon) {
                  updateCoupon(editingCoupon.id, couponData);
                } else {
                  createCoupon(couponData);
                }
              }}>
                <div className="v2-form-group">
                  <label>Coupon Code</label>
                  <input name="code" required defaultValue={editingCoupon?.code || ''} placeholder="SUMMER20" />
                </div>
                <div className="v2-form-row">
                  <div className="v2-form-group">
                    <label>Discount Type</label>
                    <select name="discount_type" defaultValue={editingCoupon?.discount_type || 'percentage'}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (Ksh)</option>
                    </select>
                  </div>
                  <div className="v2-form-group">
                    <label>Discount Value</label>
                    <input name="discount_value" type="number" step="0.01" required defaultValue={editingCoupon?.discount_value} />
                  </div>
                </div>
                <div className="v2-form-row">
                  <div className="v2-form-group">
                    <label>Min Order Amount (Ksh)</label>
                    <input name="min_order_amount" type="number" step="0.01" defaultValue={editingCoupon?.min_order_amount || 0} />
                  </div>
                  <div className="v2-form-group">
                    <label>Max Discount (Ksh)</label>
                    <input name="max_discount" type="number" step="0.01" defaultValue={editingCoupon?.max_discount || ''} />
                  </div>
                </div>
                <div className="v2-form-row">
                  <div className="v2-form-group">
                    <label>Valid From</label>
                    <input name="valid_from" type="datetime-local" required defaultValue={editingCoupon?.valid_from?.slice(0, 16)} />
                  </div>
                  <div className="v2-form-group">
                    <label>Valid Until</label>
                    <input name="valid_until" type="datetime-local" required defaultValue={editingCoupon?.valid_until?.slice(0, 16)} />
                  </div>
                </div>
                <div className="v2-form-group">
                  <label>Usage Limit</label>
                  <input name="usage_limit" type="number" defaultValue={editingCoupon?.usage_limit || ''} placeholder="Unlimited" />
                </div>
                <div className="v2-form-group">
                  <label>Description</label>
                  <textarea name="description" defaultValue={editingCoupon?.description || ''} rows="2" />
                </div>
                <div className="v2-modal-actions">
                  <button type="submit" className="v2-btn-primary">{editingCoupon ? 'Update' : 'Create'}</button>
                  <button type="button" className="v2-btn-secondary" onClick={() => { setCouponModalOpen(false); setEditingCoupon(null); }}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== RETURN MODAL ========== */}
      <AnimatePresence>
        {returnModalOpen && selectedReturn && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>Process Return Request</h3>
                <button onClick={() => setReturnModalOpen(false)}>✕</button>
              </div>
              <div className="v2-return-preview">
                <p><strong>Product:</strong> {selectedReturn.product?.name}</p>
                <p><strong>Reason:</strong> {selectedReturn.reason}</p>
                <p><strong>Refund Amount:</strong> Ksh {formatPrice(selectedReturn.refund_amount)}</p>
                <p><strong>Buyer Receives:</strong> Ksh {formatPrice(selectedReturn.refund_amount * 0.95)} (95%)</p>
              </div>
              <div className="v2-form-group">
                <label>Admin Notes</label>
                <textarea id="adminNotes" rows="3" placeholder="Add notes about this decision..." />
              </div>
              <div className="v2-modal-actions">
                <button className="v2-btn-success" onClick={() => processReturn(selectedReturn.id, 'approve', document.getElementById('adminNotes')?.value)}>✅ Approve & Refund</button>
                <button className="v2-btn-danger" onClick={() => processReturn(selectedReturn.id, 'reject', document.getElementById('adminNotes')?.value)}>❌ Reject</button>
                <button className="v2-btn-secondary" onClick={() => setReturnModalOpen(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== SELF DELIVERY CONFIRMATION MODAL ========== */}
      <AnimatePresence>
        {selfDeliveryModalOpen && (
          <motion.div
            className="v2-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="v2-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="v2-modal-header">
                <h3>Confirm Self-Delivery Settings</h3>
                <button onClick={() => setSelfDeliveryModalOpen(false)}>✕</button>
              </div>
              <div className="v2-delivery-summary">
                <div className="v2-summary-row">
                  <span>Fleet Size:</span>
                  <strong>{selfDeliveryData.fleet_size} riders</strong>
                </div>
                <div className="v2-summary-row">
                  <span>Coverage Radius:</span>
                  <strong>{selfDeliveryData.coverage_radius} km</strong>
                </div>
                <div className="v2-summary-row">
                  <span>Base Fee:</span>
                  <strong>Ksh {formatPrice(selfDeliveryData.base_fee)}</strong>
                </div>
                <div className="v2-summary-row">
                  <span>Rate per KM:</span>
                  <strong>Ksh {formatPrice(selfDeliveryData.rate_per_km)}</strong>
                </div>
                <div className="v2-formula">
                  <strong>Delivery Fee Formula:</strong>
                  <p>Base Fee + (Distance × Rate per KM)</p>
                  <p className="v2-example">
                    Example: 5km delivery = Ksh {selfDeliveryData.base_fee} + (5 × {selfDeliveryData.rate_per_km}) = Ksh {selfDeliveryData.base_fee + (5 * selfDeliveryData.rate_per_km)}
                  </p>
                </div>
              </div>
              <div className="v2-modal-actions">
                <button className="v2-btn-primary" onClick={() => {
                  updateStoreSettings({
                    delivery_type: 'self-delivery',
                    has_delivery_fleet: true,
                    delivery_fleet_size: selfDeliveryData.fleet_size,
                    delivery_coverage_radius: selfDeliveryData.coverage_radius,
                    delivery_base_fee: selfDeliveryData.base_fee,
                    delivery_rate_per_km: selfDeliveryData.rate_per_km
                  });
                }}>Confirm & Save</button>
                <button className="v2-btn-secondary" onClick={() => setSelfDeliveryModalOpen(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Installment Modal */}
      {installmentModalProduct && (
        <InstallmentSetupModal
          product={installmentModalProduct}
          isOpen={!!installmentModalProduct}
          onClose={() => setInstallmentModalProduct(null)}
          onSuccess={() => {
            fetchProducts();
            fetchDashboardData();
            toast.success('Installment plan updated!');
          }}
        />
      )}
    </div>
  );
};

export default StoreDashboardV2;