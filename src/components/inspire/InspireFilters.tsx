import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, X } from "lucide-react";

export interface FilterOptions {
  styles: string[];
  colors: string[];
  moods: string[];
  compositions: string[];
}

interface InspireFiltersProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
}

const STYLE_OPTIONS = [
  "realistic", "abstract", "minimalist", "vintage", "modern",
  "watercolor", "oil painting", "digital art", "sketch", "photographic",
  "illustration", "anime", "cartoon", "cinematic", "3d render"
];

const COLOR_OPTIONS = [
  "vibrant", "pastel", "monochrome", "warm", "cool",
  "neon", "earth tones", "black and white", "gradient", "muted"
];

const MOOD_OPTIONS = [
  "calm", "energetic", "mysterious", "joyful", "melancholic",
  "dramatic", "serene", "playful", "ethereal", "intense"
];

const COMPOSITION_OPTIONS = [
  "portrait", "landscape", "close-up", "wide angle", "symmetrical",
  "asymmetrical", "centered", "rule of thirds", "minimalist", "busy"
];

export const InspireFilters = ({ filters, onChange }: InspireFiltersProps) => {
  const [localFilters, setLocalFilters] = useState(filters);
  
  const activeFilterCount = 
    localFilters.styles.length +
    localFilters.colors.length +
    localFilters.moods.length +
    localFilters.compositions.length;

  const toggleFilter = (category: keyof FilterOptions, value: string) => {
    const newFilters = { ...localFilters };
    const index = newFilters[category].indexOf(value);
    
    if (index > -1) {
      newFilters[category] = newFilters[category].filter(v => v !== value);
    } else {
      newFilters[category] = [...newFilters[category], value];
    }
    
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterOptions = {
      styles: [],
      colors: [],
      moods: [],
      compositions: [],
    };
    setLocalFilters(emptyFilters);
    onChange(emptyFilters);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto" align="start">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Filters</h3>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 gap-1 text-xs"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Style Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map(style => (
                  <div key={style} className="flex items-center space-x-2">
                    <Checkbox
                      id={`style-${style}`}
                      checked={localFilters.styles.includes(style)}
                      onCheckedChange={() => toggleFilter("styles", style)}
                    />
                    <label
                      htmlFor={`style-${style}`}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {style}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Color Palette</Label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_OPTIONS.map(color => (
                  <div key={color} className="flex items-center space-x-2">
                    <Checkbox
                      id={`color-${color}`}
                      checked={localFilters.colors.includes(color)}
                      onCheckedChange={() => toggleFilter("colors", color)}
                    />
                    <label
                      htmlFor={`color-${color}`}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {color}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Mood</Label>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map(mood => (
                  <div key={mood} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mood-${mood}`}
                      checked={localFilters.moods.includes(mood)}
                      onCheckedChange={() => toggleFilter("moods", mood)}
                    />
                    <label
                      htmlFor={`mood-${mood}`}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {mood}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Composition Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Composition</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMPOSITION_OPTIONS.map(composition => (
                  <div key={composition} className="flex items-center space-x-2">
                    <Checkbox
                      id={`comp-${composition}`}
                      checked={localFilters.compositions.includes(composition)}
                      onCheckedChange={() => toggleFilter("compositions", composition)}
                    />
                    <label
                      htmlFor={`comp-${composition}`}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {composition}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {[...localFilters.styles, ...localFilters.colors, ...localFilters.moods, ...localFilters.compositions]
            .slice(0, 3)
            .map(filter => (
              <Badge key={filter} variant="secondary" className="capitalize text-xs">
                {filter}
              </Badge>
            ))}
          {activeFilterCount > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{activeFilterCount - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
