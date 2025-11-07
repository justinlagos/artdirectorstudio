import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Blend, X, Upload, Sparkles, FolderOpen, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ImageBlendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImageFile {
  file: File;
  preview: string;
}

export const ImageBlendDialog = ({ open, onOpenChange }: ImageBlendDialogProps) => {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [instruction, setInstruction] = useState("Blend these images seamlessly together");
  const [isBlending, setIsBlending] = useState(false);
  const [blendedImage, setBlendedImage] = useState<string | null>(null);
  const [blendedAssetId, setBlendedAssetId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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

    setIsBlending(true);
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
      console.log('🎨 [Blend] Starting blend process with', images.length, 'images');
      
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [Blend] No session found');
        toast.error("Please log in to continue.");
        setIsBlending(false);
        clearInterval(progressInterval);
        return;
      }

      console.log('✅ [Blend] Session validated');

      // Convert files to base64 for edge function
      console.log('📸 [Blend] Converting images to base64...');
      const base64Images = await Promise.all(
        images.map((img, idx) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log(`✅ [Blend] Image ${idx + 1} converted, size: ${(reader.result as string).length} chars`);
            resolve(reader.result as string);
          };
          reader.onerror = (error) => {
            console.error(`❌ [Blend] Failed to read image ${idx + 1}:`, error);
            reject(error);
          };
          reader.readAsDataURL(img.file);
        }))
      );

      console.log('🚀 [Blend] Invoking blend-images edge function...');
      const { data, error } = await supabase.functions.invoke("blend-images", {
        body: { images: base64Images, instruction },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('📦 [Blend] Response received:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        hasImage: !!data?.image,
        imageLength: data?.image?.length || 0,
        imagePrefix: data?.image?.substring(0, 50) || 'N/A'
      });

      if (error) {
        console.error('❌ [Blend] Edge function error:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ [Blend] No data returned from edge function');
        toast.error('No response from server');
        return;
      }

      if (!data.image) {
        console.error('❌ [Blend] Response missing image field. Full response:', data);
        toast.error('Image generation failed - no image returned');
        return;
      }

      // Validate image format
      let validatedImage = data.image;
      if (!data.image.startsWith('data:image/')) {
        console.warn('⚠️ [Blend] Invalid image format, adding data URI prefix');
        validatedImage = `data:image/png;base64,${data.image}`;
      }

      console.log('✅ [Blend] Image validated, setting state');
      setBlendedImage(validatedImage);
      
      // Auto-save to My Projects
      console.log('💾 [Blend] Saving to My Projects...');
      await saveToMyProjects(validatedImage, instruction);
      
      console.log('🎉 [Blend] Blend completed successfully');
      toast.success("Images blended successfully!");
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("❌ [Blend] Error occurred:", {
        message: error?.message,
        details: error,
        stack: error?.stack
      });
      
      // Check for specific error types
      if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
        toast.error("Rate limit exceeded", {
          description: "Please wait a minute and try again.",
          duration: 5000,
        });
      } else if (error?.message?.includes('Credits exhausted') || error?.message?.includes('402')) {
        toast.error("Credits exhausted", {
          description: "Please add credits to continue.",
          duration: 7000,
        });
      } else {
        toast.error("Failed to blend images", {
          description: error?.message || "Please try again.",
        });
      }
    } finally {
      setIsBlending(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const saveToMyProjects = async (imageDataUrl: string, prompt: string) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${user.id}/blended-${Date.now()}.png`;
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
          prompt: prompt,
          quality: 'standard',
          size: '1536x1536'
        })
        .select()
        .single();

      if (dbError) throw dbError;
      
      if (assetData) {
        setBlendedAssetId(assetData.id);
      }
    } catch (error) {
      console.error('Error saving to My Projects:', error);
      // Don't show error to user, as blend was successful
    } finally {
      setIsSaving(false);
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

  const handleViewInStudio = () => {
    if (!blendedAssetId) {
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
    // Clean up object URLs to prevent memory leaks
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setBlendedImage(null);
    setBlendedAssetId(null);
    setInstruction("Blend these images seamlessly together");
    setProgress(0);
    setIsSaving(false);
    onOpenChange(false);
  };

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Blend className="w-5 h-5" />
            Blend Images
          </DialogTitle>
          <DialogDescription>
            Upload 2-4 images to blend them together. Free while subscriptions are being finalized!
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

                {/* Image Display */}
                <div className="relative w-full rounded-lg overflow-hidden bg-muted/30 ring-1 ring-border/30">
                  <img
                    src={blendedImage}
                    alt="Blended result"
                    className="w-full h-auto max-h-[600px] object-contain mx-auto"
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      height: 'auto',
                    }}
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
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span>Type: Image Blend</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </CardContent>

              <CardFooter className="flex-col gap-3 p-6 pt-0">
                {/* Primary Actions */}
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleViewInStudio}
                    className="flex-1"
                    disabled={!blendedAssetId}
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
                    setBlendedImage(null);
                    setBlendedAssetId(null);
                    setImages([]);
                    setInstruction("Blend these images seamlessly together");
                  }}
                  className="w-full"
                >
                  Blend New Images
                </Button>
              </CardFooter>
            </Card>
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
              {isBlending ? "Blending..." : "Blend Images"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
