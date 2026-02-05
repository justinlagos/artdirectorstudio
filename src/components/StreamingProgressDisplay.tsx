import { Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StreamingProgressDisplayProps {
  progress: number;
  stage: string;
  message: string;
  streamingEnabled: boolean;
  isGenerating: boolean;
}

/**
 * Enhanced progress display component for streaming generation.
 * Shows sparkle animations when streaming is active, falls back to standard UI otherwise.
 */
export const StreamingProgressDisplay = ({
  progress,
  stage,
  message,
  streamingEnabled,
  isGenerating,
}: StreamingProgressDisplayProps) => {
  if (!isGenerating) return null;

  // Progressive enhancement: show enhanced UI only if streaming is working
  if (streamingEnabled && progress > 0) {
    return (
      <div className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shrink-0">
        {/* Header with sparkle animation */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-sparkle-pulse" />
          <span className="text-sm font-medium text-foreground">
            {message || 'Generating...'}
          </span>
        </div>

        {/* Progress bar with shimmer effect */}
        <div className="relative overflow-hidden rounded-full">
          <Progress value={progress} className="w-full h-2" />
          {/* Shimmer overlay for active progress */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
              progress < 100 && "animate-shimmer"
            )}
            style={{ backgroundSize: '200% 100%' }}
          />
        </div>

        {/* Progress percentage and helpful text */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          <span>
            {progress < 25 && 'Preparing your request...'}
            {progress >= 25 && progress < 60 && 'AI is working on your image...'}
            {progress >= 60 && progress < 90 && 'Almost there...'}
            {progress >= 90 && progress < 100 && 'Finishing up...'}
            {progress >= 100 && 'Done!'}
          </span>
        </div>
      </div>
    );
  }

  // Fallback: Standard spinner UI (existing behavior for non-streaming)
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shrink-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{message || 'Generating...'}</p>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="w-full" />
      <p className="text-xs text-muted-foreground text-center">
        This usually takes 8-15 seconds
      </p>
    </div>
  );
};
