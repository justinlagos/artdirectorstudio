import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnalysisLayoutProps {
  imageUrl?: string;
  analysisContent: ReactNode;
  className?: string;
}

/**
 * Premium two-column analysis layout
 * Desktop: Sticky image on left, scrollable analysis on right
 * Mobile: Stacked layout
 */
export const AnalysisLayout = ({
  imageUrl,
  analysisContent,
  className,
}: AnalysisLayoutProps) => {
  return (
    <div
      className={cn(
        "w-full grid gap-8",
        "lg:grid-cols-[2fr_3fr] lg:gap-12",
        className
      )}
    >
      {/* Left Column - Sticky Image Preview (Desktop) */}
      {imageUrl && (
        <div className="w-full lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)]">
          <div className="relative w-full aspect-square lg:aspect-auto lg:h-full rounded-2xl overflow-hidden bg-surface-1 shadow-lg ring-1 ring-border/50">
            <img
              src={imageUrl}
              alt="Analysis preview"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Right Column - Scrollable Analysis Content */}
      <div className="w-full space-y-8">
        {analysisContent}
      </div>
    </div>
  );
};
