// NewMessages.jsx - Complete with Proper Navigation Handling
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaSearch, FaTimes, FaComment, FaStore, FaUser,
  FaPaperPlane, FaArrowLeft, FaCheck, FaCheckDouble,
  FaRegSmile, FaImage, FaEllipsisV, FaPhone, FaVideo,
  FaInfoCircle, FaStar, FaRegStar, FaSpinner, FaReply,
  FaSignal, FaExclamationTriangle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import "./NewMessages.css";

const NewMessages = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for conversations list
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});
  const [storeInfo, setStoreInfo] = useState({});
  
  // State for messages in selected chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // State for UI
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Refs for preventing double navigation
  const isNavigatingBackRef = useRef(false);
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const hasLoadedDataRef = useRef(false);
  
  // Get theme from body or html element
  const isDarkMode = document.documentElement.classList.contains("dark") || 
                     document.body.getAttribute("data-theme") === "dark";

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event) => {
      if (showChat && isMobileView) {
        event.preventDefault();
        handleBackToList();
        // Replace current history state to prevent going back further
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state for navigation handling
    window.history.pushState(null, '', window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showChat, isMobileView]);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setShowConversationList(!selectedChat);
        setShowChat(!!selectedChat);
      } else {
        setShowConversationList(true);
        setShowChat(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedChat]);

  // Initial data fetch - only once
  useEffect(() => {
    if (!hasLoadedDataRef.current && currentUser?.id) {
      searchInputRef.current?.focus();
      fetchData();
      hasLoadedDataRef.current = true;
    }
    
    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };
    
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
      // Clean up subscription on unmount
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMessages) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isLoadingMessages]);

  // Helper function to check if a message is from current user
  const isMessageFromCurrentUser = useCallback((message) => {
    if (!currentUser || !selectedChat) return false;
    
    if (message.sender_role === 'seller') {
      return currentUser.id === storeInfo[selectedChat.store_id]?.owner_id;
    } else if (message.sender_role === 'buyer') {
      return currentUser.id === selectedChat.other_user_id;
    }
    
    return false;
  }, [currentUser, selectedChat, storeInfo]);

  // Fetch all conversations and user data
  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setIsLoading(true);
    try {
      const { data: userStores, error: storesError } = await supabase
        .from("stores")
        .select("id, name, owner_id, is_verified, seller_score, contact_phone, location")
        .eq("owner_id", currentUser.id)
        .eq("is_active", true);
      
      if (storesError) throw storesError;
      
      const userStoreIds = userStores?.map(s => s.id) || [];
      const storeMap = {};
      userStores?.forEach(store => {
        storeMap[store.id] = {
          name: store.name,
          owner_id: store.owner_id,
          is_verified: store.is_verified,
          seller_score: store.seller_score,
          phone: store.contact_phone,
          location: store.location
        };
      });
      setStoreInfo(storeMap);
      
      let messagesQuery = supabase
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
          status,
          receiver_id
        `);
      
      if (userStoreIds.length > 0) {
        messagesQuery = messagesQuery.or(`user_id.eq.${currentUser.id},store_id.in.(${userStoreIds.join(",")})`);
      } else {
        messagesQuery = messagesQuery.eq("user_id", currentUser.id);
      }
      
      const { data: allMessages, error: messagesError } = await messagesQuery.order("created_at", { ascending: false });
      
      if (messagesError) throw messagesError;
      
      if (!allMessages || allMessages.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }
      
      const userIds = [...new Set(allMessages.map(m => m.user_id).filter(id => id !== currentUser.id))];
      const storeIds = [...new Set(allMessages.map(m => m.store_id))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("users")
          .select("id, full_name, avatar_url, email, phone, name")
          .in("id", userIds);
        
        const profileMap = {};
        profiles?.forEach(p => {
          profileMap[p.id] = {
            name: p.full_name || p.name || "Customer",
            avatar: p.avatar_url,
            email: p.email,
            phone: p.phone
          };
        });
        setUserProfiles(profileMap);
      }
      
      const missingStoreIds = storeIds.filter(id => !storeMap[id]);
      if (missingStoreIds.length > 0) {
        const { data: additionalStores } = await supabase
          .from("stores")
          .select("id, name, owner_id, is_verified, seller_score, contact_phone, location")
          .in("id", missingStoreIds);
        
        additionalStores?.forEach(store => {
          storeMap[store.id] = {
            name: store.name,
            owner_id: store.owner_id,
            is_verified: store.is_verified,
            seller_score: store.seller_score,
            phone: store.contact_phone,
            location: store.location
          };
        });
        setStoreInfo(prev => ({ ...prev, ...storeMap }));
      }
      
      const conversationMap = new Map();
      
      allMessages.forEach(msg => {
        const isBuyer = msg.user_id === currentUser.id;
        const storeId = msg.store_id;
        const store = storeMap[storeId] || { name: "Store", owner_id: null };
        const otherUserId = isBuyer ? store.owner_id : msg.user_id;
        const key = `${storeId}-${msg.product_id || 'general'}`;
        
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            id: key,
            store_id: storeId,
            product_id: msg.product_id,
            other_user_id: otherUserId,
            store_name: store.name,
            store_verified: store.is_verified,
            seller_score: store.seller_score,
            store_phone: store.phone,
            store_location: store.location,
            last_message: msg.content?.substring(0, 60) || "📎 Attachment",
            last_time: msg.created_at,
            unread: 0,
            is_buyer: isBuyer,
            last_message_status: msg.status
          });
        }
        
        const conv = conversationMap.get(key);
        
        if (new Date(msg.created_at) > new Date(conv.last_time)) {
          conv.last_message = msg.content?.substring(0, 60) || "📎 Attachment";
          conv.last_time = msg.created_at;
          conv.last_message_status = msg.status;
        }
        
        const isFromOther = isBuyer ? msg.sender_role === "seller" : msg.sender_role === "buyer";
        if (isFromOther && !msg.is_read) {
          conv.unread += 1;
        }
      });
      
      const sorted = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.last_time) - new Date(a.last_time));
      
      setConversations(sorted);
      setIsInitialLoad(false);
      
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);
  
  // Fetch messages for selected conversation - only when chat is selected
  const fetchMessages = useCallback(async (conversation) => {
    if (!conversation) return;
    
    setIsLoadingMessages(true);
    try {
      let query = supabase
        .from("store_messages")
        .select("*")
        .eq("store_id", conversation.store_id)
        .order("created_at", { ascending: true });
      
      if (conversation.product_id) {
        query = query.eq("product_id", conversation.product_id);
      } else {
        query = query.is("product_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setMessages(data || []);
      
      const unreadMsgs = data?.filter(msg => 
        !msg.is_read && 
        ((msg.sender_role === 'buyer' && currentUser.id === storeInfo[conversation.store_id]?.owner_id) ||
         (msg.sender_role === 'seller' && currentUser.id === conversation.other_user_id))
      );
      
      if (unreadMsgs?.length > 0) {
        const { error: updateError } = await supabase
          .from("store_messages")
          .update({ is_read: true, status: 'read' })
          .in("id", unreadMsgs.map(m => m.id));
        
        if (!updateError) {
          setConversations(prev => prev.map(c => 
            c.id === conversation.id ? { ...c, unread: 0 } : c
          ));
        }
      }
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUser, storeInfo]);
  
  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isSending) return;
    
    setIsSending(true);
    try {
      const isSeller = currentUser.id === storeInfo[selectedChat.store_id]?.owner_id;
      const senderRole = isSeller ? 'seller' : 'buyer';
      const receiverId = isSeller ? selectedChat.other_user_id : storeInfo[selectedChat.store_id]?.owner_id;
      
      let messageContent = newMessage.trim();
      if (replyTo) {
        messageContent = `📎 Replying to: "${replyTo.content.substring(0, 50)}"\n\n${messageContent}`;
      }
      
      const messageData = {
        store_id: selectedChat.store_id,
        user_id: isSeller ? selectedChat.other_user_id : currentUser.id,
        sender_role: senderRole,
        content: messageContent,
        product_id: selectedChat.product_id || null,
        status: 'sent',
        is_read: false,
        receiver_id: receiverId
      };
      
      const { data, error } = await supabase
        .from("store_messages")
        .insert([messageData])
        .select();
      
      if (error) throw error;
      
      if (data?.[0]) {
        setMessages(prev => [...prev, data[0]]);
        setNewMessage("");
        setReplyTo(null);
        
        setConversations(prev => prev.map(c => 
          c.id === selectedChat.id 
            ? { ...c, last_message: newMessage.trim(), last_time: new Date().toISOString(), unread: 0 }
            : c
        ).sort((a, b) => new Date(b.last_time) - new Date(a.last_time)));
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };
  
  // Setup real-time subscription with retry logic
  const setupRealtimeSubscription = useCallback(() => {
    if (!selectedChat?.store_id) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    try {
      const channel = supabase
        .channel(`messages:${selectedChat.store_id}`, {
          config: {
            broadcast: { ack: true },
            presence: { key: currentUser?.id }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'store_messages',
          filter: `store_id=eq.${selectedChat.store_id}`
        }, (payload) => {
          fetchMessages(selectedChat);
          setConversations(prev => prev.map(c => 
            c.id === selectedChat.id 
              ? { ...c, last_message: payload.new.content?.substring(0, 60), last_time: payload.new.created_at }
              : c
          ).sort((a, b) => new Date(b.last_time) - new Date(a.last_time)));
          
          if (payload.new.sender_role !== (currentUser.id === storeInfo[selectedChat.store_id]?.owner_id ? 'seller' : 'buyer')) {
            toast.success(`New message from ${getChatName(selectedChat)}`, {
              icon: '💬',
              duration: 3000
            });
          }
        });
      
      // Subscribe with error handling
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          if (reconnectAttempts > 0) {
            setReconnectAttempts(0);
            toast.success("Reconnected to chat", { icon: '🔌', duration: 2000 });
          }
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.warn('Channel error, attempting to reconnect...');
          
          // Attempt reconnection with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            setupRealtimeSubscription();
          }, delay);
        }
      });
      
      subscriptionRef.current = channel;
      
    } catch (error) {
      console.error('Error setting up subscription:', error);
      setIsConnected(false);
      
      // Retry after delay
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        setupRealtimeSubscription();
      }, delay);
    }
  }, [selectedChat, fetchMessages, currentUser, storeInfo, reconnectAttempts]);
  
  // Setup real-time subscription when selected chat changes
  useEffect(() => {
    if (selectedChat?.store_id) {
      setupRealtimeSubscription();
    }
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [selectedChat, setupRealtimeSubscription]);
  
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleEmojiSelect = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };
  
  const handleReply = (message) => {
    setReplyTo(message);
    textareaRef.current?.focus();
  };
  
  const handleCall = () => {
    const phone = selectedChat.is_buyer 
      ? storeInfo[selectedChat.store_id]?.phone 
      : userProfiles[selectedChat.other_user_id]?.phone;
    
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error("Phone number not available");
    }
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = diff / (1000 * 60 * 60 * 24);
    
    if (days < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };
  
  const getChatName = (conversation) => {
    if (conversation.is_buyer) {
      return conversation.store_name;
    } else {
      return userProfiles[conversation.other_user_id]?.name || "Customer";
    }
  };
  
  const getChatAvatar = (conversation) => {
    if (conversation.is_buyer) {
      return null;
    } else {
      return userProfiles[conversation.other_user_id]?.avatar;
    }
  };
  
  const getMessageStatusIcon = (message) => {
    if (!selectedChat) return null;
    
    const isUserMessage = isMessageFromCurrentUser(message);
    
    if (!isUserMessage) return null;
    
    if (message.is_read) {
      return <FaCheckDouble className="status-icon read" title="Read" />;
    } else if (message.status === 'delivered') {
      return <FaCheckDouble className="status-icon delivered" title="Delivered" />;
    } else {
      return <FaCheck className="status-icon sent" title="Sent" />;
    }
  };
  
  const filteredConversations = conversations.filter(conv => 
    getChatName(conv).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelectChat = (conversation) => {
    // Prevent double navigation
    if (isNavigatingBackRef.current) return;
    
    setSelectedChat(conversation);
    fetchMessages(conversation);
    if (isMobileView) {
      setShowConversationList(false);
      setShowChat(true);
      // Push a new state to handle back button
      window.history.pushState(null, '', window.location.pathname);
    }
  };
  
  const handleBackToList = () => {
    // Prevent multiple back navigations
    if (isNavigatingBackRef.current) return;
    
    isNavigatingBackRef.current = true;
    
    setShowConversationList(true);
    setShowChat(false);
    setSelectedChat(null);
    setMessages([]);
    setReplyTo(null);
    
    // Reset navigation flag after animation
    setTimeout(() => {
      isNavigatingBackRef.current = false;
    }, 500);
  };
  
  // Connection Status Indicator
  const ConnectionStatus = () => (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? (
        <>
          <FaSignal className="status-icon" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <FaExclamationTriangle className="status-icon" />
          <span>Reconnecting...</span>
        </>
      )}
    </div>
  );
  
  // Conversation List Component
  const ConversationList = () => (
    <div className={`conversation-list ${!showConversationList && isMobileView ? 'hidden' : ''}`}>
      <div className="list-header">
        <h2>Messages</h2>
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-btn">
              <FaTimes />
            </button>
          )}
        </div>
      </div>
      
      <div className="conversations-container">
        {isLoading && isInitialLoad ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="conversation-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">
            <FaComment className="empty-icon" />
            <p>No messages yet</p>
            <p className="subtext">Start a conversation with a seller</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const avatar = getChatAvatar(conv);
            const name = getChatName(conv);
            
            return (
              <div
                key={conv.id}
                className={`conversation-item ${selectedChat?.id === conv.id ? 'active' : ''} ${conv.unread > 0 ? 'unread' : ''}`}
                onClick={() => handleSelectChat(conv)}
              >
                <div className="avatar">
                  {conv.is_buyer ? (
                    <FaStore />
                  ) : avatar ? (
                    <img src={avatar} alt={name} className="avatar-img" />
                  ) : (
                    <div className="avatar-initial">{name[0]?.toUpperCase() || "U"}</div>
                  )}
                </div>
                <div className="conversation-info">
                  <div className="top-row">
                    <span className="name">
                      {name}
                      {conv.store_verified && <FaCheck className="verified-badge" />}
                    </span>
                    <span className="time">{formatTime(conv.last_time)}</span>
                  </div>
                  <div className="bottom-row">
                    <p className="preview">{conv.last_message}</p>
                    {conv.unread > 0 && (
                      <span className="unread-badge">{conv.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
  
  // Chat Area Component
  const ChatArea = () => (
    <div className={`chat-area ${!showChat && isMobileView ? 'hidden' : ''}`}>
      {selectedChat ? (
        <>
          <div className="chat-header">
            <button 
              className="mobile-back" 
              onClick={handleBackToList}
              style={{ display: isMobileView ? 'block' : 'none' }}
            >
              <FaArrowLeft />
            </button>
            <div className="chat-info">
              <div className="avatar small">
                {selectedChat.is_buyer ? (
                  <FaStore />
                ) : getChatAvatar(selectedChat) ? (
                  <img src={getChatAvatar(selectedChat)} alt={getChatName(selectedChat)} className="avatar-img" />
                ) : (
                  <div className="avatar-initial">{getChatName(selectedChat)[0]?.toUpperCase() || "U"}</div>
                )}
              </div>
              <div>
                <h3>{getChatName(selectedChat)}</h3>
                <p className="status">
                  {selectedChat.seller_score > 0 && (
                    <>
                      <FaStar className="star" /> {selectedChat.seller_score.toFixed(1)}
                    </>
                  )}
                  {selectedChat.store_phone && <span className="phone-indicator">• 📞 Available</span>}
                </p>
              </div>
            </div>
            <div className="chat-actions">
              <button className="action-btn" title="Call" onClick={handleCall}>
                <FaPhone />
              </button>
              <button className="action-btn" title="Video Call" onClick={() => toast.info("Video call coming soon")}>
                <FaVideo />
              </button>
              <button className="action-btn" title="Info" onClick={() => {
                if (selectedChat.is_buyer) {
                  navigate(`/store/${selectedChat.store_id}`);
                } else {
                  navigate(`/profile/${selectedChat.other_user_id}`);
                }
              }}>
                <FaInfoCircle />
              </button>
            </div>
            <ConnectionStatus />
          </div>
          
          <div className="messages-container">
            {isLoadingMessages ? (
              <div className="loading-messages">
                <FaSpinner className="spinner" />
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-messages">
                <FaComment className="empty-icon" />
                <p>No messages yet</p>
                <p className="subtext">Start the conversation!</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, idx) => {
                  const isCurrentUser = isMessageFromCurrentUser(msg);
                  const showDate = idx === 0 || 
                    new Date(msg.created_at).toDateString() !== 
                    new Date(messages[idx - 1].created_at).toDateString();
                  
                  const isReply = msg.content?.startsWith('📎 Replying to:');
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="date-divider">
                          <span>{new Date(msg.created_at).toLocaleDateString(undefined, { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                      )}
                      <div className={`message-wrapper ${isCurrentUser ? 'sent' : 'received'}`}>
                        <div className={`message-bubble ${isCurrentUser ? 'sent' : 'received'}`}>
                          {isReply && (
                            <div className="reply-preview">
                              <FaReply className="reply-icon" />
                              <span className="reply-text">{msg.content.split('\n')[0].replace('📎 Replying to: ', '')}</span>
                            </div>
                          )}
                          <div className="message-content">
                            <p>{isReply ? msg.content.split('\n\n').slice(1).join('\n\n') : msg.content}</p>
                          </div>
                          <div className="message-footer">
                            <span className="message-time">{formatMessageTime(msg.created_at)}</span>
                            {getMessageStatusIcon(msg)}
                          </div>
                        </div>
                        {!isCurrentUser && (
                          <button className="reply-button" onClick={() => handleReply(msg)} title="Reply">
                            <FaReply />
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {replyTo && (
            <div className="reply-bar">
              <div className="reply-content">
                <FaReply className="reply-icon" />
                <div className="reply-text-content">
                  <span className="reply-label">Replying to</span>
                  <p className="reply-message">{replyTo.content.substring(0, 60)}...</p>
                </div>
                <button className="cancel-reply" onClick={() => setReplyTo(null)}>
                  <FaTimes />
                </button>
              </div>
            </div>
          )}
          
          <div className="message-input-area">
            <button 
              className="attach-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji"
            >
              <FaRegSmile />
            </button>
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows="1"
              />
            </div>
            <button 
              className="send-btn"
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
            </button>
          </div>
          
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                className="emoji-picker-container"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <EmojiPicker 
                  onEmojiClick={handleEmojiSelect}
                  width="100%"
                  height="350px"
                  searchPlaceholder="Search emojis..."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="no-chat-selected">
          <FaComment className="empty-icon" />
          <h3>Select a conversation</h3>
          <p>Choose a chat to start messaging</p>
        </div>
      )}
    </div>
  );
  
  return (
    <div className={`new-messages-app ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="messages-layout">
        <ConversationList />
        <ChatArea />
      </div>
    </div>
  );
};

export default NewMessages;