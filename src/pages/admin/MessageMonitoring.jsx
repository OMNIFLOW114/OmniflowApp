import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiFilter, 
  FiMessageSquare, 
  FiUser, 
  FiBriefcase, 
  FiCalendar,
  FiEye,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw
} from 'react-icons/fi';
import { FaCrown, FaStore, FaUser, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import './MessageMonitoring.css';

const MESSAGE_TYPES = [
  { key: 'all', label: 'All Messages', icon: <FiMessageSquare /> },
  { key: 'owner', label: 'Store Owners', icon: <FaStore /> },
  { key: 'customer', label: 'Customers', icon: <FaUser /> },
  { key: 'flagged', label: 'Flagged', icon: <FiAlertTriangle /> }
];

const MessageMonitoring = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const MESSAGES_PER_PAGE = 15;

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('store_messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMessages(data || []);
      setFilteredMessages(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    let filtered = messages;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(msg =>
        msg.content?.toLowerCase().includes(search.toLowerCase()) ||
        msg.store_id?.toLowerCase().includes(search.toLowerCase()) ||
        msg.sender_role?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply type filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'flagged') {
        filtered = filtered.filter(msg => msg.is_flagged);
      } else {
        filtered = filtered.filter(msg => msg.sender_role === activeFilter);
      }
    }

    setFilteredMessages(filtered);
    setPage(1); // Reset to first page when filters change
  }, [search, activeFilter, messages]);

  const paginatedMessages = filteredMessages.slice(
    (page - 1) * MESSAGES_PER_PAGE,
    page * MESSAGES_PER_PAGE
  );

  const totalPages = Math.ceil(filteredMessages.length / MESSAGES_PER_PAGE);

  const toggleFlag = async (messageId, currentFlag) => {
    setActionLoading(`flag-${messageId}`);
    try {
      const { error } = await supabase
        .from('store_messages')
        .update({ is_flagged: !currentFlag })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, is_flagged: !currentFlag } : msg
        )
      );

      toast.success(!currentFlag ? 'Message flagged' : 'Flag removed');
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast.error('Failed to update message');
    }
    setActionLoading(null);
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    setActionLoading(`delete-${messageId}`);
    try {
      const { error } = await supabase
        .from('store_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
    setActionLoading(null);
  };

  const getSenderIcon = (senderRole) => {
    switch (senderRole) {
      case 'owner':
        return <FaStore />;
      case 'customer':
        return <FaUser />;
      default:
        return <FiUser />;
    }
  };

  const getSenderColor = (senderRole) => {
    switch (senderRole) {
      case 'owner':
        return 'var(--warning-color)';
      case 'customer':
        return 'var(--accent-primary)';
      default:
        return 'var(--text-muted)';
    }
  };

  const getSenderLabel = (senderRole) => {
    switch (senderRole) {
      case 'owner':
        return 'Store Owner';
      case 'customer':
        return 'Customer';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="message-monitoring-loading">
        <div className="loading-spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="message-monitoring-container">
      <motion.div
        className="message-monitoring-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <FiMessageSquare className="header-icon" />
            <div>
              <h1>Message Monitoring</h1>
              <p>Monitor and moderate user conversations and store communications</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <FiMessageSquare className="stat-icon" />
              <div>
                <span className="stat-number">{totalCount}</span>
                <span className="stat-label">Total Messages</span>
              </div>
            </div>
            <div className="stat-card">
              <FiAlertTriangle className="stat-icon" />
              <div>
                <span className="stat-number">{messages.filter(m => m.is_flagged).length}</span>
                <span className="stat-label">Flagged</span>
              </div>
            </div>
            <div className="stat-card">
              <FaStore className="stat-icon" />
              <div>
                <span className="stat-number">{messages.filter(m => m.sender_role === 'owner').length}</span>
                <span className="stat-label">From Owners</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="message-monitoring-content">
        {/* Filters Section */}
        <motion.section
          className="filters-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="filter-controls">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search messages by content, store ID, or sender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="filter-buttons">
              {MESSAGE_TYPES.map(type => (
                <motion.button
                  key={type.key}
                  className={`filter-btn ${activeFilter === type.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(type.key)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {type.icon}
                  {type.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Messages Section */}
        <motion.section
          className="messages-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="section-header">
            <h2>
              {MESSAGE_TYPES.find(t => t.key === activeFilter)?.label}
              <span className="message-count">({filteredMessages.length} messages)</span>
            </h2>
            <motion.button
              className="refresh-btn"
              onClick={fetchMessages}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiRefreshCw />
              Refresh
            </motion.button>
          </div>

          {filteredMessages.length === 0 ? (
            <div className="empty-state">
              <FiMessageSquare className="empty-icon" />
              <h3>No messages found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
              <div className="messages-list">
                {paginatedMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    className={`message-card ${message.sender_role} ${message.is_flagged ? 'flagged' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <div className="message-header">
                      <div 
                        className="sender-avatar"
                        style={{ backgroundColor: `${getSenderColor(message.sender_role)}15`, color: getSenderColor(message.sender_role) }}
                      >
                        {getSenderIcon(message.sender_role)}
                      </div>
                      <div className="message-info">
                        <div className="sender-details">
                          <span className="sender-role">{getSenderLabel(message.sender_role)}</span>
                          <span className="store-id">Store: {message.store_id}</span>
                        </div>
                        <div className="message-time">
                          <FiCalendar className="time-icon" />
                          <span className="time-ago">{getTimeAgo(message.created_at)}</span>
                          <span className="full-time">{formatDate(message.created_at)}</span>
                        </div>
                      </div>
                      <div className="message-actions">
                        <motion.button
                          className={`flag-btn ${message.is_flagged ? 'flagged' : ''}`}
                          onClick={() => toggleFlag(message.id, message.is_flagged)}
                          disabled={actionLoading === `flag-${message.id}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={message.is_flagged ? 'Remove flag' : 'Flag message'}
                        >
                          {actionLoading === `flag-${message.id}` ? (
                            <div className="loading-dots"></div>
                          ) : (
                            <>
                              {message.is_flagged ? <FiCheckCircle /> : <FiAlertTriangle />}
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          className="view-btn"
                          onClick={() => setSelectedMessage(message)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="View details"
                        >
                          <FiEye />
                        </motion.button>
                        <motion.button
                          className="delete-btn"
                          onClick={() => deleteMessage(message.id)}
                          disabled={actionLoading === `delete-${message.id}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Delete message"
                        >
                          {actionLoading === `delete-${message.id}` ? (
                            <div className="loading-dots"></div>
                          ) : (
                            <FiTrash2 />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    <div className="message-content">
                      <p>{message.content}</p>
                    </div>

                    {message.is_flagged && (
                      <div className="flagged-indicator">
                        <FiAlertTriangle />
                        <span>This message has been flagged for review</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

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
                    <span className="pagination-count">({filteredMessages.length} total messages)</span>
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
      </div>

      {/* Message Detail Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              className="message-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Message Details</h3>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedMessage(null)}
                >
                  <FiTrash2 />
                </button>
              </div>

              <div className="modal-content">
                <div className="message-detail-section">
                  <h4>Sender Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Sender Role:</strong>
                      <span className={`role-badge ${selectedMessage.sender_role}`}>
                        {getSenderIcon(selectedMessage.sender_role)}
                        {getSenderLabel(selectedMessage.sender_role)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <strong>Store ID:</strong>
                      <span>{selectedMessage.store_id}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Message ID:</strong>
                      <span>{selectedMessage.id}</span>
                    </div>
                  </div>
                </div>

                <div className="message-detail-section">
                  <h4>Message Content</h4>
                  <div className="message-content-detail">
                    <p>{selectedMessage.content}</p>
                  </div>
                </div>

                <div className="message-detail-section">
                  <h4>Timestamps</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Created:</strong>
                      <span>{formatDate(selectedMessage.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Last Updated:</strong>
                      <span>{formatDate(selectedMessage.updated_at || selectedMessage.created_at)}</span>
                    </div>
                  </div>
                </div>

                {selectedMessage.is_flagged && (
                  <div className="message-detail-section">
                    <div className="flagged-warning">
                      <FiAlertTriangle className="warning-icon" />
                      <div>
                        <strong>This message has been flagged</strong>
                        <p>This message has been marked for review by moderators</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <motion.button
                  className={`flag-action-btn ${selectedMessage.is_flagged ? 'unflag' : 'flag'}`}
                  onClick={() => {
                    toggleFlag(selectedMessage.id, selectedMessage.is_flagged);
                    setSelectedMessage(null);
                  }}
                  disabled={actionLoading === `flag-${selectedMessage.id}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {actionLoading === `flag-${selectedMessage.id}` ? (
                    <div className="loading-dots"></div>
                  ) : (
                    <>
                      {selectedMessage.is_flagged ? <FiCheckCircle /> : <FiAlertTriangle />}
                      {selectedMessage.is_flagged ? 'Remove Flag' : 'Flag Message'}
                    </>
                  )}
                </motion.button>
                <motion.button
                  className="delete-action-btn"
                  onClick={() => {
                    deleteMessage(selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  disabled={actionLoading === `delete-${selectedMessage.id}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {actionLoading === `delete-${selectedMessage.id}` ? (
                    <div className="loading-dots"></div>
                  ) : (
                    <>
                      <FiTrash2 />
                      Delete Message
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageMonitoring;