import { useState, useEffect } from "react";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, Blend, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface ImageBlendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImageFile {
  file: File;
  preview: string;
}

export const ImageBlendDialog = ({ open, onOpenChange }: ImageBlendDialogProps) => {
  const { captureOrigin, returnToOrigin } = useNavigationContext();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [instruction, setInstruction] = useState("Blend these images seamlessly together");
  const [isBlending, setIsBlending] = useState(false);
  const [blendedImage, setBlendedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) captureOrigin();
  }, [open, captureOrigin]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload image files only");
        return;
      }

      // Use URL.createObjectURL for preview (better mobile performance)
      const preview = URL.createObjectURL(file);
      setImages(prev => [...prev, { file, preview }]);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const img = prev[index];
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleBlend = async () => {
    if (images.length < 2) {
      toast.error("Please upload at least 2 images to blend");
      return;
    }

    setIsBlending(true);
    setProgress(0);
    setBlendedImage(null);

    try {
      const { blendImages } = await import("@/lib/services/toolsService");
      
      const result = await blendImages(
        images.map(img => img.file),
        instruction,
        (progress) => setProgress(progress)
      );

      if (!result.success) {
        toast.error(result.error || "Failed to blend images");
        return;
      }

      if (result.imageUrl) {
        setBlendedImage(result.imageUrl);
        toast.success("Images blended successfully!");
      }
    } catch (error) {
      console.error("Blend error:", error);
      toast.error("Failed to blend images. Please try again.");
    } finally {
      setIsBlending(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownload = () => {
    if (!blendedImage) return;
    
    const link = document.createElement('a');
    link.href = blendedImage;
    link.download = `blended-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded!");
  };

  const handleClose = () => {
    // Clean up object URLs to prevent memory leaks
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setBlendedImage(null);
    setInstruction("Blend these images seamlessly together");
    setProgress(0);
    returnToOrigin();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Blend className="w-5 h-5" />
            Blend Images
          </DialogTitle>
          <DialogDescription>
            Upload 2-4 images to blend them together. Cost: <span className="font-semibold text-foreground">2 credits</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload Area */}
          {images.length < 4 && !blendedImage && (
            <div className="space-y-2">
              <Label>Upload Images ({images.length}/4)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-foreground/20 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="blend-images"
                  disabled={isBlending}
                />
                <label htmlFor="blend-images" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload images (2-4 required)
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Image Preview Grid */}
          {images.length > 0 && !blendedImage && (
            <div className="grid grid-cols-2 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={img.preview} 
                    alt={`Image ${index + 1}`} 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px]"
                    onClick={() => removeImage(index)}
                    disabled={isBlending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Blend Instruction */}
          {images.length >= 2 && !blendedImage && (
            <div className="space-y-2">
              <Label htmlFor="instruction">Blend Instruction (Optional)</Label>
              <Textarea
                id="instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Describe how you want the images blended..."
                className="min-h-[80px] resize-none"
                disabled={isBlending}
              />
            </div>
          )}

          {/* Progress Bar */}
          {isBlending && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Blending images... (~20-40 seconds)
              </p>
            </div>
          )}

          {/* Blended Image Result */}
          {blendedImage && (
            <div className="space-y-4 pt-4 border-t">
              <Label>Blended Result</Label>
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img 
                  src={blendedImage} 
                  alt="Blended image" 
                  className="w-full h-auto"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  className="flex-1"
                  variant="secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setBlendedImage(null);
                    setImages([]);
                  }}
                  className="flex-1"
                >
                  <Blend className="w-4 h-4 mr-2" />
                  Blend New Images
                </Button>
              </div>
            </div>
          )}

          {/* Blend Button */}
          {images.length >= 2 && !blendedImage && (
            <Button
              onClick={handleBlend}
              disabled={isBlending}
              className="w-full"
              size="lg"
            >
              <Blend className="w-4 h-4 mr-2" />
              {isBlending ? "Blending..." : "Blend Images (2 Credits)"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
