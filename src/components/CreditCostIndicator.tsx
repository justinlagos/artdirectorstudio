import { Coins } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreditCostIndicatorProps {
  cost: number;
  action: string;
  className?: string;
}

export const CreditCostIndicator = ({ cost, action, className = "" }: CreditCostIndicatorProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs ${className}`}>
            <Coins className="w-3 h-3" />
            <span>{cost} {cost === 1 ? 'credit' : 'credits'}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This {action} will cost {cost} {cost === 1 ? 'credit' : 'credits'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
