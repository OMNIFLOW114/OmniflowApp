import React, { useState } from 'react';

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleDarkModeToggle = () => setDarkMode(!darkMode);
  const handleNotificationsToggle = () => setNotificationsEnabled(!notificationsEnabled);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <div className="space-y-6">
        {/* Dark Mode Toggle */}
        <div>
          <label className="flex items-center space-x-2 text-sm">
            <span className="text-gray-700">Dark Mode</span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={handleDarkModeToggle}
              className="h-5 w-5"
            />
          </label>
        </div>

        {/* Notifications Toggle */}
        <div>
          <label className="flex items-center space-x-2 text-sm">
            <span className="text-gray-700">Enable Notifications</span>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={handleNotificationsToggle}
              className="h-5 w-5"
            />
          </label>
        </div>

        {/* More Settings can go here */}
      </div>
    </div>
  );
};

export default Settings;
