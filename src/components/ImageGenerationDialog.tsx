import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Download,
  Wand2,
  Copy,
  AlertCircle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  Clock,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { EnhancedPromptEditor } from "./EnhancedPromptEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArtieModal } from "./artie/ArtieModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";
import { closeStudioModal } from "@/lib/studio";
import { ErrorBoundary } from "./ErrorBoundary";
import { 
  calculateContinuationStrength, 
  getContinuationDescription 
} from "@/lib/promptSimilarity";
import { useSmartDefaults } from "@/hooks/useSmartDefaults";
import { ImageContainer } from "./ImageContainer";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ensureAssetSaved } from "@/lib/saveAsset";

export interface GenerationOptions {
  quality: "high" | "medium" | "low" | "auto";
  aspectRatio: "1:1" | "4:5" | "3:2" | "2:3" | "16:9" | "9:16" | "4:3" | "3:4";
  background: "transparent" | "opaque" | "auto";
  referenceImageUrl?: string;
  continuationStrength?: number;
  previousPrompt?: string;
}

// Legacy size field for backward compatibility - maps to aspect ratio
const ASPECT_RATIO_TO_SIZE: Record<GenerationOptions["aspectRatio"], string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "16:9": "1920x1080",
  "9:16": "1080x1920",
  "4:3": "1536x1152",
  "3:4": "1152x1536",
};

const MAX_PROMPT_LENGTH = 2000;

const truncatePrompt = (value: string) =>
  value.length > MAX_PROMPT_LENGTH ? `${value.slice(0, MAX_PROMPT_LENGTH - 3)}...` : value;

export const ImageGenerationDialog = () => {
  const isMobile = useIsMobile();
  const isGenerateModalOpen = useModalStore((state) => state.isGenerateModalOpen);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const storePrompt = useStudioStore((state) => state.prompt);
  const storeImage = useStudioStore((state) => state.imageUrl);
  const setStorePrompt = useStudioStore((state) => state.setPrompt);
  const setStoreImage = useStudioStore((state) => state.setImage);
  const generator = useStudioStore((state) => state.generator);

  const { lastOptions, saveOptions } = useSmartDefaults();

  const truncatedInitialPrompt = useMemo(() => truncatePrompt(storePrompt ?? ""), [storePrompt]);

  // Map legacy size to aspect ratio for backward compatibility
  const mapOptionsToNewFormat = (opts: any): GenerationOptions => {
    if (opts.size && !opts.aspectRatio) {
      const sizeToAspectRatio: Record<string, GenerationOptions["aspectRatio"]> = {
        "1024x1024": "1:1",
        "1536x1024": "3:2",
        "1024x1536": "2:3",
      };
      return {
        ...opts,
        aspectRatio: sizeToAspectRatio[opts.size] || "1:1",
      };
    }
    return {
      ...opts,
      aspectRatio: opts.aspectRatio || "1:1",
    };
  };

  const [prompt, setPrompt] = useState(truncatedInitialPrompt);
  const [basePrompt, setBasePrompt] = useState(truncatedInitialPrompt);
  const [options, setOptions] = useState<GenerationOptions>(mapOptionsToNewFormat(lastOptions));
  const [referenceImage, setReferenceImage] = useState<string | null>(storeImage ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [generationStage, setGenerationStage] = useState<string>("");
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [continuationStrength, setContinuationStrength] = useState<number>(1.0);
  const [previousGeneratedPrompt, setPreviousGeneratedPrompt] = useState<string>("");
  const [meta, setMeta] = useState<any>(null);
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
    setGeneratedImage(null);
    setProgress(0);
    setGenerationStage("");
    setGenerationTime(0);
    setLastError(null);
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
      // Use continuation strength from meta (style consistency) if available, otherwise use calculated
      const metaContinuationStrength = meta?.continuationStrength as number | undefined;
      const finalContinuationStrength = metaContinuationStrength !== undefined
        ? metaContinuationStrength
        : (referenceImage ? continuationStrength : undefined);
      
      // Convert aspect ratio to size for API compatibility
      const size = ASPECT_RATIO_TO_SIZE[options.aspectRatio] || "1024x1024";
      
      const optionsWithReference = {
        ...options,
        size: size, // Add size for API compatibility
        referenceImageUrl: referenceImage || undefined,
        continuationStrength: finalContinuationStrength,
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
        
        // Ensure image is saved to My Projects (edge function should save, but verify/fallback)
        // Use ensureAssetSaved as fallback in case edge function didn't save
        ensureAssetSaved({
          imageUrl: imageUrl,
          action: 'generate',
          prompt: prompt || basePrompt,
          params: {
            quality: options.quality,
            aspectRatio: options.aspectRatio,
            size: ASPECT_RATIO_TO_SIZE[options.aspectRatio] || "1024x1024",
            background: options.background,
            continuationStrength: finalContinuationStrength,
            hadReference: !!referenceImage,
          },
          durationMs: totalTime * 1000,
          queryClient,
          userId: user?.id,
          skipToast: true, // Don't show duplicate toast
        }).catch((err) => {
          // Silently handle - might already be saved by edge function
          console.log('[Generate] Save check completed:', err?.message || 'OK');
        });
        
        // Enhanced success feedback
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">✨ Image generated successfully!</span>
            <span className="text-xs text-muted-foreground">
              Generated in {totalTime}s • {options.aspectRatio} • {options.quality}
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

  const handleRegenerate = async () => {
    // If we have a reference image, use style consistency for variations
    if (referenceImage && prompt) {
      try {
        const { generateContextAwareVariation } = await import('@/lib/intelligence/styleConsistency');
        const { getUserPreferences } = await import('@/lib/intelligence/userBehavior');
        const { getCachedUnderstanding } = await import('@/lib/intelligence/imageUnderstanding');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const userPreferences = await getUserPreferences(user.id);
          const understanding = await getCachedUnderstanding(referenceImage);
          
          if (understanding) {
            // Generate context-aware variation with style consistency
            const variation = await generateContextAwareVariation(
              prompt,
              referenceImage,
              'moderate', // Default to moderate variation
              userPreferences,
              understanding
            );
            
            // Update prompt with style-locked version
            setPrompt(variation.prompt);
            setBasePrompt(variation.prompt);
            setStorePrompt(variation.prompt);
            
            // Update continuation strength from style consistency
            setContinuationStrength(variation.continuationStrength);
            
            // Update meta with style lock info
            if (meta) {
              setMeta({
                ...meta,
                continuationStrength: variation.continuationStrength,
                styleLock: variation.styleLock,
              });
            } else {
              setMeta({
                continuationStrength: variation.continuationStrength,
                styleLock: variation.styleLock,
              });
            }
            
            toast.success("Style-consistent variation ready", {
              description: `Maintaining: ${variation.styleLock.slice(0, 2).join(', ')}`
            });
          }
        }
      } catch (error) {
        console.error('[Regenerate] Style consistency error:', error);
        // Continue with normal regenerate
      }
    }
    
    setGeneratedImage(null);
    setLastError(null);
    handleGenerate();
  };

  const handleRetry = () => {
    setLastError(null);
    handleGenerate();
  };

  const handleBasePromptChange = (newValue: string) => {
    if (newValue.length <= MAX_PROMPT_LENGTH) {
      setBasePrompt(newValue);
      setPrompt(newValue);
      setStorePrompt(newValue);
    }
  };

  const handleClose = () => {
    closeStudioModal();
    setPrompt("");
    setBasePrompt("");
    setReferenceImage(null);
    setGeneratedImage(null);
    setProgress(0);
  };

  // Update preview size based on aspect ratio
  useEffect(() => {
    if (!isGenerateModalOpen) return;
    
    const updatePreviewSize = (aspectRatio: GenerationOptions["aspectRatio"]) => {
      const aspectRatioMap: Record<GenerationOptions["aspectRatio"], { width: number; height: number }> = {
        "1:1": { width: 400, height: 400 },
        "4:5": { width: 400, height: 500 },
        "3:2": { width: 600, height: 400 },
        "2:3": { width: 400, height: 600 },
        "16:9": { width: 640, height: 360 },
        "9:16": { width: 360, height: 640 },
        "4:3": { width: 533, height: 400 },
        "3:4": { width: 400, height: 533 },
      };
      setPreviewSize(aspectRatioMap[aspectRatio] || { width: 400, height: 400 });
    };
    
    updatePreviewSize(options.aspectRatio);
  }, [options.aspectRatio, isGenerateModalOpen]);

  const bodyContent = (
    <div className={cn(
      "flex flex-col min-h-0",
      !isMobile ? "grid grid-cols-[42%_58%] gap-8" : "space-y-6"
    )}>
      {/* Left Column: Image Preview (Desktop) or Top (Mobile) */}
      <div className="flex flex-col">
        {/* Image Preview Container - Resizes based on aspect ratio */}
        <div 
          className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center overflow-hidden"
          style={{
            minHeight: previewSize ? `${previewSize.height}px` : '400px',
            maxHeight: previewSize ? `${previewSize.height}px` : '600px',
          }}
        >
          {/* Generated Image (shown when available) */}
          {generatedImage && (
            <div className="w-full h-full space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Wand2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Your Generated Image</span>
                  {generationTime > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {generationTime}s
                    </Badge>
                  )}
                </div>
              </div>
              
              <div ref={imageContainerRef} className="w-full overflow-hidden">
                <ImageContainer
                  src={generatedImage}
                  alt="Generated result"
                  maxHeight="max-h-full"
                  containerClassName={cn(
                    "border-2 border-primary/20 shadow-lg rounded-lg mx-auto",
                    previewSize && `max-w-[${previewSize.width}px]`
                  )}
                />
              </div>
            </div>
          )}

          {/* Reference Image */}
          {referenceImage && !generatedImage && (
            <div className="relative w-full h-full">
              {/* Remove button in top-right */}
              <div className="absolute top-3 right-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setReferenceImage(null);
                    setStoreImage(undefined);
                    setPreviousGeneratedPrompt("");
                    setContinuationStrength(1.0);
                  }}
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Preview - maintains aspect ratio */}
              <div className="w-full h-full flex items-center justify-center">
                <ImageContainer
                  src={referenceImage}
                  alt="Reference inspiration"
                  maxHeight="max-h-full"
                  objectFit="contain"
                  containerClassName={cn(
                    "rounded-xl overflow-hidden",
                    previewSize && `max-w-[${previewSize.width}px] max-h-[${previewSize.height}px]`
                  )}
                />
              </div>
              
              {/* Meta info (optional) */}
              {previousGeneratedPrompt && continuationStrength < 1.0 && (
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/30 bg-muted/10 p-3">
                  <div className="flex items-center justify-between mb-2">
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
                </div>
              )}
            </div>
          )}
          
          {/* Placeholder when no image */}
          {!referenceImage && !generatedImage && (
            <div className="text-center space-y-3">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Image Preview</p>
              <p className="text-xs text-muted-foreground/70">Your generated image will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Your Base Prompt (Desktop) or Below (Mobile) */}
      <div className="flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Your Base Prompt Section */}
          <div className="space-y-3 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <div className="flex items-center gap-3">
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
          </div>

          {/* Character limit warning */}
          {basePrompt.length > MAX_PROMPT_LENGTH * 0.9 && (
            <Alert variant={basePrompt.length > MAX_PROMPT_LENGTH ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {basePrompt.length > MAX_PROMPT_LENGTH
                  ? `Prompt exceeds maximum length by ${basePrompt.length - MAX_PROMPT_LENGTH} characters. Please shorten it.`
                  : `Approaching character limit: ${basePrompt.length}/${MAX_PROMPT_LENGTH}`}
              </AlertDescription>
            </Alert>
          )}

          {/* Inline Settings - Quality, Aspect Ratio, Background - Aligned with prompt input (same padding) */}
          <div className="space-y-3 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="flex-1 space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select
                  value={options.quality}
                  onValueChange={(value: GenerationOptions["quality"]) => {
                    const updatedOptions = { ...options, quality: value };
                    setOptions(updatedOptions);
                    saveOptions(updatedOptions);
                  }}
                >
                  <SelectTrigger id="quality" className="w-full">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                <Select
                  value={options.aspectRatio}
                  onValueChange={(value: GenerationOptions["aspectRatio"]) => {
                    const updatedOptions = { ...options, aspectRatio: value };
                    setOptions(updatedOptions);
                    saveOptions(updatedOptions);
                  }}
                >
                  <SelectTrigger id="aspect-ratio" className="w-full">
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="1:1">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4" />
                        1:1 (Square)
                      </div>
                    </SelectItem>
                    <SelectItem value="4:5">
                      <div className="flex items-center gap-2">
                        <RectangleVertical className="h-4 w-4" />
                        4:5
                      </div>
                    </SelectItem>
                    <SelectItem value="3:2">
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        3:2
                      </div>
                    </SelectItem>
                    <SelectItem value="2:3">
                      <div className="flex items-center gap-2">
                        <RectangleVertical className="h-4 w-4" />
                        2:3
                      </div>
                    </SelectItem>
                    <SelectItem value="16:9">
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        16:9
                      </div>
                    </SelectItem>
                    <SelectItem value="9:16">
                      <div className="flex items-center gap-2">
                        <RectangleVertical className="h-4 w-4" />
                        9:16
                      </div>
                    </SelectItem>
                    <SelectItem value="4:3">
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        4:3
                      </div>
                    </SelectItem>
                    <SelectItem value="3:4">
                      <div className="flex items-center gap-2">
                        <RectangleVertical className="h-4 w-4" />
                        3:4
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor="background">Background</Label>
                <Select
                  value={options.background}
                  onValueChange={(value: GenerationOptions["background"]) => {
                    const updatedOptions = { ...options, background: value };
                    setOptions(updatedOptions);
                    saveOptions(updatedOptions);
                  }}
                >
                  <SelectTrigger id="background" className="w-full">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="transparent">Transparent</SelectItem>
                    <SelectItem value="opaque">Opaque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Status messages - outside scrollable area */}
        {isGenerating && (
          <div className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shrink-0">
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
          <Alert variant="destructive" className="mt-4 border-destructive/50 shrink-0">
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
    </div>
  );

  const footerContent = (
    <div className={cn(
      "flex items-center gap-6",
      isMobile ? "flex-col" : "justify-between"
    )}>
      {/* Left: Credit usage text */}
      <div className="text-xs text-muted-foreground shrink-0">
        This generation uses 1 credit
      </div>
      
      {/* Right: Actions */}
      <div className={cn(
        "flex items-center gap-3",
        isMobile ? "w-full flex-col" : "ml-auto"
      )}>
        {generatedImage ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyPrompt} 
              className={cn(
                "shrink-0",
                isMobile ? "w-full" : ""
              )}
            >
              <Copy className="mr-2 h-3 w-3" /> Copy Prompt
            </Button>
            <Button 
              onClick={handleRegenerate} 
              className={cn(
                "min-h-[44px]",
                isMobile ? "w-full" : ""
              )}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Again
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownload} 
              className={cn(
                "min-h-[44px]",
                isMobile ? "w-full" : ""
              )}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyPrompt} 
              className={cn(
                "shrink-0",
                isMobile ? "w-full" : ""
              )}
            >
              <Copy className="mr-2 h-3 w-3" /> Copy Prompt
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "min-h-[44px]",
                isMobile ? "w-full" : "min-w-[140px]"
              )}
              size={isMobile ? "lg" : "default"}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <ErrorBoundary onReset={handleClose}>
      <ArtieModal
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
        description="Create images from your prompt with full control over quality, aspect ratio, and background."
        contentClassName="flex flex-col min-h-0"
        footer={footerContent}
        maxWidth="full"
      >
        {bodyContent}
      </ArtieModal>
    </ErrorBoundary>
  );
};
