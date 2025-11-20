import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ArtieModal } from './ArtieModal';
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
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    await onGenerate(prompt, options);
  };

  const footerContent = (
    <div className="flex gap-2 justify-end">
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
  );

  return (
    <ArtieModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title="Generate Image"
      description="Artie has prepared this prompt for you."
      footer={footerContent}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full min-h-[120px] resize-y"
            placeholder="Describe the image you want to generate..."
          />
        </div>
      </div>
    </ArtieModal>
  );
});

ArtieGenerationDialog.displayName = 'ArtieGenerationDialog';
