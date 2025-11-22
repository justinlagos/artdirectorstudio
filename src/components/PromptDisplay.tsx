import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface PromptDisplayProps {
  prompt: string;
}

export const PromptDisplay = ({ prompt }: PromptDisplayProps) => {
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard");
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 md:p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Full Generation Prompt</h3>
          <p className="text-sm text-muted-foreground">
            Use this in Studio to generate your image
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyPrompt}
          className="shrink-0"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
      </div>

      <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border/40 bg-muted/30 p-4 md:p-6">
        <p className="font-mono text-xs md:text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
          {prompt}
        </p>
      </div>
    </section>
  );
};
