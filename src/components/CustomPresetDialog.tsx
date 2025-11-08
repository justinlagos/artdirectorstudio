import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { GenerationOptions } from "./ImageGenerationDialog";

interface CustomPreset {
  id?: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  options: GenerationOptions;
  prompt_modifier: string;
  is_public: boolean;
}

interface CustomPresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: CustomPreset | null;
  onSave: () => void;
}

const EMOJI_OPTIONS = ['✨', '🎨', '📸', '🖼️', '🌟', '💎', '🎭', '🔮', '🌈', '⚡', '🎪', '🎬'];
const CATEGORY_OPTIONS = ['custom', 'portrait', 'product', 'creative', 'professional'];

export const CustomPresetDialog = ({ 
  open, 
  onOpenChange, 
  preset,
  onSave 
}: CustomPresetDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CustomPreset>({
    name: preset?.name || '',
    description: preset?.description || '',
    icon: preset?.icon || '✨',
    category: preset?.category || 'custom',
    options: preset?.options || {
      quality: 'auto',
      size: '1024x1024',
      background: 'auto'
    },
    prompt_modifier: preset?.prompt_modifier || '',
    is_public: preset?.is_public || false
  });

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    if (!formData.prompt_modifier.trim()) {
      toast.error("Please enter a prompt modifier");
      return;
    }

    setIsLoading(true);

    try {
      if (preset?.id) {
        // Update existing preset
        const { error } = await supabase
          .from('custom_generation_presets')
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            category: formData.category,
            options: formData.options as any,
            prompt_modifier: formData.prompt_modifier,
            is_public: formData.is_public
          })
          .eq('id', preset.id);

        if (error) throw error;
        toast.success("Preset updated successfully!");
      } else {
        // Create new preset
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please log in to create presets");
          return;
        }

        const { error } = await supabase
          .from('custom_generation_presets')
          .insert([{
            user_id: user.id,
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            category: formData.category,
            options: formData.options as any,
            prompt_modifier: formData.prompt_modifier,
            is_public: formData.is_public
          }]);

        if (error) throw error;
        toast.success("Preset created successfully!");
      }

      onSave();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        icon: '✨',
        category: 'custom',
        options: {
          quality: 'auto',
          size: '1024x1024',
          background: 'auto'
        },
        prompt_modifier: '',
        is_public: false
      });
    } catch (error) {
      console.error("Error saving preset:", error);
      toast.error("Failed to save preset. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {preset ? 'Edit Custom Preset' : 'Create Custom Preset'}
          </DialogTitle>
          <DialogDescription>
            Save your favorite generation settings for quick reuse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Preset Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Cinematic Portrait"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe when to use this preset..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Icon and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger id="icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOJI_OPTIONS.map(emoji => (
                    <SelectItem key={emoji} value={emoji}>
                      <span className="text-lg">{emoji}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generation Options */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <Label className="text-sm font-semibold">Generation Settings</Label>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quality" className="text-xs">Quality</Label>
                <Select
                  value={formData.options.quality}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    options: { ...formData.options, quality: value as any } 
                  })}
                >
                  <SelectTrigger id="quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size" className="text-xs">Size</Label>
                <Select
                  value={formData.options.size}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    options: { ...formData.options, size: value as any } 
                  })}
                >
                  <SelectTrigger id="size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">Square</SelectItem>
                    <SelectItem value="1536x1024">Landscape</SelectItem>
                    <SelectItem value="1024x1536">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background" className="text-xs">Background</Label>
                <Select
                  value={formData.options.background}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    options: { ...formData.options, background: value as any } 
                  })}
                >
                  <SelectTrigger id="background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="opaque">Opaque</SelectItem>
                    <SelectItem value="transparent">Transparent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Prompt Modifier */}
          <div className="space-y-2">
            <Label htmlFor="modifier">Prompt Modifier *</Label>
            <Textarea
              id="modifier"
              placeholder="e.g., , cinematic lighting, dramatic composition, film grain, professional photography"
              value={formData.prompt_modifier}
              onChange={(e) => setFormData({ ...formData, prompt_modifier: e.target.value })}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              This text will be added to the base prompt when generating images
            </p>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="public">Make Public</Label>
              <p className="text-xs text-muted-foreground">
                Allow others to use this preset
              </p>
            </div>
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {preset ? 'Update Preset' : 'Create Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
