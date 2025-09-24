import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  FaPaperPlane, 
  FaUserCircle, 
  FaSmile, 
  FaSearch,
  FaEllipsisV,
  FaPhone,
  FaVideo,
  FaInfoCircle,
  FaCheck,
  FaCheckDouble,
  FaClock
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import "./Messages.css";

const Messages = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeConversation, setActiveConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user conversations
  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_user_conversations", {
          user_id: currentUser.id,
        });
        
        if (error) throw error;
        
        setConversations(data || []);
        setFilteredConversations(data || []);
        
        // Set first conversation as active if available
        if (data && data.length > 0 && !activeConversation) {
          setActiveConversation(data[0]);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // Filter conversations based on search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchTerm, conversations]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation || !currentUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeConversation.user_id}),and(sender_id.eq.${activeConversation.user_id},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true });

      if (!error) {
        setMessages(data || []);
        
        // Mark messages as read
        const unreadMessages = data?.filter(msg => 
          msg.sender_id === activeConversation.user_id && msg.status === 'unread'
        );
        
        if (unreadMessages && unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg.id);
          await supabase
            .from("messages")
            .update({ status: "read" })
            .in("id", messageIds);
        }
      }
    };

    fetchMessages();

    // Real-time subscription for new messages
    const subscription = supabase
      .channel(`messages:${activeConversation.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === activeConversation.user_id) {
            setMessages(prev => [...prev, newMsg]);
            
            // Mark as read immediately
            supabase
              .from("messages")
              .update({ status: "read" })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeConversation, currentUser]);

  // Online status simulation (in real app, use presence system)
  useEffect(() => {
    const interval = setInterval(() => {
      if (conversations.length > 0) {
        const randomOnline = new Set();
        conversations.forEach(conv => {
          if (Math.random() > 0.3) { // 70% chance of being online
            randomOnline.add(conv.user_id);
          }
        });
        setOnlineUsers(randomOnline);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [conversations]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !activeConversation) return;

    try {
      const { error } = await supabase.from("messages").insert([
        {
          sender_id: currentUser.id,
          receiver_id: activeConversation.user_id,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          status: "sent",
        },
      ]);

      if (error) throw error;

      setNewMessage("");
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiSelect = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getMessageStatus = (message) => {
    if (message.sender_id !== currentUser.id) return null;
    
    switch (message.status) {
      case 'sent':
        return <FaCheck className="status-icon sent" />;
      case 'delivered':
        return <FaCheckDouble className="status-icon delivered" />;
      case 'read':
        return <FaCheckDouble className="status-icon read" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
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
      {/* Sidebar */}
      <div className="conversations-sidebar">
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
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="conversations-list">
          {filteredConversations.map((conversation) => (
            <motion.div
              key={conversation.user_id}
              className={`conversation-item ${
                activeConversation?.user_id === conversation.user_id ? "active" : ""
              }`}
              onClick={() => setActiveConversation(conversation)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="avatar-container">
                <FaUserCircle className="avatar" />
                {onlineUsers.has(conversation.user_id) && (
                  <div className="online-indicator"></div>
                )}
              </div>
              
              <div className="conversation-info">
                <div className="conversation-header">
                  <h4 className="username">{conversation.username || `User ${conversation.user_id.slice(-6)}`}</h4>
                  <span className="time">{formatTime(conversation.last_message_time)}</span>
                </div>
                
                <div className="conversation-preview">
                  <p className="last-message">{conversation.last_message || "No messages yet"}</p>
                  {conversation.unread_count > 0 && (
                    <span className="unread-badge">{conversation.unread_count}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {activeConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-partner-info">
                <div className="avatar-container">
                  <FaUserCircle className="avatar" />
                  {onlineUsers.has(activeConversation.user_id) && (
                    <div className="online-indicator"></div>
                  )}
                </div>
                <div className="partner-details">
                  <h3>{activeConversation.username || `User ${activeConversation.user_id.slice(-6)}`}</h3>
                  <span className="status">
                    {onlineUsers.has(activeConversation.user_id) ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              
              <div className="chat-actions">
                <button className="icon-btn">
                  <FaPhone />
                </button>
                <button className="icon-btn">
                  <FaVideo />
                </button>
                <button className="icon-btn">
                  <FaInfoCircle />
                </button>
              </div>
            </div>

            <div className="messages-container">
              <div className="messages-list">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`message ${message.sender_id === currentUser.id ? "sent" : "received"}`}
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
                  +
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    // Handle file upload
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
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;