import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileJson, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AnalysisResult, UserEdits, GeneratedImage } from "@/pages/Index";
import { ImageGenerationDialog, GenerationOptions } from "@/components/ImageGenerationDialog";
import { GeneratedImagesGallery } from "@/components/GeneratedImagesGallery";
import { CompactSummary } from "./analysis/CompactSummary";
import { AnalysisGroup } from "./analysis/AnalysisGroup";
import { PillSelector } from "./analysis/PillSelector";
import { ColorSwatch } from "./analysis/ColorSwatch";
import { LivePreviewPanel } from "./analysis/LivePreviewPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from "jspdf";
import { Card } from "@/components/ui/card";

interface ResultsSectionProps {
  result: AnalysisResult;
  onRegenerate: (userEdits: UserEdits) => void;
  isRegenerating: boolean;
  onGenerateImage: (prompt: string, options: GenerationOptions) => Promise<string | null>;
  generatedImages: GeneratedImage[];
  onDeleteImage: (id: string) => void;
}

export const ResultsSection = ({ 
  result, 
  onRegenerate, 
  isRegenerating,
  onGenerateImage,
  generatedImages,
  onDeleteImage
}: ResultsSectionProps) => {
  const isMobile = useIsMobile();
  const [userEdits, setUserEdits] = useState<UserEdits>({});
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [livePreviewPrompt, setLivePreviewPrompt] = useState(result.full_regeneration_prompt);
  const [modifiedCount, setModifiedCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    subject: false,
    camera: false,
    color: false,
    background: false,
  });

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

  // Live preview with debounced regeneration (2s delay)
  useEffect(() => {
    if (Object.keys(userEdits).length === 0) {
      setLivePreviewPrompt(result.full_regeneration_prompt);
      setModifiedCount(0);
      return;
    }

    const count = Object.keys(userEdits).filter(key => userEdits[key as keyof UserEdits]).length;
    setModifiedCount(count);

    const timeoutId = setTimeout(() => {
      let preview = result.full_regeneration_prompt;
      
      Object.entries(userEdits).forEach(([key, value]) => {
        if (value) {
          const fieldNames: Record<string, string> = {
            subject_description: 'subject',
            design_style: 'style',
            lighting_type: 'lighting',
            color_palette: 'colors',
            camera_composition: 'camera',
            texture_material: 'texture',
            mood_emotion: 'mood',
            background_environment: 'background',
            artistic_medium: 'medium',
            art_direction_influence: 'art direction',
            intended_use: 'intended for'
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
  }, [userEdits, result.full_regeneration_prompt]);

  const handleEditChange = (field: string, value: string) => {
    setUserEdits(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(livePreviewPrompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleDownloadTxt = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const content = `AI IMAGE PROMPT RECONSTRUCTION SHEET
Generated: ${timestamp}

═══════════════════════════════════════════════════════════════

FULL REGENERATION PROMPT

${livePreviewPrompt}

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

USER EDITS:
${Object.keys(userEdits).length > 0 ? JSON.stringify(userEdits, null, 2) : 'None'}`;
    
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

  const handleDownloadJson = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const jsonData = {
      generated: timestamp,
      full_regeneration_prompt: livePreviewPrompt,
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

  const handleRegenerate = () => {
    onRegenerate(userEdits);
  };

  const handleResetEdits = () => {
    setUserEdits({});
    setModifiedCount(0);
    localStorage.removeItem('prompt_reconstructor_edits');
    toast.success("All changes reset");
  };

  const handleQuickChange = (field: string, value: string) => {
    handleEditChange(field, value);
  };

  const handleToggleGroup = (groupId: string) => {
    if (isMobile) {
      setOpenGroups((prev) => {
        const newState: Record<string, boolean> = {
          subject: false,
          camera: false,
          color: false,
          background: false,
        };
        newState[groupId] = !prev[groupId];
        return newState;
      });
    } else {
      setOpenGroups((prev) => ({
        ...prev,
        [groupId]: !prev[groupId],
      }));
    }
  };

  const getEditCountForGroup = (groupFields: string[]) => {
    return groupFields.filter((field) => userEdits[field as keyof UserEdits]).length;
  };

  const getSummaryValues = () => ({
    subject: userEdits.subject_description || result.analysis.subject_description || "Not set",
    style: userEdits.design_style || result.analysis.design_style || "Not set",
    lighting: userEdits.lighting_type || result.analysis.lighting || "Not set",
    colors: userEdits.color_palette || result.analysis.color_palette || "Not set",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`${isMobile ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}`}>
        {/* Main Content */}
        <div className={`${isMobile ? "" : "lg:col-span-2"} space-y-4`}>
          {/* Compact Summary */}
          <CompactSummary
            {...getSummaryValues()}
            onQuickChange={handleQuickChange}
          />

          {/* Full Prompt Preview */}
          <Card className="p-6 bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Full Regeneration Prompt
              </h2>
            </div>
            <div className="bg-surface-2/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {livePreviewPrompt}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
                <Download className="w-4 h-4 mr-2" />
                .txt
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadJson}>
                <FileJson className="w-4 h-4 mr-2" />
                .json
              </Button>
            </div>
          </Card>

          {/* Collapsible Groups */}
          <div className="space-y-3">
            {/* Group 1: Subject and Style */}
            <AnalysisGroup
              title="Subject and Style"
              icon="🎭"
              editCount={getEditCountForGroup([
                "subject_description",
                "design_style",
                "artistic_medium",
                "art_direction_influence",
              ])}
              isOpen={openGroups.subject}
              onToggle={() => handleToggleGroup("subject")}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Subject Description</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {result.analysis.subject_description}
                  </p>
                  <PillSelector
                    label="Quick tweaks"
                    value={userEdits.subject_description || ""}
                    options={["Softer expression", "More confident pose", "Natural smile", "Direct gaze", "Professional", "Casual"]}
                    onChange={(val) => handleEditChange("subject_description", val)}
                    emptyHint="Try adjusting the subject's expression or pose"
                    quickActions={["Add warmth", "More dynamic"]}
                  />
                </div>

                <PillSelector
                  label="Design Style"
                  value={userEdits.design_style || result.analysis.design_style || ""}
                  options={["Photorealistic", "Cinematic", "Minimalist", "Vintage", "Modern", "Editorial", "Fine Art"]}
                  onChange={(val) => handleEditChange("design_style", val)}
                />

                <PillSelector
                  label="Artistic Medium"
                  value={userEdits.artistic_medium || result.analysis.artistic_medium || ""}
                  options={["Photography", "Digital Art", "Oil Painting", "Watercolor", "Mixed Media", "3D Render"]}
                  onChange={(val) => handleEditChange("artistic_medium", val)}
                />

                <PillSelector
                  label="Art Direction & Influence"
                  value={userEdits.art_direction_influence || result.analysis.art_direction_influence || ""}
                  options={["Contemporary", "Classic", "Avant-garde", "Commercial", "Fine Art", "Editorial"]}
                  onChange={(val) => handleEditChange("art_direction_influence", val)}
                />
              </div>
            </AnalysisGroup>

            {/* Group 2: Camera and Lighting */}
            <AnalysisGroup
              title="Camera and Lighting"
              icon="📷"
              editCount={getEditCountForGroup(["camera_composition", "lighting_type"])}
              isOpen={openGroups.camera}
              onToggle={() => handleToggleGroup("camera")}
            >
              <div className="space-y-4">
                <PillSelector
                  label="Camera & Composition"
                  value={userEdits.camera_composition || result.analysis.camera_composition || ""}
                  options={["Close-up", "Medium shot", "Wide angle", "Portrait", "Landscape", "Macro", "Aerial"]}
                  onChange={(val) => handleEditChange("camera_composition", val)}
                />

                <PillSelector
                  label="Lighting Type"
                  value={userEdits.lighting_type || result.analysis.lighting || ""}
                  options={["Soft", "Hard", "Natural", "Studio", "Golden Hour", "Dramatic", "Backlit", "Rim light"]}
                  onChange={(val) => handleEditChange("lighting_type", val)}
                  emptyHint="Want softer light or more drama?"
                  quickActions={["Golden hour", "Studio softbox"]}
                />
              </div>
            </AnalysisGroup>

            {/* Group 3: Color and Material */}
            <AnalysisGroup
              title="Color and Material"
              icon="🎨"
              editCount={getEditCountForGroup(["color_palette", "texture_material"])}
              isOpen={openGroups.color}
              onToggle={() => handleToggleGroup("color")}
            >
              <div className="space-y-4">
                <ColorSwatch
                  label="Color Palette"
                  value={userEdits.color_palette || result.analysis.color_palette || ""}
                  onChange={(val) => handleEditChange("color_palette", val)}
                />

                <PillSelector
                  label="Texture & Material"
                  value={userEdits.texture_material || result.analysis.texture_material || ""}
                  options={["Smooth", "Rough", "Glossy", "Matte", "Metallic", "Fabric", "Wood", "Stone"]}
                  onChange={(val) => handleEditChange("texture_material", val)}
                />
              </div>
            </AnalysisGroup>

            {/* Group 4: Background and Mood */}
            <AnalysisGroup
              title="Background and Mood"
              icon="🌄"
              editCount={getEditCountForGroup([
                "background_environment",
                "mood_emotion",
                "image_overview",
                "intended_use",
              ])}
              isOpen={openGroups.background}
              onToggle={() => handleToggleGroup("background")}
            >
              <div className="space-y-4">
                <PillSelector
                  label="Background & Environment"
                  value={
                    userEdits.background_environment ||
                    result.analysis.background_environment ||
                    ""
                  }
                  options={["Studio", "Natural", "Urban", "Abstract", "Gradient", "Solid", "Textured"]}
                  onChange={(val) => handleEditChange("background_environment", val)}
                />

                <PillSelector
                  label="Mood & Emotion"
                  value={userEdits.mood_emotion || result.analysis.mood_emotion || ""}
                  options={["Calm", "Energetic", "Mysterious", "Joyful", "Dramatic", "Serene", "Bold"]}
                  onChange={(val) => handleEditChange("mood_emotion", val)}
                />

                <div>
                  <p className="text-sm font-medium mb-1">Image Overview</p>
                  <p className="text-sm text-muted-foreground">
                    {result.analysis.image_overview}
                  </p>
                </div>

                <PillSelector
                  label="Intended Use"
                  value={userEdits.intended_use || result.analysis.intended_use || ""}
                  options={["Commercial", "Editorial", "Social Media", "Print", "Web", "Advertising", "Portfolio"]}
                  onChange={(val) => handleEditChange("intended_use", val)}
                />
              </div>
            </AnalysisGroup>
          </div>

          {/* Generate Image Button - Mobile */}
          {isMobile && (
            <div className="pb-32">
              <Button onClick={() => setShowGenerationDialog(true)} size="lg" className="w-full">
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Image
              </Button>
            </div>
          )}
        </div>

        {/* Live Preview Panel - Desktop Only */}
        {!isMobile && (
          <div className="lg:col-span-1">
            <LivePreviewPanel
              prompt={livePreviewPrompt}
              changeCount={modifiedCount}
              isRegenerating={isRegenerating}
              onApply={handleRegenerate}
              onReset={handleResetEdits}
            />
            <Button
              onClick={() => setShowGenerationDialog(true)}
              size="lg"
              className="w-full mt-4"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Image
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Sticky Footer */}
      {isMobile && (
        <LivePreviewPanel
          prompt={livePreviewPrompt}
          changeCount={modifiedCount}
          isRegenerating={isRegenerating}
          onApply={handleRegenerate}
          onReset={handleResetEdits}
        />
      )}

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        initialPrompt={livePreviewPrompt}
        onGenerate={onGenerateImage}
      />

      {/* Generated Images Gallery */}
      {generatedImages.length > 0 && (
        <GeneratedImagesGallery
          images={generatedImages}
          onDelete={onDeleteImage}
        />
      )}
    </div>
  );
};
