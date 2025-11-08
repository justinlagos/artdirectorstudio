import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisOverview } from "@/components/AnalysisOverview";
import { Analysis, UserEdits } from "@/pages/Index";
import { ChipSelector } from "@/components/ChipSelector";
import { Button } from "@/components/ui/button";
import { Copy, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface AnalysisTabbedProps {
  analysis: Analysis;
  userEdits: UserEdits;
  onEditChange: (field: keyof UserEdits, value: string) => void;
  adaptiveFields: {
    showHumanFields: boolean;
  };
  suggestions: Record<string, string[]>;
}

export const AnalysisTabbed = ({
  analysis,
  userEdits,
  onEditChange,
  adaptiveFields,
  suggestions
}: AnalysisTabbedProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  const handleCopySection = (content: string, sectionName: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${sectionName} copied!`);
  };

  // Details tab sections - essential creative details
  const detailsSections = [
    { 
      title: "Subject Description", 
      content: analysis.subject_description,
      key: "subject_description" as const,
      editFields: adaptiveFields.showHumanFields ? [
        { label: "Gender", key: "subject_gender" as keyof UserEdits, options: suggestions.subject_gender },
        { label: "Ethnicity/Skin Tone", key: "subject_ethnicity" as keyof UserEdits, options: suggestions.subject_ethnicity }
      ] : []
    },
    { 
      title: "Lighting", 
      content: analysis.lighting,
      key: "lighting" as const,
      editFields: [
        { label: "Lighting Type", key: "lighting_type" as keyof UserEdits, options: suggestions.lighting_type }
      ]
    },
    { 
      title: "Color Palette", 
      content: analysis.color_palette,
      key: "color_palette" as const,
      editFields: [
        { label: "Dominant Color 1", key: "dominant_color_1" as keyof UserEdits, options: suggestions.dominant_color_1 },
        { label: "Dominant Color 2", key: "dominant_color_2" as keyof UserEdits, options: suggestions.dominant_color_2 }
      ]
    },
    { 
      title: "Design Style", 
      content: analysis.design_style,
      key: "design_style" as const,
      editFields: [
        { label: "Art Style", key: "art_style" as keyof UserEdits, options: suggestions.art_style }
      ]
    },
    { 
      title: "Mood & Emotion", 
      content: analysis.mood_emotion,
      key: "mood_emotion" as const
    },
    { 
      title: "Background & Environment", 
      content: analysis.background_environment,
      key: "background_environment" as const,
      editFields: [
        { label: "Background Type", key: "background_type" as keyof UserEdits, options: suggestions.background_type }
      ]
    },
  ];

  // Technical tab sections - professional technical specs
  const technicalSections = [
    { 
      title: "Camera & Composition", 
      content: analysis.camera_composition,
      key: "camera_composition" as const,
      editFields: [
        { label: "Camera Type", key: "camera_type" as keyof UserEdits, options: suggestions.camera_type }
      ]
    },
    { 
      title: "Texture & Material", 
      content: analysis.texture_material,
      key: "texture_material" as const
    },
    { 
      title: "Artistic Medium", 
      content: analysis.artistic_medium,
      key: "artistic_medium" as const
    },
    { 
      title: "Art Direction & Influence", 
      content: analysis.art_direction_influence,
      key: "art_direction_influence" as const
    },
    { 
      title: "Intended Use", 
      content: analysis.intended_use,
      key: "intended_use" as const,
      editFields: [
        { label: "Intended Platform", key: "intended_platform" as keyof UserEdits, options: suggestions.intended_platform }
      ]
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
        <TabsTrigger 
          value="overview" 
          className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5"
        >
          <span className="hidden sm:inline">Overview</span>
          <span className="sm:hidden">Quick</span>
        </TabsTrigger>
        <TabsTrigger 
          value="details" 
          className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5"
        >
          Details
        </TabsTrigger>
        <TabsTrigger 
          value="technical" 
          className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5"
        >
          <span className="hidden sm:inline">Technical</span>
          <span className="sm:hidden">Tech</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-6 animate-fade-in">
        <AnalysisOverview analysis={analysis} />
      </TabsContent>

      {/* Details Tab */}
      <TabsContent value="details" className="mt-6 animate-fade-in">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Creative Details
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Essential visual and aesthetic attributes
              </p>
            </div>
            <Badge variant="outline">{detailsSections.length} Sections</Badge>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {detailsSections.map((section, index) => (
              <AccordionItem 
                key={section.key} 
                value={section.key}
                className="border border-border/50 rounded-lg px-4 bg-card hover:border-primary/30 transition-colors pointer-events-auto"
              >
                <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
                  <div className="flex items-center gap-3 text-left">
                    <Badge variant="secondary" className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-semibold text-sm">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {section.content}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopySection(section.content, section.title)}
                        className="shrink-0 h-8 w-8 p-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Editable Fields */}
                    {section.editFields && section.editFields.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Customize
                          </p>
                        </div>
                        {section.editFields.map((field) => (
                          <div key={field.key}>
                            <ChipSelector
                              label={field.label}
                              options={field.options}
                              value={userEdits[field.key] || ""}
                              onChange={(value) => onEditChange(field.key, value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </TabsContent>

      {/* Technical Tab */}
      <TabsContent value="technical" className="mt-6 animate-fade-in">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Technical Specifications
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Professional technical analysis and specifications
              </p>
            </div>
            <Badge variant="outline">{technicalSections.length} Sections</Badge>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {technicalSections.map((section, index) => (
              <AccordionItem 
                key={section.key} 
                value={section.key}
                className="border border-border/50 rounded-lg px-4 bg-card hover:border-primary/30 transition-colors pointer-events-auto"
              >
                <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
                  <div className="flex items-center gap-3 text-left">
                    <Badge variant="secondary" className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-semibold text-sm">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {section.content}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopySection(section.content, section.title)}
                        className="shrink-0 h-8 w-8 p-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Editable Fields */}
                    {section.editFields && section.editFields.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Customize
                          </p>
                        </div>
                        {section.editFields.map((field) => (
                          <div key={field.key}>
                            <ChipSelector
                              label={field.label}
                              options={field.options}
                              value={userEdits[field.key] || ""}
                              onChange={(value) => onEditChange(field.key, value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </TabsContent>
    </Tabs>
  );
};
