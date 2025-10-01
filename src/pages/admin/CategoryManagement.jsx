import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiSearch, FiTag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './AdminPages.css';

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            description: formData.description,
            image_url: formData.image_url
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: formData.name,
            description: formData.description,
            image_url: formData.image_url
          }]);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      setShowAddModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', image_url: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      // Check if category has products
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('category', categories.find(c => c.id === categoryId)?.name)
        .limit(1);

      if (products && products.length > 0) {
        toast.error('Cannot delete category with existing products');
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading categories...</p>
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
          <h1>Category Management</h1>
          <p>Manage product categories and organization</p>
        </div>
        <button 
          className="add-button"
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', description: '', image_url: '' });
            setShowAddModal(true);
          }}
        >
          <FiPlus />
          Add Category
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-overview">
          <div className="stat-item">
            <FiTag />
            <span>{categories.length} Total Categories</span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="categories-grid">
        {filteredCategories.map((category, index) => (
          <motion.div
            key={category.id}
            className="category-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="category-image">
              {category.image_url ? (
                <img src={category.image_url} alt={category.name} />
              ) : (
                <div className="category-placeholder">
                  <FiTag />
                </div>
              )}
            </div>
            <div className="category-content">
              <h3>{category.name}</h3>
              <p>{category.description || 'No description'}</p>
            </div>
            <div className="category-actions">
              <button
                className="edit-btn"
                onClick={() => handleEdit(category)}
                title="Edit category"
              >
                <FiEdit />
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDelete(category.id)}
                title="Delete category"
              >
                <FiTrash2 />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="empty-state">
          <FiTag size={48} />
          <h3>No categories found</h3>
          <p>{searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first category'}</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <motion.div
            className="modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={() => setShowAddModal(false)}>
                <FiArrowLeft />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-content">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter category description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {formData.image_url && (
                <div className="image-preview">
                  <img src={formData.image_url} alt="Preview" />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="confirm-btn">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;