import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, CheckCircle2, Lightbulb, TrendingUp, Sparkles, Wand2, Edit3, MessageSquare, Zap, Palette, Eye, Target } from "lucide-react";
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

  const moodData = analysis.mood || analysis.mood_emotion || '';
  const styleData = analysis.art_style || analysis.design_style || '';
  const mediumData = analysis.medium || analysis.artistic_medium || '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section - Compact and Premium */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 md:p-8 border border-border/50"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Badge variant="secondary" className="mb-2">
                <Eye className="w-3 h-3 mr-1" />
                Analysis Complete
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                Visual Analysis
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {analysis.image_overview || "Comprehensive analysis of visual elements, composition, and creative opportunities."}
              </p>
            </div>
          </div>
          
          {/* Premium Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <Button
              onClick={handleOpenArtie}
              variant="default"
              size="lg"
              className="group hover-scale transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <MessageSquare className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              <span className="font-medium">Discuss with Artie</span>
            </Button>
            <Button
              onClick={handleRegenerateStyle}
              variant="secondary"
              size="lg"
              disabled={!fullPrompt}
              className="group hover-scale transition-all duration-200"
            >
              <Wand2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              <span className="font-medium">Regenerate</span>
            </Button>
            <Button
              onClick={handleEditDesign}
              variant="outline"
              size="lg"
              disabled={!imageUrl}
              className="group hover-scale transition-all duration-200"
            >
              <Edit3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Edit Design</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Insights Grid - Compact Premium Design */}
      {keyInsights.filter(i => i.category === 'strength').length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">Strengths</h2>
            <Badge variant="secondary" className="ml-auto">
              {keyInsights.filter(i => i.category === 'strength').length}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {keyInsights.filter(i => i.category === 'strength').map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Card className="group p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/10 hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 hover-scale">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
                          {insight.title}
                        </h3>
                        <p className="text-sm text-foreground/80 leading-snug line-clamp-2">
                          {insight.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Improvements - Compact Design */}
      {keyInsights.some(i => i.category === 'improvement') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Areas to Improve</h2>
            <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-600 dark:text-amber-400">
              {keyInsights.filter(i => i.category === 'improvement').length}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {keyInsights.filter(i => i.category === 'improvement').map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                >
                  <Card className="group p-4 border border-amber-500/20 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/10 hover:shadow-md hover:border-amber-500/40 transition-all duration-200 hover-scale">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                          {insight.title}
                        </h3>
                        <p className="text-sm text-foreground/80 leading-snug line-clamp-2">
                          {insight.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Creative Opportunities - Premium Compact Cards */}
      {keyInsights.some(i => i.category === 'opportunity') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Creative Opportunities</h2>
            <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-600 dark:text-blue-400">
              {keyInsights.filter(i => i.category === 'opportunity').length}
            </Badge>
          </div>
          <div className="grid gap-3">
            {keyInsights.filter(i => i.category === 'opportunity').map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                >
                  <Card className="group p-4 border border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/10 hover:shadow-md hover:border-blue-500/40 transition-all duration-200 hover-scale">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
                          {insight.title}
                        </h3>
                        <p className="text-sm text-foreground/80 leading-snug line-clamp-2">
                          {insight.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Premium Stat Cards - Compact & Refined */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-semibold">Key Attributes</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Card className="p-4 bg-gradient-to-br from-violet-50/50 via-background to-background dark:from-violet-950/10 border-violet-500/20 hover:border-violet-500/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300 uppercase tracking-wider">Mood</p>
              </div>
              <p className="text-sm font-semibold truncate">{moodData || 'Balanced'}</p>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Card className="p-4 bg-gradient-to-br from-pink-50/50 via-background to-background dark:from-pink-950/10 border-pink-500/20 hover:border-pink-500/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-pink-500/10 flex items-center justify-center">
                  <Palette className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                </div>
                <p className="text-xs font-medium text-pink-700 dark:text-pink-300 uppercase tracking-wider">Style</p>
              </div>
              <p className="text-sm font-semibold truncate">{styleData || 'Modern'}</p>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Card className="p-4 bg-gradient-to-br from-orange-50/50 via-background to-background dark:from-orange-950/10 border-orange-500/20 hover:border-orange-500/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-orange-500/10 flex items-center justify-center">
                  <Eye className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wider">Lighting</p>
              </div>
              <p className="text-sm font-semibold truncate">{analysis.lighting?.split('.')[0] || 'Natural'}</p>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Card className="p-4 bg-gradient-to-br from-cyan-50/50 via-background to-background dark:from-cyan-950/10 border-cyan-500/20 hover:border-cyan-500/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <Wand2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Medium</p>
              </div>
              <p className="text-sm font-semibold truncate">{mediumData || 'Digital'}</p>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
