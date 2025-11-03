import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PricingTable } from "./PricingTable";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useEffect } from "react";

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditPurchaseDialog = ({ open, onOpenChange }: CreditPurchaseDialogProps) => {
  const { captureOrigin, returnToOrigin } = useNavigationContext();

  useEffect(() => {
    if (open) captureOrigin();
  }, [open, captureOrigin]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) returnToOrigin();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
