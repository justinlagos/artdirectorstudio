/**
 * Progress Region Component
 * Standard place for progress bar, stage text, cancel button
 * Replace all floating loaders with this
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface ProgressRegionProps {
  progress?: number; // 0-100
  stage?: string;
  onCancel?: () => void;
  className?: string;
}

export const ProgressRegion: React.FC<ProgressRegionProps> = ({
  progress,
  stage,
  onCancel,
  className,
}) => {
  if (!progress && !stage) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-3",
        "px-6 py-4",
        "bg-muted/30 rounded-[var(--radius-sm)]",
        className
      )}
    >
      {stage && (
        <p className="text-sm text-muted-foreground font-medium">
          {stage}
        </p>
      )}
      {progress !== undefined && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}%</span>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-auto py-1 px-2 text-xs"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
