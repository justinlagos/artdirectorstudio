import { Skeleton } from "@/components/ui/skeleton";

export const AnalysisSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Image Preview Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
        <Skeleton className="aspect-video w-full" />
      </div>

      {/* Analysis Sections */}
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Analysis Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border/50 bg-background/50 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>

        {/* Prompt Section */}
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
};
