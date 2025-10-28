import { useState, useCallback, useEffect } from 'react';

export const useInfiniteScroll = (fetchFunction, pageSize = 20) => {
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const result = await fetchFunction(page + 1, pageSize);
      if (result.hasMore) {
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, fetchFunction, pageSize]);

  // Reset when fetchFunction changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
  }, [fetchFunction]);

  return {
    loadMore,
    hasMore,
    loadingMore,
    page
  };
};