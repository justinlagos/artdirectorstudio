import { Analysis } from "@/pages/Index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, Palette, Camera, Lightbulb } from "lucide-react";

interface AnalysisOverviewProps {
  analysis: Analysis;
}

interface KeyInsight {
  icon: React.ElementType;
  title: string;
  content: string;
  category: string;
  color: string;
}

export const AnalysisOverview = ({ analysis }: AnalysisOverviewProps) => {
  // Extract and prioritize the most important insights using AI logic
  const extractKeyInsights = (): KeyInsight[] => {
    const insights: KeyInsight[] = [];
    
    // 1. Lighting insights (High priority - affects entire image)
    if (analysis.lighting) {
      const lightingLower = analysis.lighting.toLowerCase();
      let lightingInsight = analysis.lighting.split('.')[0]; // First sentence
      
      if (lightingLower.includes('dramatic') || lightingLower.includes('high contrast')) {
        insights.push({
          icon: Sparkles,
          title: "Dramatic Lighting",
          content: lightingInsight,
          category: "Critical",
          color: "primary"
        });
      } else if (lightingLower.includes('soft') || lightingLower.includes('diffused')) {
        insights.push({
          icon: Lightbulb,
          title: "Soft Lighting",
          content: lightingInsight,
          category: "Key",
          color: "accent"
        });
      } else {
        insights.push({
          icon: Lightbulb,
          title: "Lighting Setup",
          content: lightingInsight,
          category: "Important",
          color: "secondary"
        });
      }
    }
    
    // 2. Color palette (High priority - defines mood)
    if (analysis.color_palette) {
      const colorInsight = analysis.color_palette.split('.')[0];
      insights.push({
        icon: Palette,
        title: "Color Harmony",
        content: colorInsight,
        category: "Key",
        color: "accent"
      });
    }
    
    // 3. Composition (Medium-high priority)
    if (analysis.camera_composition) {
      const compositionInsight = analysis.camera_composition.split('.')[0];
      insights.push({
        icon: Camera,
        title: "Composition",
        content: compositionInsight,
        category: "Important",
        color: "secondary"
      });
    }
    
    // 4. Subject description (Context)
    if (analysis.subject_description) {
      const subjectInsight = analysis.subject_description.split('.').slice(0, 2).join('. ');
      insights.push({
        icon: Eye,
        title: "Subject Analysis",
        content: subjectInsight,
        category: "Context",
        color: "muted"
      });
    }
    
    return insights.slice(0, 4); // Top 4 insights
  };

  const keyInsights = extractKeyInsights();

  return (
    <div className="space-y-6">
      {/* Overview Summary */}
      <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-xl p-6 border border-border/50">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Image Overview</h3>
            <p className="text-xs text-muted-foreground">AI-generated summary</p>
          </div>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {analysis.image_overview}
        </p>
      </div>

      {/* Key Insights Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Key Insights
          </h3>
          <Badge variant="outline" className="text-xs">
            {keyInsights.length} Highlights
          </Badge>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {keyInsights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Card 
                key={index}
                className="group hover:shadow-md transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-${insight.color}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="relative p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-${insight.color}/10 border border-${insight.color}/20`}>
                      <Icon className={`w-4 h-4 text-${insight.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {insight.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {insight.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {analysis.mood_emotion.split(' ').length > 15 ? 'Rich' : 'Clear'}
            </div>
            <div className="text-xs text-muted-foreground">Mood Depth</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">
              {analysis.design_style.toLowerCase().includes('modern') ? 'Modern' : 'Classic'}
            </div>
            <div className="text-xs text-muted-foreground">Style Era</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary-foreground mb-1">
              {analysis.lighting.toLowerCase().includes('natural') ? 'Natural' : 'Studio'}
            </div>
            <div className="text-xs text-muted-foreground">Light Source</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {analysis.artistic_medium.toLowerCase().includes('photo') ? 'Photo' : 'Art'}
            </div>
            <div className="text-xs text-muted-foreground">Medium</div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Message */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Switch to <span className="font-semibold text-foreground">Details</span> or{" "}
          <span className="font-semibold text-foreground">Technical</span> tab for in-depth analysis
        </p>
      </div>
    </div>
  );
};
