import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Maximize2, Upload, Sparkles, FolderOpen, CheckCircle2, Wand2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { ImageZoomDialog } from "./ImageZoomDialog";
import { useToolState } from "@/hooks/useToolState";
import { mapErrorMessage } from "@/lib/toolErrorMessages";
import { ToolDrawer } from "./ToolDrawer";
import { openStudioWithPrompt } from "@/lib/studio";
import { analytics } from "@/lib/analytics";

interface ImageUpscaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SourceImage {
  file: File;
  preview: string;
}

export const ImageUpscaleDialog = ({ open, onOpenChange }: ImageUpscaleDialogProps) => {
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

      // Validate file before conversion
      console.log('🔄 [Upscale] Validating file...', {
        fileName: sourceImage.file.name,
        fileSize: `${(sourceImage.file.size / 1024 / 1024).toFixed(2)}MB`,
        fileType: sourceImage.file.type
      });

      if (!sourceImage.file.type.startsWith('image/')) {
        console.error('❌ [Upscale] Invalid file type:', sourceImage.file.type);
        throw new Error('Invalid file type. Please upload an image file.');
      }

      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
      if (sourceImage.file.size > MAX_FILE_SIZE) {
        const error = `File too large: ${(sourceImage.file.size / 1024 / 1024).toFixed(2)}MB. Max 15MB.`;
        console.error('❌ [Upscale] File size validation failed:', error);
        throw new Error(error);
      }

      // Convert file to base64 with validation
      console.log('🔄 [Upscale] Converting file to base64...');
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          
          // Validate base64 format
          if (!result.startsWith('data:image/')) {
            console.error('❌ [Upscale] Invalid base64 format');
            reject(new Error('Invalid image format'));
            return;
          }
          
          console.log('✅ [Upscale] File converted to base64', {
            base64Length: result.length,
            estimatedSizeMB: (result.length / 1.33 / 1024 / 1024).toFixed(2)
          });
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('❌ [Upscale] FileReader error:', error);
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(sourceImage.file);
      });

      // Final validation before API call
      if (!base64Image || !base64Image.startsWith('data:image/')) {
        console.error('❌ [Upscale] Final validation failed');
        throw new Error('Invalid image data');
      }

      console.log('📤 [Upscale] Sending request to upscale-image', {
        targetSize,
        base64Length: base64Image.length,
        idempotencyKey
      });

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

      // CRITICAL: Log full response for debugging
      console.log('📥 [Upscale] Raw response from edge function:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        dataType: typeof data,
        errorMessage: error?.message,
        errorDetails: error
      });

      if (error) {
        console.error('❌ [Upscale] Edge function error:', {
          message: error.message,
          status: error.status,
          error: error
        });
        analytics.track("Image Upscale", {
          tool: "upscale",
          action: "upscale",
          success: false,
          target_size: targetSize,
          error_type: error.message?.substring(0, 50) || "unknown",
        });
        throw error;
      }

      if (!data) {
        console.error('❌ [Upscale] No data in response');
        analytics.track("Image Upscale", {
          tool: "upscale",
          action: "upscale",
          success: false,
          target_size: targetSize,
          error_type: "no_data",
        });
        throw new Error('No response data from server');
      }

      console.log('🔍 [Upscale] Response data structure:', {
        hasImage: !!data.image,
        imageType: typeof data.image,
        imagePrefix: data.image ? data.image.substring(0, 50) : 'null',
        imageLength: data.image?.length || 0,
        hasThumbnail: !!data.thumbnail,
        hasAssetId: !!data.assetId,
        allKeys: Object.keys(data)
      });

      if (!data?.image) {
        console.error('❌ [Upscale] No image field in response data', {
          availableKeys: Object.keys(data),
          dataString: JSON.stringify(data).substring(0, 500)
        });
        analytics.track("Image Upscale", {
          tool: "upscale",
          action: "upscale",
          success: false,
          target_size: targetSize,
          error_type: "no_image_data",
        });
        throw new Error('No upscaled image returned');
      }

      // Validate and set image IMMEDIATELY
      let validatedImage = data.image;
      
      // Handle both HTTP(S) URLs and base64 data URIs
      if (data.image.startsWith('http://') || data.image.startsWith('https://')) {
        // Already a valid URL, use as-is
        validatedImage = data.image;
        console.log('✅ [Upscale] Received HTTP(S) URL from edge function');
      } else if (!data.image.startsWith('data:image/')) {
        // Assume it's base64 without prefix, add it
        validatedImage = `data:image/png;base64,${data.image}`;
        console.log('⚠️ [Upscale] Adding data URI prefix to base64 image');
      } else {
        // Already a valid data URI
        validatedImage = data.image;
        console.log('✅ [Upscale] Received data URI from edge function');
      }

      console.log('✅ [Upscale] Image validated, setting state immediately');
      setUpscaledImage(validatedImage);
      toolState.handleSuccess();
      
      // Edge function already saves, but ensure it's saved using unified function as fallback
      const duration = Date.now() - startTime;
      if (data.assetId) {
        // Already saved by edge function
        setUpscaledAssetId(data.assetId);
        console.log('✅ [Upscale] Asset saved by edge function:', data.assetId);
      } else {
        // Fallback: save using unified function
        const { ensureAssetSaved } = await import('@/lib/saveAsset');
        ensureAssetSaved({
          imageUrl: validatedImage, // base64 data URL
          action: 'upscale',
          prompt: `Upscaled to ${targetSize}`,
          sourceUrls: [base64Image],
          params: {
            targetSize: targetSize,
            originalSize: sourceImage?.file.size
          },
          durationMs: duration,
          skipToast: true, // Upscale already shows success toast
        }).then(async (assetId) => {
          if (assetId) {
            setUpscaledAssetId(assetId);
          }
        }).catch((err) => {
          // Silently handle - saveAsset already handles errors silently
          console.error('[Upscale] Background save failed:', err);
        });
      }
      
      // Track user behavior for intelligence
      try {
        const { learnFromUserAction } = await import('@/lib/intelligence/userBehavior');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await learnFromUserAction(user.id, 'upscale', validatedImage, {
            targetSize: targetSize,
          });
        }
      } catch {
        // Silently fail - intelligence is optional
      }
      
      // Track successful upscale
      analytics.track("Image Upscale", {
        tool: "upscale",
        action: "upscale",
        success: true,
        target_size: targetSize,
        duration_ms: duration,
        asset_id: data.assetId || undefined,
      });
      
      toast.success("Image upscaled successfully!");
    } catch (error: unknown) {
      clearInterval(progressInterval);
      console.error("❌ [Upscale] Error:", error);

      const errorMessage = mapErrorMessage(error);
      toolState.handleError(errorMessage);
      toast.error(errorMessage);
      
      // Track upscale failure (if not already tracked above)
      if (error && !(error as any).__analyticsTracked) {
        analytics.track("Image Upscale", {
          tool: "upscale",
          action: "upscale",
          success: false,
          target_size: targetSize,
          error_type: errorMessage?.substring(0, 50) || "unknown",
        });
      }
    } finally {
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Removed saveToMyProjects - now using unified ensureAssetSaved directly

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

  const handleUseInStudio = () => {
    if (!upscaledImage) return;

    const studioPrompt = `Generate a high-resolution ${targetSize} variation of this upscaled image concept`;

    (async () => {
      try {
        await openStudioWithPrompt({
          basePrompt: studioPrompt,
          imageUrl: upscaledImage,
          meta: { source: "upscale" },
        });
        handleClose();
      } catch (error) {
        console.error('[Upscale] Error opening Studio:', error);
        toast.error("Unable to open Studio");
      }
    })();
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

  const bodyContent = (
    <div className="space-y-4">
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
                onValueChange={(value) =>
                  setTargetSize(value as '1536x1536' | '2048x2048')
                }
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
        </div>
      );

  const footerContent = upscaledImage ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleUseInStudio} className="min-h-[48px] w-full sm:flex-1">
          <Wand2 className="w-4 h-4 mr-2" />
          Generate in Studio
        </Button>
        <Button
          variant="outline"
          onClick={handleDownload}
          className="min-h-[48px] w-full sm:flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
      <Button
        variant="ghost"
        onClick={() => {
          setUpscaledImage(null);
          setUpscaledAssetId(null);
          if (sourceImage) {
            URL.revokeObjectURL(sourceImage.preview);
          }
          setSourceImage(null);
          setTargetSize("1536x1536");
        }}
        className="w-full"
      >
        Upscale Another Image
      </Button>
    </div>
  ) : (
    <Button
      onClick={handleUpscale}
      disabled={toolState.isProcessing || !sourceImage}
      className="w-full min-h-[48px]"
      size="lg"
    >
      <Maximize2 className="w-4 h-4 mr-2" />
      {toolState.isProcessing ? "Upscaling..." : "Upscale Image"}
    </Button>
  );

  return (
    <ToolDrawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
        } else {
          handleClose();
        }
      }}
      title={
        <>
          <Maximize2 className="w-5 h-5" />
          Upscale Image
        </>
      }
      description="Upscale your image to higher resolution. Free while subscriptions are being finalized!"
      contentClassName="pb-6"
      footer={footerContent}
    >
      {bodyContent}
    </ToolDrawer>
  );
};
