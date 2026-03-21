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
  FaPercentage, FaTable, FaChartPie, FaPlusCircle
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InstallmentOrdersTab from '../components/InstallmentOrdersTab';
import InstallmentSetupModal from '../components/InstallmentSetupModal';
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
      toast.success('Flash sale request submitted!');
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
      
      if (ordersError) throw ordersError;
      
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
      const { data: storeData } = await supabase
        .from('stores')
        .select('seller_score, total_orders, successful_orders')
        .eq('owner_id', user.id)
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
      if (incompleteProducts > 0) incomplete.push({ type: 'products', count: incompleteProducts, message: `${incompleteProducts} products incomplete` });
      if (unreadMessages > 0) incomplete.push({ type: 'messages', count: unreadMessages, message: `${unreadMessages} unread messages` });
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
        if (error) { console.error("Failed to load orders:", error); }
        else { setOrders(data); }
      } catch (error) { console.error("Failed to load orders:", error); }
    };
    fetchOrders();
  }, [store]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaHome />, notification: incompleteItems.length > 0 },
    { id: 'products', label: 'Products', icon: <FaBox />, notification: dashboardStats.incompleteProducts > 0 },
    { id: 'orders', label: 'Orders', icon: <FaClipboardCheck />, notification: dashboardStats.pendingOrders > 0 },
    { id: 'earnings', label: 'Earnings', icon: <FaChartLine />, notification: false },
    { id: 'payments', label: 'Payments', icon: <FaCreditCard />, notification: newPaymentNotification || pendingPayoutsList.length > 0 },
    { id: 'commission', label: 'Commission', icon: <FaPercentage />, notification: false },
    { id: 'lipa-products', label: 'Lipa Products', icon: <FaShoppingBag />, notification: false },
    { id: 'installments', label: 'Lipa Orders', icon: <FaMoneyBillWave />, notification: false },
    { id: 'chat', label: 'Support', icon: <FaCommentDots />, notification: dashboardStats.unreadMessages > 0 },
  ];

  const fetchProducts = async () => {
    if (!store) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase.from('products').select('*')
        .eq('store_id', store?.id).order('created_at', { ascending: false });
      if (error) { console.error("Failed to load products:", error); return; }
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
      if (error) { console.error("Failed to load messages:", error); return; }
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
  }).format(price);

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
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          {/* Overview Section */}
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

          {/* Products Section with Lipa Polepole */}
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
                            </div>
                          </div>

                          <div className="v2-product-item-info">
                            <h4>{p.name}</h4>
                            <p className="v2-price">Ksh {formatPrice(p.price)}</p>
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
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Orders Section */}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* EARNINGS SECTION - Mobile Responsive */}
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
                  {/* 2-COLUMN EARNINGS GRID */}
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

                  {/* Performance Metrics */}
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

                  {/* Recent Transactions Table - Responsive */}
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

          {/* PAYMENTS SECTION */}
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

          {/* COMMISSION SECTION - Mobile Responsive */}
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

          {/* Lipa Products Section */}
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

          {/* Installments Section */}
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

          {/* Chat Section */}
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