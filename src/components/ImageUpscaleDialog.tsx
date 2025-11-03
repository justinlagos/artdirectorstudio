import { useState, useEffect } from "react";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Maximize2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface ImageUpscaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SourceImage {
  file: File;
  preview: string;
}

export const ImageUpscaleDialog = ({ open, onOpenChange }: ImageUpscaleDialogProps) => {
  const { captureOrigin, returnToOrigin } = useNavigationContext();
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);

  useEffect(() => {
    if (open) captureOrigin();
  }, [open, captureOrigin]);
  const [targetSize, setTargetSize] = useState<'1536x1536' | '2048x2048'>('1536x1536');
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Use URL.createObjectURL for preview (better mobile performance)
    const preview = URL.createObjectURL(file);
    setSourceImage({ file, preview });
    setUpscaledImage(null);
  };

  const handleUpscale = async () => {
    if (!sourceImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsUpscaling(true);
    setProgress(0);
    setUpscaledImage(null);

    try {
      const { upscaleImage } = await import("@/lib/services/toolsService");
      
      const result = await upscaleImage(
        sourceImage.file,
        targetSize,
        (progress) => setProgress(progress)
      );

      if (!result.success) {
        toast.error(result.error || "Failed to upscale image");
        return;
      }

      if (result.imageUrl) {
        setUpscaledImage(result.imageUrl);
        toast.success("Image upscaled successfully!");
      }
    } catch (error) {
      console.error("Upscale error:", error);
      toast.error("Failed to upscale image. Please try again.");
    } finally {
      setIsUpscaling(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownload = () => {
    if (!upscaledImage) return;
    
    const link = document.createElement('a');
    link.href = upscaledImage;
    link.download = `upscaled-image-${targetSize}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded!");
  };

  const handleClose = () => {
    // Clean up object URL to prevent memory leaks
    if (sourceImage) {
      URL.revokeObjectURL(sourceImage.preview);
    }
    setSourceImage(null);
    setUpscaledImage(null);
    setTargetSize('1536x1536');
    setProgress(0);
    returnToOrigin();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5" />
            Upscale Image
          </DialogTitle>
          <DialogDescription>
            Upscale your image to higher resolution. Cost: <span className="font-semibold text-foreground">2 credits</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload */}
          {!sourceImage && (
            <div className="space-y-2">
              <Label>Upload Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-foreground/20 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="upscale-image"
                  disabled={isUpscaling}
                />
                <label htmlFor="upscale-image" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload an image to upscale
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Source Image Preview */}
          {sourceImage && !upscaledImage && (
            <div className="space-y-2">
              <Label>Source Image</Label>
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img 
                  src={sourceImage.preview} 
                  alt="Source image" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          {/* Target Size Selection */}
          {sourceImage && !upscaledImage && (
            <div className="space-y-2">
              <Label htmlFor="targetSize">Target Size</Label>
              <Select
                value={targetSize}
                onValueChange={(value) => setTargetSize(value as any)}
                disabled={isUpscaling}
              >
                <SelectTrigger id="targetSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1536x1536">High Resolution (1536×1536)</SelectItem>
                  <SelectItem value="2048x2048">Ultra High Resolution (2048×2048)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher resolution takes longer but produces better quality
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isUpscaling && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Upscaling image... (~20-40 seconds)
              </p>
            </div>
          )}

          {/* Upscaled Image Result */}
          {upscaledImage && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Original</Label>
                  <img 
                    src={sourceImage!.preview} 
                    alt="Original" 
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upscaled ({targetSize})</Label>
                  <img 
                    src={upscaledImage} 
                    alt="Upscaled" 
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  className="flex-1"
                  variant="secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Upscaled
                </Button>
                <Button
                  onClick={() => {
                    setUpscaledImage(null);
                    setSourceImage(null);
                  }}
                  className="flex-1"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Upscale New Image
                </Button>
              </div>
            </div>
          )}

          {/* Upscale Button */}
          {sourceImage && !upscaledImage && (
            <Button
              onClick={handleUpscale}
              disabled={isUpscaling}
              className="w-full"
              size="lg"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              {isUpscaling ? "Upscaling..." : "Upscale Image (2 Credits)"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
