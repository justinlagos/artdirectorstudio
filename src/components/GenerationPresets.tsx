import { useState, useEffect } from "react";
import { Sparkles, Instagram, Package, Camera, Palette, Newspaper, Store, Users, Plus, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GenerationOptions } from "./ImageGenerationDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [selectedCategory, setSelectedCategory] = useState<string>('portrait');
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

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
    custom: { name: 'Custom', icon: <Plus className="w-4 h-4" />, presets: customPresetsConverted },
    portrait: { name: 'Portrait', icon: <Users className="w-4 h-4" />, presets: allPresets.filter(p => p.category === 'portrait') },
    product: { name: 'Product', icon: <Package className="w-4 h-4" />, presets: allPresets.filter(p => p.category === 'product') },
    professional: { name: 'Professional', icon: <Camera className="w-4 h-4" />, presets: allPresets.filter(p => p.category === 'professional') },
    creative: { name: 'Creative', icon: <Palette className="w-4 h-4" />, presets: allPresets.filter(p => p.category === 'creative') }
  };

  const selectedPreset = allPresets.find(p => p.id === selectedPresetId);
  const currentCategory = categories[selectedCategory as keyof typeof categories];

  // Mobile: Horizontal chip selector with category presets below
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Horizontal category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {Object.entries(categories).map(([key, category]) => (
            category.presets.length > 0 && (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(key)}
                disabled={disabled}
                className="flex-shrink-0 h-8 px-3 gap-1.5"
              >
                {category.icon}
                <span className="text-xs font-medium">{category.name}</span>
              </Button>
            )
          ))}
        </div>

        {/* Selected category's presets */}
        {currentCategory && currentCategory.presets.length > 0 && (
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {currentCategory.presets.map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPresetId === preset.id ? "default" : "outline"}
                className="h-auto w-full p-2.5 justify-start text-left"
                onClick={() => onSelectPreset(preset)}
                disabled={disabled}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-shrink-0">
                    <div className="w-4 h-4 flex items-center justify-center">
                      {preset.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {preset.options.size.split('x')[0] === preset.options.size.split('x')[1] 
                          ? 'Square' 
                          : parseInt(preset.options.size.split('x')[0]) > parseInt(preset.options.size.split('x')[1])
                            ? 'Landscape'
                            : 'Portrait'
                        }
                      </Badge>
                    </div>
                  </div>
                  {selectedPresetId === preset.id && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Manage Custom Presets Link */}
        {onManageCustomPresets && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageCustomPresets}
            className="w-full h-8 text-xs"
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Manage Custom Presets
          </Button>
        )}
      </div>
    );
  }

  // Desktop: Searchable dropdown/combobox
  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto py-2.5 px-3"
            disabled={disabled}
          >
            {selectedPreset ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  {selectedPreset.icon}
                </div>
                <span className="font-medium">{selectedPreset.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                  {selectedPreset.options.size.split('x')[0] === selectedPreset.options.size.split('x')[1] 
                    ? 'Square' 
                    : parseInt(selectedPreset.options.size.split('x')[0]) > parseInt(selectedPreset.options.size.split('x')[1])
                      ? 'Landscape'
                      : 'Portrait'
                  }
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Select a preset...</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 bg-background border-border z-50" align="start">
          <Command>
            <CommandInput placeholder="Search presets..." className="h-9" />
            <CommandList>
              <CommandEmpty>No preset found.</CommandEmpty>
              {Object.entries(categories).map(([key, category]) => (
                category.presets.length > 0 && (
                  <CommandGroup key={key} heading={category.name}>
                    {category.presets.map((preset) => (
                      <CommandItem
                        key={preset.id}
                        value={`${preset.name} ${preset.description}`}
                        onSelect={() => {
                          onSelectPreset(preset);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {preset.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {preset.description}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {preset.options.size.split('x')[0] === preset.options.size.split('x')[1] 
                                ? 'Sq' 
                                : parseInt(preset.options.size.split('x')[0]) > parseInt(preset.options.size.split('x')[1])
                                  ? 'Land'
                                  : 'Port'
                              }
                            </Badge>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 flex-shrink-0",
                            selectedPresetId === preset.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Manage Custom Presets Link */}
      {onManageCustomPresets && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManageCustomPresets}
          className="w-full h-8 text-xs"
        >
          <Plus className="w-3 h-3 mr-1.5" />
          Manage Custom Presets
        </Button>
      )}
    </div>
  );
};
