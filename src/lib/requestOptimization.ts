/**
 * Request optimization utilities for debouncing and batching API calls
 */

interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
      lastArgs = null;
    }, wait);
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = function (this: any) {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func.apply(this, lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

/**
 * Throttle function - ensures function is called at most once per wait period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, wait);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Request batcher - batches multiple requests into a single call
 */
export class RequestBatcher<TKey, TValue> {
  private queue: Map<TKey, Array<(value: TValue | Error) => void>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly batchDelay: number;
  private readonly maxBatchSize: number;
  private readonly batchFn: (keys: TKey[]) => Promise<Map<TKey, TValue>>;

  constructor(
    batchFn: (keys: TKey[]) => Promise<Map<TKey, TValue>>,
    options: {
      batchDelay?: number;
      maxBatchSize?: number;
    } = {}
  ) {
    this.batchFn = batchFn;
    this.batchDelay = options.batchDelay ?? 50; // 50ms default
    this.maxBatchSize = options.maxBatchSize ?? 100;
  }

  /**
   * Add a request to the batch
   */
  async request(key: TKey): Promise<TValue> {
    return new Promise<TValue>((resolve, reject) => {
      // Add to queue
      const callbacks = this.queue.get(key) || [];
      callbacks.push((value) => {
        if (value instanceof Error) {
          reject(value);
        } else {
          resolve(value);
        }
      });
      this.queue.set(key, callbacks);

      // Schedule batch execution
      if (this.queue.size >= this.maxBatchSize) {
        // Execute immediately if max batch size reached
        this.executeBatch();
      } else if (!this.batchTimeout) {
        // Schedule execution after delay
        this.batchTimeout = setTimeout(() => {
          this.executeBatch();
        }, this.batchDelay);
      }
    });
  }

  /**
   * Execute the batch
   */
  private async executeBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const currentQueue = new Map(this.queue);
    this.queue.clear();

    if (currentQueue.size === 0) return;

    try {
      const keys = Array.from(currentQueue.keys());
      const results = await this.batchFn(keys);

      // Resolve all promises
      currentQueue.forEach((callbacks, key) => {
        const value = results.get(key);
        callbacks.forEach((callback) => {
          if (value !== undefined) {
            callback(value);
          } else {
            callback(new Error(`No result for key: ${key}`));
          }
        });
      });
    } catch (error) {
      // Reject all promises with the error
      currentQueue.forEach((callbacks) => {
        callbacks.forEach((callback) => {
          callback(error instanceof Error ? error : new Error(String(error)));
        });
      });
    }
  }

  /**
   * Clear the queue without executing
   */
  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.queue.clear();
  }
}

/**
 * Cache with TTL support
 */
export class RequestCache<TKey, TValue> {
  private cache: Map<TKey, { value: TValue; expiresAt: number }> = new Map();
  private readonly ttl: number;

  constructor(ttl: number = 60000) {
    // 1 minute default
    this.ttl = ttl;
  }

  get(key: TKey): TValue | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: TKey, value: TValue): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  delete(key: TKey): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: TKey): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Deduplication utility - prevents duplicate concurrent requests
 */
export class RequestDeduplicator<TKey, TValue> {
  private pending: Map<TKey, Promise<TValue>> = new Map();

  async request(key: TKey, fetcher: () => Promise<TValue>): Promise<TValue> {
    // Check if request is already pending
    const existing = this.pending.get(key);
    if (existing) {
      return existing;
    }

    // Create new request
    const promise = fetcher()
      .then((result) => {
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear(key?: TKey): void {
    if (key) {
      this.pending.delete(key);
    } else {
      this.pending.clear();
    }
  }
}
