import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
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
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            {allowCustom && (
              <SelectItem value="_custom">
                <span className="italic">Custom...</span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};