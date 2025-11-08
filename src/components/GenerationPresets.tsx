import { useState, useEffect } from "react";
import { Sparkles, Instagram, Package, Camera, Palette, Newspaper, Store, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GenerationOptions } from "./ImageGenerationDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GenerationPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  options: GenerationOptions;
  promptModifier: string;
  category: 'portrait' | 'product' | 'creative' | 'professional';
}

export const GENERATION_PRESETS: GenerationPreset[] = [
  {
    id: 'social-portrait',
    name: 'Social Media Portrait',
    description: 'Optimized for Instagram, TikTok, and social platforms',
    icon: <Instagram className="w-5 h-5" />,
    category: 'portrait',
    options: {
      quality: 'high',
      size: '1024x1024',
      background: 'auto'
    },
    promptModifier: ', professional social media quality, vibrant colors, engaging composition, trending aesthetic, high engagement style'
  },
  {
    id: 'product-photo',
    name: 'Product Photography',
    description: 'Clean, professional product shots for e-commerce',
    icon: <Package className="w-5 h-5" />,
    category: 'product',
    options: {
      quality: 'high',
      size: '1024x1024',
      background: 'opaque'
    },
    promptModifier: ', studio lighting, clean white background, professional product photography, sharp focus, commercial quality, e-commerce ready'
  },
  {
    id: 'editorial-fashion',
    name: 'Editorial Fashion',
    description: 'High-end magazine-style fashion photography',
    icon: <Newspaper className="w-5 h-5" />,
    category: 'professional',
    options: {
      quality: 'high',
      size: '1024x1536',
      background: 'auto'
    },
    promptModifier: ', editorial fashion photography, vogue style, dramatic lighting, high fashion aesthetic, magazine quality, sophisticated composition'
  },
  {
    id: 'artistic-portrait',
    name: 'Artistic Portrait',
    description: 'Creative, artistic portraits with unique styling',
    icon: <Palette className="w-5 h-5" />,
    category: 'creative',
    options: {
      quality: 'high',
      size: '1024x1536',
      background: 'auto'
    },
    promptModifier: ', artistic portrait style, creative lighting, fine art photography, unique perspective, gallery quality, artistic expression'
  },
  {
    id: 'lifestyle-photo',
    name: 'Lifestyle Photography',
    description: 'Natural, authentic lifestyle and candid moments',
    icon: <Camera className="w-5 h-5" />,
    category: 'portrait',
    options: {
      quality: 'medium',
      size: '1536x1024',
      background: 'auto'
    },
    promptModifier: ', lifestyle photography, natural lighting, candid moment, authentic feel, warm tones, relatable composition'
  },
  {
    id: 'professional-headshot',
    name: 'Professional Headshot',
    description: 'Corporate headshots for LinkedIn and business',
    icon: <Users className="w-5 h-5" />,
    category: 'professional',
    options: {
      quality: 'high',
      size: '1024x1024',
      background: 'opaque'
    },
    promptModifier: ', professional corporate headshot, studio lighting, neutral background, business professional, LinkedIn quality, polished appearance'
  },
  {
    id: 'commercial-ad',
    name: 'Commercial Advertising',
    description: 'Eye-catching images for ads and marketing',
    icon: <Store className="w-5 h-5" />,
    category: 'professional',
    options: {
      quality: 'high',
      size: '1536x1024',
      background: 'auto'
    },
    promptModifier: ', commercial advertising style, bold colors, attention-grabbing, marketing quality, brand-focused, professional advertisement'
  },
  {
    id: 'creative-concept',
    name: 'Creative Concept Art',
    description: 'Imaginative, conceptual artistic creations',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'creative',
    options: {
      quality: 'high',
      size: '1024x1024',
      background: 'auto'
    },
    promptModifier: ', concept art style, imaginative design, creative vision, artistic interpretation, unique perspective, visually striking'
  }
];

interface CustomPresetData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  options: GenerationOptions;
  prompt_modifier: string;
}

interface GenerationPresetsProps {
  onSelectPreset: (preset: GenerationPreset) => void;
  disabled?: boolean;
  selectedPresetId?: string | null;
  onManageCustomPresets?: () => void;
}

export const GenerationPresets = ({ 
  onSelectPreset, 
  disabled,
  selectedPresetId,
  onManageCustomPresets
}: GenerationPresetsProps) => {
  const [customPresets, setCustomPresets] = useState<CustomPresetData[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);

  useEffect(() => {
    fetchCustomPresets();
  }, []);

  const fetchCustomPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_generation_presets')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCustomPresets((data || []).map(d => ({
        ...d,
        options: d.options as unknown as GenerationOptions
      })));
    } catch (error) {
      console.error("Error fetching custom presets:", error);
    } finally {
      setIsLoadingCustom(false);
    }
  };

  // Convert custom presets to GenerationPreset format
  const customPresetsConverted: GenerationPreset[] = customPresets.map(cp => ({
    id: cp.id,
    name: cp.name,
    description: cp.description,
    icon: <span className="text-xl">{cp.icon}</span>,
    category: cp.category as any,
    options: cp.options,
    promptModifier: cp.prompt_modifier
  }));

  const allPresets = [...GENERATION_PRESETS, ...customPresetsConverted];

  const categories = {
    custom: { name: 'Your Custom Presets', presets: customPresetsConverted },
    portrait: { name: 'Portrait', presets: allPresets.filter(p => p.category === 'portrait') },
    product: { name: 'Product', presets: allPresets.filter(p => p.category === 'product') },
    professional: { name: 'Professional', presets: allPresets.filter(p => p.category === 'professional') },
    creative: { name: 'Creative', presets: allPresets.filter(p => p.category === 'creative') }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generation Presets</h3>
          <div className="flex gap-2">
            {onManageCustomPresets && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManageCustomPresets}
              >
                <Plus className="w-3 h-3 mr-2" />
                Manage Custom
              </Button>
            )}
            <Badge variant="secondary" className="text-xs">
              One-Click Setup
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose a preset to automatically configure optimal settings for your use case
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(categories).map(([key, category]) => (
          category.presets.length > 0 && (
          <div key={key} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {category.name}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {category.presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPresetId === preset.id ? "default" : "outline"}
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => onSelectPreset(preset)}
                  disabled={disabled}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {preset.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-1 flex items-center gap-2">
                        {preset.name}
                        {selectedPresetId === preset.id && (
                          <Badge variant="secondary" className="text-xs py-0 px-2">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {preset.description}
                      </div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          {preset.options.quality}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {preset.options.size.split('x')[0] === preset.options.size.split('x')[1] 
                            ? 'Square' 
                            : parseInt(preset.options.size.split('x')[0]) > parseInt(preset.options.size.split('x')[1])
                              ? 'Landscape'
                              : 'Portrait'
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          )
        ))}
      </div>
    </div>
  );
};
