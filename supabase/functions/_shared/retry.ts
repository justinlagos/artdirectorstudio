/**
 * Retry logic with exponential backoff, jitter, and timeout
 * Implements industry-standard retry patterns for resilient API calls
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Wraps a fetch call with retry logic and timeout
 * Uses exponential backoff: delay = min(baseDelay * 2^attempt + jitter, maxDelay)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    timeoutMs = 60000,
    retryableStatuses = [408, 429, 500, 502, 503, 504],
    onRetry
  } = retryOptions;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Check if response status is retryable
      if (!response.ok && retryableStatuses.includes(response.status) && attempt < maxRetries) {
        lastResponse = response.clone();
        const error = new Error(`Request failed with status ${response.status}`);
        lastError = error;
        
        // Calculate exponential backoff with jitter
        const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
        const delay = exponentialDelay + jitter;
        
        console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed with ${response.status}, retrying in ${Math.round(delay)}ms...`);
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable (network errors, timeouts)
      const isRetryable = 
        error instanceof Error && 
        (error.name === 'AbortError' || 
         error.message.includes('fetch') ||
         error.message.includes('network'));
      
      if (isRetryable && attempt < maxRetries) {
        // Calculate exponential backoff with jitter
        const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = Math.random() * 0.3 * exponentialDelay;
        const delay = exponentialDelay + jitter;
        
        console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed with ${error.message}, retrying in ${Math.round(delay)}ms...`);
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-retryable error or max retries reached
      throw error;
    }
  }

  // If we have a response with error status, return it
  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error('Request failed after retries');
}
