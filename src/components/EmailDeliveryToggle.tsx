import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

interface EmailDeliveryToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  helperText?: string;
}

export const EmailDeliveryToggle = ({ enabled, onToggle, helperText }: EmailDeliveryToggleProps) => {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="mt-0.5 text-muted-foreground">
        <Mail className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          Email delivery
        </Label>
        <p className="text-xs text-muted-foreground">
          {helperText || "Send a copy of the result straight to your inbox."}
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} aria-label="Toggle email delivery" />
    </div>
  );
};
