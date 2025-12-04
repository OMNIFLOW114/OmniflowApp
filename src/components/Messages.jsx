import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FaSearch, FaTimes, FaStar, FaRegStar,
  FaCircle, FaRegCircle, FaComment,FaStore
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import "./Messages.css";

const Messages = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({});
  const [storeDetails, setStoreDetails] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("all");

  const searchInputRef = useRef(null);

  // Auto-detect dark mode
  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => { 
    searchInputRef.current?.focus(); 
  }, []);

  // ────── FETCHERS ──────
  const fetchUserDetails = useCallback(async (userIds) => {
    if (!userIds?.length) return {};
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (error) throw error;

      const userMap = {};
      data?.forEach(user => {
        userMap[user.id] = { 
          name: user.full_name || "Customer", 
          avatar: user.avatar_url 
        };
      });
      return userMap;
    } catch (error) {
      console.error("Error fetching user details:", error);
      return {};
    }
  }, []);

  const fetchStoreDetails = useCallback(async (storeIds) => {
    if (!storeIds?.length) return {};
    try {
      const { data, error } = await supabase
        .from("stores")
        .select(`
          id, 
          name, 
          owner_id,
          is_verified,
          is_active,
          verified,
          verified_at,
          seller_score,
          contact_phone,
          location
        `)
        .in("id", storeIds)
        .eq("is_active", true);

      if (error) throw error;

      const storeMap = {};
      data?.forEach(store => {
        storeMap[store.id] = {
          name: store.name || "Store",
          owner_id: store.owner_id,
          is_verified: store.is_verified || store.verified || false,
          verified_at: store.verified_at,
          seller_score: store.seller_score || 0,
          contact_phone: store.contact_phone,
          location: store.location
        };
      });
      return storeMap;
    } catch (error) {
      console.error("Error fetching store details:", error);
      return {};
    }
  }, []);

  // ────── MAIN FETCH ──────
  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Get stores owned by current user
      const { data: myStores, error: storesError } = await supabase
        .from("stores")
        .select("id, owner_id, name")
        .eq("owner_id", currentUser.id)
        .eq("is_active", true);

      if (storesError) throw storesError;

      const myStoreIds = myStores?.map(s => s.id) || [];
      const myStoreDetails = {};
      myStores?.forEach(store => {
        myStoreDetails[store.id] = {
          name: store.name || "My Store",
          owner_id: store.owner_id
        };
      });

      // Step 2: Get all messages where user is involved
      const { data: messages, error: messagesError } = await supabase
        .from("store_messages")
        .select(`
          id, 
          store_id, 
          user_id, 
          sender_role, 
          content, 
          created_at, 
          product_id, 
          is_read,
          status
        `)
        .or(`user_id.eq.${currentUser.id},store_id.in.(${myStoreIds.join(",")})`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Step 3: Collect unique user and store IDs
      const storeIds = [...new Set(messages.map(m => m.store_id).filter(Boolean))];
      const userIds = [...new Set(
        messages
          .map(m => m.user_id)
          .filter(id => id && id !== currentUser.id)
      )];

      // Step 4: Fetch details in parallel
      const [fetchedUserDetails, fetchedStoreDetails] = await Promise.all([
        fetchUserDetails(userIds),
        fetchStoreDetails(storeIds)
      ]);

      // Merge store details (my stores + fetched stores)
      const allStoreDetails = { ...myStoreDetails, ...fetchedStoreDetails };
      setStoreDetails(allStoreDetails);
      setUserDetails(fetchedUserDetails);

      // Step 5: Group messages by conversation
      const conversationMap = new Map();

      messages.forEach(message => {
        const isBuyer = message.user_id === currentUser.id;
        const storeId = message.store_id;
        const productId = message.product_id || null;
        
        // Create unique conversation key
        const conversationKey = productId 
          ? `${storeId}-${productId}`
          : `${storeId}-general`;

        const store = allStoreDetails[storeId] || { name: "Loading Store...", owner_id: null };
        const otherUserId = isBuyer ? store.owner_id : message.user_id;

        if (!conversationMap.has(conversationKey)) {
          conversationMap.set(conversationKey, {
            id: conversationKey,
            store_id: storeId,
            product_id: productId,
            user_id: otherUserId || message.user_id,
            store_owner_id: store.owner_id,
            store_name: store.name,
            last_message: message.content?.substring(0, 100) || "Photo",
            last_message_time: message.created_at,
            unread_count: 0,
            is_buyer: isBuyer,
            is_pinned: false,
            is_read: message.is_read
          });
        }

        const conversation = conversationMap.get(conversationKey);
        
        // Update with latest message
        if (new Date(message.created_at) > new Date(conversation.last_message_time)) {
          conversation.last_message = message.content?.substring(0, 100) || "Photo";
          conversation.last_message_time = message.created_at;
        }

        // Count unread messages
        const isFromOther = isBuyer 
          ? message.sender_role === "seller"
          : message.sender_role === "buyer";

        if (isFromOther && !message.is_read) {
          conversation.unread_count += 1;
        }
      });

      // Step 6: Convert to array and sort by last message time
      const sortedConversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

      setConversations(sortedConversations);

    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load chats");
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fetchUserDetails, fetchStoreDetails]);

  useEffect(() => { 
    fetchConversations();
  }, [fetchConversations]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    
    const messageTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - messageTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 2) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return messageTime.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getName = (conversation) => {
    if (conversation.is_buyer) {
      return conversation.store_name || "Store";
    } else {
      return userDetails[conversation.user_id]?.name || "Customer";
    }
  };

  const getAvatar = (conversation) => {
    if (conversation.is_buyer) {
      return null; // Will use store icon
    } else {
      return userDetails[conversation.user_id]?.avatar;
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getName(conv).toLowerCase();
    const message = conv.last_message?.toLowerCase() || "";
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = !searchTerm || 
      name.includes(searchLower) || 
      message.includes(searchLower);
    
    if (selectedFilter === "unread") {
      return matchesSearch && conv.unread_count > 0;
    }
    
    return matchesSearch;
  });

  const togglePin = (id, e) => {
    e.stopPropagation();
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, is_pinned: !conv.is_pinned } : conv
    ));
  };

  const openChat = (conversation) => {
    navigate("/chat", {
      state: {
        conversation: conversation,
        userDetails: userDetails[conversation.user_id],
        storeDetails: storeDetails[conversation.store_id],
        fromMessages: true
      },
    });
  };

  const markAllRead = () => {
    setConversations(prev => prev.map(conv => ({ 
      ...conv, 
      unread_count: 0 
    })));
    toast.success("All messages marked as read");
  };

  // ────── MEMOIZED CHAT ITEM ──────
  const ChatItem = memo(({ conversation }) => {
    const name = getName(conversation);
    const avatar = getAvatar(conversation);
    const isOnline = Math.random() > 0.5;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`conversation ${conversation.is_pinned ? "pinned" : ""} ${conversation.unread_count > 0 ? "unread" : ""}`}
        onClick={() => openChat(conversation)}
      >
        <div className="avatar-wrapper">
          {conversation.is_buyer ? (
            <div className="avatar store">
              <FaStore />
            </div>
          ) : avatar ? (
            <img src={avatar} alt={name} className="avatar" />
          ) : (
            <div className="avatar user">
              <div className="avatar-initial">
                {name[0]?.toUpperCase() || "U"}
              </div>
            </div>
          )}
          {isOnline && <div className="online-dot" />}
        </div>

        <div className="conversation-body">
          <div className="conversation-top">
            <h3>{name}</h3>
            <div className="conversation-meta">
              <span className="time">{formatTime(conversation.last_message_time)}</span>
              <button 
                onClick={(e) => togglePin(conversation.id, e)} 
                className="pin-btn"
              >
                {conversation.is_pinned ? (
                  <FaStar color="#f59e0b" />
                ) : (
                  <FaRegStar />
                )}
              </button>
            </div>
          </div>
          
          <div className="conversation-preview">
            <p className="message-preview">
              {conversation.last_message || "No messages"}
            </p>
            {conversation.unread_count > 0 && (
              <span className="unread-badge">
                {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  });

  const SkeletonItem = () => (
    <div className="conversation skeleton">
      <div className="avatar skeleton-avatar" />
      <div className="conversation-body">
        <div className="conversation-top">
          <div className="skeleton-line short" />
          <div className="skeleton-line tiny" />
        </div>
        <div className="conversation-preview">
          <div className="skeleton-line long" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`messages-page ${isDark ? "dark" : ""}`}>
      <div className="messages-container">
        {/* Minimal Header with only search */}
        <header className="messages-header">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")} 
                className="clear-search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filter buttons - minimal, next to search */}
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${selectedFilter === "all" ? "active" : ""}`}
              onClick={() => setSelectedFilter("all")}
            >
              <FaRegCircle /> All
            </button>
            <button 
              className={`filter-btn ${selectedFilter === "unread" ? "active" : ""}`}
              onClick={() => setSelectedFilter("unread")}
            >
              <FaCircle /> Unread
            </button>
          </div>
        </header>

        {/* Conversation List */}
        <main className="conversations-list">
          {isLoading ? (
            [...Array(8)].map((_, index) => <SkeletonItem key={index} />)
          ) : filteredConversations.length > 0 ? (
            <AnimatePresence>
              {filteredConversations.map(conversation => (
                <ChatItem key={conversation.id} conversation={conversation} />
              ))}
            </AnimatePresence>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <FaComment />
              </div>
              <h3>No conversations yet</h3>
              <p className="empty-text">
                {searchTerm ? "No chats match your search" : "Start a conversation with a seller!"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Messages;