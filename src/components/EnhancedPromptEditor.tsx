import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Zap, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const EnhancedPromptEditor = ({ 
  value, 
  onChange, 
  label = "Prompt",
  placeholder = "Enter your prompt...",
  disabled = false
}: EnhancedPromptEditorProps) => {
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async (type: 'enhance' | 'simplify' | 'artistic') => {
    if (!value.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }

    setIsImproving(true);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-prompt", {
        body: { prompt: value, improvementType: type }
      });

      if (error) throw error;

      if (data?.suggestion) {
        onChange(data.suggestion);
        toast.success("Prompt improved!");
      }
    } catch (error) {
      console.error("Improve error:", error);
      toast.error("Failed to improve prompt. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label>{label}</Label>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleImprove('enhance')}
            disabled={disabled || isImproving || !value.trim()}
            title="Enhance with more details"
            className="h-8 px-2.5 text-xs"
          >
            <Sparkles className="w-3 h-3 sm:mr-1" />
            <span className="ml-1">Enhance</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleImprove('simplify')}
            disabled={disabled || isImproving || !value.trim()}
            title="Simplify and make concise"
            className="h-8 px-2.5 text-xs"
          >
            <Zap className="w-3 h-3 sm:mr-1" />
            <span className="ml-1">Simplify</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleImprove('artistic')}
            disabled={disabled || isImproving || !value.trim()}
            title="Add artistic style and flair"
            className="h-8 px-2.5 text-xs"
          >
            <Palette className="w-3 h-3 sm:mr-1" />
            <span className="ml-1">Artistic</span>
          </Button>
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] resize-none"
        disabled={disabled || isImproving}
        maxLength={2000}
      />
      {isImproving && (
        <p className="text-xs text-muted-foreground">
          Improving prompt with AI...
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {value.length} characters {value.length > 1800 && `(max 2000)`}
      </p>
    </div>
  );
};
