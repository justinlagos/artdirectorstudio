import { useRef, useCallback } from 'react';
import { RequestBatcher } from '@/lib/requestOptimization';

/**
 * Hook for batching multiple requests into a single API call
 * 
 * @example
 * ```tsx
 * const batchFetcher = async (ids: string[]) => {
 *   const { data } = await supabase
 *     .from('users')
 *     .select('*')
 *     .in('id', ids);
 *   return new Map(data.map(user => [user.id, user]));
 * };
 * 
 * const { request } = useBatchedRequests(batchFetcher, {
 *   batchDelay: 50,
 *   maxBatchSize: 100
 * });
 * 
 * // Later in component
 * const user = await request(userId);
 * ```
 */
export function useBatchedRequests<TKey, TValue>(
  batchFn: (keys: TKey[]) => Promise<Map<TKey, TValue>>,
  options: {
    batchDelay?: number;
    maxBatchSize?: number;
  } = {}
) {
  const batcherRef = useRef<RequestBatcher<TKey, TValue>>();

  if (!batcherRef.current) {
    batcherRef.current = new RequestBatcher(batchFn, options);
  }

  const request = useCallback(async (key: TKey): Promise<TValue> => {
    if (!batcherRef.current) {
      throw new Error('Batcher not initialized');
    }
    return batcherRef.current.request(key);
  }, []);

  const clear = useCallback(() => {
    batcherRef.current?.clear();
  }, []);

  return { request, clear };
}

/**
 * Example: Batch fetch user profiles
 */
export function useBatchedUserProfiles() {
  return useBatchedRequests<string, any>(
    async (userIds) => {
      // This would be replaced with actual Supabase call
      const results = new Map();
      // Simulated batch fetch
      console.log('Batching request for user IDs:', userIds);
      return results;
    },
    {
      batchDelay: 50,
      maxBatchSize: 50,
    }
  );
}
