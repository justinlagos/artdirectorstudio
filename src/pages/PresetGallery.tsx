import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Heart, 
  Copy, 
  Search, 
  Loader2, 
  TrendingUp,
  Sparkles,
  User
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GenerationOptions } from "@/components/ImageGenerationDialog";

interface PresetWithProfile {
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

export default function PresetGallery() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<PresetWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Map<string, { username: string | null; email: string }>>(new Map());
  const [filteredPresets, setFilteredPresets] = useState<PresetWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [likedPresets, setLikedPresets] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchPresets();
    fetchUserLikes();
  }, []);

  useEffect(() => {
    filterAndSortPresets();
  }, [presets, searchQuery, categoryFilter, sortBy]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchPresets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_generation_presets')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const presetsData = (data || []).map(d => ({
        ...d,
        options: d.options as unknown as GenerationOptions
      }));
      
      setPresets(presetsData);

      // Fetch user profiles for all preset creators
      if (presetsData.length > 0) {
        const userIds = [...new Set(presetsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds);

        if (profilesData) {
          const profileMap = new Map(profilesData.map(p => [p.id, p]));
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching presets:", error);
      toast.error("Failed to load community presets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('preset_likes')
        .select('preset_id')
        .eq('user_id', currentUserId);

      if (error) throw error;
      setLikedPresets(new Set(data?.map(l => l.preset_id) || []));
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const filterAndSortPresets = () => {
    let filtered = [...presets];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(preset => preset.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.like_count - a.like_count;
        case "trending":
          return b.usage_count - a.usage_count;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredPresets(filtered);
  };

  const handleLike = async (presetId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to like presets");
      return;
    }

    const isLiked = likedPresets.has(presetId);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('preset_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('preset_id', presetId);

        if (error) throw error;
        
        setLikedPresets(prev => {
          const newSet = new Set(prev);
          newSet.delete(presetId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('preset_likes')
          .insert({ user_id: currentUserId, preset_id: presetId });

        if (error) throw error;
        
        setLikedPresets(prev => new Set(prev).add(presetId));
      }

      // Refresh presets to get updated like counts
      fetchPresets();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleClone = async (preset: PresetWithProfile) => {
    if (!currentUserId) {
      toast.error("Please sign in to clone presets");
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
      navigate('/settings?tab=presets');
    } catch (error) {
      console.error("Error cloning preset:", error);
      toast.error("Failed to clone preset");
    }
  };

  const categories = ["all", ...Array.from(new Set(presets.map(p => p.category)))];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">Community Presets</h1>
          <p className="text-muted-foreground">
            Discover and use generation presets created by the community
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Most Liked
                  </div>
                </SelectItem>
                <SelectItem value="trending">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Most Used
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Most Recent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Presets Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPresets.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Presets Found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {searchQuery || categoryFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Be the first to share a public preset!"}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
              {filteredPresets.map((preset) => (
                <Card key={preset.id} className="p-4 space-y-3 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-3xl">{preset.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{preset.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {preset.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>
                      {profiles.get(preset.user_id)?.username || 
                       profiles.get(preset.user_id)?.email?.split('@')[0] || 
                       'Anonymous'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {preset.category}
                    </Badge>
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

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                    <span>{preset.usage_count} uses</span>
                    <span>{preset.like_count} likes</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant={likedPresets.has(preset.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLike(preset.id)}
                      className="flex-1"
                    >
                      <Heart 
                        className={`w-4 h-4 mr-2 ${likedPresets.has(preset.id) ? 'fill-current' : ''}`} 
                      />
                      {likedPresets.has(preset.id) ? 'Liked' : 'Like'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(preset)}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Clone
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
