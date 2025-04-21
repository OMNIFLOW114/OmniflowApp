import React, { useState } from 'react';
import { Bell } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New comment on your post', message: 'John commented on your post.', time: '2 min ago' },
    { id: 2, title: 'New follower', message: 'Michael started following you.', time: '5 min ago' },
    { id: 3, title: 'Meeting reminder', message: 'Your meeting with Jane is starting soon.', time: '30 min ago' },
  ]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Notifications</h2>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 transition-colors duration-200"
          >
            <Bell size={24} className="text-yellow-500" />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{notification.title}</p>
              <p className="text-sm text-gray-600">{notification.message}</p>
            </div>
            <span className="text-xs text-gray-400">{notification.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
