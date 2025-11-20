/**
 * Request deduplication utility
 * Prevents duplicate API calls when users click buttons multiple times
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const activeRequests = new Map<string, PendingRequest<any>>();
const DEFAULT_TTL = 5000; // 5 seconds

/**
 * Deduplicate requests with the same key
 * If a request with the same key is already in progress, return the existing promise
 * 
 * @param key - Unique identifier for the request (e.g., "generate:prompt:options")
 * @param fn - Function that returns a promise
 * @param ttl - Time to live in milliseconds (default: 5000)
 * @returns Promise result
 */
export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const now = Date.now();
  
  // Check if request is already in flight and not expired
  const existing = activeRequests.get(key);
  if (existing && (now - existing.timestamp) < ttl) {
    if (import.meta.env.DEV) {
      console.log(`[Dedup] Returning cached promise for: ${key}`);
    }
    return existing.promise as Promise<T>;
  }
  
  // Execute new request
  if (import.meta.env.DEV) {
    console.log(`[Dedup] Executing new request: ${key}`);
  }
  
  const promise = fn();
  activeRequests.set(key, { promise, timestamp: now });
  
  // Clean up after completion or TTL
  promise.finally(() => {
    setTimeout(() => {
      const current = activeRequests.get(key);
      if (current && current.timestamp === now) {
        activeRequests.delete(key);
        if (import.meta.env.DEV) {
          console.log(`[Dedup] Cleaned up request: ${key}`);
        }
      }
    }, ttl);
  });
  
  return promise;
}

/**
 * Create a stable key from parameters
 * @param parts - Array of values to include in key
 * @returns Stable string key
 */
export function createRequestKey(...parts: (string | number | boolean | object)[]): string {
  return parts.map(part => {
    if (typeof part === 'object') {
      return JSON.stringify(part);
    }
    return String(part);
  }).join(':');
}

/**
 * Force clear all pending requests (for cleanup/reset)
 */
export function clearAllPendingRequests(): void {
  activeRequests.clear();
  if (import.meta.env.DEV) {
    console.log('[Dedup] Cleared all pending requests');
  }
}

/**
 * Get debug info about pending requests
 */
export function getDeduplicationState() {
  return {
    activeCount: activeRequests.size,
    keys: Array.from(activeRequests.keys()),
  };
}
