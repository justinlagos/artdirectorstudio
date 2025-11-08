import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordChipProps {
  keyword: string;
  selected: boolean;
  onClick: () => void;
  category?: string;
}

const categoryColors: Record<string, string> = {
  subject: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300",
  lighting: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  colors: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20 text-pink-700 dark:text-pink-300",
  style: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300",
  composition: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-700 dark:text-green-300",
  mood: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300"
};

const selectedColors: Record<string, string> = {
  subject: "bg-blue-500 border-blue-600 text-white",
  lighting: "bg-yellow-500 border-yellow-600 text-white",
  colors: "bg-pink-500 border-pink-600 text-white",
  style: "bg-purple-500 border-purple-600 text-white",
  composition: "bg-green-500 border-green-600 text-white",
  mood: "bg-orange-500 border-orange-600 text-white"
};

export const KeywordChip = ({ keyword, selected, onClick, category }: KeywordChipProps) => {
  const baseColor = category ? categoryColors[category] : "bg-muted";
  const selectedColor = category ? selectedColors[category] : "bg-primary text-primary-foreground";

  return (
    <Badge
      variant={selected ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "cursor-pointer px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95 select-none",
        "flex items-center gap-1.5 min-h-[32px]",
        selected ? selectedColor : baseColor
      )}
    >
      {selected && <Check className="w-3 h-3" />}
      <span className="line-clamp-1">{keyword}</span>
    </Badge>
  );
};
