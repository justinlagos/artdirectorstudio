import { Skeleton } from "@/components/ui/skeleton";

export const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <section className="px-6 pb-16 pt-20 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-12 w-full max-w-2xl" />
          <Skeleton className="mx-auto h-6 w-full max-w-xl" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-32" />
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl space-y-8">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </section>
    </div>
  );
};
