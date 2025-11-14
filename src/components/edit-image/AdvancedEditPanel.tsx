import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eraser, Replace, Sparkles, Wand2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdvancedEditPanelProps {
  onReplaceObject: (instruction: string) => void;
  onRemoveBlemish: () => void;
  onSmoothBackground: () => void;
}

export const AdvancedEditPanel = ({
  onReplaceObject,
  onRemoveBlemish,
  onSmoothBackground,
}: AdvancedEditPanelProps) => {
  const [replaceInstruction, setReplaceInstruction] = useState("");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="replace" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="replace" className="text-xs sm:text-sm">Replace</TabsTrigger>
          <TabsTrigger value="retouch" className="text-xs sm:text-sm">Retouch</TabsTrigger>
          <TabsTrigger value="enhance" className="text-xs sm:text-sm">Enhance</TabsTrigger>
        </TabsList>

        <TabsContent value="replace" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="replace-instruction" className="text-sm font-medium">Object Replacement</Label>
              <p className="text-xs text-muted-foreground">
                Select an area on the image first, then describe what to replace it with.
              </p>
            </div>
            <Textarea
              id="replace-instruction"
              placeholder="e.g., Replace the car with a bicycle, Replace the sky with a sunset, Replace the person with a statue..."
              value={replaceInstruction}
              onChange={(e) => setReplaceInstruction(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
            />
            {replaceInstruction.trim().length > 0 && replaceInstruction.trim().length < 3 && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">
                  Please provide a more detailed description (at least 3 characters).
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={() => {
                if (replaceInstruction.trim().length >= 3) {
                  onReplaceObject(`Replace the selected area with: ${replaceInstruction.trim()}`);
                  setReplaceInstruction("");
                }
              }}
              className="w-full"
              size="sm"
              disabled={!replaceInstruction.trim() || replaceInstruction.trim().length < 3}
            >
              <Replace className="h-4 w-4 mr-2" />
              Replace Object
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="retouch" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Quick Retouching</Label>
              <p className="text-xs text-muted-foreground">
                Fast local adjustments that work best on selected regions.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={onRemoveBlemish}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Remove Blemishes
                <span className="ml-auto text-xs text-muted-foreground">Auto</span>
              </Button>
              <Button
                onClick={onSmoothBackground}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Smooth Background
                <span className="ml-auto text-xs text-muted-foreground">Auto</span>
              </Button>
            </div>
            <Alert className="py-2">
              <Info className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                These tools work best when you select a region first. They will automatically generate appropriate instructions.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        <TabsContent value="enhance" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">AI Enhancement</Label>
              <p className="text-xs text-muted-foreground">
                Advanced enhancements will be applied when you click "Apply with AI" based on your adjustments and instructions.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-start gap-3">
                <Wand2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <p className="text-xs font-medium">Smart Enhancements</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Automatic color correction</li>
                    <li>Noise reduction</li>
                    <li>Detail enhancement</li>
                    <li>Composition optimization</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

