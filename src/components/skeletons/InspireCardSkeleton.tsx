import { Skeleton } from "@/components/ui/skeleton";

export const InspireCardSkeleton = () => {
  // Random height between 280-480px for masonry variety
  const randomHeight = Math.floor(Math.random() * 200) + 280;

  return (
    <article className="mb-6 break-inside-avoid overflow-hidden rounded-3xl border border-border/50 bg-background/70 shadow-sm">
      <div className="relative">
        <Skeleton className="w-full" style={{ height: `${randomHeight}px` }} />
        
        {/* Badges skeleton */}
        <div className="absolute left-4 right-4 top-4 flex flex-wrap justify-end gap-2">
          {Math.random() > 0.7 && <Skeleton className="h-6 w-20 rounded-full" />}
          {Math.random() > 0.8 && <Skeleton className="h-6 w-24 rounded-full" />}
        </div>

        {/* Footer skeleton */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </article>
  );
};

export const InspireGridSkeleton = ({ count = 12 }: { count?: number }) => {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
      {Array.from({ length: count }).map((_, index) => (
        <InspireCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );
};
