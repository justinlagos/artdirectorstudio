/**
 * SSE (Server-Sent Events) utilities for streaming progress from edge functions.
 * Used for real-time generation feedback.
 */

// SSE event types for generation progress
export interface SSEProgressEvent {
  type: 'progress';
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
}

export interface SSECompleteEvent {
  type: 'complete';
  image: string;
  assetId?: string;
  message: string;
}

export interface SSEErrorEvent {
  type: 'error';
  error: string;
  errorType?: string;
  requestId: string;
  retryable: boolean;
}

export type SSEEvent = SSEProgressEvent | SSECompleteEvent | SSEErrorEvent;

/**
 * Format an SSE event as a data line for streaming
 */
export function formatSSEMessage(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Get SSE response headers merged with CORS headers
 */
export function getSSEHeaders(corsHeaders: Record<string, string>): Record<string, string> {
  return {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
}

/**
 * Create a progress event
 */
export function createProgressEvent(
  stage: string,
  progress: number,
  message: string
): SSEProgressEvent {
  return {
    type: 'progress',
    stage,
    progress,
    message,
    timestamp: Date.now(),
  };
}

/**
 * Create a completion event
 */
export function createCompleteEvent(
  image: string,
  assetId?: string,
  message: string = 'Image generated successfully'
): SSECompleteEvent {
  return {
    type: 'complete',
    image,
    assetId,
    message,
  };
}

/**
 * Create an error event
 */
export function createErrorEvent(
  error: string,
  requestId: string,
  errorType?: string,
  retryable: boolean = false
): SSEErrorEvent {
  return {
    type: 'error',
    error,
    errorType,
    requestId,
    retryable,
  };
}
