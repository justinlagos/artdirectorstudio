import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface BreakdownTableProps {
  breakdown: Record<string, string>;
}

export const BreakdownTable = ({ breakdown }: BreakdownTableProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatKey = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
        <h3 className="text-lg font-semibold">Advanced Breakdown</h3>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-subtle">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Parameter
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(breakdown).map(([key, value]) => (
                <tr key={key} className="hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                    {formatKey(key)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
