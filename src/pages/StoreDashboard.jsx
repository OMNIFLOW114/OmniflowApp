import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaBox, FaCommentDots, FaUpload, FaSmile, FaBars, FaSun,FaMoon,FaClipboardCheck,FaBoxOpen,
  FaUser,
  FaMapMarkerAlt,
  FaMoneyBillAlt,
  FaMoneyBillWave,
  FaHashtag,
  FaCalculator,
  FaClipboardList,
  FaClock,
  FaShippingFast,
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useDarkMode } from '../context/DarkModeContext';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [lipaPolepole, setLipaPolepole] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState(30);
  const [installments, setInstallments] = useState([]);

  const getNextStatus = (current) => {
  const flow = ["pending", "processing", "shipped", "out for delivery", "delivered"];
  const index = flow.indexOf(current?.toLowerCase());
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
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
// Track which product is saving
const [savingProductId, setSavingProductId] = useState(null);

// Drafts for required info (per product): warranty, return, delivery, visibility
const [requiredInfoDrafts, setRequiredInfoDrafts] = useState({}); // { [productId]: { warranty, return_policy, delivery: {door, pickup}, isOpen, dirty } }
const [savingDetails, setSavingDetails] = useState({}); // { [productId]: boolean }

// Auto-open the form for products missing required info, and keep it open until saved
useEffect(() => {
  if (!products?.length) return;

  setRequiredInfoDrafts(prev => {
    const next = { ...prev };
    products.forEach(p => {
      const needsInfo = !p.warranty || !p.return_policy || !p.delivery_methods;
      if (needsInfo && !next[p.id]) {
        next[p.id] = {
          warranty: p.warranty || '',
          return_policy: p.return_policy || '',
          delivery: {
            pickup: (p.delivery_methods?.pickup === 'Yes') || false,
            door: (p.delivery_methods?.door === 'Yes') || false,
          },
          isOpen: true,   // keep open until saved
          dirty: false,
        };
      }
    });
    return next;
  });
}, [products]);
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

  // Merge into products list after successful save
  setProducts(prev =>
    prev.map(p => (p.id === productId ? { ...p, ...payload } : p))
  );

  // Close the form and mark clean
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
      .select('name')
      .eq('id', user.id)
      .single();
    if (data) setUserInfo(data);
    else console.error('Error fetching user info:', error);
  };
  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(darkMode ? 'dark-mode' : 'light-mode');
  }, [darkMode]);

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
      .select('*, buyer:buyer_id(name), product:product_id(name)')
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
    { id: 'chat', label: 'Support', icon: <FaCommentDots /> },
    { id: 'orders', label: 'Orders', icon: <FaClipboardCheck /> },
    { id: 'installments', label: 'Installments', icon: <FaMoneyBillWave /> }, 
  ];

  const fetchProducts = async () => {
    if (!store) return;
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store?.id)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
    if (error) toast.error("Failed to load products.");
    setLoadingProducts(false);
  };
useEffect(() => {
  if (lipaPolepole && installments.length > 0) {
    const totalPercent =
      parseFloat(initialDeposit || 0) +
      installments.reduce((acc, i) => acc + parseFloat(i.percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      toast.warn(`⚠️ Total is ${totalPercent.toFixed(2)}%, must be exactly 100%`);
    }
  }
}, [initialDeposit, installments]);

  useEffect(() => {
    if (store) fetchProducts();
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
      stock: parseInt(form.stock.value),
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
      fetchProducts();
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

  return (
    <div className="dashboard-glass">
      <aside className={`glass-sidebar ${showMobileMenu ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="logo">🔥 {store?.name || 'Your Store'}</h2>
          <button className="mobile-toggle" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <FaBars />
          </button>
        </div>
        <div className="sidebar-nav">
          {navItems.map(({ id, label, icon }) => (
            <motion.button
              key={id}
              className={`nav-button ${section === id ? 'active' : ''}`}
              onClick={() => {
                setSection(id);
                setShowMobileMenu(false);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
            >
              {icon} {label}
            </motion.button>
          ))}
        </div>
      </aside>
     <main className="glass-main">
        <div className="glass-topbar">
          <span>Welcome, {userInfo?.name || 'Seller'} 👋</span>
          <button onClick={toggleDarkMode} className="theme-toggle">
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
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
    <h3>📊 Store Overview</h3>
    <ul>
      <li>Total Products: {products.length}</li>
      <li>Messages: {messages.length}</li>
    </ul>

    {loadingProducts ? (
      <p className="loading-text">Loading products...</p>
    ) : (
      <div className="product-gallery">
        {products.map((p) => {
          const needsInfo = !p.warranty || !p.return_policy || !p.delivery_methods;
          const draft = requiredInfoDrafts[p.id];
          const isSaving = savingDetails[p.id];
          const showForm = draft?.isOpen || needsInfo;

          return (
            <motion.div
              key={p.id}
              className="product-card-glass"
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Product Images */}
              <div
                className="image-scroll-wrapper"
                onTouchStart={() => {
                  if (!localStorage.getItem('swipeHintShown')) {
                    toast.info('👈 Swipe to view more images');
                    localStorage.setItem('swipeHintShown', 'true');
                  }
                }}
              >
                <div className="image-scroll">
                  {(p.image_gallery?.length ? p.image_gallery : ['/placeholder.jpg']).map((img, j) => (
                    <img key={j} src={img} alt={`img-${j}`} className="scroll-image" />
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <h4 className="product-title">{p.name}</h4>
              <p className="product-description">{p.description}</p>
              <small className="product-meta">
                Category: {p.category} | Stock: {p.stock}
              </small>
              <small className="product-meta">
                Price: Ksh {p.price} | Discount: {p.discount}%
              </small>

              {/* Required Info Form */}
              {showForm && (
                <motion.div
                  className="required-info-form"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <h5>⚠️ Complete Product Details</h5>

                  <label>
                    Warranty:
                    <select
                      value={draft?.warranty ?? ''}
                      onChange={(e) => updateDraftField(p.id, 'warranty', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="No warranty">No warranty</option>
                      <option value="6 months">6 months</option>
                      <option value="1 year">1 year</option>
                    </select>
                  </label>

                  <label>
                    Return Policy:
                    <input
                      type="text"
                      value={draft?.return_policy ?? ''}
                      onChange={(e) => updateDraftField(p.id, 'return_policy', e.target.value)}
                      placeholder="e.g., 7 days return, No returns"
                    />
                  </label>

                  <label>
                    Delivery Options:
                    <div className="checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={!!draft?.delivery?.pickup}
                          onChange={(e) => updateDraftDelivery(p.id, 'pickup', e.target.checked)}
                        />
                        Pickup station
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!draft?.delivery?.door}
                          onChange={(e) => updateDraftDelivery(p.id, 'door', e.target.checked)}
                        />
                        Door delivery
                      </label>
                    </div>
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`save-btn ${isSaving ? 'saving' : ''}`}
                      onClick={() => saveRequiredInfo(p.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : '💾 Save'}
                    </button>
                    {!needsInfo && (
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() =>
                          setRequiredInfoDrafts(prev => ({
                            ...prev,
                            [p.id]: { ...(prev[p.id] || {}), isOpen: false }
                          }))
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Product Actions */}
              <div className="product-actions">
                {!p.hasBeenEdited && (
                  <button className="edit-btn" onClick={() => handleEditClick(p)}>
                    ✏️ Edit
                  </button>
                )}
                <button className="delete-btn" onClick={() => confirmDelete(p.id)}>
                  🗑️ Delete
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
            <motion.section key="products" className="glass-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>🛒 Post a Product</h3>
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
          percent:
            i === count - 1
              ? (remaining - evenPercent * (count - 1)).toFixed(2)
              : evenPercent,
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
                  <p>{isDragActive ? '📂 Drop images here...' : '🖼️ Drag & drop product images or click to upload'}</p>
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

                <motion.button type="submit" className="submit-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🚀 Post Product
                </motion.button>
              </form>
            </motion.section>
          )}

          {section === 'chat' && (
            <motion.section key="chat" className="glass-section chat-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3>💬 Store Support Chat</h3>
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
                      ? '🛍️ Seller'
                      : isAdmin
                        ? '🛡️ Admin'
                        : '👤 User';

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
    <h3>📦 Manage Orders</h3>

    {orders.length === 0 ? (
      <p>No orders yet.</p>
    ) : (
      <div className="order-management-list">
        {orders.map(order => (
          <div key={order.id} className="order-box-glass">

            {/* ================= PRODUCT INFO ================= */}
            <h4><FaBoxOpen className="icon" /> Product Details</h4>
            <p><strong>Name:</strong> {order.product?.name || 'Unknown Product'}</p>
            {order.variant && <p><strong>Variant:</strong> {order.variant}</p>}
            <p><strong>Quantity:</strong> {order.quantity}</p>
            <p><strong>Unit Price:</strong> OMC {(order.total_price / order.quantity).toFixed(2)}</p>
            <p><strong>Total Price:</strong> OMC {order.total_price}</p>

            {/* ================= BUYER INFO ================= */}
            <h4><FaUser className="icon" /> Buyer Details</h4>
            <p><strong>Name:</strong> {order.buyer?.name || 'Anonymous'}</p>
            {order.buyer_phone && <p><strong>Phone:</strong> {order.buyer_phone}</p>}
            {order.buyer_location && <p><strong>Location:</strong> {order.buyer_location}</p>}

            {/* ================= DELIVERY INFO ================= */}
            <h4><FaShippingFast className="icon" /> Delivery Details</h4>
            <p><strong>Method:</strong> {order.delivery_method || 'Not specified'}</p>
            <p><strong>Address:</strong> {order.delivery_location || 'Not provided'}</p>
            {order.delivery_fee > 0 && <p><strong>Delivery Fee:</strong> OMC {order.delivery_fee}</p>}
            {order.pickup_station && <p><strong>Pickup Station:</strong> {order.pickup_station}</p>}

            {/* ================= PAYMENT INFO ================= */}
            <h4><FaMoneyBillAlt className="icon" /> Payment Details</h4>
            <p><strong>Payment Method:</strong> {order.payment_method || 'N/A'}</p>
            <p><strong>Deposit Paid:</strong> OMC {order.deposit_amount}</p>
            <p><strong>Balance Due:</strong> OMC {order.balance_due}</p>
            <p><strong>Paid via Wallet:</strong> {order.deposit_paid ? 'Yes' : 'No'}</p>

            {/* ================= STATUS & MANAGEMENT ================= */}
            <h4><FaClipboardList className="icon" /> Order Status</h4>
            <p>
              <strong>Placed:</strong> {new Date(order.created_at).toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong>
              <span className={`status-label status-${order.status?.replace(/\s+/g, '-').toLowerCase()}`}>
                {order.status}
              </span>
            </p>

            {/* Next step button */}
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
  <motion.section key="installments" className="glass-section"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4 }}
  >
    <h3> Lipa Polepole Orders</h3>
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
