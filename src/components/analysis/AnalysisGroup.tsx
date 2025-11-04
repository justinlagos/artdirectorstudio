import { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface AnalysisGroupProps {
  title: string;
  icon: ReactNode;
  editCount: number;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}

export function AnalysisGroup({
  title,
  icon,
  editCount,
  isOpen,
  onToggle,
  children,
}: AnalysisGroupProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border border-border/50 rounded-xl overflow-hidden bg-surface-1/50 backdrop-blur-sm">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-surface-2/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-xl">{icon}</div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {editCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {editCount} edit{editCount !== 1 ? "s" : ""}
                </Badge>
              )}
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform ${
                  isOpen ? "transform rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-border/30">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
