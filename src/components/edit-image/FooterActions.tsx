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
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
      <Button
        onClick={onReset}
        variant="outline"
        className="flex-1 min-h-[44px] touch-manipulation"
        disabled={isProcessing}
      >
        <RotateCw className="h-4 w-4 mr-2" />
        Reset
      </Button>
      <Button
        onClick={onDownload}
        variant="outline"
        className="flex-1 min-h-[44px] touch-manipulation"
        disabled={isProcessing}
      >
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>
      <Button
        onClick={onApply}
        disabled={isProcessing || !canApply}
        className="flex-1 min-h-[44px] font-medium touch-manipulation"
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
            Apply Changes
          </>
        )}
      </Button>
    </div>
  );
};

