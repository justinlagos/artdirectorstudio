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
  Clock,
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
import { ErrorBoundary } from "./ErrorBoundary";
import { 
  calculateContinuationStrength, 
  getContinuationDescription 
} from "@/lib/promptSimilarity";
import { useRecentPrompts } from "@/hooks/useRecentPrompts";
import { useSmartDefaults } from "@/hooks/useSmartDefaults";

export interface GenerationOptions {
  quality: "high" | "medium" | "low" | "auto";
  size: "1024x1024" | "1536x1024" | "1024x1536";
  background: "transparent" | "opaque" | "auto";
  referenceImageUrl?: string;
  continuationStrength?: number;
  previousPrompt?: string;
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

  const { recentPrompts, addPrompt } = useRecentPrompts();
  const { lastOptions, saveOptions } = useSmartDefaults();

  const truncatedInitialPrompt = useMemo(() => truncatePrompt(storePrompt ?? ""), [storePrompt]);

  const [prompt, setPrompt] = useState(truncatedInitialPrompt);
  const [basePrompt, setBasePrompt] = useState(truncatedInitialPrompt);
  const [selectedPreset, setSelectedPreset] = useState<GenerationPreset | null>(null);
  const [options, setOptions] = useState<GenerationOptions>(lastOptions);
  const [referenceImage, setReferenceImage] = useState<string | null>(storeImage ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>("");
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [continuationStrength, setContinuationStrength] = useState<number>(1.0);
  const [previousGeneratedPrompt, setPreviousGeneratedPrompt] = useState<string>("");
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const generationStartTime = useRef<number>(0);

  useEffect(() => {
    if (!isGenerateModalOpen) {
      setIsGenerating(false);
      setProgress(0);
      setGenerationStage("");
      setLastError(null);
      return;
    }

    setPrompt(truncatedInitialPrompt);
    setBasePrompt(truncatedInitialPrompt);
    setSelectedPreset(null);
    setGeneratedImage(null);
    setProgress(0);
    setGenerationStage("");
    setGenerationTime(0);
    setLastError(null);
    setShowAdvanced(false);
    setPresetsExpanded(false);
    setReferenceImage(storeImage ?? null);
    setPreviousGeneratedPrompt("");
    setContinuationStrength(1.0);

    if (storePrompt.length > MAX_PROMPT_LENGTH) {
      toast.info(`Prompt automatically shortened to ${MAX_PROMPT_LENGTH} characters`);
    }
  }, [isGenerateModalOpen, truncatedInitialPrompt, storeImage, storePrompt]);

  // Calculate continuation strength when prompt changes
  useEffect(() => {
    if (previousGeneratedPrompt && prompt && referenceImage) {
      const strength = calculateContinuationStrength(previousGeneratedPrompt, prompt);
      setContinuationStrength(strength);
    } else {
      setContinuationStrength(1.0);
    }
  }, [prompt, previousGeneratedPrompt, referenceImage]);

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
    setLastError(null);
    generationStartTime.current = Date.now();

    // Simulate generation stages for better UX
    setGenerationStage("Initializing...");
    setProgress(10);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          setGenerationStage("Processing your prompt...");
        } else if (prev < 60) {
          setGenerationStage("AI is creating your image...");
        } else if (prev < 85) {
          setGenerationStage("Adding final touches...");
        }
        
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 8;
      });
    }, 1200);

    try {
      const optionsWithReference = {
        ...options,
        referenceImageUrl: referenceImage || undefined,
        continuationStrength: referenceImage ? continuationStrength : undefined,
        previousPrompt: previousGeneratedPrompt || undefined,
      };
      
      const imageUrl = await generator(prompt, optionsWithReference);
      
      // Store this prompt for future similarity calculations
      setPreviousGeneratedPrompt(prompt);

      clearInterval(progressInterval);
      setProgress(100);
      setGenerationStage("Complete!");

      const totalTime = Math.round((Date.now() - generationStartTime.current) / 1000);
      setGenerationTime(totalTime);

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        
        // Enhanced success feedback
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">✨ Image generated successfully!</span>
            <span className="text-xs text-muted-foreground">
              Generated in {totalTime}s • {options.size} • {options.quality}
            </span>
          </div>,
          { duration: 4000 }
        );

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
      setProgress(0);
      setGenerationStage("");
      console.error("Generation error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const requestId = (error as any)?.requestId;
      const errorType = (error as any)?.errorType;
      
      // Store error with request ID for display
      setLastError(requestId ? `${errorMessage} (Request ID: ${requestId})` : errorMessage);
      
      // Enhanced error handling with more context
      if (errorMessage.toLowerCase().includes("rate limit")) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Rate limit exceeded</span>
            <span className="text-xs">Please wait a moment before trying again</span>
            {requestId && <span className="text-xs text-muted-foreground font-mono">Request ID: {requestId}</span>}
          </div>,
          { duration: 5000 }
        );
      } else if (errorMessage.toLowerCase().includes("credits") || errorMessage.toLowerCase().includes("exhausted")) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Insufficient credits</span>
            <span className="text-xs">Add more credits to continue generating images</span>
            {requestId && <span className="text-xs text-muted-foreground font-mono">Request ID: {requestId}</span>}
          </div>,
          {
            duration: 6000,
            action: {
              label: "Add Credits",
              onClick: () => window.location.href = "/subscriptions",
            },
          }
        );
      } else if (errorMessage.toLowerCase().includes("sign in") || errorMessage.toLowerCase().includes("log in")) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Authentication required</span>
            <span className="text-xs">Please sign in to generate images</span>
            {requestId && <span className="text-xs text-muted-foreground font-mono">Request ID: {requestId}</span>}
          </div>,
          {
            duration: 5000,
            action: {
              label: "Sign In",
              onClick: () => window.location.href = "/auth",
            },
          }
        );
      } else if (errorMessage.toLowerCase().includes("access denied") || errorMessage.toLowerCase().includes("upgrade")) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Upgrade required</span>
            <span className="text-xs">{errorMessage}</span>
            {requestId && <span className="text-xs text-muted-foreground font-mono">Request ID: {requestId}</span>}
          </div>,
          {
            duration: 5000,
            action: {
              label: "View Plans",
              onClick: () => window.location.href = "/subscriptions",
            },
          }
        );
      } else if (errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("connection")) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Connection error</span>
            <span className="text-xs">Check your internet connection and try again</span>
            {requestId && <span className="text-xs text-muted-foreground font-mono">Request ID: {requestId}</span>}
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Generation failed</span>
            <span className="text-xs">{errorMessage || "An unexpected error occurred"}</span>
            {requestId && <span className="text-xs text-muted-foreground font-mono">Request ID: {requestId}</span>}
          </div>,
          { duration: 5000 }
        );
      }
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setProgress(0);
        setGenerationStage("");
      }, 2000);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      // Fetch as blob to ensure proper download
      const response = await fetch(generatedImage, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-image-${Date.now()}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);

      toast.success("Image downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleRegenerate = () => {
    setGeneratedImage(null);
    setLastError(null);
    handleGenerate();
  };

  const handleRetry = () => {
    setLastError(null);
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
      {/* Show generated image first if it exists */}
      {generatedImage && (
        <div className="space-y-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Your Generated Image</span>
            {generationTime > 0 && (
              <Badge variant="secondary" className="ml-2">
                {generationTime}s
              </Badge>
            )}
          </div>
          
          <div ref={imageContainerRef} className="rounded-lg bg-muted/30 p-3 border-2 border-primary/20 shadow-lg">
            <img
              src={generatedImage}
              alt="Generated result"
              className="mx-auto h-auto max-h-[350px] w-full object-contain rounded-md"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 p-3 text-xs">
            <div className="flex gap-3 text-muted-foreground">
              <span>{options.size}</span>
              <span>•</span>
              <span className="capitalize">{options.quality} quality</span>
              <span>•</span>
              <span className="capitalize">{options.background} BG</span>
            </div>
            <span className="text-muted-foreground">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {referenceImage && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow">
          <img src={referenceImage} alt="Reference inspiration" className="w-full max-h-[200px] object-cover" />
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
                setPreviousGeneratedPrompt("");
                setContinuationStrength(1.0);
              }}
            >
              Remove
            </Button>
          </div>
          
          {/* Continuation Strength Indicator */}
          {previousGeneratedPrompt && continuationStrength < 1.0 && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium">Context Strength</span>
                <span className={`text-xs font-semibold ${getContinuationDescription(continuationStrength).colorClass}`}>
                  {Math.round((1 - continuationStrength) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    continuationStrength <= 0.3 ? 'bg-blue-500' :
                    continuationStrength <= 0.6 ? 'bg-yellow-500' :
                    continuationStrength <= 0.8 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${(1 - continuationStrength) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getContinuationDescription(continuationStrength).description}
              </p>
            </div>
          )}
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
          {recentPrompts.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Prompts
              </Label>
              <Select onValueChange={(value) => setPrompt(value)} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue placeholder="Load a recent prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {recentPrompts.map((recentPrompt, idx) => (
                    <SelectItem key={idx} value={recentPrompt}>
                      {recentPrompt.slice(0, 60)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{generationStage}</p>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            This usually takes 8-15 seconds
          </p>
        </div>
      )}

      {lastError && !isGenerating && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold">Generation failed</p>
              <p className="text-sm mt-1">{lastError}</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRetry}
              className="shrink-0"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
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
    <ErrorBoundary onReset={handleClose}>
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
    </ErrorBoundary>
  );
};
