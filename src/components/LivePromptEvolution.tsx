import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface LivePromptEvolutionProps {
  prompt: string;
  previousPrompt: string;
  modifiedCount: number;
}

export const LivePromptEvolution = ({ 
  prompt, 
  previousPrompt,
  modifiedCount 
}: LivePromptEvolutionProps) => {
  const [displayedPrompt, setDisplayedPrompt] = useState(prompt);
  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (prompt === previousPrompt) {
      setDisplayedPrompt(prompt);
      setHighlightedWords(new Set());
      return;
    }

    // Find changed words
    const oldWords = previousPrompt.split(' ');
    const newWords = prompt.split(' ');
    const changed = new Set<number>();

    newWords.forEach((word, idx) => {
      if (oldWords[idx] !== word) {
        changed.add(idx);
      }
    });

    setHighlightedWords(changed);
    setDisplayedPrompt(prompt);

    // Clear highlights after animation
    const timer = setTimeout(() => {
      setHighlightedWords(new Set());
    }, 2000);

    return () => clearTimeout(timer);
  }, [prompt, previousPrompt]);

  const words = displayedPrompt.split(' ');

  return (
    <Card className="p-4 bg-muted/30 border-dashed space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Live Prompt Preview</span>
        </div>
        {modifiedCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {modifiedCount} {modifiedCount === 1 ? 'change' : 'changes'}
          </span>
        )}
      </div>
      <div className="text-sm leading-relaxed text-foreground/80">
        {words.map((word, idx) => (
          <span
            key={`${word}-${idx}`}
            className={`inline-block transition-all duration-500 ${
              highlightedWords.has(idx)
                ? 'text-primary font-medium animate-fade-in'
                : ''
            }`}
          >
            {word}{' '}
          </span>
        ))}
      </div>
    </Card>
  );
};
