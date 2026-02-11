/**
 * Human-friendly error messages for edge functions
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File is too large. Max 15 MB.',
  INVALID_FORMAT: 'Image format not supported. Use JPG or PNG.',
  NETWORK_ERROR: 'This did not complete. Try again or adjust inputs.',
  RATE_LIMIT: 'Rate limit exceeded. Please wait a moment and try again.',
  CREDITS_EXHAUSTED: 'Credits exhausted. Please add credits to your workspace to continue.',
  INVALID_INPUT: 'Invalid input. Please check your data and try again.',
  PROCESSING_FAILED: 'Processing failed. Please try again.',
  PROVIDER_KEY_INVALID: 'AI image API key is invalid or missing. Set GOOGLE_AI_API_KEY (or OPENAI_API_KEY with AI_PROVIDER=openai) in Supabase Edge Function secrets.',
  PROVIDER_QUOTA_EXCEEDED: 'AI service quota exceeded. Please try again later.',
  PROVIDER_UNAVAILABLE: 'AI service is temporarily unavailable. Please try again later.',
} as const;

export interface ErrorResponse {
  error: string;
  errorType?: string;
  retryAfter?: number;
  requestId?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  errorType?: string,
  requestId?: string,
  details?: Record<string, unknown>
): { response: Response; errorData: ErrorResponse } {
  const errorData: ErrorResponse = {
    error: message,
    ...(errorType && { errorType }),
    ...(requestId && { requestId }),
    ...(details && { details }),
    retryable: status >= 500 || status === 429
  };

  const response = new Response(
    JSON.stringify(errorData),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      }
    }
  );

  return { response, errorData };
}

/**
 * Maps AI gateway errors to user-friendly messages
 */
export function mapAIError(status: number, errorText: string): string {
  const lower = (errorText || '').toLowerCase();
  if (
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid_api_key') ||
    lower.includes('incorrect api key') ||
    lower.includes('invalid x-goog-api-key') ||
    lower.includes('permission_denied') ||
    (status === 401 && (lower.includes('invalid') || lower.includes('key'))) ||
    (status === 403 && lower.includes('api'))
  ) {
    return ERROR_MESSAGES.PROVIDER_KEY_INVALID;
  }
  if (status === 429 || lower.includes('quota') || lower.includes('rate_limit') || lower.includes('rate limit')) {
    return lower.includes('quota') ? ERROR_MESSAGES.PROVIDER_QUOTA_EXCEEDED : ERROR_MESSAGES.RATE_LIMIT;
  }
  if (status === 402) {
    return ERROR_MESSAGES.CREDITS_EXHAUSTED;
  }
  if (status >= 500) {
    return ERROR_MESSAGES.PROVIDER_UNAVAILABLE;
  }
  return ERROR_MESSAGES.PROCESSING_FAILED;
}
