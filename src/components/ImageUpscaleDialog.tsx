import { useState, useEffect } from "react";
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
      console.log('🔍 [Upscale] Starting upscale process, target size:', targetSize);
      
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [Upscale] No session found');
        toast.error("Please log in to continue.");
        setIsUpscaling(false);
        clearInterval(progressInterval);
        return;
      }

      console.log('✅ [Upscale] Session validated');

      // Convert file to base64 for edge function
      console.log('📸 [Upscale] Converting image to base64...');
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log('✅ [Upscale] Image converted, size:', (reader.result as string).length, 'chars');
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          console.error('❌ [Upscale] Failed to read image:', error);
          reject(error);
        };
        reader.readAsDataURL(sourceImage.file);
      });

      console.log('🚀 [Upscale] Invoking upscale-image edge function...');
      const { data, error } = await supabase.functions.invoke("upscale-image", {
        body: { image: base64Image, targetSize },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('📦 [Upscale] Response received:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        hasImage: !!data?.image,
        imageLength: data?.image?.length || 0,
        imagePrefix: data?.image?.substring(0, 50) || 'N/A'
      });

      if (error) {
        console.error('❌ [Upscale] Edge function error:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ [Upscale] No data returned from edge function');
        toast.error('No response from server');
        return;
      }

      if (!data.image) {
        console.error('❌ [Upscale] Response missing image field. Full response:', data);
        toast.error('Image generation failed - no image returned');
        return;
      }

      // Validate image format
      let validatedImage = data.image;
      if (!data.image.startsWith('data:image/')) {
        console.warn('⚠️ [Upscale] Invalid image format, adding data URI prefix');
        validatedImage = `data:image/png;base64,${data.image}`;
      }

      console.log('✅ [Upscale] Image validated, setting state');
      setUpscaledImage(validatedImage);
      
      // Auto-save to My Projects
      console.log('💾 [Upscale] Saving to My Projects...');
      await saveToMyProjects(validatedImage, targetSize);
      
      console.log('🎉 [Upscale] Upscale completed successfully');
      toast.success("Image upscaled successfully!");
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("❌ [Upscale] Error occurred:", {
        message: error?.message,
        details: error,
        stack: error?.stack
      });
      
      // Check for specific error types
      if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
        toast.error("Rate limit exceeded", {
          description: "Please wait a minute and try again. The AI service needs a moment to recover.",
          duration: 5000,
        });
      } else if (error?.message?.includes('Credits exhausted') || error?.message?.includes('402')) {
        toast.error("Credits exhausted", {
          description: "Please add credits to your workspace in Settings to continue.",
          duration: 7000,
        });
      } else {
        toast.error("Failed to upscale image", {
          description: error?.message || "Please try again.",
        });
      }
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

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (sourceImage) {
        URL.revokeObjectURL(sourceImage.preview);
      }
    };
  }, [sourceImage]);

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
              <div className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[200px] p-4">
                <img 
                  src={sourceImage.preview} 
                  alt="Source image" 
                  className="w-full h-auto object-contain max-h-[400px]"
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
                <img 
                  src={upscaledImage} 
                  alt="Upscaled verification" 
                  className="hidden"
                  onLoad={() => console.log('✅ [Upscale] Image loaded successfully in UI')}
                  onError={(e) => {
                    console.error('❌ [Upscale] Image failed to load in UI:', {
                      src: upscaledImage?.substring(0, 100),
                      error: e
                    });
                    toast.error('Failed to display upscaled image');
                  }}
                />
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
