import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Analysis } from "@/pages/Index";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";

interface GuidedTweaksProps {
  analysis: Analysis;
  onApplyTweak: (description: string) => void;
  isApplying?: boolean;
}

export const GuidedTweaks = ({ analysis, onApplyTweak, isApplying }: GuidedTweaksProps) => {
  // Generate contextual suggestions based on analysis
  const generateSuggestions = (): Array<{ text: string; action: string }> => {
    const suggestions: Array<{ text: string; action: string }> = [];
    const { lighting, mood_emotion, color_palette, design_style } = analysis;
    
    // Lighting-based suggestions
    if (lighting.toLowerCase().includes('soft') || lighting.toLowerCase().includes('muted')) {
      suggestions.push({
        text: "Add cinematic depth and contrast",
        action: "Enhance with dramatic lighting and deeper shadows for cinematic depth"
      });
    }
    
    if (lighting.toLowerCase().includes('harsh') || lighting.toLowerCase().includes('dramatic')) {
      suggestions.push({
        text: "Soften mood with gentle lighting",
        action: "Replace with soft, diffused lighting for a warmer, more approachable feel"
      });
    }
    
    // Mood-based suggestions
    if (mood_emotion.toLowerCase().includes('calm') || mood_emotion.toLowerCase().includes('serene')) {
      suggestions.push({
        text: "Energize with vibrant atmosphere",
        action: "Inject energy with warmer tones and more dynamic composition"
      });
    }
    
    if (mood_emotion.toLowerCase().includes('dark') || mood_emotion.toLowerCase().includes('moody')) {
      suggestions.push({
        text: "Brighten mood for optimism",
        action: "Lighten the mood with brighter tones and softer shadows"
      });
    }
    
    // Color-based suggestions
    if (color_palette.toLowerCase().includes('muted') || color_palette.toLowerCase().includes('desaturated')) {
      suggestions.push({
        text: "Boost color vibrancy",
        action: "Increase color saturation for more vibrant, eye-catching tones"
      });
    }
    
    if (color_palette.toLowerCase().includes('vibrant') || color_palette.toLowerCase().includes('bold')) {
      suggestions.push({
        text: "Create sophisticated muted palette",
        action: "Desaturate colors for a more refined, elegant aesthetic"
      });
    }
    
    // Style-based suggestions
    if (design_style.toLowerCase().includes('minimal')) {
      suggestions.push({
        text: "Add artistic complexity",
        action: "Introduce more textural details and layered elements for depth"
      });
    }
    
    // Generic helpful suggestions
    suggestions.push({
      text: "Sharpen contrast while keeping tone",
      action: "Enhance contrast between light and dark areas while maintaining the overall color mood"
    });
    
    suggestions.push({
      text: "Make lighting warmer and more human",
      action: "Shift lighting to warmer golden tones for a more inviting, natural feel"
    });
    
    return suggestions.slice(0, 4); // Max 4 suggestions
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          <h3 className="text-xs md:text-sm font-semibold text-foreground">
            AI-Powered Refinements
          </h3>
        </div>
        <CreditCostIndicator cost={1} action="tweak" className="text-xs" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="group relative bg-gradient-to-r from-accent/20 to-accent/5 rounded-lg 
                       p-2.5 md:p-4 
                       ring-1 ring-border/30 
                       hover:ring-primary/40 
                       transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs md:text-sm text-foreground leading-snug md:leading-relaxed flex-1">
                {suggestion.text}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-6 md:h-7 px-2 md:px-3 text-[10px] md:text-xs"
                onClick={() => onApplyTweak(suggestion.action)}
                disabled={isApplying}
              >
                Try
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
