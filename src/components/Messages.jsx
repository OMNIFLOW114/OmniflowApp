import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaPaperPlane, FaUserCircle, FaSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import "./Messages.css";

const Messages = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Fetch user conversations
  useEffect(() => {
    if (!currentUser) return;
    const fetchConversations = async () => {
      const { data, error } = await supabase.rpc("get_user_conversations", {
        user_id: currentUser.id,
      });
      if (error) console.error(error);
      else setConversations(data);
    };
    fetchConversations();
  }, [currentUser]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!receiverId || !currentUser) return;

    const getMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
        )
        .order("timestamp", { ascending: true });
      if (!error) setMessages(data);
    };

    getMessages();

    const subscription = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === currentUser.id && msg.receiver_id === receiverId) ||
            (msg.sender_id === receiverId && msg.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [receiverId, currentUser]);

  // Send message
  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    await supabase.from("messages").insert([
      {
        sender_id: currentUser.id,
        receiver_id: receiverId,
        content: newMessage,
        timestamp: new Date().toISOString(),
        status: "unread",
      },
    ]);
    setNewMessage("");
  };

  // Send typing status
  useEffect(() => {
    const updateTyping = async () => {
      if (!receiverId || !currentUser) return;
      await supabase
        .from("messages")
        .update({ typing: true })
        .eq("sender_id", currentUser.id)
        .eq("receiver_id", receiverId);
    };
    if (newMessage !== "") updateTyping();
  }, [newMessage]);

  const handleEmojiSelect = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="messages-page">
      <div className="sidebar">
        <h3 className="title">Chats</h3>
        {conversations.map((conv) => (
          <div
            className={`conversation ${conv.id === receiverId ? "active" : ""}`}
            key={conv.user_id}
            onClick={() => setReceiverId(conv.user_id)}
          >
            <FaUserCircle size={24} />
            <span>{conv.username || `User ${conv.user_id.slice(0, 6)}`}</span>
          </div>
        ))}
      </div>

      <div className="chat-box">
        <div className="messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.sender_id === currentUser.id ? "sent" : "received"}`}
            >
              <div className="bubble">{msg.content}</div>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <div className="input-bar">
          <button
            className="emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FaSmile size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a magical message..."
          />
          <button className="send-btn" onClick={sendMessage}>
            <FaPaperPlane size={20} />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker">
            <EmojiPicker onEmojiClick={handleEmojiSelect} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
