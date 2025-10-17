// AdminManagement.jsx — Fixed Version

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

  // Fixed: Direct database approach instead of Edge Function
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('You must be logged in as a superadmin');
        return;
      }

      // Check if user already exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', formData.email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error('Error checking user existence');
      }

      if (existingUser) {
        // Check if user is already an admin
        const { data: existingAdmin } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', existingUser.id)
          .single();

        if (existingAdmin) {
          toast.error('This user is already an admin');
          return;
        }

        // Create admin record for existing user
        const { data: newAdmin, error: adminError } = await supabase
          .from('admin_users')
          .insert([
            {
              user_id: existingUser.id,
              email: formData.email,
              role: formData.role,
              permissions: availablePermissions[formData.role] || [],
              is_active: true,
              created_by: currentUser.id,
            }
          ])
          .select()
          .single();

        if (adminError) throw adminError;

        toast.success(`Admin privileges granted to ${formData.email}`);
        
      } else {
        // Create invitation for non-existing user
        const { data: invitation, error: inviteError } = await supabase
          .from('admin_invitations')
          .insert([
            {
              email: formData.email,
              role: formData.role,
              permissions: availablePermissions[formData.role] || [],
              invited_by: currentUser.id,
              token: generateInviteToken(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
          ])
          .select()
          .single();

        if (inviteError) throw inviteError;

        // TODO: Send email invitation (you can integrate with your email service)
        toast.success(`Invitation sent to ${formData.email}. They have 7 days to accept.`);
      }

      setShowAddModal(false);
      setFormData({ email: '', role: 'moderator', permissions: [] });
      fetchAdmins(); // Refresh the list
      
    } catch (error) {
      console.error('Error creating admin/invitation:', error);
      toast.error(error.message || 'Failed to process admin invitation');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate invite token
  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const handleEdit = async (admin) => {
    if (editingAdmin?.id === admin.id) {
      // Update existing admin
      try {
        const { error } = await supabase
          .from('admin_users')
          .update({
            role: formData.role,
            permissions: formData.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', admin.id);

        if (error) throw error;

        toast.success('Admin updated successfully');
        setShowAddModal(false);
        setEditingAdmin(null);
        setFormData({ email: '', role: 'moderator', permissions: [] });
        fetchAdmins();
      } catch (error) {
        console.error('Error updating admin:', error);
        toast.error('Failed to update admin');
      }
    } else {
      // Set up for editing
      setEditingAdmin(admin);
      setFormData({
        email: admin.email || '',
        role: admin.role,
        permissions: admin.permissions || []
      });
      setShowAddModal(true);
    }
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

  if (loading && admins.length === 0) {
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
          Invite Admin
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
            <p>{searchTerm ? 'Try adjusting your search terms' : 'Get started by inviting your first admin user'}</p>
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
              <h2>{editingAdmin ? 'Edit Admin' : 'Invite New Admin'}</h2>
              <button onClick={() => setShowAddModal(false)}>
                <FiArrowLeft />
              </button>
            </div>

            <form onSubmit={editingAdmin ? (e) => { e.preventDefault(); handleEdit(editingAdmin); } : handleSubmit} className="modal-content">
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
                <button type="submit" className="confirm-btn" disabled={loading}>
                  {loading ? 'Processing...' : editingAdmin ? 'Update Admin' : 'Send Invitation'}
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