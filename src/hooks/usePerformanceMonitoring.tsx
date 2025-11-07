import { useEffect, useState } from 'react';
import { getPerformanceMetrics } from '@/lib/performanceMonitoring';

interface PerformanceMetrics {
  dns: number;
  tcp: number;
  ttfb: number;
  download: number;
  domInteractive: number;
  domComplete: number;
  fcp: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
}

/**
 * Hook to monitor and display current performance metrics
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      const currentMetrics = getPerformanceMetrics();
      setMetrics(currentMetrics as PerformanceMetrics);
      setIsLoading(false);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const currentMetrics = getPerformanceMetrics();
          setMetrics(currentMetrics as PerformanceMetrics);
          setIsLoading(false);
        }, 100);
      });
    }
  }, []);

  return { metrics, isLoading };
}

/**
 * Hook to track component render performance
 */
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      
      try {
        performance.measure(`${componentName}-render`, startMark, endMark);
        const measure = performance.getEntriesByName(`${componentName}-render`, 'measure')[0];
        
        if (import.meta.env.DEV && measure.duration > 16) {
          console.warn(
            `⚠️ Slow render detected: ${componentName} took ${Math.round(measure.duration)}ms`
          );
        }
      } catch (error) {
        // Silently fail if marks don't exist
      }
    };
  }, [componentName]);
}
