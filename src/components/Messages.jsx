import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  FaSearch, 
  FaEllipsisV, 
  FaStore, 
  FaShoppingBag, 
  FaTimes,
  FaStar,
  FaRegStar,
  FaUserCircle,
  FaCog,
  FaPlus
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import "./Messages.css";

const Messages = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userDetails, setUserDetails] = useState({});
  const [storeDetails, setStoreDetails] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showSearch, setShowSearch] = useState(false);

  const searchInputRef = useRef(null);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Fetch user details
  const fetchUserDetails = useCallback(async (userIds) => {
    const validUserIds = userIds.filter(id => id && id !== 'undefined');
    if (!validUserIds.length) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, email')
        .in('id', validUserIds);
      
      if (error) throw error;
      
      const details = {};
      data?.forEach(user => {
        if (user.id) {
          details[user.id] = {
            name: user.full_name || 'User',
            email: user.email || '',
            avatar: user.avatar_url
          };
        }
      });
      
      setUserDetails(prev => ({ ...prev, ...details }));
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  }, []);

  // Fetch store details
  const fetchStoreDetails = useCallback(async (storeIds) => {
    const validStoreIds = storeIds.filter(id => id && id !== 'undefined');
    if (!validStoreIds.length) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, owner_id, contact_email, contact_phone, location')
        .in('id', validStoreIds);
      
      if (error) throw error;
      
      const details = {};
      data?.forEach(store => {
        if (store.id) {
          details[store.id] = {
            name: store.name || `Store ${store.id.slice(-6)}`,
            owner_id: store.owner_id,
            email: store.contact_email,
            phone: store.contact_phone,
            location: store.location
          };
        }
      });
      
      setStoreDetails(prev => ({ ...prev, ...details }));
    } catch (error) {
      console.error('Error fetching store details:', error);
    }
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);

    try {
      // Get user's stores if they are a seller
      const { data: userStores, error: storesError } = await supabase
        .from("stores")
        .select("id, owner_id")
        .eq("owner_id", currentUser.id);

      if (storesError) throw storesError;

      const storeIds = userStores?.map(store => store.id) || [];
      
      // Build query based on user role
      let query = supabase
        .from("store_messages")
        .select(`
          id,
          store_id,
          user_id,
          sender_role,
          content,
          created_at,
          product_id,
          status,
          is_read,
          image_url,
          buyer_contact
        `);

      // Apply filters based on user role
      if (storeIds.length > 0) {
        query = query.or(`user_id.eq.${currentUser.id},store_id.in.(${storeIds.join(',')})`);
      } else {
        query = query.eq("user_id", currentUser.id);
      }

      query = query.order("created_at", { ascending: false });

      const { data: messagesData, error } = await query;

      if (error) throw error;

      // Get unique store IDs from messages
      const storeIdsFromMessages = [...new Set(messagesData?.map(msg => msg.store_id).filter(id => id))];
      
      // Fetch store details for these stores
      const { data: storesData, error: storesDataError } = await supabase
        .from("stores")
        .select("id, name, owner_id, contact_email, contact_phone, location")
        .in("id", storeIdsFromMessages);

      if (storesDataError) throw storesDataError;

      const storeMap = new Map(storesData?.map(store => [store.id, store]) || []);

      // Process conversations
      const convMap = new Map();
      const userIds = new Set();

      messagesData?.forEach(msg => {
        const store = storeMap.get(msg.store_id);
        if (!store) return;

        const isBuyer = msg.user_id === currentUser.id;
        const isSeller = store.owner_id === currentUser.id;
        
        if (!isBuyer && !isSeller) return;

        const otherPartyId = isBuyer ? store.owner_id : msg.user_id;
        const conversationKey = `${msg.store_id}-${msg.product_id || 'general'}`;

        if (!convMap.has(conversationKey)) {
          convMap.set(conversationKey, {
            id: conversationKey,
            store_id: msg.store_id,
            product_id: msg.product_id,
            user_id: otherPartyId,
            store_owner_id: store.owner_id,
            store_name: store.name,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: (!isBuyer && msg.sender_role === 'buyer' && !msg.is_read) || 
                         (isBuyer && msg.sender_role === 'seller' && !msg.is_read) ? 1 : 0,
            is_buyer: isBuyer,
            is_seller: isSeller,
            is_pinned: false
          });

          if (otherPartyId) userIds.add(otherPartyId);
        } else {
          const conv = convMap.get(conversationKey);
          if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
            conv.last_message = msg.content;
            conv.last_message_time = msg.created_at;
          }
          if ((!isBuyer && msg.sender_role === 'buyer' && !msg.is_read) || 
              (isBuyer && msg.sender_role === 'seller' && !msg.is_read)) {
            conv.unread_count += 1;
          }
        }
      });

      const convList = Array.from(convMap.values()).sort(
        (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
      );

      setConversations(convList);
      fetchUserDetails(Array.from(userIds));

    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fetchUserDetails]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Online status simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const randomOnline = new Set();
      conversations.forEach(conv => {
        if (Math.random() > 0.5 && conv.user_id) {
          randomOnline.add(conv.user_id);
        }
      });
      setOnlineUsers(randomOnline);
    }, 15000);

    return () => clearInterval(interval);
  }, [conversations]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.is_buyer) {
      return (
        <div className="avatar-placeholder store">
          <FaStore />
        </div>
      );
    } else {
      const userDetail = userDetails[conversation.user_id];
      if (userDetail?.avatar) {
        return <img src={userDetail.avatar} alt={userDetail.name} className="conversation-avatar" />;
      } else {
        return (
          <div className="avatar-placeholder user">
            <div className="avatar-initial">
              {userDetail?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        );
      }
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.is_buyer) {
      return conversation.store_name;
    } else {
      const userDetail = userDetails[conversation.user_id];
      return userDetail?.name || 'Customer';
    }
  };

  const parseOrderMessage = (content) => {
    const orderPatterns = [
      /(\S+@\S+) bought (\d+x .+)\. Deliver to: (.+)/,
      /(\S+@\S+) bought (\d+x .+)\.\s*Deliver to: (.+)/,
    ];

    for (const pattern of orderPatterns) {
      const match = content.match(pattern);
      if (match) {
        return {
          isOrder: true,
          email: match[1],
          product: match[2],
          address: match[3]
        };
      }
    }
    
    return { isOrder: false };
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchTerm === '' || 
      getConversationName(conv).toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'unread') return matchesSearch && conv.unread_count > 0;
    if (selectedFilter === 'pinned') return matchesSearch && conv.is_pinned;
    return matchesSearch;
  });

  const togglePinConversation = (conversationId, e) => {
    e.stopPropagation();
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, is_pinned: !conv.is_pinned }
          : conv
      )
    );
  };

  const handleNewConversation = () => {
    toast.success('New conversation feature coming soon!');
  };

  const handleSettings = () => {
    toast.success('Settings feature coming soon!');
  };

  const handleConversationClick = (conversation) => {
    // Navigate to chat screen with conversation data
    navigate('/chat', { 
      state: { 
        conversation,
        userDetails: userDetails[conversation.user_id],
        storeDetails: storeDetails[conversation.store_id]
      } 
    });
  };

  // Skeleton loading component
  const ConversationSkeleton = () => (
    <div className="conversation-skeleton">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-content">
        <div className="skeleton-line short"></div>
        <div className="skeleton-line medium"></div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="messages-container">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <div className="header-main">
              <div className="header-title">
                <h1>Messages</h1>
              </div>
              <div className="header-actions">
                <button className="icon-btn skeleton-btn"></button>
                <button className="icon-btn skeleton-btn"></button>
              </div>
            </div>
            <div className="filter-tabs-skeleton">
              <div className="skeleton-tab"></div>
              <div className="skeleton-tab"></div>
              <div className="skeleton-tab"></div>
            </div>
          </div>
          <div className="conversations-list">
            {[...Array(8)].map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <div className="header-main">
            <div className="header-title">
              <h1>Messages</h1>
              {conversations.length > 0 && (
                <span className="conversation-count">{conversations.length}</span>
              )}
            </div>
            <div className="header-actions">
              <button 
                className="icon-btn" 
                onClick={() => setShowSearch(!showSearch)}
                title="Search"
              >
                <FaSearch />
              </button>
              <button 
                className="icon-btn menu-btn"
                onClick={handleSettings}
                title="Menu"
              >
                <FaEllipsisV />
              </button>
            </div>
          </div>

          {showSearch && (
            <div className="search-container">
              <div className="search-wrapper">
                <FaSearch className="search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="filter-tabs">
            <button 
              className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-tab ${selectedFilter === 'unread' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('unread')}
            >
              Unread
            </button>
            <button 
              className={`filter-tab ${selectedFilter === 'pinned' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('pinned')}
            >
              Pinned
            </button>
          </div>
        </div>

        <div className="conversations-list">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const parsedMessage = parseOrderMessage(conversation.last_message);
              
              return (
                <motion.div
                  key={conversation.id}
                  className={`conversation-item ${conversation.is_pinned ? 'pinned' : ''}`}
                  onClick={() => handleConversationClick(conversation)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="conversation-avatar-container">
                    {getConversationAvatar(conversation)}
                    {onlineUsers.has(conversation.is_buyer ? conversation.store_owner_id : conversation.user_id) && (
                      <div className="online-indicator"></div>
                    )}
                  </div>

                  <div className="conversation-content">
                    <div className="conversation-header">
                      <h3 className="conversation-name">{getConversationName(conversation)}</h3>
                      <div className="conversation-meta">
                        <span className="time">{formatTime(conversation.last_message_time)}</span>
                        <button 
                          className={`pin-btn ${conversation.is_pinned ? 'pinned' : ''}`}
                          onClick={(e) => togglePinConversation(conversation.id, e)}
                          title={conversation.is_pinned ? "Unpin" : "Pin"}
                        >
                          {conversation.is_pinned ? <FaStar /> : <FaRegStar />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="conversation-preview">
                      <p className="last-message">
                        {parsedMessage.isOrder ? (
                          <>
                            <FaShoppingBag className="order-indicator" />
                            New order: {parsedMessage.product}
                          </>
                        ) : (
                          conversation.last_message
                        )}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="unread-badge">{conversation.unread_count}</span>
                      )}
                    </div>

                    {conversation.product_id && (
                      <div className="product-tag">
                        <FaShoppingBag />
                        <span>Product Inquiry</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <FaUserCircle />
              </div>
              <h3>No conversations</h3>
              <p>Start a conversation with a store or customer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;