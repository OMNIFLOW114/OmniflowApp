import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  FaPaperPlane, FaUserCircle, FaSmile, FaSearch,
  FaEllipsisV, FaPhone, FaVideo, FaInfoCircle,
  FaCheck, FaCheckDouble, FaClock, FaArrowLeft,
  FaImage, FaStore
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-hot-toast";
import "./Messages.css";

const Messages = () => {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeConversation, setActiveConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [profilePictures, setProfilePictures] = useState({});
  const [storeContacts, setStoreContacts] = useState({});
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fixed: Fetch profile pictures with validation
  const fetchProfilePictures = useCallback(async (userIds) => {
    // Filter out undefined, null, or invalid UUIDs
    const validUserIds = userIds.filter(id => 
      id && typeof id === 'string' && id.length > 10 && id !== 'undefined'
    );
    
    if (!validUserIds.length) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, profile_picture')
        .in('id', validUserIds);
      
      if (error) throw error;
      
      const pictures = {};
      data?.forEach(profile => {
        if (profile.profile_picture) {
          pictures[profile.id] = profile.profile_picture;
        }
      });
      
      setProfilePictures(prev => ({ ...prev, ...pictures }));
    } catch (error) {
      console.error('Error fetching profile pictures:', error);
    }
  }, []);

  // Fixed: Fetch store contacts with validation
  const fetchStoreContacts = useCallback(async (storeIds) => {
    // Filter out undefined, null, or invalid UUIDs
    const validStoreIds = storeIds.filter(id => 
      id && typeof id === 'string' && id.length > 10 && id !== 'undefined'
    );
    
    if (!validStoreIds.length) return;
    
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, contact_phone, owner_id')
        .in('id', validStoreIds);
      
      if (error) throw error;
      
      const contacts = {};
      data?.forEach(store => {
        if (store.id) {
          contacts[store.id] = {
            contact_number: store.contact_number,
            owner_id: store.owner_id
          };
        }
      });
      
      setStoreContacts(prev => ({ ...prev, ...contacts }));
    } catch (error) {
      console.error('Error fetching store contacts:', error);
    }
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const { data: userStores, error: storesError } = await supabase
        .from("stores")
        .select("id, name, owner_id, contact_phone")
        .eq("owner_id", currentUser.id);

      if (storesError) throw storesError;

      const storeIds = userStores?.map(store => store.id) || [];
      
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
          stores!store_messages_store_id_fkey (
            id, 
            name, 
            owner_id,
            contact_phone
          )
        `)
        .order("created_at", { ascending: false });

      if (storeIds.length > 0) {
        query = query.or(`store_id.in.(${storeIds.join(',')}),user_id.eq.${currentUser.id}`);
      } else {
        query = query.eq("user_id", currentUser.id);
      }

      const { data: allMsgs, error } = await query;

      if (error) {
        console.error("Messages fetch error:", error);
        const { data: simpleData, error: simpleError } = await supabase
          .from("store_messages")
          .select("*")
          .or(`user_id.eq.${currentUser.id},store_id.in.(${storeIds.join(',')})`)
          .order("created_at", { ascending: false });

        if (simpleError) throw simpleError;
        processConversations(simpleData || [], userStores || []);
        return;
      }

      processConversations(allMsgs || [], userStores || []);

    } catch (error) {
      console.error("Error fetching conversations:", error);
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("store_messages")
          .select("*")
          .or(`user_id.eq.${currentUser.id}`)
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;
        
        const storeIds = [...new Set(fallbackData?.map(msg => msg.store_id) || [])];
        const { data: storesData } = await supabase
          .from("stores")
          .select("id, name, owner_id, contact_phone")
          .in("id", storeIds);

        processConversations(fallbackData || [], storesData || []);
      } catch (fallbackError) {
        console.error("Fallback fetch failed:", fallbackError);
        toast.error("Failed to load conversations");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activeConversation]);

  // Helper function to process conversations
  const processConversations = (messages, stores) => {
    const convMap = new Map();
    const storeMap = new Map(stores.map(store => [store.id, store]));
    const userIds = new Set();
    const storeIds = new Set();

    messages.forEach((msg) => {
      const store = storeMap.get(msg.store_id);
      const isBuyer = msg.sender_role === "buyer" && msg.user_id === currentUser.id;
      const isSeller = store?.owner_id === currentUser.id;
      
      if (!isBuyer && !isSeller) return;

      const otherId = isBuyer ? store?.owner_id : msg.user_id;
      const conversationKey = `${msg.store_id}-${msg.product_id || "no-product"}`;

      // Collect user IDs for profile pictures (with validation)
      if (otherId && otherId !== 'undefined') {
        userIds.add(otherId);
      }

      // Collect store IDs for contacts
      if (msg.store_id && msg.store_id !== 'undefined') {
        storeIds.add(msg.store_id);
      }

      if (!convMap.has(conversationKey)) {
        convMap.set(conversationKey, {
          store_id: msg.store_id,
          product_id: msg.product_id,
          user_id: otherId,
          store_owner_id: store?.owner_id,
          username: store?.name || `Store ${msg.store_id?.slice(-6)}`,
          product_name: "General Inquiry",
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: (isSeller && msg.sender_role === "buyer" && msg.status === "unread") || 
                        (isBuyer && msg.sender_role === "seller" && msg.status === "unread") ? 1 : 0,
          contact_number: store?.contact_number
        });
      } else {
        const conv = convMap.get(conversationKey);
        if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
          conv.last_message = msg.content;
          conv.last_message_time = msg.created_at;
        }
        if ((isSeller && msg.sender_role === "buyer" && msg.status === "unread") || 
            (isBuyer && msg.sender_role === "seller" && msg.status === "unread")) {
          conv.unread_count += 1;
        }
      }
    });

    const convList = Array.from(convMap.values()).sort(
      (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
    );

    setConversations(convList);
    setFilteredConversations(convList);

    // Fetch profile pictures and store contacts with validated IDs
    fetchProfilePictures(Array.from(userIds));
    fetchStoreContacts(Array.from(storeIds));

    if (convList.length > 0 && !activeConversation && !isMobileView) {
      setActiveConversation(convList[0]);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Search users/stores
  useEffect(() => {
    if (!searchTerm.trim() || !currentUser) {
      setSearchUsers([]);
      const filtered = conversations.filter((conv) =>
        conv.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
      return;
    }

    const fetchSearchUsers = async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, owner_id, contact_phone")
        .ilike("name", `%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error("Error searching stores:", error);
        return;
      }

      const existingIds = conversations.map((c) => c.store_id);
      const newStores = data.filter((s) => !existingIds.includes(s.id));

      setSearchUsers(newStores);
      
      // Only fetch contacts for stores with valid IDs
      const validStoreIds = newStores.map(s => s.id).filter(id => id && id !== 'undefined');
      if (validStoreIds.length > 0) {
        fetchStoreContacts(validStoreIds);
      }
    };

    fetchSearchUsers();

    const filtered = conversations.filter((conv) =>
      conv.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredConversations(filtered);
  }, [searchTerm, conversations, currentUser]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation?.store_id || !currentUser) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        let query = supabase
          .from("store_messages")
          .select("*")
          .eq("store_id", activeConversation.store_id)
          .order("created_at", { ascending: true });

        if (activeConversation.product_id) {
          query = query.eq("product_id", activeConversation.product_id);
        } else {
          query = query.is("product_id", null);
        }

        const { data, error } = await query;

        if (error) throw error;

        setMessages(data || []);

        // Mark unread messages as read
        const unreadMessages = data?.filter(
          (msg) =>
            ((msg.sender_role === "buyer" && msg.user_id !== currentUser.id && currentUser.id === activeConversation.store_owner_id) ||
             (msg.sender_role === "seller" && msg.user_id === currentUser.id)) &&
            msg.status === "unread"
        );
        
        if (unreadMessages?.length > 0) {
          const messageIds = unreadMessages.map((msg) => msg.id);
          await supabase
            .from("store_messages")
            .update({ status: "read" })
            .in("id", messageIds);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      }
    };

    fetchMessages();

    const subscription = supabase
      .channel(`store_messages:${activeConversation.store_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "store_messages",
          filter: `store_id=eq.${activeConversation.store_id}`,
        },
        (payload) => {
          const newMsg = payload.new;
          const shouldAddMessage = 
            (newMsg.user_id === currentUser.id) ||
            (currentUser.id === activeConversation.store_owner_id);
          
          if (shouldAddMessage) {
            setMessages((prev) => [...prev, newMsg]);
            
            if (newMsg.status === "unread" && 
                ((newMsg.sender_role === "buyer" && currentUser.id === activeConversation.store_owner_id) ||
                 (newMsg.sender_role === "seller" && currentUser.id === activeConversation.user_id))) {
              supabase
                .from("store_messages")
                .update({ status: "read" })
                .eq("id", newMsg.id);
            }
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeConversation, currentUser, fetchConversations]);

  // Online status simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (conversations.length > 0) {
        const randomOnline = new Set();
        conversations.forEach((conv) => {
          if (Math.random() > 0.3 && conv.user_id && conv.user_id !== 'undefined') {
            randomOnline.add(conv.user_id);
          }
        });
        setOnlineUsers(randomOnline);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [conversations]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !activeConversation?.store_id) return;

    try {
      const isSeller = currentUser.id === activeConversation.store_owner_id;
      const { data, error } = await supabase
        .from("store_messages")
        .insert([
          {
            store_id: activeConversation.store_id,
            user_id: isSeller ? activeConversation.user_id : currentUser.id,
            sender_role: isSeller ? "seller" : "buyer",
            content: newMessage.trim(),
            product_id: activeConversation.product_id || null,
            status: "sent",
          },
        ])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setMessages((prev) => [...prev, data[0]]);
      }
      
      setNewMessage("");
      setShowEmojiPicker(false);

      if (activeConversation.isNew) {
        await fetchConversations();
        setActiveConversation((prev) => ({ ...prev, isNew: false }));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiSelect = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getMessageStatus = (message) => {
    if (message.sender_role !== (currentUser.id === activeConversation?.store_owner_id ? "seller" : "buyer")) return null;
    
    switch (message.status) {
      case "sent":
        return <FaCheck className="status-icon sent" />;
      case "delivered":
        return <FaCheckDouble className="status-icon delivered" />;
      case "read":
        return <FaCheckDouble className="status-icon read" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  const handleStartNewChat = (store) => {
    const newConversation = {
      store_id: store.id,
      user_id: store.owner_id,
      store_owner_id: store.owner_id,
      username: store.name || `Store ${store.id?.slice(-6) || 'New'}`,
      product_name: "General Inquiry",
      isNew: true,
      contact_number: store.contact_number
    };
    
    setActiveConversation(newConversation);
    setSearchTerm("");
    setSearchUsers([]);
    
    if (isMobileView) {
      setShowChat(true);
    }
  };

  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
    if (isMobileView) {
      setShowChat(true);
    }
  };

  const handleBackToConversations = () => {
    setShowChat(false);
  };

  const handleCall = (conversation) => {
    const contactNumber = conversation.contact_number || 
                         storeContacts[conversation.store_id]?.contact_number;
    
    if (contactNumber) {
      window.open(`tel:${contactNumber}`, '_self');
    } else {
      toast.error('No contact number available for this store');
    }
  };

  const getAvatar = (userId, storeId) => {
    // Only try to use profile picture if userId is valid
    if (userId && userId !== 'undefined' && profilePictures[userId]) {
      return (
        <img 
          src={profilePictures[userId]} 
          alt="Profile" 
          className="avatar-img"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      );
    }
    return <FaUserCircle className="avatar-icon" />;
  };

  if (isLoading) {
    return (
      <div className="messages-loading">
        <div className="loading-spinner"></div>
        <p>Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div className={`conversations-sidebar ${isMobileView && showChat ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h2>Messages</h2>
          <div className="header-actions">
            <button className="icon-btn">
              <FaEllipsisV />
            </button>
          </div>
        </div>

        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search stores or products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="conversations-list">
          {filteredConversations.map((conversation) => (
            <motion.div
              key={`${conversation.store_id}-${conversation.product_id || "no-product"}`}
              className={`conversation-item ${
                activeConversation?.store_id === conversation.store_id &&
                activeConversation?.product_id === conversation.product_id
                  ? "active"
                  : ""
              }`}
              onClick={() => handleConversationSelect(conversation)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="avatar-container">
                {getAvatar(conversation.user_id, conversation.store_id)}
                {conversation.user_id && conversation.user_id !== 'undefined' && onlineUsers.has(conversation.user_id) && (
                  <div className="online-indicator"></div>
                )}
              </div>
              
              <div className="conversation-info">
                <div className="conversation-header">
                  <h4 className="username">
                    <FaStore className="store-icon" />
                    {conversation.username}
                  </h4>
                  <span className="time">{formatTime(conversation.last_message_time)}</span>
                </div>
                
                <div className="conversation-preview">
                  <p className="last-message">{conversation.last_message}</p>
                  {conversation.unread_count > 0 && (
                    <span className="unread-badge">{conversation.unread_count}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {searchUsers.length > 0 && (
            <div className="new-chat-section">
              <h4>New Chats</h4>
              {searchUsers.map((store) => (
                <motion.div
                  key={store.id}
                  className="conversation-item new-chat"
                  onClick={() => handleStartNewChat(store)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="avatar-container">
                    <FaStore className="avatar-icon" />
                  </div>
                  
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4 className="username">
                        <FaStore className="store-icon" />
                        {store.name || `Store ${store.id?.slice(-6) || 'New'}`}
                      </h4>
                      <span className="time">Start new chat</span>
                    </div>
                    
                    <div className="conversation-preview">
                      <p className="last-message">Begin conversation</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`chat-area ${isMobileView && !showChat ? 'hidden' : ''}`}>
        {activeConversation ? (
          <>
            <div className="chat-header">
              {isMobileView && (
                <button className="back-btn" onClick={handleBackToConversations}>
                  <FaArrowLeft />
                </button>
              )}
              
              <div className="chat-partner-info">
                <div className="avatar-container">
                  {getAvatar(activeConversation.user_id, activeConversation.store_id)}
                  {activeConversation.user_id && activeConversation.user_id !== 'undefined' && onlineUsers.has(activeConversation.user_id) && (
                    <div className="online-indicator"></div>
                  )}
                </div>
                <div className="partner-details">
                  <h3>
                    <FaStore className="store-icon" />
                    {activeConversation.username}
                  </h3>
                  <span className="status">
                    Product: {activeConversation.product_name}
                    {" | "}
                    {activeConversation.user_id && activeConversation.user_id !== 'undefined' && onlineUsers.has(activeConversation.user_id) ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              
              <div className="chat-actions">
                <button 
                  className="icon-btn"
                  onClick={() => handleCall(activeConversation)}
                  title="Call"
                >
                  <FaPhone />
                </button>
                <button className="icon-btn" title="Video Call">
                  <FaVideo />
                </button>
                <button className="icon-btn" title="Info">
                  <FaInfoCircle />
                </button>
              </div>
            </div>

            <div className="messages-list-container">
              <div className="messages-list">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`message ${
                        message.sender_role === (currentUser.id === activeConversation.store_owner_id ? "seller" : "buyer")
                          ? "sent"
                          : "received"
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="message-bubble">
                        <p>{message.content}</p>
                        <div className="message-meta">
                          <span className="time">{formatTime(message.created_at)}</span>
                          {getMessageStatus(message)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="message-input-container">
              <div className="input-actions">
                <button 
                  className="emoji-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <FaSmile />
                </button>
                
                <button 
                  className="attachment-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FaImage />
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    console.log("File selected:", e.target.files[0]);
                  }}
                />
              </div>
              
              <div className="message-input-wrapper">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows="1"
                  className="message-input"
                />
              </div>
              
              <button 
                className="send-btn"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <FaPaperPlane />
              </button>
            </div>

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  className="emoji-picker-container"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <EmojiPicker 
                    onEmojiClick={handleEmojiSelect}
                    width="100%"
                    height="350px"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="welcome-message">
              <FaUserCircle size={64} />
              <h3>Welcome to Messages</h3>
              <p>Select a conversation to start chatting or search for a store</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;