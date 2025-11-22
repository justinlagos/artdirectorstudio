import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { CheckCircle2, Edit3, Lightbulb, MessageSquare, Sparkles, Target, Wand2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useUnifiedVisualContext } from "@/store/unifiedVisualContext";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";
import { useVisualContextStore } from "@/store/visualContextStore";
import { ImageEditor } from "@/components/ImageEditor";
import { addImageToMemory as addImageToArtieMemory } from "@/lib/artie/imageMemory";

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
  const [strengthsOpen, setStrengthsOpen] = useState(false);
  const [improvementsOpen, setImprovementsOpen] = useState(false);
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();

  const { setActiveImage, setPrompt, addOperation, addImageToMemory } = useUnifiedVisualContext.getState();
  const openGenerateModal = useModalStore((state) => state.openGenerateModal);
  const setStudioPrompt = useStudioStore((state) => state.setPrompt);
  const setStudioImage = useStudioStore((state) => state.setImage);
  const updateVisualPrompt = useVisualContextStore((state) => state.updatePrompt);
  const updateVisualImage = useVisualContextStore((state) => state.updateImage);

  const welcomeMessage = useMemo(() => "Hi! I'm Artie — Your Creative Collaborator.\n\nI can help you brainstorm ideas, refine visual concepts, analyze images, or guide you through any creative challenge. You can also upload images or creative briefs for me to review, and I can create variations of your images.\n\nWhat are we working on today?", []);

  const seedArtieConversation = (messageId: string) => {
    if (typeof window === 'undefined' || !imageUrl) return;

    try {
      const existing = sessionStorage.getItem('artie-conversation');
      const parsed = existing ? JSON.parse(existing) : [];
      const messages = Array.isArray(parsed) ? parsed : [];

      if (messages.length === 0) {
        messages.push({
          id: '1',
          text: welcomeMessage,
          sender: 'artie',
          timestamp: new Date().toISOString(),
        });
      }

      const alreadyAttached = messages.some((m: any) => m.attachment?.url === imageUrl);
      if (!alreadyAttached) {
        messages.push({
          id: messageId,
          text: fullPrompt ? 'Bringing the latest analysis image and prompt context into our chat.' : "Let's continue working from this image.",
          sender: 'user',
          timestamp: new Date().toISOString(),
          attachment: {
            type: 'image',
            url: imageUrl,
            name: 'Current analysis image',
          },
        });
      }

      sessionStorage.setItem('artie-conversation', JSON.stringify(messages));

      const contextRaw = sessionStorage.getItem('artie-context-memory');
      const contextParsed = contextRaw ? JSON.parse(contextRaw) : {};
      const context = {
        images: Array.isArray(contextParsed.images) ? contextParsed.images : [],
        documents: Array.isArray(contextParsed.documents) ? contextParsed.documents : [],
        briefSummary: typeof contextParsed.briefSummary === 'string' ? contextParsed.briefSummary : undefined,
      };

      const hasContextImage = context.images?.some((img: any) => img.url === imageUrl);
      if (!hasContextImage) {
        context.images = [
          ...context.images,
          {
            url: imageUrl,
            messageId,
            name: 'Analysis reference',
            source: 'user',
            timestamp: new Date().toISOString(),
          },
        ];
        sessionStorage.setItem('artie-context-memory', JSON.stringify(context));
      }
    } catch (error) {
      console.error('[AnalysisOverview] Failed to seed Artie conversation context', error);
    }
  };

  const handleOpenArtie = () => {
    if (imageUrl) {
      const messageId = crypto.randomUUID?.() || `img-${Date.now()}`;
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
      seedArtieConversation(messageId);
      addImageToArtieMemory({
        url: imageUrl,
        type: 'uploaded',
        source: 'user',
        name: 'Analysis image',
        messageId,
      });
    }

    navigate('/artie');
  };

  const handleGenerateVariations = () => {
    if (!fullPrompt) {
      toast.error('No generation prompt available yet.');
      return;
    }

    if (imageUrl) {
      setActiveImage(imageUrl, imageId);
      setPrompt(fullPrompt);
      setStudioImage(imageUrl);
      updateVisualImage(imageUrl, imageId);
    }

    setStudioPrompt(fullPrompt);
    updateVisualPrompt(fullPrompt);
    addOperation({ tool: 'generate', prompt: fullPrompt, imageUrl, params: { mode: 'variation' } });
    openGenerateModal();
  };

  const handleEditImage = () => {
    if (!imageUrl) {
      toast.error('Upload or analyze an image before editing.');
      return;
    }

    setActiveImage(imageUrl, imageId);
    setPrompt(fullPrompt || '');
    updateVisualImage(imageUrl, imageId);
    updateVisualPrompt(fullPrompt || analysis.image_overview || '');
    addOperation({ tool: 'edit', imageUrl, prompt: fullPrompt });
    setEditOpen(true);
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
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="space-y-1 text-left">
              <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/80">Collaboration</p>
              <h2 className="text-xl font-semibold text-foreground">Keep iterating with your analysis</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Send the latest reference image and prompt context into the tools you need next.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:min-w-[360px] sm:grid-cols-3">
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
            </div>
          </div>
        </Card>
      </motion.div>

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
                <div className="px-4 pb-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {analysis.image_overview && (
                      <Card className="p-3 bg-card/50 h-full">
                        <div className="text-xs text-muted-foreground mb-1">Overview</div>
                        <p className="text-sm leading-relaxed text-foreground/90">{analysis.image_overview}</p>
                      </Card>
                    )}
                    {analysis.composition && (
                      <Card className="p-3 bg-card/50 h-full">
                        <div className="text-xs text-muted-foreground mb-1">Composition</div>
                        <p className="text-sm leading-relaxed text-foreground/90">{analysis.composition}</p>
                      </Card>
                    )}
                    {analysis.color_palette && (
                      <Card className="p-3 bg-card/50 h-full">
                        <div className="text-xs text-muted-foreground mb-1">Color Palette</div>
                        <p className="text-sm leading-relaxed text-foreground/90">{analysis.color_palette}</p>
                      </Card>
                    )}
                  </div>

                  {(analysis.art_style || analysis.design_style || analysis.lighting || analysis.artistic_medium) && (
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px] uppercase tracking-[0.25em]">Overview</Badge>
                          <span className="text-sm font-semibold text-foreground">Style, Lighting & Medium</span>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(analysis.art_style || analysis.design_style) && (
                          <Card className="p-3 bg-background/70 h-full">
                            <div className="text-xs text-muted-foreground mb-1">Style</div>
                            <p className="text-sm font-medium text-foreground/90 leading-relaxed">{analysis.art_style || analysis.design_style}</p>
                          </Card>
                        )}
                        {analysis.lighting && (
                          <Card className="p-3 bg-background/70 h-full">
                            <div className="text-xs text-muted-foreground mb-1">Lighting</div>
                            <p className="text-sm font-medium text-foreground/90 leading-relaxed">{analysis.lighting}</p>
                          </Card>
                        )}
                        {(analysis.medium || analysis.artistic_medium) && (
                          <Card className="p-3 bg-background/70 h-full">
                            <div className="text-xs text-muted-foreground mb-1">Medium</div>
                            <p className="text-sm font-medium text-foreground/90 leading-relaxed">{analysis.medium || analysis.artistic_medium}</p>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}

      <ImageEditor
        open={editOpen && !!imageUrl}
        onOpenChange={setEditOpen}
        imageUrl={imageUrl || ""}
        initialInstruction={fullPrompt || analysis.image_overview || ""}
      />
    </div>
  );
};
