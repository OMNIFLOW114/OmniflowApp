import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaBox, FaCommentDots, FaUpload, FaSmile, FaClipboardCheck, FaBoxOpen,
  FaUser, FaMapMarkerAlt, FaMoneyBillAlt, FaMoneyBillWave, FaArrowLeft, FaArrowRight,
  FaChartLine, FaCreditCard, FaMoneyCheckAlt, FaShoppingBag, FaDollarSign,
  FaStore, FaUsers, FaStar, FaBell, FaShoppingCart, FaTimes, FaBars,
  FaWallet, FaReceipt, FaDownload, FaFilter, FaEdit, FaFire, FaCheck
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InstallmentOrdersTab from '../components/InstallmentOrdersTab';
import InstallmentSetupModal from '../components/InstallmentSetupModal';
import './StoreDashboard.css';

const StoreDashboard = () => {
  const { user } = useContext(AuthContext);
  const [section, setSection] = useState('overview');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [files, setFiles] = useState([]);
  const [products, setProducts] = useState([]);
  const [store, setStore] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editedProductIds, setEditedProductIds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [lipaPolepole, setLipaPolepole] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState(30);
  const [installments, setInstallments] = useState([]);
  const [savingProductId, setSavingProductId] = useState(null);
  const [requiredInfoDrafts, setRequiredInfoDrafts] = useState({});
  const [savingDetails, setSavingDetails] = useState({});
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
  
  const [dashboardStats, setDashboardStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    lipaPolepoleEarnings: 0,
    thisMonthEarnings: 0,
    totalOrders: 0,
    successfulOrders: 0,
    totalRevenue: 0,
    walletBalance: 0
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [lipaPolepoleProducts, setLipaPolepoleProducts] = useState([]);
  const [storePerformance, setStorePerformance] = useState({
    sellerScore: 0,
    totalRatings: 0,
    averageRating: 0
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

  const handleMarkForInstallment = (product) => {
    setInstallmentModalProduct(product);
  };

  const handleFlashSaleRequest = (product) => {
    setFlashSaleModalProduct(product);
  };

  const submitFlashSaleRequest = async () => {
    if (!flashSaleModalProduct) return;
    
    setLoadingFlashSale(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(flashSaleDuration));
      
      const { error } = await supabase
        .from('flash_sale_requests')
        .insert({
          product_id: flashSaleModalProduct.id,
          store_id: flashSaleModalProduct.store_id,
          requested_duration_hours: parseInt(flashSaleDuration),
          requested_discount_percent: parseInt(flashSaleDiscount),
          status: 'pending',
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast.success('Flash sale request submitted for admin approval!');
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

  const getNextStatus = (current) => {
    const flow = ["pending", "processing", "shipped", "out for delivery", "delivered"];
    const index = flow.indexOf(current?.toLowerCase());
    return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
  };

  const fetchDashboardData = async () => {
    if (!store || !user) return;
    
    setLoadingEarnings(true);
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('seller_score, total_orders, successful_orders')
        .eq('owner_id', user.id)
        .single();

      if (!storeError && storeData) {
        setStorePerformance({
          sellerScore: storeData.seller_score || 0,
          totalRatings: storeData.successful_orders || 0,
          averageRating: storeData.seller_score || 0
        });
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_price, status, created_at, escrow_released, price_paid, delivery_fee')
        .eq('store_id', store.id);

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw ordersError;
      }

      // Check for new orders
      const hasNewOrders = ordersData?.some(order => {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        const diffTime = Math.abs(now - orderDate);
        const diffHours = diffTime / (1000 * 60 * 60);
        return diffHours < 24; // New in last 24 hours
      });
      setNewOrderNotification(hasNewOrders);

      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      const totalEarnings = ordersData?.reduce((sum, order) => sum + (order.price_paid || 0), 0) || 0;
      
      const pendingPayouts = ordersData
        ?.filter(order => !order.escrow_released && ['delivered', 'completed'].includes(order.status?.toLowerCase()))
        .reduce((sum, order) => sum + (order.price_paid || 0), 0) || 0;
      
      const completedPayouts = ordersData
        ?.filter(order => order.escrow_released)
        .reduce((sum, order) => sum + (order.price_paid || 0), 0) || 0;

      const thisMonth = new Date();
      const thisMonthEarnings = ordersData
        ?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === thisMonth.getMonth() && 
                 orderDate.getFullYear() === thisMonth.getFullYear();
        })
        .reduce((sum, order) => sum + (order.price_paid || 0), 0) || 0;

      const { data: installmentData, error: installmentError } = await supabase
        .from('installment_orders')
        .select('total_price, amount_paid, status')
        .eq('seller_id', user.id);

      const lipaPolepoleEarnings = installmentData
        ?.filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + (order.amount_paid || 0), 0) || 0;

      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const walletBalance = walletData?.balance || 0;

      const successfulOrders = ordersData?.filter(order => 
        ['delivered', 'completed'].includes(order.status?.toLowerCase())
      ).length || 0;

      setDashboardStats({
        totalEarnings,
        pendingPayouts,
        completedPayouts,
        lipaPolepoleEarnings,
        thisMonthEarnings,
        totalOrders: ordersData?.length || 0,
        successfulOrders,
        totalRevenue,
        walletBalance
      });

      const { data: paymentData, error: paymentError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Check for new payments
      setNewPaymentNotification(paymentData && paymentData.length > 0);

      if (!paymentError && paymentData) {
        setPaymentHistory(paymentData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          created_at: payment.created_at,
          status: payment.status,
          payment_method: payment.payment_method || 'Wallet',
          reference_id: payment.reference || `TXN-${payment.id.slice(0, 8)}`,
          type: payment.type,
          description: payment.description
        })));
      } else {
        const { data: orderPayments, error: orderPaymentsError } = await supabase
          .from('orders')
          .select('id, price_paid as amount, created_at, status')
          .eq('store_id', store.id)
          .in('status', ['delivered', 'completed'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (!orderPaymentsError && orderPayments) {
          setPaymentHistory(orderPayments.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            created_at: payment.created_at,
            status: 'completed',
            payment_method: 'Order Payment',
            reference_id: `ORD-${payment.id.slice(0, 8)}`,
            type: 'sale',
            description: 'Product sale'
          })));
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!error.message?.includes('column') && !error.message?.includes('does not exist')) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoadingEarnings(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (!error) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        toast.success(`Order marked as ${newStatus}`);
      } else {
        throw error;
      }
    } catch (error) {
      toast.error('Failed to update status.');
      console.error('Update status error:', error);
    }
  };

  const updateDraftField = (productId, field, value) => {
    setRequiredInfoDrafts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
        isOpen: true,
        dirty: true,
      },
    }));
  };

  const updateDraftDelivery = (productId, type, checked) => {
    setRequiredInfoDrafts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        delivery: {
          ...(prev[productId]?.delivery || {}),
          [type]: checked,
        },
        isOpen: true,
        dirty: true,
      },
    }));
  };

  const saveRequiredInfo = async (productId) => {
    const draft = requiredInfoDrafts[productId];
    if (!draft) return;

    if (!draft.warranty || !draft.return_policy) {
      toast.error('Please complete warranty and return policy.');
      return;
    }

    const payload = {
      warranty: draft.warranty,
      return_policy: draft.return_policy,
      delivery_methods: {
        pickup: draft.delivery?.pickup ? 'Yes' : 'No',
        door: draft.delivery?.door ? 'Yes' : 'No',
      },
    };

    setSavingDetails(prev => ({ ...prev, [productId]: true }));

    try {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, ...payload } : p))
      );

      setRequiredInfoDrafts(prev => {
        const next = { ...prev };
        next[productId] = { ...next[productId], isOpen: false, dirty: false };
        return next;
      });

      toast.success('Product details updated');
    } catch (error) {
      toast.error('Error saving product details');
      console.error('Save product details error:', error);
    } finally {
      setSavingDetails(prev => ({ ...prev, [productId]: false }));
    }
  };

  const fetchUserInfo = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) setUserInfo(data);
      if (error) console.error('Error fetching user info:', error);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', user?.id)
          .single();
        if (data) {
          setStore(data);
        }
        if (error) {
          console.error('Error fetching store:', error);
        }
      } catch (error) {
        console.error('Error fetching store:', error);
      }
    };
    if (user) fetchStore();
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!store) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, buyer:buyer_id(name, phone), product:product_id(name, price)')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Failed to fetch orders:", error);
          toast.error("Failed to load orders.");
        } else {
          setOrders(data);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        toast.error("Failed to load orders.");
      }
    };
    fetchOrders();
  }, [store]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaHome />, notification: false },
    { id: 'products', label: 'Products', icon: <FaBox />, notification: false },
    { id: 'earnings', label: 'Earnings', icon: <FaChartLine />, notification: false },
    { id: 'payments', label: 'Payments', icon: <FaCreditCard />, notification: newPaymentNotification },
    { id: 'lipa-products', label: 'Lipa Products', icon: <FaShoppingBag />, notification: false },
    { id: 'chat', label: 'Support', icon: <FaCommentDots />, notification: false },
    { id: 'orders', label: 'Orders', icon: <FaClipboardCheck />, notification: newOrderNotification },
    { id: 'installments', label: 'Lipa Orders', icon: <FaMoneyBillWave />, notification: false },
  ];

  const fetchProducts = async () => {
    if (!store) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store?.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Failed to load products.");
        return;
      }

      if (data) {
        setProducts(data);
        setCurrentImageIndices(data.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}));
        
        const drafts = {};
        data.forEach(product => {
          const needsInfo = !product.warranty || !product.return_policy || !product.delivery_methods;
          if (needsInfo) {
            drafts[product.id] = {
              warranty: product.warranty || '',
              return_policy: product.return_policy || '',
              delivery: {
                pickup: (product.delivery_methods?.pickup === 'Yes') || false,
                door: (product.delivery_methods?.door === 'Yes') || false,
              },
              isOpen: true,
              dirty: false,
            };
          }
        });
        setRequiredInfoDrafts(drafts);
      }
    } catch (error) {
      toast.error("Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (lipaPolepole && installments.length > 0) {
      const totalPercent =
        parseFloat(initialDeposit || 0) +
        installments.reduce((acc, i) => acc + parseFloat(i.percent || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        toast.warn(`Total is ${totalPercent.toFixed(2)}%, must be exactly 100%`);
      }
    }
  }, [initialDeposit, installments]);

  useEffect(() => {
    if (store) {
      fetchProducts();
      fetchDashboardData();
      
      const fetchLipaProducts = async () => {
        try {
          const { data: lipaProducts, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', store.id)
            .eq('lipa_polepole', true)
            .order('created_at', { ascending: false });

          if (!error && lipaProducts) {
            setLipaPolepoleProducts(lipaProducts);
          }
        } catch (error) {
          console.error('Error fetching Lipa products:', error);
        }
      };
      fetchLipaProducts();
    }
  }, [store]);

  const fetchMessages = async () => {
    if (!store) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('store_messages')
        .select('*')
        .eq('store_id', store?.id)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error("Failed to load messages.");
        return;
      }

      if (data) setMessages(data);
    } catch (error) {
      toast.error("Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (store) fetchMessages();
  }, [store]);

  useEffect(() => {
    if (!store) return;
    const channel = supabase
      .channel(`store-messages-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'store_messages',
          filter: `store_id=eq.${store.id}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [store]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles]);
      toast.success(`Added ${acceptedFiles.length} image(s)`);
    },
  });

  const handleSend = async () => {
    if (!message.trim() || !store) {
      toast.error('Message cannot be empty');
      return;
    }
    
    try {
      const { error } = await supabase.from('store_messages').insert({
        store_id: store.id,
        user_id: user.id,
        sender_role: 'seller',
        content: message,
      });

      if (error) throw error;

      toast.success("Message sent.");
      setMessage('');
    } catch (error) {
      toast.error("Failed to send message.");
      console.error('Message send error:', error);
    }
  };

  const uploadImage = async (file) => {
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return urlData?.publicUrl || null;
  };

  const handleProductPost = async (e) => {
    e.preventDefault();
    if (!store || !user) {
      toast.error('Store or user information missing');
      return;
    }

    if (files.length === 0) {
      toast.error('Please upload at least one product image');
      return;
    }

    setLoadingPost(true);
    setUploadProgress([]);

    try {
      const imageUrls = [];
      
      // Upload images with progress tracking
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
          console.error(`Failed to upload ${file.name}:`, error);
          setUploadProgress(prev => [...prev.slice(0, -1), { file: file.name, status: 'failed', error: error.message }]);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (imageUrls.length === 0) {
        toast.error('No images were uploaded successfully');
        setLoadingPost(false);
        return;
      }

      const newProductData = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        discount: parseFloat(newProduct.discount) || 0,
        category: newProduct.category,
        stock_quantity: parseInt(newProduct.stock_quantity),
        description: newProduct.description,
        tags: newProduct.tags ? newProduct.tags.split(',').map(tag => tag.trim()) : [],
        variants: newProduct.variants || null,
        warranty: newProduct.warranty,
        return_policy: newProduct.return_policy,
        return_policy_days: parseInt(newProduct.return_policy_days) || 7,
        delivery_methods: newProduct.delivery_methods,
        delivery_estimated_days: parseInt(newProduct.delivery_estimated_days) || 3,
        free_delivery_threshold: parseFloat(newProduct.free_delivery_threshold) || 5000,
        delivery_notes: newProduct.delivery_notes,
        usage_guide: newProduct.usage_guide,
        commission_rate: parseFloat(newProduct.commission_rate) || 0.05,
        owner_id: user.id,
        store_id: store.id,
        image_gallery: imageUrls,
        lipa_polepole: lipaPolepole,
        installment_plan: lipaPolepole
          ? {
              initial_percent: parseFloat(initialDeposit),
              installments: installments.map((item) => ({
                percent: parseFloat(item.percent),
                due_in_days: parseInt(item.due_in_days),
              })),
            }
          : null,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProductData])
        .select();

      if (error) throw error;

      toast.success("Product posted successfully!");
      
      // Reset form
      setFiles([]);
      setUploadProgress([]);
      setNewProduct({
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
      setLipaPolepole(false);
      setInitialDeposit(30);
      setInstallments([]);
      
      // Refresh data
      await fetchProducts();
      fetchDashboardData();
      
      toast.info('Product added successfully!');
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
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Product deleted!");
      fetchProducts();
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to delete.");
      console.error('Delete error:', error);
    }
  };

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const confirmDelete = (id) => setConfirmingDeleteId(id);
  const cancelDelete = () => setConfirmingDeleteId(null);

  const handleConfirmDelete = async () => {
    if (!confirmingDeleteId) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', confirmingDeleteId);

      if (error) throw error;

      toast.success('Product deleted!');
      fetchProducts();
      fetchDashboardData();
    } catch (error) {
      toast.error('Delete failed!');
      console.error('Delete error:', error);
    }
    setConfirmingDeleteId(null);
  };

  const [editModalProduct, setEditModalProduct] = useState(null);
  const handleEditClick = (product) => {
    if (!editedProductIds.includes(product.id)) {
      setEditModalProduct(product);
    }
  };

  const handleImageChange = (productId, direction) => {
    setCurrentImageIndices((prev) => {
      const images = products.find((p) => p.id === productId)?.image_gallery || [];
      const currentIndex = prev[productId] || 0;
      let newIndex;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % images.length;
      } else {
        newIndex = (currentIndex - 1 + images.length) % images.length;
      }
      return { ...prev, [productId]: newIndex };
    });
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const generateReceipt = (payment) => {
    const receiptWindow = window.open('', '_blank');
    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${payment.reference_id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PAYMENT RECEIPT</h2>
            <p>Reference: ${payment.reference_id}</p>
          </div>
          <div class="details">
            <div class="detail-row"><strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</div>
            <div class="detail-row"><strong>Amount:</strong> Ksh ${payment.amount?.toLocaleString()}</div>
            <div class="detail-row"><strong>Type:</strong> ${payment.type}</div>
            <div class="detail-row"><strong>Status:</strong> ${payment.status}</div>
            <div class="detail-row"><strong>Method:</strong> ${payment.payment_method}</div>
            <div class="detail-row"><strong>Description:</strong> ${payment.description || 'N/A'}</div>
          </div>
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
  };

  // Format price display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Real-time order notification
  useEffect(() => {
    if (!store) return;

    const orderChannel = supabase
      .channel(`store-orders-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${store.id}`
        },
        (payload) => {
          setNewOrderNotification(true);
          toast.info('New order received!');
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(orderChannel);
  }, [store]);

  return (
    <div className="dashboard-glass">
      {/* Mobile Header with Wallet */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className="mobile-store-info">
            <span className="store-name-mobile">{store?.name || 'My Store'}</span>
            <span className="seller-name-mobile">Hi, {userInfo?.name || 'Seller'}</span>
          </div>
          <div className="mobile-wallet-notification">
            {dashboardStats.walletBalance > 0 && (
              <div className="mobile-wallet-balance">
                <FaWallet className="wallet-icon" />
                <span>Ksh {dashboardStats.walletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="mobile-notifications">
              {newOrderNotification && <div className="notification-dot mobile-dot"></div>}
              {newPaymentNotification && <div className="notification-dot mobile-dot"></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="tutorial-modal">
          <div className="tutorial-content">
            <div className="tutorial-header">
              <h2>Welcome to Your Seller Dashboard! 🎉</h2>
              <button className="tutorial-close" onClick={closeTutorial}>
                <FaTimes />
              </button>
            </div>
            <div className="tutorial-steps">
              <div className="tutorial-step">
                <div className="step-icon">📦</div>
                <div className="step-content">
                  <h3>Add Your Products</h3>
                  <p>Start by adding your products with images, descriptions, and pricing</p>
                </div>
              </div>
              <div className="tutorial-step">
                <div className="step-icon">💰</div>
                <div className="step-content">
                  <h3>Track Earnings</h3>
                  <p>Monitor your sales, revenue, and payments in real-time</p>
                </div>
              </div>
              <div className="tutorial-step">
                <div className="step-icon">🚚</div>
                <div className="step-content">
                  <h3>Manage Orders</h3>
                  <p>Update order status and track deliveries with red dot notifications</p>
                </div>
              </div>
              <div className="tutorial-step">
                <div className="step-icon">💬</div>
                <div className="step-content">
                  <h3>Get Support</h3>
                  <p>Use the support chat for any questions or assistance</p>
                </div>
              </div>
            </div>
            <div className="tutorial-actions">
              <button className="tutorial-start-btn" onClick={closeTutorial}>
                Start Selling!
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className={`tabs-container ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="tabs-scroll">
          {navItems.map(({ id, label, icon, notification }) => (
            <motion.button
              key={id}
              className={`tab-button ${section === id ? 'active' : ''}`}
              onClick={() => {
                setSection(id);
                setMobileMenuOpen(false);
                // Clear notifications when opening the tab
                if (id === 'orders' && newOrderNotification) {
                  setNewOrderNotification(false);
                }
                if (id === 'payments' && newPaymentNotification) {
                  setNewPaymentNotification(false);
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="tab-icon">{icon}</span>
              <span className="tab-label">{label}</span>
              {notification && <div className="notification-dot"></div>}
            </motion.button>
          ))}
        </div>
      </nav>

      <main className="glass-main">
        {/* Compact Top Bar */}
        <div className="glass-topbar">
          <div className="welcome-section">
            <span className="welcome-text">Welcome, {userInfo?.name || 'Seller'}</span>
            {store && <span className="store-name">{store.name}</span>}
          </div>
          {dashboardStats.walletBalance > 0 && (
            <div className="wallet-balance">
              <FaWallet className="wallet-icon" />
              <span>Ksh {dashboardStats.walletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {section === 'overview' && (
            <motion.section
              key="overview"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Store Overview</h3>
              
              {/* Compact Stats Grid - 3 per row on mobile */}
              <div className="overview-stats-grid">
                <div className="stat-card-compact">
                  <div className="stat-icon-compact">
                    <FaBox />
                  </div>
                  <div className="stat-info-compact">
                    <h4>Total Products</h4>
                    <p className="stat-number-compact">{products.length}</p>
                  </div>
                </div>
                
                <div className="stat-card-compact">
                  <div className="stat-icon-compact">
                    <FaClipboardCheck />
                  </div>
                  <div className="stat-info-compact">
                    <h4>Total Orders</h4>
                    <p className="stat-number-compact">{dashboardStats.totalOrders}</p>
                    <small>{dashboardStats.successfulOrders} successful</small>
                  </div>
                </div>
                
                <div className="stat-card-compact">
                  <div className="stat-icon-compact">
                    <FaMoneyCheckAlt />
                  </div>
                  <div className="stat-info-compact">
                    <h4>Total Earnings</h4>
                    <p className="stat-number-compact">Ksh {dashboardStats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="stat-card-compact">
                  <div className="stat-icon-compact">
                    <FaShoppingBag />
                  </div>
                  <div className="stat-info-compact">
                    <h4>Lipa Products</h4>
                    <p className="stat-number-compact">{lipaPolepoleProducts.length}</p>
                  </div>
                </div>
                
                <div className="stat-card-compact">
                  <div className="stat-icon-compact">
                    <FaStar />
                  </div>
                  <div className="stat-info-compact">
                    <h4>Seller Score</h4>
                    <p className="stat-number-compact">{storePerformance.sellerScore.toFixed(1)}</p>
                    <small>{storePerformance.totalRatings} ratings</small>
                  </div>
                </div>
                
                <div className="stat-card-compact">
                  <div className="stat-icon-compact">
                    <FaChartLine />
                  </div>
                  <div className="stat-info-compact">
                    <h4>This Month</h4>
                    <p className="stat-number-compact">Ksh {dashboardStats.thisMonthEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="overview-content">
                <div className="recent-products-section">
                  <h4>Recent Products</h4>
                  {loadingProducts ? (
                    <p className="loading-text">Loading products...</p>
                  ) : products.length === 0 ? (
                    <div className="empty-state compact">
                      <FaBox size={32} />
                      <p>No products yet</p>
                      <small>Create your first product to get started</small>
                    </div>
                  ) : (
                    <div className="compact-product-grid">
                      {products.slice(0, 6).map((p) => {
                        const needsInfo = !p.warranty || !p.return_policy || !p.delivery_methods;
                        const draft = requiredInfoDrafts[p.id];
                        const isSaving = savingDetails[p.id];
                        const showForm = draft?.isOpen || needsInfo;
                        const images = p.image_gallery?.length ? p.image_gallery : ['/placeholder.jpg'];
                        const currentImageIndex = currentImageIndices[p.id] || 0;

                        return (
                          <motion.div
                            key={p.id}
                            className="compact-product-card"
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <div className="compact-image-container">
                              <img
                                src={images[currentImageIndex]}
                                alt={p.name}
                                className="compact-product-image"
                              />
                              {images.length > 1 && (
                                <div className="compact-image-nav">
                                  <button
                                    className="compact-image-nav-btn"
                                    onClick={() => handleImageChange(p.id, 'prev')}
                                    disabled={currentImageIndex === 0}
                                  >
                                    <FaArrowLeft size={10} />
                                  </button>
                                  <div className="compact-image-dots">
                                    {images.map((_, i) => (
                                      <span
                                        key={i}
                                        className={`compact-dot ${i === currentImageIndex ? 'active' : ''}`}
                                      />
                                    ))}
                                  </div>
                                  <button
                                    className="compact-image-nav-btn"
                                    onClick={() => handleImageChange(p.id, 'next')}
                                    disabled={currentImageIndex === images.length - 1}
                                  >
                                    <FaArrowRight size={10} />
                                  </button>
                                </div>
                              )}
                              {p.lipa_polepole && (
                                <div className="compact-lipa-badge">
                                  <FaMoneyBillWave size={10} /> Lipa
                                </div>
                              )}
                            </div>
                            <div className="compact-product-info">
                              <h5 className="compact-product-title">{p.name}</h5>
                              <p className="compact-product-price">Ksh {formatPrice(p.price)}</p>
                              <div className="compact-product-meta">
                                <span>Stock: {p.stock_quantity}</span>
                                {p.discount > 0 && <span className="discount">{p.discount}% off</span>}
                              </div>
                            </div>
                            <div className="compact-product-actions">
                              <button 
                                className="edit-delivery-btn"
                                onClick={() => {
                                  setEditModalProduct(p);
                                }}
                              >
                                <FaEdit /> Edit Details
                              </button>
                              <button 
                                className="flash-sale-btn"
                                onClick={() => handleFlashSaleRequest(p)}
                              >
                                <FaFire /> Flash Sale
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="overview-actions">
                  <button 
                    className="view-all-btn"
                    onClick={() => setSection('products')}
                  >
                    View All Products
                  </button>
                  <button 
                    className="add-product-btn"
                    onClick={() => setSection('products')}
                  >
                    <FaBox /> Add New Product
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {section === 'earnings' && (
            <motion.section
              key="earnings"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Earnings Overview</h3>
              {loadingEarnings ? (
                <p className="loading-text">Loading earnings data...</p>
              ) : (
                <div className="earnings-dashboard">
                  {/* Compact Earnings Cards - 3 per row */}
                  <div className="earnings-cards-compact">
                    <div className="earnings-card-compact">
                      <div className="earnings-icon-compact total">
                        <FaMoneyCheckAlt />
                      </div>
                      <div className="earnings-info-compact">
                        <h4>Total Earnings</h4>
                        <p className="earnings-amount-compact">Ksh {dashboardStats.totalEarnings.toLocaleString()}</p>
                        <span className="earnings-subtitle">Amount received</span>
                      </div>
                    </div>
                    
                    <div className="earnings-card-compact">
                      <div className="earnings-icon-compact pending">
                        <FaCreditCard />
                      </div>
                      <div className="earnings-info-compact">
                        <h4>Pending Payouts</h4>
                        <p className="earnings-amount-compact">Ksh {dashboardStats.pendingPayouts.toLocaleString()}</p>
                        <span className="earnings-subtitle">Awaiting release</span>
                      </div>
                    </div>
                    
                    <div className="earnings-card-compact">
                      <div className="earnings-icon-compact completed">
                        <FaMoneyBillWave />
                      </div>
                      <div className="earnings-info-compact">
                        <h4>Completed Payouts</h4>
                        <p className="earnings-amount-compact">Ksh {dashboardStats.completedPayouts.toLocaleString()}</p>
                        <span className="earnings-subtitle">Escrow released</span>
                      </div>
                    </div>
                    
                    <div className="earnings-card-compact">
                      <div className="earnings-icon-compact month">
                        <FaChartLine />
                      </div>
                      <div className="earnings-info-compact">
                        <h4>This Month</h4>
                        <p className="earnings-amount-compact">Ksh {dashboardStats.thisMonthEarnings.toLocaleString()}</p>
                        <span className="earnings-subtitle">Current month</span>
                      </div>
                    </div>
                    
                    <div className="earnings-card-compact">
                      <div className="earnings-icon-compact lipa">
                        <FaShoppingBag />
                      </div>
                      <div className="earnings-info-compact">
                        <h4>Lipa Polepole</h4>
                        <p className="earnings-amount-compact">Ksh {dashboardStats.lipaPolepoleEarnings.toLocaleString()}</p>
                        <span className="earnings-subtitle">Installment sales</span>
                      </div>
                    </div>
                    
                    <div className="earnings-card-compact">
                      <div className="earnings-icon-compact wallet">
                        <FaWallet />
                      </div>
                      <div className="earnings-info-compact">
                        <h4>Wallet Balance</h4>
                        <p className="earnings-amount-compact">
                          Ksh {dashboardStats.walletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className="earnings-subtitle">Available funds</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="performance-metrics-compact">
                    <h4>Store Performance</h4>
                    <div className="metrics-grid-compact">
                      <div className="metric-item-compact">
                        <span className="metric-label">Total Revenue</span>
                        <span className="metric-value">Ksh {dashboardStats.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="metric-item-compact">
                        <span className="metric-label">Success Rate</span>
                        <span className="metric-value">
                          {dashboardStats.totalOrders > 0 
                            ? ((dashboardStats.successfulOrders / dashboardStats.totalOrders) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {section === 'payments' && (
            <motion.section
              key="payments"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="section-header-with-actions">
                <div className="section-title-with-notification">
                  <h3>Payment History</h3>
                  {newPaymentNotification && <div className="section-notification-dot"></div>}
                </div>
                <button className="generate-receipt-btn" onClick={() => toast.info("Receipt generation available for weekly summaries")}>
                  <FaDownload /> Generate Weekly Report
                </button>
              </div>
              
              {loadingEarnings ? (
                <p className="loading-text">Loading payment history...</p>
              ) : paymentHistory.length === 0 ? (
                <div className="empty-state">
                  <FaCreditCard size={48} />
                  <p>No payment history found</p>
                  <small>Your payment history will appear here once you start receiving payments</small>
                </div>
              ) : (
                <div className="payments-table-container">
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Reference</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                            <td className="amount">Ksh {payment.amount?.toLocaleString()}</td>
                            <td>
                              <span className={`payment-type type-${payment.type}`}>
                                {payment.type}
                              </span>
                            </td>
                            <td>
                              <span className={`payment-status status-${payment.status}`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="reference">{payment.reference_id}</td>
                            <td>
                              <button 
                                className="receipt-btn"
                                onClick={() => generateReceipt(payment)}
                                title="Generate Receipt"
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
            </motion.section>
          )}

          {section === 'products' && (
            <motion.section
              key="products"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Your Products</h3>
              
              {/* Add Product Form - Now at the TOP */}
              <div className="add-product-section">
                <h4>Add New Product</h4>
                <form className="glass-form" onSubmit={handleProductPost}>
                  {/* Progress indicator */}
                  {loadingPost && (
                    <div className="upload-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '50%' }}></div>
                      </div>
                      <p>Uploading product...</p>
                    </div>
                  )}

                  {uploadProgress.length > 0 && (
                    <div className="upload-status">
                      {uploadProgress.map((item, index) => (
                        <div key={index} className={`upload-item ${item.status}`}>
                          <span>{item.file}</span>
                          <span className="status-badge">{item.status}</span>
                          {item.error && <span className="error-text">{item.error}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Product Name *</label>
                      <input 
                        type="text" 
                        placeholder="Product Name" 
                        required 
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Price (Ksh) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Price" 
                        required 
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Discount (%)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.01" 
                        placeholder="Discount percentage" 
                        value={newProduct.discount}
                        onChange={(e) => setNewProduct({...newProduct, discount: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Stock Quantity *</label>
                      <input 
                        type="number" 
                        placeholder="Available stock" 
                        required 
                        value={newProduct.stock_quantity}
                        onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category *</label>
                      <input 
                        type="text" 
                        placeholder="Category" 
                        required 
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tags (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., electronics, gadget, new" 
                        value={newProduct.tags}
                        onChange={(e) => setNewProduct({...newProduct, tags: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Variants (JSON format)</label>
                      <textarea 
                        rows="2" 
                        placeholder='{"color": ["red", "blue"], "size": ["S", "M", "L"]}' 
                        value={newProduct.variants}
                        onChange={(e) => setNewProduct({...newProduct, variants: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Warranty</label>
                      <select 
                        value={newProduct.warranty}
                        onChange={(e) => setNewProduct({...newProduct, warranty: e.target.value})}
                      >
                        <option value="">Select warranty</option>
                        <option value="No warranty">No warranty</option>
                        <option value="1 month">1 month</option>
                        <option value="3 months">3 months</option>
                        <option value="6 months">6 months</option>
                        <option value="1 year">1 year</option>
                        <option value="2 years">2 years</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Return Policy</label>
                    <select 
                      value={newProduct.return_policy}
                      onChange={(e) => setNewProduct({...newProduct, return_policy: e.target.value})}
                    >
                      <option value="">Select return policy</option>
                      <option value="No returns">No returns</option>
                      <option value="7 days return">7 days return</option>
                      <option value="14 days return">14 days return</option>
                      <option value="30 days return">30 days return</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea 
                      rows="3" 
                      placeholder="Detailed product description..." 
                      required 
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    />
                  </div>

                  <div className="lipa-toggle">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={lipaPolepole}
                        onChange={(e) => setLipaPolepole(e.target.checked)}
                      />
                      <span className="toggle-text">Sell via Lipa Polepole</span>
                    </label>
                  </div>

                  <div className="dropzone-section">
                    <label>Product Images *</label>
                    <div {...getRootProps()} className={`dropzone-glass ${isDragActive ? 'active' : ''}`}>
                      <input {...getInputProps()} />
                      <FaUpload size={24} />
                      <p>{isDragActive ? 'Drop images here...' : 'Drag & drop product images or click to upload'}</p>
                      <small>Upload at least one image. Supported: JPG, PNG, WebP</small>
                    </div>
                    {files.length > 0 && (
                      <div className="uploaded-files">
                        <p>Uploaded: {files.length} file(s)</p>
                        <div className="file-list">
                          {files.map((file, index) => (
                            <div key={index} className="file-item">
                              <span>{file.name}</span>
                              <button 
                                type="button" 
                                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                                className="remove-file-btn"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    className="submit-btn"
                    disabled={loadingPost}
                    whileHover={{ scale: loadingPost ? 1 : 1.05 }}
                    whileTap={{ scale: loadingPost ? 1 : 0.95 }}
                  >
                    {loadingPost ? (
                      <>
                        <div className="loading-spinner-small"></div>
                        Posting Product...
                      </>
                    ) : (
                      'Post Product'
                    )}
                  </motion.button>
                </form>
              </div>
              
              {/* Products Display - Now BELOW the form */}
              {loadingProducts ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="empty-state">
                  <FaBox size={48} />
                  <p>No products yet</p>
                  <small>Create your first product using the form above</small>
                </div>
              ) : (
                <div className="compact-products-display">
                  {products.map((p) => {
                    const images = p.image_gallery?.length ? p.image_gallery : ['/placeholder.jpg'];
                    const mainImage = images[0];

                    return (
                      <motion.div
                        key={p.id}
                        className="compact-product-card-mini"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="compact-image-mini">
                          <img src={mainImage} alt={p.name} />
                          <div className="compact-product-badges">
                            {p.lipa_polepole && (
                              <span className="compact-badge lipa">
                                <FaMoneyBillWave size={8} /> Lipa
                              </span>
                            )}
                            {p.discount > 0 && (
                              <span className="compact-badge discount">
                                -{p.discount}%
                              </span>
                            )}
                            {p.is_flash_sale && (
                              <span className="compact-badge flash">
                                <FaFire size={8} /> Flash
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="compact-product-info-mini">
                          <h5 className="compact-product-title-mini">{p.name}</h5>
                          
                          <div className="compact-price-row">
                            <div>
                              <span className="compact-price-mini">
                                Ksh {formatPrice(p.price - (p.price * (p.discount || 0) / 100))}
                              </span>
                              {p.discount > 0 && (
                                <span className="compact-original-price">
                                  Ksh {formatPrice(p.price)}
                                </span>
                              )}
                            </div>
                            <span className="compact-stock-mini">
                              Stock: {p.stock_quantity}
                            </span>
                          </div>
                          
                          <div className="compact-product-meta-mini">
                            <span className="compact-meta-item">
                              <strong>Category:</strong> {p.category || 'Uncategorized'}
                            </span>
                            {p.tags && p.tags.length > 0 && (
                              <span className="compact-meta-item">
                                <strong>Tags:</strong> {p.tags.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                          
                          {p.variants && (
                            <div className="compact-meta-item">
                              <strong>Variants:</strong> {typeof p.variants === 'string' ? p.variants.substring(0, 20) + '...' : 'Available'}
                            </div>
                          )}
                        </div>
                        
                        <div className="compact-product-actions-mini">
                          <button 
                            className="compact-action-btn compact-edit-btn"
                            onClick={() => handleEditClick(p)}
                          >
                            <FaEdit size={10} /> Edit
                          </button>
                          <button 
                            className="compact-action-btn compact-flash-btn"
                            onClick={() => handleFlashSaleRequest(p)}
                          >
                            <FaFire size={10} /> Flash Sale
                          </button>
                          <button 
                            className="compact-action-btn compact-delete-btn"
                            onClick={() => confirmDelete(p.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {section === 'orders' && (
            <motion.section
              key="orders"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="section-header-with-actions">
                <div className="section-title-with-notification">
                  <h3>Manage Orders</h3>
                  {newOrderNotification && (
                    <div className="new-order-badge">
                      <span className="badge-dot"></span>
                      New Orders
                    </div>
                  )}
                </div>
                <div className="order-filters">
                  <button className="filter-btn active">
                    <FaFilter /> All ({orders.length})
                  </button>
                  <button className="filter-btn">
                    <FaClipboardCheck /> Pending
                  </button>
                  <button className="filter-btn">
                    <FaBoxOpen /> Processing
                  </button>
                </div>
              </div>
              
              {orders.length === 0 ? (
                <div className="empty-state">
                  <FaClipboardCheck size={48} />
                  <p>No orders yet</p>
                  <small>Orders from customers will appear here</small>
                </div>
              ) : (
                <div className="orders-grid">
                  {orders.map(order => {
                    const nextStatus = getNextStatus(order.status);
                    const orderTotal = order.total_price || 0;
                    const deliveryFee = order.delivery_fee || 0;
                    const productPrice = orderTotal - deliveryFee;

                    return (
                      <div key={order.id} className="premium-order-card">
                        <div className="premium-order-header">
                          <div className="premium-order-id">
                            <span className="premium-order-id-label">Order ID</span>
                            <span className="premium-order-id-value">ORD-{order.id.slice(0, 8).toUpperCase()}</span>
                            <span className="premium-order-date">
                              {new Date(order.created_at).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <span className={`premium-order-status status-${order.status?.replace(/\s+/g, '-').toLowerCase()}`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="premium-order-body">
                          <div className="premium-product-section">
                            <h4 className="premium-product-name">
                              <FaBoxOpen size={16} />
                              {order.product?.name || 'Unknown Product'}
                            </h4>
                            
                            <div className="premium-product-details">
                              <div className="premium-detail-item">
                                <span className="premium-detail-label">Quantity</span>
                                <span className="premium-detail-value quantity">
                                  {order.quantity}x
                                </span>
                              </div>
                              
                              <div className="premium-detail-item">
                                <span className="premium-detail-label">Unit Price</span>
                                <span className="premium-detail-value price">
                                  Ksh {formatPrice(productPrice / (order.quantity || 1))}
                                </span>
                              </div>
                              
                              <div className="premium-detail-item">
                                <span className="premium-detail-label">Subtotal</span>
                                <span className="premium-detail-value price">
                                  Ksh {formatPrice(productPrice)}
                                </span>
                              </div>
                              
                              <div className="premium-detail-item">
                                <span className="premium-detail-label">Delivery</span>
                                <span className="premium-detail-value">
                                  Ksh {formatPrice(deliveryFee)}
                                </span>
                              </div>
                              
                              <div className="premium-detail-item">
                                <span className="premium-detail-label">Payment</span>
                                <span className="premium-detail-value">
                                  {order.payment_method || 'Wallet'}
                                </span>
                              </div>
                              
                              <div className="premium-detail-item">
                                <span className="premium-detail-label">Order Type</span>
                                <span className="premium-detail-value">
                                  {order.is_installment ? 'Installment' : 'Standard'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="premium-info-section">
                            <div className="premium-buyer-info">
                              <h5 className="premium-section-title">
                                <FaUser size={14} /> Buyer Information
                              </h5>
                              <div className="premium-info-grid">
                                <div className="premium-info-item">
                                  <span className="premium-info-label">Name</span>
                                  <span className="premium-info-value">
                                    {order.buyer?.name || 'Anonymous'}
                                  </span>
                                </div>
                                
                                {order.buyer?.phone && (
                                  <div className="premium-info-item">
                                    <span className="premium-info-label">Phone</span>
                                    <span className="premium-info-value">
                                      {order.buyer.phone}
                                    </span>
                                  </div>
                                )}
                                
                                {order.shipping_address && (
                                  <div className="premium-info-item">
                                    <span className="premium-info-label">Address</span>
                                    <span className="premium-info-value">
                                      {order.shipping_address}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="premium-payment-info">
                              <h5 className="premium-section-title">
                                <FaMoneyBillAlt size={14} /> Payment Summary
                              </h5>
                              <div className="premium-info-grid">
                                <div className="premium-info-item">
                                  <span className="premium-info-label">Product Total</span>
                                  <span className="premium-info-value">
                                    Ksh {formatPrice(productPrice)}
                                  </span>
                                </div>
                                
                                <div className="premium-info-item">
                                  <span className="premium-info-label">Delivery Fee</span>
                                  <span className="premium-info-value">
                                    Ksh {formatPrice(deliveryFee)}
                                  </span>
                                </div>
                                
                                <div className="premium-info-item premium-total-row">
                                  <span className="premium-info-label">Total Amount</span>
                                  <span className="premium-info-value">
                                    Ksh {formatPrice(orderTotal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="premium-order-actions">
                          {nextStatus && (
                            <button
                              className="premium-status-btn update"
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                            >
                              <FaClipboardCheck /> Mark as {nextStatus}
                            </button>
                          )}
                          
                          {order.status?.toLowerCase() === 'delivered' && (
                            <button className="premium-status-btn completed">
                              <FaCheck /> Order Completed
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {/* Lipa Products Section */}
          {section === 'lipa-products' && (
            <motion.section
              key="lipa-products"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Lipa Polepole Products</h3>
              {lipaPolepoleProducts.length === 0 ? (
                <div className="empty-state">
                  <FaShoppingBag size={48} />
                  <p>No Lipa Polepole products</p>
                  <small>Enable "Sell via Lipa Polepole" when creating products to see them here</small>
                </div>
              ) : (
                <div className="products-grid">
                  {lipaPolepoleProducts.map((p) => {
                    const images = p.image_gallery?.length ? p.image_gallery : ['/placeholder.jpg'];
                    const currentImageIndex = currentImageIndices[p.id] || 0;

                    return (
                      <motion.div
                        key={p.id}
                        className="product-card lipa-product"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5 }}
                      >
                        <div className="product-image-container">
                          <img
                            src={images[currentImageIndex]}
                            alt={p.name}
                            className="product-image"
                          />
                          <div className="product-lipa-badge">
                            <FaMoneyBillWave /> Lipa Polepole
                          </div>
                        </div>
                        <div className="product-info">
                          <h4 className="product-title">{p.name}</h4>
                          <p className="product-price">Ksh {formatPrice(p.price)}</p>
                          <div className="lipa-details">
                            <div className="installment-plan">
                              <h5>Installment Plan</h5>
                              <div className="installment-steps">
                                <div className="installment-step">
                                  <span className="step-label">Initial Deposit:</span>
                                  <span className="step-value">{p.installment_plan?.initial_percent}%</span>
                                </div>
                                {p.installment_plan?.installments?.map((inst, idx) => (
                                  <div key={idx} className="installment-step">
                                    <span className="step-label">Installment {idx + 1}:</span>
                                    <span className="step-value">{inst.percent}% in {inst.due_in_days} days</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="product-actions">
                            <button className="edit-btn" onClick={() => handleEditClick(p)}>
                              <FaEdit /> Edit
                            </button>
                            <button className="delete-btn" onClick={() => confirmDelete(p.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {/* Chat Section */}
          {section === 'chat' && (
            <motion.section
              key="chat"
              className="glass-section chat-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Store Support Chat</h3>
              {loadingMessages ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading messages...</p>
                </div>
              ) : (
                <div className="chat-window">
                  {messages.length === 0 ? (
                    <div className="empty-chat">
                      <FaCommentDots size={48} />
                      <p>No messages yet</p>
                      <small>Start a conversation with support</small>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isSeller = msg.sender_role === 'seller';
                      const bubbleClass = isSeller ? 'bubble-seller' : 'bubble-support';

                      return (
                        <motion.div
                          key={i}
                          className={`chat-bubble ${bubbleClass}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className="chat-meta">
                            <span className="chat-sender">
                              {isSeller ? 'You' : 'Support'}
                            </span>
                            <span className="timestamp">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="chat-text">{msg.content}</div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}
              <div className="chat-input-box">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend} 
                  disabled={!message.trim() || loadingMessages}
                  className={!message.trim() || loadingMessages ? 'disabled' : ''}
                >
                  {loadingMessages ? 'Sending...' : 'Send'}
                </button>
              </div>
            </motion.section>
          )}

          {/* Installments Section */}
          {section === 'installments' && (
            <motion.section
              key="installments"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Lipa Polepole Orders</h3>
              <InstallmentOrdersTab sellerId={user?.id} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        {confirmingDeleteId && (
          <div className="modal-backdrop">
            <div className="modal-glass">
              <h4>Confirm Delete</h4>
              <p>Are you sure you want to delete this product? This action cannot be undone.</p>
              <div className="modal-actions">
                <button onClick={handleConfirmDelete} className="delete-btn">
                  Yes, Delete
                </button>
                <button onClick={cancelDelete} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {editModalProduct && (
          <div className="modal-backdrop">
            <div className="modal-glass">
              <h4>Edit Product: {editModalProduct.name}</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const updates = {
                    name: form.name.value,
                    description: form.description.value,
                    category: form.category.value,
                    price: parseFloat(form.price.value),
                    stock_quantity: parseInt(form.stock.value),
                    discount: parseFloat(form.discount.value) || 0,
                    tags: form.tags.value ? form.tags.value.split(',').map(tag => tag.trim()) : [],
                    variants: form.variants.value,
                    warranty: form.warranty.value,
                    return_policy: form.return_policy.value,
                    return_policy_days: parseInt(form.return_policy_days.value) || 7,
                    delivery_estimated_days: parseInt(form.delivery_estimated_days.value) || 3,
                    free_delivery_threshold: parseFloat(form.free_delivery_threshold.value) || 5000,
                    delivery_notes: form.delivery_notes.value,
                    usage_guide: form.usage_guide.value,
                    commission_rate: parseFloat(form.commission_rate.value) || 0.05,
                    hasBeenEdited: true
                  };
                  
                  try {
                    const { error } = await supabase
                      .from('products')
                      .update(updates)
                      .eq('id', editModalProduct.id);
                    
                    if (error) throw error;
                    
                    toast.success('Product updated successfully!');
                    fetchProducts();
                    setEditedProductIds((prev) => [...prev, editModalProduct.id]);
                    setEditModalProduct(null);
                  } catch (error) {
                    toast.error('Update failed!');
                    console.error('Update error:', error);
                  }
                }}
              >
                <div className="form-group">
                  <label>Product Name *</label>
                  <input name="name" defaultValue={editModalProduct.name} required />
                </div>
                
                <div className="form-group">
                  <label>Description *</label>
                  <textarea name="description" defaultValue={editModalProduct.description} required rows="3" />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <input name="category" defaultValue={editModalProduct.category} required />
                  </div>
                  <div className="form-group">
                    <label>Price (Ksh) *</label>
                    <input name="price" type="number" step="0.01" defaultValue={editModalProduct.price} required />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Stock Quantity *</label>
                    <input name="stock" type="number" defaultValue={editModalProduct.stock_quantity} required />
                  </div>
                  <div className="form-group">
                    <label>Discount (%)</label>
                    <input name="discount" type="number" step="0.01" defaultValue={editModalProduct.discount || 0} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input name="tags" defaultValue={editModalProduct.tags?.join(', ') || ''} />
                </div>
                
                <div className="form-group">
                  <label>Variants (JSON format)</label>
                  <textarea name="variants" defaultValue={editModalProduct.variants || ''} rows="2" />
                </div>
                
                <div className="form-group">
                  <label>Warranty</label>
                  <select name="warranty" defaultValue={editModalProduct.warranty || ''}>
                    <option value="">Select warranty</option>
                    <option value="No warranty">No warranty</option>
                    <option value="1 month">1 month</option>
                    <option value="3 months">3 months</option>
                    <option value="6 months">6 months</option>
                    <option value="1 year">1 year</option>
                    <option value="2 years">2 years</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Return Policy</label>
                  <select name="return_policy" defaultValue={editModalProduct.return_policy || ''}>
                    <option value="">Select return policy</option>
                    <option value="No returns">No returns</option>
                    <option value="7 days return">7 days return</option>
                    <option value="14 days return">14 days return</option>
                    <option value="30 days return">30 days return</option>
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Return Policy Days</label>
                    <input name="return_policy_days" type="number" defaultValue={editModalProduct.return_policy_days || 7} />
                  </div>
                  <div className="form-group">
                    <label>Delivery Days</label>
                    <input name="delivery_estimated_days" type="number" defaultValue={editModalProduct.delivery_estimated_days || 3} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Free Delivery Threshold (Ksh)</label>
                  <input name="free_delivery_threshold" type="number" step="0.01" defaultValue={editModalProduct.free_delivery_threshold || 5000} />
                </div>
                
                <div className="form-group">
                  <label>Delivery Notes</label>
                  <textarea name="delivery_notes" defaultValue={editModalProduct.delivery_notes || ''} rows="2" />
                </div>
                
                <div className="form-group">
                  <label>Usage Guide</label>
                  <textarea name="usage_guide" defaultValue={editModalProduct.usage_guide || ''} rows="2" />
                </div>
                
                <div className="form-group">
                  <label>Commission Rate (%)</label>
                  <input name="commission_rate" type="number" step="0.01" defaultValue={editModalProduct.commission_rate || 5} />
                </div>
                
                <div className="modal-actions">
                  <button type="submit" className="submit-btn">Save Changes</button>
                  <button type="button" className="cancel-btn" onClick={() => setEditModalProduct(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Installment Setup Modal */}
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

        {/* Flash Sale Modal */}
        {flashSaleModalProduct && (
          <div className="modal-backdrop">
            <div className="modal-glass">
              <h4>Request Flash Sale</h4>
              <p>Request a flash sale for: <strong>{flashSaleModalProduct.name}</strong></p>
              
              <div className="form-group">
                <label>Flash Sale Duration (Hours)</label>
                <select 
                  value={flashSaleDuration}
                  onChange={(e) => setFlashSaleDuration(e.target.value)}
                  disabled={loadingFlashSale}
                >
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Discount Percentage</label>
                <input 
                  type="number" 
                  min="5" 
                  max="70" 
                  step="5"
                  value={flashSaleDiscount}
                  onChange={(e) => setFlashSaleDiscount(e.target.value)}
                  disabled={loadingFlashSale}
                />
                <small>Discounts between 5-70% are recommended</small>
              </div>
              
              <div className="form-group">
                <label>Current Price: Ksh {formatPrice(flashSaleModalProduct.price)}</label>
                <label>Flash Sale Price: Ksh {formatPrice(flashSaleModalProduct.price - (flashSaleModalProduct.price * flashSaleDiscount / 100))}</label>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={submitFlashSaleRequest}
                  disabled={loadingFlashSale}
                  className="submit-btn"
                >
                  {loadingFlashSale ? 'Submitting...' : 'Submit Request'}
                </button>
                <button 
                  onClick={() => setFlashSaleModalProduct(null)}
                  disabled={loadingFlashSale}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="dashboard-footer">
          <p>© {new Date().getFullYear()} OmniFlow. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default StoreDashboard;