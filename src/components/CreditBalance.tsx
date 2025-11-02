import { useState } from "react";
import { Coins, ShoppingCart, AlertTriangle } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { CreditPurchaseDialog } from "./CreditPurchaseDialog";
import { Alert, AlertDescription } from "./ui/alert";

export const CreditBalance = () => {
  const { balance, loading } = useCredits();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const isLowBalance = balance !== null && balance < 5;

  if (loading) {
    return <Skeleton className="h-10 w-32" />;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
          isLowBalance 
            ? 'bg-destructive/5 border-destructive/30 ring-1 ring-destructive/20' 
            : 'bg-card/50 border-border/50 hover:bg-card/80'
        }`}>
          <Coins className={`w-3.5 h-3.5 ${isLowBalance ? 'text-destructive' : 'text-muted-foreground'}`} strokeWidth={1.5} />
          <span className="text-xs font-medium tracking-wide">
            {balance ?? 0}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setShowPurchaseDialog(true)}
          className="h-8 gap-1.5 text-xs font-medium shadow-xs hover:shadow-sm transition-all duration-200"
        >
          <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />
          Buy Credits
        </Button>
      </div>

      <CreditPurchaseDialog 
        open={showPurchaseDialog} 
        onOpenChange={setShowPurchaseDialog} 
      />
    </>
  );
};
