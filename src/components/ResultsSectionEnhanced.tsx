import { useState, useEffect } from "react";
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
  Scan
} from "lucide-react";
import { toast } from "sonner";
import { Analysis, AnalysisResult, UserEdits, GeneratedImage } from "@/pages/Index";
import { Separator } from "@/components/ui/separator";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ImageBlendDialogEnhanced } from "@/components/ImageBlendDialogEnhanced";
import { ImageUpscaleDialog } from "@/components/ImageUpscaleDialog";
import { BatchProcessDialog } from "@/components/BatchProcessDialog";
import jsPDF from "jspdf";

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
  const [isMobile, setIsMobile] = useState(false);
  const [showBlendDialog, setShowBlendDialog] = useState(false);
  const [showUpscaleDialog, setShowUpscaleDialog] = useState(false);
  const [showBatchProcessDialog, setShowBatchProcessDialog] = useState(false);
  const [batchProcessMode, setBatchProcessMode] = useState<"analyze" | "upscale">("analyze");

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
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

  const quickActionPresets = [
    {
      label: "Enhance",
      icon: Sparkles,
      description: "Add cinematic depth and richer detail",
      modifier: "Enhance lighting contrast, increase micro-detail, and sharpen subject focus"
    },
    {
      label: "Simplify",
      icon: Feather,
      description: "Minimal composition and clean storytelling",
      modifier: "Simplify composition with a clean background and minimal supporting elements"
    },
    {
      label: "Artistic",
      icon: Palette,
      description: "Painterly character and stylized finishes",
      modifier: "Infuse artistic brushwork, painterly textures, and expressive color accents"
    },
    {
      label: "Reword",
      icon: Quote,
      description: "Refined phrasing for clarity",
      modifier: "Rewrite the prompt for clarity, narrative flow, and precise language"
    }
  ];

  const basePrompt = livePreviewPrompt || result.full_regeneration_prompt;

  const handleQuickAction = (modifier: string, label: string) => {
    const updatedPrompt = `${basePrompt}\n\n// ${label}: ${modifier}`;
    setGenerationPrompt(updatedPrompt);
    setShowGenerationDialog(true);
    toast.success(`${label} preset applied to your prompt`);
  };

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

  const handleDownloadTxt = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const content = `AI IMAGE PROMPT RECONSTRUCTION SHEET
Generated: ${timestamp}

═══════════════════════════════════════════════════════════════

FULL REGENERATION PROMPT

${result.full_regeneration_prompt}

═══════════════════════════════════════════════════════════════

COMPREHENSIVE ANALYSIS

1. Image Overview
${result.analysis.image_overview}

2. Subject Description
${result.analysis.subject_description}

3. Camera & Composition
${result.analysis.camera_composition}

4. Lighting
${result.analysis.lighting}

5. Color Palette
${result.analysis.color_palette}

6. Design Style
${result.analysis.design_style}

7. Texture & Material
${result.analysis.texture_material}

8. Mood & Emotion
${result.analysis.mood_emotion}

9. Background & Environment
${result.analysis.background_environment}

10. Artistic Medium
${result.analysis.artistic_medium}

11. Art Direction & Influence
${result.analysis.art_direction_influence}

12. Intended Use
${result.analysis.intended_use}

═══════════════════════════════════════════════════════════════

USER EDITS (if any):
${Object.keys(userEdits).length > 0 ? JSON.stringify(userEdits, null, 2) : 'None'}

═══════════════════════════════════════════════════════════════

Ready to use with: Midjourney, DALL·E, Firefly, Leonardo, Stable Diffusion`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-reconstruction-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("TXT file downloaded!");
  };

  const handleDownloadPdf = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - 2 * margin;
    let yPos = margin;

    const addText = (text: string, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPos > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 3;
    };

    addText("AI IMAGE PROMPT RECONSTRUCTION SHEET", 16, true);
    addText(`Generated: ${timestamp}`, 9);
    yPos += 5;
    
    addText("FULL REGENERATION PROMPT", 14, true);
    addText(result.full_regeneration_prompt);
    yPos += 5;
    
    addText("COMPREHENSIVE ANALYSIS", 14, true);
    
    const analysisFields = [
      ["1. Image Overview", result.analysis.image_overview],
      ["2. Subject Description", result.analysis.subject_description],
      ["3. Camera & Composition", result.analysis.camera_composition],
      ["4. Lighting", result.analysis.lighting],
      ["5. Color Palette", result.analysis.color_palette],
      ["6. Design Style", result.analysis.design_style],
      ["7. Texture & Material", result.analysis.texture_material],
      ["8. Mood & Emotion", result.analysis.mood_emotion],
      ["9. Background & Environment", result.analysis.background_environment],
      ["10. Artistic Medium", result.analysis.artistic_medium],
      ["11. Art Direction & Influence", result.analysis.art_direction_influence],
      ["12. Intended Use", result.analysis.intended_use],
    ];
    
    analysisFields.forEach(([title, content]) => {
      addText(title, 11, true);
      addText(content, 10);
      yPos += 2;
    });
    
    if (Object.keys(userEdits).length > 0) {
      addText("USER EDITS", 12, true);
      addText(JSON.stringify(userEdits, null, 2), 9);
    }
    
    doc.save(`prompt-reconstruction-${timestamp}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handleDownloadJson = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const jsonData = {
      generated: timestamp,
      full_regeneration_prompt: result.full_regeneration_prompt,
      analysis: result.analysis,
      user_edits: userEdits,
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-reconstruction-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("JSON file downloaded!");
  };

  const actionButtons = (
    <>
      <Button
        className="flex-1 rounded-full h-12 text-base font-semibold shadow-[0_18px_30px_-20px_rgba(0,0,0,0.45)]"
        onClick={() => {
          setGenerationPrompt(basePrompt);
          setShowGenerationDialog(true);
        }}
      >
        Use in Studio
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 rounded-full h-12 text-base font-semibold"
          >
            Download
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={handleDownloadTxt}>
            Download as TXT
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDownloadPdf}>
            Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDownloadJson}>
            Download as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

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

      toast.info("Applying guided tweak with AI...");

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
      toast.success("Tweak applied successfully!");
      
      // Trigger pulse animation
      setPromptPulse(true);
      setTimeout(() => setPromptPulse(false), 600);

    } catch (error) {
      console.error("Error applying guided tweak:", error);
      toast.error("An error occurred while applying the tweak.");
      setIsApplyingTweak(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(result.full_regeneration_prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleCopySection = (content: string, sectionName: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${sectionName} copied to clipboard!`);
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
    <section className="space-y-12 pb-28">
      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] items-start gap-8 xl:gap-12">
        <div className="space-y-10">
          <div className="space-y-10 rounded-[32px] border border-border/40 bg-background/80 p-8 shadow-[0_45px_120px_-60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">
                  Full Generation Prompt
                </p>
                <h2 className="text-3xl font-display font-semibold text-foreground sm:text-4xl">
                  Creative Blueprint
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Everything the AI needs to recreate and elevate your vision.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 rounded-full px-5 text-sm font-semibold shadow-[0_12px_30px_-20px_rgba(0,0,0,0.55)]"
                onClick={handleCopyPrompt}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy prompt
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
                  "max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border/40 bg-surface-1/70 p-6 font-mono text-sm leading-7 text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500 sm:p-8 sm:text-base",
                  promptPulse && "ring-2 ring-primary/50 shadow-[0_20px_45px_-30px_rgba(59,130,246,0.55)]"
                )}
              >
                {basePrompt}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">
                  Quick Actions
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {quickActionPresets.map(({ label, icon: Icon, description, modifier }) => (
                    <Button
                      key={label}
                      variant="ghost"
                      onClick={() => handleQuickAction(modifier, label)}
                      className="h-auto justify-start gap-2 rounded-2xl border border-border/40 bg-background/40 px-5 py-4 text-left shadow-[0_18px_35px_-32px_rgba(0,0,0,0.7)] hover:border-primary/40 hover:bg-background/70"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                      </div>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {description}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-border/40 bg-background/30 p-6 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">
                    Quick Tools
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {quickTools.map(({ label, icon: Icon, caption, onClick }) => (
                      <Button
                        key={label}
                        variant="ghost"
                        onClick={onClick}
                        className="h-auto justify-start gap-3 rounded-2xl border border-border/30 bg-background/60 px-4 py-4 text-left shadow-[0_14px_30px_-28px_rgba(0,0,0,0.7)] hover:border-primary/40 hover:bg-background/80"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{label}</div>
                          <div className="text-xs text-muted-foreground">{caption}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 rounded-2xl border border-border/40 bg-background/30 p-6 backdrop-blur">
                  <QuickTweaksRow
                    analysis={result.analysis}
                    variant="inline"
                    className="border-none bg-transparent p-0 shadow-none"
                  />
                  <div className="border-t border-border/30 pt-6">
                    <GuidedTweaks
                      analysis={result.analysis}
                      onApplyTweak={handleApplyGuidedTweak}
                      isApplying={isApplyingTweak || isRegenerating}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <InsightChips insights={extractInsights()} />

          <Separator className="my-10" />

          <ToolsShowcase />

          <Separator className="my-10" />

          <div className="animate-fade-in">
            <PromptBuilder
              analysis={result.analysis}
              onGenerate={(prompt) => {
                setGenerationPrompt(prompt);
                setShowGenerationDialog(true);
              }}
            />
          </div>

          <Separator className="my-10" />

          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-display font-semibold text-foreground">
                  Comprehensive Analysis
                </h2>
                <p className="text-sm text-muted-foreground">
                  Fine-tune individual parameters before regenerating.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setGenerationPrompt(result.full_regeneration_prompt);
                      setShowGenerationDialog(true);
                    }}
                    className="shadow-sm"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Image
                  </Button>
                  <CreditCostIndicator cost={3} action="image generation" />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBatchGenerationDialog(true)}
                    className="shadow-xs"
                  >
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    Batch Generate
                  </Button>
                  <CreditCostIndicator cost={3} action="per variation" />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isRegenerating || Object.keys(userEdits).length === 0}
                    className="shadow-xs"
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isRegenerating && "animate-spin")} />
                    Regenerate
                  </Button>
                  <CreditCostIndicator cost={1} action="prompt refinement" />
                </div>
              </div>
            </div>

            {modifiedCount === 0 && <EmptyStatePrompts />}

            <AnalysisTabbed
              analysis={result.analysis}
              userEdits={userEdits}
              onEditChange={handleEditChange}
              adaptiveFields={adaptiveFields}
              suggestions={SUGGESTIONS}
            />
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8">
          <div className="rounded-3xl border border-border/40 bg-background/70 p-4 shadow-[0_35px_80px_-60px_rgba(0,0,0,0.7)] backdrop-blur">
            {imagePreviewUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-surface-1 p-4">
                <img
                  src={imagePreviewUrl}
                  alt="Analyzed image preview"
                  className="max-h-[480px] w-full rounded-xl object-contain"
                />
                <div className="mt-4 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                  Original Image
                </div>
              </div>
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/40 text-muted-foreground">
                Preview will appear here
              </div>
            )}
          </div>

          <div className="hidden xl:flex flex-col gap-3">
            {actionButtons}
          </div>
        </aside>
      </div>

      {isMobile && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-border/40 bg-background/95 p-4 shadow-[0_35px_80px_-55px_rgba(0,0,0,0.75)] backdrop-blur-lg">
            {actionButtons}
          </div>
        </div>
      )}

      {generatedImages.length > 0 && (
        <>
          <Separator className="my-12" />
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold tracking-tight">
                Generated Images
              </h2>
            </div>

            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="comparison" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Comparison
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-2">
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
                  <div className="py-8 text-center text-muted-foreground">
                    Original image not available for comparison
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
          </div>
        </>
      )}

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