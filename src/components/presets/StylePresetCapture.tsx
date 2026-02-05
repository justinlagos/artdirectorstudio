import { useState, useEffect } from 'react';
import { Save, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { GenerationOptions } from '@/components/ImageGenerationDialog';

interface StylePresetCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  prompt: string;
  options: GenerationOptions;
  onCapture?: (presetId: string) => void;
}

export const StylePresetCapture = ({
  open,
  onOpenChange,
  imageUrl,
  prompt,
  options,
  onCapture,
}: StylePresetCaptureProps) => {
  const { user } = useAuth();
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate name from prompt analysis
  const generatePresetName = (promptText: string): string => {
    const words = promptText.toLowerCase().split(/\s+/);
    const styleWords = words.filter(w => 
      w.length > 4 && 
      !['the', 'and', 'with', 'from', 'this', 'that', 'image', 'photo'].includes(w)
    );
    
    if (styleWords.length > 0) {
      const firstStyle = styleWords[0].charAt(0).toUpperCase() + styleWords[0].slice(1);
      return `${firstStyle} Style`;
    }
    
    return 'Custom Style';
  };

  // Initialize name when dialog opens
  useEffect(() => {
    if (open && !presetName) {
      setPresetName(generatePresetName(prompt));
    }
  }, [open, prompt, presetName]);

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save presets');
      return;
    }

    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    setIsSaving(true);

    try {
      // Extract style information (simplified - could use AI analysis)
      const colorPalette: any[] = []; // Would extract from image analysis
      const lighting = {}; // Would extract from analysis
      const composition = {}; // Would extract from analysis

      const { data: preset, error } = await supabase
        .from('style_presets')
        .insert({
          user_id: user.id,
          name: presetName.trim(),
          description: description.trim() || undefined,
          thumbnail: imageUrl,
          prompt_template: prompt,
          quality: options.quality,
          aspect_ratio: options.aspectRatio || '1:1',
          color_palette: colorPalette,
          lighting,
          composition,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Style preset saved!');
      onCapture?.(preset.id);
      onOpenChange(false);
      
      // Reset form
      setPresetName('');
      setDescription('');
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('Failed to save preset. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Save Style Preset
          </DialogTitle>
          <DialogDescription>
            Save this generation configuration as a reusable style preset
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {imageUrl && (
            <div className="rounded-lg border border-border overflow-hidden">
              <img
                src={imageUrl}
                alt="Preset preview"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Style Preset"
              disabled={isSaving}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="preset-description">Description (Optional)</Label>
            <Textarea
              id="preset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this style..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>This preset will include:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Prompt template: "{prompt.slice(0, 50)}..."</li>
              <li>Quality: {options.quality}</li>
              <li>Aspect ratio: {options.aspectRatio}</li>
              <li>Background: {options.background}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!presetName.trim() || isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Preset'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
