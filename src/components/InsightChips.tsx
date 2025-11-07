import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface InsightChipsProps {
  insights: string[];
}

export const InsightChips = ({ insights }: InsightChipsProps) => {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center animate-fade-in">
      <Sparkles className="w-4 h-4 text-primary shrink-0" />
      {insights.map((insight, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="px-3 py-1 text-sm font-medium bg-accent/50 hover:bg-accent transition-colors animate-scale-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {insight}
        </Badge>
      ))}
    </div>
  );
};
