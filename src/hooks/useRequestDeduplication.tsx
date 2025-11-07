import { useRef, useCallback } from 'react';
import { RequestDeduplicator } from '@/lib/requestOptimization';

/**
 * Hook for deduplicating concurrent requests
 * Prevents multiple identical requests from being made simultaneously
 * 
 * @example
 * ```tsx
 * const { request } = useRequestDeduplication<User>();
 * 
 * // Multiple calls with same key will only trigger one API request
 * const user1 = await request('user-123', () => fetchUser('123'));
 * const user2 = await request('user-123', () => fetchUser('123')); // Uses same request
 * ```
 */
export function useRequestDeduplication<TValue>() {
  const deduplicatorRef = useRef<RequestDeduplicator<string, TValue>>();

  if (!deduplicatorRef.current) {
    deduplicatorRef.current = new RequestDeduplicator<string, TValue>();
  }

  const request = useCallback(
    async (key: string, fetcher: () => Promise<TValue>): Promise<TValue> => {
      if (!deduplicatorRef.current) {
        throw new Error('Deduplicator not initialized');
      }
      return deduplicatorRef.current.request(key, fetcher);
    },
    []
  );

  const clear = useCallback((key?: string) => {
    deduplicatorRef.current?.clear(key);
  }, []);

  return { request, clear };
}
