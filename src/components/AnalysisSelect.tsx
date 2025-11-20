import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Info, Palette } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnalysisSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  helpText?: string;
  allowCustom?: boolean;
}

export const AnalysisSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Choose...",
  helpText,
  allowCustom = true
}: AnalysisSelectProps) => {
  const handleValueChange = (newValue: string) => {
    if (newValue === "_custom") {
      // Switch to input mode
      onChange("");
    } else {
      onChange(newValue);
    }
  };

  const isCustomValue = value && !options.includes(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {isCustomValue && allowCustom ? (
        <div className="space-y-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 text-sm"
          />
          <button
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Choose from presets
          </button>
        </div>
      ) : (
        <Select value={value} onValueChange={handleValueChange}>
          <SelectTrigger className="h-9 text-sm bg-surface-1 ring-1 ring-border/30 focus:ring-primary/30 transition-all">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background/95 backdrop-blur-sm z-[20]">
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold text-muted-foreground">Recommended</SelectLabel>
              {options.slice(0, 5).map((option) => (
                <SelectItem key={option} value={option} className="cursor-pointer">
                  {label.toLowerCase().includes('color') && (
                    <Palette className="inline-block w-3 h-3 mr-2 opacity-50" />
                  )}
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
            {options.length > 5 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground">More Options</SelectLabel>
                  {options.slice(5).map((option) => (
                    <SelectItem key={option} value={option} className="cursor-pointer">
                      {label.toLowerCase().includes('color') && (
                        <Palette className="inline-block w-3 h-3 mr-2 opacity-50" />
                      )}
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
            {allowCustom && (
              <>
                <SelectSeparator />
                <SelectItem value="_custom" className="cursor-pointer font-medium">
                  ✏️ Enter Custom...
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};