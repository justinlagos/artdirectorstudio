/**
 * Human-friendly error messages for all tool operations
 * Replaces technical errors with actionable user guidance
 */
export const TOOL_ERROR_MESSAGES = {
  // File validation errors
  FILE_TOO_LARGE: "File is too large. Max 15 MB.",
  FILES_TOO_LARGE: "One or more files are too large. Max 15 MB per file.",
  INVALID_FORMAT: "Image format not supported. Use JPG or PNG.",
  INVALID_FILE_COUNT: "Please select between 2 and 4 images.",
  BATCH_FILE_COUNT: "Please select between 1 and 10 images.",
  
  // Network and API errors
  NETWORK_ERROR: "This did not complete. Try again or adjust inputs.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  RATE_LIMIT: "Too many requests. Please wait a minute and try again.",
  
  // Auth and access errors
  AUTH_REQUIRED: "Please sign in to use this feature.",
  CREDITS_EXHAUSTED: "Your credits are used up. Choose a plan to continue.",
  FEATURE_ACCESS_DENIED: "This feature requires a subscription. Upgrade to continue.",
  
  // Processing errors
  PROCESSING_FAILED: "Processing failed. Please try again.",
  UPLOAD_FAILED: "Upload failed. Check your connection and try again.",
  GENERATION_FAILED: "Generation failed. Adjust your inputs and try again.",
  
  // Generic fallback
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
} as const;

/**
 * Maps error codes or messages to user-friendly messages
 */
export function mapErrorMessage(error: any): string {
  if (typeof error === 'string') {
    // Check for specific error patterns
    if (error.includes('size') || error.includes('large')) {
      return TOOL_ERROR_MESSAGES.FILE_TOO_LARGE;
    }
    if (error.includes('format') || error.includes('type')) {
      return TOOL_ERROR_MESSAGES.INVALID_FORMAT;
    }
    if (error.includes('rate limit') || error.includes('429')) {
      return TOOL_ERROR_MESSAGES.RATE_LIMIT;
    }
    if (error.includes('credit') || error.includes('402')) {
      return TOOL_ERROR_MESSAGES.CREDITS_EXHAUSTED;
    }
    if (error.includes('auth') || error.includes('401')) {
      return TOOL_ERROR_MESSAGES.AUTH_REQUIRED;
    }
    if (error.includes('timeout')) {
      return TOOL_ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    if (error.includes('network') || error.includes('fetch')) {
      return TOOL_ERROR_MESSAGES.NETWORK_ERROR;
    }
  }
  
  // Check error object properties
  if (error?.message) {
    return mapErrorMessage(error.message);
  }
  
  if (error?.status === 429) return TOOL_ERROR_MESSAGES.RATE_LIMIT;
  if (error?.status === 402) return TOOL_ERROR_MESSAGES.CREDITS_EXHAUSTED;
  if (error?.status === 401) return TOOL_ERROR_MESSAGES.AUTH_REQUIRED;
  if (error?.status === 403) return TOOL_ERROR_MESSAGES.FEATURE_ACCESS_DENIED;
  
  return TOOL_ERROR_MESSAGES.UNKNOWN_ERROR;
}
