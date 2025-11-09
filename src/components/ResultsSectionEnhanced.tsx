import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy,
  RefreshCw,
  Wand2,
  SlidersHorizontal,
  Grid3x3,
  Sparkles,
  Feather,
  Palette,
  Quote,
  Blend,
  Maximize2,
  Scan,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { Analysis, AnalysisResult, UserEdits, GeneratedImage } from "@/pages/Index";
import { ImageGenerationDialog, GenerationOptions } from "@/components/ImageGenerationDialog";
import { BatchGenerationDialog } from "@/components/BatchGenerationDialog";
import { GeneratedImagesGallery } from "@/components/GeneratedImagesGallery";
import { ImageComparisonView } from "@/components/ImageComparisonView";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { InsightChips } from "@/components/InsightChips";
import { QuickTweaksRow } from "@/components/QuickTweaksRow";
import { GuidedTweaks } from "@/components/GuidedTweaks";
import { EmptyStatePrompts } from "@/components/EmptyStatePrompts";
import { ToolsShowcase } from "@/components/ToolsShowcase";
import { AnalysisTabbed } from "@/components/AnalysisTabbed";
import { PromptBuilder } from "@/components/PromptBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdaptiveFields } from "@/hooks/useAdaptiveFields";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ImageBlendDialogEnhanced } from "@/components/ImageBlendDialogEnhanced";
import { ImageUpscaleDialog } from "@/components/ImageUpscaleDialog";
import { BatchProcessDialog } from "@/components/BatchProcessDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";

interface ResultsSectionProps {
  result: AnalysisResult;
  onRegenerate: (userEdits: UserEdits) => void;
  isRegenerating: boolean;
  onGenerateImage: (prompt: string, options: GenerationOptions) => Promise<string | null>;
  generatedImages: GeneratedImage[];
  onDeleteImage: (id: string) => void;
  onResultUpdate?: (result: AnalysisResult) => void;
  imagePreviewUrl?: string;
}

// Predefined intelligent suggestions for each parameter
const SUGGESTIONS = {
  subject_gender: ["Male", "Female", "Non-binary", "Androgynous", "Child", "Elderly"],
  subject_ethnicity: ["Asian", "African", "Caucasian", "Hispanic", "Middle Eastern", "Mixed", "Not specified"],
  camera_type: ["DSLR Canon 5D", "Sony A7III", "Fujifilm X-T4", "iPhone 15 Pro", "Medium Format Hasselblad", "Film Camera", "Vintage Polaroid"],
  lighting_type: ["Golden hour sunlight", "Soft window light", "Studio softbox", "Dramatic side lighting", "Neon lighting", "Candlelight", "Overcast natural", "Ring light", "Rembrandt lighting"],
  dominant_color_1: ["Warm gold", "Deep blue", "Emerald green", "Crimson red", "Soft pink", "Charcoal black", "Pure white", "Burnt orange", "Navy blue"],
  dominant_color_2: ["Cream", "Sky blue", "Mint green", "Rose", "Lavender", "Slate gray", "Ivory", "Terracotta", "Teal"],
  art_style: ["Photorealistic", "Cinematic", "Editorial fashion", "Fine art", "Street photography", "Minimalist", "Vintage film", "Contemporary", "Surreal", "Impressionist"],
  background_type: ["Solid color backdrop", "Natural outdoor", "Urban cityscape", "Studio gradient", "Bokeh blur", "Textured wall", "Abstract patterns", "Empty space"],
  intended_platform: ["Instagram", "Print magazine", "Website hero", "Portfolio", "Social media ad", "Billboard", "Product catalog", "Art gallery"]
};

export const ResultsSection = ({ 
  result, 
  onRegenerate, 
  isRegenerating,
  onGenerateImage,
  generatedImages,
  onDeleteImage,
  onResultUpdate,
  imagePreviewUrl
}: ResultsSectionProps) => {
  const [userEdits, setUserEdits] = useState<UserEdits>({});
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [showBatchGenerationDialog, setShowBatchGenerationDialog] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState(result.full_regeneration_prompt);
  const [livePreviewPrompt, setLivePreviewPrompt] = useState(result.full_regeneration_prompt);
  const [modifiedCount, setModifiedCount] = useState(0);
  const [promptPulse, setPromptPulse] = useState(false);
  const [isApplyingTweak, setIsApplyingTweak] = useState(false);
  const [showBlendDialog, setShowBlendDialog] = useState(false);
  const [showUpscaleDialog, setShowUpscaleDialog] = useState(false);
  const [showBatchProcessDialog, setShowBatchProcessDialog] = useState(false);
  const [batchProcessMode, setBatchProcessMode] = useState<"analyze" | "upscale">("analyze");
  const studioButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);

  const ensureStudioButtonVisible = () => {
    if (!studioButtonRef.current || typeof window === 'undefined' || window.innerWidth >= 768) {
      return;
    }

    const rect = studioButtonRef.current.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 16) {
      studioButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    ensureStudioButtonVisible();
  }, []);

  useEffect(() => {
    const handleViewportChange = () => ensureStudioButtonVisible();

    window.addEventListener('orientationchange', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('orientationchange', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  // Use adaptive fields hook
  const adaptiveFields = useAdaptiveFields(result.analysis);

  // Load edits from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('prompt_reconstructor_edits');
    if (saved) {
      try {
        setUserEdits(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved edits', e);
      }
    }
  }, []);

  // Debounced save to local storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('prompt_reconstructor_edits', JSON.stringify(userEdits));
      } catch (e) {
        console.error('Failed to save edits', e);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [userEdits]);

  // Global escape handler to force close all dialogs
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[ResultsSection] Escape pressed - closing all dialogs');
        setShowGenerationDialog(false);
        setShowBatchGenerationDialog(false);
        setShowBlendDialog(false);
        setShowUpscaleDialog(false);
        setShowBatchProcessDialog(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Enhanced body overflow management with defensive cleanup
  useEffect(() => {
    const hasOverlay = showGenerationDialog ||
      showBatchGenerationDialog ||
      showBlendDialog ||
      showUpscaleDialog ||
      showBatchProcessDialog;

    console.log('[ResultsSection] Dialog state:', {
      hasOverlay,
      showGenerationDialog,
      showBatchGenerationDialog,
      showBlendDialog,
      showUpscaleDialog,
      showBatchProcessDialog
    });

    if (hasOverlay) {
      if (previousBodyOverflow.current === null && document.body) {
        previousBodyOverflow.current = document.body.style.overflow || '';
        console.log('[ResultsSection] Saving body overflow:', previousBodyOverflow.current);
      }
      if (document.body) {
        document.body.style.overflow = 'hidden';
        console.log('[ResultsSection] Body overflow set to hidden');
      }
    } else if (previousBodyOverflow.current !== null && document.body) {
      console.log('[ResultsSection] Restoring body overflow:', previousBodyOverflow.current);
      document.body.style.overflow = previousBodyOverflow.current;
      previousBodyOverflow.current = null;
      
      // Defensive fallback: ensure overflow is restored after 100ms
      setTimeout(() => {
        if (document.body && !hasOverlay) {
          const currentOverflow = document.body.style.overflow;
          if (currentOverflow === 'hidden') {
            console.log('[ResultsSection] Defensive cleanup: forcing overflow restore');
            document.body.style.overflow = '';
          }
        }
      }, 100);
    }

    return () => {
      // Cleanup on unmount
      if (previousBodyOverflow.current !== null && document.body) {
        console.log('[ResultsSection] Cleanup: restoring body overflow on unmount');
        document.body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
    };
  }, [
    showGenerationDialog,
    showBatchGenerationDialog,
    showBlendDialog,
    showUpscaleDialog,
    showBatchProcessDialog
  ]);

  // Live preview with debounced regeneration (2s delay) + pulse animation
  useEffect(() => {
    if (Object.keys(userEdits).length === 0) {
      setLivePreviewPrompt(result.full_regeneration_prompt);
      setModifiedCount(0);
      return;
    }

    const count = Object.keys(userEdits).filter(key => userEdits[key as keyof UserEdits]).length;
    setModifiedCount(count);

    // Trigger pulse animation
    setPromptPulse(true);
    setTimeout(() => setPromptPulse(false), 600);

    const timeoutId = setTimeout(() => {
      // Generate live preview by merging edits into prompt
      let preview = result.full_regeneration_prompt;
      
      // Replace values contextually in the prompt
      Object.entries(userEdits).forEach(([key, value]) => {
        if (value) {
          // Simple replacement - in production, you'd call the API
          const fieldNames: Record<string, string> = {
            subject_gender: 'gender',
            subject_ethnicity: 'ethnicity',
            camera_type: 'camera',
            lighting_type: 'lighting',
            dominant_color_1: 'primary color',
            dominant_color_2: 'secondary color',
            art_style: 'style',
            background_type: 'background',
            intended_platform: 'platform'
          };
          
          const fieldName = fieldNames[key] || key;
          preview = preview.replace(
            new RegExp(`${fieldName}[^,.\n]*`, 'gi'),
            `${fieldName}: ${value}`
          );
        }
      });
      
      setLivePreviewPrompt(preview);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [userEdits, result.full_regeneration_prompt, livePreviewPrompt]);

  const handleEditChange = (field: keyof UserEdits, value: string) => {
    setUserEdits(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const basePrompt = livePreviewPrompt || result.full_regeneration_prompt;

  const openBatchProcess = (mode: "analyze" | "upscale") => {
    setBatchProcessMode(mode);
    setShowBatchProcessDialog(true);
  };

  const quickTools = [
    {
      label: "Blend",
      icon: Blend,
      caption: "Merge inspirations",
      onClick: () => setShowBlendDialog(true)
    },
    {
      label: "Upscale",
      icon: Maximize2,
      caption: "Sharpen resolution",
      onClick: () => setShowUpscaleDialog(true)
    },
    {
      label: "Batch",
      icon: Grid3x3,
      caption: "Generate variations",
      onClick: () => setShowBatchGenerationDialog(true)
    },
    {
      label: "Analyze",
      icon: Scan,
      caption: "Re-run diagnostics",
      onClick: () => openBatchProcess("analyze")
    }
  ];

  const handleOpenStudio = (promptToUse?: string) => {
    const targetPrompt = promptToUse ?? basePrompt;
    setGenerationPrompt(targetPrompt);
    ensureStudioButtonVisible();
    setShowGenerationDialog(true);
  };

  const handleApplyGuidedTweak = async (tweakDescription: string) => {
    setIsApplyingTweak(true);
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        setIsApplyingTweak(false);
        return;
      }

      toast.info("Working on it…");

      // Call the edge function to apply the tweak
      const { data, error } = await supabase.functions.invoke("apply-guided-tweak", {
        body: { 
          current_prompt: result.full_regeneration_prompt,
          tweak_description: tweakDescription,
          analysis: result.analysis
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Guided tweak error:", error);
        toast.error("Failed to apply tweak. Please try again.");
        setIsApplyingTweak(false);
        return;
      }

      if (!data?.full_regeneration_prompt) {
        toast.error("Invalid response from AI. Please try again.");
        setIsApplyingTweak(false);
        return;
      }

      // Update the result with the modified prompt and any changed analysis fields
      const updatedAnalysis = { ...result.analysis };
      if (data.modified_fields) {
        Object.entries(data.modified_fields).forEach(([key, value]) => {
          if (value && key in updatedAnalysis) {
            updatedAnalysis[key as keyof Analysis] = value as string;
          }
        });
      }

      const updatedResult = {
        full_regeneration_prompt: data.full_regeneration_prompt,
        analysis: updatedAnalysis
      };

      // Call the parent callback to update the result
      if (onResultUpdate) {
        onResultUpdate(updatedResult);
      }

      setIsApplyingTweak(false);
      toast.success("Guided refinement applied.");
      
      // Trigger pulse animation
      setPromptPulse(true);
      setTimeout(() => setPromptPulse(false), 600);

    } catch (error) {
      console.error("Error applying guided tweak:", error);
      toast.error("Something went wrong. Try again.");
      setIsApplyingTweak(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(result.full_regeneration_prompt);
    toast.success("Prompt copied to clipboard.");
  };

  const handleCopySection = (content: string, sectionName: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${sectionName} copied to clipboard.`);
  };


  const handleRegenerate = () => {
    onRegenerate(userEdits);
  };

  // Extract key insights for chips
  const extractInsights = (): string[] => {
    const insights: string[] = [];
    const { lighting, color_palette, camera_composition } = result.analysis;
    
    // Lighting insights
    if (lighting.toLowerCase().includes('backlight')) insights.push('Strong backlight');
    else if (lighting.toLowerCase().includes('soft')) insights.push('Soft lighting');
    else if (lighting.toLowerCase().includes('dramatic')) insights.push('Dramatic lighting');
    
    // Color insights
    if (color_palette.toLowerCase().includes('muted')) insights.push('Muted color palette');
    else if (color_palette.toLowerCase().includes('vibrant')) insights.push('Vibrant colors');
    else if (color_palette.toLowerCase().includes('warm')) insights.push('Warm tones');
    
    // Composition insights
    if (camera_composition.toLowerCase().includes('center')) insights.push('Centered subject');
    else if (camera_composition.toLowerCase().includes('rule of thirds')) insights.push('Rule of thirds');
    
    // Contrast
    if (color_palette.toLowerCase().includes('high contrast')) insights.push('High contrast');
    else if (color_palette.toLowerCase().includes('low contrast') || color_palette.toLowerCase().includes('subtle')) {
      insights.push('Soft contrast');
    }
    
    return insights.slice(0, 4); // Max 4 chips
  };

  return (
    <section className="w-full space-y-12 pb-10 md:pb-16">
      <div className="space-y-12">
        <section className="rounded-[32px] border border-border/40 bg-background p-6 sm:p-10 shadow-[0_45px_120px_-60px_rgba(0,0,0,0.55)]">
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">Creative Blueprint</p>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold text-foreground">Full Generation Prompt</h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:max-w-3xl">
              Everything the Studio will reference to bring your idea to life.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="h-10 rounded-full px-5 text-sm font-semibold shadow-[0_12px_30px_-20px_rgba(0,0,0,0.55)]"
                onClick={handleCopyPrompt}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>

            <div className="relative">
              {modifiedCount > 0 && (
                <div className="absolute -top-3 right-4 z-10 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
                  {modifiedCount} parameter{modifiedCount !== 1 ? "s" : ""} tuned
                </div>
              )}

              <div
                className={cn(
                  "max-h-[360px] w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-2xl border border-border/40 bg-surface-1/70 p-4 sm:p-6 md:p-8 font-mono text-xs sm:text-sm leading-6 sm:leading-7 text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500",
                  promptPulse && "ring-1 ring-primary/60 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                )}
              >
                {basePrompt}
              </div>
            </div>

            {/* Guided Refinements Section - Always Visible, Compact on Mobile */}
            <div className="mt-6">
              <GuidedTweaks
                analysis={result.analysis}
                onApplyTweak={handleApplyGuidedTweak}
                isApplying={isApplyingTweak || isRegenerating}
              />
            </div>

            {/* Generate in Studio Button */}
            <div className="space-y-5 mt-8">
              <div className="flex justify-center">
                <div className="sticky bottom-6 z-20 w-full md:static md:w-auto">
                  <Button
                    ref={studioButtonRef}
                    className="h-12 w-full rounded-full text-base font-semibold shadow-[0_22px_40px_-24px_rgba(0,0,0,0.65)] md:w-auto md:px-12"
                    onClick={() => handleOpenStudio()}
                  >
                    Generate in Studio
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Open this prompt in Studio to create or refine your image
              </p>
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">
                  Image analyzed successfully
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Results Section - Moved Here */}
        <section className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 sm:p-10 shadow-[0_35px_90px_-60px_rgba(0,0,0,0.55)] animate-fade-in">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">Studio Output</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Studio Results</h2>
            <p className="text-sm text-muted-foreground">Review and compare everything you created from this blueprint.</p>
          </div>

          {generatedImages.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center space-y-4 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
              <div className="rounded-full bg-primary/10 p-4 animate-scale-in">
                <Wand2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-semibold text-foreground">No images generated yet</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Generate in Studio" above to create your first image from this blueprint. Your generated images will appear here for comparison.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleOpenStudio()}
                className="mt-2 min-h-[44px] px-6"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Your First Image
              </Button>
            </div>
          ) : (
            // Results Content
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
                <TabsTrigger value="comparison" className="gap-2 min-h-[44px]">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Comparison</span>
                  <span className="sm:hidden">Compare</span>
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-2 min-h-[44px]">
                  <Grid3x3 className="h-4 w-4" />
                  Gallery
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="mt-6">
                {imagePreviewUrl ? (
                  <ImageComparisonView
                    originalImage={imagePreviewUrl}
                    generatedImages={generatedImages}
                  />
                ) : (
                  <div className="py-12 text-center rounded-2xl border border-border/40 bg-muted/10">
                    <p className="text-sm text-muted-foreground">Original image not available for comparison</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gallery" className="mt-6">
                <GeneratedImagesGallery
                  images={generatedImages}
                  onDelete={onDeleteImage}
                />
              </TabsContent>
            </Tabs>
          )}
        </section>

        {extractInsights().length > 0 && (
          <InsightChips insights={extractInsights()} />
        )}

        <section className="space-y-8 rounded-3xl border border-border/40 bg-background p-6 sm:p-10 shadow-[0_35px_90px_-60px_rgba(0,0,0,0.55)]">
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">Comprehensive Analysis</p>
            <h3 className="text-3xl font-display font-semibold text-foreground">
              AI interpretation of lighting, composition, and mood.
            </h3>
            <p className="text-sm text-muted-foreground">
              Explore the fine details before sending your refreshed blueprint back to Studio.
            </p>
          </div>

          {modifiedCount === 0 && <EmptyStatePrompts />}

          <div className="rounded-3xl border border-border/30 bg-card p-4 sm:p-6 shadow-[0_25px_70px_-50px_rgba(0,0,0,0.45)]">
            <AnalysisTabbed
              analysis={result.analysis}
              userEdits={userEdits}
              onEditChange={handleEditChange}
              adaptiveFields={adaptiveFields}
              suggestions={SUGGESTIONS}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-border/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              Apply your adjustments, then refresh the analysis to update the blueprint.
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || Object.keys(userEdits).length === 0}
                className="min-h-[44px] px-6"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isRegenerating && "animate-spin")} />
                Refresh Analysis
              </Button>
              <CreditCostIndicator cost={1} action="prompt refinement" />
            </div>
          </div>
        </section>
      </div>


      {/* Quick Tools Section - Moved to End */}
      <section className="rounded-3xl border border-border/40 bg-background p-6 sm:p-8 shadow-[0_35px_90px_-60px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">Creative Tools</p>
          <h3 className="text-xl font-semibold text-foreground">Keep the flow going</h3>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickTools.map(({ label, icon: Icon, caption, onClick }) => (
            <Button
              key={label}
              variant="ghost"
              onClick={onClick}
              className="h-auto w-full justify-start gap-3 rounded-2xl border border-border/40 bg-background px-3 py-4 text-left shadow-[0_18px_35px_-32px_rgba(0,0,0,0.7)] hover:border-primary/40 hover:bg-card"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">{label}</span>
                <span className="block text-xs text-muted-foreground truncate">{caption}</span>
              </span>
            </Button>
          ))}
        </div>
      </section>

      <ImageGenerationDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        initialPrompt={generationPrompt}
        onGenerate={onGenerateImage}
      />

      <BatchGenerationDialog
        open={showBatchGenerationDialog}
        onOpenChange={setShowBatchGenerationDialog}
        basePrompt={result.full_regeneration_prompt}
        onGenerate={onGenerateImage}
      />

      <ImageBlendDialogEnhanced
        open={showBlendDialog}
        onOpenChange={setShowBlendDialog}
      />

      <ImageUpscaleDialog
        open={showUpscaleDialog}
        onOpenChange={setShowUpscaleDialog}
      />

      <BatchProcessDialog
        open={showBatchProcessDialog}
        onOpenChange={setShowBatchProcessDialog}
        initialOperation={batchProcessMode}
      />
    </section>
  );
};