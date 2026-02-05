import { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { GenerationOptions } from '@/components/ImageGenerationDialog';

interface StylePreset {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  prompt_template: string;
  quality: string;
  aspect_ratio: string;
  color_palette?: any[];
}

interface StylePresetApplicatorProps {
  onApply: (preset: StylePreset) => void;
}

export const StylePresetApplicator = ({ onApply }: StylePresetApplicatorProps) => {
  const { user } = useAuth();
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPresets();
    }
  }, [user]);

  const loadPresets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('style_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading presets:', error);
      toast.error('Failed to load style presets');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (preset: StylePreset) => {
    setSelectedId(preset.id);
    onApply(preset);
    
    // Update usage count
    supabase
      .from('style_presets')
      .update({ usage_count: (preset as any).usage_count + 1 })
      .eq('id', preset.id)
      .then(() => loadPresets());
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Loading presets...</p>
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium text-muted-foreground mb-2">No style presets yet</p>
        <p className="text-xs text-muted-foreground">
          Save a successful generation as a preset to reuse styles
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="grid grid-cols-2 gap-3 p-2">
        {presets.map((preset) => (
          <Card
            key={preset.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50 relative',
              selectedId === preset.id && 'border-primary border-2'
            )}
            onClick={() => handleApply(preset)}
          >
            <CardContent className="p-3">
              {preset.thumbnail && (
                <div className="mb-2 rounded overflow-hidden border border-border">
                  <img
                    src={preset.thumbnail}
                    alt={preset.name}
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold truncate">{preset.name}</h4>
                  {selectedId === preset.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {preset.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{preset.quality}</span>
                  <span>•</span>
                  <span>{preset.aspect_ratio}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
