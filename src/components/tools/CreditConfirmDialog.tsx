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
import { useCredits } from "@/hooks/useCredits";
import { Coins } from "lucide-react";

interface CreditConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number;
  action: string;
  onConfirm: () => void;
}

export const CreditConfirmDialog = ({
  open,
  onOpenChange,
  credits,
  action,
  onConfirm,
}: CreditConfirmDialogProps) => {
  const { balance } = useCredits();
  const hasEnough = balance >= credits;
  const remaining = balance - credits;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Confirm Credit Usage
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div className="text-base">
              This action will use{" "}
              <span className="font-semibold text-foreground">{credits} credits</span>.
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Your balance:</span>
              <span className="text-base font-semibold">{balance} credits</span>
            </div>

            {hasEnough ? (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm text-muted-foreground">After {action}:</span>
                <span className="text-base font-semibold">{remaining} credits</span>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  Insufficient credits. You need {credits - balance} more credits to proceed.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {hasEnough ? (
            <AlertDialogAction onClick={onConfirm}>
              Continue
            </AlertDialogAction>
          ) : (
            <AlertDialogAction asChild>
              <a href="/settings?tab=credits">Add Credits</a>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
