// AdminManagement.jsx — Protected Super Admin Version

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
  FiMail,
  FiLock
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './AdminPages.css';

// Protected super admin email - this should never be changed
const PROTECTED_SUPER_ADMIN_EMAIL = 'omniflow718@gmail.com';

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

  // Check if admin is protected super admin
  const isProtectedSuperAdmin = (admin) => {
    return admin.email === PROTECTED_SUPER_ADMIN_EMAIL || admin.protected_super_admin === true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Prevent creating account with protected email
    if (formData.email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase()) {
      toast.error('This email is reserved for system super admin');
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
              protected_super_admin: false // Always false for new admins
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

  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const handleEdit = async (admin) => {
    // Prevent editing protected super admin
    if (isProtectedSuperAdmin(admin)) {
      toast.error('This super admin account is protected and cannot be modified');
      return;
    }

    if (editingAdmin?.id === admin.id) {
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
    const admin = admins.find(a => a.id === adminId);
    
    // Prevent deactivating protected super admin
    if (isProtectedSuperAdmin(admin)) {
      toast.error('Protected super admin account cannot be deactivated');
      return;
    }

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
    const admin = admins.find(a => a.id === adminId);
    
    // Prevent deleting protected super admin
    if (isProtectedSuperAdmin(admin)) {
      toast.error('Protected super admin account cannot be deleted');
      return;
    }

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

  const getRoleColor = (admin) => {
    if (isProtectedSuperAdmin(admin)) {
      return 'var(--gold-color)';
    }
    
    const colors = {
      super_admin: 'var(--gold-color)',
      admin: 'var(--danger-color)',
      moderator: 'var(--warning-color)',
      support: 'var(--info-color)'
    };
    return colors[admin.role] || colors.moderator;
  };

  const getRoleIcon = (admin) => {
    if (isProtectedSuperAdmin(admin)) {
      return <FaCrown />;
    }
    if (admin.role === 'super_admin') return <FaCrown />;
    if (admin.role === 'admin') return <FiShield />;
    if (admin.role === 'moderator') return <FiUserCheck />;
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

      {/* Protected Admin Notice */}
      <div className="protected-admin-notice">
        <FiLock className="notice-icon" />
        <div className="notice-content">
          <strong>Protected Super Admin:</strong> The account <code>{PROTECTED_SUPER_ADMIN_EMAIL}</code> is a system-protected super admin and cannot be modified or deleted.
        </div>
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
          <div className="stat-item protected">
            <FaCrown />
            <span>{admins.filter(a => isProtectedSuperAdmin(a)).length} Protected</span>
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
              {filteredAdmins.map((admin, index) => {
                const isProtected = isProtectedSuperAdmin(admin);
                return (
                  <motion.tr
                    key={admin.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={isProtected ? 'protected-admin-row' : ''}
                  >
                    <td>
                      <div className="user-info">
                        <div className="user-avatar protected">
                          {getRoleIcon(admin)}
                          {isProtected && <div className="protected-badge" title="Protected Super Admin"></div>}
                        </div>
                        <div className="user-details">
                          <strong>
                            {admin.email}
                            {isProtected && <span className="protected-label">Protected</span>}
                          </strong>
                          <span>Admin ID: {admin.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="role-badge"
                        style={{
                          backgroundColor: `${getRoleColor(admin)}15`,
                          color: getRoleColor(admin)
                        }}
                      >
                        {getRoleIcon(admin)}
                        {isProtected ? 'Super Admin (Protected)' : admin.role.replace('_', ' ')}
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
                        {isProtected && admin.is_active && <FiLock size={12} />}
                      </span>
                    </td>
                    <td>
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`edit-btn ${isProtected ? 'disabled' : ''}`}
                          onClick={() => handleEdit(admin)}
                          title={isProtected ? 'Protected account cannot be edited' : 'Edit admin'}
                          disabled={isProtected}
                        >
                          <FiEdit />
                        </button>
                        <button
                          className={`status-toggle-btn ${admin.is_active ? 'deactivate' : 'activate'} ${isProtected ? 'disabled' : ''}`}
                          onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                          title={isProtected ? 'Protected account status cannot be changed' : (admin.is_active ? 'Deactivate' : 'Activate')}
                          disabled={isProtected}
                        >
                          {admin.is_active ? <FiUserX /> : <FiUserCheck />}
                        </button>
                        {!isProtected && admin.role !== 'super_admin' && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(admin.id)}
                            title="Delete admin"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                        {isProtected && (
                          <button
                            className="protected-btn disabled"
                            title="Protected super admin - cannot be modified"
                            disabled
                          >
                            <FiLock />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
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
                {formData.email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase() && (
                  <small className="error-text">This email is reserved for system super admin</small>
                )}
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
                <button 
                  type="submit" 
                  className="confirm-btn" 
                  disabled={loading || formData.email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase()}
                >
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