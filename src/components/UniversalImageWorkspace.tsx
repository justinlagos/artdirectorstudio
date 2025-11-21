import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Save, Download, RotateCcw, History, Layers, Maximize2, Sparkles, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// ScrollArea will be handled by native scrolling in the tabs content
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { PreviewCanvas } from "./edit-image/PreviewCanvas";
import { AdjustmentsPanel, Adjustments } from "./edit-image/AdjustmentsPanel";
import { SelectionTool } from "./edit-image/SelectionTool";
import { ColorPickerPanel } from "./edit-image/ColorPickerPanel";
import { AdvancedEditPanel } from "./edit-image/AdvancedEditPanel";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useNavigate } from "react-router-dom";
import { getCachedUnderstanding, analyzeImageDeep } from "@/lib/intelligence/imageUnderstanding";
import { getQuickFixes, getFixAdjustments } from "@/lib/intelligence/visualTroubleshooting";
import { useIntelligence } from "@/hooks/useIntelligence";
import { 
  generateInstructionFromAdjustments, 
  generateFilterStyle, 
  DEFAULT_ADJUSTMENTS 
} from "@/lib/imageEditing/instructionGenerator";

interface UniversalImageWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialInstruction?: string;
  onImageEdited?: (newImageUrl: string) => void;
  sourceType?: 'studio' | 'blend' | 'upscale' | 'edit';
}

// Use centralized default adjustments
const defaultAdjustments = DEFAULT_ADJUSTMENTS;

interface ImageVersion {
  id: string;
  url: string;
  type: 'original' | 'edit' | 'upscale' | 'blend';
  timestamp: Date;
  prompt?: string;
}

export const UniversalImageWorkspace = ({
  open,
  onOpenChange,
  imageUrl,
  initialInstruction = "",
  onImageEdited,
  sourceType = 'studio',
}: UniversalImageWorkspaceProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { openTool } = useToolsModal();
  const intelligence = useIntelligence();
  const queryClient = useQueryClient();
  const [adjustments, setAdjustments] = useState<Adjustments>(defaultAdjustments);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [selectedRegion, setSelectedRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [regionInstruction, setRegionInstruction] = useState("");
  const [customInstruction, setCustomInstruction] = useState(initialInstruction);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [activeTab, setActiveTab] = useState<"adjust" | "select" | "color" | "advanced">("adjust");
  const [instructionError, setInstructionError] = useState<string | null>(null);
  const [versionsHistory, setVersionsHistory] = useState<ImageVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [quickFixes, setQuickFixes] = useState<Array<{ label: string; action: string; instruction: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (open) {
      setPreviewUrl(imageUrl);
      setCustomInstruction(initialInstruction);
      setInstructionError(null);
      setSelectedRegion(null);
      setRegionInstruction("");
      setAdjustments(defaultAdjustments);
      loadVersionsHistory();
      analyzeImageForFixes();
      // Note: Body scroll lock is handled by EditImageModalWrapper's ArtieModal
      // Do NOT manually set document.body.style.overflow here
    }
  }, [open, imageUrl, initialInstruction]);

  const analyzeImageForFixes = async () => {
    if (!imageUrl) return;
    
    setIsAnalyzing(true);
    try {
      // Get image understanding
      let understanding = await getCachedUnderstanding(imageUrl);
      if (!understanding) {
        understanding = await analyzeImageDeep(imageUrl);
      }

      // Get quick fixes
      const fixes = getQuickFixes(understanding);
      setQuickFixes(fixes);
    } catch (error) {
      console.error('[Workspace] Error analyzing for fixes:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyQuickFix = (fix: { label: string; action: string; instruction: string }) => {
    // Set the instruction
    setCustomInstruction(fix.instruction);
    setActiveTab("adjust");
    
    toast.success(`Applied: ${fix.label}`, {
      description: fix.instruction
    });
  };

  const loadVersionsHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load related images from the same source
      const { data: assets } = await supabase
        .from('generated_assets')
        .select('id, image_url, action, prompt, created_at, source_urls')
        .eq('user_id', user.id)
        .or(`image_url.eq.${imageUrl},source_urls.cs.["${imageUrl}"]`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (assets) {
        const versions: ImageVersion[] = [
          {
            id: 'original',
            url: imageUrl,
            type: 'original',
            timestamp: new Date(),
          },
          ...assets.map(asset => ({
            id: asset.id,
            url: asset.image_url || '',
            type: (asset.action || 'edit') as ImageVersion['type'],
            timestamp: new Date(asset.created_at),
            prompt: asset.prompt || undefined,
          })).filter(v => v.url)
        ];
        setVersionsHistory(versions);
      }
    } catch (error) {
      console.error('Error loading versions history:', error);
    }
  };

  // Use centralized instruction generation
  const generateInstruction = (): string => {
    // Priority: region instruction > custom instruction > adjustments
    if (selectedRegion && regionInstruction.trim()) {
      return regionInstruction.trim();
    }
    
    if (customInstruction.trim()) {
      return customInstruction.trim();
    }

    // Generate from adjustments using centralized function
    return generateInstructionFromAdjustments(adjustments);
  };

  const submitEdit = async (instruction: string) => {
    const trimmedInstruction = instruction?.trim() || "";
    
    if (!trimmedInstruction || trimmedInstruction.length < 3) {
      setInstructionError("Describe what you want to change.");
      return;
    }

    setInstructionError(null);
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session. Please sign in.');
      }

      if (!imageUrl) {
        throw new Error('No image provided');
      }

      const requestBody: {
        imageUrl: string;
        instruction: string;
        quality?: string;
        region?: { x: number; y: number; width: number; height: number };
      } = {
        imageUrl: previewUrl,
        instruction: trimmedInstruction,
        quality: 'high'
      };

      if (selectedRegion && activeTab === "select") {
        requestBody.region = selectedRegion;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success && result.image) {
        setPreviewUrl(result.image);
        
        // Ensure the edited image is saved to database
        // Edge function should save it, but verify and save if needed
        try {
          const { ensureAssetSaved } = await import('@/lib/saveAsset');
          const assetId = await ensureAssetSaved({
            imageUrl: result.image,
            action: 'edit',
            prompt: trimmedInstruction,
            sourceUrls: [imageUrl],
            params: {
              instruction: trimmedInstruction,
              adjustments: adjustments,
              source: 'universal_workspace',
            },
            skipToast: true, // Edge function already shows toast
          });
          
          if (assetId) {
            console.log('[UniversalImageWorkspace] Asset saved successfully:', assetId);
          } else {
            console.warn('[UniversalImageWorkspace] Asset save returned null - may already exist or save failed silently');
          }
        } catch (saveError) {
          // Explicit error handling for save operation
          console.error('[UniversalImageWorkspace] Error saving edited image:', {
            error: saveError instanceof Error ? saveError.message : 'Unknown error',
            stack: saveError instanceof Error ? saveError.stack : undefined,
            imageUrl: result.image.substring(0, 100)
          });
          
          // Show error toast since save failed
          toast.error("Edits applied but save failed", {
            description: "Your edits were applied, but the image may not appear in My Projects. Please try saving manually.",
            duration: 5000
          });
        }
        
        toast.success("Edits applied successfully!", {
          description: "Saved to My Projects"
        });
        
        // Track user behavior
        try {
          await intelligence.trackAction('edit', result.image, {
            instruction: trimmedInstruction,
            adjustments: adjustments,
          });
        } catch (trackError) {
          // Non-critical - just log
          console.warn('[UniversalImageWorkspace] Error tracking action:', trackError);
        }
        
        // Reload versions history
        try {
          await loadVersionsHistory();
        } catch (historyError) {
          // Non-critical - just log
          console.warn('[UniversalImageWorkspace] Error reloading versions history:', historyError);
        }
        
        onImageEdited?.(result.image);
      } else {
        throw new Error(result.error || 'No image returned from edit');
      }
    } catch (error) {
      console.error('[WORKSPACE] Edit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply edits';
      setInstructionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    let instruction = "";
    
    if (activeTab === "select" && selectedRegion) {
      if (regionInstruction.trim().length >= 3) {
        instruction = regionInstruction.trim();
      } else if (customInstruction.trim().length >= 3) {
        instruction = customInstruction.trim();
      } else {
        setInstructionError("Describe what you want to change.");
        return;
      }
    } else if (selectedRegion && regionInstruction.trim().length >= 3) {
      instruction = regionInstruction.trim();
    } else if (customInstruction.trim().length >= 3) {
      instruction = customInstruction.trim();
    } else {
      instruction = generateInstruction();
    }
    
    if (instruction.length < 3) {
      setInstructionError("Describe what you want to change.");
      return;
    }
    
    submitEdit(instruction);
  };

  const handleReset = () => {
    setAdjustments(defaultAdjustments);
    setPreviewUrl(imageUrl);
    setSelectedRegion(null);
    setRegionInstruction("");
    setCustomInstruction(initialInstruction);
    setInstructionError(null);
    setActiveTab("adjust");
  };

  const handleDownload = async () => {
    try {
      if (!previewUrl) {
        toast.error("No image to download");
        return;
      }

      let blob: Blob;
      if (previewUrl.startsWith('data:')) {
        const response = await fetch(previewUrl);
        blob = await response.blob();
      } else {
        const response = await fetch(previewUrl, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        blob = await response.blob();
      }

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
      console.error('[WORKSPACE] Download error:', error);
      toast.error("Failed to download image");
    }
  };

  const handleUpscale = async () => {
    // Track user behavior
    await intelligence.trackAction('upscale', previewUrl);
    onOpenChange(false);
    setTimeout(() => {
      openTool('upscale');
      // Pass image URL to upscale tool via state or context
    }, 100);
  };

  const handleBlend = async () => {
    // Track user behavior
    await intelligence.trackAction('blend', previewUrl);
    onOpenChange(false);
    setTimeout(() => {
      openTool('blend');
    }, 100);
  };

  const handleSave = async () => {
    try {
      console.log('[UniversalImageWorkspace] Manual save triggered', {
        hasPreviewUrl: !!previewUrl,
        hasCustomInstruction: !!customInstruction,
        sourceUrl: imageUrl.substring(0, 100)
      });
      
      // Track user behavior (non-critical)
      try {
        await intelligence.trackAction('save', previewUrl);
      } catch (trackError) {
        console.warn('[UniversalImageWorkspace] Error tracking save action:', trackError);
      }
      
      // Explicitly save the current preview state
      const { ensureAssetSaved } = await import('@/lib/saveAsset');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to save your work');
      }
      
      const assetId = await ensureAssetSaved({
        imageUrl: previewUrl,
        action: 'edit',
        prompt: customInstruction || 'Saved from workspace',
        sourceUrls: [imageUrl],
        params: {
          adjustments: adjustments,
          source: 'universal_workspace',
          manual_save: true
        },
        queryClient: queryClient,
        userId: user.id,
        skipToast: false
      });
      
      if (assetId) {
        console.log('[UniversalImageWorkspace] Manual save successful:', assetId);
        toast.success("Image saved to My Projects", {
          description: "Your image has been saved successfully"
        });
        
        // Navigate to history after a short delay to allow save to complete
        setTimeout(() => {
          navigate('/history');
        }, 500);
      } else {
        console.warn('[UniversalImageWorkspace] Manual save returned null - asset may already exist or save failed');
        toast.warning("Save may have failed", {
          description: "Please check My Projects to verify. The image may already be saved.",
          duration: 5000
        });
      }
    } catch (saveError) {
      console.error('[UniversalImageWorkspace] Error in handleSave:', {
        error: saveError instanceof Error ? saveError.message : 'Unknown error',
        stack: saveError instanceof Error ? saveError.stack : undefined,
        previewUrl: previewUrl?.substring(0, 100)
      });
      
      toast.error("Failed to save image", {
        description: saveError instanceof Error ? saveError.message : "Please try again or check your connection",
        duration: 5000
      });
    }
  };

  // Defensive logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[UniversalImageWorkspace] Props changed:', {
        open,
        imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'empty',
        initialInstruction: initialInstruction ? `${initialInstruction.substring(0, 30)}...` : 'empty'
      });
    }
  }, [open, imageUrl, initialInstruction]);

  if (!open) {
    if (import.meta.env.DEV && imageUrl) {
      console.log('[UniversalImageWorkspace] Not rendering because open=false, but imageUrl exists:', imageUrl);
    }
    return null;
  }

  if (!imageUrl || imageUrl.trim() === '') {
    console.error('[UniversalImageWorkspace] Cannot render: imageUrl is empty or invalid');
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Internal header for workspace controls */}
      <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">Image Workspace</h2>
            <p className="text-xs text-muted-foreground">Edit, upscale, blend, and save</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex overflow-hidden",
        isMobile ? "flex-col" : "flex-row"
      )}>
        {/* Left: Versions History (Collapsible - Desktop Only) */}
        {!isMobile && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="border-r border-border/50">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-r-none rounded-l-none border-r border-border/50"
              >
                {historyOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="w-64 bg-muted/30">
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Versions</h3>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {versionsHistory.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => {
                        setPreviewUrl(version.url);
                        setCurrentVersionId(version.id);
                      }}
                      className={cn(
                        "w-full p-2 rounded-lg border transition-all text-left",
                        currentVersionId === version.id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {version.type}
                        </Badge>
                      </div>
                      <img
                        src={version.url}
                        alt={version.type}
                        className="w-full h-20 object-cover rounded"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Center: Image Preview - Full Width on Mobile */}
        <div className={cn(
          "flex items-center justify-center bg-muted/20 overflow-hidden",
          isMobile ? "flex-1 w-full p-3" : "flex-1 p-4"
        )}>
          <div className="w-full h-full flex items-center justify-center">
            <PreviewCanvas
              imageUrl={previewUrl}
              filterStyle={generateFilterStyle(adjustments)}
              selectedRegion={selectedRegion}
              onRegionSelect={activeTab === "select" ? setSelectedRegion : undefined}
              isSelectionMode={activeTab === "select"}
              selectedColor={activeTab === "color" ? selectedColor : undefined}
              isColorMode={activeTab === "color"}
              className={cn(
                "rounded-lg shadow-2xl max-w-full",
                isMobile ? "w-full h-auto max-h-[50dvh] object-contain" : "max-w-full max-h-full"
              )}
            />
          </div>
        </div>

        {/* Right: Tools Panel - Bottom Sheet on Mobile */}
        {isMobile ? (
          <div className="border-t border-border/50 bg-background shrink-0 flex flex-col max-h-[calc(50dvh-56px)] mb-16 safe-bottom">
            <Tabs 
              value={activeTab} 
              onValueChange={(v) => {
                // Smooth tab switching without reflow
                requestAnimationFrame(() => {
                  setActiveTab(v as any);
                });
              }} 
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid grid-cols-4 w-full rounded-none border-b border-border/50 h-12 shrink-0">
                <TabsTrigger value="adjust" className="text-xs md:text-[10px] px-2 touch-manipulation min-h-[44px]">
                  <span className="hidden sm:inline">Adjust</span>
                  <span className="sm:hidden">Adj</span>
                </TabsTrigger>
                <TabsTrigger value="select" className="text-xs md:text-[10px] px-2 touch-manipulation min-h-[44px]">
                  <span className="hidden sm:inline">Select</span>
                  <span className="sm:hidden">Sel</span>
                </TabsTrigger>
                <TabsTrigger value="color" className="text-xs md:text-[10px] px-2 touch-manipulation min-h-[44px]">
                  <span className="hidden sm:inline">Color</span>
                  <span className="sm:hidden">Col</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs md:text-[10px] px-2 touch-manipulation min-h-[44px]">
                  <span className="hidden sm:inline">Advanced</span>
                  <span className="sm:hidden">Adv</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 md:p-4 space-y-4 md:space-y-4 pb-safe">
                  {/* Instruction Input - Always visible, auto-resize */}
                  <div className="space-y-2">
                    <label className="text-sm md:text-xs font-medium">Editing Instruction</label>
                    <textarea
                      placeholder="Describe what you want to change..."
                      value={customInstruction}
                      onChange={(e) => {
                        setCustomInstruction(e.target.value);
                        setInstructionError(null);
                        // Auto-resize
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                      }}
                      onFocus={(e) => {
                        // Scroll into view when focused
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }}
                      className="w-full min-h-[60px] max-h-[200px] px-3 py-2.5 text-sm md:text-sm rounded-md border border-input bg-background resize-none"
                      style={{ height: 'auto' }}
                    />
                    {instructionError && (
                      <p className="text-xs text-destructive">{instructionError}</p>
                    )}
                  </div>

                  <TabsContent value="adjust" className="mt-0">
                    <AdjustmentsPanel
                      adjustments={adjustments}
                      onAdjustmentChange={(key, value) => {
                        setAdjustments(prev => ({ ...prev, [key]: value }));
                      }}
                      selectedPreset="None"
                      onPresetChange={() => {}}
                      presets={[]}
                    />
                  </TabsContent>

                  <TabsContent value="select" className="mt-0">
                    <SelectionTool
                      selectedRegion={selectedRegion}
                      onClearSelection={() => {
                        setSelectedRegion(null);
                        setRegionInstruction("");
                      }}
                      regionInstruction={regionInstruction}
                      onRegionInstructionChange={setRegionInstruction}
                    />
                  </TabsContent>

                  <TabsContent value="color" className="mt-0">
                    <ColorPickerPanel
                      selectedColor={selectedColor}
                      onColorChange={setSelectedColor}
                    />
                  </TabsContent>

                  <TabsContent value="advanced" className="mt-0">
                    <AdvancedEditPanel
                      customInstruction={customInstruction}
                      onInstructionChange={setCustomInstruction}
                    />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        ) : (
          <div className="w-80 border-l border-border/50 bg-background shrink-0 flex flex-col">
            <Tabs 
              value={activeTab} 
              onValueChange={(v) => {
                // Smooth tab switching without reflow
                requestAnimationFrame(() => {
                  setActiveTab(v as any);
                });
              }} 
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid grid-cols-4 w-full rounded-none border-b border-border/50 h-12">
                <TabsTrigger value="adjust" className="text-xs">Adjust</TabsTrigger>
                <TabsTrigger value="select" className="text-xs">Select</TabsTrigger>
                <TabsTrigger value="color" className="text-xs">Color</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
              </TabsList>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Quick Fixes - Visual Troubleshooting */}
                {quickFixes.length > 0 && (
                  <Alert className="border-primary/20 bg-primary/5">
                    <Zap className="h-4 w-4 text-primary" />
                    <AlertDescription className="space-y-2">
                      <p className="text-xs font-medium">Quick Fixes Available</p>
                      <div className="flex flex-wrap gap-2">
                        {quickFixes.map((fix, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => applyQuickFix(fix)}
                          >
                            {fix.label}
                          </Button>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Instruction Input */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Editing Instruction</label>
                  <textarea
                    placeholder="Describe what you want to change..."
                    value={customInstruction}
                    onChange={(e) => {
                      setCustomInstruction(e.target.value);
                      setInstructionError(null);
                    }}
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
                  />
                  {instructionError && (
                    <p className="text-xs text-destructive">{instructionError}</p>
                  )}
                </div>

                  <TabsContent value="adjust" className="mt-0">
                    <AdjustmentsPanel
                      adjustments={adjustments}
                      onAdjustmentChange={(key, value) => {
                        setAdjustments(prev => ({ ...prev, [key]: value }));
                      }}
                      selectedPreset="None"
                      onPresetChange={() => {}}
                      presets={[]}
                    />
                  </TabsContent>

                  <TabsContent value="select" className="mt-0">
                    <SelectionTool
                      selectedRegion={selectedRegion}
                      onClearSelection={() => {
                        setSelectedRegion(null);
                        setRegionInstruction("");
                      }}
                      regionInstruction={regionInstruction}
                      onRegionInstructionChange={setRegionInstruction}
                    />
                  </TabsContent>

                  <TabsContent value="color" className="mt-0">
                    <ColorPickerPanel
                      selectedColor={selectedColor}
                      onColorChange={setSelectedColor}
                    />
                  </TabsContent>

                  <TabsContent value="advanced" className="mt-0">
                    <AdvancedEditPanel
                      customInstruction={customInstruction}
                      onInstructionChange={setCustomInstruction}
                    />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        )}
      </div>

      {/* Bottom: Actions - Fixed on Mobile, Sticky on Desktop */}
      <div className={cn(
        "border-t border-border/50 flex items-center shrink-0 bg-background",
        isMobile 
          ? "fixed bottom-0 left-0 right-0 z-10 h-16 px-3 gap-2 overflow-x-auto touch-manipulation safe-bottom" 
          : "sticky bottom-0 h-16 px-4 justify-between"
      )}>
        {isMobile ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <RotateCcw className="h-4 w-4 md:h-3.5 md:w-3.5" />
              <span className="text-xs md:text-xs">Reset</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpscale}
              className="gap-1.5 shrink-0 min-h-[44px] touch-manipulation"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="text-xs">Upscale</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBlend}
              className="gap-1.5 shrink-0 min-h-[44px] touch-manipulation"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="text-xs">Blend</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 shrink-0 min-h-[44px] touch-manipulation"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">Save</span>
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isProcessing}
              className="gap-1.5 shrink-0 min-h-[44px] ml-auto touch-manipulation"
            >
              {isProcessing ? "Applying..." : "Apply"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpscale}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Upscale
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBlend}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Blend
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? "Applying..." : "Apply Changes"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

