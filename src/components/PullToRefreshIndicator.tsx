import { Loader2, RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const isActive = pullDistance > 0;

  if (!isActive && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-transform duration-200"
      style={{
        transform: `translateY(${isRefreshing ? '60px' : Math.min(pullDistance, 60)}px)`,
      }}
    >
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-full p-3 shadow-lg">
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <RefreshCw
            className="w-5 h-5 text-primary transition-transform duration-200"
            style={{
              transform: `rotate(${progress * 3.6}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
