import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUsers, 
  FiSearch, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight,
  FiUser,
  FiUserCheck,
  FiUserX,
  FiStar,
  FiBriefcase,
  FiShield,
  FiMail,
  FiPhone,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiEdit,
  FiMoreVertical
} from "react-icons/fi";
import { FaCrown, FaStore, FaBan, FaCheck } from "react-icons/fa";
import { toast } from "react-hot-toast";
import "./UserManagement.css";

const USERS_PER_PAGE = 10;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    const from = (page - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    let query = supabase
      .from("users")
      .select(`
        *,
        stores:stores!stores_owner_id_fkey(id, name, is_verified, verified_at)
      `, { count: 'exact' });

    // Apply search filter
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    // Apply status filter
    if (filter === 'banned') {
      query = query.eq('is_banned', true);
    } else if (filter === 'premium') {
      query = query.eq('is_premium', true);
    } else if (filter === 'store_owners') {
      query = query.not('stores', 'is', null);
    } else if (filter === 'verified_stores') {
      query = query.eq('stores.is_verified', true);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Fetch error:", error);
      toast.error('Failed to load users');
    } else {
      setUsers(data || []);
      setTotalUsers(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm, filter]);

  const toggleField = async (userId, field, value, actionName) => {
    setActionLoading(`${field}-${userId}`);
    const { error } = await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", userId);

    if (error) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to ${actionName}`);
    } else {
      toast.success(`User ${actionName} successfully`);
      fetchUsers();
    }
    setActionLoading(null);
  };

  const toggleStoreVerification = async (storeId, value, storeName) => {
    setActionLoading(`store-${storeId}`);
    const { error } = await supabase
      .from("stores")
      .update({ 
        is_verified: value, 
        verified_at: value ? new Date().toISOString() : null 
      })
      .eq("id", storeId);

    if (error) {
      console.error("Failed to update store verification:", error);
      toast.error(`Failed to ${value ? 'verify' : 'unverify'} store`);
    } else {
      toast.success(`Store ${value ? 'verified' : 'unverified'} successfully`);
      fetchUsers();
    }
    setActionLoading(null);
  };

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  const getStatusBadge = (user) => {
    if (user.is_banned) {
      return { label: 'Banned', color: 'var(--danger-color)', icon: <FaBan /> };
    }
    if (user.is_premium) {
      return { label: 'Premium', color: 'var(--gold-color)', icon: <FaCrown /> };
    }
    if (user.stores?.id) {
      return { label: 'Store Owner', color: 'var(--success-color)', icon: <FaStore /> };
    }
    return { label: 'Active', color: 'var(--accent-primary)', icon: <FiUserCheck /> };
  };

  const getStoreBadge = (store) => {
    if (!store) return null;
    return store.is_verified 
      ? { label: 'Verified Store', color: 'var(--success-color)', icon: <FiCheckCircle /> }
      : { label: 'Unverified Store', color: 'var(--warning-color)', icon: <FiAlertCircle /> };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="user-management-container">
      <motion.div
        className="user-management-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <FiUsers className="header-icon" />
            <div>
              <h1>User Management</h1>
              <p>Manage users, permissions, and account status</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <FiUsers className="stat-icon" />
              <div>
                <span className="stat-number">{totalUsers}</span>
                <span className="stat-label">Total Users</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="user-management-content">
        {/* Controls Section */}
        <motion.section
          className="controls-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <FiFilter className="filter-icon" />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Users</option>
                <option value="banned">Banned Users</option>
                <option value="premium">Premium Users</option>
                <option value="store_owners">Store Owners</option>
                <option value="verified_stores">Verified Stores</option>
              </select>
            </div>
          </div>
        </motion.section>

        {/* Users Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <motion.section
            className="users-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {users.length === 0 ? (
              <div className="empty-state">
                <FiUsers className="empty-icon" />
                <h3>No users found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="users-list">
                {users.map((user, index) => {
                  const status = getStatusBadge(user);
                  const storeStatus = getStoreBadge(user.stores?.[0]);
                  
                  return (
                    <motion.div
                      key={user.id}
                      className="user-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                      <div className="user-header">
                        <div className="user-avatar">
                          {user.is_premium ? <FaCrown /> : <FiUser />}
                        </div>
                        <div className="user-basic-info">
                          <h3>{user.name || "Unnamed User"}</h3>
                          <p>{user.email}</p>
                        </div>
                        <div className="user-status">
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: `${status.color}15`, color: status.color }}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="user-details">
                        <div className="detail-item">
                          <FiPhone className="detail-icon" />
                          <span>{user.phone || "No phone"}</span>
                        </div>
                        <div className="detail-item">
                          <FiCalendar className="detail-icon" />
                          <span>Joined {formatDate(user.created_at)}</span>
                        </div>
                        {user.stores?.[0] && (
                          <div className="detail-item">
                            <FiStore className="detail-icon" />
                            <div className="store-info">
                              <span>{user.stores[0].name}</span>
                              {storeStatus && (
                                <span 
                                  className="store-badge"
                                  style={{ backgroundColor: `${storeStatus.color}15`, color: storeStatus.color }}
                                >
                                  {storeStatus.icon}
                                  {storeStatus.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="user-actions">
                        {/* Ban/Unban Action */}
                        <motion.button
                          className={`action-btn ${user.is_banned ? 'unban' : 'ban'}`}
                          onClick={() => toggleField(
                            user.id, 
                            'is_banned', 
                            !user.is_banned,
                            user.is_banned ? 'unbanned' : 'banned'
                          )}
                          disabled={actionLoading === `is_banned-${user.id}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {actionLoading === `is_banned-${user.id}` ? (
                            <div className="loading-dots"></div>
                          ) : (
                            <>
                              {user.is_banned ? <FiUserCheck /> : <FiUserX />}
                              {user.is_banned ? 'Unban User' : 'Ban User'}
                            </>
                          )}
                        </motion.button>

                        {/* Store Access Action */}
                        <motion.button
                          className={`action-btn ${user.can_create_store ? 'revoke' : 'grant'}`}
                          onClick={() => toggleField(
                            user.id, 
                            'can_create_store', 
                            !user.can_create_store,
                            user.can_create_store ? 'store access revoked from' : 'store access granted to'
                          )}
                          disabled={actionLoading === `can_create_store-${user.id}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {actionLoading === `can_create_store-${user.id}` ? (
                            <div className="loading-dots"></div>
                          ) : (
                            <>
                              < FiBriefcase/>
                              {user.can_create_store ? 'Revoke Store' : 'Grant Store'}
                            </>
                          )}
                        </motion.button>

                        {/* Premium Toggle */}
                        <motion.button
                          className={`action-btn ${user.is_premium ? 'revoke-premium' : 'grant-premium'}`}
                          onClick={() => toggleField(
                            user.id, 
                            'is_premium', 
                            !user.is_premium,
                            user.is_premium ? 'premium revoked from' : 'premium granted to'
                          )}
                          disabled={actionLoading === `is_premium-${user.id}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {actionLoading === `is_premium-${user.id}` ? (
                            <div className="loading-dots"></div>
                          ) : (
                            <>
                              <FiStar />
                              {user.is_premium ? 'Revoke Premium' : 'Grant Premium'}
                            </>
                          )}
                        </motion.button>

                        {/* Store Verification */}
                        {user.stores?.[0] && (
                          <motion.button
                            className={`action-btn ${user.stores[0].is_verified ? 'unverify-store' : 'verify-store'}`}
                            onClick={() => toggleStoreVerification(
                              user.stores[0].id, 
                              !user.stores[0].is_verified,
                              user.stores[0].name
                            )}
                            disabled={actionLoading === `store-${user.stores[0].id}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {actionLoading === `store-${user.stores[0].id}` ? (
                              <div className="loading-dots"></div>
                            ) : (
                              <>
                                {user.stores[0].is_verified ? <FiXCircle /> : <FiCheckCircle />}
                                {user.stores[0].is_verified ? 'Unverify Store' : 'Verify Store'}
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="pagination"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
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
              <span className="pagination-count">({totalUsers} total users)</span>
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
      </div>
    </div>
  );
};

export default UserManagement;