import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * Optimized Query Hook
 * 
 * Wrapper around useQuery with optimized defaults:
 * - Standard stale times: 10min
 * - Standard cache times: 1hr
 * - Request deduplication enabled
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError>
) {
  return useQuery<TData, TError>({
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
}
