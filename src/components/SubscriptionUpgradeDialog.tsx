import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubscriptionPricingTable } from "./SubscriptionPricingTable";

interface SubscriptionUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionUpgradeDialog = ({ open, onOpenChange }: SubscriptionUpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-base">
            Unlock unlimited access to all creative tools
          </DialogDescription>
        </DialogHeader>
        <SubscriptionPricingTable />
      </DialogContent>
    </Dialog>
  );
};
