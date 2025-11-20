import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openStudioWithPrompt } from "@/lib/studio";
import { toast } from "sonner";
import type { InspireProject } from "@/types/inspire";

interface InspireSuggestion {
  message: string;
  prompt: string;
  tags: string[];
}

interface InspireProactiveSuggestionsProps {
  viewedProjects: InspireProject[];
}

export function InspireProactiveSuggestions({ viewedProjects }: InspireProactiveSuggestionsProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<InspireSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!user || viewedProjects.length < 3 || isDismissed) return;

    const generateSuggestions = async () => {
      setIsLoading(true);
      try {
        // Call edge function to get similar works recommendations
        const { data, error } = await supabase.functions.invoke('get-similar-works');

        if (error) throw error;

        if (data?.analysis_summary) {
          const { styles, moods } = data.analysis_summary;
          
          // Generate contextual suggestions based on analysis
          const newSuggestions: InspireSuggestion[] = [];

          if (styles && styles.length > 0) {
            newSuggestions.push({
              message: `Create something in ${styles[0]} style`,
              prompt: `A ${styles[0]} style artwork`,
              tags: styles
            });
          }

          if (moods && moods.length > 0) {
            newSuggestions.push({
              message: `Explore ${moods[0]} visuals`,
              prompt: `A ${moods[0]} scene with ${styles?.[0] || 'artistic'} style`,
              tags: moods
            });
          }

          // Mix styles and moods
          if (styles && moods && styles.length > 1 && moods.length > 1) {
            newSuggestions.push({
              message: `Combine ${styles[1]} with ${moods[1]} mood`,
              prompt: `A ${moods[1]} ${styles[1]} composition`,
              tags: [...styles.slice(0, 2), ...moods.slice(0, 2)]
            });
          }

          setSuggestions(newSuggestions.slice(0, 3));
        }
      } catch (error) {
        console.error('[InspireProactiveSuggestions] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce suggestion generation
    const timer = setTimeout(generateSuggestions, 2000);
    return () => clearTimeout(timer);
  }, [user, viewedProjects.length, isDismissed]);

  const handleCreateSuggestion = (suggestion: InspireSuggestion) => {
    if (!user) {
      toast.error("Sign in to create");
      return;
    }

    openStudioWithPrompt({
      basePrompt: suggestion.prompt,
      meta: { source: 'inspire-suggestion', tags: suggestion.tags }
    });

    toast.success("Opened in Studio");
  };

  if (!user || isDismissed || suggestions.length === 0 || isLoading) {
    return null;
  }

  return (
    <Card className="sticky top-24 z-10 border-primary/20 bg-background/95 p-6 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Artie's suggestions</h3>
            <p className="text-sm text-muted-foreground">Based on what you're viewing</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start text-left"
            onClick={() => handleCreateSuggestion(suggestion)}
          >
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            {suggestion.message}
          </Button>
        ))}
      </div>
    </Card>
  );
}
