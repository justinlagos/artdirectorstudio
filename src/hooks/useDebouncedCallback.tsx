import { useEffect, useRef, useCallback } from 'react';
import { debounce } from '@/lib/requestOptimization';

/**
 * Hook for creating a debounced callback
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds
 * @param deps - Dependencies for the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): [(...args: Parameters<T>) => void, { cancel: () => void; flush: () => void }] {
  const callbackRef = useRef(callback);
  const debouncedRef = useRef<ReturnType<typeof debounce>>();

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create debounced function
  useEffect(() => {
    debouncedRef.current = debounce(
      (...args: Parameters<T>) => callbackRef.current(...args),
      delay
    );

    return () => {
      debouncedRef.current?.cancel();
    };
  }, [delay, ...deps]);

  const cancel = useCallback(() => {
    debouncedRef.current?.cancel();
  }, []);

  const flush = useCallback(() => {
    debouncedRef.current?.flush();
  }, []);

  return [
    useCallback((...args: Parameters<T>) => {
      debouncedRef.current?.(...args);
    }, []),
    { cancel, flush },
  ];
}
