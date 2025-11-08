import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Heart, Copy, TrendingUp, Star, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GenerationOptions } from "@/components/ImageGenerationDialog";
import { toast } from "sonner";

interface FeaturedPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  options: GenerationOptions;
  prompt_modifier: string;
  usage_count: number;
  like_count: number;
  created_at: string;
  user_id: string;
}

interface FeaturedPresetsCarouselProps {
  onClone?: (preset: FeaturedPreset) => void;
}

export const FeaturedPresetsCarousel = ({ onClone }: FeaturedPresetsCarouselProps) => {
  const navigate = useNavigate();
  const [staffPicks, setStaffPicks] = useState<FeaturedPreset[]>([]);
  const [trending, setTrending] = useState<FeaturedPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchFeaturedPresets();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchFeaturedPresets = async () => {
    setIsLoading(true);
    try {
      // Get staff picks - presets from admin or specific featured presets
      // For now, we'll get the most liked presets as staff picks
      const { data: staffData } = await supabase
        .from('custom_generation_presets')
        .select('*')
        .eq('is_public', true)
        .order('like_count', { ascending: false })
        .limit(5);

      // Get trending presets - most used recently
      const { data: trendingData } = await supabase
        .from('custom_generation_presets')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .limit(5);

      setStaffPicks((staffData || []).map(d => ({
        ...d,
        options: d.options as unknown as GenerationOptions
      })));

      setTrending((trendingData || []).map(d => ({
        ...d,
        options: d.options as unknown as GenerationOptions
      })));
    } catch (error) {
      console.error("Error fetching featured presets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async (preset: FeaturedPreset) => {
    if (!currentUserId) {
      toast.error("Please sign in to clone presets");
      navigate('/auth');
      return;
    }

    if (onClone) {
      onClone(preset);
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_generation_presets')
        .insert([{
          user_id: currentUserId,
          name: `${preset.name} (Copy)`,
          description: preset.description,
          icon: preset.icon,
          category: preset.category,
          options: preset.options as any,
          prompt_modifier: preset.prompt_modifier,
          is_public: false
        }]);

      if (error) throw error;
      
      toast.success("Preset cloned to your collection!");
    } catch (error) {
      console.error("Error cloning preset:", error);
      toast.error("Failed to clone preset");
    }
  };

  const PresetCard = ({ preset, showBadge }: { preset: FeaturedPreset; showBadge?: 'staff' | 'trending' }) => (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group h-full">
      {showBadge && (
        <div className="absolute top-3 right-3 z-10">
          <Badge 
            variant={showBadge === 'staff' ? 'default' : 'secondary'}
            className="gap-1"
          >
            {showBadge === 'staff' ? (
              <>
                <Star className="w-3 h-3 fill-current" />
                Staff Pick
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3" />
                Trending
              </>
            )}
          </Badge>
        </div>
      )}
      
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-4xl">{preset.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{preset.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {preset.description || 'No description'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {preset.category}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {preset.options.quality}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {preset.like_count}
            </span>
            <span>{preset.usage_count} uses</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleClone(preset)}
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          <Copy className="w-4 h-4 mr-2" />
          Clone Preset
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (staffPicks.length === 0 && trending.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-6 lg:px-8 bg-secondary/20">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Staff Picks */}
        {staffPicks.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <h2 className="text-3xl font-bold">Staff Picks</h2>
                </div>
                <p className="text-muted-foreground">
                  Hand-selected presets loved by our team
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate('/presets')}
                className="gap-2"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {staffPicks.map((preset) => (
                  <CarouselItem key={preset.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <PresetCard preset={preset} showBadge="staff" />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        )}

        {/* Trending Presets */}
        {trending.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-3xl font-bold">Trending Now</h2>
                </div>
                <p className="text-muted-foreground">
                  Most popular presets in the community
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate('/presets')}
                className="gap-2"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {trending.map((preset) => (
                  <CarouselItem key={preset.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <PresetCard preset={preset} showBadge="trending" />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        )}
      </div>
    </section>
  );
};
