import { forwardRef } from "react";
import { InspireCard } from "@/components/InspireCard";
import type { InspireProject } from "@/types/inspire";
import { Button } from "@/components/ui/button";
import { InspireGridSkeleton } from "@/components/skeletons/InspireCardSkeleton";

interface InspireGridProps {
  projects: InspireProject[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onSelect?: (project: InspireProject) => void;
  onUseInStudio?: (project: InspireProject) => void;
  emptyLabel?: string;
  error?: string | null;
  onRetry?: () => void;
}

export const InspireGrid = forwardRef<HTMLDivElement, InspireGridProps>(
  (
    {
      projects,
      isLoading,
      isLoadingMore,
      hasMore,
      onSelect,
      onUseInStudio,
      emptyLabel = "No projects yet. Check back soon.",
      error,
      onRetry,
    },
    loaderRef
  ) => {
    const showSkeletons = isLoading && projects.length === 0;

    return (
      <div className="space-y-12">
        {showSkeletons && <InspireGridSkeleton count={12} />}

        {!showSkeletons && projects.length > 0 && (
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
            {projects.map((project) => (
              <InspireCard
                key={project.id}
                project={project}
                onSelect={onSelect}
                onUseInStudio={onUseInStudio}
              />
            ))}
          </div>
        )}

        {!showSkeletons && projects.length === 0 && !error && (
          <p className="text-center text-sm text-muted-foreground">{emptyLabel}</p>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Reload
              </Button>
            )}
          </div>
        )}

        {(hasMore || isLoadingMore) && (
          <div ref={loaderRef} className="flex justify-center">
            <Button
              variant="ghost"
              disabled
              className="px-6 text-muted-foreground"
              aria-live="polite"
            >
              {isLoadingMore ? "Loading more" : "Scroll to load more"}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

InspireGrid.displayName = "InspireGrid";

