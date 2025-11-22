import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, Blend, CheckCircle2, Copy, Edit3, Eye, Lightbulb, MessageSquare, Palette, Sparkles, Target, TrendingUp, UploadCloud, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedModalStore } from "@/store/unifiedModalStore";
import { useUnifiedVisualContext } from "@/store/unifiedVisualContext";
import { motion } from "framer-motion";

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
  // FIX: Use direct selector instead of creating new object on every render
  const openModal = useUnifiedModalStore(state => state.openModal);
  const { setActiveImage, setPrompt, addOperation } = useUnifiedVisualContext.getState();

  const handleOpenArtie = () => {
    if (imageUrl) {
      setActiveImage(imageUrl, imageId);
    }
    if (fullPrompt) {
      setPrompt(fullPrompt);
    }
    addOperation({
      tool: 'artie',
      prompt: fullPrompt,
      imageUrl: imageUrl,
    });
    openModal('artie', {
      initialMessage: `Give me feedback on this design`,
      contextImages: imageUrl ? [imageUrl] : undefined,
    });
  };

  const handleRegenerateStyle = () => {
    if (imageUrl) {
      setActiveImage(imageUrl, imageId);
    }
    if (fullPrompt) {
      setPrompt(fullPrompt);
    }
    addOperation({
      tool: 'generate',
      prompt: fullPrompt,
      imageUrl: imageUrl,
    });
    openModal('generate', {
      prompt: fullPrompt,
      referenceImage: imageUrl,
    });
  };

  const handleGenerateVariations = () => {
    if (imageUrl) {
      setActiveImage(imageUrl, imageId);
    }
    if (fullPrompt) {
      setPrompt(fullPrompt);
    }
    addOperation({
      tool: 'generate',
      prompt: fullPrompt,
      imageUrl: imageUrl,
      params: { mode: 'variation' },
    });
    openModal('generate', {
      prompt: fullPrompt,
      referenceImage: imageUrl,
    });
  };

  const handleEditDesign = () => {
    if (!imageUrl) return;
    
    setActiveImage(imageUrl, imageId);
    if (fullPrompt) {
      setPrompt(fullPrompt);
    }
    addOperation({
      tool: 'edit',
      imageUrl: imageUrl,
      prompt: fullPrompt,
    });
    openModal('edit', {
      imageUrl: imageUrl,
      instruction: 'Refine this design based on the analysis',
    });
  };

  const handleUpscale = () => {
    if (!imageUrl) return;
    setActiveImage(imageUrl, imageId);
    addOperation({ tool: 'upscale', imageUrl });
    openModal('upscale', { imageUrl });
  };

  const handleBlend = () => {
    if (!imageUrl) return;
    setActiveImage(imageUrl, imageId);
    addOperation({ tool: 'blend', imageUrl });
    openModal('blend', { images: [imageUrl] });
  };

  const handlePostToCommunity = () => {
    openModal('artie', {
      initialMessage: 'Draft a short community post for this visual and include tags.',
      contextImages: imageUrl ? [imageUrl] : undefined,
    });
  };
  
  // Extract structured insights with creative director tonality
  const extractKeyInsights = (): KeyInsight[] => {
    const insights: KeyInsight[] = [];

    // Analyze lighting (strength or improvement)
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

    // Analyze color (always a creative opportunity)
    if (analysis.color_palette) {
      insights.push({
        icon: Sparkles,
        title: 'Color Palette',
        content: analysis.color_palette,
        category: 'strength',
        color: 'text-primary'
      });
    }

    // Analyze composition (strength or improvement)
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

    // Creative opportunities
    if (analysis.subject_description) {
      insights.push({
        icon: Lightbulb,
        title: 'Creative Direction',
        content: analysis.subject_description,
        category: 'opportunity',
        color: 'text-blue-600'
      });
    }

    return insights.slice(0, 4); // Top 4 insights
  };

  const keyInsights = extractKeyInsights();

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 md:p-7 border border-border/50"
      >
        <div className="absolute top-0 right-0 w-52 h-52 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Visual Summary
            </Badge>
            <span className="text-xs text-muted-foreground">Artie captured</span>
          </div>
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed max-w-3xl">
            {analysis.image_overview || 'Artie is reviewing composition, palette, and focal balance to summarize the shot.'}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border/70 bg-background/80 shadow-sm"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold">Primary Actions</h2>
              <p className="text-sm text-muted-foreground">Quick follow-ups designed for thumb reach.</p>
            </div>
            <Badge variant="outline" className="text-xs">Live studio</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={handleOpenArtie}
              size="lg"
              className="w-full justify-between sm:justify-center gap-3 bg-primary text-primary-foreground"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Discuss with Artie
              </span>
              <span className="text-xs opacity-75">Live</span>
            </Button>
            <Button
              onClick={handleGenerateVariations}
              variant="secondary"
              size="lg"
              disabled={!fullPrompt}
              className="w-full justify-between sm:justify-center gap-3"
            >
              <Wand2 className="w-4 h-4" />
              Generate Variations
            </Button>
            <Button
              onClick={handleEditDesign}
              variant="outline"
              size="lg"
              disabled={!imageUrl}
              className="w-full justify-between sm:justify-center gap-3"
            >
              <Edit3 className="w-4 h-4" />
              Edit Image
            </Button>
          </div>
        </div>
      </motion.div>

      {keyInsights.filter(i => i.category === 'strength').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">What’s Working</h2>
            <Badge variant="secondary" className="ml-auto">
              {Math.min(keyInsights.filter(i => i.category === 'strength').length, 5)} strengths
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {keyInsights
              .filter(i => i.category === 'strength')
              .slice(0, 5)
              .map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <Card key={idx} className="p-4 border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-tight">{insight.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </motion.div>
      )}

      {(keyInsights.some(i => i.category === 'improvement') || keyInsights.some(i => i.category === 'opportunity')) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">What to Improve</h2>
            <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-600 dark:text-amber-400">
              Creative Director notes
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[...keyInsights.filter(i => i.category === 'improvement'), ...keyInsights.filter(i => i.category === 'opportunity')]
              .slice(0, 5)
              .map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <Card key={idx} className="p-4 border border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/10">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                        <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-tight">{insight.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/70 bg-background/70 shadow-sm"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Creative Blueprint</h2>
          </div>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-foreground/90 leading-relaxed">
            {fullPrompt || 'No generation prompt found.'}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fullPrompt && navigator.clipboard.writeText(fullPrompt)}
              disabled={!fullPrompt}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy prompt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerateStyle}
              disabled={!fullPrompt}
              className="gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Reuse in Studio
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <Card className="p-5 space-y-3 h-full border-border/70 bg-background/80">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Blend className="w-4 h-4 text-primary" />
            Blend
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">Mix this visual with another reference to explore new directions.</p>
          <Button variant="secondary" size="sm" onClick={handleBlend} disabled={!imageUrl} className="justify-start">Start blend</Button>
        </Card>
        <Card className="p-5 space-y-3 h-full border-border/70 bg-background/80">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="w-4 h-4 text-primary" />
            Upscale
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">Sharpen edges and increase fidelity before exporting.</p>
          <Button variant="secondary" size="sm" onClick={handleUpscale} disabled={!imageUrl} className="justify-start">Open upscale</Button>
        </Card>
        <Card className="p-5 space-y-3 h-full border-border/70 bg-background/80">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UploadCloud className="w-4 h-4 text-primary" />
            Post to Community
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">Share this take, gather quick feedback, and iterate live.</p>
          <Button variant="outline" size="sm" onClick={handlePostToCommunity} className="justify-start">Draft post</Button>
        </Card>
      </motion.div>
    </div>
  );
};
