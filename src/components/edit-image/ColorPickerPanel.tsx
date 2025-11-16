import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette } from "lucide-react";

const COLOR_PRESETS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Green", value: "#22C55E" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Black", value: "#000000" },
  { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#6B7280" },
];

interface ColorPickerPanelProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  onApply: (color: string) => void;
}

export const ColorPickerPanel = ({
  selectedColor,
  onColorChange,
  onApply,
}: ColorPickerPanelProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Object Recoloring</Label>
      </div>

      <div className="space-y-3">
        <Label className="text-xs">Select Color</Label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.name}
              type="button"
              className={`w-10 h-10 rounded-md border-2 transition-all ${
                selectedColor === color.value
                  ? "border-primary scale-110"
                  : "border-border hover:border-primary/50"
              }`}
              style={{ backgroundColor: color.value }}
              onClick={(e) => {
                e.stopPropagation();
                onColorChange(color.value);
              }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-color" className="text-xs">
          Or enter hex color
        </Label>
        <div className="flex gap-2">
          <Input
            id="custom-color"
            type="text"
            placeholder="#000000"
            value={selectedColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="flex-1"
          />
          <div
            className="w-10 h-10 rounded-md border border-border"
            style={{ backgroundColor: selectedColor }}
          />
        </div>
      </div>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onApply(selectedColor);
        }}
        className="w-full"
        size="sm"
      >
        Apply Color Change
      </Button>
    </div>
  );
};

