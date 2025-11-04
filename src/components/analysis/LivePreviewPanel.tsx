import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface LivePreviewPanelProps {
  prompt: string;
  changeCount: number;
  isRegenerating: boolean;
  onApply: () => void;
  onReset: () => void;
}

export function LivePreviewPanel({
  prompt,
  changeCount,
  isRegenerating,
  onApply,
  onReset,
}: LivePreviewPanelProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface-1 border-t border-border/50 backdrop-blur-sm shadow-lg">
        <div className="p-4 space-y-3">
          {changeCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <Badge variant="default" className="text-xs">
                {changeCount} change{changeCount !== 1 ? "s" : ""} pending
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 text-xs"
              >
                Reset all
              </Button>
            </div>
          )}
          <Button
            onClick={onApply}
            disabled={isRegenerating || changeCount === 0}
            className="w-full"
            size="lg"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Changes"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-20 h-fit max-h-[calc(100vh-6rem)] bg-surface-1 border border-border/50 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Live Preview</h3>
        {changeCount > 0 && (
          <Badge variant="default" className="text-xs">
            {changeCount} pending
          </Badge>
        )}
      </div>

      <ScrollArea className="h-64 p-4">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {prompt || "Your regenerated prompt will appear here..."}
        </p>
      </ScrollArea>

      <div className="p-4 border-t border-border/30 space-y-2">
        <Button
          onClick={onApply}
          disabled={isRegenerating || changeCount === 0}
          className="w-full"
          size="lg"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : (
            "Apply Changes"
          )}
        </Button>
        {changeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full h-8 text-xs"
          >
            Reset all changes
          </Button>
        )}
      </div>
    </div>
  );
}
