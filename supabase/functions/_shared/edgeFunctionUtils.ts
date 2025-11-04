/**
 * Shared Edge Function Utilities
 * Provides standardized error handling, CORS, logging, and retry logic
 */

// Standard CORS headers for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Structured error response type
export interface ErrorResponse {
  error: string;
  code?: string;
  correlationId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Success response wrapper
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  correlationId: string;
  timestamp: string;
}

// Generate correlation ID for request tracing
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Handle CORS preflight
export function handleCorsPreflightRequest(): Response {
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}

// Create structured error response
export function createErrorResponse(
  error: unknown,
  correlationId: string,
  statusCode = 500,
  code?: string
): Response {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  const errorResponse: ErrorResponse = {
    error: errorMessage,
    code,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  console.error(`[${correlationId}] Error:`, {
    message: errorMessage,
    code,
    statusCode,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Create structured success response
export function createSuccessResponse<T>(
  data: T,
  correlationId: string,
  statusCode = 200
): Response {
  const successResponse: SuccessResponse<T> = {
    success: true,
    data,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  console.log(`[${correlationId}] Success:`, { statusCode });

  return new Response(
    JSON.stringify(successResponse),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Exponential backoff with jitter for retries
export function calculateBackoffDelay(attempt: number, baseDelay = 1000, maxDelay = 10000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.floor(exponentialDelay + jitter);
}

// Retry function with exponential backoff and jitter
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  shouldRetry: (error: unknown) => boolean = () => true,
  correlationId = generateCorrelationId()
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt);
      console.log(`[${correlationId}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Check if error is retryable (network, timeout, or 5xx)
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Response) {
    const status = error.status;
    return status === 408 || status === 429 || status >= 500;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('fetch failed') ||
           message.includes('econnreset');
  }
  
  return false;
}

// Validate required environment variables
export function validateEnvVars(required: string[], correlationId: string): void {
  const missing = required.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    console.error(`[${correlationId}] Missing environment variables:`, missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Fetch with timeout
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30000,
  correlationId = generateCorrelationId()
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[${correlationId}] Fetch: ${url} (timeout: ${timeoutMs}ms)`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Log request details
export function logRequest(
  method: string,
  path: string,
  correlationId: string,
  details?: Record<string, unknown>
): void {
  console.log(`[${correlationId}] ${method} ${path}`, {
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// Parse and extract user ID from JWT
export function extractUserIdFromJWT(authHeader: string | null, correlationId: string): string {
  if (!authHeader) {
    throw new Error('No authorization header provided');
  }

  const token = authHeader.replace('Bearer ', '');
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  try {
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      throw new Error('No user ID in JWT payload');
    }

    console.log(`[${correlationId}] Authenticated user:`, userId);
    return userId;
  } catch (error) {
    console.error(`[${correlationId}] JWT parsing error:`, error);
    throw new Error('Invalid JWT token');
  }
}
