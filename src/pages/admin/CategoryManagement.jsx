// src/pages/admin/CategoryManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { supabase } from '@/supabase';
import { 
  FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiSearch, FiTag, 
  FiMenu, FiBell, FiLogOut, FiHome, FiUsers, FiSettings, 
  FiMessageSquare, FiShoppingCart, FiPackage, FiCreditCard, 
  FiFileText, FiDatabase, FiAward, FiClipboard, FiUserPlus, 
  FiActivity, FiBriefcase, FiChevronLeft, FiChevronRight,
  FiXCircle, FiCheckCircle, FiDollarSign, FiStar
} from 'react-icons/fi';
import { FaCrown, FaStore, FaShieldAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './CategoryManagement.css';

// Cache manager
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Skeleton Components
const CategoryCardSkeleton = () => (
  <div className="category-card-skeleton">
    <div className="sk-pulse" style={{ height: 120, width: '100%', borderRadius: '16px 16px 0 0' }} />
    <div className="category-info-skeleton">
      <div className="sk-pulse" style={{ width: '70%', height: 20, marginBottom: 8 }} />
      <div className="sk-pulse" style={{ width: '90%', height: 14, marginBottom: 4 }} />
      <div className="sk-pulse" style={{ width: '60%', height: 14 }} />
    </div>
    <div className="category-actions-skeleton">
      <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
      <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
    </div>
  </div>
);

const SidebarSkeleton = ({ collapsed }) => (
  <div className={`modern-sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="modern-sidebar-brand">
      <div className="sk-pulse" style={{ width: 40, height: 40, borderRadius: 12 }} />
      {!collapsed && <div className="sk-pulse" style={{ width: 100, height: 16, marginLeft: 12 }} />}
      <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: 6, marginLeft: 'auto' }} />
    </div>
    <div className="modern-sidebar-nav">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="nav-item-skeleton">
          <div className="sk-pulse" style={{ width: 24, height: 24, borderRadius: 6 }} />
          {!collapsed && <div className="sk-pulse" style={{ width: '70%', height: 14 }} />}
        </div>
      ))}
    </div>
    <div className="modern-sidebar-footer">
      <div className="sidebar-profile-skeleton">
        <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 10 }} />
        {!collapsed && <div className="sk-pulse" style={{ width: 80, height: 12 }} />}
      </div>
    </div>
  </div>
);

const CategoryManagement = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // Data state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: ''
  });

  // Role colors
  const roleColors = {
    super_admin: { primary: "#F59E0B", badge: "linear-gradient(135deg,#F59E0B,#D97706)", accent: "rgba(245,158,11,0.15)" },
    admin: { primary: "#EF4444", badge: "linear-gradient(135deg,#EF4444,#DC2626)", accent: "rgba(239,68,68,0.15)" },
    moderator: { primary: "#6366F1", badge: "linear-gradient(135deg,#6366F1,#4F46E5)", accent: "rgba(99,102,241,0.15)" },
    support: { primary: "#10B981", badge: "linear-gradient(135deg,#10B981,#059669)", accent: "rgba(16,185,129,0.15)" },
  };

  const getRoleColor = (role) => roleColors[role] || roleColors.moderator;

  const adminModules = [
    { icon: <FiHome />, title: "Dashboard", path: "/admin-dashboard", perm: "view_dashboard" },
    { icon: <FiUsers />, title: "User Management", path: "/admin/users", perm: "manage_users" },
    { icon: <FaStore />, title: "Store Management", path: "/admin/stores", perm: "manage_stores" },
    { icon: <FiShoppingCart />, title: "Products", path: "/admin/products", perm: "manage_products" },
    { icon: <FiPackage />, title: "Categories", path: "/admin/categories", perm: "manage_categories" },
    { icon: <FiMessageSquare />, title: "Messages", path: "/admin/messages", perm: "manage_messages" },
    { icon: <FiDollarSign />, title: "Finance", path: "/admin/finance", perm: "manage_finance" },
    { icon: <FiCreditCard />, title: "Wallets", path: "/admin/wallet", perm: "manage_wallets" },
    { icon: <FiStar />, title: "Ratings", path: "/admin/ratings", perm: "manage_ratings" },
    { icon: <FiClipboard />, title: "Installments", path: "/admin/installments", perm: "manage_installments" },
    { icon: <FiFileText />, title: "Reports", path: "/admin/reports", perm: "view_reports" },
    { icon: <FiUserPlus />, title: "Admin Users", path: "/admin/admins", perm: "manage_admins" },
    { icon: <FiSettings />, title: "Settings", path: "/admin/settings", perm: "manage_settings" },
    { icon: <FiDatabase />, title: "Database", path: "/admin/database", perm: "manage_database" },
    { icon: <FiAward />, title: "Promotions", path: "/admin/promotions", perm: "manage_promotions" },
  ];

  // Permission check
  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (data) {
        setCurrentAdmin(data);
        const hasPerm = data.role === "super_admin" || data.permissions?.includes("manage_categories") || data.permissions?.includes("all");
        if (!hasPerm) {
          toast.error("You don't have permission to manage categories");
          navigate("/admin-dashboard", { replace: true });
          return false;
        }
        setHasAccess(true);
        return true;
      }
      navigate("/admin-dashboard", { replace: true });
      return false;
    } catch {
      navigate("/admin-dashboard", { replace: true });
      return false;
    }
  }, [user, navigate]);

  // Fetch categories with caching
  const fetchCategories = useCallback(async () => {
    const cacheKey = "categories-data";
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setCategories(cached.categories);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      cache.set(cacheKey, { categories: data || [], timestamp: Date.now() });
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle submit (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setActionLoading('submit');
    try {
      if (editingCategory) {
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
      cache.delete('categories-data');
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setActionLoading(null);
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
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    setActionLoading(`delete-${categoryId}`);
    try {
      const categoryToDelete = categories.find(c => c.id === categoryId);
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('category', categoryToDelete?.name)
        .limit(1);

      if (products && products.length > 0) {
        toast.error('Cannot delete category with existing products');
        setActionLoading(null);
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      toast.success('Category deleted successfully');
      cache.delete('categories-data');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Effects
  useEffect(() => {
    const init = async () => {
      const ok = await checkAdminAccess();
      setAccessChecked(true);
      if (ok) await fetchCategories();
    };
    init();
  }, [checkAdminAccess, fetchCategories]);

  // Loading skeleton
  if (!accessChecked || !hasAccess || loading) {
    return (
      <div className={`category-modern-root ${darkMode ? "dark" : ""}`}>
        <SidebarSkeleton collapsed={sidebarCollapsed} />
        <main className="modern-main">
          <div className="modern-topbar">
            <div className="topbar-left">
              <div className="sk-pulse" style={{ width: 120, height: 24, borderRadius: 6 }} />
              <div className="sk-pulse" style={{ width: 200, height: 14, marginTop: 4 }} />
            </div>
            <div className="topbar-right">
              <div className="sk-pulse" style={{ width: 180, height: 36, borderRadius: 40 }} />
              <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 8 }} />
            </div>
          </div>
          <div className="modern-content">
            <div className="stats-row">
              <div className="stat-block skeleton">
                <div className="sk-pulse" style={{ width: 48, height: 48, borderRadius: 24 }} />
                <div><div className="sk-pulse" style={{ width: 60, height: 28 }} /><div className="sk-pulse" style={{ width: 80, height: 14, marginTop: 4 }} /></div>
              </div>
            </div>
            <div className="categories-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <CategoryCardSkeleton key={i} />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const rc = getRoleColor(currentAdmin?.role);

  return (
    <div className={`category-modern-root ${darkMode ? "dark" : ""}`}>
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div className="sidebar-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`modern-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="modern-sidebar-brand">
          <div className="brand-logo" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
            {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">OmniFlow</div>
              <div className="brand-role">{isSuperAdmin ? "Super Admin" : "Admin Panel"}</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)}>
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="modern-sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}
          {adminModules.map(module => (
            <button
              key={module.path}
              className={`nav-item ${module.path === "/admin/categories" ? "active" : ""}`}
              style={{ "--nav-color": rc.primary, "--nav-accent": rc.accent }}
              onClick={() => navigate(module.path)}
              title={sidebarCollapsed ? module.title : undefined}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.title}</span>}
            </button>
          ))}
        </nav>

        <div className="modern-sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
              {isSuperAdmin ? <FaCrown /> : <FiUser />}
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="profile-name">{currentAdmin?.email?.split("@")[0] || "Admin"}</div>
                <div className="profile-role" style={{ color: rc.primary }}>{currentAdmin?.role?.replace("_", " ")}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); navigate("/admin-auth"); }}>
            <FiLogOut /> {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="modern-main" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
        <header className="modern-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu /></button>
            <div>
              <h1>Category Management</h1>
              <p>Manage product categories and organization</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-wrapper">
              <FiSearch />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="create-category-btn" onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', description: '', image_url: '' });
              setShowAddModal(true);
            }}>
              <FiPlus /> Add Category
            </button>
            <button className="theme-toggle" onClick={toggleDarkMode}>{darkMode ? "☀️" : "🌙"}</button>
            <div className="role-badge">
              <div className="role-icon" style={{ background: rc.badge, color: isSuperAdmin ? "#000" : "#fff" }}>
                {isSuperAdmin ? <FaCrown /> : <FaShieldAlt />}
              </div>
              <div>
                <span className="role-name" style={{ color: rc.primary }}>{currentAdmin?.role?.toUpperCase()}</span>
                <span className="role-status">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="modern-content">
          {/* Stats Overview */}
          <div className="stats-row">
            <div className="stat-block">
              <div className="stat-icon"><FiTag /></div>
              <div>
                <span className="stat-value">{categories.length}</span>
                <span className="stat-label">Total Categories</span>
              </div>
            </div>
            <div className="stat-block">
              <div className="stat-icon"><FiPackage /></div>
              <div>
                <span className="stat-value">{filteredCategories.length}</span>
                <span className="stat-label">Filtered Results</span>
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="categories-grid">
            {filteredCategories.map((category, index) => (
              <motion.div
                key={category.id}
                className="category-card-modern"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
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
                    disabled={actionLoading === `delete-${category.id}`}
                  >
                    <FiEdit />
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(category.id)}
                    disabled={actionLoading === `delete-${category.id}`}
                  >
                    {actionLoading === `delete-${category.id}` ? (
                      <div className="loading-dots" />
                    ) : (
                      <FiTrash2 />
                    )}
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
              {!searchTerm && (
                <button className="create-first-btn" onClick={() => {
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', image_url: '' });
                  setShowAddModal(true);
                }}>
                  <FiPlus /> Create Your First Category
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}>
            <motion.div className="modal-modern" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                <button className="close" onClick={() => setShowAddModal(false)}><FiXCircle /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Category Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter category name"
                      required
                      autoFocus
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
                      <img src={formData.image_url} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="submit" disabled={actionLoading === 'submit'}>
                    {actionLoading === 'submit' ? (
                      <div className="loading-dots" />
                    ) : (
                      editingCategory ? 'Update Category' : 'Create Category'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryManagement;