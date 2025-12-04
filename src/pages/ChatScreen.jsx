import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  FaPaperPlane, 
  FaArrowLeft, 
  FaPhone, 
  FaVideo, 
  FaInfoCircle,
  FaCheck, 
  FaCheckDouble, 
  FaPaperclip, 
  FaMicrophone,
  FaRegSmile,
  FaShoppingBag,
  FaMapMarkerAlt,
  FaStore,
  FaUserCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-hot-toast";
import "./ChatScreen.css";

const ChatScreen = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { conversation, userDetails, storeDetails } = location.state || {};

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Fix: Check if we're coming from messages page, if not, redirect to messages
  useEffect(() => {
    if (!conversation) {
      navigate('/messages', { replace: true });
      return;
    }
  }, [conversation, navigate]);

  if (!conversation) {
    return null; // Will redirect in useEffect
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!conversation?.store_id || !currentUser) {
      setMessages([]);
      return;
    }

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

      // Mark messages as read
      const unreadMessages = data?.filter(msg => 
        !msg.is_read && 
        ((msg.sender_role === 'buyer' && currentUser.id === conversation.store_owner_id) ||
         (msg.sender_role === 'seller' && currentUser.id === conversation.user_id))
      );

      if (unreadMessages?.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        await supabase
          .from("store_messages")
          .update({ is_read: true })
          .in("id", messageIds);
      }

    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [conversation, currentUser]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversation?.store_id) return;

    const subscription = supabase
      .channel(`store_messages:${conversation.store_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_messages",
          filter: `store_id=eq.${conversation.store_id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversation, fetchMessages]);

  // Online status simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const randomOnline = new Set();
      if (conversation.user_id && Math.random() > 0.5) {
        randomOnline.add(conversation.user_id);
      }
      setOnlineUsers(randomOnline);
    }, 15000);

    return () => clearInterval(interval);
  }, [conversation]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !conversation?.store_id) return;

    try {
      const isSeller = currentUser.id === conversation.store_owner_id;
      const senderRole = isSeller ? 'seller' : 'buyer';

      const { data, error } = await supabase
        .from("store_messages")
        .insert([
          {
            store_id: conversation.store_id,
            user_id: isSeller ? conversation.user_id : currentUser.id,
            sender_role: senderRole,
            content: newMessage.trim(),
            product_id: conversation.product_id || null,
            status: 'sent',
            is_read: false,
            receiver_id: isSeller ? conversation.user_id : conversation.store_owner_id
          },
        ])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setMessages(prev => [...prev, data[0]]);
      }
      
      setNewMessage("");
      setShowEmojiPicker(false);

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
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageStatus = (message) => {
    const isUserMessage = message.sender_role === (currentUser.id === conversation?.store_owner_id ? 'seller' : 'buyer');
    
    if (!isUserMessage) return null;
    
    if (message.is_read) {
      return <FaCheckDouble className="message-status read" />;
    } else if (message.status === 'delivered') {
      return <FaCheckDouble className="message-status delivered" />;
    } else {
      return <FaCheck className="message-status sent" />;
    }
  };

  const getChatPartnerInfo = () => {
    if (conversation.is_buyer) {
      return {
        name: conversation.store_name,
        isOnline: onlineUsers.has(conversation.store_owner_id),
        type: 'store'
      };
    } else {
      return {
        name: userDetails?.name || 'Customer',
        isOnline: onlineUsers.has(conversation.user_id),
        type: 'customer'
      };
    }
  };

  const getChatPartnerAvatar = () => {
    if (conversation.is_buyer) {
      return (
        <div className="avatar-placeholder store">
          <FaStore />
        </div>
      );
    } else {
      if (userDetails?.avatar) {
        return <img src={userDetails.avatar} alt={userDetails.name} className="conversation-avatar" />;
      } else {
        return (
          <div className="avatar-placeholder user">
            <div className="avatar-initial">
              {userDetails?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        );
      }
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
          address: match[3],
          rawContent: content
        };
      }
    }
    
    return { isOrder: false, rawContent: content };
  };

  const handleCall = () => {
    const phoneNumber = conversation.is_buyer 
      ? storeDetails?.phone
      : userDetails?.phone;
    
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`);
    } else {
      toast.error('Phone number not available');
    }
  };

  const handleVideoCall = () => {
    toast.success('Video call feature coming soon!');
  };

  const handleViewInfo = () => {
    toast.success('Profile info feature coming soon!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      toast.success(`File "${file.name}" selected - Upload feature coming soon!`);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    toast.success("Recording started - Voice message feature coming soon!");
  };

  const stopRecording = () => {
    setIsRecording(false);
    toast.success("Recording stopped");
  };

  // FIXED: Back navigation logic
  const handleBack = () => {
    // Check if we came from messages page (has previous state)
    if (location.state?.fromMessages) {
      navigate('/messages', { replace: true });
    } else {
      // Go back in history, but ensure we don't get stuck
      navigate(-1);
    }
  };

  const chatPartnerInfo = getChatPartnerInfo();

  // Message Skeleton
  const MessageSkeleton = () => (
    <div className="message-skeleton">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-message-content">
        <div className="skeleton-line short"></div>
        <div className="skeleton-line medium"></div>
      </div>
    </div>
  );

  // FIXED: Check if message is from current user (CORRECTED VERSION)
  const isMessageFromCurrentUser = (message) => {
    if (!currentUser || !conversation) return false;
    
    // If message is from seller and current user is the store owner
    if (message.sender_role === 'seller') {
      return currentUser.id === conversation.store_owner_id;
    } 
    // If message is from buyer and current user is the user in conversation
    else if (message.sender_role === 'buyer') {
      return currentUser.id === conversation.user_id;
    }
    
    return false;
  };

  return (
    <div className="chat-screen-container">
      <div className="chat-header">
        <button 
          className="back-btn" 
          onClick={handleBack}
          title="Back to messages"
        >
          <FaArrowLeft />
        </button>
        
        <div className="chat-partner">
          <div className="partner-avatar">
            {getChatPartnerAvatar()}
            {chatPartnerInfo?.isOnline && <div className="online-indicator"></div>}
          </div>
          
          <div className="partner-info">
            <h2>{chatPartnerInfo?.name}</h2>
            <span className={`status ${chatPartnerInfo?.isOnline ? 'online' : 'offline'}`}>
              {chatPartnerInfo?.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="chat-actions">
          <button 
            className="action-btn"
            onClick={handleCall}
            title="Call"
          >
            <FaPhone />
          </button>
          <button 
            className="action-btn"
            onClick={handleVideoCall}
            title="Video Call"
          >
            <FaVideo />
          </button>
          <button 
            className="action-btn"
            onClick={handleViewInfo}
            title="Info"
          >
            <FaInfoCircle />
          </button>
        </div>
      </div>

      <div className="messages-container">
        {isLoading ? (
          <div className="messages-loading">
            {[...Array(5)].map((_, i) => (
              <MessageSkeleton key={i} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">
              <FaPaperPlane />
            </div>
            <p>No messages yet</p>
            <p className="subtext">Start a conversation by sending a message!</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => {
              const isUserMessage = isMessageFromCurrentUser(message);
              const parsedMessage = parseOrderMessage(message.content);
              
              return (
                <motion.div
                  key={message.id}
                  className={`message-wrapper ${isUserMessage ? 'message-wrapper-sent' : 'message-wrapper-received'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`message ${isUserMessage ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      {parsedMessage.isOrder ? (
                        <div className="order-card">
                          <div className="order-header">
                            <FaShoppingBag />
                            <span>New Order</span>
                          </div>
                          <div className="order-details">
                            <div className="order-field">
                              <strong>Customer:</strong>
                              <span>{parsedMessage.email}</span>
                            </div>
                            <div className="order-field">
                              <strong>Product:</strong>
                              <span className="product-name">{parsedMessage.product}</span>
                            </div>
                            <div className="order-field">
                              <FaMapMarkerAlt />
                              <span>{parsedMessage.address}</span>
                            </div>
                          </div>
                          <div className="order-actions">
                            <button className="order-btn accept">Accept</button>
                            <button className="order-btn decline">Details</button>
                          </div>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      
                      <div className="message-footer">
                        <span className="time">{formatMessageTime(message.created_at)}</span>
                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="message-input-area">
        <div className="input-actions">
          <button 
            className={`action-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji"
          >
            <FaRegSmile />
          </button>
          <button 
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach File"
          >
            <FaPaperclip />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
        </div>

        <div className="message-input-wrapper">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows="1"
            className="message-input"
          />
        </div>

        {newMessage.trim() ? (
          <button 
            className="send-btn" 
            onClick={sendMessage}
            title="Send Message"
          >
            <FaPaperPlane />
          </button>
        ) : (
          <button 
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop Recording" : "Voice Message"}
          >
            <FaMicrophone />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            className="emoji-picker-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <EmojiPicker 
              onEmojiClick={handleEmojiSelect}
              width="100%"
              height="300px"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatScreen;