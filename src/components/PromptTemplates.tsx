import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Star, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  prompt: string;
  description: string;
  tags: string[];
  popular?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Cinematic Portrait',
    category: 'Portrait',
    prompt: 'cinematic portrait, dramatic lighting, shallow depth of field, professional photography, 85mm lens, f/1.4, high detail, 4k, award-winning composition',
    description: 'Professional portrait with cinematic lighting',
    tags: ['portrait', 'cinematic', 'photography'],
    popular: true
  },
  {
    id: '2',
    name: 'Product Photography',
    category: 'Product',
    prompt: 'product photography, studio lighting, white background, professional, commercial, high detail, sharp focus, e-commerce quality',
    description: 'Clean product shot for e-commerce',
    tags: ['product', 'commercial', 'studio'],
    popular: true
  },
  {
    id: '3',
    name: 'Fashion Editorial',
    category: 'Fashion',
    prompt: 'fashion editorial photography, high fashion, editorial style, professional model, studio lighting, magazine quality, Vogue style, high-end',
    description: 'Magazine-quality fashion photography',
    tags: ['fashion', 'editorial', 'magazine'],
    popular: true
  },
  {
    id: '4',
    name: 'Architectural Photography',
    category: 'Architecture',
    prompt: 'architectural photography, modern building, professional composition, golden hour lighting, wide angle, sharp detail, commercial real estate quality',
    description: 'Professional architectural photography',
    tags: ['architecture', 'building', 'real estate'],
    popular: false
  },
  {
    id: '5',
    name: 'Food Photography',
    category: 'Food',
    prompt: 'food photography, restaurant quality, professional styling, natural lighting, appetizing, high detail, commercial food photography',
    description: 'Appetizing food photography',
    tags: ['food', 'restaurant', 'commercial'],
    popular: true
  },
  {
    id: '6',
    name: 'Lifestyle Brand',
    category: 'Branding',
    prompt: 'lifestyle brand photography, authentic moments, natural lighting, aspirational, brand campaign style, professional, high-end advertising',
    description: 'Authentic lifestyle brand imagery',
    tags: ['lifestyle', 'branding', 'advertising'],
    popular: true
  },
  {
    id: '7',
    name: 'Minimalist Design',
    category: 'Design',
    prompt: 'minimalist design, clean composition, negative space, modern aesthetic, professional design, high-end, sophisticated',
    description: 'Clean minimalist design',
    tags: ['minimalist', 'design', 'modern'],
    popular: false
  },
  {
    id: '8',
    name: 'Abstract Art',
    category: 'Art',
    prompt: 'abstract art, contemporary, gallery quality, sophisticated color palette, professional artwork, museum quality',
    description: 'Contemporary abstract artwork',
    tags: ['abstract', 'art', 'contemporary'],
    popular: false
  },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
  className?: string;
  referenceImageUrl?: string;
  currentPrompt?: string;
}

export const PromptTemplates = ({ 
  onSelect, 
  className, 
  referenceImageUrl,
  currentPrompt 
}: PromptTemplatesProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ['all', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

  const filteredTemplates = TEMPLATES.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelect = async (templatePrompt: string) => {
    // If we have a reference image, modify the base context intelligently
    if (referenceImageUrl) {
      try {
        // Import intelligence functions
        const { getCachedUnderstanding, analyzeImageDeep } = await import('@/lib/intelligence/imageUnderstanding');
        const { generateCreativeDirectorPrompt } = await import('@/lib/intelligence/promptIntelligence');
        
        // Get image understanding
        let understanding = await getCachedUnderstanding(referenceImageUrl);
        if (!understanding) {
          understanding = await analyzeImageDeep(referenceImageUrl);
        }
        
        if (understanding) {
          // Generate context-aware variation using template as modifier
          const creativePrompt = await generateCreativeDirectorPrompt({
            userPrompt: templatePrompt,
            imageUrl: referenceImageUrl,
            imageUnderstanding: understanding,
          });
          
          // Apply template as a variation modifier while maintaining context
          const enhancedPrompt = `${creativePrompt.prompt}. Apply template style: ${templatePrompt}`;
          onSelect(enhancedPrompt);
          toast.success("Template applied with context awareness", {
            description: "Maintaining image context while applying template"
          });
          return;
        }
      } catch (error) {
        console.error('[PromptTemplates] Error applying template with context:', error);
        // Fallback to basic template application
      }
    }
    
    // If we have a current prompt, modify it with template
    if (currentPrompt && currentPrompt.trim()) {
      const enhancedPrompt = `${currentPrompt}. Apply: ${templatePrompt}`;
      onSelect(enhancedPrompt);
      toast.success("Template applied as variation modifier");
      return;
    }
    
    // Otherwise, use template as base prompt
    onSelect(templatePrompt);
    toast.success("Template applied to prompt");
  };

  const handleCopy = (prompt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard");
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Prompt Templates</h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="capitalize"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
        {filteredTemplates.map(template => (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
              "group"
            )}
            onClick={() => handleSelect(template.prompt)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {template.name}
                    {template.popular && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleCopy(template.prompt, e)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {template.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No templates found matching your search.</p>
        </div>
      )}
    </div>
  );
};

