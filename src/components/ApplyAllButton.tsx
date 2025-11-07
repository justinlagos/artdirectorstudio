import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface ApplyAllButtonProps {
  pendingCount: number;
  onApply: () => void;
  isLoading: boolean;
  className?: string;
}

export const ApplyAllButton = ({ 
  pendingCount, 
  onApply, 
  isLoading,
  className = ""
}: ApplyAllButtonProps) => {
  if (pendingCount === 0) return null;

  return (
    <div className={`sticky bottom-0 left-0 right-0 z-10 ${className}`}>
      <div className="bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4">
        <Button
          onClick={onApply}
          disabled={isLoading}
          size="lg"
          className="w-full relative group hover:shadow-strong transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Applying Changes...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Apply All Changes
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs font-semibold">
                {pendingCount}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
