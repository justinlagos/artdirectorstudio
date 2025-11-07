import { Card } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const PROMPTS = [
  "Try a quick tweak to explore variations",
  "Want to match brand colors?",
  "Test a different camera mood",
  "Apply a preset style in one click"
];

export const EmptyStatePrompts = () => {
  return (
    <Card className="p-4 bg-accent/30 border-dashed animate-fade-in">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          {PROMPTS.map((prompt, idx) => (
            <p key={idx} className="text-sm text-muted-foreground">
              {prompt}
            </p>
          ))}
        </div>
      </div>
    </Card>
  );
};
