import { useState, useEffect, useRef } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Wand2, ChevronDown, Copy, AlertCircle, Square, RectangleHorizontal, RectangleVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { EnhancedPromptEditor } from "./EnhancedPromptEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GenerationPresets, GenerationPreset } from "./GenerationPresets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ToolDrawer } from "./ToolDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface ImageGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  onGenerate: (prompt: string, options: GenerationOptions) => Promise<string | null>;
  initialReferenceImage?: string | null;
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
  onGenerate,
  initialReferenceImage,
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
  const [selectedPreset, setSelectedPreset] = useState<GenerationPreset | null>(null);
  const [basePrompt, setBasePrompt] = useState(truncatedInitialPrompt);
  const [options, setOptions] = useState<GenerationOptions>({
    quality: 'auto',
    size: '1024x1024',
    background: 'auto'
  });
  const isMobile = useIsMobile();
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [presetsExpanded, setPresetsExpanded] = useState(false); // Collapsed by default
  const [referenceImage, setReferenceImage] = useState<string | null>(initialReferenceImage ?? null);

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
        toast.success("Your image is ready.");
        
        // Auto-scroll to image on mobile
        if (isMobile) {
          setTimeout(() => {
            imageContainerRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 200);
        }
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
    
    toast.success("Image download started.");
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleRegenerate = () => {
    setGeneratedImage(null);
    handleGenerate();
  };

  const handlePresetSelect = (preset: GenerationPreset) => {
    setSelectedPreset(preset);
    setOptions(preset.options);
    
    // Increment usage count for custom presets
    if (preset.id.includes('-')) { // Custom presets have UUID format with dashes
      incrementPresetUsage(preset.id);
    }
    
    // Apply preset modifier to the base prompt
    const enhancedPrompt = basePrompt + preset.promptModifier;
    
    if (enhancedPrompt.length <= MAX_PROMPT_LENGTH) {
      setPrompt(enhancedPrompt);
      toast.success(`"${preset.name}" preset applied!`);
    } else {
      // If enhanced prompt is too long, just update options without modifier
      setPrompt(basePrompt);
      toast.info(`"${preset.name}" settings applied. Prompt modifier skipped due to length.`);
    }
    
    // Auto-collapse presets on mobile after selection
    if (isMobile) {
      setPresetsExpanded(false);
    }
  };

  const incrementPresetUsage = async (presetId: string) => {
    try {
      const { data } = await supabase
        .from('custom_generation_presets')
        .select('usage_count')
        .eq('id', presetId)
        .single();
      
      if (data) {
        await supabase
          .from('custom_generation_presets')
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq('id', presetId);
      }
    } catch (error) {
      console.error("Error incrementing usage:", error);
    }
  };

  const handleClearPreset = () => {
    setSelectedPreset(null);
    setPrompt(basePrompt);
    setOptions({
      quality: 'auto',
      size: '1024x1024',
      background: 'auto'
    });
    toast.info("Preset cleared, returned to custom settings");
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setPrompt(truncatedInitialPrompt);
    setBasePrompt(truncatedInitialPrompt);
    setSelectedPreset(null);
    setProgress(0);
    setReferenceImage(initialReferenceImage ?? null);
    onOpenChange(false);
  };

  // Update prompt when initialPrompt changes and dialog opens
  React.useEffect(() => {
    if (open) {
      const newTruncatedPrompt = initialPrompt.length > MAX_PROMPT_LENGTH
        ? initialPrompt.substring(0, MAX_PROMPT_LENGTH - 3) + '...'
        : initialPrompt;
      setPrompt(newTruncatedPrompt);
      setBasePrompt(newTruncatedPrompt);
      setSelectedPreset(null);
      setReferenceImage(initialReferenceImage ?? null);

      if (initialPrompt.length > MAX_PROMPT_LENGTH) {
        toast.info(`Prompt automatically shortened to ${MAX_PROMPT_LENGTH} characters`);
      }
    }
  }, [open, initialPrompt, initialReferenceImage]);

  // Update prompt when user edits (track base prompt separately from preset-enhanced)
  const handlePromptChange = (newValue: string) => {
    if (newValue.length <= MAX_PROMPT_LENGTH) {
      setPrompt(newValue);
      // If user manually edits, update base prompt and clear preset
      if (selectedPreset) {
        setBasePrompt(newValue);
        setSelectedPreset(null);
        toast.info("Custom edits detected, preset cleared");
      } else {
        setBasePrompt(newValue);
      }
    } else {
      toast.error(`Maximum ${MAX_PROMPT_LENGTH} characters allowed`);
    }
  };

  const bodyContent = (
    <div className="space-y-4">
      {referenceImage && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow">
          <img
            src={referenceImage}
            alt="Reference inspiration"
            className="w-full object-cover"
          />
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Reference image</p>
              <p className="text-xs text-muted-foreground">Remix this Inspire project in Studio.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReferenceImage(null)}>
              Remove
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
        </TabsList>
        
        <TabsContent value="presets" className="space-y-4 mt-4">
          {/* Base Prompt - Moved to Top for Prominence */}
          <div className="space-y-2 p-4 bg-accent/5 border border-accent/20 rounded-xl">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">Your Base Prompt</Label>
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            </div>
            <EnhancedPromptEditor
              value={basePrompt}
              onChange={(newValue) => {
                if (newValue.length <= MAX_PROMPT_LENGTH) {
                  setBasePrompt(newValue);
                  if (selectedPreset) {
                    const enhanced = newValue + selectedPreset.promptModifier;
                    if (enhanced.length <= MAX_PROMPT_LENGTH) {
                      setPrompt(enhanced);
                    } else {
                      setPrompt(newValue);
                      toast.info("Preset modifier removed due to length");
                    }
                  } else {
                    setPrompt(newValue);
                  }
                }
              }}
              placeholder="Describe the image you want to generate..."
              disabled={isGenerating}
            />
            {selectedPreset && (
              <p className="text-xs text-muted-foreground">
                ✨ Preset enhancements will be automatically added
              </p>
            )}
          </div>

          <Separator />

          {/* Selected Preset Indicator */}
          {selectedPreset && (
            <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-4 h-4">{selectedPreset.icon}</div>
                <div>
                  <div className="font-medium text-sm">{selectedPreset.name}</div>
                  <div className="text-xs text-muted-foreground">Active preset</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPreset}
                disabled={isGenerating}
                className="h-8"
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Clear
              </Button>
            </div>
          )}

          {/* Collapsible Quick Presets Section */}
          <Collapsible open={presetsExpanded} onOpenChange={setPresetsExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between min-h-[44px] mb-3"
                disabled={isGenerating}
              >
                <span className="font-medium">
                  {presetsExpanded ? "Hide Quick Presets" : "Browse Quick Presets"}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${presetsExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GenerationPresets
                onSelectPreset={handlePresetSelect}
                disabled={isGenerating}
                selectedPresetId={selectedPreset?.id}
                onManageCustomPresets={() => {
                  const presetData = {
                    options: options,
                    prompt_modifier: selectedPreset?.promptModifier || '',
                    base_prompt: basePrompt
                  };
                  onOpenChange(false);
                  window.location.href = `/settings?tab=presets&data=${encodeURIComponent(JSON.stringify(presetData))}`;
                }}
              />
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 mt-4">
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
            onChange={handlePromptChange}
            label="Image Prompt"
            placeholder="Describe the image you want to generate..."
            disabled={isGenerating}
          />

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between min-h-[44px]">
            <span>Advanced Options</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <Select
                value={options.quality}
                onValueChange={(value) => setOptions(prev => ({ ...prev, quality: value as any }))}
                disabled={isGenerating}
              >
                <SelectTrigger id="quality" className="min-h-[44px]">
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

            <div className="space-y-2 sm:col-span-2">
              <Label>Aspect Ratio</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={options.size === "1024x1024" ? "default" : "outline"}
                  className="flex flex-col items-center gap-1 h-auto py-3 min-h-[44px]"
                  onClick={() => setOptions(prev => ({ ...prev, size: "1024x1024" }))}
                  disabled={isGenerating}
                >
                  <Square className="w-5 h-5" />
                  <div className="text-xs">
                    <div className="font-semibold">Square</div>
                    <div className="text-muted-foreground hidden sm:block">1024×1024</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={options.size === "1536x1024" ? "default" : "outline"}
                  className="flex flex-col items-center gap-1 h-auto py-3 min-h-[44px]"
                  onClick={() => setOptions(prev => ({ ...prev, size: "1536x1024" }))}
                  disabled={isGenerating}
                >
                  <RectangleHorizontal className="w-5 h-5" />
                  <div className="text-xs">
                    <div className="font-semibold">Landscape</div>
                    <div className="text-muted-foreground hidden sm:block">1536×1024</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={options.size === "1024x1536" ? "default" : "outline"}
                  className="flex flex-col items-center gap-1 h-auto py-3 min-h-[44px]"
                  onClick={() => setOptions(prev => ({ ...prev, size: "1024x1536" }))}
                  disabled={isGenerating}
                >
                  <RectangleVertical className="w-5 h-5" />
                  <div className="text-xs">
                    <div className="font-semibold">Portrait</div>
                    <div className="text-muted-foreground hidden sm:block">1024×1536</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background">Background</Label>
              <Select
                value={options.background}
                onValueChange={(value) => setOptions(prev => ({ ...prev, background: value as any }))}
                disabled={isGenerating}
              >
                <SelectTrigger id="background" className="min-h-[44px]">
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
        </TabsContent>
      </Tabs>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Working on it… (~15-30 seconds)
          </p>
        </div>
      )}

      {/* Generated Image */}
      {generatedImage && (
        <div className="space-y-4 pt-4 border-t">
          <div 
            ref={imageContainerRef}
            className="relative rounded-lg overflow-hidden bg-muted max-h-[50vh] md:max-h-none"
          >
            <img
              src={generatedImage}
              alt="Generated image"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
  const footerContent = generatedImage ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleDownload}
          className="min-h-[48px] w-full sm:flex-1"
          variant="secondary"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Image
        </Button>
        <Button
          onClick={handleRegenerate}
          className="min-h-[48px] w-full sm:flex-1"
          disabled={isGenerating}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          {isGenerating ? "Working on it…" : "Regenerate"}
        </Button>
      </div>
      <Button
        variant="outline"
        onClick={handleCopyPrompt}
        className="min-h-[44px] w-full"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy Prompt
      </Button>
    </div>
  ) : (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH}
      className="w-full min-h-[48px]"
      size="lg"
    >
      <Wand2 className="w-4 h-4 mr-2" />
      {isGenerating ? "Working on it…" : "Start Studio Generation (3 Credits)"}
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
      stickyFooterOnMobile={true}
      title={
        <>
          <Wand2 className="w-5 h-5" />
          Generate in Studio
        </>
      }
      description={
        <>
          Open this prompt in Studio and create instantly. Cost: <span className="font-semibold text-foreground">3 credits</span>
        </>
      }
      footer={footerContent}
    >
      {bodyContent}
    </ToolDrawer>
  );
};