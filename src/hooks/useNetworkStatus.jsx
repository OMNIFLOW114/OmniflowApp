// src/hooks/useNetworkStatus.jsx
import { useState, useEffect, useCallback, useRef } from "react";

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionType, setConnectionType] = useState(null);
  const [effectiveType, setEffectiveType] = useState(null);
  const [downlink, setDownlink] = useState(null);
  const [rtt, setRtt] = useState(null);
  
  const hasRefreshedRef = useRef(false);
  const timeoutRef = useRef(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Get connection information if available
    if (navigator.connection) {
      setConnectionType(navigator.connection.type);
      setEffectiveType(navigator.connection.effectiveType);
      setDownlink(navigator.connection.downlink);
      setRtt(navigator.connection.rtt);

      const handleConnectionChange = () => {
        setEffectiveType(navigator.connection.effectiveType);
        setDownlink(navigator.connection.downlink);
        setRtt(navigator.connection.rtt);
      };

      navigator.connection.addEventListener('change', handleConnectionChange);
      return () => navigator.connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      
      // Auto-refresh the page when connection is restored
      // Only refresh if we were previously offline and haven't refreshed yet
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        
        // Add a small delay to ensure everything is ready
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      
      setTimeout(() => {
        setWasOffline(false);
        hasRefreshedRef.current = false;
        window.dispatchEvent(new CustomEvent('app:network-restored'));
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      hasRefreshedRef.current = false; // Reset refresh flag when going offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
  };
};