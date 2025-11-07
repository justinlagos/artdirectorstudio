import { useState } from 'react';

export type ToolState = 'idle' | 'validating' | 'processing' | 'success' | 'error';

export interface UseToolStateReturn {
  state: ToolState;
  error: string | null;
  isProcessing: boolean;
  reset: () => void;
  startValidating: () => void;
  startProcessing: () => void;
  handleSuccess: () => void;
  handleError: (message: string) => void;
}

/**
 * Unified state management hook for all tool dialogs
 * Ensures consistent state transitions: idle → validating → processing → success/error
 */
export function useToolState(): UseToolStateReturn {
  const [state, setState] = useState<ToolState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const reset = () => {
    setState('idle');
    setError(null);
    setIsProcessing(false);
  };

  const startValidating = () => {
    setState('validating');
    setError(null);
    setIsProcessing(false);
  };

  const startProcessing = () => {
    setState('processing');
    setError(null);
    setIsProcessing(true);
  };

  const handleSuccess = () => {
    setState('success');
    setIsProcessing(false);
    setError(null);
  };

  const handleError = (message: string) => {
    setState('error');
    setError(message);
    setIsProcessing(false);
  };

  return {
    state,
    error,
    isProcessing,
    reset,
    startValidating,
    startProcessing,
    handleSuccess,
    handleError
  };
}
