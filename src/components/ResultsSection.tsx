import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AnalysisResult, UserEdits, GeneratedImage } from "@/pages/Index";
import { Separator } from "@/components/ui/separator";
import { ImageGenerationDialog, GenerationOptions } from "@/components/ImageGenerationDialog";
import { GeneratedImagesGallery } from "@/components/GeneratedImagesGallery";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";

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
  const [userEdits, setUserEdits] = useState<UserEdits>({});
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);

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

  // Debounced save to local storage to prevent race conditions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('prompt_reconstructor_edits', JSON.stringify(userEdits));
      } catch (e) {
        console.error('Failed to save edits', e);
      }
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [userEdits]);

  const handleEditChange = (field: keyof UserEdits, value: string) => {
    setUserEdits(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(result.full_regeneration_prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleCopySection = (content: string, sectionName: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${sectionName} copied to clipboard!`);
  };

  const handleDownload = () => {
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
    
    toast.success("Analysis sheet downloaded!");
  };

  const handleRegenerate = () => {
    onRegenerate(userEdits);
  };

  const sections = [
    { 
      title: "1. Image Overview", 
      content: result.analysis.image_overview,
      key: "image_overview" as const
    },
    { 
      title: "2. Subject Description", 
      content: result.analysis.subject_description,
      key: "subject_description" as const,
      editFields: [
        { label: "Gender", key: "subject_gender" as keyof UserEdits },
        { label: "Ethnicity/Skin Tone", key: "subject_ethnicity" as keyof UserEdits }
      ]
    },
    { 
      title: "3. Camera & Composition", 
      content: result.analysis.camera_composition,
      key: "camera_composition" as const,
      editFields: [
        { label: "Camera Type", key: "camera_type" as keyof UserEdits }
      ]
    },
    { 
      title: "4. Lighting", 
      content: result.analysis.lighting,
      key: "lighting" as const,
      editFields: [
        { label: "Lighting Type", key: "lighting_type" as keyof UserEdits }
      ]
    },
    { 
      title: "5. Color Palette", 
      content: result.analysis.color_palette,
      key: "color_palette" as const,
      editFields: [
        { label: "Dominant Color 1", key: "dominant_color_1" as keyof UserEdits },
        { label: "Dominant Color 2", key: "dominant_color_2" as keyof UserEdits }
      ]
    },
    { 
      title: "6. Design Style", 
      content: result.analysis.design_style,
      key: "design_style" as const,
      editFields: [
        { label: "Art Style", key: "art_style" as keyof UserEdits }
      ]
    },
    { 
      title: "7. Texture & Material", 
      content: result.analysis.texture_material,
      key: "texture_material" as const
    },
    { 
      title: "8. Mood & Emotion", 
      content: result.analysis.mood_emotion,
      key: "mood_emotion" as const
    },
    { 
      title: "9. Background & Environment", 
      content: result.analysis.background_environment,
      key: "background_environment" as const,
      editFields: [
        { label: "Background Type", key: "background_type" as keyof UserEdits }
      ]
    },
    { 
      title: "10. Artistic Medium", 
      content: result.analysis.artistic_medium,
      key: "artistic_medium" as const
    },
    { 
      title: "11. Art Direction & Influence", 
      content: result.analysis.art_direction_influence,
      key: "art_direction_influence" as const
    },
    { 
      title: "12. Intended Use", 
      content: result.analysis.intended_use,
      key: "intended_use" as const,
      editFields: [
        { label: "Intended Platform", key: "intended_platform" as keyof UserEdits }
      ]
    },
  ];

  return (
    <section className="space-y-8 animate-fade-in">
      {/* Full Regeneration Prompt */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-semibold">Full Regeneration Prompt</h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyPrompt}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <Textarea
            value={result.full_regeneration_prompt}
            readOnly
            className="min-h-[150px] resize-none bg-background"
          />
        </div>
      </div>

      <Separator />

      {/* Comprehensive Analysis */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-semibold">Comprehensive Analysis</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowGenerationDialog(true)}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Image
              </Button>
              <CreditCostIndicator cost={3} action="image generation" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || Object.keys(userEdits).length === 0}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate with Edits
              </Button>
              <CreditCostIndicator cost={1} action="prompt refinement" />
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-lg p-6 shadow-subtle hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySection(section.content, section.title)}
                  className="shrink-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              
              <p className="text-muted-foreground leading-relaxed text-sm">
                {section.content}
              </p>

              {/* Editable Fields */}
              {section.editFields && section.editFields.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">Customize:</p>
                  {section.editFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {field.label}
                      </label>
                      <Input
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={userEdits[field.key] || ''}
                        onChange={(e) => handleEditChange(field.key, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generated Images Gallery */}
      {generatedImages.length > 0 && (
        <>
          <Separator />
          <GeneratedImagesGallery 
            images={generatedImages}
            onDelete={onDeleteImage}
          />
        </>
      )}

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        initialPrompt={result.full_regeneration_prompt}
        onGenerate={onGenerateImage}
      />
    </section>
  );
};
