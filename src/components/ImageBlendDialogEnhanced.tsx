import { useState } from "react";
import { openStudioWithPrompt } from "@/lib/studio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Blend, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

interface ImageBlendDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImageFile {
  file: File;
  preview: string;
  weight: number;
}

export const ImageBlendDialogEnhanced = ({ open, onOpenChange }: ImageBlendDialogEnhancedProps) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [instruction, setInstruction] = useState("Blend these images seamlessly with consistent lighting and harmonious color grading");
  const [blendStyle, setBlendStyle] = useState<string>("seamless");
  const [composition, setComposition] = useState<string>("auto");
  const [colorHarmony, setColorHarmony] = useState<string>("auto");
  const [isBlending, setIsBlending] = useState(false);
  const [blendedImage, setBlendedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

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

      const preview = URL.createObjectURL(file);
      setImages(prev => [...prev, { file, preview, weight: 50 }]);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const img = prev[index];
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateWeight = (index: number, weight: number) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, weight } : img));
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
      console.log('🎨 [BlendPro] Starting professional blend with', images.length, 'images');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [BlendPro] No session found');
        toast.error("Please log in to continue.");
        setIsBlending(false);
        clearInterval(progressInterval);
        return;
      }

      console.log('✅ [BlendPro] Session validated');

      // Convert files to base64
      console.log('📸 [BlendPro] Converting images to base64...');
      const base64Images = await Promise.all(
        images.map((img, idx) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log(`✅ [BlendPro] Image ${idx + 1} converted`);
            resolve(reader.result as string);
          };
          reader.onerror = (error) => {
            console.error(`❌ [BlendPro] Failed to read image ${idx + 1}:`, error);
            reject(error);
          };
          reader.readAsDataURL(img.file);
        }))
      );

      // Build enhanced instruction with blend parameters
      const enhancedInstruction = `${instruction}
        
Blend Style: ${blendStyle}
Composition: ${composition}
Color Harmony: ${colorHarmony}
Image Weights: ${images.map((img, i) => `Image ${i + 1}: ${img.weight}%`).join(', ')}

Requirements:
- Consistent lighting direction across all elements
- Seamless transitions with no visible seams
- Harmonious color grading throughout
- Proper perspective and scale alignment
- Unified artistic style and mood
- Professional, designer-quality result`;

      console.log('🚀 [BlendPro] Invoking blend-images with enhanced instruction');
      const { data, error } = await supabase.functions.invoke("blend-images", {
        body: { images: base64Images, instruction: enhancedInstruction },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('📦 [BlendPro] Response:', {
        hasData: !!data,
        hasError: !!error,
        hasImage: !!data?.image,
        imageLength: data?.image?.length || 0
      });

      if (error) {
        console.error('❌ [BlendPro] Edge function error:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ [BlendPro] No data returned');
        toast.error('No response from server');
        return;
      }

      if (!data.image) {
        console.error('❌ [BlendPro] No image in response');
        toast.error('Image generation failed');
        return;
      }

      // Validate image format
      let validatedImage = data.image;
      if (!data.image.startsWith('data:image/')) {
        console.warn('⚠️ [BlendPro] Adding data URI prefix');
        validatedImage = `data:image/png;base64,${data.image}`;
      }

      console.log('✅ [BlendPro] Setting blended image');
      setBlendedImage(validatedImage);
      
      // Auto-save to My Projects
      console.log('💾 [BlendPro] Saving to projects...');
      await saveToMyProjects(validatedImage);
      
      console.log('🎉 [BlendPro] Blend completed successfully');
      toast.success("Images blended professionally!");
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("❌ [BlendPro] Error:", {
        message: error?.message,
        details: error
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
        toast.error("Failed to blend images", {
          description: error?.message || "Please try again.",
        });
      }
    } finally {
      setIsBlending(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const saveToMyProjects = async (imageDataUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${user.id}/blended-${Date.now()}.png`;
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

      // Save metadata to database
      await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          type: 'image' as const,
          image_url: publicUrl,
          prompt: instruction
        });
    } catch (error) {
      console.error('Error saving blend:', error);
    }
  };

  const handleDownload = () => {
    if (!blendedImage) return;
    
    const link = document.createElement('a');
    link.href = blendedImage;
    link.download = `professional-blend-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded!");
  };

  const handleClose = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setBlendedImage(null);
    setInstruction("Blend these images seamlessly with consistent lighting and harmonious color grading");
    setBlendStyle("seamless");
    setComposition("auto");
    setColorHarmony("auto");
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Blend className="w-5 h-5" />
            Professional Image Blend
          </DialogTitle>
          <DialogDescription>
            Upload 2-4 images and customize blend parameters. Free while subscriptions are being finalized!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Upload */}
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
                  id="blend-images-enhanced"
                  disabled={isBlending}
                />
                <label htmlFor="blend-images-enhanced" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload images (2-4 required)
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Image Preview with Weight Controls */}
          {images.length > 0 && !blendedImage && (
            <div className="space-y-4">
              <Label>Images & Composition Weights</Label>
              <div className="space-y-4">
                {images.map((img, index) => (
                  <div key={index} className="flex gap-4 items-start p-4 rounded-lg bg-muted/30">
                    <div className="relative group">
                      <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center w-24 h-24 p-1">
                        <img 
                          src={img.preview} 
                          alt={`Image ${index + 1}`} 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => removeImage(index)}
                        disabled={isBlending}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Image {index + 1} Weight</Label>
                        <span className="text-sm font-semibold">{img.weight}%</span>
                      </div>
                      <Slider
                        value={[img.weight]}
                        onValueChange={(values) => updateWeight(index, values[0])}
                        min={0}
                        max={100}
                        step={5}
                        disabled={isBlending}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blend Controls */}
          {images.length >= 2 && !blendedImage && (
            <>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blend-style">Blend Style</Label>
                  <Select
                    value={blendStyle}
                    onValueChange={setBlendStyle}
                    disabled={isBlending}
                  >
                    <SelectTrigger id="blend-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seamless">Seamless Merge</SelectItem>
                      <SelectItem value="overlay">Overlay</SelectItem>
                      <SelectItem value="artistic">Artistic Fusion</SelectItem>
                      <SelectItem value="collage">Collage</SelectItem>
                      <SelectItem value="morphing">Morphing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="composition">Composition</Label>
                  <Select
                    value={composition}
                    onValueChange={setComposition}
                    disabled={isBlending}
                  >
                    <SelectTrigger id="composition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="grid">Grid Layout</SelectItem>
                      <SelectItem value="centered">Centered Focus</SelectItem>
                      <SelectItem value="layered">Layered Depth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color-harmony">Color Harmony</Label>
                  <Select
                    value={colorHarmony}
                    onValueChange={setColorHarmony}
                    disabled={isBlending}
                  >
                    <SelectTrigger id="color-harmony">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="unified">Unified Tone</SelectItem>
                      <SelectItem value="complementary">Complementary</SelectItem>
                      <SelectItem value="analogous">Analogous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instruction">Custom Blend Instruction</Label>
                <Textarea
                  id="instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Describe specific requirements for blending..."
                  className="min-h-[80px] resize-none"
                  disabled={isBlending}
                />
              </div>
            </>
          )}

          {/* Progress */}
          {isBlending && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Creating professional blend... (~30-60 seconds)
              </p>
            </div>
          )}

          {/* Result */}
          {blendedImage && (
            <div className="space-y-4 pt-4 border-t">
              <Label>Professional Blend Result</Label>
              <div className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                <img 
                  src={blendedImage} 
                  alt="Professional blend" 
                  className="w-full h-auto object-contain max-h-[600px]"
                  onLoad={() => console.log('✅ [BlendPro] Image loaded successfully')}
                  onError={(e) => {
                    console.error('❌ [BlendPro] Image failed to load:', e);
                    toast.error('Failed to display image');
                  }}
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
                    openStudioWithPrompt({
                      basePrompt: instruction || "Create a variation of this blended composition",
                      imageUrl: blendedImage || undefined,
                    });
                    handleClose();
                  }}
                  className="flex-1"
                  variant="default"
                >
                  Generate in Studio
                </Button>
                <Button
                  onClick={() => {
                    setBlendedImage(null);
                    setImages([]);
                  }}
                  className="flex-1"
                  variant="outline"
                >
                  <Blend className="w-4 h-4 mr-2" />
                  New Blend
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
              {isBlending ? "Blending..." : "Create Professional Blend"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
