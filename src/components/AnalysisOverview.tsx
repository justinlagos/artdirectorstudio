import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, CheckCircle2, Lightbulb, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface KeyInsight {
  icon: React.ElementType;
  title: string;
  content: string;
  category: 'strength' | 'improvement' | 'opportunity';
  color: string;
}

export const AnalysisOverview = ({ analysis }: AnalysisOverviewProps): JSX.Element => {
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
    <div className="space-y-8 animate-fade-in">
      {/* H1: High-level summary */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analysis Summary</h1>
        <p className="text-base md:text-lg leading-relaxed text-foreground/90">
          {analysis.image_overview || "A comprehensive analysis of your image's visual elements, composition, and creative opportunities."}
        </p>
      </div>

      {/* H2: Key Insights Grid */}
      {keyInsights.filter(i => i.category === 'strength').length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">What's Working</h2>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Strengths
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {keyInsights.filter(i => i.category === 'strength').map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <Card key={idx} className="p-5 border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
                  <div className="flex gap-4">
                    <div className={cn("flex-shrink-0 mt-1", insight.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">{insight.title}</h3>
                      <p className="text-sm leading-relaxed">{insight.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* H2: Improvements */}
      {keyInsights.some(i => i.category === 'improvement') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">What to Fix</h2>
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" />
              Improvements
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {keyInsights.filter(i => i.category === 'improvement').map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <Card key={idx} className="p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
                  <div className="flex gap-4">
                    <div className={cn("flex-shrink-0 mt-1", insight.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">{insight.title}</h3>
                      <p className="text-sm leading-relaxed">{insight.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* H2: Creative Opportunities */}
      {keyInsights.some(i => i.category === 'opportunity') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Creative Opportunities</h2>
            <Badge variant="outline" className="gap-1 border-blue-500 text-blue-700 dark:text-blue-400">
              <Lightbulb className="h-3 w-3" />
              Ideas
            </Badge>
          </div>
          <div className="space-y-3">
            {keyInsights.filter(i => i.category === 'opportunity').map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <Card key={idx} className="p-5 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
                  <div className="flex gap-4">
                    <div className={cn("flex-shrink-0 mt-1", insight.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">{insight.title}</h3>
                      <p className="text-sm leading-relaxed">{insight.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Mood</p>
            <p className="font-semibold">{moodData || 'Balanced'}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Style</p>
            <p className="font-semibold">{styleData || 'Modern'}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Lighting</p>
            <p className="font-semibold truncate">{analysis.lighting?.split('.')[0] || 'Natural'}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Medium</p>
            <p className="font-semibold">{mediumData || 'Digital'}</p>
          </Card>
        </div>
      </div>

      {/* H3: Next Steps - Interactive Questions */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Next Steps</h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Use the Details and Technical tabs to explore deeper insights, or take action with the buttons below.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Similar
            </Button>
            <Button variant="outline" size="sm">
              Edit This Design
            </Button>
            <Button variant="outline" size="sm">
              Ask Artie for Feedback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
