import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ReactNode } from "react";

interface ToolDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  toolType: "studio" | "blend" | "upscale" | "batch" | "prompt";
  onSubmit?: (data: any) => void;
}

export const ToolDialog = ({ trigger, title, description, toolType, onSubmit }: ToolDialogProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    onSubmit?.(data);
  };

  const renderToolInputs = () => {
    switch (toolType) {
      case "studio":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="image-upload">Upload Image</Label>
              <Input id="image-upload" name="image" type="file" accept="image/*" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Analysis Prompt (Optional)</Label>
              <Textarea 
                id="prompt" 
                name="prompt"
                placeholder="Describe what you'd like to analyze or generate..."
                rows={4}
              />
            </div>
          </>
        );

      case "blend":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="image1">First Image</Label>
              <Input id="image1" name="image1" type="file" accept="image/*" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image2">Second Image</Label>
              <Input id="image2" name="image2" type="file" accept="image/*" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blend-ratio">Blend Ratio</Label>
              <Slider
                id="blend-ratio"
                name="blendRatio"
                defaultValue={[50]}
                max={100}
                step={1}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">Adjust the balance between images</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blend-mode">Blend Mode</Label>
              <Select name="blendMode" defaultValue="smooth">
                <SelectTrigger id="blend-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smooth">Smooth Transition</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "upscale":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="upscale-image">Image to Upscale</Label>
              <Input id="upscale-image" name="image" type="file" accept="image/*" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale-factor">Scale Factor</Label>
              <Select name="scaleFactor" defaultValue="2">
                <SelectTrigger id="scale-factor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2x (Double)</SelectItem>
                  <SelectItem value="4">4x (Quadruple)</SelectItem>
                  <SelectItem value="8">8x (Maximum)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality Enhancement</Label>
              <Select name="quality" defaultValue="balanced">
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "batch":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="batch-images">Upload Multiple Images</Label>
              <Input id="batch-images" name="images" type="file" accept="image/*" multiple required />
              <p className="text-xs text-muted-foreground">Select multiple images to process</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-operation">Operation</Label>
              <Select name="operation" defaultValue="analyze">
                <SelectTrigger id="batch-operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analyze">Analyze All</SelectItem>
                  <SelectItem value="upscale">Upscale All</SelectItem>
                  <SelectItem value="format">Convert Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-prompt">Shared Prompt (Optional)</Label>
              <Textarea 
                id="batch-prompt" 
                name="prompt"
                placeholder="Apply this prompt to all images..."
                rows={3}
              />
            </div>
          </>
        );

      case "prompt":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="base-prompt">Base Prompt</Label>
              <Textarea 
                id="base-prompt" 
                name="basePrompt"
                placeholder="Enter your creative prompt..."
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">Style Preference</Label>
              <Select name="style" defaultValue="realistic">
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="artistic">Artistic</SelectItem>
                  <SelectItem value="abstract">Abstract</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creativity">Creativity Level</Label>
              <Slider
                id="creativity"
                name="creativity"
                defaultValue={[50]}
                max={100}
                step={1}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">Balance between precision and creativity</p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-4">
          {renderToolInputs()}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" className="flex-1 min-h-[44px]">
              Process
            </Button>
            <Button type="button" variant="outline" className="flex-1 min-h-[44px]">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
