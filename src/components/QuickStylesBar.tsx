import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { UserEdits } from "@/pages/Index";

interface StylePreset {
  name: string;
  icon?: string;
  edits: Partial<UserEdits>;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    name: "Modern",
    icon: "✨",
    edits: {
      art_style: "Contemporary",
      lighting_type: "Soft window light",
      dominant_color_1: "Charcoal black",
      dominant_color_2: "Pure white",
      background_type: "Minimalist clean space"
    }
  },
  {
    name: "Minimal",
    icon: "○",
    edits: {
      art_style: "Minimalist",
      lighting_type: "Overcast natural",
      dominant_color_1: "Pure white",
      dominant_color_2: "Cream",
      background_type: "Solid color backdrop"
    }
  },
  {
    name: "Editorial",
    icon: "📰",
    edits: {
      art_style: "Editorial fashion",
      lighting_type: "Studio softbox",
      camera_type: "Medium Format Hasselblad",
      background_type: "Studio gradient"
    }
  },
  {
    name: "Dreamlike",
    icon: "✦",
    edits: {
      art_style: "Surreal",
      lighting_type: "Golden hour sunlight",
      dominant_color_1: "Soft pink",
      dominant_color_2: "Lavender",
      background_type: "Bokeh blur"
    }
  }
];

interface QuickStylesBarProps {
  onApplyPreset: (edits: Partial<UserEdits>, presetName: string) => void;
  disabled?: boolean;
}

export const QuickStylesBar = ({ onApplyPreset, disabled }: QuickStylesBarProps) => {
  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Quick Styles</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {STYLE_PRESETS.map((preset) => (
          <Button
            key={preset.name}
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset(preset.edits, preset.name)}
            disabled={disabled}
            className="text-sm hover:bg-accent hover:border-primary/20 transition-all"
          >
            <span className="mr-1.5">{preset.icon}</span>
            {preset.name}
          </Button>
        ))}
      </div>
    </div>
  );
};
