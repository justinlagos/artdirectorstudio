import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Layers, Maximize2, ImageIcon, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const UnifiedToolsModal = () => {
  const {
    isOpen,
    activeTool,
    toolState,
    errorMessage,
    inputs,
    closeTool,
    setToolState,
    setErrorMessage,
    updateInputs,
  } = useToolsModal();
  const isMobile = useIsMobile();

  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [singleImage, setSingleImage] = useState<File | null>(null);
  const [multipleImages, setMultipleImages] = useState<FileList | null>(null);
  const [blendRatio, setBlendRatio] = useState(50);
  const [blendMode, setBlendMode] = useState("smooth");
  const [scaleFactor, setScaleFactor] = useState("2");
  const [quality, setQuality] = useState("balanced");
  const [batchOperation, setBatchOperation] = useState("analyze");
  const [batchPrompt, setBatchPrompt] = useState("");

  // Load persisted inputs when tool changes
  useEffect(() => {
    if (activeTool === 'blend' && inputs.blend) {
      setImage1(inputs.blend.image1 || null);
      setImage2(inputs.blend.image2 || null);
      setBlendRatio(inputs.blend.ratio || 50);
      setBlendMode(inputs.blend.mode || "smooth");
    } else if (activeTool === 'upscale' && inputs.upscale) {
      setSingleImage(inputs.upscale.image || null);
      setScaleFactor(inputs.upscale.scaleFactor || "2");
      setQuality(inputs.upscale.quality || "balanced");
    } else if (activeTool === 'batch' && inputs.batch) {
      setMultipleImages(inputs.batch.images || null);
      setBatchOperation(inputs.batch.operation || "analyze");
      setBatchPrompt(inputs.batch.prompt || "");
    }
  }, [activeTool, inputs]);

  const getToolConfig = () => {
    switch (activeTool) {
      case 'blend':
        return {
          icon: Layers,
          title: 'Blend Images',
          description: 'Seamlessly combine two images with customizable blend modes'
        };
      case 'upscale':
        return {
          icon: Maximize2,
          title: 'Upscale Image',
          description: 'Enhance image resolution with AI-powered upscaling'
        };
      case 'batch':
        return {
          icon: ImageIcon,
          title: 'Batch Processing',
          description: 'Process multiple images at once with consistent operations'
        };
      default:
        return { icon: Layers, title: '', description: '' };
    }
  };

  const handleProcess = async () => {
    if (!activeTool) return;

    // Persist current inputs
    if (activeTool === 'blend') {
      updateInputs('blend', { image1, image2, ratio: blendRatio, mode: blendMode });
    } else if (activeTool === 'upscale') {
      updateInputs('upscale', { image: singleImage, scaleFactor, quality });
    } else if (activeTool === 'batch') {
      updateInputs('batch', { images: multipleImages, operation: batchOperation, prompt: batchPrompt });
    }

    setToolState('loading');
    setErrorMessage(null);

    try {
      // Simulate processing (replace with actual API calls)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/error for demo
      if (Math.random() > 0.2) {
        setToolState('success');
        toast.success(`${activeTool} completed successfully!`);
        setTimeout(() => {
          closeTool();
        }, 2000);
      } else {
        throw new Error('Processing failed. Please try again.');
      }
    } catch (error: any) {
      setToolState('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
      toast.error(error.message || 'Processing failed');
    }
  };

  const handleRetry = () => {
    setToolState('idle');
    setErrorMessage(null);
  };

  const config = getToolConfig();
  const Icon = config.icon;

  const renderStateView = () => {
    if (toolState === 'loading') {
      return (
        <div className="py-12 space-y-4">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Preparing…</p>
            <p className="text-sm text-muted-foreground">Processing your {activeTool} request</p>
          </div>
          <Progress value={undefined} className="w-full" />
        </div>
      );
    }

    if (toolState === 'success') {
      return (
        <div className="py-12 space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Ready</p>
            <p className="text-sm text-muted-foreground">Your {activeTool} is complete</p>
          </div>
        </div>
      );
    }

    if (toolState === 'error') {
      return (
        <div className="py-6 space-y-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage || "This didn't complete. Try again."}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button onClick={handleRetry} className="flex-1">
              Retry
            </Button>
            <Button onClick={closeTool} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // Idle state - show form
    return renderForm();
  };

  const renderForm = () => {
    if (activeTool === 'blend') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blend-image1">First Image</Label>
            <Input 
              id="blend-image1" 
              type="file" 
              accept="image/*" 
              onChange={(e) => setImage1(e.target.files?.[0] || null)}
            />
            {image1 && <p className="text-xs text-muted-foreground">{image1.name}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blend-image2">Second Image</Label>
            <Input 
              id="blend-image2" 
              type="file" 
              accept="image/*" 
              onChange={(e) => setImage2(e.target.files?.[0] || null)}
            />
            {image2 && <p className="text-xs text-muted-foreground">{image2.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="blend-ratio">Blend Ratio: {blendRatio}%</Label>
            <Slider
              id="blend-ratio"
              value={[blendRatio]}
              onValueChange={(value) => setBlendRatio(value[0])}
              max={100}
              step={1}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground">Adjust the balance between images</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blend-mode">Blend Mode</Label>
            <Select value={blendMode} onValueChange={setBlendMode}>
              <SelectTrigger id="blend-mode" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100]">
                <SelectItem value="smooth">Smooth Transition</SelectItem>
                <SelectItem value="overlay">Overlay</SelectItem>
                <SelectItem value="multiply">Multiply</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleProcess} 
              className="flex-1 min-h-[44px]"
              disabled={!image1 || !image2}
            >
              Process
            </Button>
            <Button onClick={closeTool} variant="outline" className="flex-1 min-h-[44px]">
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (activeTool === 'upscale') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upscale-image">Image to Upscale</Label>
            <Input 
              id="upscale-image" 
              type="file" 
              accept="image/*" 
              onChange={(e) => setSingleImage(e.target.files?.[0] || null)}
            />
            {singleImage && <p className="text-xs text-muted-foreground">{singleImage.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scale-factor">Scale Factor</Label>
            <Select value={scaleFactor} onValueChange={setScaleFactor}>
              <SelectTrigger id="scale-factor" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100]">
                <SelectItem value="2">2x (Double)</SelectItem>
                <SelectItem value="4">4x (Quadruple)</SelectItem>
                <SelectItem value="8">8x (Maximum)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quality">Quality Enhancement</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger id="quality" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100]">
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="high">High Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleProcess} 
              className="flex-1 min-h-[44px]"
              disabled={!singleImage}
            >
              Process
            </Button>
            <Button onClick={closeTool} variant="outline" className="flex-1 min-h-[44px]">
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (activeTool === 'batch') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-images">Upload Multiple Images</Label>
            <Input 
              id="batch-images" 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={(e) => setMultipleImages(e.target.files)}
            />
            {multipleImages && (
              <p className="text-xs text-muted-foreground">
                {multipleImages.length} file{multipleImages.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-operation">Operation</Label>
            <Select value={batchOperation} onValueChange={setBatchOperation}>
              <SelectTrigger id="batch-operation" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100]">
                <SelectItem value="analyze">Analyze All</SelectItem>
                <SelectItem value="upscale">Upscale All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-prompt">Shared Prompt (Optional)</Label>
            <Input 
              id="batch-prompt" 
              placeholder="Apply this prompt to all images..."
              value={batchPrompt}
              onChange={(e) => setBatchPrompt(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleProcess} 
              className="flex-1 min-h-[44px]"
              disabled={!multipleImages || multipleImages.length === 0}
            >
              Process
            </Button>
            <Button onClick={closeTool} variant="outline" className="flex-1 min-h-[44px]">
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const content = (
    <>
      {isMobile ? (
        <DrawerHeader>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <DrawerTitle>{config.title}</DrawerTitle>
          </div>
          <DrawerDescription>{config.description}</DrawerDescription>
        </DrawerHeader>
      ) : (
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
      )}
      <div className={isMobile ? "px-4 pb-4 mt-4" : "mt-4"}>
        {renderStateView()}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeTool()}>
        <DrawerContent className="max-h-[95dvh] overflow-y-auto">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeTool()}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
};
