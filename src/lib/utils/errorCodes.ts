/**
 * Standardized error codes for operations
 */
export const ErrorCodes = {
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  RLS_BLOCK: 'RLS_BLOCK',
  PRICE_MAP_MISSING: 'PRICE_MAP_MISSING',
  MODEL_EMPTY: 'MODEL_EMPTY',
  STRIPE_IDEMP_DUP: 'STRIPE_IDEMP_DUP',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  REGION_RESTRICTED: 'REGION_RESTRICTED',
  BALANCE_CHECK_FAILED: 'BALANCE_CHECK_FAILED',
  TRANSACTION_LOG_FAILED: 'TRANSACTION_LOG_FAILED',
  CREDIT_DEDUCTION_FAILED: 'CREDIT_DEDUCTION_FAILED',
  NO_IMAGE_RETURNED: 'NO_IMAGE_RETURNED',
  INVALID_INPUT: 'INVALID_INPUT',
  RESERVATION_FAILED: 'RESERVATION_FAILED',
  COMMIT_FAILED: 'COMMIT_FAILED',
  REFUND_FAILED: 'REFUND_FAILED',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Error code to user-friendly message mapping
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  INSUFFICIENT_CREDITS: "You don't have enough credits for this operation.",
  RLS_BLOCK: "Access denied. Please check your permissions.",
  PRICE_MAP_MISSING: "Pricing configuration error. Contact support.",
  MODEL_EMPTY: "AI model returned no result. Please try again.",
  STRIPE_IDEMP_DUP: "Payment already processed.",
  TIMEOUT: "Operation timed out. Please try again.",
  NETWORK_ERROR: "Network error. Check your connection.",
  REGION_RESTRICTED: "This feature is not available in your region.",
  BALANCE_CHECK_FAILED: "Unable to verify credit balance.",
  TRANSACTION_LOG_FAILED: "Transaction logging failed.",
  CREDIT_DEDUCTION_FAILED: "Failed to process credits.",
  NO_IMAGE_RETURNED: "No image was generated. Credits refunded.",
  INVALID_INPUT: "Invalid input provided.",
  RESERVATION_FAILED: "Credit reservation failed.",
  COMMIT_FAILED: "Failed to finalize transaction.",
  REFUND_FAILED: "Credit refund failed.",
  TRANSACTION_NOT_FOUND: "Transaction not found.",
  UNKNOWN: "An unexpected error occurred.",
};

/**
 * Parse error code from error message or object
 */
export function parseErrorCode(error: any): ErrorCode {
  if (!error) return ErrorCodes.UNKNOWN;
  
  const errorMsg = typeof error === 'string' 
    ? error 
    : error?.message || error?.error || '';
  
  // Check if error message contains known code
  for (const [key, code] of Object.entries(ErrorCodes)) {
    if (errorMsg.includes(code)) {
      return code;
    }
  }
  
  // Fuzzy matching for common patterns
  const lowerMsg = errorMsg.toLowerCase();
  
  if (lowerMsg.includes('insufficient') && lowerMsg.includes('credit')) {
    return ErrorCodes.INSUFFICIENT_CREDITS;
  }
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return ErrorCodes.TIMEOUT;
  }
  if (lowerMsg.includes('network') || lowerMsg.includes('connection')) {
    return ErrorCodes.NETWORK_ERROR;
  }
  if (lowerMsg.includes('region') || lowerMsg.includes('country')) {
    return ErrorCodes.REGION_RESTRICTED;
  }
  if (lowerMsg.includes('no image') || lowerMsg.includes('empty')) {
    return ErrorCodes.MODEL_EMPTY;
  }
  
  return ErrorCodes.UNKNOWN;
}

/**
 * Get user-friendly message for error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] || ErrorMessages.UNKNOWN;
}

/**
 * Debug info structure
 */
export interface DebugInfo {
  operation: 'analyze' | 'blend' | 'upscale' | 'batch' | 'generate';
  requestId: string;
  edgeFunction: string;
  errorCode: ErrorCode;
  timestamp: string;
}

/**
 * Format debug info for copying
 */
export function formatDebugInfo(info: DebugInfo): string {
  return `Operation: ${info.operation}
Request ID: ${info.requestId}
Edge Function: ${info.edgeFunction}
Error Code: ${info.errorCode}
Timestamp: ${info.timestamp}`;
}

/**
 * Copy debug info to clipboard
 */
export async function copyDebugInfo(info: DebugInfo): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatDebugInfo(info));
    return true;
  } catch (err) {
    console.error('Failed to copy debug info:', err);
    return false;
  }
}
