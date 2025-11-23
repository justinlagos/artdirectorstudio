import { useState, useEffect } from "react";
import { ToolDrawer } from "@/components/ToolDrawer";
import { ImageZoomDialog } from "@/components/ImageZoomDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, MousePointer2, Palette, Wand2, AlertCircle, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { PreviewCanvas } from "./PreviewCanvas";
import { AdjustmentsPanel, Adjustments } from "./AdjustmentsPanel";
import { SelectionTool } from "./SelectionTool";
import { ColorPickerPanel } from "./ColorPickerPanel";
import { AdvancedEditPanel } from "./AdvancedEditPanel";
import { FooterActions } from "./FooterActions";
import { ShareToCommunityDialog } from "@/components/community/ShareToCommunityDialog";
import { 
  generateInstructionFromAdjustments, 
  generateFilterStyle, 
  DEFAULT_ADJUSTMENTS 
} from "@/lib/imageEditing/instructionGenerator";

interface EditImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialInstruction?: string;
  onImageEdited?: (newImageUrl: string) => void;
}

const FILTER_PRESETS = [
  { name: "None", adjustments: {} },
  { name: "Vivid", adjustments: { saturation: 130, vibrance: 120, contrast: 110 } },
  { name: "Warm", adjustments: { warmth: 25, saturation: 110 } },
  { name: "Cool", adjustments: { warmth: -20, saturation: 105 } },
  { name: "Dramatic", adjustments: { contrast: 130, shadows: -20, highlights: 20 } },
  { name: "Soft", adjustments: { contrast: 85, saturation: 90, clarity: -10 } },
  { name: "B&W", adjustments: { saturation: 0, contrast: 120 } },
  { name: "Cinematic", adjustments: { contrast: 125, shadows: -15, highlights: 15, saturation: 95 } },
];

// Use centralized default adjustments
const defaultAdjustments = DEFAULT_ADJUSTMENTS;

export const EditImageModal = ({
  open,
  onOpenChange,
  imageUrl,
  initialInstruction = "",
  onImageEdited,
}: EditImageModalProps) => {
  const isMobile = useIsMobile();
  const [adjustments, setAdjustments] = useState<Adjustments>(defaultAdjustments);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [selectedPreset, setSelectedPreset] = useState<string>("None");
  const [selectedRegion, setSelectedRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [regionInstruction, setRegionInstruction] = useState("");
  const [customInstruction, setCustomInstruction] = useState(initialInstruction);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [activeTab, setActiveTab] = useState<"adjustments" | "select" | "color" | "advanced">("adjustments");
  const [instructionError, setInstructionError] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setPreviewUrl(imageUrl);
    setCustomInstruction(initialInstruction);
    setInstructionError(null);
    setSelectedRegion(null);
    setRegionInstruction("");
    setAdjustments(defaultAdjustments);
    setSelectedPreset("None");
  }, [imageUrl, initialInstruction]);

  // Handle Escape key to clear selection
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedRegion && activeTab === "select") {
        setSelectedRegion(null);
        setRegionInstruction("");
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, selectedRegion, activeTab]);

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

  const submitEdit = async (instruction: string, mask?: string) => {
    // Validate instruction - must be present and at least 3 characters
    const trimmedInstruction = instruction?.trim() || "";
    
    if (!trimmedInstruction || trimmedInstruction.length < 3) {
      setInstructionError("Describe what you want to change.");
      return;
    }

    if (trimmedInstruction.length > 2000) {
      setInstructionError("Instruction is too long. Maximum 2000 characters.");
      return;
    }

    setInstructionError(null);
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session. Please sign in.');
      }

      // Ensure imageUrl is present
      const targetImageUrl = previewUrl || imageUrl;
      if (!targetImageUrl) {
        throw new Error('No image provided');
      }

      // Build request body with all required fields
      const requestBody: {
        imageUrl: string;
        instruction: string;
        quality?: string;
        mask?: string;
        region?: { x: number; y: number; width: number; height: number };
        adjustments?: Adjustments;
      } = {
        imageUrl: targetImageUrl,
        instruction: trimmedInstruction,
        quality: 'high',
        adjustments,
      };

      // Add optional mask if provided
      if (mask) {
        requestBody.mask = mask;
      }

      // Add optional region if provided
      if (selectedRegion) {
        requestBody.region = selectedRegion;
        console.log('[EDIT-IMAGE] Including region in request:', selectedRegion);
      }

      console.log('[EDIT-IMAGE] Submitting edit request:', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        instructionLength: trimmedInstruction.length,
        hasMask: !!mask,
        hasRegion: !!selectedRegion
      });

      let response;
      try {
        response = await fetch(
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
      } catch (fetchError) {
        console.error('[EDIT-IMAGE] Fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error. Please check your connection and try again.';
        setInstructionError(errorMessage);
        toast.error("Connection Error", {
          description: errorMessage
        });
        return;
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[EDIT-IMAGE] Error response (non-JSON):', response.status, errorText);
          const errorMessage = `Server error (${response.status}). Please try again.`;
          setInstructionError(errorMessage);
          toast.error(errorMessage);
          return;
        }
        
        const errorMessage = errorData.error || `Server error (${response.status})`;
        console.error('[EDIT-IMAGE] Error response:', {
          status: response.status,
          error: errorMessage,
          requestId: errorData.requestId
        });
        
        if (errorMessage.includes("instruction") || errorMessage.includes("required")) {
          setInstructionError("Please describe what you want to change before applying edits.");
        } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("session")) {
          setInstructionError("Your session has expired. Please refresh the page and try again.");
        } else if (errorMessage.includes("Access denied") || errorMessage.includes("upgrade")) {
          setInstructionError(errorMessage);
        } else {
          setInstructionError(errorMessage);
        }
        toast.error(errorMessage);
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('[EDIT-IMAGE] Failed to parse response:', parseError);
        setInstructionError("Failed to process server response. Please try again.");
        toast.error("Response Error", {
          description: "The server response could not be processed."
        });
        return;
      }
      
      if (result.success && result.image) {
        setPreviewUrl(result.image);
        toast.success("Edits applied successfully!", {
          description: result.assetId ? "Saved to My Projects" : "Image edited"
        });
        
        // If assetId is returned, the image was saved to database
        if (result.assetId) {
          console.log('[EDIT-IMAGE] Image saved to My Projects:', result.assetId);
        }
        
        onImageEdited?.(result.image);
      } else {
        const errorMessage = result.error || 'No image returned from edit';
        console.error('[EDIT-IMAGE] Invalid response:', result);
        setInstructionError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('[EDIT-IMAGE] Edit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply edits';
      setInstructionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    // Validate that there are changes
    if (!hasChanges()) {
      setInstructionError("Please add an editing instruction or adjust the image settings before applying changes.");
      return;
    }
    
    // Priority: region instruction > custom instruction > auto-generated from adjustments
    let instruction = "";
    
    // If Select tab is active and region is selected, prefer region instruction
    if (activeTab === "select" && selectedRegion) {
      if (regionInstruction.trim().length >= 3) {
        instruction = regionInstruction.trim();
      } else if (customInstruction.trim().length >= 3) {
        instruction = customInstruction.trim();
      } else {
        setInstructionError("Please describe what you want to change in the selected region.");
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
      setInstructionError("Please add an editing instruction or adjust the image settings before applying changes.");
      return;
    }
    
    setInstructionError(null);
    submitEdit(instruction);
  };

  const handleReset = () => {
    setAdjustments(defaultAdjustments);
    setPreviewUrl(imageUrl);
    setSelectedPreset("None");
    setSelectedRegion(null);
    setRegionInstruction("");
    setCustomInstruction(initialInstruction);
    setInstructionError(null);
    setActiveTab("adjustments");
  };

  const handleDownload = async () => {
    try {
      if (!previewUrl) {
        toast.error("No image to download");
        return;
      }

      // Handle CORS and data URLs
      let blob: Blob;
      if (previewUrl.startsWith('data:')) {
        // Data URL - convert directly
        const response = await fetch(previewUrl);
        blob = await response.blob();
      } else {
        // Regular URL - try fetch with CORS handling
        try {
          const response = await fetch(previewUrl, { mode: 'cors' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          blob = await response.blob();
        } catch (fetchError) {
          // Fallback: try to download via proxy or show helpful error
          console.error('[EDIT-IMAGE] Download error:', fetchError);
          toast.error("Download failed. The image may be protected. Try using the browser's right-click > Save Image.");
          return;
        }
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
      console.error('[EDIT-IMAGE] Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to download image", {
        description: errorMessage
      });
    }
  };

  const hasChanges = () => {
    // Check if there's a custom instruction
    if (customInstruction.trim().length >= 3) return true;
    
    // Check if there's a region instruction
    if (selectedRegion && regionInstruction.trim().length >= 3) return true;
    
    // Check if adjustments differ from defaults
    const hasAdjustments = Object.entries(adjustments).some(([key, value]) => {
      const defaultVal = defaultAdjustments[key as keyof Adjustments];
      return value !== defaultVal;
    });
    
    if (hasAdjustments) {
      const instruction = generateInstruction();
      return instruction.length >= 3;
    }
    
    return false;
  };

  const canApply = () => {
    return hasChanges();
  };

  const applyPreset = (presetName: string) => {
    const preset = FILTER_PRESETS.find(p => p.name === presetName);
    if (preset && preset.adjustments) {
      setAdjustments(prev => ({
        ...prev,
        ...preset.adjustments,
      }));
      setSelectedPreset(presetName);
    }
  };

  const footerContent = (
    <FooterActions
      onReset={handleReset}
      onDownload={handleDownload}
      onApply={handleApply}
      isProcessing={isProcessing}
      canApply={canApply()}
      onShare={() => setShareOpen(true)}
      shareDisabled={!previewUrl}
    />
  );

  return (
    <>
      <ToolDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Edit Image
          </div>
        }
        description={isMobile ? "Adjust colors, lighting, and composition with AI-powered transformations" : "Adjust colors, lighting, and composition. Select regions for targeted edits, or apply AI-powered transformations across your entire image."}
        footer={footerContent}
        className="max-w-[1400px] max-h-[90vh] md:max-h-[90vh]"
        contentClassName={cn(
          "flex flex-col min-h-0",
          !isMobile && "overflow-hidden h-full"
        )}
      >
      {isMobile ? (
        // Mobile: Image at top, tools in bottom sheet
        <div className="flex flex-col min-h-0">
          {/* Image Preview - ~60% viewport height */}
          <div className="flex-shrink-0 w-full mb-4 relative group" style={{ height: "60vh", maxHeight: "400px", minHeight: "300px" }}>
            <PreviewCanvas
              imageUrl={previewUrl}
              filterStyle={generateFilterStyle(adjustments)}
              selectedRegion={selectedRegion}
              onRegionSelect={activeTab === "select" ? setSelectedRegion : undefined}
              isSelectionMode={activeTab === "select"}
              className="rounded-xl w-full h-full"
            />
            {/* Zoom button overlay */}
            {!isProcessing && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowZoom(true)}
                  className="bg-background/95 backdrop-blur-sm"
                >
                  <ZoomIn className="w-4 h-4 mr-2" />
                  Zoom
                </Button>
              </div>
            )}
          </div>

          {/* Tools Panel - Scrollable bottom sheet */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Instruction Input - Always visible at top */}
            <div className="space-y-2 flex-shrink-0 mb-4">
              <Label htmlFor="custom-instruction" className="text-sm font-medium">Editing Instruction</Label>
              <Textarea
                id="custom-instruction"
                placeholder="Describe what you want to change… brighten the image, clean the background, change the jacket to red."
                value={customInstruction}
                onChange={(e) => {
                  setCustomInstruction(e.target.value);
                  setInstructionError(null);
                }}
                className="resize-none min-h-[80px] text-sm"
              />
              {instructionError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{instructionError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Tools Tabs - Scrollable */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4 h-9 flex-shrink-0">
                <TabsTrigger value="adjustments" className="text-xs">
                  Adjust
                </TabsTrigger>
                <TabsTrigger value="select" className="text-xs">
                  <MousePointer2 className="h-3 w-3 mr-1" />
                  Select
                </TabsTrigger>
                <TabsTrigger value="color" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Color
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">
                  <Wand2 className="h-3 w-3 mr-1" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 min-h-0">
                <TabsContent value="adjustments" className="mt-0">
                  <AdjustmentsPanel
                    adjustments={adjustments}
                    onAdjustmentChange={(key, value) => {
                      setAdjustments(prev => ({ ...prev, [key]: value }));
                    }}
                    selectedPreset={selectedPreset}
                    onPresetChange={applyPreset}
                    presets={FILTER_PRESETS}
                  />
                </TabsContent>

                <TabsContent value="select" className="mt-0">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tap and drag on the image to select a rectangular region for editing.
                    </p>
                    {!selectedRegion && (
                      <p className="text-xs text-muted-foreground italic">
                        Draw a region on the image to apply this change.
                      </p>
                    )}
                    <SelectionTool
                      selectedRegion={selectedRegion}
                      onClearSelection={() => {
                        setSelectedRegion(null);
                        setRegionInstruction("");
                      }}
                      onInstructionChange={setRegionInstruction}
                      instruction={regionInstruction}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="color" className="mt-0">
                  <ColorPickerPanel
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                    onApply={(color) => {
                      let instruction = "";
                      if (selectedRegion && regionInstruction.trim()) {
                        instruction = `${regionInstruction.trim()}. Change the color to ${color}`;
                      } else if (selectedRegion) {
                        instruction = `Change the color of the selected region to ${color}`;
                      } else if (customInstruction.trim()) {
                        instruction = `${customInstruction.trim()}. Change the color to ${color}`;
                      } else {
                        instruction = `Change the color of the main subject to ${color}`;
                      }
                      
                      // Validate instruction before submitting
                      if (instruction.trim().length < 3) {
                        setInstructionError("Please describe which object to recolor or select a region first.");
                        return;
                      }
                      
                      setCustomInstruction(instruction);
                      if (selectedRegion) {
                        setRegionInstruction(instruction);
                      }
                      setInstructionError(null);
                      submitEdit(instruction);
                    }}
                  />
                </TabsContent>

                <TabsContent value="advanced" className="mt-0">
                  <AdvancedEditPanel
                    onReplaceObject={(instruction) => {
                      setCustomInstruction(instruction);
                      submitEdit(instruction);
                    }}
                    onRemoveBlemish={() => {
                      const instruction = "Remove blemishes and imperfections while maintaining natural skin texture";
                      setCustomInstruction(instruction);
                      submitEdit(instruction);
                    }}
                    onSmoothBackground={() => {
                      const instruction = "Smooth and blur the background while keeping the subject sharp";
                      setCustomInstruction(instruction);
                      submitEdit(instruction);
                    }}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      ) : (
        // Desktop: Two-column layout - More space for right sidebar
        <div className={cn(
          "grid gap-6 h-full min-h-0 flex-1 overflow-hidden",
          "grid-cols-2 max-w-full"
        )}>
          {/* Left Column: Image Preview - Reduced size, centered, constrained height */}
          <div className="flex items-center justify-center min-h-0 overflow-hidden relative group rounded-xl bg-muted/10">
            <PreviewCanvas
              imageUrl={previewUrl}
              filterStyle={generateFilterStyle(adjustments)}
              selectedRegion={selectedRegion}
              onRegionSelect={activeTab === "select" ? setSelectedRegion : undefined}
              isSelectionMode={activeTab === "select"}
              className="rounded-xl w-full h-full max-h-[80vh] max-w-full object-contain"
            />
            {/* Zoom button overlay */}
            {!isProcessing && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowZoom(true)}
                  className="bg-background/95 backdrop-blur-sm"
                >
                  <ZoomIn className="w-4 h-4 mr-2" />
                  Zoom
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Tools Panel - Fixed width, Scrollable, More breathing room */}
          <div className="flex flex-col min-h-0 max-h-full overflow-hidden border-l border-border p-6">
            {/* Instruction Input - Fixed at top */}
            <div className="space-y-2 flex-shrink-0 mb-4">
              <Label htmlFor="custom-instruction" className="text-sm font-medium">Editing Instruction</Label>
              <Textarea
                id="custom-instruction"
                placeholder="Describe what you want to change… brighten the image, clean the background, change the jacket to red."
                value={customInstruction}
                onChange={(e) => {
                  setCustomInstruction(e.target.value);
                  setInstructionError(null);
                }}
                className="resize-none min-h-[100px] text-sm"
              />
              {instructionError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{instructionError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Tools Tabs - Scrollable */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4 h-10 flex-shrink-0 mb-4">
                <TabsTrigger value="adjustments" className="text-xs px-2">
                  Adjust
                </TabsTrigger>
                <TabsTrigger value="select" className="text-xs px-2">
                  <MousePointer2 className="h-3 w-3 mr-1" />
                  Select
                </TabsTrigger>
                <TabsTrigger value="color" className="text-xs px-2">
                  <Palette className="h-3 w-3 mr-1" />
                  Color
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs px-2">
                  <Wand2 className="h-3 w-3 mr-1" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto min-h-0">
                <TabsContent value="adjustments" className="mt-0">
                  <AdjustmentsPanel
                    adjustments={adjustments}
                    onAdjustmentChange={(key, value) => {
                      setAdjustments(prev => ({ ...prev, [key]: value }));
                    }}
                    selectedPreset={selectedPreset}
                    onPresetChange={applyPreset}
                    presets={FILTER_PRESETS}
                  />
                </TabsContent>

                <TabsContent value="select" className="mt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Click and drag on the image to select a rectangular region for editing. Panning is disabled in Select mode.
                    </p>
                    {!selectedRegion && (
                      <p className="text-sm text-muted-foreground italic">
                        Draw a region on the image to apply this change.
                      </p>
                    )}
                    <SelectionTool
                      selectedRegion={selectedRegion}
                      onClearSelection={() => {
                        setSelectedRegion(null);
                        setRegionInstruction("");
                      }}
                      onInstructionChange={setRegionInstruction}
                      instruction={regionInstruction}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="color" className="mt-0">
                  <ColorPickerPanel
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                    onApply={(color) => {
                      let instruction = "";
                      if (selectedRegion && regionInstruction.trim()) {
                        instruction = `${regionInstruction.trim()}. Change the color to ${color}`;
                      } else if (selectedRegion) {
                        instruction = `Change the color of the selected region to ${color}`;
                      } else if (customInstruction.trim()) {
                        instruction = `${customInstruction.trim()}. Change the color to ${color}`;
                      } else {
                        instruction = `Change the color of the main subject to ${color}`;
                      }
                      setCustomInstruction(instruction);
                      if (selectedRegion) {
                        setRegionInstruction(instruction);
                      }
                      if (instruction.trim().length >= 3) {
                        submitEdit(instruction);
                      } else {
                        setInstructionError("Please describe which object to recolor or select a region first.");
                      }
                    }}
                  />
                </TabsContent>

                <TabsContent value="advanced" className="mt-0">
                  <AdvancedEditPanel
                    onReplaceObject={(instruction) => {
                      setCustomInstruction(instruction);
                      submitEdit(instruction);
                    }}
                    onRemoveBlemish={() => {
                      const instruction = "Remove blemishes and imperfections while maintaining natural skin texture";
                      setCustomInstruction(instruction);
                      submitEdit(instruction);
                    }}
                    onSmoothBackground={() => {
                      const instruction = "Smooth and blur the background while keeping the subject sharp";
                      setCustomInstruction(instruction);
                      submitEdit(instruction);
                    }}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}
      </ToolDrawer>
      <ShareToCommunityDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        imageUrl={previewUrl}
        defaultCaption={customInstruction || initialInstruction}
        defaultTitle="Edited in Studio"
      />
      {previewUrl && (
        <ImageZoomDialog
          open={showZoom}
          onOpenChange={setShowZoom}
          imageUrl={previewUrl}
          title="Edit Preview - Full Resolution"
        />
      )}
    </>
  );
};

