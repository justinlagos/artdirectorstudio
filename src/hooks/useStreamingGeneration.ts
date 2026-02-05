import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GenerationOptions } from '@/components/ImageGenerationDialog';
import { convertToBackendFormat } from '@/lib/generationParams';

/**
 * SSE event types matching backend sse.ts
 */
interface SSEProgressEvent {
  type: 'progress';
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
}

interface SSECompleteEvent {
  type: 'complete';
  image: string;
  assetId?: string;
  message: string;
}

interface SSEErrorEvent {
  type: 'error';
  error: string;
  errorType?: string;
  requestId: string;
  retryable: boolean;
}

type SSEEvent = SSEProgressEvent | SSECompleteEvent | SSEErrorEvent;

/**
 * Streaming generation state
 */
export interface StreamingGenerationState {
  isConnected: boolean;
  isGenerating: boolean;
  progress: number;
  stage: string;
  message: string;
  imageUrl: string | null;
  assetId: string | null;
  error: Error | null;
  streamingEnabled: boolean;
}

/**
 * Options for streaming generation hook
 */
export interface StreamingGenerationOptions {
  onProgress?: (progress: number, stage: string, message: string) => void;
  onComplete?: (imageUrl: string, assetId?: string) => void;
  onError?: (error: Error) => void;
  fallbackGenerator?: (prompt: string, options: GenerationOptions) => Promise<string | null>;
  fallbackOnStreamError?: boolean;
}

const initialState: StreamingGenerationState = {
  isConnected: false,
  isGenerating: false,
  progress: 0,
  stage: '',
  message: '',
  imageUrl: null,
  assetId: null,
  error: null,
  streamingEnabled: true,
};

/**
 * Hook for streaming image generation with SSE support and automatic fallback
 */
export function useStreamingGeneration(options: StreamingGenerationOptions = {}) {
  const { fallbackOnStreamError = true, fallbackGenerator } = options;

  const [state, setState] = useState<StreamingGenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check if streaming is supported in current browser
   */
  const isStreamingSupported = useCallback((): boolean => {
    return typeof ReadableStream !== 'undefined' && typeof TextDecoder !== 'undefined';
  }, []);

  /**
   * Parse SSE data line into event object
   */
  const parseSSELine = useCallback((line: string): SSEEvent | null => {
    if (!line.startsWith('data: ')) return null;
    try {
      return JSON.parse(line.slice(6)) as SSEEvent;
    } catch {
      console.warn('[Streaming] Failed to parse SSE line:', line);
      return null;
    }
  }, []);

  /**
   * Handle incoming SSE events
   */
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'progress':
        setState(prev => ({
          ...prev,
          isConnected: true,
          progress: event.progress,
          stage: event.stage,
          message: event.message,
        }));
        options.onProgress?.(event.progress, event.stage, event.message);
        break;

      case 'complete':
        setState(prev => ({
          ...prev,
          isGenerating: false,
          isConnected: false,
          progress: 100,
          stage: 'complete',
          message: 'Complete!',
          imageUrl: event.image,
          assetId: event.assetId || null,
        }));
        options.onComplete?.(event.image, event.assetId);
        break;

      case 'error':
        const error = new Error(event.error);
        (error as any).requestId = event.requestId;
        (error as any).errorType = event.errorType;
        (error as any).retryable = event.retryable;
        setState(prev => ({
          ...prev,
          isGenerating: false,
          isConnected: false,
          error,
        }));
        options.onError?.(error);
        break;
    }
  }, [options]);

  /**
   * Fall back to standard generation (simulated progress)
   */
  const fallbackToStandardGeneration = useCallback(async (
    prompt: string,
    genOptions: GenerationOptions
  ): Promise<string | null> => {
    if (!fallbackGenerator) {
      throw new Error('No fallback generator provided');
    }

    console.log('[Streaming] Falling back to standard generation');
    setState(prev => ({ ...prev, streamingEnabled: false }));

    // Simulate progress during fallback
    let currentProgress = 10;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 8, 90);
      setState(prev => ({
        ...prev,
        progress: currentProgress,
        message: currentProgress < 30 ? 'Processing your prompt...' :
                 currentProgress < 60 ? 'AI is creating your image...' :
                 'Adding final touches...',
      }));
    }, 1200);

    try {
      const imageUrl = await fallbackGenerator(prompt, genOptions);
      clearInterval(progressInterval);

      if (imageUrl) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          progress: 100,
          stage: 'complete',
          message: 'Complete!',
          imageUrl,
        }));
        options.onComplete?.(imageUrl);
      }

      return imageUrl;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }, [fallbackGenerator, options]);

  /**
   * Generate image with SSE streaming
   */
  const generate = useCallback(async (
    prompt: string,
    genOptions: GenerationOptions
  ): Promise<string | null> => {
    // Reset state
    setState({
      ...initialState,
      isGenerating: true,
      streamingEnabled: isStreamingSupported(),
    });

    // If streaming not supported, fall back immediately
    if (!isStreamingSupported()) {
      console.log('[Streaming] Browser does not support streaming, using fallback');
      if (fallbackOnStreamError && fallbackGenerator) {
        return fallbackToStandardGeneration(prompt, genOptions);
      }
      throw new Error('Streaming not supported in this browser');
    }

    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to continue.');
      }

      // Get the Supabase URL from the client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const url = `${supabaseUrl}/functions/v1/generate-image`;

      // Make SSE request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          ...convertToBackendFormat(genOptions),
        }),
        signal: abortControllerRef.current.signal,
      });

      // Check if response is SSE
      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('text/event-stream')) {
        // Server returned JSON instead of SSE - fall back
        console.log('[Streaming] Server returned non-SSE response, falling back');
        if (fallbackOnStreamError && fallbackGenerator) {
          return fallbackToStandardGeneration(prompt, genOptions);
        }

        // Try to parse JSON error
        try {
          const jsonResponse = await response.json();
          if (jsonResponse.error) {
            throw new Error(jsonResponse.error);
          }
          // If it's a success response, use it
          if (jsonResponse.image) {
            setState(prev => ({
              ...prev,
              isGenerating: false,
              progress: 100,
              stage: 'complete',
              message: 'Complete!',
              imageUrl: jsonResponse.image,
              assetId: jsonResponse.assetId,
              streamingEnabled: false,
            }));
            options.onComplete?.(jsonResponse.image, jsonResponse.assetId);
            return jsonResponse.image;
          }
        } catch {
          // Ignore parse errors
        }
        throw new Error('Streaming not available');
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      setState(prev => ({ ...prev, isConnected: true }));

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let resultImageUrl: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const event = parseSSELine(line.trim());
            if (event) {
              handleSSEEvent(event);
              if (event.type === 'complete') {
                resultImageUrl = event.image;
              }
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const event = parseSSELine(buffer.trim());
        if (event) {
          handleSSEEvent(event);
          if (event.type === 'complete') {
            resultImageUrl = event.image;
          }
        }
      }

      return resultImageUrl;

    } catch (error) {
      // Handle abort
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, isGenerating: false, isConnected: false }));
        return null;
      }

      console.error('[Streaming] SSE error:', error);

      // Try fallback on error
      if (fallbackOnStreamError && fallbackGenerator) {
        console.log('[Streaming] SSE failed, attempting fallback');
        try {
          return await fallbackToStandardGeneration(prompt, genOptions);
        } catch (fallbackError) {
          // Fallback also failed
          const finalError = fallbackError as Error;
          setState(prev => ({
            ...prev,
            isGenerating: false,
            isConnected: false,
            error: finalError,
          }));
          options.onError?.(finalError);
          throw finalError;
        }
      }

      // No fallback or fallback disabled
      const finalError = error as Error;
      setState(prev => ({
        ...prev,
        isGenerating: false,
        isConnected: false,
        error: finalError,
      }));
      options.onError?.(finalError);
      throw finalError;
    }
  }, [
    isStreamingSupported,
    fallbackOnStreamError,
    fallbackGenerator,
    fallbackToStandardGeneration,
    parseSSELine,
    handleSSEEvent,
    options,
  ]);

  /**
   * Abort ongoing generation
   */
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      isGenerating: false,
      isConnected: false,
    }));
  }, []);

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  return {
    state,
    generate,
    abort,
    reset,
  };
}
