import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { CheckCircle2, Copy, Edit3, Lightbulb, MessageSquare, Sparkles, Target, Wand2, Check, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useUnifiedModalStore } from "@/store/unifiedModalStore";
import { useUnifiedVisualContext } from "@/store/unifiedVisualContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AnalysisOverviewProps {
  analysis: {
    image_overview?: string;
    lighting?: string;
    color_palette?: string;
    composition?: string;
    camera_composition?: string;
    subject_description?: string;
    mood?: string;
    mood_emotion?: string;
    art_style?: string;
    design_style?: string;
    medium?: string;
    artistic_medium?: string;
  };
  fullPrompt?: string;
  imageUrl?: string;
  imageId?: string;
}

interface KeyInsight {
  icon: React.ElementType;
  title: string;
  content: string;
  category: 'strength' | 'improvement' | 'opportunity';
  color: string;
}

export const AnalysisOverview = ({ analysis, fullPrompt, imageUrl, imageId }: AnalysisOverviewProps): JSX.Element => {
  const [copied, setCopied] = useState(false);
  const [strengthsOpen, setStrengthsOpen] = useState(false);
  const [improvementsOpen, setImprovementsOpen] = useState(false);
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const navigate = useNavigate();
  
  const openModal = useUnifiedModalStore(state => state.openModal);
  const { setActiveImage, setPrompt, addOperation, addImageToMemory } = useUnifiedVisualContext.getState();

  const handleCopyPrompt = () => {
    if (fullPrompt) {
      navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenArtie = () => {
    if (imageUrl && imageId) {
      setActiveImage(imageUrl, imageId);
      setPrompt(fullPrompt || '');
      addOperation({ tool: 'studio', prompt: fullPrompt, imageUrl });
      addImageToMemory({
        url: imageUrl,
        name: 'Analysis Subject',
        source: 'studio',
        analysis: {
          style: analysis.art_style ? [analysis.art_style] : undefined,
          mood: analysis.mood,
          composition: analysis.composition,
          lighting: analysis.lighting,
        },
      });
    }
    navigate('/artie');
  };

  const handleGenerateVariations = () => {
    if (imageUrl && imageId) {
      setActiveImage(imageUrl, imageId);
      setPrompt(fullPrompt || '');
      addOperation({ tool: 'generate', prompt: fullPrompt, imageUrl, params: { mode: 'variation' } });
    }
    openModal('generate', { prompt: fullPrompt, referenceImage: imageUrl });
  };

  const handleEditImage = () => {
    if (!imageUrl) return;
    setActiveImage(imageUrl, imageId);
    setPrompt(fullPrompt || '');
    addOperation({ tool: 'edit', imageUrl, prompt: fullPrompt });
    openModal('edit', { imageUrl, instruction: 'Refine this design based on the analysis' });
  };

  // Extract structured insights
  const extractKeyInsights = (): KeyInsight[] => {
    const insights: KeyInsight[] = [];

    if (analysis.lighting) {
      const isGood = analysis.lighting.toLowerCase().includes('good') || 
                     analysis.lighting.toLowerCase().includes('balanced') ||
                     analysis.lighting.toLowerCase().includes('natural');
      insights.push({
        icon: isGood ? CheckCircle2 : AlertCircle,
        title: isGood ? 'Lighting' : 'Lighting needs attention',
        content: analysis.lighting,
        category: isGood ? 'strength' : 'improvement',
        color: isGood ? 'text-green-600' : 'text-amber-600'
      });
    }

    if (analysis.color_palette) {
      insights.push({
        icon: Sparkles,
        title: 'Color Palette',
        content: analysis.color_palette,
        category: 'strength',
        color: 'text-primary'
      });
    }

    const compositionData = analysis.composition || analysis.camera_composition;
    if (compositionData) {
      const isStrong = compositionData.toLowerCase().includes('balanced') ||
                      compositionData.toLowerCase().includes('centered') ||
                      compositionData.toLowerCase().includes('rule of thirds');
      insights.push({
        icon: isStrong ? CheckCircle2 : AlertCircle,
        title: isStrong ? 'Composition' : 'Composition opportunity',
        content: compositionData,
        category: isStrong ? 'strength' : 'improvement',
        color: isStrong ? 'text-green-600' : 'text-amber-600'
      });
    }

    if (analysis.subject_description) {
      insights.push({
        icon: Lightbulb,
        title: 'Creative Direction',
        content: analysis.subject_description,
        category: 'opportunity',
        color: 'text-blue-600'
      });
    }

    return insights;
  };

  const keyInsights = extractKeyInsights();

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      {/* Full Generation Prompt - PRIMARY */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-5 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold">Full Generation Prompt</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPrompt}
              className="shrink-0 h-8 w-8 p-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {fullPrompt || 'No generation prompt available'}
          </p>
        </Card>
      </motion.div>

      {/* Primary Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <Button
          onClick={handleOpenArtie}
          className="w-full justify-center gap-2 h-11"
          variant="default"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="truncate">Discuss with Artie</span>
        </Button>
        <Button
          onClick={handleGenerateVariations}
          className="w-full justify-center gap-2 h-11"
          variant="outline"
          disabled={!fullPrompt}
        >
          <Wand2 className="h-4 w-4" />
          <span className="truncate">Generate Variations</span>
        </Button>
        <Button
          onClick={handleEditImage}
          className="w-full justify-center gap-2 h-11"
          variant="outline"
          disabled={!imageUrl}
        >
          <Edit3 className="h-4 w-4" />
          <span className="truncate">Edit Image</span>
        </Button>
      </motion.div>

      {/* Key Attributes - Compact */}
      {(analysis.mood || analysis.art_style || analysis.design_style || analysis.lighting || analysis.medium || analysis.artistic_medium) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {analysis.mood && (
            <Card className="p-3 bg-card/50">
              <div className="text-xs text-muted-foreground mb-0.5">Mood</div>
              <div className="text-sm font-medium truncate">{analysis.mood}</div>
            </Card>
          )}
          {(analysis.art_style || analysis.design_style) && (
            <Card className="p-3 bg-card/50">
              <div className="text-xs text-muted-foreground mb-0.5">Style</div>
              <div className="text-sm font-medium truncate">{analysis.art_style || analysis.design_style}</div>
            </Card>
          )}
          {analysis.lighting && (
            <Card className="p-3 bg-card/50">
              <div className="text-xs text-muted-foreground mb-0.5">Lighting</div>
              <div className="text-sm font-medium truncate">{analysis.lighting}</div>
            </Card>
          )}
          {(analysis.medium || analysis.artistic_medium) && (
            <Card className="p-3 bg-card/50">
              <div className="text-xs text-muted-foreground mb-0.5">Medium</div>
              <div className="text-sm font-medium truncate">{analysis.medium || analysis.artistic_medium}</div>
            </Card>
          )}
        </motion.div>
      )}

      {/* What's Working - Collapsible */}
      {keyInsights.filter(i => i.category === 'strength').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Collapsible open={strengthsOpen} onOpenChange={setStrengthsOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold">What's Working</h3>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                    {keyInsights.filter(i => i.category === 'strength').length}
                  </Badge>
                </div>
                {strengthsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  {keyInsights.filter(i => i.category === 'strength').map((insight, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-emerald-600 shrink-0">•</span>
                      <span>{insight.content}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}

      {/* What to Improve - Collapsible */}
      {keyInsights.filter(i => i.category === 'improvement' || i.category === 'opportunity').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Collapsible open={improvementsOpen} onOpenChange={setImprovementsOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold">What to Improve</h3>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                    {keyInsights.filter(i => i.category === 'improvement' || i.category === 'opportunity').length}
                  </Badge>
                </div>
                {improvementsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  {keyInsights.filter(i => i.category === 'improvement' || i.category === 'opportunity').map((insight, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-amber-600 shrink-0">•</span>
                      <span>{insight.content}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}

      {/* Creative Blueprint - Collapsible */}
      {(analysis.composition || analysis.color_palette || analysis.image_overview) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Collapsible open={blueprintOpen} onOpenChange={setBlueprintOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Creative Blueprint</h3>
                </div>
                {blueprintOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {analysis.image_overview && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Overview</div>
                      <div className="text-sm">{analysis.image_overview}</div>
                    </div>
                  )}
                  {analysis.composition && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Composition</div>
                      <div className="text-sm">{analysis.composition}</div>
                    </div>
                  )}
                  {analysis.color_palette && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Color Palette</div>
                      <div className="text-sm">{analysis.color_palette}</div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}
    </div>
  );
};
