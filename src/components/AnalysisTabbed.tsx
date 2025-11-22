import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisOverview } from "@/components/AnalysisOverview";
import { Analysis, UserEdits } from "@/pages/Index";
import { ChipSelector } from "@/components/ChipSelector";
import { Button } from "@/components/ui/button";
import { Copy, Edit2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
      <TabsList className="grid w-full grid-cols-3 h-12 p-1.5 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
        <TabsTrigger 
          value="overview" 
          className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium"
        >
          <span className="hidden sm:inline">Overview</span>
          <span className="sm:hidden">Quick</span>
        </TabsTrigger>
        <TabsTrigger 
          value="details" 
          className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium"
        >
          Details
        </TabsTrigger>
        <TabsTrigger 
          value="technical" 
          className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium"
        >
          <span className="hidden sm:inline">Technical</span>
          <span className="sm:hidden">Tech</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnalysisOverview analysis={analysis} />
        </motion.div>
      </TabsContent>

      {/* Details Tab */}
      <TabsContent value="details" className="mt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-border/50">
            <div>
              <h3 className="text-sm font-semibold">
                Creative Details
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Essential visual and aesthetic attributes
              </p>
            </div>
            <Badge variant="secondary" className="shadow-sm">{detailsSections.length}</Badge>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {detailsSections.map((section, index) => (
              <AccordionItem 
                key={section.key} 
                value={section.key}
                className="border border-border/40 rounded-xl px-5 bg-card/50 backdrop-blur-sm hover:border-border/60 transition-colors"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-sm">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="space-y-4 pt-3">
                    <div className="flex items-start justify-between gap-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-foreground/90 leading-relaxed flex-1">
                        {section.content}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopySection(section.content, section.title)}
                        className="shrink-0 h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Editable Fields */}
                    {section.editFields && section.editFields.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-2 px-1">
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
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
        </motion.div>
      </TabsContent>

      {/* Technical Tab */}
      <TabsContent value="technical" className="mt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-primary/5 rounded-xl border border-border/50">
            <div>
              <h3 className="text-sm font-semibold">
                Technical Specifications
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Professional technical analysis and specifications
              </p>
            </div>
            <Badge variant="secondary" className="shadow-sm">{technicalSections.length}</Badge>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {technicalSections.map((section, index) => (
              <AccordionItem 
                key={section.key} 
                value={section.key}
                className="border border-border/40 rounded-xl px-5 bg-card/50 backdrop-blur-sm hover:border-border/60 transition-colors"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent-foreground">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-sm">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="space-y-4 pt-3">
                    <div className="flex items-start justify-between gap-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-foreground/90 leading-relaxed flex-1">
                        {section.content}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopySection(section.content, section.title)}
                        className="shrink-0 h-8 w-8 p-0 hover:bg-accent/10 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Editable Fields */}
                    {section.editFields && section.editFields.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-2 px-1">
                          <Edit2 className="w-3.5 h-3.5 text-accent" />
                          <p className="text-xs font-semibold text-accent uppercase tracking-wider">
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
        </motion.div>
      </TabsContent>
    </Tabs>
  );
};
