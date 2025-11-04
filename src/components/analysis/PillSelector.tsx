import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PillSelectorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allowCustom?: boolean;
  emptyHint?: string;
  quickActions?: string[];
}

export function PillSelector({
  label,
  value,
  options,
  onChange,
  allowCustom = true,
  emptyHint,
  quickActions = [],
}: PillSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isCustomValue = value && !options.includes(value);
  const displayOptions = showAll ? options : options.slice(0, 5);
  const hasMoreOptions = options.length > 5;

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-base font-medium">{label}</label>
        {value && <span className="text-xs text-muted-foreground">Selected</span>}
      </div>

      {!value && emptyHint && (
        <div className="bg-muted/20 rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted-foreground italic">💡 {emptyHint}</p>
          {quickActions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onChange(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {displayOptions.map((option) => (
          <Button
            key={option}
            variant={value === option ? "default" : "outline"}
            size="sm"
            className="h-8 text-sm"
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}

        {isCustomValue && (
          <Button variant="default" size="sm" className="h-8 text-sm">
            {value}
          </Button>
        )}

        {hasMoreOptions && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm"
            onClick={() => setShowAll(true)}
          >
            +{options.length - 5} more
          </Button>
        )}

        {allowCustom && !showCustomInput && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm text-muted-foreground"
            onClick={() => setShowCustomInput(true)}
          >
            Custom...
          </Button>
        )}
      </div>

      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Enter custom value..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") setShowCustomInput(false);
            }}
            className="h-8 text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleCustomSubmit} className="h-8">
            Set
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
      )}
    </div>
  );
}
