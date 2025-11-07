import { useQuery, UseQueryOptions, QueryKey, QueryFunction } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { RequestCache, RequestDeduplicator } from '@/lib/requestOptimization';

/**
 * Hook for optimized queries with caching and deduplication
 */
export function useOptimizedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    enableCache?: boolean;
    cacheTTL?: number;
    enableDeduplication?: boolean;
  }
) {
  const {
    enableCache = true,
    cacheTTL = 60000, // 1 minute default
    enableDeduplication = true,
    queryKey,
    queryFn: originalQueryFn,
    ...restOptions
  } = options;

  // Initialize cache and deduplicator
  const cacheRef = useRef<RequestCache<string, TQueryFnData>>();
  const deduplicatorRef = useRef<RequestDeduplicator<string, TQueryFnData>>();

  if (!cacheRef.current && enableCache) {
    cacheRef.current = new RequestCache<string, TQueryFnData>(cacheTTL);
  }

  if (!deduplicatorRef.current && enableDeduplication) {
    deduplicatorRef.current = new RequestDeduplicator<string, TQueryFnData>();
  }

  // Optimized query function
  const optimizedQueryFn: QueryFunction<TQueryFnData, TQueryKey, never> = async (context) => {
    if (!originalQueryFn || typeof originalQueryFn === 'symbol') {
      throw new Error('queryFn is required and must be a function');
    }

    const cacheKey = JSON.stringify(queryKey);

    // Check cache first
    if (enableCache && cacheRef.current) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Use deduplication
    const fetcher = async () => {
      const result = await originalQueryFn(context);
      
      // Store in cache
      if (enableCache && cacheRef.current) {
        cacheRef.current.set(cacheKey, result as TQueryFnData);
      }
      
      return result as TQueryFnData;
    };

    if (enableDeduplication && deduplicatorRef.current) {
      return deduplicatorRef.current.request(cacheKey, fetcher);
    }

    return fetcher();
  };

  return useQuery({
    ...restOptions,
    queryKey,
    queryFn: optimizedQueryFn,
  });
}

/**
 * Hook for debounced queries (useful for search inputs)
 */
export function useDebouncedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'> & {
    debounceDelay?: number;
  }
) {
  const { debounceDelay = 500, ...restOptions } = options || {};
  const [debouncedKey, setDebouncedKey] = useState(queryKey);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedKey(queryKey);
    }, debounceDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [JSON.stringify(queryKey), debounceDelay]);

  return useQuery({
    ...restOptions,
    queryKey: debouncedKey,
    queryFn,
  } as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>);
}
