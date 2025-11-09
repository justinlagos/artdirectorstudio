import { useState, useCallback } from 'react';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryState {
  isRetrying: boolean;
  currentAttempt: number;
  lastError: Error | null;
}

/**
 * Client-side retry hook with exponential backoff and jitter
 * Provides retry state management for failed API calls
 */
export function useRetryWithBackoff() {
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    currentAttempt: 0,
    lastError: null,
  });

  const fetchWithRetry = useCallback(
    async <T = any>(
      fetchFn: () => Promise<Response>,
      options: RetryOptions = {}
    ): Promise<T> => {
      const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 30000,
        retryableStatuses = [408, 429, 500, 502, 503, 504],
        onRetry,
      } = options;

      let lastError: Error | null = null;
      let lastResponse: Response | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          setRetryState({
            isRetrying: attempt > 0,
            currentAttempt: attempt,
            lastError: null,
          });

          const response = await fetchFn();

          // Check if response status is retryable
          if (!response.ok && retryableStatuses.includes(response.status) && attempt < maxRetries) {
            lastResponse = response.clone();
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            const error = new Error(errorData.error || `Request failed with status ${response.status}`);
            lastError = error;

            // Calculate exponential backoff with jitter
            const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
            const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
            const delay = exponentialDelay + jitter;

            console.log(
              `[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed with ${response.status}, retrying in ${Math.round(delay)}ms...`
            );

            setRetryState({
              isRetrying: true,
              currentAttempt: attempt + 1,
              lastError: error,
            });

            if (onRetry) {
              onRetry(attempt + 1, error);
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Success - parse and return
          if (response.ok) {
            const data = await response.json();
            setRetryState({
              isRetrying: false,
              currentAttempt: 0,
              lastError: null,
            });
            return data;
          }

          // Non-retryable error status
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        } catch (error) {
          lastError = error as Error;

          // Check if error is retryable (network errors)
          const isRetryable =
            error instanceof Error &&
            (error.message.includes('fetch') ||
              error.message.includes('network') ||
              error.message.includes('timeout'));

          if (isRetryable && attempt < maxRetries) {
            // Calculate exponential backoff with jitter
            const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
            const jitter = Math.random() * 0.3 * exponentialDelay;
            const delay = exponentialDelay + jitter;

            console.log(
              `[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed with ${error.message}, retrying in ${Math.round(delay)}ms...`
            );

            setRetryState({
              isRetrying: true,
              currentAttempt: attempt + 1,
              lastError: error,
            });

            if (onRetry) {
              onRetry(attempt + 1, error);
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Non-retryable error or max retries reached
          setRetryState({
            isRetrying: false,
            currentAttempt: 0,
            lastError: error,
          });
          throw error;
        }
      }

      // Max retries reached
      setRetryState({
        isRetrying: false,
        currentAttempt: 0,
        lastError: lastError,
      });

      if (lastResponse && !lastResponse.ok) {
        const errorData = await lastResponse.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed after ${maxRetries + 1} attempts`);
      }

      throw lastError || new Error(`Request failed after ${maxRetries + 1} attempts`);
    },
    []
  );

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      currentAttempt: 0,
      lastError: null,
    });
  }, []);

  return {
    fetchWithRetry,
    retryState,
    reset,
  };
}
