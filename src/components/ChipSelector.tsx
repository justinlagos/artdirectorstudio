import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ChipSelectorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allowCustom?: boolean;
}

export const ChipSelector = ({
  label,
  value,
  options,
  onChange,
  allowCustom = true
}: ChipSelectorProps) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleChipClick = (option: string) => {
    if (value === option) {
      onChange("");
    } else {
      onChange(option);
      setShowCustomInput(false);
    }
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
    }
  };

  const isCustomValue = value && !options.includes(value);

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-medium">
        {label}
      </label>
      
      <div className="flex flex-wrap gap-2">
        {options.slice(0, 5).map((option) => (
          <Badge
            key={option}
            variant={value === option ? "default" : "outline"}
            className={`cursor-pointer px-3 py-1.5 text-sm transition-all hover:scale-105 ${
              value === option
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-accent"
            }`}
            onClick={() => handleChipClick(option)}
          >
            {option}
          </Badge>
        ))}
        
        {isCustomValue && (
          <Badge
            variant="default"
            className="cursor-pointer px-3 py-1.5 text-sm bg-primary text-primary-foreground shadow-sm"
            onClick={() => onChange("")}
          >
            {value} ×
          </Badge>
        )}
        
        {allowCustom && !showCustomInput && (
          <Badge
            variant="outline"
            className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent transition-all hover:scale-105"
            onClick={() => setShowCustomInput(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Custom
          </Badge>
        )}
      </div>
      
      {showCustomInput && (
        <div className="flex gap-2 animate-scale-in">
          <Input
            placeholder="Enter custom value..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") setShowCustomInput(false);
            }}
            className="h-9 text-sm"
            autoFocus
          />
          <Badge
            variant="outline"
            className="cursor-pointer px-3 hover:bg-accent"
            onClick={() => setShowCustomInput(false)}
          >
            Cancel
          </Badge>
        </div>
      )}
    </div>
  );
};
