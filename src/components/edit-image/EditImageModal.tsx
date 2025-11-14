import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, MousePointer2, Palette, Wand2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  }, [imageUrl, initialInstruction]);

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

    if (changes.length === 0) {
      return "";
    }

    return `Adjust the image to ${changes.join(', ')}. Maintain the overall composition and subject matter.`;
  };

  const submitEdit = async (instruction: string, mask?: string) => {
    // Validate instruction - must be present and at least 3 characters
    const trimmedInstruction = instruction?.trim() || "";
    
    if (!trimmedInstruction || trimmedInstruction.length < 3) {
      setInstructionError("Please describe what you want to change before applying edits. (At least 3 characters required)");
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

      // Add optional region if provided
      if (selectedRegion) {
        requestBody.region = selectedRegion;
      }

      console.log('[EDIT-IMAGE] Submitting edit request:', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        instructionLength: trimmedInstruction.length,
        hasMask: !!mask,
        hasRegion: !!selectedRegion
      });

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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to apply edits';
        
        console.error('[EDIT-IMAGE] Error response:', errorMessage);
        
        if (errorMessage.includes("instruction") || errorMessage.includes("required")) {
          setInstructionError("Please describe what you want to change before applying edits.");
        } else {
          setInstructionError(errorMessage);
        }
        toast.error(errorMessage);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.image) {
        setPreviewUrl(result.image);
        toast.success("Edits applied successfully!");
        onImageEdited?.(result.image);
      } else {
        throw new Error(result.error || 'No image returned from edit');
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
    
    if (selectedRegion && regionInstruction.trim().length >= 3) {
      instruction = regionInstruction.trim();
    } else if (customInstruction.trim().length >= 3) {
      instruction = customInstruction.trim();
    } else {
      instruction = generateInstruction();
    }
    
    if (instruction.length < 3) {
      setInstructionError("Please describe what you want to change before applying edits.");
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
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
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
      toast.error("Failed to download image");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header with proper spacing - 24px padding below title/subtitle */}
        <DialogHeader className="px-6 pt-6 pb-6 border-b border-border">
          <DialogTitle className="text-2xl font-semibold text-left flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Edit Image
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-left leading-relaxed">
            Adjust colors, lighting, and exposure. Use advanced tools for region editing, object replacement, and retouching.
          </DialogDescription>
        </DialogHeader>

        {/* Main Content - Two column grid with proper spacing */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Preview - Full height, responsive, rounded */}
            <div className="space-y-4">
              <PreviewCanvas
                imageUrl={previewUrl}
                filterStyle={generateFilterStyle(adjustments)}
                selectedRegion={selectedRegion}
                onRegionSelect={activeTab === "select" ? setSelectedRegion : undefined}
                className="min-h-[500px] lg:min-h-[600px] rounded-xl"
              />
            </div>

            {/* Right: Controls - Tab switcher, sliders, extra tools */}
            <div className="space-y-6">
              {/* Instruction Input */}
              <div className="space-y-2">
                <Label htmlFor="custom-instruction" className="text-sm font-medium">Editing Instruction</Label>
                <Textarea
                  id="custom-instruction"
                  placeholder="Describe what you want to change... (e.g., brighten the image, remove the background, change colors to blue)"
                  value={customInstruction}
                  onChange={(e) => {
                    setCustomInstruction(e.target.value);
                    setInstructionError(null);
                  }}
                  className="min-h-[100px] resize-none"
                />
                {instructionError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{instructionError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Tools Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-10">
                  <TabsTrigger value="adjustments" className="text-xs sm:text-sm">Adjustments</TabsTrigger>
                  <TabsTrigger value="select" className="text-xs sm:text-sm">
                    <MousePointer2 className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Select</span>
                  </TabsTrigger>
                  <TabsTrigger value="color" className="text-xs sm:text-sm">
                    <Palette className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Color</span>
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs sm:text-sm">
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Advanced</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="adjustments" className="mt-6">
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

                <TabsContent value="select" className="mt-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      Click and drag on the image to select a region for editing. You can also draw a freehand selection.
                    </div>
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

                <TabsContent value="color" className="mt-6">
                  <ColorPickerPanel
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                    onApply={(color) => {
                      let instruction = "";
                      if (selectedRegion) {
                        instruction = `Change the color of the selected region to ${color}`;
                      } else if (customInstruction.trim()) {
                        instruction = `${customInstruction.trim()}. Change the color to ${color}`;
                      } else {
                        instruction = `Change the color of the main object to ${color}`;
                      }
                      setCustomInstruction(instruction);
                      // Auto-submit if we have a valid instruction
                      if (instruction.trim().length >= 3) {
                        submitEdit(instruction);
                      } else {
                        setInstructionError("Please describe which object to recolor or select a region first.");
                      }
                    }}
                  />
                </TabsContent>

                <TabsContent value="advanced" className="mt-6">
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
        </div>

        {/* Footer Actions - Sticky bottom bar with consistent spacing */}
        <FooterActions
          onReset={handleReset}
          onDownload={handleDownload}
          onApply={handleApply}
          isProcessing={isProcessing}
          canApply={canApply()}
        />
      </DialogContent>
    </Dialog>
  );
};

