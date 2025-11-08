import { Analysis } from "@/pages/Index";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KeywordChip } from "@/components/KeywordChip";
import { usePromptKeywords } from "@/hooks/usePromptKeywords";
import { 
  Sparkles, 
  Copy, 
  Trash2, 
  Wand2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PromptBuilderProps {
  analysis: Analysis;
  onGenerate?: (prompt: string) => void;
}

export const PromptBuilder = ({ analysis, onGenerate }: PromptBuilderProps) => {
  const {
    categories,
    selectedKeywords,
    toggleKeyword,
    clearCategory,
    clearAll,
    generatedPrompt,
    keywordCount
  } = usePromptKeywords(analysis);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCopyPrompt = () => {
    if (keywordCount === 0) {
      toast.error("No keywords selected");
      return;
    }
    navigator.clipboard.writeText(generatedPrompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleGenerate = () => {
    if (keywordCount === 0) {
      toast.error("Please select at least one keyword");
      return;
    }
    onGenerate?.(generatedPrompt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Visual Prompt Builder</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Click keywords to build your custom prompt
          </p>
        </div>
        {keywordCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Live Prompt Preview */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Live Preview
              </Badge>
              {keywordCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {keywordCount} {keywordCount === 1 ? 'keyword' : 'keywords'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
                disabled={keywordCount === 0}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className={cn(
            "text-sm leading-relaxed transition-all duration-300",
            keywordCount === 0 ? "text-muted-foreground italic" : "text-foreground"
          )}>
            {generatedPrompt}
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Keyword Categories */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Select Keywords by Category
          </h4>
        </div>

        <div className="space-y-2">
          {categories.map((category) => {
            const selectedInCategory = selectedKeywords.filter(kw => 
              category.keywords.includes(kw)
            ).length;
            const isExpanded = expandedCategories.has(category.id);

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <Card className="border-border/50 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{category.name}</span>
                            {selectedInCategory > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedInCategory}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {category.keywords.length} available
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedInCategory > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearCategory(category.id);
                            }}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Clear
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="flex flex-wrap gap-2 pt-2">
                        {category.keywords.map((keyword) => (
                          <KeywordChip
                            key={keyword}
                            keyword={keyword}
                            selected={selectedKeywords.includes(keyword)}
                            onClick={() => toggleKeyword(keyword)}
                            category={category.id}
                          />
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      {onGenerate && (
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={keywordCount === 0}
            className="min-w-[240px] shadow-md hover:shadow-lg transition-shadow"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate from Keywords
          </Button>
        </div>
      )}

      {/* Helper Text */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          💡 Tip: Keywords are AI-extracted from your image analysis. Mix and match to create unique prompts!
        </p>
      </div>
    </div>
  );
};
