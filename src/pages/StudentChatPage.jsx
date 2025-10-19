// src/pages/StudentChatPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaPaperPlane, FaImage, FaSmile,
  FaPhone, FaVideo, FaEllipsisV, FaCheckDouble,
  FaRegCheckCircle, FaUserCircle
} from "react-icons/fa";
import "./StudentChatPage.css";

const StudentChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatId) {
      loadChatData();
      subscribeToMessages();
    }
  }, [chatId]);

  const loadChatData = async () => {
    try {
      // Load chat room
      const { data: chatData, error } = await supabase
        .from('campus_chat_rooms')
        .select('*')
        .eq('id', chatId)
        .single();

      if (error) throw error;
      setChatRoom(chatData);

      // Determine other user
      const otherUserId = chatData.participant1_id === user.id 
        ? chatData.participant2_id 
        : chatData.participant1_id;

      // Load other user info
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, avatar_url, is_online')
        .eq('id', otherUserId)
        .single();

      setOtherUser(userData);

      // Load messages
      const { data: messagesData } = await supabase
        .from('campus_messages')
        .select('*')
        .eq('chat_room_id', chatId)
        .order('created_at', { ascending: true });

      setMessages(messagesData || []);

    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('campus_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campus_messages',
          filter: `chat_room_id=eq.${chatId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('campus_messages')
        .insert([{
          chat_room_id: chatId,
          sender_id: user.id,
          message_text: newMessage.trim(),
          message_type: 'text',
          is_read: false
        }])
        .select()
        .single();

      if (error) throw error;

      // Update last message in chat room
      await supabase
        .from('campus_chat_rooms')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', chatId);

      setNewMessage("");

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await supabase
        .from('campus_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading chat...</p>
      </div>
    );
  }

  if (!chatRoom || !otherUser) {
    return (
      <div className="error-screen">
        <h2>Chat not found</h2>
        <button onClick={() => navigate('/student/marketplace')}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="student-chat-page">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="header-left">
          <motion.button
            className="back-btn"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft />
          </motion.button>
          
          <div className="user-info">
            <div className="user-avatar">
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt={otherUser.full_name} />
              ) : (
                <FaUserCircle />
              )}
              <div className={`online-status ${otherUser.is_online ? 'online' : 'offline'}`} />
            </div>
            <div className="user-details">
              <h3>{otherUser.full_name}</h3>
              <span className="user-status">
                {otherUser.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <motion.button
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPhone />
          </motion.button>
          <motion.button
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaVideo />
          </motion.button>
          <motion.button
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaEllipsisV />
          </motion.button>
        </div>
      </header>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Start a conversation with {otherUser.full_name}</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user.id;
              
              return (
                <motion.div
                  key={message.id}
                  className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onViewportEnter={() => {
                    if (!message.is_read && !isOwnMessage) {
                      markAsRead(message.id);
                    }
                  }}
                >
                  <div className="message-content">
                    <p>{message.message_text}</p>
                    <div className="message-meta">
                      <span className="time">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isOwnMessage && (
                        <span className="read-status">
                          {message.is_read ? <FaCheckDouble /> : <FaRegCheckCircle />}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="message-input-container">
        <div className="input-actions">
          <motion.button
            type="button"
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaImage />
          </motion.button>
          <motion.button
            type="button"
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSmile />
          </motion.button>
        </div>

        <div className="message-input-wrapper">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
        </div>

        <motion.button
          type="submit"
          className="send-btn"
          disabled={sending || !newMessage.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaPaperPlane />
        </motion.button>
      </form>
    </div>
  );
};

export default StudentChatPage;