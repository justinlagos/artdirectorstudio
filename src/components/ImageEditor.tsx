import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RotateCw, Download, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onImageEdited?: (newImageUrl: string) => void;
}

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  warmth: number;
  exposure: number;
}

export const ImageEditor = ({ open, onOpenChange, imageUrl, onImageEdited }: ImageEditorProps) => {
  const [adjustments, setAdjustments] = useState<Adjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    warmth: 0,
    exposure: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);

  useEffect(() => {
    setPreviewUrl(imageUrl);
  }, [imageUrl]);

  const generateFilterStyle = (adj: Adjustments) => {
    const filters = [
      `brightness(${adj.brightness}%)`,
      `contrast(${adj.contrast}%)`,
      `saturate(${adj.saturation}%)`,
      `hue-rotate(${adj.hue}deg)`,
      adj.warmth > 0 ? `sepia(${Math.abs(adj.warmth)}%)` : `saturate(${100 + adj.warmth}%)`,
      `brightness(${100 + adj.exposure}%)`,
    ];
    return filters.join(' ');
  };

  const generatePromptFromAdjustments = (adj: Adjustments): string => {
    const changes: string[] = [];
    
    if (adj.brightness !== 100) {
      const diff = adj.brightness - 100;
      if (diff > 10) changes.push(`increase brightness by ${Math.round(diff)}%`);
      else if (diff < -10) changes.push(`decrease brightness by ${Math.abs(Math.round(diff))}%`);
    }
    
    if (adj.contrast !== 100) {
      const diff = adj.contrast - 100;
      if (diff > 10) changes.push(`increase contrast by ${Math.round(diff)}%`);
      else if (diff < -10) changes.push(`decrease contrast by ${Math.abs(Math.round(diff))}%`);
    }
    
    if (adj.saturation !== 100) {
      const diff = adj.saturation - 100;
      if (diff > 10) changes.push(`make colors more vibrant by ${Math.round(diff)}%`);
      else if (diff < -10) changes.push(`reduce color saturation by ${Math.abs(Math.round(diff))}%`);
    }
    
    if (Math.abs(adj.hue) > 5) {
      changes.push(`shift color hue by ${Math.round(adj.hue)} degrees`);
    }
    
    if (Math.abs(adj.warmth) > 10) {
      if (adj.warmth > 0) changes.push(`add warm tones (${Math.round(adj.warmth)}% warmer)`);
      else changes.push(`add cool tones (${Math.abs(Math.round(adj.warmth))}% cooler)`);
    }
    
    if (Math.abs(adj.exposure) > 10) {
      if (adj.exposure > 0) changes.push(`increase exposure by ${Math.round(adj.exposure)}%`);
      else changes.push(`decrease exposure by ${Math.abs(Math.round(adj.exposure))}%`);
    }

    if (changes.length === 0) {
      return "Keep the image exactly as is";
    }

    return `Adjust the image to ${changes.join(', ')}. Maintain the overall composition and subject matter.`;
  };

  const handleApplyEdits = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const prompt = generatePromptFromAdjustments(adjustments);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            prompt,
            quality: 'high'
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to apply edits');
      }

      const result = await response.json();
      
      if (result.success && result.image) {
        setPreviewUrl(result.image);
        toast.success("Edits applied successfully!");
        onImageEdited?.(result.image);
      } else {
        throw new Error('No image returned from edit');
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply edits');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      warmth: 0,
      exposure: 0,
    });
    setPreviewUrl(imageUrl);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded!");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const updateAdjustment = (key: keyof Adjustments, value: number[]) => {
    setAdjustments(prev => ({ ...prev, [key]: value[0] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Edit Image
          </DialogTitle>
          <DialogDescription>
            Adjust colors, lighting, and exposure. Click "Apply with AI" to process changes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain transition-all duration-200"
                style={{ filter: generateFilterStyle(adjustments) }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                <RotateCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Brightness</Label>
                    <span className="text-sm text-muted-foreground">{adjustments.brightness}%</span>
                  </div>
                  <Slider
                    value={[adjustments.brightness]}
                    onValueChange={(val) => updateAdjustment('brightness', val)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Contrast</Label>
                    <span className="text-sm text-muted-foreground">{adjustments.contrast}%</span>
                  </div>
                  <Slider
                    value={[adjustments.contrast]}
                    onValueChange={(val) => updateAdjustment('contrast', val)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Saturation</Label>
                    <span className="text-sm text-muted-foreground">{adjustments.saturation}%</span>
                  </div>
                  <Slider
                    value={[adjustments.saturation]}
                    onValueChange={(val) => updateAdjustment('saturation', val)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Hue Shift</Label>
                    <span className="text-sm text-muted-foreground">{adjustments.hue}°</span>
                  </div>
                  <Slider
                    value={[adjustments.hue]}
                    onValueChange={(val) => updateAdjustment('hue', val)}
                    min={-180}
                    max={180}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Warmth</Label>
                    <span className="text-sm text-muted-foreground">
                      {adjustments.warmth > 0 ? `+${adjustments.warmth}` : adjustments.warmth}%
                    </span>
                  </div>
                  <Slider
                    value={[adjustments.warmth]}
                    onValueChange={(val) => updateAdjustment('warmth', val)}
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Exposure</Label>
                    <span className="text-sm text-muted-foreground">
                      {adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}%
                    </span>
                  </div>
                  <Slider
                    value={[adjustments.exposure]}
                    onValueChange={(val) => updateAdjustment('exposure', val)}
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={handleApplyEdits} 
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply with AI
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Adjustments are previewed locally. Click "Apply with AI" to generate the final edited image.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
