// src/context/NetworkContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useLocation } from "react-router-dom";

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const networkStatus = useNetworkStatus();
  const [cachedData, setCachedData] = useState({});
  const location = useLocation();

  const value = {
    ...networkStatus,
    cachedData,
    setCachedData,
  };

  return (
    <NetworkContext.Provider value={value}>
      {/* No more OfflineBanner - we'll handle offline state in ProtectedRoute */}
      {children}
    </NetworkContext.Provider>
  );
};