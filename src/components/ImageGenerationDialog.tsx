import { useState } from "react";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Wand2, ChevronDown, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { EnhancedPromptEditor } from "./EnhancedPromptEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImageGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  onGenerate: (prompt: string, options: GenerationOptions) => Promise<string | null>;
}

export interface GenerationOptions {
  quality: 'high' | 'medium' | 'low' | 'auto';
  size: '1024x1024' | '1536x1024' | '1024x1536';
  background: 'transparent' | 'opaque' | 'auto';
}

const MAX_PROMPT_LENGTH = 2000;

export const ImageGenerationDialog = ({ 
  open, 
  onOpenChange, 
  initialPrompt,
  onGenerate 
}: ImageGenerationDialogProps) => {
  // Truncate initial prompt if it's too long
  const truncatedInitialPrompt = initialPrompt.length > MAX_PROMPT_LENGTH 
    ? initialPrompt.substring(0, MAX_PROMPT_LENGTH - 3) + '...'
    : initialPrompt;
    
  const [prompt, setPrompt] = useState(truncatedInitialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [options, setOptions] = useState<GenerationOptions>({
    quality: 'auto',
    size: '1024x1024',
    background: 'auto'
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      toast.error(`Prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters allowed.`);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedImage(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 1500);

    try {
      const imageUrl = await onGenerate(prompt, options);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (imageUrl) {
        setGeneratedImage(imageUrl);
        toast.success("Image generated successfully!");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded!");
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleRegenerate = () => {
    setGeneratedImage(null);
    handleGenerate();
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setPrompt(truncatedInitialPrompt);
    setProgress(0);
    onOpenChange(false);
  };

  // Update prompt when initialPrompt changes and dialog opens
  React.useEffect(() => {
    if (open) {
      const newTruncatedPrompt = initialPrompt.length > MAX_PROMPT_LENGTH 
        ? initialPrompt.substring(0, MAX_PROMPT_LENGTH - 3) + '...'
        : initialPrompt;
      setPrompt(newTruncatedPrompt);
      
      if (initialPrompt.length > MAX_PROMPT_LENGTH) {
        toast.info(`Prompt automatically shortened to ${MAX_PROMPT_LENGTH} characters`);
      }
    }
  }, [open, initialPrompt]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto"
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Generate AI Image
          </DialogTitle>
          <DialogDescription>
            Generate a new image from your prompt. Cost: <span className="font-semibold text-foreground">3 credits</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Character Limit Warning */}
          {prompt.length > MAX_PROMPT_LENGTH * 0.9 && (
            <Alert variant={prompt.length > MAX_PROMPT_LENGTH ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {prompt.length > MAX_PROMPT_LENGTH 
                  ? `Prompt exceeds maximum length by ${prompt.length - MAX_PROMPT_LENGTH} characters. Please shorten it.`
                  : `Approaching character limit: ${prompt.length}/${MAX_PROMPT_LENGTH}`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Prompt Input with AI Enhancement */}
          <EnhancedPromptEditor
            value={prompt}
            onChange={(newValue) => {
              // Enforce max length
              if (newValue.length <= MAX_PROMPT_LENGTH) {
                setPrompt(newValue);
              } else {
                toast.error(`Maximum ${MAX_PROMPT_LENGTH} characters allowed`);
              }
            }}
            label="Image Prompt"
            placeholder="Describe the image you want to generate..."
            disabled={isGenerating}
          />

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Advanced Options</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select
                    value={options.quality}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, quality: value as any }))}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Select
                    value={options.size}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, size: value as any }))}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                      <SelectItem value="1536x1024">Landscape (1536×1024)</SelectItem>
                      <SelectItem value="1024x1536">Portrait (1024×1536)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background">Background</Label>
                  <Select
                    value={options.background}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, background: value as any }))}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="opaque">Opaque</SelectItem>
                      <SelectItem value="transparent">Transparent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Generating image... (~15-30 seconds)
              </p>
            </div>
          )}

          {/* Generated Image */}
          {generatedImage && (
            <div className="space-y-4 pt-4 border-t">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img 
                  src={generatedImage} 
                  alt="Generated image" 
                  className="w-full h-auto"
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
                  onClick={handleRegenerate}
                  className="flex-1"
                  disabled={isGenerating}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {!generatedImage && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH}
              className="w-full"
              size="lg"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Image (3 Credits)"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};