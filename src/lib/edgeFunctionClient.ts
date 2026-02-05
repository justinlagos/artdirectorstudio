import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EdgeFunctionOptions<T = unknown> {
  functionName: string;
  body: Record<string, unknown>;
  retries?: number;
  showToast?: boolean;
  toastErrorTitle?: string;
  headers?: Record<string, string>;
}

interface EdgeFunctionError extends Error {
  code?: string;
  status?: number;
  isRetryable?: boolean;
}

/**
 * Robust edge function client with retry logic and error handling
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Schema cache error detection and handling
 * - CORS error detection
 * - User-friendly error messages
 * - Optional toast notifications
 */
export async function callEdgeFunction<T = unknown>({
  functionName,
  body,
  retries = 2,
  showToast = true,
  toastErrorTitle = "Request Failed",
  headers = {},
}: EdgeFunctionOptions<T>): Promise<T> {
  let lastError: EdgeFunctionError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers,
      });

      if (error) {
        const edgeError = createEdgeFunctionError(error);

        // Schema cache error - retry after delay
        if (edgeError.isRetryable && attempt < retries) {
          console.log(`[EdgeFunction] Retry ${attempt + 1}/${retries} for ${functionName} (${edgeError.code})`);
          await delay(getBackoffDelay(attempt));
          continue;
        }

        throw edgeError;
      }

      // Check for error in response body
      if (data?.error) {
        throw createEdgeFunctionError(data.error);
      }

      return data as T;
    } catch (error) {
      lastError = error as EdgeFunctionError;

      // Don't retry non-retryable errors
      if (!lastError.isRetryable) {
        break;
      }

      if (attempt < retries) {
        console.log(`[EdgeFunction] Retry ${attempt + 1}/${retries} for ${functionName}`);
        await delay(getBackoffDelay(attempt));
        continue;
      }
    }
  }

  const errorMessage = getUserFriendlyMessage(lastError);

  if (showToast) {
    toast.error(toastErrorTitle, {
      description: errorMessage,
    });
  }

  throw lastError || new Error(errorMessage);
}

/**
 * Call edge function without throwing - returns result or null
 */
export async function callEdgeFunctionSafe<T = unknown>(
  options: EdgeFunctionOptions<T>
): Promise<{ data: T | null; error: EdgeFunctionError | null }> {
  try {
    const data = await callEdgeFunction<T>({ ...options, showToast: false });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as EdgeFunctionError };
  }
}

/**
 * Create a standardized error from various error formats
 */
function createEdgeFunctionError(error: unknown): EdgeFunctionError {
  const edgeError = new Error() as EdgeFunctionError;

  if (error instanceof Error) {
    edgeError.message = error.message;
    edgeError.name = error.name;
    edgeError.stack = error.stack;
  } else if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    edgeError.message = String(errorObj.message || errorObj.error || 'Unknown error');
    edgeError.code = String(errorObj.code || '');
    edgeError.status = typeof errorObj.status === 'number' ? errorObj.status : undefined;
  } else {
    edgeError.message = String(error);
  }

  // Determine if error is retryable
  edgeError.isRetryable = isRetryableError(edgeError);
  edgeError.code = categorizeError(edgeError);

  return edgeError;
}

/**
 * Check if an error should trigger a retry
 */
function isRetryableError(error: EdgeFunctionError): boolean {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Schema cache errors are retryable
  if (
    message.includes('schema cache') ||
    message.includes('stale') ||
    message.includes('pgrst202') ||
    message.includes('could not find')
  ) {
    return true;
  }

  // Network errors are retryable
  if (
    name === 'functionsfetcherror' ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('net::err_failed')
  ) {
    return true;
  }

  // 5xx errors are retryable
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }

  // Rate limiting is retryable
  if (error.status === 429) {
    return true;
  }

  return false;
}

/**
 * Categorize error for tracking and handling
 */
function categorizeError(error: EdgeFunctionError): string {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  if (message.includes('cors')) {
    return 'CORS_ERROR';
  }

  if (
    message.includes('schema cache') ||
    message.includes('pgrst202') ||
    message.includes('could not find the function')
  ) {
    return 'SCHEMA_CACHE_ERROR';
  }

  if (name === 'functionsfetcherror' || message.includes('failed to fetch')) {
    return 'NETWORK_ERROR';
  }

  if (message.includes('unauthorized') || message.includes('auth')) {
    return 'AUTH_ERROR';
  }

  if (error.status === 429) {
    return 'RATE_LIMIT_ERROR';
  }

  if (error.status && error.status >= 500) {
    return 'SERVER_ERROR';
  }

  if (error.status && error.status >= 400 && error.status < 500) {
    return 'CLIENT_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: EdgeFunctionError | null): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (error.code) {
    case 'CORS_ERROR':
      return 'Network configuration issue. Please refresh the page and try again.';

    case 'SCHEMA_CACHE_ERROR':
      return 'Service is initializing. Please wait a moment and try again.';

    case 'NETWORK_ERROR':
      return 'Unable to connect to the server. Please check your internet connection.';

    case 'AUTH_ERROR':
      return 'Authentication required. Please sign in and try again.';

    case 'RATE_LIMIT_ERROR':
      return 'Too many requests. Please wait a moment and try again.';

    case 'SERVER_ERROR':
      return 'Server error. Our team has been notified. Please try again later.';

    default:
      // Return the original message if it's user-friendly enough
      if (error.message && error.message.length < 100 && !error.message.includes('Error:')) {
        return error.message;
      }
      return 'Request failed. Please try again.';
  }
}

/**
 * Calculate backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponentialDelay + jitter);
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
