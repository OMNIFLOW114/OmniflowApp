// src/pages/Settings.jsx - PROFESSIONAL HIGH-END VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { supabase } from '@/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaLock, FaShoppingBag, FaMapMarkerAlt, FaCreditCard, 
  FaBell, FaCog, FaDownload, FaStore, FaEdit, FaChevronRight,
  FaEye, FaEyeSlash, FaShieldAlt, FaTrash, FaClock, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaEnvelope, FaMobileAlt,
  FaFileExport, FaInfoCircle, FaBox, FaChartLine, FaStar, FaEye as FaEyeIcon,
  FaArrowLeft, FaSpinner, FaPlus, FaWallet, FaHeart, FaTag, FaTruck,
  FaUserCircle, FaPhone, FaMapPin, FaGlobe, FaLanguage, FaMoon, FaSun,
  FaBellSlash, FaCheck, FaMinus, FaExternalLinkAlt
} from 'react-icons/fa';
import styles from './Settings.module.css';

// Kenyan Money Formatter
const formatKenyanMoney = (amount) => {
  if (amount === undefined || amount === null) return "KSh 0";
  const num = Number(amount);
  if (isNaN(num)) return "KSh 0";
  return `KSh ${num.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

// ===== SKELETON LOADER =====
const SettingsSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonWrapper}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonBack}></div>
          <div className={styles.skeletonTitle}></div>
        </div>
        <div className={styles.skeletonLayout}>
          <div className={styles.skeletonSidebar}>
            <div className={styles.skeletonAvatar}></div>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className={styles.skeletonNavItem}></div>
            ))}
          </div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonSection}>
              <div className={styles.skeletonHeading}></div>
              <div className={styles.skeletonCard}>
                <div className={styles.skeletonField}></div>
                <div className={styles.skeletonField}></div>
                <div className={styles.skeletonBtn}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
const Settings = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  
  // User Data
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    country: 'Kenya',
    avatar_url: ''
  });

  // Store Data
  const [storeData, setStoreData] = useState({
    name: '',
    description: '',
    theme: 'default'
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    language: 'English',
    notifications: true,
    marketing_emails: false,
    sms_notifications: false,
    dark_mode: false
  });

  // Security
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Wallet
  const [wallet, setWallet] = useState({ balance: 0 });

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    title: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    is_default: false
  });

  // Orders
  const [orders, setOrders] = useState([]);
  
  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Store Stats
  const [storeStats, setStoreStats] = useState({ 
    total_orders: 0, 
    successful_orders: 0, 
    products_count: 0 
  });

  // Tabs configuration
  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'security', label: 'Security', icon: FaLock },
    { id: 'addresses', label: 'Addresses', icon: FaMapMarkerAlt },
    { id: 'payments', label: 'Payments', icon: FaCreditCard },
    { id: 'orders', label: 'Orders', icon: FaShoppingBag },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    ...(isSeller ? [{ id: 'store', label: 'Your Store', icon: FaStore }] : []),
    { id: 'preferences', label: 'Preferences', icon: FaCog }
  ];

  // ===== DATA LOADING =====
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserData(),
        loadAddresses(),
        loadOrders(),
        loadNotifications(),
        loadWallet(),
        checkSellerStatus()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    const { data: u } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (u) {
      setUserData({
        full_name: u.full_name || u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        city: u.city || '',
        country: u.country || 'Kenya',
        avatar_url: u.avatar_url || ''
      });
      
      setPreferences({
        language: u.language || 'English',
        notifications: u.notifications !== false,
        marketing_emails: u.marketing_emails || false,
        sms_notifications: u.sms_notifications || false,
        dark_mode: u.dark_mode || false
      });
    }
  };

  const loadAddresses = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);
    setAddresses(data || []);
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, total_price, status, created_at, delivered_at,
        product_id,
        products (name, image_url)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setOrders(data || []);
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15);
    setNotifications(data || []);
  };

  const loadWallet = async () => {
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    setWallet({ balance: data?.balance || 0 });
  };

  const checkSellerStatus = async () => {
    const { data } = await supabase
      .from('stores')
      .select('id, name, description, theme, total_orders, successful_orders')
      .eq('owner_id', user.id)
      .single();
    
    if (data) {
      setIsSeller(true);
      setStoreData({
        name: data.name,
        description: data.description || '',
        theme: data.theme || 'default'
      });
      setStoreStats({
        total_orders: data.total_orders || 0,
        successful_orders: data.successful_orders || 0,
        products_count: 0
      });
      
      // Get products count
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
      setStoreStats(prev => ({ ...prev, products_count: count || 0 }));
    }
  };

  // ===== ACTIONS =====
  const saveProfile = async () => {
    setSaving(true);
    try {
      const updates = {
        full_name: userData.full_name,
        phone: userData.phone,
        city: userData.city,
        country: userData.country,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (security.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: security.newPassword 
      });
      if (error) throw error;
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          language: preferences.language,
          notifications: preferences.notifications,
          marketing_emails: preferences.marketing_emails,
          sms_notifications: preferences.sms_notifications
        })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success('Preferences saved!');
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveStore = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: storeData.name,
          description: storeData.description,
          theme: storeData.theme
        })
        .eq('owner_id', user.id);
      
      if (error) throw error;
      toast.success('Store updated successfully!');
    } catch (error) {
      toast.error('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addAddress = async () => {
    if (!newAddress.address_line1 || !newAddress.city) {
      toast.error('Please fill in required address fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          city: newAddress.city,
          address_line1: newAddress.address_line1,
          address_line2: newAddress.address_line2,
          postal_code: newAddress.postal_code
        })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success('Address added successfully!');
      setNewAddress({
        title: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        is_default: false
      });
      setShowAddressForm(false);
      loadAddresses();
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const deleteAccount = async () => {
    setShowDeleteConfirm(false);
    try {
      await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('id', user.id);
      toast.success('Account deleted successfully');
      await logout();
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const exportData = async () => {
    try {
      toast.loading('Exporting your data...');
      const [u, o, m] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('*').eq('buyer_id', user.id),
        supabase.from('store_messages').select('*').eq('user_id', user.id)
      ]);
      const data = { user: u.data, orders: o.data, messages: m.data };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // ===== RENDER =====
  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Settings</h1>
        <button className={styles.headerAction} onClick={toggleDarkMode}>
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </header>

      <div className={styles.settingsLayout}>
        {/* Mobile Tab Selector */}
        <div className={styles.mobileTabBar}>
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            className={styles.mobileSelect}
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.userCard}>
            <div className={styles.avatarWrapper}>
              <img 
                src={userData.avatar_url || '/default-avatar.png'} 
                alt="Profile" 
                className={styles.avatar} 
                onError={(e) => { e.target.src = '/default-avatar.png'; }}
              />
              <span className={styles.statusDot}></span>
            </div>
            <div className={styles.userInfo}>
              <h3>{userData.full_name || 'User'}</h3>
              <p>{userData.email}</p>
              <span className={styles.userBadge}>
                {isSeller ? 'Seller' : 'Buyer'}
              </span>
            </div>
          </div>
          
          <div className={styles.sidebarTabs}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id} 
                  className={`${styles.sidebarTab} ${activeTab === tab.id ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className={styles.tabIcon} />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && <span className={styles.activeIndicator} />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className={styles.content}>
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Profile Information</h2>
                <p>Update your personal details and account information</p>
              </div>
              
              <div className={styles.formCard}>
                <div className={styles.formGroup}>
                  <label><FaUser /> Full Name</label>
                  <input 
                    type="text" 
                    value={userData.full_name}
                    onChange={e => setUserData({...userData, full_name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label><FaEnvelope /> Email Address</label>
                  <input 
                    type="email" 
                    value={userData.email} 
                    disabled 
                    className={styles.disabledInput}
                  />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label><FaPhone /> Phone Number</label>
                    <input 
                      type="tel" 
                      value={userData.phone}
                      onChange={e => setUserData({...userData, phone: e.target.value})}
                      placeholder="+254 XXX XXX XXX"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label><FaMapPin /> City</label>
                    <input 
                      type="text" 
                      value={userData.city}
                      onChange={e => setUserData({...userData, city: e.target.value})}
                      placeholder="Enter your city"
                    />
                  </div>
                </div>
                
                <button 
                  className={styles.saveBtn}
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? <FaSpinner className={styles.spinning} /> : 'Save Changes'}
                </button>
              </div>
            </section>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Security</h2>
                <p>Manage your password and account security</p>
              </div>
              
              <div className={styles.formCard}>
                <div className={styles.formGroup}>
                  <label><FaEnvelope /> Email Address</label>
                  <input 
                    type="email" 
                    value={userData.email} 
                    disabled 
                    className={styles.disabledInput}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>New Password</label>
                  <div className={styles.passwordInput}>
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={security.newPassword}
                      onChange={e => setSecurity({...security, newPassword: e.target.value})}
                      placeholder="Enter new password"
                    />
                    <button 
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Confirm Password</label>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={security.confirmPassword}
                    onChange={e => setSecurity({...security, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                </div>
                
                <button 
                  className={styles.saveBtn}
                  onClick={changePassword}
                  disabled={saving}
                >
                  {saving ? <FaSpinner className={styles.spinning} /> : 'Update Password'}
                </button>
              </div>
              
              <div className={styles.dangerZone}>
                <h3><FaExclamationTriangle /> Danger Zone</h3>
                <p>Once you delete your account, there is no going back. Please be certain.</p>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <FaTrash /> Delete Account
                </button>
              </div>

              {/* Delete Confirmation Modal */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div 
                    className={styles.modalOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    <motion.div 
                      className={styles.confirmModal}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.9 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaExclamationTriangle className={styles.warningIcon} />
                      <h3>Delete Account</h3>
                      <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                      <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                          Cancel
                        </button>
                        <button className={styles.confirmDeleteBtn} onClick={deleteAccount}>
                          Yes, Delete
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* Addresses Section */}
          {activeTab === 'addresses' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Addresses</h2>
                <p>Manage your delivery addresses</p>
              </div>
              
              <button 
                className={styles.addAddressBtn}
                onClick={() => setShowAddressForm(!showAddressForm)}
              >
                <FaPlus /> Add New Address
              </button>
              
              <AnimatePresence>
                {showAddressForm && (
                  <motion.div 
                    className={styles.addressForm}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className={styles.formGroup}>
                      <label>Address Title</label>
                      <input 
                        type="text"
                        value={newAddress.title}
                        onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                        placeholder="e.g., Home, Office"
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Address Line 1 *</label>
                      <input 
                        type="text"
                        value={newAddress.address_line1}
                        onChange={e => setNewAddress({...newAddress, address_line1: e.target.value})}
                        placeholder="Street address, P.O. box"
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Address Line 2</label>
                      <input 
                        type="text"
                        value={newAddress.address_line2}
                        onChange={e => setNewAddress({...newAddress, address_line2: e.target.value})}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                      />
                    </div>
                    
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>City *</label>
                        <input 
                          type="text"
                          value={newAddress.city}
                          onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                          placeholder="City"
                        />
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>Postal Code</label>
                        <input 
                          type="text"
                          value={newAddress.postal_code}
                          onChange={e => setNewAddress({...newAddress, postal_code: e.target.value})}
                          placeholder="Postal code"
                        />
                      </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          checked={newAddress.is_default}
                          onChange={e => setNewAddress({...newAddress, is_default: e.target.checked})}
                        />
                        <span>Set as default address</span>
                      </label>
                    </div>
                    
                    <div className={styles.formActions}>
                      <button className={styles.cancelBtn} onClick={() => setShowAddressForm(false)}>
                        Cancel
                      </button>
                      <button className={styles.saveBtn} onClick={addAddress}>
                        Save Address
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className={styles.addressesList}>
                <h3>Saved Addresses</h3>
                {addresses.length > 0 ? (
                  addresses.map((address, index) => (
                    <div key={index} className={styles.addressCard}>
                      <div className={styles.addressContent}>
                        <h4>{address.title || 'Primary Address'}</h4>
                        <p>{address.address_line1}</p>
                        {address.address_line2 && <p>{address.address_line2}</p>}
                        <p>{address.city}, {address.postal_code}</p>
                      </div>
                      <div className={styles.addressActions}>
                        <button className={styles.editBtn}><FaEdit /> Edit</button>
                        <button className={styles.deleteBtn}><FaTrash /> Delete</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.noData}>No addresses saved yet.</p>
                )}
              </div>
            </section>
          )}

          {/* Payments Section */}
          {activeTab === 'payments' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Payments</h2>
                <p>Manage your wallet and payment options</p>
              </div>
              
              <div className={styles.walletCard}>
                <div className={styles.walletBalance}>
                  <span className={styles.walletLabel}>Wallet Balance</span>
                  <span className={styles.walletAmount}>{formatKenyanMoney(wallet.balance)}</span>
                </div>
                <div className={styles.walletActions}>
                  <button className={styles.addFundsBtn}>Add Funds</button>
                  <button className={styles.withdrawBtn}>Withdraw</button>
                </div>
              </div>
              
              <div className={styles.paymentMethods}>
                <h3>Payment Methods</h3>
                <div className={styles.paymentCard}>
                  <div className={styles.paymentInfo}>
                    <div className={styles.paymentIcon}>💳</div>
                    <div>
                      <h4>M-Pesa</h4>
                      <p>Primary • • • • 2547</p>
                    </div>
                  </div>
                  <button className={styles.editBtn}>Edit</button>
                </div>
                
                <button className={styles.addPaymentBtn}>
                  <FaPlus /> Add Payment Method
                </button>
              </div>
            </section>
          )}

          {/* Orders Section */}
          {activeTab === 'orders' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Orders</h2>
                <p>Track and manage your recent purchases</p>
              </div>

              <div className={styles.ordersList}>
                {orders.length > 0 ? (
                  orders.map(order => {
                    const getStatusIcon = () => {
                      switch (order.status) {
                        case 'delivered': return <FaCheckCircle className={styles.statusDelivered} />;
                        case 'pending': return <FaClock className={styles.statusPending} />;
                        case 'cancelled': return <FaTimesCircle className={styles.statusCancelled} />;
                        default: return <FaClock className={styles.statusPending} />;
                      }
                    };
                    
                    return (
                      <div 
                        key={order.id} 
                        className={styles.orderCard}
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        <div className={styles.orderImage}>
                          {order.products?.image_url ? (
                            <img src={order.products.image_url} alt={order.products?.name} />
                          ) : (
                            <FaBox />
                          )}
                        </div>
                        <div className={styles.orderInfo}>
                          <h4>{order.products?.name || 'Product'}</h4>
                          <p className={styles.orderId}>Order #{order.id.slice(0, 8)}</p>
                          <div className={styles.orderMeta}>
                            <span className={styles.orderDate}>
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                            <span className={styles.orderStatus}>
                              {getStatusIcon()}
                              {order.status || 'Processing'}
                            </span>
                          </div>
                          <p className={styles.orderTotal}>{formatKenyanMoney(order.total_price)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.noData}>No orders yet. Start shopping!</p>
                )}
              </div>

              <button className={styles.viewAllBtn} onClick={() => navigate('/orders')}>
                View All Orders
              </button>
            </section>
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Notifications</h2>
                <p>Manage your notification preferences and history</p>
              </div>

              <div className={styles.notificationsList}>
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
                    >
                      <div className={styles.notificationIcon}>
                        {notif.type === 'order' ? <FaShoppingBag /> : 
                         notif.type === 'promotion' ? <FaTag /> : 
                         <FaBell />}
                      </div>
                      <div className={styles.notificationContent}>
                        <h4>{notif.title}</h4>
                        <p>{notif.message}</p>
                        <span className={styles.notificationTime}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {!notif.read && (
                        <button 
                          className={styles.markReadBtn}
                          onClick={() => markNotificationAsRead(notif.id)}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className={styles.noData}>No notifications yet.</p>
                )}
              </div>
            </section>
          )}

          {/* Store Section */}
          {activeTab === 'store' && isSeller && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Your Store</h2>
                <p>Manage your seller dashboard and performance</p>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <FaShoppingBag className={styles.statIcon} />
                  <p className={styles.statValue}>{storeStats.total_orders}</p>
                  <p className={styles.statLabel}>Total Orders</p>
                </div>
                <div className={styles.statCard}>
                  <FaCheckCircle className={styles.statIcon} />
                  <p className={styles.statValue}>{storeStats.successful_orders}</p>
                  <p className={styles.statLabel}>Completed</p>
                </div>
                <div className={styles.statCard}>
                  <FaBox className={styles.statIcon} />
                  <p className={styles.statValue}>{storeStats.products_count}</p>
                  <p className={styles.statLabel}>Products</p>
                </div>
              </div>

              <div className={styles.formCard}>
                <h3>Store Information</h3>
                <div className={styles.formGroup}>
                  <label>Store Name</label>
                  <input 
                    type="text"
                    value={storeData.name}
                    onChange={e => setStoreData({...storeData, name: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea 
                    rows="3"
                    value={storeData.description}
                    onChange={e => setStoreData({...storeData, description: e.target.value})}
                    placeholder="Tell customers about your store..."
                  />
                </div>
                <button 
                  className={styles.saveBtn}
                  onClick={saveStore}
                  disabled={saving}
                >
                  {saving ? <FaSpinner className={styles.spinning} /> : 'Update Store'}
                </button>
              </div>

              <div className={styles.dashboardCard}>
                <div className={styles.dashboardHeader}>
                  <FaChartLine className={styles.dashboardIcon} />
                  <div>
                    <h3>Seller Dashboard</h3>
                    <p>Manage products, orders, and analytics</p>
                  </div>
                </div>
                <button className={styles.dashboardBtn} onClick={() => navigate('/seller')}>
                  Open Dashboard <FaExternalLinkAlt />
                </button>
              </div>
            </section>
          )}

          {/* Preferences Section */}
          {activeTab === 'preferences' && (
            <section className={styles.tabSection}>
              <div className={styles.sectionHeader}>
                <h2>Preferences</h2>
                <p>Customize your app experience</p>
              </div>

              <div className={styles.formCard}>
                <h3>App Preferences</h3>
                
                <div className={styles.formGroup}>
                  <label><FaLanguage /> Language</label>
                  <select 
                    value={preferences.language}
                    onChange={e => setPreferences({...preferences, language: e.target.value})}
                  >
                    <option value="English">English</option>
                    <option value="Swahili">Swahili</option>
                  </select>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={e => setPreferences({...preferences, notifications: e.target.checked})}
                    />
                    <div>
                      <strong>Push Notifications</strong>
                      <p>Receive alerts on your device</p>
                    </div>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox"
                      checked={preferences.marketing_emails}
                      onChange={e => setPreferences({...preferences, marketing_emails: e.target.checked})}
                    />
                    <div>
                      <strong>Marketing Emails</strong>
                      <p>Get updates on deals and promotions</p>
                    </div>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox"
                      checked={preferences.sms_notifications}
                      onChange={e => setPreferences({...preferences, sms_notifications: e.target.checked})}
                    />
                    <div>
                      <strong>SMS Alerts</strong>
                      <p>Receive order updates via SMS</p>
                    </div>
                  </label>
                </div>

                <button 
                  className={styles.saveBtn}
                  onClick={savePreferences}
                  disabled={saving}
                >
                  {saving ? <FaSpinner className={styles.spinning} /> : 'Save Preferences'}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
      
      {/* Bottom Spacing for Navigation */}
      <div className={styles.bottomSpacing} />
    </div>
  );
};

export default Settings;