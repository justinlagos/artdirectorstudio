import { useState, useEffect } from "react";
import { ToolDrawer } from "@/components/ToolDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, MousePointer2, Palette, Wand2, AlertCircle } from "lucide-react";
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

const defaultAdjustments: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  warmth: 0,
  exposure: 0,
  sharpness: 0,
  vibrance: 100,
  shadows: 0,
  highlights: 0,
  clarity: 0,
};

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

  useEffect(() => {
    setPreviewUrl(imageUrl);
    setCustomInstruction(initialInstruction);
    setInstructionError(null);
    setSelectedRegion(null);
    setRegionInstruction("");
    setAdjustments(defaultAdjustments);
    setSelectedPreset("None");
  }, [imageUrl, initialInstruction]);

  // Clear region when switching away from Select tab
  useEffect(() => {
    if (activeTab !== "select" && selectedRegion) {
      setSelectedRegion(null);
      setRegionInstruction("");
    }
  }, [activeTab]);

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

  const generateFilterStyle = (adj: Adjustments) => {
    const filters = [
      `brightness(${adj.brightness}%)`,
      `contrast(${adj.contrast}%)`,
      `saturate(${adj.saturation}%)`,
      `hue-rotate(${adj.hue}deg)`,
      adj.warmth > 0 ? `sepia(${Math.abs(adj.warmth)}%)` : `saturate(${100 + adj.warmth}%)`,
      `brightness(${100 + adj.exposure}%)`,
    ];
    return filters.join(' ');
  };

  const generateInstruction = (): string => {
    // Priority: region instruction > custom instruction > adjustments
    if (selectedRegion && regionInstruction.trim()) {
      return regionInstruction.trim();
    }
    
    if (customInstruction.trim()) {
      return customInstruction.trim();
    }

    // Generate from adjustments
    const changes: string[] = [];
    
    if (adjustments.brightness !== 100) {
      const diff = adjustments.brightness - 100;
      if (Math.abs(diff) > 10) {
        changes.push(diff > 0 
          ? `increase brightness by ${Math.round(diff)}%`
          : `decrease brightness by ${Math.abs(Math.round(diff))}%`);
      }
    }
    
    if (adjustments.contrast !== 100) {
      const diff = adjustments.contrast - 100;
      if (Math.abs(diff) > 10) {
        changes.push(diff > 0 
          ? `increase contrast by ${Math.round(diff)}%`
          : `decrease contrast by ${Math.abs(Math.round(diff))}%`);
      }
    }
    
    if (adjustments.saturation !== 100) {
      const diff = adjustments.saturation - 100;
      if (Math.abs(diff) > 10) {
        changes.push(diff > 0 
          ? `make colors more vibrant by ${Math.round(diff)}%`
          : `reduce color saturation by ${Math.abs(Math.round(diff))}%`);
      }
    }

    if (Math.abs(adjustments.hue) > 5) {
      changes.push(`shift color hue by ${Math.round(adjustments.hue)} degrees`);
    }

    if (Math.abs(adjustments.warmth) > 10) {
      changes.push(adjustments.warmth > 0 
        ? `add warm tones (${Math.round(adjustments.warmth)}% warmer)`
        : `add cool tones (${Math.abs(Math.round(adjustments.warmth))}% cooler)`);
    }

    if (Math.abs(adjustments.exposure) > 10) {
      changes.push(adjustments.exposure > 0 
        ? `increase exposure by ${Math.round(adjustments.exposure)}%`
        : `decrease exposure by ${Math.abs(Math.round(adjustments.exposure))}%`);
    }

    if (adjustments.vibrance !== 100) {
      const diff = adjustments.vibrance - 100;
      if (Math.abs(diff) > 10) {
        changes.push(diff > 0 
          ? `increase vibrance by ${Math.round(diff)}%`
          : `decrease vibrance by ${Math.abs(Math.round(diff))}%`);
      }
    }

    if (Math.abs(adjustments.shadows) > 10) {
      changes.push(adjustments.shadows > 0 
        ? `lift shadows by ${Math.round(adjustments.shadows)}%`
        : `darken shadows by ${Math.abs(Math.round(adjustments.shadows))}%`);
    }

    if (Math.abs(adjustments.highlights) > 10) {
      changes.push(adjustments.highlights > 0 
        ? `brighten highlights by ${Math.round(adjustments.highlights)}%`
        : `reduce highlights by ${Math.abs(Math.round(adjustments.highlights))}%`);
    }

    if (Math.abs(adjustments.clarity) > 10) {
      changes.push(adjustments.clarity > 0 
        ? `increase clarity by ${Math.round(adjustments.clarity)}%`
        : `decrease clarity by ${Math.abs(Math.round(adjustments.clarity))}%`);
    }

    if (Math.abs(adjustments.sharpness) > 10) {
      changes.push(adjustments.sharpness > 0 
        ? `sharpen by ${Math.round(adjustments.sharpness)}%`
        : `soften by ${Math.abs(Math.round(adjustments.sharpness))}%`);
    }

    if (changes.length === 0) {
      return "";
    }

    return `Adjust the image to ${changes.join(', ')}. Maintain the overall composition and subject matter.`;
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
      if (!imageUrl) {
        throw new Error('No image provided');
      }

      // Build request body with all required fields
      const requestBody: {
        imageUrl: string;
        instruction: string;
        quality?: string;
        mask?: string;
        region?: { x: number; y: number; width: number; height: number };
      } = {
        imageUrl: imageUrl,
        instruction: trimmedInstruction,
        quality: 'high'
      };

      // Add optional mask if provided
      if (mask) {
        requestBody.mask = mask;
      }

      // Add optional region if provided (only when Select tab is active)
      if (selectedRegion && activeTab === "select") {
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
    // Priority: region instruction > custom instruction > auto-generated from adjustments
    let instruction = "";
    
    // If Select tab is active and region is selected, require region instruction
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
    
    // Include adjustments in the instruction if they were made
    const hasAdjustments = Object.entries(adjustments).some(([key, value]) => {
      const defaultVal = defaultAdjustments[key as keyof Adjustments];
      return value !== defaultVal;
    });
    
    // If user made adjustments but no instruction, ensure we use the generated instruction
    if (hasAdjustments && !customInstruction.trim() && !regionInstruction.trim()) {
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

  const canApply = () => {
    // Priority: region instruction > custom instruction > auto-generated from adjustments
    if (selectedRegion && regionInstruction.trim().length >= 3) return true;
    if (customInstruction.trim().length >= 3) return true;
    
    // Only allow auto-generated instruction if adjustments have been made
    const instruction = generateInstruction();
    return instruction.length >= 3;
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
    />
  );

  return (
    <ToolDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Edit Image
        </div>
      }
      description={isMobile ? "Make lighting, color and object-level edits." : "Adjust light, color and details. Use region tools for object changes and retouching. Changes are saved to My Projects."}
      footer={footerContent}
      stickyFooterOnMobile
      contentClassName={cn(
        "pb-0",
        isMobile ? "px-4 py-4" : "px-0 py-0"
      )}
      className="z-[65]"
    >
      {isMobile ? (
        // Mobile: Vertical stacked layout
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="w-full">
            <PreviewCanvas
              imageUrl={previewUrl}
              filterStyle={generateFilterStyle(adjustments)}
              selectedRegion={selectedRegion}
              onRegionSelect={activeTab === "select" ? setSelectedRegion : undefined}
              className="rounded-xl min-h-[250px] max-h-[40vh] w-full"
            />
          </div>

          {/* Instruction Input - Always visible */}
          <div className="space-y-2">
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
              <p className="text-sm text-destructive mt-1">{instructionError}</p>
            )}
          </div>

          {/* Tools Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="adjustments" className="text-xs">
                Adjustments
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

            <TabsContent value="adjustments" className="mt-4 max-h-[35vh] overflow-y-auto">
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

            <TabsContent value="select" className="mt-4">
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

            <TabsContent value="color" className="mt-4">
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

            <TabsContent value="advanced" className="mt-4">
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
          </Tabs>
        </div>
      ) : (
        // Desktop: Two-column layout
        <div className="flex gap-6 h-full max-h-[calc(90vh-180px)] px-6">
          {/* Left Column: Image Preview (60-65%) */}
          <div className="flex-1 min-w-0 flex items-center justify-center" style={{ flex: "0 0 60%" }}>
            <PreviewCanvas
              imageUrl={previewUrl}
              filterStyle={generateFilterStyle(adjustments)}
              selectedRegion={selectedRegion}
              onRegionSelect={activeTab === "select" ? setSelectedRegion : undefined}
              className="rounded-xl w-full h-full max-h-full object-contain"
            />
          </div>

          {/* Right Column: Controls (35-40%) */}
          <div className="flex-1 min-w-0 flex flex-col space-y-4 overflow-y-auto pr-2" style={{ flex: "0 0 40%", maxHeight: "100%" }}>
            {/* Instruction Input */}
            <div className="space-y-2 flex-shrink-0">
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
                <p className="text-sm text-destructive mt-1">{instructionError}</p>
              )}
            </div>

            {/* Tools Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-shrink-0">
              <TabsList className="grid w-full grid-cols-4 h-10">
                <TabsTrigger value="adjustments" className="text-sm">
                  Adjustments
                </TabsTrigger>
                <TabsTrigger value="select" className="text-sm">
                  <MousePointer2 className="h-3.5 w-3.5 mr-1.5" />
                  Select
                </TabsTrigger>
                <TabsTrigger value="color" className="text-sm">
                  <Palette className="h-3.5 w-3.5 mr-1.5" />
                  Color
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-sm">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="adjustments" className="mt-4">
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

              <TabsContent value="select" className="mt-4">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Click and drag on the image to select a rectangular region for editing. The selected area will be highlighted in blue.
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

              <TabsContent value="color" className="mt-4">
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

              <TabsContent value="advanced" className="mt-4">
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
            </Tabs>
          </div>
        </div>
      )}
    </ToolDrawer>
  );
};

