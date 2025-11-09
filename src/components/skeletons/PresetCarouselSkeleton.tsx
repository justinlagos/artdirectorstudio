import { Skeleton } from "@/components/ui/skeleton";

export const PresetCarouselSkeleton = () => {
  return (
    <div className="px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto mt-3 h-5 w-96" />
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="min-w-[280px] space-y-4 rounded-2xl border border-border/50 bg-background/50 p-6"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-4 h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
