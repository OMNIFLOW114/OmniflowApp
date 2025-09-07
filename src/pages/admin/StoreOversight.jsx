// src/pages/admin/StoreOversight.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import {
  FaCheck, FaTimes, FaEye, FaTrashAlt
} from 'react-icons/fa';
import './StoreOversight.css';

const TABS = ['All', 'Pending', 'Active', 'Inactive', 'Verified', 'Unverified'];

const StoreOversight = () => {
  const [stores, setStores] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);

  const adminUserUUID = '755ed9e9-69f6-459c-ad44-d1b93b80a4c6';

  useEffect(() => {
    const fetchAll = async () => {
      const { data: storeData } = await supabase.from('stores').select('*');
      const { data: requestData } = await supabase.from('store_requests').select('*');
      setStores(storeData || []);
      setRequests(requestData || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const filteredStores = stores.filter(store => {
    const matchSearch = store.name?.toLowerCase().includes(searchTerm.toLowerCase()) || store.owner_id?.toLowerCase().includes(searchTerm.toLowerCase());

    switch (activeTab) {
      case 'Active':
        return matchSearch && store.is_active;
      case 'Inactive':
        return matchSearch && !store.is_active;
      case 'Verified':
        return matchSearch && store.is_verified;
      case 'Unverified':
        return matchSearch && !store.is_verified;
      case 'All':
      default:
        return matchSearch;
    }
  });

  const updateStoreStatus = async (id, updates) => {
    const { error } = await supabase.from('stores').update(updates).eq('id', id);
    if (!error) {
      const updated = stores.map(s => s.id === id ? { ...s, ...updates } : s);
      setStores(updated);
    }
  };

  const toggleStoreStatus = async (store) => {
    const updates = {
      is_active: !store.is_active,
      deactivation_reason: store.is_active ? 'Deactivated by admin' : null
    };
    await updateStoreStatus(store.id, updates);
  };

  const toggleVerification = async (store) => {
    const updates = store.is_verified
      ? { is_verified: false, verified_at: null, verified_by: null }
      : {
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: adminUserUUID
      };
    await updateStoreStatus(store.id, updates);
  };

  const approveStoreRequest = async (request) => {
    if (!window.confirm(`Approve store "${request.name}" for user ${request.user_id}?`)) return;

    const payload = {
      owner_id: request.user_id,
      name: request.name,
      description: request.description || '',
      contact_email: request.contact_email || '',
      contact_phone: request.contact_phone || '',
      location: request.location || '',
      business_document: request.business_document || '',
      owner_id_card: request.owner_id_card || '',
      is_active: true,
      is_verified: true,
      verified_by: adminUserUUID,
      verified_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('stores').insert(payload);
    const { error: deleteError } = await supabase.from('store_requests').delete().eq('id', request.id);

    if (insertError || deleteError) {
      console.error('Store approval failed:', insertError || deleteError);
      return;
    }

    setStores((prev) => [...prev, payload]);
    setRequests((prev) => prev.filter((r) => r.id !== request.id));

    await supabase.from('notifications').insert({
      user_id: request.user_id,
      title: '✅ Store Approved',
      message: 'Your store has been approved and is now live!',
      type: 'store',
      read: false,
      color: 'success',
    });
  };

  const rejectStoreRequest = async (request) => {
    if (!window.confirm(`Reject store request "${request.name}"?`)) return;

    const { error } = await supabase.from('store_requests').delete().eq('id', request.id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: '❌ Store Request Rejected',
        message: 'Your store request was rejected by admin.',
        type: 'store',
        read: false,
        color: 'error',
      });
    }
  };

  const deleteStore = async (store) => {
    if (!window.confirm(`Permanently delete store "${store.name}"?`)) return;
    await supabase.from('stores').delete().eq('id', store.id);
    setStores((prev) => prev.filter((s) => s.id !== store.id));
  };

  if (loading) return <div className="store-oversight-loading">Loading stores...</div>;

  return (
    <div className="store-oversight-container">
      <h2>🛠️ Store Oversight</h2>

      <div className="tab-buttons">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${tab === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Pending' && (
        <>
          <h3>📝 Pending Store Requests</h3>
          <div className="store-list">
            {requests.map((req) => (
              <div key={req.id} className="store-card pending">
                <h4>{req.name}</h4>
                <p><strong>Owner:</strong> {req.user_id}</p>
                <p><strong>Location:</strong> {req.location}</p>
                <p><strong>Type:</strong> {req.business_type}</p>
                <p>
                  📎 <a href={`https://kkxgrrcbyluhdfsoywvd.supabase.co/storage/v1/object/public/store-documents/${req.business_document}`} target="_blank" rel="noreferrer">Business Doc</a>
                  &nbsp;|&nbsp;
                  🆔 <a href={`https://kkxgrrcbyluhdfsoywvd.supabase.co/storage/v1/object/public/store-documents/${req.owner_id_card}`} target="_blank" rel="noreferrer">ID Doc</a>
                </p>
                <div className="store-actions">
                  <button onClick={() => approveStoreRequest(req)} className="approve">✅ Approve</button>
                  <button onClick={() => rejectStoreRequest(req)} className="reject">❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab !== 'Pending' && (
        <>
          <input
            type="text"
            className="store-search-input"
            placeholder="🔍 Search stores or owner ID"
            value={searchTerm}
            onChange={handleSearch}
          />

          <h3>🏪 {activeTab} Stores</h3>
          <div className="store-list">
            {filteredStores.map((store) => (
              <div key={store.id} className={`store-card ${store.is_active ? 'active' : 'inactive'}`}>
                <h4>{store.name} {store.is_verified && <span className="verified-badge">✔ Verified</span>}</h4>
                <p><strong>Owner:</strong> {store.owner_id}</p>
                <p><strong>Status:</strong> {store.is_active ? '🟢 Active' : '🔴 Inactive'}</p>
                <p><strong>Location:</strong> {store.location}</p>
                <div className="store-actions">
                  <button onClick={() => setSelectedStore(store)}><FaEye /> Review</button>
                  <button onClick={() => toggleStoreStatus(store)}>
                    {store.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => toggleVerification(store)}>
                    {store.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button onClick={() => deleteStore(store)} className="delete"><FaTrashAlt /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedStore && (
        <div className="store-modal-overlay">
          <div className="store-modal-box">
            <h3>📄 Store Details</h3>
            <p><strong>ID:</strong> {selectedStore.id}</p>
            <p><strong>Description:</strong> {selectedStore.description}</p>
            <p><strong>Email:</strong> {selectedStore.contact_email}</p>
            <p><strong>Phone:</strong> {selectedStore.contact_phone}</p>
            <p><strong>Location:</strong> {selectedStore.location}</p>
            {selectedStore.business_document && (
              <p>
                📎 <a href={`https://kkxgrrcbyluhdfsoywvd.supabase.co/storage/v1/object/public/store-documents/${selectedStore.business_document}`} target="_blank" rel="noreferrer">View Business Doc</a>
              </p>
            )}
            {selectedStore.owner_id_card && (
              <p>
                🆔 <a href={`https://kkxgrrcbyluhdfsoywvd.supabase.co/storage/v1/object/public/store-documents/${selectedStore.owner_id_card}`} target="_blank" rel="noreferrer">View ID Card</a>
              </p>
            )}
            <button className="close-btn" onClick={() => setSelectedStore(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreOversight;
