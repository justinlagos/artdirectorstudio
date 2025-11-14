import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerationOptions } from './types';

interface ArtieGenerationDialogProps {
  open: boolean;
  prompt: string;
  options: GenerationOptions;
  onPromptChange: (prompt: string) => void;
  onClose: () => void;
  onGenerate: (prompt: string, options: GenerationOptions) => Promise<void>;
}

export const ArtieGenerationDialog = memo(({
  open,
  prompt,
  options,
  onPromptChange,
  onClose,
  onGenerate,
}: ArtieGenerationDialogProps) => {
  if (!open) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    await onGenerate(prompt, options);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Generate Image</h3>
            <p className="text-sm text-muted-foreground">Artie has prepared this prompt for you.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full min-h-[120px] p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none resize-y"
              placeholder="Describe the image you want to generate..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Generate (1 credit)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

ArtieGenerationDialog.displayName = 'ArtieGenerationDialog';

