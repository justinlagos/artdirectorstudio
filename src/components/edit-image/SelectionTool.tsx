import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, MousePointer2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SelectionToolProps {
  selectedRegion: { x: number; y: number; width: number; height: number } | null;
  onClearSelection: () => void;
  onInstructionChange: (instruction: string) => void;
  instruction: string;
}

export const SelectionTool = ({
  selectedRegion,
  onClearSelection,
  onInstructionChange,
  instruction,
}: SelectionToolProps) => {
  if (!selectedRegion) {
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Label className="text-sm font-medium">Select Area</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Click and drag on the image to select a region, or draw a freehand outline. After selecting, describe what you want to change in that area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Region Selected</Label>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="region-instruction" className="text-xs font-medium">
          Describe what you want to change in this area
        </Label>
        <Textarea
          id="region-instruction"
          placeholder="e.g., remove the background, change color to blue, add text, replace with a different object..."
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
        />
        {instruction.trim().length > 0 && instruction.trim().length < 3 && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">
              Please provide a more detailed description (at least 3 characters).
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

