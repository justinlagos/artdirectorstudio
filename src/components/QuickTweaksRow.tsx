import { Badge } from "@/components/ui/badge";
import { User, Palette, Sun, Brush } from "lucide-react";
import { Analysis } from "@/pages/Index";

interface QuickTweaksRowProps {
  analysis: Analysis;
}

export const QuickTweaksRow = ({ analysis }: QuickTweaksRowProps) => {
  // Extract key insights from analysis
  const extractSubjectTag = (description: string): string => {
    const words = description.toLowerCase().split(' ');
    if (words.includes('person') || words.includes('man') || words.includes('woman')) return 'Portrait';
    if (words.includes('landscape') || words.includes('scenery')) return 'Landscape';
    if (words.includes('product') || words.includes('object')) return 'Product';
    return 'Subject';
  };

  const extractStyleTag = (style: string): string => {
    const words = style.toLowerCase();
    if (words.includes('minimal')) return 'Minimalist';
    if (words.includes('modern')) return 'Modern';
    if (words.includes('vintage') || words.includes('retro')) return 'Vintage';
    if (words.includes('abstract')) return 'Abstract';
    // Get first meaningful word
    const match = style.match(/\b[A-Z][a-z]+/);
    return match ? match[0] : 'Creative';
  };

  const extractLightingTag = (lighting: string): string => {
    const words = lighting.toLowerCase();
    if (words.includes('natural')) return 'Natural light';
    if (words.includes('soft')) return 'Soft lighting';
    if (words.includes('dramatic') || words.includes('harsh')) return 'Dramatic';
    if (words.includes('backlight')) return 'Backlit';
    if (words.includes('golden')) return 'Golden hour';
    return 'Studio lighting';
  };

  const extractColorTag = (palette: string): string => {
    const words = palette.toLowerCase();
    if (words.includes('warm')) return 'Warm tones';
    if (words.includes('cool')) return 'Cool tones';
    if (words.includes('muted') || words.includes('subdued')) return 'Muted palette';
    if (words.includes('vibrant') || words.includes('bold')) return 'Vibrant';
    if (words.includes('monochrome')) return 'Monochrome';
    // Extract first color mentioned
    const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
    for (const color of colors) {
      if (words.includes(color)) return color.charAt(0).toUpperCase() + color.slice(1);
    }
    return 'Balanced';
  };

  const categories = [
    {
      icon: User,
      label: 'Subject',
      tag: extractSubjectTag(analysis.subject_description)
    },
    {
      icon: Brush,
      label: 'Style',
      tag: extractStyleTag(analysis.design_style)
    },
    {
      icon: Sun,
      label: 'Lighting',
      tag: extractLightingTag(analysis.lighting)
    },
    {
      icon: Palette,
      label: 'Color',
      tag: extractColorTag(analysis.color_palette)
    }
  ];

  return (
    <div className="bg-surface-1/50 rounded-xl p-6 ring-1 ring-border/30 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Tweaks
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="shrink-0 p-2 rounded-lg bg-accent/50">
                <Icon className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground mb-0.5">
                  {category.label}
                </div>
                <Badge variant="outline" className="text-xs font-medium truncate block max-w-full">
                  {category.tag}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
