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
        {isLowBalance && (
          <Alert variant="destructive" className="py-2 px-3 border-destructive/50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-xs ml-2">
              Low balance!
            </AlertDescription>
          </Alert>
        )}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
          isLowBalance ? 'bg-destructive/10 border-destructive/50' : 'bg-card border-border'
        }`}>
          <Coins className={`w-4 h-4 ${isLowBalance ? 'text-destructive' : 'text-primary'}`} />
          <span className="text-sm font-medium">
            {balance ?? 0} credits
          </span>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setShowPurchaseDialog(true)}
          className="gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
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
