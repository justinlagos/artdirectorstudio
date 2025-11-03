import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins, AlertTriangle } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

interface CreditConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditsRequired: number;
  action: string;
  onConfirm: () => void;
}

export const CreditConfirmationDialog = ({
  open,
  onOpenChange,
  creditsRequired,
  action,
  onConfirm,
}: CreditConfirmationDialogProps) => {
  const { balance } = useCredits();
  const hasEnoughCredits = balance !== null && balance >= creditsRequired;
  const isLowBalance = balance !== null && balance < 10;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Confirm Action
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Action:</span>
              <span className="text-sm">{action}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Credits Required:</span>
              <span className="text-sm font-bold text-primary">{creditsRequired}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Your Balance:</span>
              <span className={`text-sm font-bold ${!hasEnoughCredits ? 'text-destructive' : isLowBalance ? 'text-amber-500' : 'text-foreground'}`}>
                {balance ?? 0} credits
              </span>
            </div>
            
            {!hasEnoughCredits && (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Insufficient Credits</p>
                  <p className="text-xs text-destructive/80 mt-1">
                    You need {creditsRequired - (balance || 0)} more credits to proceed.
                  </p>
                </div>
              </div>
            )}
            
            {hasEnoughCredits && isLowBalance && (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Low Balance</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    Consider purchasing more credits soon.
                  </p>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {hasEnoughCredits ? (
            <AlertDialogAction onClick={onConfirm}>
              Proceed ({creditsRequired} credits)
            </AlertDialogAction>
          ) : (
            <AlertDialogAction asChild>
              <a href="/settings">Add Credits</a>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
