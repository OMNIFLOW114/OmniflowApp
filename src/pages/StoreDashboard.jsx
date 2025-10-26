
import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaBox, FaCommentDots, FaUpload, FaSmile, FaClipboardCheck, FaBoxOpen,
  FaUser, FaMapMarkerAlt, FaMoneyBillAlt, FaMoneyBillWave, FaArrowLeft, FaArrowRight,
  FaChartLine, FaCreditCard, FaMoneyCheckAlt, FaShoppingBag, FaDollarSign,
  FaStore, FaUsers, FaStar
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InstallmentOrdersTab from '../components/InstallmentOrdersTab';
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

    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', productId);

    setSavingDetails(prev => ({ ...prev, [productId]: false }));

    if (error) {
      toast.error('Error saving product details');
      return;
    }

    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...payload } : p))
    );

    setRequiredInfoDrafts(prev => {
      const next = { ...prev };
      next[productId] = { ...next[productId], isOpen: false, dirty: false };
      return next;
    });

    toast.success('Product details updated');
  };

  const fetchUserInfo = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('users')
      .select('name, email, avatar_url')
      .eq('id', user.id)
      .single();
    if (data) setUserInfo(data);
    else console.error('Error fetching user info:', error);
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    const fetchStore = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user?.id)
        .single();
      if (data) {
        setStore(data);
      } else if (error) {
        console.error('Error fetching store:', error);
      }
    };
    if (user) fetchStore();
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!store) return;
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
    };
    fetchOrders();
  }, [store]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaHome /> },
    { id: 'products', label: 'Products', icon: <FaBox /> },
    { id: 'earnings', label: 'Earnings', icon: <FaChartLine /> },
    { id: 'payments', label: 'Payments', icon: <FaCreditCard /> },
    { id: 'lipa-products', label: 'Lipa Products', icon: <FaShoppingBag /> },
    { id: 'chat', label: 'Support', icon: <FaCommentDots /> },
    { id: 'orders', label: 'Orders', icon: <FaClipboardCheck /> },
    { id: 'installments', label: 'Lipa Orders', icon: <FaMoneyBillWave /> },
  ];

  const fetchProducts = async () => {
    if (!store) return;
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setProducts(data);
      setCurrentImageIndices(data.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}));
      
      // Initialize required info drafts for products that need completion
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
    if (error) toast.error("Failed to load products.");
    setLoadingProducts(false);
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
        const { data: lipaProducts, error } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', store.id)
          .eq('lipa_polepole', true)
          .order('created_at', { ascending: false });

        if (!error && lipaProducts) {
          setLipaPolepoleProducts(lipaProducts);
        }
      };
      fetchLipaProducts();
    }
  }, [store]);

  const fetchMessages = async () => {
    if (!store) return;
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('store_messages')
      .select('*')
      .eq('store_id', store?.id)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    if (error) toast.error("Failed to load messages.");
    setLoadingMessages(false);
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
    onDrop: (acceptedFiles) => setFiles((prev) => [...prev, ...acceptedFiles]),
  });

  const handleSend = async () => {
    if (!message.trim() || !store) return;
    const { error } = await supabase.from('store_messages').insert({
      store_id: store.id,
      user_id: user.id,
      sender_role: 'seller',
      content: message,
    });

    if (!error) {
      toast.success("Message sent.");
      setMessage('');
    } else {
      toast.error("Failed to send message.");
      console.error('Message send error:', error);
    }
  };

  const handleProductPost = async (e) => {
    e.preventDefault();
    if (!store || !user) return;

    const form = e.target;
    const newProduct = {
      name: form.name.value,
      price: parseFloat(form.price.value),
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
      category: form.category.value,
      stock_quantity: parseInt(form.stock.value),
      tags: form.tags.value ? form.tags.value.split(',').map(tag => tag.trim()) : [],
      discount: parseFloat(form.discount.value) || 0,
      description: form.description.value,
      variants: form.variants.value || null,
      owner_id: user.id,
      store_id: store.id,
      image_gallery: [],
    };

    for (let file of files) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          newProduct.image_gallery.push(urlData.publicUrl);
        }
      } else {
        toast.error("Failed to upload image.");
        console.error('Upload error:', uploadError);
      }
    }

    const { error } = await supabase.from('products').insert([newProduct]);

    if (!error) {
      toast.success("Product posted!");
      setFiles([]);
      form.reset();
      setSection('overview');
      await fetchProducts();
      fetchDashboardData();
    } else {
      toast.error("Failed to post product.");
      console.error('Insert error:', error);
    }
  };

  const handleProductDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success("Product deleted!");
      fetchProducts();
      fetchDashboardData();
    } else {
      toast.error("Failed to delete.");
      console.error('Delete error:', error);
    }
  };

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const confirmDelete = (id) => setConfirmingDeleteId(id);
  const cancelDelete = () => setConfirmingDeleteId(null);

  const handleConfirmDelete = async () => {
    if (!confirmingDeleteId) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', confirmingDeleteId);

    if (!error) {
      toast.success('Product deleted!');
      fetchProducts();
      fetchDashboardData();
    } else {
      toast.error('Delete failed!');
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

  return (
    <div className="dashboard-glass">
      <nav className="tabs-container">
        <div className="tabs-scroll">
          {navItems.map(({ id, label, icon }) => (
            <motion.button
              key={id}
              className={`tab-button ${section === id ? 'active' : ''}`}
              onClick={() => setSection(id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {icon} {label}
            </motion.button>
          ))}
        </div>
      </nav>
      <main className="glass-main">
        <div className="glass-topbar">
          <div className="welcome-section">
            <span>Welcome, {userInfo?.name || 'Seller'}</span>
            {store && <span className="store-name">{store.name}</span>}
          </div>
          {dashboardStats.walletBalance > 0 && (
            <div className="wallet-balance">
              <FaDollarSign />
              <span>Ksh {dashboardStats.walletBalance.toLocaleString()}</span>
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
              <div className="overview-stats">
                <div className="stat-card">
                  <FaBox className="stat-icon" />
                  <div className="stat-info">
                    <h4>Total Products</h4>
                    <p className="stat-number">{products.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <FaClipboardCheck className="stat-icon" />
                  <div className="stat-info">
                    <h4>Total Orders</h4>
                    <p className="stat-number">{dashboardStats.totalOrders}</p>
                    <small>{dashboardStats.successfulOrders} successful</small>
                  </div>
                </div>
                <div className="stat-card">
                  <FaMoneyCheckAlt className="stat-icon" />
                  <div className="stat-info">
                    <h4>Total Earnings</h4>
                    <p className="stat-number">Ksh {dashboardStats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <FaShoppingBag className="stat-icon" />
                  <div className="stat-info">
                    <h4>Lipa Products</h4>
                    <p className="stat-number">{lipaPolepoleProducts.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <FaStar className="stat-icon" />
                  <div className="stat-info">
                    <h4>Seller Score</h4>
                    <p className="stat-number">{storePerformance.sellerScore.toFixed(1)}</p>
                    <small>{storePerformance.totalRatings} ratings</small>
                  </div>
                </div>
                <div className="stat-card">
                  <FaChartLine className="stat-icon" />
                  <div className="stat-info">
                    <h4>This Month</h4>
                    <p className="stat-number">Ksh {dashboardStats.thisMonthEarnings.toLocaleString()}</p>
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
                              <p className="compact-product-price">Ksh {p.price}</p>
                              <div className="compact-product-meta">
                                <span>Stock: {p.stock_quantity}</span>
                                {p.discount > 0 && <span className="discount">{p.discount}% off</span>}
                              </div>
                            </div>
                            {showForm && (
                              <motion.div
                                className="compact-required-info"
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                              >
                                <h6>Complete Product Details</h6>
                                <div className="required-fields-compact">
                                  <div className="field-group">
                                    <label>Warranty:</label>
                                    <select 
                                      value={draft?.warranty || ''}
                                      onChange={(e) => updateDraftField(p.id, 'warranty', e.target.value)}
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
                                  
                                  <div className="field-group">
                                    <label>Return Policy:</label>
                                    <select 
                                      value={draft?.return_policy || ''}
                                      onChange={(e) => updateDraftField(p.id, 'return_policy', e.target.value)}
                                    >
                                      <option value="">Select return policy</option>
                                      <option value="No returns">No returns</option>
                                      <option value="7 days return">7 days return</option>
                                      <option value="14 days return">14 days return</option>
                                      <option value="30 days return">30 days return</option>
                                    </select>
                                  </div>
                                  
                                  <div className="delivery-options">
                                    <label>Delivery Options:</label>
                                    <div className="checkbox-group-compact">
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={draft?.delivery?.pickup || false}
                                          onChange={(e) => updateDraftDelivery(p.id, 'pickup', e.target.checked)}
                                        />
                                        Pickup
                                      </label>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={draft?.delivery?.door || false}
                                          onChange={(e) => updateDraftDelivery(p.id, 'door', e.target.checked)}
                                        />
                                        Door Delivery
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="compact-form-actions">
                                  <button
                                    className="compact-save-btn"
                                    onClick={() => saveRequiredInfo(p.id)}
                                    disabled={isSaving || !draft?.warranty || !draft?.return_policy}
                                  >
                                    {isSaving ? 'Saving...' : 'Save Details'}
                                  </button>
                                </div>
                              </motion.div>
                            )}
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
                  <div className="earnings-cards">
                    <div className="earnings-card">
                      <div className="earnings-icon total">
                        <FaMoneyCheckAlt />
                      </div>
                      <div className="earnings-info">
                        <h4>Total Earnings</h4>
                        <p className="earnings-amount">Ksh {dashboardStats.totalEarnings.toLocaleString()}</p>
                        <span className="earnings-subtitle">Amount received</span>
                      </div>
                    </div>
                    <div className="earnings-card">
                      <div className="earnings-icon pending">
                        <FaCreditCard />
                      </div>
                      <div className="earnings-info">
                        <h4>Pending Payouts</h4>
                        <p className="earnings-amount">Ksh {dashboardStats.pendingPayouts.toLocaleString()}</p>
                        <span className="earnings-subtitle">Awaiting escrow release</span>
                      </div>
                    </div>
                    <div className="earnings-card">
                      <div className="earnings-icon completed">
                        <FaMoneyBillWave />
                      </div>
                      <div className="earnings-info">
                        <h4>Completed Payouts</h4>
                        <p className="earnings-amount">Ksh {dashboardStats.completedPayouts.toLocaleString()}</p>
                        <span className="earnings-subtitle">Escrow released</span>
                      </div>
                    </div>
                    <div className="earnings-card">
                      <div className="earnings-icon month">
                        <FaChartLine />
                      </div>
                      <div className="earnings-info">
                        <h4>This Month</h4>
                        <p className="earnings-amount">Ksh {dashboardStats.thisMonthEarnings.toLocaleString()}</p>
                        <span className="earnings-subtitle">Current month earnings</span>
                      </div>
                    </div>
                    <div className="earnings-card">
                      <div className="earnings-icon lipa">
                        <FaShoppingBag />
                      </div>
                      <div className="earnings-info">
                        <h4>Lipa Polepole</h4>
                        <p className="earnings-amount">Ksh {dashboardStats.lipaPolepoleEarnings.toLocaleString()}</p>
                        <span className="earnings-subtitle">Installment sales</span>
                      </div>
                    </div>
                    <div className="earnings-card">
                      <div className="earnings-icon wallet">
                        <FaDollarSign />
                      </div>
                      <div className="earnings-info">
                        <h4>Wallet Balance</h4>
                        <p className="earnings-amount">Ksh {dashboardStats.walletBalance.toLocaleString()}</p>
                        <span className="earnings-subtitle">Available funds</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="performance-metrics">
                    <h4>Store Performance</h4>
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <span className="metric-label">Total Revenue</span>
                        <span className="metric-value">Ksh {dashboardStats.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Successful Orders</span>
                        <span className="metric-value">{dashboardStats.successfulOrders} / {dashboardStats.totalOrders}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Success Rate</span>
                        <span className="metric-value">
                          {dashboardStats.totalOrders > 0 
                            ? ((dashboardStats.successfulOrders / dashboardStats.totalOrders) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Seller Score</span>
                        <span className="metric-value">{storePerformance.sellerScore.toFixed(1)}/5</span>
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
              <h3>Payment History</h3>
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
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Description</th>
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
                            <td>{payment.payment_method || 'Wallet'}</td>
                            <td className="reference">{payment.reference_id}</td>
                            <td className="description">{payment.description || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.section>
          )}

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
                <div className="product-gallery">
                  {lipaPolepoleProducts.map((p) => {
                    const images = p.image_gallery?.length ? p.image_gallery : ['/placeholder.jpg'];
                    const currentImageIndex = currentImageIndices[p.id] || 0;

                    return (
                      <motion.div
                        key={p.id}
                        className="product-card-glass lipa-product-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="image-container">
                          <img
                            src={images[currentImageIndex]}
                            alt={p.name}
                            className="product-image"
                          />
                          {images.length > 1 && (
                            <div className="image-nav">
                              <button
                                className="image-nav-btn"
                                onClick={() => handleImageChange(p.id, 'prev')}
                                disabled={currentImageIndex === 0}
                              >
                                <FaArrowLeft />
                              </button>
                              <div className="image-dots">
                                {images.map((_, i) => (
                                  <span
                                    key={i}
                                    className={`dot ${i === currentImageIndex ? 'active' : ''}`}
                                  />
                                ))}
                              </div>
                              <button
                                className="image-nav-btn"
                                onClick={() => handleImageChange(p.id, 'next')}
                                disabled={currentImageIndex === images.length - 1}
                              >
                                <FaArrowRight />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="lipa-product-header">
                          <h4 className="product-title">{p.name}</h4>
                          <div className="lipa-badge">
                            <FaMoneyBillWave /> Lipa Polepole
                          </div>
                        </div>
                        <p className="product-description">{p.description}</p>
                        <div className="lipa-details">
                          <div className="installment-plan">
                            <strong>Installment Plan:</strong>
                            <div className="plan-details">
                              <span>Initial: {p.installment_plan?.initial_percent}%</span>
                              <span>Installments: {p.installment_plan?.installments?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                        <small className="product-meta">
                          Price: Ksh {p.price} | Stock: {p.stock_quantity}
                        </small>
                        <div className="product-actions">
                          <button className="edit-btn" onClick={() => handleEditClick(p)}>
                            Edit
                          </button>
                          <button className="delete-btn" onClick={() => confirmDelete(p.id)}>
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

          {section === 'products' && (
            <motion.section
              key="products"
              className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>Post a Product</h3>
              <form className="glass-form" onSubmit={handleProductPost}>
                <div className="form-row">
                  <input name="name" type="text" placeholder="Product Name" required />
                  <input name="price" type="number" step="0.01" placeholder="Price (Ksh)" required />
                </div>
                <div className="lipa-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={lipaPolepole}
                      onChange={(e) => setLipaPolepole(e.target.checked)}
                    />
                    Sell via Lipa Polepole
                  </label>
                </div>
                {lipaPolepole && (
                  <div className="lipa-fields">
                    <label>Initial Deposit (%):</label>
                    <input
                      type="number"
                      value={initialDeposit}
                      onChange={(e) => setInitialDeposit(e.target.value)}
                      min={10}
                      max={90}
                    />
                    <p className="hint-text">
                      Remaining {(100 - initialDeposit).toFixed(2)}% will be distributed across installments
                    </p>
                    <label>Number of Installments:</label>
                    <input
                      type="number"
                      value={installments.length}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        const remaining = 100 - parseFloat(initialDeposit || 0);
                        const evenPercent = parseFloat((remaining / count).toFixed(2));
                        const autoInstallments = Array.from({ length: count }, (_, i) => ({
                          percent: i === count - 1 ? (remaining - evenPercent * (count - 1)).toFixed(2) : evenPercent,
                          due_in_days: '',
                        }));
                        setInstallments(autoInstallments);
                      }}
                      min={1}
                      max={5}
                    />
                    {installments.map((item, index) => (
                      <div key={index} className="installment-block">
                        <label>Installment {index + 1} (%):</label>
                        <input
                          type="number"
                          value={item.percent}
                          onChange={(e) =>
                            setInstallments((prev) => {
                              const copy = [...prev];
                              copy[index].percent = e.target.value;
                              return copy;
                            })
                          }
                          required
                        />
                        <label>Due in (days):</label>
                        <input
                          type="number"
                          value={item.due_in_days}
                          onChange={(e) =>
                            setInstallments((prev) => {
                              const copy = [...prev];
                              copy[index].due_in_days = e.target.value;
                              return copy;
                            })
                          }
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-row">
                  <input name="category" type="text" placeholder="Category" required />
                  <input name="stock" type="number" placeholder="Stock Quantity" required />
                </div>
                <div className="form-row">
                  <input name="tags" type="text" placeholder="Tags (comma separated)" />
                  <input name="discount" type="number" step="0.01" placeholder="Discount %" />
                </div>
                <input name="variants" type="text" placeholder="Variants (e.g., size: S,M,L)" />
                <textarea name="description" rows="3" placeholder="Product Description" required />
                <div {...getRootProps()} className={`dropzone-glass ${isDragActive ? 'active' : ''}`}>
                  <input {...getInputProps()} />
                  <p>{isDragActive ? 'Drop images here...' : 'Drag & drop product images or click to upload'}</p>
                  <FaUpload size={20} />
                </div>
                {files.length > 0 && (
                  <div className="preview-gallery">
                    {files.map((file, i) => (
                      <div key={i} className="preview-image">
                        <img src={URL.createObjectURL(file)} alt={`preview-${i}`} />
                      </div>
                    ))}
                  </div>
                )}
                <motion.button
                  type="submit"
                  className="submit-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Post Product
                </motion.button>
              </form>
            </motion.section>
          )}

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
                <p className="loading-text">Loading messages...</p>
              ) : (
                <div className="chat-window-enhanced">
                  {messages.map((msg, i) => {
                    const isSeller = msg.sender_role === 'seller';
                    const isAdmin = msg.sender_role === 'admin';
                    const isUser = msg.sender_role === 'user';
                    const bubbleClass = isSeller
                      ? 'bubble-seller'
                      : isAdmin
                        ? 'bubble-admin'
                        : 'bubble-user';
                    const badge = isSeller
                      ? 'Seller'
                      : isAdmin
                        ? 'Admin'
                        : 'User';

                    return (
                      <motion.div
                        key={i}
                        className={`chat-bubble-enhanced ${bubbleClass}`}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className="chat-meta">
                          <span className="chat-badge">{badge}</span>
                          <span className="timestamp">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="chat-text">{msg.content}</div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              <div className="chat-input-box">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={handleSend}>
                  <FaSmile /> Send
                </button>
              </div>
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
              <h3>Manage Orders</h3>
              {orders.length === 0 ? (
                <p>No orders yet.</p>
              ) : (
                <div className="order-management-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-box-glass">
                      <h4><FaBoxOpen className="icon" /> Product Details</h4>
                      <p><strong>Name:</strong> {order.product?.name || 'Unknown Product'}</p>
                      {order.variant && <p><strong>Variant:</strong> {order.variant}</p>}
                      <p><strong>Quantity:</strong> {order.quantity}</p>
                      <p><strong>Unit Price:</strong> OMC {(order.total_price / order.quantity).toFixed(2)}</p>
                      <p><strong>Total Price:</strong> OMC {order.total_price}</p>
                      <h4><FaUser className="icon" /> Buyer Details</h4>
                      <p><strong>Name:</strong> {order.buyer?.name || 'Anonymous'}</p>
                      {order.buyer_phone && <p><strong>Phone:</strong> {order.buyer_phone}</p>}
                      {order.buyer_location && <p><strong>Location:</strong> {order.buyer_location}</p>}
                      <h4><FaMapMarkerAlt className="icon" /> Delivery Details</h4>
                      <p><strong>Method:</strong> {order.delivery_method || 'Not specified'}</p>
                      <p><strong>Address:</strong> {order.delivery_location || 'Not provided'}</p>
                      {order.delivery_fee > 0 && <p><strong>Delivery Fee:</strong> OMC {order.delivery_fee}</p>}
                      {order.pickup_station && <p><strong>Pickup Station:</strong> {order.pickup_station}</p>}
                      <h4><FaMoneyBillAlt className="icon" /> Payment Details</h4>
                      <p><strong>Payment Method:</strong> {order.payment_method || 'N/A'}</p>
                      <p><strong>Deposit Paid:</strong> OMC {order.deposit_amount}</p>
                      <p><strong>Balance Due:</strong> OMC {order.balance_due}</p>
                      <p><strong>Paid via Wallet:</strong> {order.deposit_paid ? 'Yes' : 'No'}</p>
                      <h4><FaClipboardCheck className="icon" /> Order Status</h4>
                      <p>
                        <strong>Placed:</strong> {new Date(order.created_at).toLocaleString()}
                      </p>
                      <p>
                        <strong>Status:</strong>
                        <span className={`status-label status-${order.status?.replace(/\s+/g, '-').toLowerCase()}`}>
                          {order.status}
                        </span>
                      </p>
                      {getNextStatus(order.status) && (
                        <button
                          className="status-update-btn"
                          onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                        >
                          Mark as {getNextStatus(order.status)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

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
        {confirmingDeleteId && (
          <div className="modal-backdrop">
            <div className="modal-glass">
              <h4>Confirm Delete</h4>
              <p>Are you sure you want to delete this product?</p>
              <div className="modal-actions">
                <button onClick={handleConfirmDelete} className="delete-btn">Yes, Delete</button>
                <button onClick={cancelDelete} className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        )}
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
                    stock: parseInt(form.stock.value),
                    discount: parseFloat(form.discount.value) || 0,
                    tags: form.tags.value ? form.tags.value.split(',').map(tag => tag.trim()) : [],
                    variants: form.variants.value,
                    hasBeenEdited: true
                  };
                  const { error } = await supabase
                    .from('products')
                    .update(updates)
                    .eq('id', editModalProduct.id);
                  if (!error) {
                    toast.success('Product updated!');
                    fetchProducts();
                    setEditedProductIds((prev) => [...prev, editModalProduct.id]);
                    setEditModalProduct(null);
                  } else {
                    toast.error('Update failed!');
                    console.error('Update error:', error);
                  }
                }}
              >
                <input name="name" defaultValue={editModalProduct.name} required />
                <textarea name="description" defaultValue={editModalProduct.description} required />
                <input name="category" defaultValue={editModalProduct.category} required />
                <input name="price" type="number" defaultValue={editModalProduct.price} required />
                <input name="stock" type="number" defaultValue={editModalProduct.stock} required />
                <input name="discount" type="number" defaultValue={editModalProduct.discount || 0} />
                <input name="tags" defaultValue={editModalProduct.tags?.join(', ') || ''} />
                <input name="variants" defaultValue={editModalProduct.variants || ''} />
                <div className="modal-actions">
                  <button type="submit" className="submit-btn">Save Changes</button>
                  <button type="button" className="cancel-btn" onClick={() => setEditModalProduct(null)}>Cancel</button>
                </div>
              </form>
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
