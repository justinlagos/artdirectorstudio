import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Camera, Palette, Lightbulb, Sparkles } from "lucide-react";

interface CompactSummaryProps {
  subject: string;
  style: string;
  lighting: string;
  colors: string;
  onQuickChange: (field: string, value: string) => void;
}

const quickChangeOptions = {
  subject: ["Portrait", "Landscape", "Product", "Abstract", "Still Life"],
  style: ["Photorealistic", "Cinematic", "Minimalist", "Vintage", "Modern"],
  lighting: ["Soft", "Hard", "Natural", "Studio", "Golden Hour", "Dramatic"],
  colors: ["Warm", "Cool", "Monochrome", "Vibrant", "Muted", "Pastel"],
};

export function CompactSummary({ subject, style, lighting, colors, onQuickChange }: CompactSummaryProps) {
  return (
    <div className="sticky top-0 z-20 bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QuickChangeField
          icon={<Camera className="w-4 h-4" />}
          label="Subject"
          value={subject}
          options={quickChangeOptions.subject}
          onChange={(val) => onQuickChange("subject", val)}
        />
        <QuickChangeField
          icon={<Sparkles className="w-4 h-4" />}
          label="Style"
          value={style}
          options={quickChangeOptions.style}
          onChange={(val) => onQuickChange("style", val)}
        />
        <QuickChangeField
          icon={<Lightbulb className="w-4 h-4" />}
          label="Lighting"
          value={lighting}
          options={quickChangeOptions.lighting}
          onChange={(val) => onQuickChange("lighting", val)}
        />
        <QuickChangeField
          icon={<Palette className="w-4 h-4" />}
          label="Color"
          value={colors}
          options={quickChangeOptions.colors}
          onChange={(val) => onQuickChange("colors", val)}
        />
      </div>
    </div>
  );
}

function QuickChangeField({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        {icon}
        <span className="text-sm font-medium text-foreground/80">{label}:</span>
        <Badge variant="secondary" className="text-xs">
          {value || "Not set"}
        </Badge>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Quick change ↓
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="flex flex-wrap gap-1.5">
            {options.map((option) => (
              <Button
                key={option}
                variant={value === option ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onChange(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
