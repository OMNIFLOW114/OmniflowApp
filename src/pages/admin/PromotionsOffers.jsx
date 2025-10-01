import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiSearch, 
  FiAward, 
  FiCalendar,
  FiEye,
  FiEyeOff,
  FiTrendingUp
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './AdminPages.css';

const PromotionsOffers = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    title: '',
    description: '',
    image_url: '',
    tagline: '',
    active: true,
    starts_at: '',
    ends_at: '',
    priority: 0,
    type: 'featured',
    background_color: '#4f46e5',
    cta_text: 'Shop Now',
    is_featured: false,
    display_position: 'homepage'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promotionsData, productsData] = await Promise.all([
        supabase
          .from('promoted_products')
          .select(`
            *,
            products (
              name,
              price,
              image_url
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, name, price, image_url')
          .eq('status', 'active')
          .order('name')
      ]);

      if (promotionsData.error) throw promotionsData.error;
      if (productsData.error) throw productsData.error;

      setPromotions(promotionsData.data || []);
      setProducts(productsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load promotions data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.product_id) {
      toast.error('Title and product are required');
      return;
    }

    try {
      if (editingPromotion) {
        // Update existing promotion
        const { error } = await supabase
          .from('promoted_products')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPromotion.id);

        if (error) throw error;
        toast.success('Promotion updated successfully');
      } else {
        // Create new promotion
        const { error } = await supabase
          .from('promoted_products')
          .insert([{
            ...formData,
            promoted_by_admin_id: (await supabase.auth.getUser()).data.user.id
          }]);

        if (error) throw error;
        toast.success('Promotion created successfully');
      }

      setShowAddModal(false);
      setEditingPromotion(null);
      setFormData({
        product_id: '',
        title: '',
        description: '',
        image_url: '',
        tagline: '',
        active: true,
        starts_at: '',
        ends_at: '',
        priority: 0,
        type: 'featured',
        background_color: '#4f46e5',
        cta_text: 'Shop Now',
        is_featured: false,
        display_position: 'homepage'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast.error('Failed to save promotion');
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      product_id: promotion.product_id || '',
      title: promotion.title,
      description: promotion.description || '',
      image_url: promotion.image_url || '',
      tagline: promotion.tagline || '',
      active: promotion.active,
      starts_at: promotion.starts_at ? promotion.starts_at.split('T')[0] : '',
      ends_at: promotion.ends_at ? promotion.ends_at.split('T')[0] : '',
      priority: promotion.priority || 0,
      type: promotion.type || 'featured',
      background_color: promotion.background_color || '#4f46e5',
      cta_text: promotion.cta_text || 'Shop Now',
      is_featured: promotion.is_featured || false,
      display_position: promotion.display_position || 'homepage'
    });
    setShowAddModal(true);
  };

  const togglePromotionStatus = async (promotionId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('promoted_products')
        .update({ 
          active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId);

      if (error) throw error;
      
      toast.success(`Promotion ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (error) {
      console.error('Error updating promotion status:', error);
      toast.error('Failed to update promotion status');
    }
  };

  const handleDelete = async (promotionId) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promoted_products')
        .delete()
        .eq('id', promotionId);

      if (error) throw error;
      
      toast.success('Promotion deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Failed to delete promotion');
    }
  };

  const getStatus = (promotion) => {
    const now = new Date();
    const startsAt = new Date(promotion.starts_at);
    const endsAt = new Date(promotion.ends_at);

    if (!promotion.active) return 'inactive';
    if (now < startsAt) return 'scheduled';
    if (now > endsAt) return 'expired';
    return 'active';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'var(--success-color)',
      scheduled: 'var(--info-color)',
      expired: 'var(--warning-color)',
      inactive: 'var(--danger-color)'
    };
    return colors[status];
  };

  const filteredPromotions = promotions.filter(promotion =>
    promotion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promotion.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promotion.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading promotions...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <button className="back-button" onClick={() => navigate('/admin-overview')}>
          <FiArrowLeft />
          Back to Dashboard
        </button>
        <div className="header-content">
          <h1>Promotions & Offers</h1>
          <p>Manage featured products and promotional campaigns</p>
        </div>
        <button 
          className="add-button"
          onClick={() => {
            setEditingPromotion(null);
            setFormData({
              product_id: '',
              title: '',
              description: '',
              image_url: '',
              tagline: '',
              active: true,
              starts_at: '',
              ends_at: '',
              priority: 0,
              type: 'featured',
              background_color: '#4f46e5',
              cta_text: 'Shop Now',
              is_featured: false,
              display_position: 'homepage'
            });
            setShowAddModal(true);
          }}
        >
          <FiPlus />
          Add Promotion
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search promotions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-overview">
          <div className="stat-item">
            <FiAward />
            <span>{promotions.length} Total Promotions</span>
          </div>
          <div className="stat-item">
            <FiTrendingUp />
            <span>{promotions.filter(p => getStatus(p) === 'active').length} Active</span>
          </div>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="promotions-grid">
        {filteredPromotions.map((promotion, index) => {
          const status = getStatus(promotion);
          return (
            <motion.div
              key={promotion.id}
              className="promotion-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div 
                className="promotion-header"
                style={{ backgroundColor: promotion.background_color || '#4f46e5' }}
              >
                <div className="promotion-image">
                  {promotion.image_url ? (
                    <img src={promotion.image_url} alt={promotion.title} />
                  ) : promotion.products?.image_url ? (
                    <img src={promotion.products.image_url} alt={promotion.title} />
                  ) : (
                    <div className="image-placeholder">
                      <FiAward />
                    </div>
                  )}
                </div>
                <div className="promotion-badge">
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: `${getStatusColor(status)}15`,
                      color: getStatusColor(status)
                    }}
                  >
                    {status.toUpperCase()}
                  </span>
                  {promotion.is_featured && (
                    <span className="featured-badge">FEATURED</span>
                  )}
                </div>
              </div>

              <div className="promotion-content">
                <h3>{promotion.title}</h3>
                <p className="promotion-tagline">{promotion.tagline}</p>
                <p className="promotion-description">{promotion.description}</p>
                
                {promotion.products && (
                  <div className="product-info">
                    <strong>Product:</strong> {promotion.products.name}
                  </div>
                )}

                <div className="promotion-dates">
                  <div className="date-item">
                    <FiCalendar />
                    <span>Starts: {new Date(promotion.starts_at).toLocaleDateString()}</span>
                  </div>
                  <div className="date-item">
                    <FiCalendar />
                    <span>Ends: {new Date(promotion.ends_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="promotion-meta">
                  <span className="priority">Priority: {promotion.priority}</span>
                  <span className="type">Type: {promotion.type}</span>
                </div>
              </div>

              <div className="promotion-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleEdit(promotion)}
                  title="Edit promotion"
                >
                  <FiEdit />
                </button>
                <button
                  className={`status-btn ${promotion.active ? 'deactivate' : 'activate'}`}
                  onClick={() => togglePromotionStatus(promotion.id, promotion.active)}
                  title={promotion.active ? 'Deactivate' : 'Activate'}
                >
                  {promotion.active ? <FiEyeOff /> : <FiEye />}
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(promotion.id)}
                  title="Delete promotion"
                >
                  <FiTrash2 />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredPromotions.length === 0 && (
        <div className="empty-state">
          <FiAward size={48} />
          <h3>No promotions found</h3>
          <p>{searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first promotion'}</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <motion.div
            className="modal large-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="modal-header">
              <h2>{editingPromotion ? 'Edit Promotion' : 'Add New Promotion'}</h2>
              <button onClick={() => setShowAddModal(false)}>
                <FiArrowLeft />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Product *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - ${product.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Promotion Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="featured">Featured</option>
                    <option value="banner">Banner</option>
                    <option value="special">Special Offer</option>
                    <option value="flash_sale">Flash Sale</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter promotion title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Enter catchy tagline"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter promotion description"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.starts_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.ends_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="10"
                  />
                </div>

                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/promotion-image.jpg"
                />
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                    />
                    Featured
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="confirm-btn">
                  {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PromotionsOffers;