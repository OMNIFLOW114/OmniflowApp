import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const Messages = () => {
  const [messages, setMessages] = useState([
    { id: 1, user: 'John Doe', text: 'Hey, how are you?', time: '5 min ago' },
    { id: 2, user: 'Jane Smith', text: 'Looking forward to our meeting!', time: '10 min ago' },
    { id: 3, user: 'Michael Johnson', text: 'I will send the files later.', time: '20 min ago' },
  ]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Messages</h2>
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 transition-colors duration-200"
          >
            <MessageCircle size={24} className="text-blue-500" />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{message.user}</p>
              <p className="text-sm text-gray-600">{message.text}</p>
            </div>
            <span className="text-xs text-gray-400">{message.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Messages;
