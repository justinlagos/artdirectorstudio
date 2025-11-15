import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Blend, X, Upload, Sparkles, FolderOpen, CheckCircle2, Wand2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ImageZoomDialog } from "./ImageZoomDialog";
import { useToolState } from "@/hooks/useToolState";
import { mapErrorMessage } from "@/lib/toolErrorMessages";
import { ToolDrawer } from "./ToolDrawer";
import { openStudioWithPrompt } from "@/lib/studio";
import { analytics } from "@/lib/analytics";

const BLEND_STYLE_PRESETS = [
  { id: "modern", label: "Modern", hint: "Modern minimal aesthetic" },
  { id: "cinematic", label: "Cinematic", hint: "Cinematic lighting and depth" },
  { id: "editorial", label: "Editorial", hint: "Editorial magazine composition" },
  { id: "dreamlike", label: "Dreamlike", hint: "Ethereal dreamlike atmosphere" },
  { id: "high-contrast", label: "High contrast", hint: "High contrast dramatic tones" },
] as const;

interface ImageBlendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImageFile {
  file: File;
  preview: string;
}

export const ImageBlendDialog = ({ open, onOpenChange }: ImageBlendDialogProps) => {
  const toolState = useToolState();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [instruction, setInstruction] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [blendedImage, setBlendedImage] = useState<string | null>(null);
  const [blendedAssetId, setBlendedAssetId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [blendStartTime, setBlendStartTime] = useState<number>(0);
  const [blendPrompt, setBlendPrompt] = useState<string>("");

  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]
    );
  };

  const buildFinalInstruction = (input: string, styles: string[]) => {
    const trimmed = input.trim();
    const base = trimmed.length
      ? trimmed
      : "Blend these images into a cohesive visual that respects shared color and lighting.";
    const hints = styles
      .map((id) => BLEND_STYLE_PRESETS.find((preset) => preset.id === id)?.hint)
      .filter((hint) => Boolean(hint)) as string[];
    const combined = hints.length ? `${base}. ${hints.join(". ")}` : base;
    return `${combined}. Create a seamless blend that feels unified and cohesive.`;
  };

  const validateImage = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Check file type
    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validFormats.includes(file.type.toLowerCase())) {
      return { 
        valid: false, 
        error: `${file.name}: Invalid format. Only PNG, JPG, and WebP are supported.` 
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.` 
      };
    }

    // Check dimensions
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const minDimension = 256;
        const maxDimension = 4096;
        
        if (img.width < minDimension || img.height < minDimension) {
          resolve({ 
            valid: false, 
            error: `${file.name}: Image too small (${img.width}×${img.height}px). Minimum is ${minDimension}×${minDimension}px.` 
          });
        } else if (img.width > maxDimension || img.height > maxDimension) {
          resolve({ 
            valid: false, 
            error: `${file.name}: Image too large (${img.width}×${img.height}px). Maximum is ${maxDimension}×${maxDimension}px.` 
          });
        } else {
          resolve({ valid: true });
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ 
          valid: false, 
          error: `${file.name}: Failed to load image. File may be corrupted.` 
        });
      };
      
      img.src = url;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }

    // Validate all files
    const validationResults = await Promise.all(
      files.map(file => validateImage(file))
    );

    // Show errors for invalid files
    const errors = validationResults
      .filter(result => !result.valid)
      .map(result => result.error);
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error || "Validation failed"));
      return;
    }

    // Add valid files
    files.forEach(file => {
      const preview = URL.createObjectURL(file);
      setImages(prev => [...prev, { file, preview }]);
    });

    toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added successfully`);
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

    const idempotencyKey = crypto.randomUUID();
    const startTime = Date.now();
    setBlendStartTime(startTime);
    
    toolState.startProcessing();
    setProgress(0);
    setBlendedImage(null);

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
      console.log('🎨 [Blend] Starting blend process with', images.length, 'images, idempotency:', idempotencyKey);

      const trimmedInstruction = instruction.trim();
      const finalInstruction = buildFinalInstruction(trimmedInstruction, selectedStyles);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [Blend] No session found');
        toolState.handleError("Please sign in to use this feature.");
        toast.error("Please sign in to continue.");
        clearInterval(progressInterval);
        return;
      }

      // Convert files to base64 with validation
      console.log('🔄 [Blend] Converting files to base64...', {
        imageCount: images.length,
        fileNames: images.map(img => img.file.name),
        fileSizes: images.map(img => `${(img.file.size / 1024 / 1024).toFixed(2)}MB`)
      });

      const base64Images = await Promise.all(
        images.map((img, index) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            
            // Validate base64 format
            if (!result.startsWith('data:image/')) {
              console.error(`❌ [Blend] Invalid base64 format for image ${index + 1}`);
              reject(new Error(`Image ${index + 1}: Invalid format`));
              return;
            }
            
            console.log(`✅ [Blend] Image ${index + 1} converted`, {
              fileName: img.file.name,
              base64Length: result.length,
              estimatedSizeMB: (result.length / 1.33 / 1024 / 1024).toFixed(2)
            });
            resolve(result);
          };
          reader.onerror = (error) => {
            console.error(`❌ [Blend] FileReader error for image ${index + 1}:`, error);
            reject(new Error(`Failed to read image ${index + 1}`));
          };
          reader.readAsDataURL(img.file);
        }))
      );

      // Final validation before API call
      for (let i = 0; i < base64Images.length; i++) {
        if (!base64Images[i] || !base64Images[i].startsWith('data:image/')) {
          console.error(`❌ [Blend] Validation failed for image ${i + 1}`);
          throw new Error(`Image ${i + 1} is invalid`);
        }
      }

      console.log('🚀 [Blend] Invoking blend-images edge function...', {
        imageCount: base64Images.length,
        instructionLength: finalInstruction.length,
        hasStylePresets: selectedStyles.length > 0
      });

      interface BlendRequestPayload {
        images: string[];
        stylePresets: string[];
        idempotencyKey: string;
        instruction?: string;
      }

      const payload: BlendRequestPayload = {
        images: base64Images,
        stylePresets: selectedStyles,
        idempotencyKey,
      };

      if (trimmedInstruction.length) {
        payload.instruction = trimmedInstruction;
      }

      console.log('📤 [Blend] Sending request to blend-images', {
        payloadKeys: Object.keys(payload),
        imageCount: payload.images.length,
        hasInstruction: !!payload.instruction,
        hasStylePresets: payload.stylePresets.length > 0,
        idempotencyKey: payload.idempotencyKey
      });

      const { data, error } = await supabase.functions.invoke("blend-images", {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      // CRITICAL: Log full response for debugging
      console.log('📥 [Blend] Raw response from edge function:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        dataType: typeof data,
        errorMessage: error?.message,
        errorDetails: error
      });

      if (error) {
        console.error('❌ [Blend] Edge function error:', {
          message: error.message,
          status: error.status,
          error: error
        });
        analytics.track("Image Blend", {
          tool: "blend",
          action: "blend",
          success: false,
          image_count: images.length,
          error_type: error.message?.substring(0, 50) || "unknown",
        });
        throw error;
      }

      if (!data) {
        console.error('❌ [Blend] No data in response');
        analytics.track("Image Blend", {
          tool: "blend",
          action: "blend",
          success: false,
          image_count: images.length,
          error_type: "no_data",
        });
        throw new Error('No response data from server');
      }

      console.log('🔍 [Blend] Response data structure:', {
        hasImage: !!data.image,
        imageType: typeof data.image,
        imagePrefix: data.image ? data.image.substring(0, 50) : 'null',
        imageLength: data.image?.length || 0,
        hasThumbnail: !!data.thumbnail,
        hasAssetId: !!data.assetId,
        allKeys: Object.keys(data)
      });

      if (!data.image) {
        console.error('❌ [Blend] No image field in response data', {
          availableKeys: Object.keys(data),
          dataString: JSON.stringify(data).substring(0, 500)
        });
        analytics.track("Image Blend", {
          tool: "blend",
          action: "blend",
          success: false,
          image_count: images.length,
          error_type: "no_image_data",
        });
        throw new Error('No blended image returned');
      }

      // Validate and set image IMMEDIATELY for instant display
      let validatedImage = data.image;
      
      // Handle both HTTP(S) URLs and base64 data URIs
      if (data.image.startsWith('http://') || data.image.startsWith('https://')) {
        // Already a valid URL, use as-is
        validatedImage = data.image;
        console.log('✅ [Blend] Received HTTP(S) URL from edge function');
      } else if (!data.image.startsWith('data:image/')) {
        // Assume it's base64 without prefix, add it
        validatedImage = `data:image/png;base64,${data.image}`;
        console.log('⚠️ [Blend] Adding data URI prefix to base64 image');
      } else {
        // Already a valid data URI
        validatedImage = data.image;
        console.log('✅ [Blend] Received data URI from edge function');
      }

      console.log('✅ [Blend] Image validated, setting state immediately');
      setBlendedImage(validatedImage);
      setBlendPrompt(finalInstruction);
      toolState.handleSuccess();

      // Save to database in background (don't block UI)
      const duration = Date.now() - startTime;
      saveToMyProjects(validatedImage, finalInstruction, base64Images, duration, selectedStyles).catch((err: unknown) => {
        console.error('Background save failed:', err);
        // Don't show error since blend succeeded
      });

      // Track successful blend
      analytics.track("Image Blend", {
        tool: "blend",
        action: "blend",
        success: true,
        image_count: images.length,
        duration_ms: duration,
        asset_id: data.assetId || undefined,
      });

      toast.success("Images blended successfully!");
    } catch (error: unknown) {
      clearInterval(progressInterval);
      console.error("❌ [Blend] Error occurred:", error);
      const fallbackMessage = "Blend failed. Try a smaller image or a simpler style.";
      const errorMessage = mapErrorMessage(error);
      if (errorMessage && errorMessage !== fallbackMessage) {
        console.warn("Blend error detail:", errorMessage);
      }
      toolState.handleError(fallbackMessage);
      toast.error(fallbackMessage);
      
      // Track blend failure (if not already tracked above)
      if (error && !(error as any).__analyticsTracked) {
        analytics.track("Image Blend", {
          tool: "blend",
          action: "blend",
          success: false,
          image_count: images.length,
          error_type: errorMessage?.substring(0, 50) || "unknown",
        });
      }
    } finally {
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const saveToMyProjects = async (
    imageDataUrl: string,
    prompt: string,
    sourceImages: string[],
    duration: number,
    styles: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Storage path MUST start with user ID for RLS policy: {userId}/blend/{yyyy-mm}/{uuid}.png
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const uuid = crypto.randomUUID();
      const fileName = `${user.id}/blend/${yearMonth}/${uuid}.png`;
      
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
          action: 'blend',
          image_url: publicUrl,
          prompt: prompt,
          source_urls: sourceImages,
          params: {
            imageCount: sourceImages.length,
            instruction: prompt,
            styles
          },
          duration_ms: duration,
          // share_slug auto-generated by trigger
        })
        .select()
        .single();

      if (dbError) throw dbError;
      
      if (assetData) {
        setBlendedAssetId(assetData.id);
        console.log('✅ [Blend] Saved to DB with share slug:', assetData.share_slug);
      }
    } catch (error: unknown) {
      console.error('Error saving to My Projects:', error);
      throw error; // Re-throw to be caught by background handler
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

  const handleUseInStudio = () => {
    if (!blendedImage) return;

    const studioPrompt = blendPrompt || buildFinalInstruction(instruction, selectedStyles);

    openStudioWithPrompt({
      basePrompt: studioPrompt,
      imageUrl: blendedImage,
      meta: { source: "blend", styles: selectedStyles },
    });
    handleClose();
  };

  const handleClose = () => {
    // Clean up object URLs to prevent memory leaks
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setBlendedImage(null);
    setBlendedAssetId(null);
    setInstruction("");
    setSelectedStyles([]);
    setBlendPrompt("");
    setProgress(0);
    toolState.reset();
    onOpenChange(false);
  };

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const bodyContent = (
    <div className="space-y-4">
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
                  disabled={toolState.isProcessing}
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
                  <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center h-40 p-2">
                    <img 
                      src={img.preview} 
                      alt={`Image ${index + 1}`} 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px]"
                    onClick={() => removeImage(index)}
                    disabled={toolState.isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Blend Instruction */}
          {images.length >= 2 && !blendedImage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Style presets</Label>
                <div className="flex flex-wrap gap-2">
                  {BLEND_STYLE_PRESETS.map((preset) => {
                    const isActive = selectedStyles.includes(preset.id);
                    return (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={isActive ? "secondary" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => toggleStyle(preset.id)}
                        disabled={toolState.isProcessing}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instruction">Optional text prompt</Label>
                <Textarea
                  id="instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Add an optional instruction to guide the blend..."
                  className="min-h-[80px] resize-none"
                  disabled={toolState.isProcessing}
                />
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {toolState.isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Blending images... (~20-40 seconds)
              </p>
            </div>
          )}

          {/* Blended Image Result - Studio Style */}
          {blendedImage && (
            <Card className="shadow-lg ring-1 ring-border/50">
              <CardContent className="p-6 space-y-4">
                {/* Success Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Blend Complete</span>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    Generated
                  </Badge>
                </div>

                {/* Image Display with Zoom */}
                <div className="relative w-full rounded-lg overflow-hidden bg-muted/30 ring-1 ring-border/30 group">
                  <img
                    src={blendedImage}
                    alt="Blended result"
                    className="w-full h-auto max-h-[600px] object-contain mx-auto cursor-pointer"
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      height: 'auto',
                    }}
                    onClick={() => setShowZoom(true)}
                    onLoad={() => console.log('✅ [Blend] Image loaded successfully in UI:', { 
                      timestamp: new Date().toISOString(),
                      imageSize: blendedImage.length 
                    })}
                    onError={(e) => {
                      console.error('❌ [Blend] Image failed to load in UI:', {
                        src: blendedImage?.substring(0, 100),
                        error: e,
                        timestamp: new Date().toISOString()
                      });
                      toast.error('Failed to display blended image');
                    }}
                  />
                  {/* Zoom Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                      <ZoomIn className="w-4 h-4" />
                      <span>Click to zoom</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span>Type: Image Blend</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </CardContent>

            </Card>
          )}

          {/* Image Zoom Dialog */}
          {blendedImage && (
            <ImageZoomDialog
              open={showZoom}
              onOpenChange={setShowZoom}
              imageUrl={blendedImage}
              title="Blended Image - Full Resolution"
            />
          )}
        </div>
      );

  const footerContent = blendedImage ? (
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
          setBlendedImage(null);
          setBlendedAssetId(null);
          setImages([]);
          setInstruction("");
          setSelectedStyles([]);
          setBlendPrompt("");
        }}
        className="w-full"
      >
        Blend New Images
      </Button>
    </div>
  ) : (
    <Button
      onClick={handleBlend}
      disabled={toolState.isProcessing || images.length < 2}
      className="w-full min-h-[48px]"
      size="lg"
    >
      <Blend className="w-4 h-4 mr-2" />
      {toolState.isProcessing ? "Blending..." : "Blend Images"}
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
          <Blend className="w-5 h-5" />
          Blend Images
        </>
      }
      description="Upload 2-4 images to blend them together. Free while subscriptions are being finalized!"
      contentClassName="pb-6"
      footer={footerContent}
    >
      {bodyContent}
    </ToolDrawer>
  );
};
