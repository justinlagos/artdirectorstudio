// Performance monitoring with Core Web Vitals (FCP, LCP, INP, CLS, TTFB)
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  url: string;
  timestamp: Date;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
}

/**
 * Rating thresholds for Core Web Vitals
 */
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Get metric rating based on value and thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric for reporting
 */
function formatMetric(metric: Metric): PerformanceMetric {
  return {
    name: metric.name,
    value: Math.round(metric.value),
    rating: getRating(metric.name, metric.value),
    delta: Math.round(metric.delta),
    id: metric.id,
    navigationType: metric.navigationType,
  };
}

/**
 * Send metrics to backend analytics
 */
async function sendToAnalytics(metrics: PerformanceMetric[]): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get connection info if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    const report: PerformanceReport = {
      metrics,
      url: window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      connectionType: connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group('📊 Performance Metrics');
      metrics.forEach(metric => {
        const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(`${emoji} ${metric.name}: ${metric.value}ms (${metric.rating})`);
      });
      console.log('📱 Device Info:', {
        connection: report.connectionType,
        memory: report.deviceMemory,
      });
      console.groupEnd();
    }

    // Store in database for analytics (optional - table may not exist)
    try {
      const { error } = await supabase.from('performance_metrics' as any).insert({
        user_id: user?.id,
        metrics: report.metrics,
        url: report.url,
        user_agent: report.userAgent,
        connection_type: report.connectionType,
        device_memory: report.deviceMemory,
      });

      if (error && !error.message.includes('relation "performance_metrics" does not exist')) {
        console.error('Failed to store performance metrics:', error);
      }
    } catch (dbError) {
      // Silently fail if table doesn't exist - metrics are still logged to console
    }
  } catch (error) {
    console.error('Error sending performance metrics:', error);
  }
}

/**
 * Batch metrics collection
 */
class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 3000; // Send after 3 seconds of collecting

  add(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Clear existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Set new timeout to send batch
    this.timeout = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY);
  }

  flush() {
    if (this.metrics.length === 0) return;
    
    sendToAnalytics([...this.metrics]);
    this.metrics = [];
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

const collector = new MetricsCollector();

/**
 * Initialize Core Web Vitals tracking
 */
export function initPerformanceMonitoring() {
  // Track First Contentful Paint
  onFCP((metric) => {
    collector.add(formatMetric(metric));
  });

  // Track Largest Contentful Paint
  onLCP((metric) => {
    collector.add(formatMetric(metric));
  });

  // Track Interaction to Next Paint (replaces FID)
  onINP((metric) => {
    collector.add(formatMetric(metric));
  });

  // Track Cumulative Layout Shift
  onCLS((metric) => {
    collector.add(formatMetric(metric));
  });

  // Track Time to First Byte
  onTTFB((metric) => {
    collector.add(formatMetric(metric));
  });

  // Flush metrics before page unload
  window.addEventListener('beforeunload', () => {
    collector.flush();
  });

  // Also flush on visibility change (when user switches tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      collector.flush();
    }
  });
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');
  
  return {
    // Navigation timing
    dns: navigation ? Math.round(navigation.domainLookupEnd - navigation.domainLookupStart) : 0,
    tcp: navigation ? Math.round(navigation.connectEnd - navigation.connectStart) : 0,
    ttfb: navigation ? Math.round(navigation.responseStart - navigation.requestStart) : 0,
    download: navigation ? Math.round(navigation.responseEnd - navigation.responseStart) : 0,
    domInteractive: navigation ? Math.round(navigation.domInteractive - navigation.fetchStart) : 0,
    domComplete: navigation ? Math.round(navigation.domComplete - navigation.fetchStart) : 0,
    
    // Paint timing
    fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    
    // Memory (if available)
    memory: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
      total: Math.round((performance as any).memory.totalJSHeapSize / 1048576),
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576),
    } : null,
  };
}

/**
 * Report custom performance mark
 */
export function reportPerformanceMark(name: string, detail?: any) {
  if (import.meta.env.DEV) {
    console.log(`⏱️ Performance Mark: ${name}`, detail);
  }
  
  performance.mark(name, { detail });
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name, 'measure')[0];
    
    if (import.meta.env.DEV) {
      console.log(`📏 Performance Measure: ${name} = ${Math.round(measure.duration)}ms`);
    }
    
    return measure.duration;
  } catch (error) {
    console.error('Failed to measure performance:', error);
    return 0;
  }
}
