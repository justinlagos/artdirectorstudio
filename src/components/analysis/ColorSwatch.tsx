import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface ColorSwatchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const colorPresets = [
  { name: "Warm", colors: ["#FFA500", "#FFD700", "#FF6347"] },
  { name: "Cool", colors: ["#4682B4", "#87CEEB", "#6495ED"] },
  { name: "Monochrome", colors: ["#000000", "#808080", "#FFFFFF"] },
  { name: "Vibrant", colors: ["#FF1493", "#00FF00", "#1E90FF"] },
  { name: "Muted", colors: ["#D2B48C", "#BC8F8F", "#A0522D"] },
  { name: "Pastel", colors: ["#FFB6C1", "#E6E6FA", "#FFE4B5"] },
];

export function ColorSwatch({ label, value, onChange }: ColorSwatchProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-base font-medium">{label}</label>

      <div className="space-y-3">
        {colorPresets.map((preset) => (
          <div key={preset.name} className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {preset.colors.map((color) => (
                <div
                  key={color}
                  className="w-8 h-8 rounded-full border-2 border-border cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <Button
              variant={value === preset.name ? "default" : "outline"}
              size="sm"
              className="h-8 text-sm flex-1"
              onClick={() => onChange(preset.name)}
            >
              {value === preset.name && <Check className="w-3 h-3 mr-1" />}
              {preset.name}
            </Button>
          </div>
        ))}
      </div>

      {!showCustomInput && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-sm text-muted-foreground mt-2"
          onClick={() => setShowCustomInput(true)}
        >
          Custom colors...
        </Button>
      )}

      {showCustomInput && (
        <div className="space-y-2 mt-2">
          <Input
            placeholder="e.g., Burnt sienna and sage green"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") setShowCustomInput(false);
            }}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCustomSubmit} className="h-8 flex-1">
              Set Custom
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCustomInput(false)}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {value && (
        <div className="text-xs text-muted-foreground mt-2">
          Current: <span className="font-medium">{value}</span>
        </div>
      )}
    </div>
  );
}
