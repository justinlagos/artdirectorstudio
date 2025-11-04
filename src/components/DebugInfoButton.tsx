import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyDebugInfo, DebugInfo } from "@/lib/utils/errorCodes";
import { toast } from "sonner";

interface DebugInfoButtonProps {
  debugInfo: DebugInfo;
  compact?: boolean;
}

export const DebugInfoButton = ({ debugInfo, compact = false }: DebugInfoButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyDebugInfo(debugInfo);
    if (success) {
      setCopied(true);
      toast.success("Debug info copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy debug info");
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy debug info
          </>
        )}
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-2"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy Debug Info
        </>
      )}
    </Button>
  );
};
