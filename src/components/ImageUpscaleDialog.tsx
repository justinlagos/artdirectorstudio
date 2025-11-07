import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Maximize2, Upload, Sparkles, FolderOpen, CheckCircle2, Eye, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { ImageZoomDialog } from "./ImageZoomDialog";
import { useToolState } from "@/hooks/useToolState";
import { mapErrorMessage } from "@/lib/toolErrorMessages";

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
  const toolState = useToolState();
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [targetSize, setTargetSize] = useState<'1536x1536' | '2048x2048'>('1536x1536');
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [upscaledAssetId, setUpscaledAssetId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomImage, setZoomImage] = useState<'before' | 'after'>('after');
  const [upscaleStartTime, setUpscaleStartTime] = useState<number>(0);

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

    const idempotencyKey = crypto.randomUUID();
    const startTime = Date.now();
    setUpscaleStartTime(startTime);
    
    toolState.startProcessing();
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
      console.log('🔍 [Upscale] Starting upscale, target:', targetSize, 'idempotency:', idempotencyKey);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [Upscale] No session found');
        toolState.handleError("Please sign in to use this feature.");
        toast.error("Please sign in to continue.");
        clearInterval(progressInterval);
        return;
      }

      // Convert file to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(sourceImage.file);
      });

      console.log('🚀 [Upscale] Invoking upscale-image edge function...');
      const { data, error } = await supabase.functions.invoke("upscale-image", {
        body: { 
          image: base64Image, 
          targetSize,
          idempotencyKey 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      if (!data?.image) throw new Error('No upscaled image returned');

      // Validate and set image IMMEDIATELY
      let validatedImage = data.image;
      if (!data.image.startsWith('data:image/')) {
        validatedImage = `data:image/png;base64,${data.image}`;
      }

      console.log('✅ [Upscale] Image validated, setting state immediately');
      setUpscaledImage(validatedImage);
      toolState.handleSuccess();
      
      // Save to database in background
      const duration = Date.now() - startTime;
      saveToMyProjects(validatedImage, targetSize, base64Image, duration).catch(err => {
        console.error('Background save failed:', err);
      });
      
      toast.success("Image upscaled successfully!");
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("❌ [Upscale] Error:", error);
      
      const errorMessage = mapErrorMessage(error);
      toolState.handleError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const saveToMyProjects = async (
    imageDataUrl: string, 
    size: string, 
    originalImage: string,
    duration: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Use standardized storage path: results/{userId}/{yyyy-mm}/upscale/{uuid}.png
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const uuid = crypto.randomUUID();
      const fileName = `results/${user.id}/${yearMonth}/upscale/${uuid}.png`;
      
      const { error: uploadError } = await supabase.storage
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

      // Save metadata with new schema fields
      const { data: assetData, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          type: 'image',
          action: 'upscale',
          image_url: publicUrl,
          prompt: `Upscaled to ${size}`,
          source_urls: [originalImage], // Store original
          params: {
            targetSize: size,
            originalSize: sourceImage?.file.size
          },
          duration_ms: duration,
          // share_slug auto-generated by trigger
        })
        .select()
        .single();

      if (dbError) throw dbError;
      
      if (assetData) {
        setUpscaledAssetId(assetData.id);
        console.log('✅ [Upscale] Saved to DB with share slug:', assetData.share_slug);
      }
    } catch (error) {
      console.error('Error saving to My Projects:', error);
      throw error;
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
    toolState.reset();
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
                  disabled={toolState.isProcessing}
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
                disabled={toolState.isProcessing}
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
          {toolState.isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Upscaling image... (~20-40 seconds)
              </p>
            </div>
          )}

          {/* Upscaled Image Result - Studio Style */}
          {upscaledImage && sourceImage && (
            <Card className="shadow-lg ring-1 ring-border/50">
              <CardContent className="p-6 space-y-4">
                {/* Success Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Upscale Complete</span>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    {targetSize}
                  </Badge>
                </div>

                {/* Before/After Comparison with Zoom */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Compare Original vs Upscaled
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setZoomImage('before');
                          setShowZoom(true);
                        }}
                        className="h-7 text-xs"
                      >
                        <ZoomIn className="w-3 h-3 mr-1" />
                        Original
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setZoomImage('after');
                          setShowZoom(true);
                        }}
                        className="h-7 text-xs"
                      >
                        <ZoomIn className="w-3 h-3 mr-1" />
                        Upscaled
                      </Button>
                    </div>
                  </div>
                  <BeforeAfterSlider
                    beforeImage={sourceImage.preview}
                    afterImage={upscaledImage}
                    beforeLabel="Original"
                    afterLabel={`Upscaled (${targetSize})`}
                  />
                </div>

                {/* Hidden img for verification */}
                <img
                  src={upscaledImage}
                  alt="Upscaled verification"
                  className="hidden"
                  onLoad={() => {
                    console.log('✅ [Upscale] Image verified and loaded in UI:', {
                      timestamp: new Date().toISOString(),
                      targetSize,
                      imageSize: upscaledImage.length
                    });
                  }}
                  onError={(e) => {
                    console.error('❌ [Upscale] Image failed to load in UI:', {
                      error: e,
                      timestamp: new Date().toISOString(),
                      imagePrefix: upscaledImage.substring(0, 50)
                    });
                    toast.error('Failed to display upscaled image');
                  }}
                />

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span>Type: Image Upscale</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </CardContent>

              <CardFooter className="flex-col gap-3 p-6 pt-0">
                {/* Primary Actions */}
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleViewInStudio}
                    className="flex-1"
                    disabled={!upscaledAssetId}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View in Studio
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                {/* Secondary Action */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUpscaledImage(null);
                    setUpscaledAssetId(null);
                    setSourceImage(null);
                    setTargetSize("1536x1536");
                  }}
                  className="w-full"
                >
                  Upscale New Image
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Image Zoom Dialog */}
          {upscaledImage && sourceImage && (
            <ImageZoomDialog
              open={showZoom}
              onOpenChange={setShowZoom}
              imageUrl={zoomImage === 'before' ? sourceImage.preview : upscaledImage}
              title={zoomImage === 'before' ? 'Original Image' : `Upscaled Image (${targetSize})`}
            />
          )}

          {/* Upscale Button */}
          {sourceImage && !upscaledImage && (
            <Button
              onClick={handleUpscale}
              disabled={toolState.isProcessing}
              className="w-full min-h-[44px]"
              size="lg"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              {toolState.isProcessing ? "Upscaling..." : "Upscale Image"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
