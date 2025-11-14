import { Button } from "@/components/ui/button";
import { RotateCw, Download, Sparkles, Loader2 } from "lucide-react";

interface FooterActionsProps {
  onReset: () => void;
  onDownload: () => void;
  onApply: () => void;
  isProcessing: boolean;
  canApply: boolean;
}

export const FooterActions = ({
  onReset,
  onDownload,
  onApply,
  isProcessing,
  canApply,
}: FooterActionsProps) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4 mt-auto flex gap-3 shadow-[0_-1px_8px_rgba(0,0,0,0.08)]">
      <Button
        onClick={onReset}
        variant="outline"
        className="flex-1 h-11"
        disabled={isProcessing}
      >
        <RotateCw className="h-4 w-4 mr-2" />
        Reset
      </Button>
      <Button
        onClick={onDownload}
        variant="outline"
        className="flex-1 h-11"
        disabled={isProcessing}
      >
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>
      <Button
        onClick={onApply}
        disabled={isProcessing || !canApply}
        className="flex-1 h-11"
        size="default"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Applying...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Apply with AI
          </>
        )}
      </Button>
    </div>
  );
};

