// src/pages/admin/MessageMonitoring.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import './MessageMonitoring.css';

const MessageMonitoring = () => {
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('store_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setMessages(data);
        setFiltered(data);
      }
      setLoading(false);
    };

    fetchMessages();
  }, []);

  useEffect(() => {
    const filteredMessages = messages.filter((msg) =>
      msg.content?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(filteredMessages);
  }, [search, messages]);

  return (
    <div className="message-monitor-container">
      <h2>💬 Message Monitoring</h2>
      <input
        type="text"
        className="search-bar"
        placeholder="Search messages..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="loading">Loading messages...</p>
      ) : (
        <div className="message-log">
          {filtered.length === 0 ? (
            <p>No messages found.</p>
          ) : (
            filtered.map((msg) => (
              <div key={msg.id} className={`message-item ${msg.sender_role}`}>
                <p><strong>Store ID:</strong> {msg.store_id}</p>
                <p><strong>Sender:</strong> {msg.sender_role}</p>
                <p><strong>Message:</strong> {msg.content}</p>
                <p className="timestamp">{new Date(msg.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MessageMonitoring;
