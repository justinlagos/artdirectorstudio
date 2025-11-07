import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, Blend, X, Upload, Sparkles, FolderOpen } from "lucide-react";
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
        setIsBlending(false);
        clearInterval(progressInterval);
        return;
      }

      // Convert files to base64 for edge function
      const base64Images = await Promise.all(
        images.map(img => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(img.file);
        }))
      );

      const { data, error } = await supabase.functions.invoke("blend-images", {
        body: { images: base64Images, instruction },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      if (data?.image) {
        setBlendedImage(data.image);
        
        // Auto-save to My Projects
        await saveToMyProjects(data.image, instruction);
        
        toast.success("Images blended successfully!");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Blend error:", error);
      toast.error("Failed to blend images. Please try again.");
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
            <div className="space-y-4 pt-4 border-t animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Done — images blended successfully</Label>
                {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
              </div>
              
              <div className="relative rounded-lg overflow-hidden bg-muted ring-2 ring-primary/20 animate-scale-in">
                <img 
                  src={blendedImage} 
                  alt="Blended image" 
                  className="w-full h-auto"
                />
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Completed
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleViewInStudio}
                  className="flex-1"
                  disabled={!blendedAssetId}
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
                  setBlendedImage(null);
                  setBlendedAssetId(null);
                  setImages([]);
                }}
                className="w-full"
                variant="outline"
              >
                <Blend className="w-4 h-4 mr-2" />
                Blend New Images
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
