import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCw, Wand2, FileJson, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { AnalysisResult, UserEdits, GeneratedImage } from "@/pages/Index";
import { Separator } from "@/components/ui/separator";
import { ImageGenerationDialog, GenerationOptions } from "@/components/ImageGenerationDialog";
import { GeneratedImagesGallery } from "@/components/GeneratedImagesGallery";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { AnalysisSelect } from "@/components/AnalysisSelect";
import jsPDF from "jspdf";

interface ResultsSectionProps {
  result: AnalysisResult;
  onRegenerate: (userEdits: UserEdits) => void;
  isRegenerating: boolean;
  onGenerateImage: (prompt: string, options: GenerationOptions) => Promise<string | null>;
  generatedImages: GeneratedImage[];
  onDeleteImage: (id: string) => void;
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
        { label: "Gender", key: "subject_gender" as keyof UserEdits, options: SUGGESTIONS.subject_gender, helpText: "Specify the gender presentation of the subject" },
        { label: "Ethnicity/Skin Tone", key: "subject_ethnicity" as keyof UserEdits, options: SUGGESTIONS.subject_ethnicity, helpText: "Define the subject's ethnicity or skin tone" }
      ]
    },
    { 
      title: "3. Camera & Composition", 
      content: result.analysis.camera_composition,
      key: "camera_composition" as const,
      editFields: [
        { label: "Camera Type", key: "camera_type" as keyof UserEdits, options: SUGGESTIONS.camera_type, helpText: "Choose the camera type that defines the look and feel" }
      ]
    },
    { 
      title: "4. Lighting", 
      content: result.analysis.lighting,
      key: "lighting" as const,
      editFields: [
        { label: "Lighting Type", key: "lighting_type" as keyof UserEdits, options: SUGGESTIONS.lighting_type, helpText: "Select the dominant light source and direction" }
      ]
    },
    { 
      title: "5. Color Palette", 
      content: result.analysis.color_palette,
      key: "color_palette" as const,
      editFields: [
        { label: "Dominant Color 1", key: "dominant_color_1" as keyof UserEdits, options: SUGGESTIONS.dominant_color_1, helpText: "Primary color that defines the image mood" },
        { label: "Dominant Color 2", key: "dominant_color_2" as keyof UserEdits, options: SUGGESTIONS.dominant_color_2, helpText: "Secondary accent color for color harmony" }
      ]
    },
    { 
      title: "6. Design Style", 
      content: result.analysis.design_style,
      key: "design_style" as const,
      editFields: [
        { label: "Art Style", key: "art_style" as keyof UserEdits, options: SUGGESTIONS.art_style, helpText: "Visual aesthetic and artistic direction" }
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
        { label: "Background Type", key: "background_type" as keyof UserEdits, options: SUGGESTIONS.background_type, helpText: "Environment or backdrop behind the subject" }
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
        { label: "Intended Platform", key: "intended_platform" as keyof UserEdits, options: SUGGESTIONS.intended_platform, helpText: "Where this image will be published" }
      ]
    },
  ];

  return (
    <section className="space-y-12 animate-fade-in">
      {/* Full Regeneration Prompt */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-3xl font-display font-bold tracking-tight">
            Full Regeneration Prompt
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyPrompt}
              className="shadow-xs"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadTxt}
              className="shadow-xs"
            >
              <Download className="w-4 h-4 mr-2" />
              TXT
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPdf}
              className="shadow-xs"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadJson}
              className="shadow-xs"
            >
              <FileJson className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-surface-1 rounded-2xl p-8 shadow-subtle ring-1 ring-border/50 hover:shadow-medium hover:ring-border transition-all duration-300">
            <Textarea
              value={result.full_regeneration_prompt}
              readOnly
              className="min-h-[180px] resize-none bg-transparent border-0 focus-visible:ring-0 text-base leading-relaxed"
            />
          </div>
        </div>
      </div>

      <Separator className="my-12" />

      {/* Comprehensive Analysis */}
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold tracking-tight">
              Comprehensive Analysis
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tweak parameters below to regenerate with custom settings
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowGenerationDialog(true)}
                className="shadow-sm"
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
                className="shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <CreditCostIndicator cost={1} action="prompt refinement" />
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="group relative bg-surface-1 rounded-xl p-6 shadow-xs ring-1 ring-border/30 hover:shadow-medium hover:ring-border/60 transition-all duration-300 space-y-4"
            >
              {/* Subtle gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground leading-tight">
                  {section.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySection(section.content, section.title)}
                  className="shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              <p className="relative text-muted-foreground leading-relaxed text-sm">
                {section.content}
              </p>

              {/* Editable Fields */}
              {section.editFields && section.editFields.length > 0 && (
                <div className="relative space-y-3 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Customize
                    </p>
                  </div>
                  {section.editFields.map((field) => (
                    <AnalysisSelect
                      key={field.key}
                      label={field.label}
                      value={userEdits[field.key] || ''}
                      onChange={(value) => handleEditChange(field.key, value)}
                      options={field.options}
                      placeholder={`Select ${field.label.toLowerCase()}...`}
                      helpText={field.helpText}
                    />
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
          <Separator className="my-12" />
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