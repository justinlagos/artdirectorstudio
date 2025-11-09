import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Download,
  Wand2,
  ChevronDown,
  Copy,
  AlertCircle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
} from "lucide-react";
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
import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";
import { closeStudioModal } from "@/lib/studio";

export interface GenerationOptions {
  quality: "high" | "medium" | "low" | "auto";
  size: "1024x1024" | "1536x1024" | "1024x1536";
  background: "transparent" | "opaque" | "auto";
}

const MAX_PROMPT_LENGTH = 2000;

const truncatePrompt = (value: string) =>
  value.length > MAX_PROMPT_LENGTH ? `${value.slice(0, MAX_PROMPT_LENGTH - 3)}...` : value;

export const ImageGenerationDialog = () => {
  const isMobile = useIsMobile();
  const isGenerateModalOpen = useModalStore((state) => state.isGenerateModalOpen);

  const storePrompt = useStudioStore((state) => state.prompt);
  const storeImage = useStudioStore((state) => state.imageUrl);
  const setStorePrompt = useStudioStore((state) => state.setPrompt);
  const setStoreImage = useStudioStore((state) => state.setImage);
  const generator = useStudioStore((state) => state.generator);

  const truncatedInitialPrompt = useMemo(() => truncatePrompt(storePrompt ?? ""), [storePrompt]);

  const [prompt, setPrompt] = useState(truncatedInitialPrompt);
  const [basePrompt, setBasePrompt] = useState(truncatedInitialPrompt);
  const [selectedPreset, setSelectedPreset] = useState<GenerationPreset | null>(null);
  const [options, setOptions] = useState<GenerationOptions>({
    quality: "auto",
    size: "1024x1024",
    background: "auto",
  });
  const [referenceImage, setReferenceImage] = useState<string | null>(storeImage ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGenerateModalOpen) {
      setIsGenerating(false);
      setProgress(0);
      return;
    }

    setPrompt(truncatedInitialPrompt);
    setBasePrompt(truncatedInitialPrompt);
    setSelectedPreset(null);
    setGeneratedImage(null);
    setProgress(0);
    setShowAdvanced(false);
    setPresetsExpanded(false);
    setReferenceImage(storeImage ?? null);

    if (storePrompt.length > MAX_PROMPT_LENGTH) {
      toast.info(`Prompt automatically shortened to ${MAX_PROMPT_LENGTH} characters`);
    }
  }, [isGenerateModalOpen, truncatedInitialPrompt, storeImage, storePrompt]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      toast.error(`Prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters allowed.`);
      return;
    }

    if (!generator) {
      toast.error("Generation is currently unavailable.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedImage(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 1500);

    try {
      const imageUrl = await generator(prompt, options);

      clearInterval(progressInterval);
      setProgress(100);

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        toast.success("Your image is ready.");

        if (isMobile) {
          setTimeout(() => {
            imageContainerRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 200);
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Generation error:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
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

  const incrementPresetUsage = async (presetId: string) => {
    try {
      const { data } = await supabase
        .from("custom_generation_presets")
        .select("usage_count")
        .eq("id", presetId)
        .single();

      if (data) {
        await supabase
          .from("custom_generation_presets")
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq("id", presetId);
      }
    } catch (error) {
      console.error("Error incrementing usage:", error);
    }
  };

  const handlePresetSelect = (preset: GenerationPreset) => {
    setSelectedPreset(preset);
    setOptions(preset.options);

    if (preset.id.includes("-")) {
      incrementPresetUsage(preset.id);
    }

    const enhancedPrompt = basePrompt + preset.promptModifier;

    if (enhancedPrompt.length <= MAX_PROMPT_LENGTH) {
      setPrompt(enhancedPrompt);
      setStorePrompt(enhancedPrompt);
      toast.success(`"${preset.name}" preset applied!`);
    } else {
      setPrompt(basePrompt);
      setStorePrompt(basePrompt);
      toast.info(`"${preset.name}" settings applied. Prompt modifier skipped due to length.`);
    }

    if (isMobile) {
      setPresetsExpanded(false);
    }
  };

  const handleClearPreset = () => {
    setSelectedPreset(null);
    setPrompt(basePrompt);
    setStorePrompt(basePrompt);
    setOptions({
      quality: "auto",
      size: "1024x1024",
      background: "auto",
    });
    toast.info("Preset cleared, returned to custom settings");
  };

  const handlePromptChange = (newValue: string) => {
    if (newValue.length <= MAX_PROMPT_LENGTH) {
      setPrompt(newValue);
      setStorePrompt(newValue);
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

  const handleBasePromptChange = (newValue: string) => {
    if (newValue.length <= MAX_PROMPT_LENGTH) {
      setBasePrompt(newValue);
      if (selectedPreset) {
        const enhanced = newValue + selectedPreset.promptModifier;
        if (enhanced.length <= MAX_PROMPT_LENGTH) {
          setPrompt(enhanced);
          setStorePrompt(enhanced);
        } else {
          setPrompt(newValue);
          setStorePrompt(newValue);
          toast.info("Preset modifier removed due to length");
        }
      } else {
        setPrompt(newValue);
        setStorePrompt(newValue);
      }
    }
  };

  const handleClose = () => {
    closeStudioModal();
    setPrompt("");
    setBasePrompt("");
    setReferenceImage(null);
    setSelectedPreset(null);
    setGeneratedImage(null);
    setProgress(0);
    setShowAdvanced(false);
    setPresetsExpanded(false);
  };

  const bodyContent = (
    <div className="space-y-4">
      {referenceImage && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow">
          <img src={referenceImage} alt="Reference inspiration" className="w-full object-cover" />
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Reference image</p>
              <p className="text-xs text-muted-foreground">Remix this Inspire project in Studio.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReferenceImage(null);
                setStoreImage(undefined);
              }}
            >
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

        <TabsContent value="presets" className="mt-4 space-y-4">
          <div className="space-y-2 rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">Your Base Prompt</Label>
              <Badge variant="secondary" className="text-xs">
                Primary
              </Badge>
            </div>
            <EnhancedPromptEditor
              value={basePrompt}
              onChange={handleBasePromptChange}
              placeholder="Describe the image you want to generate..."
              disabled={isGenerating}
            />
            {selectedPreset && (
              <p className="text-xs text-muted-foreground">✨ Preset enhancements will be automatically added</p>
            )}
          </div>

          <Separator />

          {selectedPreset && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 flex-shrink-0">{selectedPreset.icon}</div>
                <div>
                  <div className="text-sm font-medium">{selectedPreset.name}</div>
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
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Clear
              </Button>
            </div>
          )}

          <Collapsible open={presetsExpanded} onOpenChange={setPresetsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="mb-3 min-h-[44px] w-full justify-between" disabled={isGenerating}>
                <span className="font-medium">
                  {presetsExpanded ? "Hide Quick Presets" : "Browse Quick Presets"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${presetsExpanded ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GenerationPresets
                onSelectPreset={handlePresetSelect}
                disabled={isGenerating}
                selectedPresetId={selectedPreset?.id}
                onManageCustomPresets={() => {
                  const presetData = {
                    options,
                    prompt_modifier: selectedPreset?.promptModifier || "",
                    base_prompt: basePrompt,
                  };
                  window.location.href = `/settings?tab=presets&data=${encodeURIComponent(
                    JSON.stringify(presetData)
                  )}`;
                }}
              />
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value="custom" className="mt-4 space-y-4">
          {prompt.length > MAX_PROMPT_LENGTH * 0.9 && (
            <Alert variant={prompt.length > MAX_PROMPT_LENGTH ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {prompt.length > MAX_PROMPT_LENGTH
                  ? `Prompt exceeds maximum length by ${prompt.length - MAX_PROMPT_LENGTH} characters. Please shorten it.`
                  : `Approaching character limit: ${prompt.length}/${MAX_PROMPT_LENGTH}`}
              </AlertDescription>
            </Alert>
          )}

          <EnhancedPromptEditor
            value={prompt}
            onChange={handlePromptChange}
            label="Image Prompt"
            placeholder="Describe the image you want to generate..."
            disabled={isGenerating}
          />

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="min-h-[44px] w-full justify-between">
                <span>Advanced Options</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select
                    value={options.quality}
                    onValueChange={(value: GenerationOptions["quality"]) =>
                      setOptions((prev) => ({ ...prev, quality: value }))
                    }
                  >
                    <SelectTrigger id="quality">
                      <SelectValue placeholder="Select quality" />
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
                  <Label htmlFor="size">Aspect Ratio</Label>
                  <Select
                    value={options.size}
                    onValueChange={(value: GenerationOptions["size"]) =>
                      setOptions((prev) => ({ ...prev, size: value }))
                    }
                  >
                    <SelectTrigger id="size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Square
                        </div>
                      </SelectItem>
                      <SelectItem value="1536x1024">
                        <div className="flex items-center gap-2">
                          <RectangleHorizontal className="h-4 w-4" />
                          Landscape
                        </div>
                      </SelectItem>
                      <SelectItem value="1024x1536">
                        <div className="flex items-center gap-2">
                          <RectangleVertical className="h-4 w-4" />
                          Portrait
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background">Background</Label>
                  <Select
                    value={options.background}
                    onValueChange={(value: GenerationOptions["background"]) =>
                      setOptions((prev) => ({ ...prev, background: value }))
                    }
                  >
                    <SelectTrigger id="background">
                      <SelectValue placeholder="Select background" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="transparent">Transparent</SelectItem>
                      <SelectItem value="opaque">Opaque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>
      </Tabs>

      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">Generating image...</p>
        </div>
      )}

      {generatedImage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Generation complete</span>
            </div>
            <Badge variant="secondary" className="gap-1">
              AI Generated
            </Badge>
          </div>

          <div ref={imageContainerRef} className="rounded-lg bg-muted/30 p-2">
            <img
              src={generatedImage}
              alt="Generated result"
              className="mx-auto h-auto max-h-[600px] w-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Generated on {new Date().toLocaleString()}</span>
            <span>{options.size}</span>
          </div>
        </div>
      )}
    </div>
  );

  const footerContent = (
    <div className="studio-modal-footer flex flex-col gap-3">
      {generatedImage ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleRegenerate} className="min-h-[48px] w-full sm:flex-1">
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Again
          </Button>
          <Button variant="outline" onClick={handleDownload} className="min-h-[48px] w-full sm:flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="min-h-[48px] w-full"
          size="lg"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      )}
      <Button variant="ghost" onClick={handleCopyPrompt} className="w-full">
        <Copy className="mr-2 h-4 w-4" /> Copy Prompt
      </Button>
    </div>
  );

  return (
    <ToolDrawer
      open={isGenerateModalOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
      title={
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Generate in Studio
        </div>
      }
      description="Craft new variations instantly with your prompt and optional reference image."
      contentClassName="studio-modal-body"
      className="studio-modal-wrapper"
      footer={footerContent}
      stickyFooterOnMobile
    >
      {bodyContent}
    </ToolDrawer>
  );
};
