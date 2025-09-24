import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [searchUsers, setSearchUsers] = useState([]);
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

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { data: allMsgs, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id(name, email),
          receiver:receiver_id(name, email)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const convMap = new Map();

      (allMsgs || []).forEach((msg) => {
        const isSent = msg.sender_id === currentUser.id;
        const otherId = isSent ? msg.receiver_id : msg.sender_id;
        const otherUser = isSent ? msg.receiver : msg.sender;
        const unread = isSent ? 0 : (msg.status === "unread" ? 1 : 0);

        if (!convMap.has(otherId)) {
          convMap.set(otherId, {
            user_id: otherId,
            username: otherUser.name || otherUser.email?.split("@")[0] || `User ${otherId.slice(-6)}`,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: unread,
          });
        } else {
          const conv = convMap.get(otherId);
          if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
            conv.last_message = msg.content;
            conv.last_message_time = msg.created_at;
          }
          conv.unread_count += unread;
        }
      });

      const convList = Array.from(convMap.values()).sort(
        (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
      );

      setConversations(convList);
      setFilteredConversations(convList);

      if (convList.length > 0 && !activeConversation) {
        setActiveConversation(convList[0]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activeConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Search users
  useEffect(() => {
    if (!searchTerm.trim() || !currentUser) {
      setSearchUsers([]);
      const filtered = conversations.filter((conv) =>
        conv.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
      return;
    }

    const fetchSearchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .neq("id", currentUser.id);

      if (error) {
        console.error("Error searching users:", error);
        return;
      }

      const existingIds = conversations.map((c) => c.user_id);
      const newUsers = data.filter((u) => !existingIds.includes(u.id));

      setSearchUsers(newUsers);
    };

    fetchSearchUsers();

    // Filter existing conversations
    const filtered = conversations.filter((conv) =>
      conv.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredConversations(filtered);
  }, [searchTerm, conversations, currentUser]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation?.user_id || !currentUser) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id(name, email),
          receiver:receiver_id(name, email)
        `)
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeConversation.user_id}),and(sender_id.eq.${activeConversation.user_id},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);

      // Mark unread as read
      const unreadMessages = data?.filter(
        (msg) => msg.sender_id === activeConversation.user_id && msg.status === "unread"
      );
      if (unreadMessages?.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        await supabase.from("messages").update({ status: "read" }).in("id", messageIds);
      }
    };

    fetchMessages();

    // Subscription for incoming messages
    const subscription = supabase
      .channel(`messages:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === activeConversation.user_id) {
            setMessages((prev) => [...prev, newMsg]);
            // Mark as read
            supabase.from("messages").update({ status: "read" }).eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeConversation, currentUser]);

  // Online status simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (conversations.length > 0) {
        const randomOnline = new Set();
        conversations.forEach((conv) => {
          if (Math.random() > 0.3) {
            randomOnline.add(conv.user_id);
          }
        });
        setOnlineUsers(randomOnline);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [conversations]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !activeConversation?.user_id) return;

    try {
      const { data: [newMsg], error } = await supabase.from("messages").insert([
        {
          sender_id: currentUser.id,
          receiver_id: activeConversation.user_id,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          status: "sent",
        },
      ]).select();

      if (error) throw error;

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      setShowEmojiPicker(false);

      // If new conversation, refresh conversations list
      if (activeConversation.isNew) {
        await fetchConversations();
        setActiveConversation((prev) => ({ ...prev, isNew: false }));
      }
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
    if (message.sender_id !== currentUser.id) return null;
    
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

  const handleStartNewChat = (user) => {
    setActiveConversation({
      user_id: user.id,
      username: user.name || user.email?.split("@")[0] || `User ${user.id.slice(-6)}`,
      isNew: true,
    });
    setSearchTerm("");
    setSearchUsers([]);
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
            placeholder="Search users or conversations..."
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
                  <h4 className="username">{conversation.username}</h4>
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

          {searchUsers.length > 0 && (
            <div className="new-chat-section">
              <h4>New Chats</h4>
              {searchUsers.map((user) => (
                <motion.div
                  key={user.id}
                  className="conversation-item new-chat"
                  onClick={() => handleStartNewChat(user)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="avatar-container">
                    <FaUserCircle className="avatar" />
                  </div>
                  
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4 className="username">{user.name || user.email}</h4>
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
                  <h3>{activeConversation.username}</h3>
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
              <p>Select a conversation to start chatting or search for a user</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;