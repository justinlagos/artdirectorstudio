import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PricingTable } from "./PricingTable";
import { useScrollLock } from "@/hooks/useScrollLock";

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditPurchaseDialog = ({ open, onOpenChange }: CreditPurchaseDialogProps) => {
  // Centralized scroll lock
  useScrollLock(open, 'credit-purchase-dialog');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Purchase Credits</DialogTitle>
          <DialogDescription>
            Choose a credit package to continue using ArtDirector Studio
          </DialogDescription>
        </DialogHeader>
        <PricingTable />
      </DialogContent>
    </Dialog>
  );
};
