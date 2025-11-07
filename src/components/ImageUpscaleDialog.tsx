import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Maximize2, Upload, Sparkles, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";

interface ImageUpscaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SourceImage {
  file: File;
  preview: string;
}

export const ImageUpscaleDialog = ({ open, onOpenChange }: ImageUpscaleDialogProps) => {
  const navigate = useNavigate();
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [targetSize, setTargetSize] = useState<'1536x1536' | '2048x2048'>('1536x1536');
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [upscaledAssetId, setUpscaledAssetId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 2000);

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        setIsUpscaling(false);
        clearInterval(progressInterval);
        return;
      }

      // Convert file to base64 for edge function
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(sourceImage.file);
      });

      const { data, error } = await supabase.functions.invoke("upscale-image", {
        body: { image: base64Image, targetSize },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      if (data?.image) {
        setUpscaledImage(data.image);
        
        // Auto-save to My Projects
        await saveToMyProjects(data.image, targetSize);
        
        toast.success("Image upscaled successfully!");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Upscale error:", error);
      toast.error("Failed to upscale image. Please try again.");
    } finally {
      setIsUpscaling(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const saveToMyProjects = async (imageDataUrl: string, size: string) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${user.id}/upscaled-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(fileName);

      // Save metadata to database
      const { data: assetData, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          type: 'image',
          image_url: publicUrl,
          prompt: `Upscaled to ${size}`,
          quality: size === '2048x2048' ? 'ultra' : 'high',
          size: size
        })
        .select()
        .single();

      if (dbError) throw dbError;
      
      if (assetData) {
        setUpscaledAssetId(assetData.id);
      }
    } catch (error) {
      console.error('Error saving to My Projects:', error);
    } finally {
      setIsSaving(false);
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

  const handleViewInStudio = () => {
    if (!upscaledAssetId) {
      toast.error("Asset not saved yet. Please try again.");
      return;
    }
    navigate('/');
    setTimeout(() => {
      document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    handleClose();
  };

  const handleClose = () => {
    // Clean up object URL to prevent memory leaks
    if (sourceImage) {
      URL.revokeObjectURL(sourceImage.preview);
    }
    setSourceImage(null);
    setUpscaledImage(null);
    setUpscaledAssetId(null);
    setTargetSize('1536x1536');
    setProgress(0);
    setIsSaving(false);
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
            Upscale your image to higher resolution. Free while subscriptions are being finalized!
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
            <div className="space-y-4 pt-4 border-t animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Done — image upscaled successfully</Label>
                {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
              </div>
              
              {/* Interactive Before/After Comparison Slider */}
              <div className="space-y-2">
                <BeforeAfterSlider
                  beforeImage={sourceImage!.preview}
                  afterImage={upscaledImage}
                  beforeLabel="Original"
                  afterLabel={`Upscaled (${targetSize})`}
                  className="shadow-medium"
                />
                <p className="text-xs text-center text-muted-foreground">
                  Drag the slider to compare before and after
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleViewInStudio}
                  className="flex-1"
                  disabled={!upscaledAssetId}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  View in Studio
                </Button>
                <Button
                  onClick={handleDownload}
                  className="flex-1"
                  variant="secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              
              <Button
                onClick={() => {
                  setUpscaledImage(null);
                  setUpscaledAssetId(null);
                  setSourceImage(null);
                }}
                className="w-full"
                variant="outline"
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Upscale New Image
              </Button>
              
              <div className="text-center">
                <Button
                  onClick={() => navigate('/history')}
                  variant="link"
                  className="text-sm"
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  View all in My Projects
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
              {isUpscaling ? "Upscaling..." : "Upscale Image"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
