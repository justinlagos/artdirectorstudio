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
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    }
  );

  return { response, errorData };
}

/**
 * Maps AI gateway errors to user-friendly messages
 */
export function mapAIError(status: number, errorText: string): string {
  if (status === 429) {
    return ERROR_MESSAGES.RATE_LIMIT;
  }
  if (status === 402) {
    return ERROR_MESSAGES.CREDITS_EXHAUSTED;
  }
  if (status >= 500) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  return ERROR_MESSAGES.PROCESSING_FAILED;
}
