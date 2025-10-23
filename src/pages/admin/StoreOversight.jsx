import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiFilter, 
  FiEye, 
  FiTrash2, 
  FiCheckCircle, 
  FiXCircle,
  FiAlertCircle,
  FiBriefcase,
  FiUser,
  FiMapPin,
  FiMail,
  FiPhone,
  FiFileText,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw
} from 'react-icons/fi';
import { FaStore, FaCheck, FaTimes, FaCrown, FaBan } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import './StoreOversight.css';

const TABS = [
  { key: 'all', label: 'All Stores', icon: <FiBriefcase /> },
  { key: 'pending', label: 'Pending Requests', icon: <FiAlertCircle /> },
  { key: 'active', label: 'Active', icon: <FiCheckCircle /> },
  { key: 'inactive', label: 'Inactive', icon: <FiXCircle /> },
  { key: 'verified', label: 'Verified', icon: <FaCheck /> },
  { key: 'unverified', label: 'Unverified', icon: <FiXCircle /> }
];

const StoreOversight = () => {
  const [stores, setStores] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [documentLoading, setDocumentLoading] = useState(null);

  const STORES_PER_PAGE = 9;
  const adminUserUUID = '755ed9e9-69f6-459c-ad44-d1b93b80a4c6';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storesResponse, requestsResponse] = await Promise.all([
        supabase.from('stores').select('*', { count: 'exact' }),
        supabase.from('store_requests').select('*')
      ]);

      if (storesResponse.error) throw storesResponse.error;
      if (requestsResponse.error) throw requestsResponse.error;

      setStores(storesResponse.data || []);
      setRequests(requestsResponse.data || []);
      setTotalCount(storesResponse.count || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const filteredStores = stores.filter(store => {
    const matchSearch = store.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       store.owner_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       store.location?.toLowerCase().includes(searchTerm.toLowerCase());

    switch (activeTab) {
      case 'active':
        return matchSearch && store.is_active;
      case 'inactive':
        return matchSearch && !store.is_active;
      case 'verified':
        return matchSearch && store.is_verified;
      case 'unverified':
        return matchSearch && !store.is_verified;
      case 'all':
      default:
        return matchSearch;
    }
  });

  const paginatedStores = filteredStores.slice(
    (page - 1) * STORES_PER_PAGE,
    page * STORES_PER_PAGE
  );

  const totalPages = Math.ceil(filteredStores.length / STORES_PER_PAGE);

  const updateStoreStatus = async (id, updates, actionName) => {
    setActionLoading(`${id}-${actionName}`);
    try {
      const { error } = await supabase.from('stores').update(updates).eq('id', id);
      
      if (error) throw error;

      const updated = stores.map(s => s.id === id ? { ...s, ...updates } : s);
      setStores(updated);
      toast.success(`Store ${actionName} successfully`);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to ${actionName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStoreStatus = async (store) => {
    const updates = {
      is_active: !store.is_active,
      deactivation_reason: store.is_active ? 'Deactivated by admin' : null
    };
    await updateStoreStatus(store.id, updates, store.is_active ? 'deactivated' : 'activated');
  };

  const toggleVerification = async (store) => {
    const updates = store.is_verified
      ? { is_verified: false, verified_at: null, verified_by: null }
      : {
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: adminUserUUID
        };
    await updateStoreStatus(store.id, updates, store.is_verified ? 'unverified' : 'verified');
  };

  const approveStoreRequest = async (request) => {
    setActionLoading(`approve-${request.id}`);
    
    try {
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

      const { data: newStore, error: insertError } = await supabase
        .from('stores')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('store_requests')
        .delete()
        .eq('id', request.id);

      if (deleteError) throw deleteError;

      setStores(prev => [...prev, newStore]);
      setRequests(prev => prev.filter(r => r.id !== request.id));

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Store Approved',
        message: 'Your store has been approved and is now live!',
        type: 'store',
        read: false,
        color: 'success',
      });

      toast.success('Store request approved successfully');
    } catch (error) {
      console.error('Store approval failed:', error);
      toast.error('Failed to approve store request');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectStoreRequest = async (request) => {
    setActionLoading(`reject-${request.id}`);
    
    try {
      const { error } = await supabase
        .from('store_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== request.id));

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Store Request Rejected',
        message: 'Your store request was rejected by admin.',
        type: 'store',
        read: false,
        color: 'error',
      });

      toast.success('Store request rejected');
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject store request');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteStore = async (store) => {
    setActionLoading(`delete-${store.id}`);
    
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);

      if (error) throw error;

      setStores(prev => prev.filter(s => s.id !== store.id));
      toast.success('Store deleted successfully');
    } catch (error) {
      console.error('Deletion failed:', error);
      toast.error('Failed to delete store');
    } finally {
      setActionLoading(null);
    }
  };

  const getStoreStatus = (store) => {
    if (!store.is_active) {
      return { label: 'Inactive', color: 'var(--danger-color)', icon: <FiXCircle /> };
    }
    if (store.is_verified) {
      return { label: 'Verified', color: 'var(--success-color)', icon: <FiCheckCircle /> };
    }
    return { label: 'Active', color: 'var(--warning-color)', icon: <FiAlertCircle /> };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Enhanced document handling function
  const handleDocumentView = async (documentData, documentType) => {
    if (!documentData) {
      toast.error('No document available');
      return;
    }

    setDocumentLoading(documentType);
    
    try {
      let filePath = documentData;
      
      // Handle different document data formats
      if (typeof documentData === 'string') {
        try {
          const parsed = JSON.parse(documentData);
          filePath = parsed.path || parsed.url || documentData;
        } catch {
          filePath = documentData;
        }
      } else if (typeof documentData === 'object') {
        filePath = documentData.path || documentData.url || documentData;
      }

      console.log('Attempting to access document:', filePath);

      // First try to get public URL
      const { data: publicUrlData } = supabase.storage
        .from('store-documents')
        .getPublicUrl(filePath);

      // Check if public URL works
      const testPublicUrl = await testUrl(publicUrlData.publicUrl);
      if (testPublicUrl) {
        window.open(publicUrlData.publicUrl, '_blank');
        return;
      }

      // If public URL doesn't work, try signed URL
      const { data: signedData, error } = await supabase.storage
        .from('store-documents')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Signed URL error:', error);
        throw new Error('Document not accessible');
      }

      window.open(signedData.signedUrl, '_blank');
      
    } catch (error) {
      console.error('Document access error:', error);
      toast.error('Unable to load document. It may have been deleted or is inaccessible.');
    } finally {
      setDocumentLoading(null);
    }
  };

  // Helper function to test if URL is accessible
  const testUrl = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Document button component for reusability
  const DocumentButton = ({ documentData, label, type }) => (
    <motion.button 
      className="doc-link"
      onClick={() => handleDocumentView(documentData, type)}
      disabled={documentLoading === type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <FiFileText />
      {documentLoading === type ? (
        <>
          <FiRefreshCw className="loading-spinner-small" />
          Loading...
        </>
      ) : (
        <>
          {label}
          <FiDownload />
        </>
      )}
    </motion.button>
  );

  if (loading) {
    return (
      <div className="store-oversight-loading">
        <div className="loading-spinner"></div>
        <p>Loading stores...</p>
      </div>
    );
  }

  return (
    <div className="store-oversight-container">
      <motion.div
        className="store-oversight-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <FaStore className="header-icon" />
            <div>
              <h1>Store Oversight</h1>
              <p>Monitor and manage store accounts and requests</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <FaStore className="stat-icon" />
              <div>
                <span className="stat-number">{stores.length}</span>
                <span className="stat-label">Total Stores</span>
              </div>
            </div>
            <div className="stat-card">
              <FiAlertCircle className="stat-icon" />
              <div>
                <span className="stat-number">{requests.length}</span>
                <span className="stat-label">Pending Requests</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="store-oversight-content">
        {/* Tabs Section */}
        <motion.section
          className="tabs-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="tab-buttons">
            {TABS.map(tab => (
              <motion.button
                key={tab.key}
                className={`tab-btn ${tab.key === activeTab ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Controls Section */}
        <motion.section
          className="controls-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search stores by name, owner ID, or location..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <motion.button
            className="refresh-btn"
            onClick={fetchData}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiRefreshCw />
            Refresh
          </motion.button>
        </motion.section>

        {/* Content Section */}
        {activeTab === 'pending' ? (
          <motion.section
            className="requests-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="section-header">
              <h2>Pending Store Requests</h2>
              <span className="request-count">{requests.length} requests</span>
            </div>

            {requests.length === 0 ? (
              <div className="empty-state">
                <FiCheckCircle className="empty-icon" />
                <h3>No pending requests</h3>
                <p>All store requests have been processed</p>
              </div>
            ) : (
              <div className="requests-grid">
                {requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    className="request-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <div className="request-header">
                      <div className="store-avatar">
                        <FiBriefcase />
                      </div>
                      <div className="request-info">
                        <h3>{request.name}</h3>
                        <p>Owner: {request.user_id}</p>
                      </div>
                      <div className="request-status pending">
                        <FiAlertCircle />
                        Pending Review
                      </div>
                    </div>

                    <div className="request-details">
                      <div className="detail-item">
                        <FiMapPin className="detail-icon" />
                        <span>{request.location || 'No location specified'}</span>
                      </div>
                      <div className="detail-item">
                        <FiUser className="detail-icon" />
                        <span>{request.business_type || 'No type specified'}</span>
                      </div>
                      {(request.business_document || request.owner_id_card) && (
                        <div className="document-links">
                          {request.business_document && (
                            <DocumentButton
                              documentData={request.business_document}
                              label="Business Document"
                              type="business"
                            />
                          )}
                          {request.owner_id_card && (
                            <DocumentButton
                              documentData={request.owner_id_card}
                              label="ID Document"
                              type="id"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="request-actions">
                      <motion.button
                        className="approve-btn"
                        onClick={() => approveStoreRequest(request)}
                        disabled={actionLoading === `approve-${request.id}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {actionLoading === `approve-${request.id}` ? (
                          <FiRefreshCw className="loading-spinner-small" />
                        ) : (
                          <FiCheckCircle />
                        )}
                        {actionLoading === `approve-${request.id}` ? 'Approving...' : 'Approve'}
                      </motion.button>
                      <motion.button
                        className="reject-btn"
                        onClick={() => rejectStoreRequest(request)}
                        disabled={actionLoading === `reject-${request.id}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {actionLoading === `reject-${request.id}` ? (
                          <FiRefreshCw className="loading-spinner-small" />
                        ) : (
                          <FiXCircle />
                        )}
                        {actionLoading === `reject-${request.id}` ? 'Rejecting...' : 'Reject'}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        ) : (
          <motion.section
            className="stores-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="section-header">
              <h2>
                {TABS.find(tab => tab.key === activeTab)?.label} 
                <span className="store-count">({filteredStores.length} stores)</span>
              </h2>
            </div>

            {filteredStores.length === 0 ? (
              <div className="empty-state">
                <FiBriefcase className="empty-icon" />
                <h3>No stores found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <>
                <div className="stores-grid">
                  {paginatedStores.map((store, index) => {
                    const status = getStoreStatus(store);
                    
                    return (
                      <motion.div
                        key={store.id}
                        className="store-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      >
                        <div className="store-header">
                          <div className="store-avatar">
                            {store.is_verified ? <FaCheck /> : <FiBriefcase />}
                          </div>
                          <div className="store-info">
                            <h3>{store.name}</h3>
                            <p>Owner: {store.owner_id}</p>
                          </div>
                          <div 
                            className="store-status"
                            style={{ backgroundColor: `${status.color}15`, color: status.color }}
                          >
                            {status.icon}
                            {status.label}
                          </div>
                        </div>

                        <div className="store-details">
                          <div className="detail-item">
                            <FiMapPin className="detail-icon" />
                            <span>{store.location || 'No location'}</span>
                          </div>
                          <div className="detail-item">
                            <FiMail className="detail-icon" />
                            <span>{store.contact_email || 'No email'}</span>
                          </div>
                          <div className="detail-item">
                            <FiPhone className="detail-icon" />
                            <span>{store.contact_phone || 'No phone'}</span>
                          </div>
                          {store.verified_at && (
                            <div className="detail-item">
                              <FiCheckCircle className="detail-icon" />
                              <span>Verified {formatDate(store.verified_at)}</span>
                            </div>
                          )}
                        </div>

                        <div className="store-actions">
                          <motion.button
                            className="view-btn"
                            onClick={() => setSelectedStore(store)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FiEye />
                            Details
                          </motion.button>
                          <motion.button
                            className={`status-btn ${store.is_active ? 'deactivate' : 'activate'}`}
                            onClick={() => toggleStoreStatus(store)}
                            disabled={actionLoading === `${store.id}-${store.is_active ? 'deactivated' : 'activated'}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {actionLoading === `${store.id}-${store.is_active ? 'deactivated' : 'activated'}` ? (
                              <FiRefreshCw className="loading-spinner-small" />
                            ) : (
                              store.is_active ? <FiXCircle /> : <FiCheckCircle />
                            )}
                            {actionLoading === `${store.id}-${store.is_active ? 'deactivated' : 'activated'}` 
                              ? 'Updating...' 
                              : (store.is_active ? 'Deactivate' : 'Activate')
                            }
                          </motion.button>
                          <motion.button
                            className={`verify-btn ${store.is_verified ? 'unverify' : 'verify'}`}
                            onClick={() => toggleVerification(store)}
                            disabled={actionLoading === `${store.id}-${store.is_verified ? 'unverified' : 'verified'}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {actionLoading === `${store.id}-${store.is_verified ? 'unverified' : 'verified'}` ? (
                              <FiRefreshCw className="loading-spinner-small" />
                            ) : (
                              store.is_verified ? <FiXCircle /> : <FiCheckCircle />
                            )}
                            {actionLoading === `${store.id}-${store.is_verified ? 'unverified' : 'verified'}` 
                              ? 'Updating...' 
                              : (store.is_verified ? 'Unverify' : 'Verify')
                            }
                          </motion.button>
                          <motion.button
                            className="delete-btn"
                            onClick={() => deleteStore(store)}
                            disabled={actionLoading === `delete-${store.id}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {actionLoading === `delete-${store.id}` ? (
                              <FiRefreshCw className="loading-spinner-small" />
                            ) : (
                              <FiTrash2 />
                            )}
                            {actionLoading === `delete-${store.id}` ? 'Deleting...' : 'Delete'}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <motion.div
                    className="pagination"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <button
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="pagination-btn"
                    >
                      <FiChevronLeft />
                      Previous
                    </button>
                    
                    <div className="pagination-info">
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                    </div>
                    
                    <button
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="pagination-btn"
                    >
                      Next
                      <FiChevronRight />
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.section>
        )}
      </div>

      {/* Store Details Modal */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            className="store-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStore(null)}
          >
            <motion.div
              className="store-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Store Details</h3>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedStore(null)}
                >
                  <FiXCircle />
                </button>
              </div>

              <div className="modal-content">
                <div className="store-detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Store ID:</strong>
                      <span>{selectedStore.id}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Owner ID:</strong>
                      <span>{selectedStore.owner_id}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Store Name:</strong>
                      <span>{selectedStore.name}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Description:</strong>
                      <span>{selectedStore.description || 'No description'}</span>
                    </div>
                  </div>
                </div>

                <div className="store-detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Email:</strong>
                      <span>{selectedStore.contact_email || 'No email'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Phone:</strong>
                      <span>{selectedStore.contact_phone || 'No phone'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Location:</strong>
                      <span>{selectedStore.location || 'No location'}</span>
                    </div>
                  </div>
                </div>

                <div className="store-detail-section">
                  <h4>Documents</h4>
                  <div className="document-links">
                    {selectedStore.business_document && (
                      <DocumentButton
                        documentData={selectedStore.business_document}
                        label="View Business Document"
                        type="business-modal"
                      />
                    )}
                    {selectedStore.owner_id_card && (
                      <DocumentButton
                        documentData={selectedStore.owner_id_card}
                        label="View ID Card"
                        type="id-modal"
                      />
                    )}
                    {!selectedStore.business_document && !selectedStore.owner_id_card && (
                      <p className="no-documents">No documents available</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreOversight;