// src/hooks/useNetworkFetch.js
import { useState, useCallback } from "react";
import { useNetwork } from "@/context/NetworkContext";
import { offlineStorage } from "@/utils/offlineStorage";
import { toast } from "react-hot-toast";

export const useNetworkFetch = (cacheKey = null, cacheExpiry = 30) => {
  const { isOnline } = useNetwork();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async (fetchFn, options = {}) => {
    const { skipCache = false, showErrors = true } = options;
    
    setLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      // Try to get from cache first if offline or if cache is enabled
      if (!skipCache && cacheKey) {
        const cachedData = await offlineStorage.getCachedApiResponse(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
          if (!isOnline) {
            setLoading(false);
            toast.success('Showing cached content (Offline Mode)', {
              icon: '📦',
              duration: 3000,
            });
            return cachedData;
          }
        }
      }

      // If online, fetch fresh data
      if (isOnline) {
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        
        // Cache the fresh data
        if (cacheKey) {
          await offlineStorage.cacheApiResponse(cacheKey, freshData, cacheExpiry);
        }
        
        return freshData;
      } else if (!skipCache && cacheKey) {
        // Offline but no cache available
        throw new Error("No internet connection and no cached data available");
      } else {
        throw new Error("No internet connection");
      }
    } catch (err) {
      setError(err);
      if (showErrors && !isOnline) {
        toast.error("No internet connection. Please check your network.", {
          duration: 4000,
          icon: '📡',
        });
      } else if (showErrors && err.message !== "No internet connection") {
        toast.error(err.message || "Failed to fetch data");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [isOnline, cacheKey, cacheExpiry]);

  return {
    data,
    loading,
    error,
    isFromCache,
    fetchData,
    refetch: (options) => fetchData(options?.fetchFn, { ...options, skipCache: true }),
  };
};