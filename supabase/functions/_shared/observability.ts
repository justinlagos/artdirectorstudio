/**
 * Structured Logging and Observability
 * 
 * All edge functions must log structured events for debugging and analytics
 */

export interface LogEvent {
  request_id: string;
  user_id?: string;
  operation: string;
  action: string;
  timestamp: string;
  duration_ms?: number;
  success?: boolean;
  error_message?: string;
  error_type?: string;
  normalized_params?: Record<string, unknown>;
  prompt_version?: string;
  model_used?: string;
  [key: string]: unknown;
}

/**
 * Logs a structured event
 * In production, this could be sent to a logging service
 */
export function logEvent(event: LogEvent): void {
  // In Deno, console.log with JSON.stringify is the standard way to log
  // This ensures structured, parseable logs
  console.log(JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  }));
}

/**
 * Creates a log event builder for consistent logging
 */
export function createLogger(requestId: string, userId?: string) {
  return {
    log: (operation: string, action: string, data?: Record<string, unknown>) => {
      logEvent({
        request_id: requestId,
        user_id: userId,
        operation,
        action,
        timestamp: new Date().toISOString(),
        ...data,
      });
    },
    logStart: (operation: string, data?: Record<string, unknown>) => {
      logEvent({
        request_id: requestId,
        user_id: userId,
        operation,
        action: `${operation}_start`,
        timestamp: new Date().toISOString(),
        ...data,
      });
    },
    logSuccess: (operation: string, durationMs: number, data?: Record<string, unknown>) => {
      logEvent({
        request_id: requestId,
        user_id: userId,
        operation,
        action: `${operation}_success`,
        timestamp: new Date().toISOString(),
        duration_ms: durationMs,
        success: true,
        ...data,
      });
    },
    logError: (operation: string, error: Error | string, durationMs?: number, data?: Record<string, unknown>) => {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      logEvent({
        request_id: requestId,
        user_id: userId,
        operation,
        action: `${operation}_error`,
        timestamp: new Date().toISOString(),
        duration_ms: durationMs,
        success: false,
        error_message: errorMessage,
        error_type: errorType,
        ...data,
      });
    },
    logParams: (operation: string, normalizedParams: Record<string, unknown>, promptVersion?: string, modelUsed?: string) => {
      logEvent({
        request_id: requestId,
        user_id: userId,
        operation,
        action: `${operation}_params`,
        timestamp: new Date().toISOString(),
        normalized_params: normalizedParams,
        prompt_version: promptVersion,
        model_used: modelUsed,
      });
    },
  };
}
