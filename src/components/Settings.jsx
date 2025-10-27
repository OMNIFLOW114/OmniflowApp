import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  FaUser, FaLock, FaShoppingBag, FaMapMarkerAlt, FaCreditCard, 
  FaBell, FaCog, FaDownload, FaStore, FaEdit, FaChevronRight,
  FaEye, FaEyeSlash, FaQrcode, FaShieldAlt, FaTrash, FaClock, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaBellSlash, FaEnvelope, FaMobileAlt,
  FaFileExport, FaInfoCircle, FaBox, FaChartLine, FaStar, FaEye as FaEyeIcon
} from 'react-icons/fa';
import './Settings.css';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [storeStats, setStoreStats] = useState({ total_orders: 0, successful_orders: 0, products_count: 0 });
  const [markingAsRead, setMarkingAsRead] = useState(false);
  
  // User data from users & profiles
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    country: 'Kenya',
    avatar_url: ''
  });

  // Store data (for sellers)
  const [storeData, setStoreData] = useState({
    name: '',
    description: '',
    theme: 'default'
  });

  // Preferences & Notifications
  const [preferences, setPreferences] = useState({
    language: 'English',
    notifications: true,
    marketing_emails: false,
    sms_notifications: false
  });

  // Security
  const [security, setSecurity] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Wallet (payments)
  const [wallet, setWallet] = useState({ balance: 0 });

  // New address form
  const [newAddress, setNewAddress] = useState({
    title: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    is_default: false
  });

  useEffect(() => {
    if (!user) return;
    loadData();
    loadAddresses();
    loadOrders();
    loadNotifications();
    if (isSeller) loadStoreStats();
  }, [user, isSeller]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user/profile
      const [{ data: u }, { data: p }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('profiles').select('phone, city, country').eq('id', user.id).single()
      ]);

      setUserData({
        full_name: u?.full_name || u?.name || '',
        email: u?.email || '',
        phone: p?.phone || u?.phone || '',
        city: p?.city || '',
        country: p?.country || 'Kenya',
        avatar_url: u?.avatar_url || ''
      });

      setPreferences({
        language: u?.language || 'English',
        notifications: u?.notifications !== false,
        marketing_emails: u?.marketing_emails || false,
        sms_notifications: u?.sms_notifications || false
      });

      // Check if seller
      const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).single();
      setIsSeller(!!store);
      if (store) {
        setStoreData({
          name: store.name,
          description: store.description || '',
          theme: store.theme || 'default'
        });
        loadStoreStats(); // Load stats after confirming seller
      }

      // Load wallet
      const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
      setWallet({ balance: w?.balance || 0 });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);
      setAddresses(data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          status,
          created_at,
          delivered_at,
          product_id,
          products (name, image_url)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, read, type, created_at, color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadStoreStats = async () => {
    try {
      const { data: store } = await supabase.from('stores').select('total_orders, successful_orders').eq('owner_id', user.id).single();
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
      
      setStoreStats({
        total_orders: store?.total_orders || 0,
        successful_orders: store?.successful_orders || 0,
        products_count: productsCount || 0
      });
    } catch (error) {
      console.error('Error loading store stats:', error);
    }
  };

  const markNotificationAsRead = async (id) => {
    setMarkingAsRead(true);
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setMarkingAsRead(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updates = {
        full_name: userData.full_name,
        phone: userData.phone,
        updated_at: new Date().toISOString()
      };
      await supabase.from('users').update(updates).eq('id', user.id);

      if (userData.city || userData.country) {
        await supabase.from('profiles').update({ 
          phone: userData.phone, 
          city: userData.city, 
          country: userData.country 
        }).eq('id', user.id);
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveStore = async () => {
    setSaving(true);
    try {
      await supabase.from('stores').update(storeData).eq('owner_id', user.id);
      toast.success('Store updated successfully!');
    } catch (error) {
      toast.error('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await supabase.from('users').update(preferences).eq('id', user.id);
      toast.success('Preferences saved!');
    } catch (error) {
      toast.error('Save failed');
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
      await supabase.auth.updateUser({ password: security.newPassword });
      setSecurity({ newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await supabase.from('users').update({ is_banned: true }).eq('id', user.id);
      toast.success('Account deleted successfully');
      logout();
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

  const addAddress = async () => {
    if (!newAddress.address_line1 || !newAddress.city) {
      toast.error('Please fill in required address fields');
      return;
    }

    try {
      await supabase.from('profiles').update({
        city: newAddress.city,
        address_line1: newAddress.address_line1,
        address_line2: newAddress.address_line2,
        postal_code: newAddress.postal_code
      }).eq('id', user.id);

      toast.success('Address added successfully!');
      setNewAddress({
        title: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        is_default: false
      });
      loadAddresses();
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'addresses', label: 'Addresses', icon: FaMapMarkerAlt },
    { id: 'payments', label: 'Payments', icon: FaCreditCard },
    { id: 'orders', label: 'Orders', icon: FaShoppingBag },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    ...(isSeller ? [{ id: 'store', label: 'Your Store', icon: FaStore }] : []),
    { id: 'data', label: 'Data & Privacy', icon: FaDownload }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <header className="settings-header">
        <div className="header-content">
          <h1>Account Settings</h1>
          <p>Manage your profile, security, and preferences</p>
        </div>
      </header>

      <div className="settings-layout">
        {/* Mobile Tab Bar */}
        <div className="mobile-tab-bar">
          <div className="tab-scroll">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Sidebar */}
        <nav className="settings-sidebar">
          <div className="user-card">
            <div className="avatar-section">
              <img 
                src={userData.avatar_url || '/default-avatar.png'} 
                alt="Profile" 
                className="avatar" 
              />
              <div className="user-info">
                <h3>{userData.full_name || 'User'}</h3>
                <p>{userData.email}</p>
              </div>
            </div>
          </div>
          
          <div className="sidebar-tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id} 
                  className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <div className="tab-content">
                    <Icon className="tab-icon" />
                    <span>{tab.label}</span>
                  </div>
                  <FaChevronRight className="tab-arrow" />
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="settings-content">
          <div className="content-wrapper">

            {/* Profile Section */}
            {activeTab === 'profile' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Profile Information</h2>
                  <p>Update your personal details</p>
                </div>
                
                <div className="form-card">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={userData.full_name}
                      onChange={e => setUserData({...userData, full_name: e.target.value})}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={userData.email} 
                      disabled 
                      className="disabled-input"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input 
                        type="tel" 
                        value={userData.phone}
                        onChange={e => setUserData({...userData, phone: e.target.value})}
                        placeholder="+254 XXX XXX XXX"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>City</label>
                      <input 
                        type="text" 
                        value={userData.city}
                        onChange={e => setUserData({...userData, city: e.target.value})}
                        placeholder="Enter your city"
                      />
                    </div>
                  </div>
                  
                  <button 
                    className="save-button primary"
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </section>
            )}

            {/* Security Section */}
            {activeTab === 'security' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Login & Security</h2>
                  <p>Manage your password and account security</p>
                </div>
                
                <div className="form-card">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={userData.email} 
                      disabled 
                      className="disabled-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>New Password</label>
                    <div className="password-input">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={security.newPassword}
                        onChange={e => setSecurity({...security, newPassword: e.target.value})}
                        placeholder="Enter new password"
                      />
                      <button 
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={security.confirmPassword}
                      onChange={e => setSecurity({...security, confirmPassword: e.target.value})}
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  <button 
                    className="save-button primary"
                    onClick={changePassword}
                    disabled={saving}
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
                
                <div className="danger-zone">
                  <h3>Danger Zone</h3>
                  <p>Once you delete your account, there is no going back. Please be certain.</p>
                  <button 
                    className="delete-button"
                    onClick={deleteAccount}
                  >
                    <FaTrash />
                    Delete Account
                  </button>
                </div>
              </section>
            )}

            {/* Addresses Section */}
            {activeTab === 'addresses' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Your Addresses</h2>
                  <p>Manage your delivery addresses</p>
                </div>
                
                <div className="form-card">
                  <h3>Add New Address</h3>
                  <div className="form-group">
                    <label>Address Title (Home, Work, etc.)</label>
                    <input 
                      type="text"
                      value={newAddress.title}
                      onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                      placeholder="e.g., Home, Office"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Address Line 1 *</label>
                    <input 
                      type="text"
                      value={newAddress.address_line1}
                      onChange={e => setNewAddress({...newAddress, address_line1: e.target.value})}
                      placeholder="Street address, P.O. box"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Address Line 2</label>
                    <input 
                      type="text"
                      value={newAddress.address_line2}
                      onChange={e => setNewAddress({...newAddress, address_line2: e.target.value})}
                      placeholder="Apartment, suite, unit, building, floor, etc."
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input 
                        type="text"
                        value={newAddress.city}
                        onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                        placeholder="City"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Postal Code</label>
                      <input 
                        type="text"
                        value={newAddress.postal_code}
                        onChange={e => setNewAddress({...newAddress, postal_code: e.target.value})}
                        placeholder="Postal code"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={newAddress.is_default}
                        onChange={e => setNewAddress({...newAddress, is_default: e.target.checked})}
                      />
                      Set as default address
                    </label>
                  </div>
                  
                  <button 
                    className="save-button primary"
                    onClick={addAddress}
                  >
                    Add Address
                  </button>
                </div>
                
                <div className="addresses-list">
                  <h3>Saved Addresses</h3>
                  {addresses.length > 0 ? (
                    addresses.map((address, index) => (
                      <div key={index} className="address-card">
                        <div className="address-content">
                          <h4>{address.city || 'Primary Address'}</h4>
                          <p>{address.address_line1}</p>
                          {address.address_line2 && <p>{address.address_line2}</p>}
                          <p>{address.city}, {address.postal_code}</p>
                        </div>
                        <div className="address-actions">
                          <button className="edit-button">Edit</button>
                          <button className="delete-button small">Delete</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No addresses saved yet.</p>
                  )}
                </div>
              </section>
            )}

            {/* Payments Section */}
            {activeTab === 'payments' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Payment Methods</h2>
                  <p>Manage your wallet and payment options</p>
                </div>
                
                <div className="wallet-card premium">
                  <div className="wallet-header">
                    <FaQrcode className="wallet-icon" />
                    <div>
                      <h3>Wallet Balance</h3>
                      <p className="balance">KES {wallet.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="wallet-actions">
                    <button className="action-button primary">Add Funds</button>
                    <button className="action-button secondary">Withdraw</button>
                  </div>
                </div>
                
                <div className="payment-methods">
                  <h3>Payment Methods</h3>
                  <div className="payment-card">
                    <div className="payment-info">
                      <div className="payment-icon">M-Pesa</div>
                      <div>
                        <h4>M-Pesa</h4>
                        <p>Primary • • • • 2547</p>
                      </div>
                    </div>
                    <button className="edit-button">Edit</button>
                  </div>
                  
                  <button className="add-payment-button">
                    + Add Payment Method
                  </button>
                </div>
              </section>
            )}

            {/* Orders Section */}
            {activeTab === 'orders' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Your Orders</h2>
                  <p>Track and manage your recent purchases</p>
                </div>

                <div className="orders-list">
                  {orders.length > 0 ? (
                    orders.map(order => (
                      <div key={order.id} className="address-card">
                        <div className="address-content">
                          <div className="flex items-center gap-3 mb-2">
                            {order.products?.image_url ? (
                              <img src={order.products.image_url} alt={order.products.name} className="w-12 h-12 object-cover rounded-md" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                <FaBox />
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold">{order.products?.name || 'Product'}</h4>
                              <p className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-lg font-bold">KES {order.total_price?.toFixed(2)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {order.status === 'delivered' && <FaCheckCircle className="text-green-600" />}
                              {order.status === 'pending' && <FaClock className="text-yellow-600" />}
                              {order.status === 'cancelled' && <FaTimesCircle className="text-red-600" />}
                              <span className="capitalize text-sm font-medium">
                                {order.status || 'Processing'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="address-actions">
                          <button className="edit-button">View</button>
                          <button className="delete-button small">Track</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No orders yet. Start shopping!</p>
                  )}
                </div>

                <button className="save-button primary w-full mt-6">
                  View All Orders
                </button>
              </section>
            )}

            {/* Notifications Section */}
            {activeTab === 'notifications' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Notifications</h2>
                  <p>Manage your notification preferences and history</p>
                </div>

                <div className="form-card">
                  <h3>Notification Preferences</h3>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={preferences.notifications}
                        onChange={e => setPreferences({...preferences, notifications: e.target.checked})}
                      />
                      <div>
                        <strong>Push Notifications</strong>
                        <p className="text-sm text-gray-600">Receive alerts on your device</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={preferences.marketing_emails}
                        onChange={e => setPreferences({...preferences, marketing_emails: e.target.checked})}
                      />
                      <div>
                        <strong>Marketing Emails</strong>
                        <p className="text-sm text-gray-600">Get updates on deals and promotions</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={preferences.sms_notifications}
                        onChange={e => setPreferences({...preferences, sms_notifications: e.target.checked})}
                      />
                      <div>
                        <strong>SMS Alerts</strong>
                        <p className="text-sm text-gray-600">Receive order updates via SMS</p>
                      </div>
                    </label>
                  </div>

                  <button 
                    className="save-button primary"
                    onClick={savePreferences}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>

                <div className="addresses-list">
                  <h3>Recent Notifications</h3>
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div key={notif.id} className={`address-card ${notif.read ? '' : 'bg-blue-50 border-blue-300'}`}>
                        <div className="address-content">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${notif.color || 'bg-gray-200'}`}>
                              {notif.type === 'order' && <FaShoppingBag className="text-white" />}
                              {notif.type === 'promotion' && <FaStar className="text-white" />}
                              {notif.type === 'system' && <FaInfoCircle className="text-white" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{notif.title}</h4>
                              <p className="text-sm text-gray-600">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notif.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        {!notif.read && (
                          <button 
                            className="edit-button"
                            onClick={() => markNotificationAsRead(notif.id)}
                            disabled={markingAsRead}
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No notifications yet.</p>
                  )}
                </div>
              </section>
            )}

            {/* Your Store Section (Sellers Only) */}
            {activeTab === 'store' && isSeller && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Your Store</h2>
                  <p>Manage your seller dashboard and performance</p>
                </div>

                {/* Store Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="form-card p-4 text-center">
                    <FaShoppingBag className="text-3xl text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{storeStats.total_orders}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                  <div className="form-card p-4 text-center">
                    <FaCheckCircle className="text-3xl text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{storeStats.successful_orders}</p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                  <div className="form-card p-4 text-center">
                    <FaBox className="text-3xl text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{storeStats.products_count}</p>
                    <p className="text-sm text-gray-600">Products</p>
                  </div>
                </div>

                {/* Store Settings */}
                <div className="form-card">
                  <h3>Store Information</h3>
                  <div className="form-group">
                    <label>Store Name</label>
                    <input 
                      type="text"
                      value={storeData.name}
                      onChange={e => setStoreData({...storeData, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea 
                      rows="3"
                      value={storeData.description}
                      onChange={e => setStoreData({...storeData, description: e.target.value})}
                      placeholder="Tell customers about your store..."
                    />
                  </div>
                  <button 
                    className="save-button primary"
                    onClick={saveStore}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Update Store'}
                  </button>
                </div>

                <div className="wallet-card premium mt-6">
                  <div className="wallet-header">
                    <FaChartLine className="wallet-icon" />
                    <div>
                      <h3>Seller Dashboard</h3>
                      <p className="text-sm opacity-90">Manage products, orders, and analytics</p>
                    </div>
                  </div>
                  <div className="wallet-actions">
                    <button className="action-button primary" onClick={() => navigate('/seller')}>
                      Open Dashboard
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Data & Privacy Section */}
            {activeTab === 'data' && (
              <section className="tab-section">
                <div className="section-header">
                  <h2>Data & Privacy</h2>
                  <p>Control your data and account privacy</p>
                </div>

                <div className="form-card">
                  <h3>Export Your Data</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a copy of all your account data including orders, messages, and profile information.
                  </p>
                  <button 
                    className="save-button primary"
                    onClick={exportData}
                  >
                    <FaFileExport className="mr-2" />
                    Export Data
                  </button>
                </div>

                <div className="form-card">
                  <h3>Privacy Settings</h3>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <div>
                        <strong>Profile Visibility</strong>
                        <p className="text-sm text-gray-600">Allow others to find your profile</p>
                      </div>
                    </label>
                  </div>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <div>
                        <strong>Order History Sharing</strong>
                        <p className="text-sm text-gray-600">Share order stats with sellers</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="danger-zone">
                  <h3>Delete Account</h3>
                  <p>This action is permanent and cannot be undone.</p>
                  <button 
                    className="delete-button"
                    onClick={deleteAccount}
                  >
                    <FaTrash />
                    Delete My Account
                  </button>
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;