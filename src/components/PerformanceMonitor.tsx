import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { Badge } from '@/components/ui/badge';

/**
 * Performance monitor component for development
 * Shows Core Web Vitals and other metrics in a floating widget
 */
export const PerformanceMonitor = () => {
  const { metrics, isLoading } = usePerformanceMonitoring();
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (!import.meta.env.DEV) return null;

  const getRatingColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'bg-green-500';
    if (value <= thresholds.poor) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRatingBadge = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return <Badge className="bg-green-500">Good</Badge>;
    if (value <= thresholds.poor) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge className="bg-red-500">Poor</Badge>;
  };

  return (
    <div className="fixed bottom-20 right-4 z-[100]">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full h-12 w-12 shadow-lg bg-background border-2"
            title="Performance Metrics"
          >
            <Activity className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Performance Metrics
              </h3>
              <Badge variant="outline" className="text-xs">
                DEV
              </Badge>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading metrics...</div>
            ) : metrics ? (
              <div className="space-y-3">
                {/* Core Web Vitals */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">
                    Core Web Vitals
                  </h4>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">FCP (First Contentful Paint)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{Math.round(metrics.fcp)}ms</span>
                      {getRatingBadge(metrics.fcp, { good: 1800, poor: 3000 })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">TTFB (Time to First Byte)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{metrics.ttfb}ms</span>
                      {getRatingBadge(metrics.ttfb, { good: 800, poor: 1800 })}
                    </div>
                  </div>
                </div>

                {/* Navigation Timing */}
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">
                    Navigation Timing
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DNS:</span>
                      <span className="font-mono">{metrics.dns}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TCP:</span>
                      <span className="font-mono">{metrics.tcp}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Download:</span>
                      <span className="font-mono">{metrics.download}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DOM Complete:</span>
                      <span className="font-mono">{metrics.domComplete}ms</span>
                    </div>
                  </div>
                </div>

                {/* Memory Usage */}
                {metrics.memory && (
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">
                      Memory Usage
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Used:</span>
                        <span className="font-mono">{metrics.memory.used}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Limit:</span>
                        <span className="font-mono">{metrics.memory.limit}MB</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${getRatingColor(
                            (metrics.memory.used / metrics.memory.limit) * 100,
                            { good: 50, poor: 80 }
                          )}`}
                          style={{
                            width: `${(metrics.memory.used / metrics.memory.limit) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Check browser console for detailed Core Web Vitals
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No metrics available</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
