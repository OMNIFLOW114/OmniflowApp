// AdminManagement.jsx (Updated and Fixed)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiSearch, 
  FiUser, 
  FiUserCheck, 
  FiUserX,
  FiShield,
  FiMail
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './AdminPages.css';

const AdminManagement = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'moderator',
    permissions: []
  });

  const availablePermissions = {
    super_admin: ['all'],
    admin: [
      'view_dashboard',
      'manage_users',
      'manage_stores',
      'manage_products',
      'manage_categories',
      'manage_messages',
      'manage_finance',
      'manage_wallets',
      'manage_ratings',
      'manage_installments',
      'view_reports',
      'manage_promotions',
      'manage_admins',
      'manage_settings',
      'manage_database',
    ],
    moderator: [
      'view_dashboard',
      'manage_products',
      'manage_categories',
      'manage_ratings',
      'view_reports',
    ],
    support: [
      'view_dashboard',
      'manage_users',
      'manage_messages',
      'view_reports',
    ],
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      // Get current authenticated user for created_by field
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Cannot identify current user');
        return;
      }

      if (editingAdmin) {
        // Update existing admin
        const { error } = await supabase
          .from('admin_users')
          .update({
            role: formData.role,
            permissions: availablePermissions[formData.role] || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAdmin.id);

        if (error) throw error;
        toast.success('Admin updated successfully');
      } else {
        // Fetch user_id from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .single();

        if (userError || !userData) {
          toast.error('User with this email not found in users table');
          return;
        }

        const userId = userData.id;

        // Check if admin with this user_id already exists
        const { data: existingAdmin, error: checkError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing admin:', checkError);
          toast.error('Error checking existing admin');
          return;
        }

        if (existingAdmin) {
          toast.error('An admin with this user already exists');
          return;
        }

        // Create new admin with user_id and email
        const { data: newAdmin, error } = await supabase
          .from('admin_users')
          .insert([{
            user_id: userId,
            email: formData.email,
            role: formData.role,
            permissions: availablePermissions[formData.role] || [],
            is_active: true,
            created_by: currentUser.id
          }])
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          if (error.code === '23505') {
            toast.error('An admin with this user already exists');
          } else {
            toast.error('Failed to create admin: ' + error.message);
          }
          return;
        }

        toast.success(`New ${formData.role} added successfully!`);
      }

      setShowAddModal(false);
      setEditingAdmin(null);
      setFormData({ email: '', role: 'moderator', permissions: [] });
      fetchAdmins();
    } catch (error) {
      console.error('Error saving admin:', error);
      toast.error('Failed to save admin user');
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email || '',
      role: admin.role,
      permissions: admin.permissions || []
    });
    setShowAddModal(true);
  };

  const toggleAdminStatus = async (adminId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this admin?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminId);

      if (error) throw error;
      
      toast.success(`Admin ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchAdmins();
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      
      toast.success('Admin deleted successfully');
      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete admin');
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: 'var(--gold-color)',
      admin: 'var(--danger-color)',
      moderator: 'var(--warning-color)',
      support: 'var(--info-color)'
    };
    return colors[role] || colors.moderator;
  };

  const getRoleIcon = (role) => {
    if (role === 'super_admin') return <FaCrown />;
    if (role === 'admin') return <FiShield />;
    if (role === 'moderator') return <FiUserCheck />;
    return <FiUser />;
  };

  const filteredAdmins = admins.filter(admin =>
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin users...</p>
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
          <h1>Admin Management</h1>
          <p>Manage admin users and their permissions</p>
        </div>
        <button 
          className="add-button"
          onClick={() => {
            setEditingAdmin(null);
            setFormData({ email: '', role: 'moderator', permissions: [] });
            setShowAddModal(true);
          }}
        >
          <FiPlus />
          Add Admin
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search admins by email or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-overview">
          <div className="stat-item">
            <FiUser />
            <span>{admins.length} Total Admins</span>
          </div>
          <div className="stat-item">
            <FiUserCheck />
            <span>{admins.filter(a => a.is_active).length} Active</span>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="table-section">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Admin Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin, index) => (
                <motion.tr
                  key={admin.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {getRoleIcon(admin.role)}
                      </div>
                      <div className="user-details">
                        <strong>{admin.email}</strong>
                        <span>Admin ID: {admin.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span 
                      className="role-badge"
                      style={{ 
                        backgroundColor: `${getRoleColor(admin.role)}15`,
                        color: getRoleColor(admin.role)
                      }}
                    >
                      {getRoleIcon(admin.role)}
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="permissions-list">
                      {admin.permissions?.includes('all') ? (
                        <span className="permission-tag all">All Permissions</span>
                      ) : (
                        admin.permissions?.slice(0, 3).map(permission => (
                          <span key={permission} className="permission-tag">
                            {permission.replace('_', ' ')}
                          </span>
                        ))
                      )}
                      {admin.permissions?.length > 3 && !admin.permissions?.includes('all') && (
                        <span className="permission-more">+{admin.permissions.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${admin.is_active ? 'active' : 'inactive'}`}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(admin)}
                        title="Edit admin"
                      >
                        <FiEdit />
                      </button>
                      <button
                        className={`status-toggle-btn ${admin.is_active ? 'deactivate' : 'activate'}`}
                        onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                        title={admin.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {admin.is_active ? <FiUserX /> : <FiUserCheck />}
                      </button>
                      {admin.role !== 'super_admin' && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(admin.id)}
                          title="Delete admin"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAdmins.length === 0 && (
          <div className="empty-state">
            <FiUser size={48} />
            <h3>No admins found</h3>
            <p>{searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first admin user'}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <motion.div
            className="modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="modal-header">
              <h2>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h2>
              <button onClick={() => setShowAddModal(false)}>
                <FiArrowLeft />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-content">
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter admin email address"
                  required
                  disabled={!!editingAdmin}
                />
              </div>

              <div className="form-group">
                <label>Admin Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    role: e.target.value,
                    permissions: availablePermissions[e.target.value] || []
                  }))}
                  required
                >
                  <option value="moderator">Moderator</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="permissions-info">
                <h4>Permissions for {formData.role}:</h4>
                <div className="permissions-grid">
                  {availablePermissions[formData.role]?.map(permission => (
                    <div key={permission} className="permission-item">
                      <FiMail />
                      <span>{permission.replace('_', ' ')}</span>
                    </div>
                  ))}
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
                  {editingAdmin ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;