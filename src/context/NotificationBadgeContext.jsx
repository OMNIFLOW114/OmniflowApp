import { createContext, useContext, useState } from "react";

const NotificationBadgeContext = createContext();

export const NotificationBadgeProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <NotificationBadgeContext.Provider
      value={{ unreadCount, setGlobalUnreadCount: setUnreadCount }}
    >
      {children}
    </NotificationBadgeContext.Provider>
  );
};

export const useNotificationBadge = () => useContext(NotificationBadgeContext);
