import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Eye, Calendar, Copy, Check, Sparkles, Shuffle, 
  Heart, Bookmark, UserPlus, Wand2, Star, Tag, Trash2, 
  MoreVertical, TrendingUp, Award
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InspireItem {
  id: string;
  share_token: string;
  view_count: number;
  like_count: number;
  bookmark_count: number;
  created_at: string;
  featured: boolean;
  staff_pick: boolean;
  tags: {
    style?: string[];
    color?: string[];
    mood?: string[];
    composition?: string[];
  };
  user_id: string;
  asset: {
    id: string;
    type: string;
    image_url: string | null;
    prompt: string | null;
    created_at: string;
  };
  profile: {
    id: string;
    email: string;
    username?: string;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
}

const Inspire = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { openTool } = useToolsModal();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<InspireItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InspireItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [compositionFilter, setCompositionFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InspireItem | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    fetchInspireItems();
  }, []);

  // Real-time subscription for admin changes
  useEffect(() => {
    const channel = supabase
      .channel('inspire-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_assets'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Update the specific item in local state
          setItems(prevItems => 
            prevItems.map(item => 
              item.id === payload.new.id 
                ? { ...item, ...payload.new }
                : item
            )
          );
          
          setFilteredItems(prevItems => 
            prevItems.map(item => 
              item.id === payload.new.id 
                ? { ...item, ...payload.new }
                : item
            )
          );
          
          // Show toast notification for featured/staff pick changes
          if (payload.new.featured !== payload.old.featured) {
            toast.info(
              payload.new.featured 
                ? "An item was featured" 
                : "An item was unfeatured",
              { duration: 3000 }
            );
          }
          
          if (payload.new.staff_pick !== payload.old.staff_pick) {
            toast.info(
              payload.new.staff_pick 
                ? "A new staff pick was added" 
                : "A staff pick was removed",
              { duration: 3000 }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'shared_assets'
        },
        (payload) => {
          console.log('Real-time delete received:', payload);
          
          // Remove the item from local state
          setItems(prevItems => prevItems.filter(item => item.id !== payload.old.id));
          setFilteredItems(prevItems => prevItems.filter(item => item.id !== payload.old.id));
          
          toast.info("An item was removed", { duration: 3000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, styleFilter, colorFilter, moodFilter, compositionFilter, items]);

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const queries = searchQuery.toLowerCase().split('+').map(q => q.trim());
      filtered = filtered.filter(item => {
        const searchText = `${item.asset?.prompt} ${item.tags?.style?.join(' ')} ${item.tags?.color?.join(' ')} ${item.tags?.mood?.join(' ')}`.toLowerCase();
        return queries.every(q => searchText.includes(q));
      });
    }

    // Style filter
    if (styleFilter !== "all") {
      filtered = filtered.filter(item => item.tags?.style?.includes(styleFilter));
    }

    // Color filter
    if (colorFilter !== "all") {
      filtered = filtered.filter(item => item.tags?.color?.includes(colorFilter));
    }

    // Mood filter
    if (moodFilter !== "all") {
      filtered = filtered.filter(item => item.tags?.mood?.includes(moodFilter));
    }

    // Composition filter
    if (compositionFilter !== "all") {
      filtered = filtered.filter(item => item.tags?.composition?.includes(compositionFilter));
    }

    setFilteredItems(filtered);
  };

  const fetchInspireItems = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      
      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await supabase
        .from("shared_assets")
        .select(`
          id,
          share_token,
          view_count,
          like_count,
          bookmark_count,
          created_at,
          featured,
          staff_pick,
          tags,
          user_id,
          asset:generated_assets (
            id,
            type,
            image_url,
            prompt,
            created_at
          ),
          profile:profiles!shared_assets_user_id_fkey (
            id,
            email,
            username
          )
        `, { count: 'exact' })
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Filter out items with null assets
      let validItems = (data as unknown as InspireItem[]).filter(item => item.asset !== null);

      // If user is logged in, fetch their social interactions
      if (user) {
        const [likesRes, bookmarksRes, followsRes] = await Promise.all([
          supabase.from("asset_likes").select("shared_asset_id").eq("user_id", user.id),
          supabase.from("asset_bookmarks").select("shared_asset_id").eq("user_id", user.id),
          supabase.from("user_follows").select("following_id").eq("follower_id", user.id)
        ]);

        const likedIds = new Set(likesRes.data?.map(l => l.shared_asset_id) || []);
        const bookmarkedIds = new Set(bookmarksRes.data?.map(b => b.shared_asset_id) || []);
        const followingIds = new Set(followsRes.data?.map(f => f.following_id) || []);

        validItems = validItems.map(item => ({
          ...item,
          isLiked: likedIds.has(item.id),
          isBookmarked: bookmarkedIds.has(item.id),
          isFollowing: followingIds.has(item.profile.id)
        }));
      }

      if (append) {
        setItems(prev => [...prev, ...validItems]);
        setFilteredItems(prev => [...prev, ...validItems]);
      } else {
        setItems(validItems);
        setFilteredItems(validItems);
      }
      
      setHasMore(validItems.length === ITEMS_PER_PAGE && (count ? from + ITEMS_PER_PAGE < count : true));
    } catch (error) {
      console.error("Error fetching inspire items:", error);
      toast.error("Failed to load inspire gallery");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchInspireItems(nextPage, true);
  }, [page, loadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, loadingMore]);

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getCreatorName = (item: InspireItem) => {
    if (item.profile.username) {
      return item.profile.username;
    }
    return item.profile.email.split('@')[0];
  };

  const handleLike = async (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to like");
      navigate("/auth");
      return;
    }

    try {
      if (item.isLiked) {
        await supabase.from("asset_likes").delete().match({ 
          user_id: user.id, 
          shared_asset_id: item.id 
        });
        toast.success("Removed like");
      } else {
        await supabase.from("asset_likes").insert({ 
          user_id: user.id, 
          shared_asset_id: item.id 
        });
        toast.success("Liked!");
      }
      await fetchInspireItems();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleBookmark = async (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to bookmark");
      navigate("/auth");
      return;
    }

    try {
      if (item.isBookmarked) {
        await supabase.from("asset_bookmarks").delete().match({ 
          user_id: user.id, 
          shared_asset_id: item.id 
        });
        toast.success("Removed bookmark");
      } else {
        await supabase.from("asset_bookmarks").insert({ 
          user_id: user.id, 
          shared_asset_id: item.id 
        });
        toast.success("Bookmarked!");
      }
      await fetchInspireItems();
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  };

  const handleFollow = async (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to follow");
      navigate("/auth");
      return;
    }

    if (user.id === item.profile.id) {
      toast.error("You can't follow yourself");
      return;
    }

    try {
      if (item.isFollowing) {
        await supabase.from("user_follows").delete().match({ 
          follower_id: user.id, 
          following_id: item.profile.id 
        });
        toast.success("Unfollowed");
      } else {
        await supabase.from("user_follows").insert({ 
          follower_id: user.id, 
          following_id: item.profile.id 
        });
        toast.success("Following!");
      }
      await fetchInspireItems();
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow");
    }
  };

  const handleRemix = (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to remix");
      navigate("/auth");
      return;
    }
    // This would open Studio with the prompt prefilled
    navigate("/", { state: { remixPrompt: item.asset.prompt } });
  };

  const handleUseInStudio = (item: InspireItem) => {
    if (!user) {
      toast.error("Sign in to use in Studio");
      navigate("/auth");
      return;
    }
    navigate("/", { state: { remixPrompt: item.asset.prompt } });
  };

  const handleFeatureToggle = async (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;

    try {
      await supabase
        .from("shared_assets")
        .update({ featured: !item.featured })
        .eq("id", item.id);
      
      toast.success(item.featured ? "Removed from featured" : "Added to featured");
      await fetchInspireItems();
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Failed to update");
    }
  };

  const handleStaffPickToggle = async (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;

    try {
      await supabase
        .from("shared_assets")
        .update({ staff_pick: !item.staff_pick })
        .eq("id", item.id);
      
      toast.success(item.staff_pick ? "Removed from staff picks" : "Added to staff picks");
      await fetchInspireItems();
    } catch (error) {
      console.error("Error toggling staff pick:", error);
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (item: InspireItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;

    if (!confirm("Are you sure you want to remove this item?")) return;

    try {
      await supabase.from("shared_assets").delete().eq("id", item.id);
      toast.success("Removed successfully");
      await fetchInspireItems();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-1">
        <Header />
        <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl">
          <div className="space-y-8">
            <Skeleton className="h-32 w-full max-w-2xl mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get featured image for social sharing
  const featuredImage = filteredItems.find(item => item.featured)?.asset?.image_url || 
                        filteredItems[0]?.asset?.image_url ||
                        "https://storage.googleapis.com/gpt-engineer-file-uploads/RlxlOFYt8hNksHtmpOGReulPRGQ2/social-images/social-1762339250584-AD-studio-visuals.jpg";

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Helmet>
        <title>Inspire - Discover AI-Generated Art & Design | ArtDirector Studio</title>
        <meta name="description" content="Explore stunning AI-generated images from the ArtDirector Studio community. Discover creative styles, find inspiration, and create your own masterpieces. Free to browse." />
        <meta name="keywords" content="AI art gallery, AI-generated images, design inspiration, creative community, art styles, digital art, AI design tool" />
        
        {/* OpenGraph Tags for Social Sharing */}
        <meta property="og:title" content="Inspire - Discover AI-Generated Art & Design | ArtDirector Studio" />
        <meta property="og:description" content="Explore stunning AI-generated images from the ArtDirector Studio community. Discover creative styles, find inspiration, and create your own masterpieces." />
        <meta property="og:image" content={featuredImage} />
        <meta property="og:url" content={`${window.location.origin}/inspire`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ArtDirector Studio" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Inspire - Discover AI-Generated Art & Design" />
        <meta name="twitter:description" content="Explore stunning AI-generated images from the ArtDirector Studio community. Discover creative styles and find inspiration." />
        <meta name="twitter:image" content={featuredImage} />
        <meta name="twitter:site" content="@lovable_dev" />
        
        {/* Structured Data for Rich Results */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageGallery",
            "name": "ArtDirector Studio Inspire Gallery",
            "description": "Community gallery of AI-generated images and designs",
            "url": `${window.location.origin}/inspire`,
            "image": featuredImage,
            "publisher": {
              "@type": "Organization",
              "name": "ArtDirector Studio",
              "url": window.location.origin
            }
          })}
        </script>
        
        <link rel="canonical" href={`${window.location.origin}/inspire`} />
      </Helmet>
      
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl">
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Inspire</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight">
              Discover & Create
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Explore community creations, discover styles, and find inspiration for your next masterpiece
            </p>
            {user ? (
              <Button size="lg" onClick={() => navigate("/")} className="mt-4 min-h-[48px]">
                Start Creating
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate("/auth")} className="mt-4 min-h-[48px]">
                Try ArtDirector Free
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="glass p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1">
                <label htmlFor="inspire-search" className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="inspire-search"
                    placeholder="portraits + golden hour"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Search inspiration gallery"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="style-filter" className="text-sm font-medium mb-2 block">Style</label>
                <Select value={styleFilter} onValueChange={setStyleFilter}>
                  <SelectTrigger id="style-filter" aria-label="Filter by style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Styles</SelectItem>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="color-filter" className="text-sm font-medium mb-2 block">Color</label>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger id="color-filter" aria-label="Filter by color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cool">Cool</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="pastel">Pastel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="mood-filter" className="text-sm font-medium mb-2 block">Mood</label>
                <Select value={moodFilter} onValueChange={setMoodFilter}>
                  <SelectTrigger id="mood-filter" aria-label="Filter by mood">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Moods</SelectItem>
                    <SelectItem value="calm">Calm</SelectItem>
                    <SelectItem value="dramatic">Dramatic</SelectItem>
                    <SelectItem value="joyful">Joyful</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="energetic">Energetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="composition-filter" className="text-sm font-medium mb-2 block">Composition</label>
                <Select value={compositionFilter} onValueChange={setCompositionFilter}>
                  <SelectTrigger id="composition-filter" aria-label="Filter by composition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="closeup">Close-up</SelectItem>
                    <SelectItem value="wideangle">Wide Angle</SelectItem>
                    <SelectItem value="centered">Centered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="trending" className="w-full">
            <TabsList className="glass-strong">
              <TabsTrigger value="staffpicks" className="gap-2">
                <Award className="w-4 h-4" />
                Staff Picks
              </TabsTrigger>
              <TabsTrigger value="trending" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending This Week
              </TabsTrigger>
              <TabsTrigger value="fresh" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Fresh
              </TabsTrigger>
              {user && (
                <TabsTrigger value="similar" className="gap-2">
                  <Shuffle className="w-4 h-4" />
                  Similar to Your Work
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="staffpicks" className="mt-8">
              <InspireGrid 
                items={filteredItems.filter(i => i.staff_pick)} 
                onItemClick={setSelectedItem}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onFollow={handleFollow}
                onRemix={handleRemix}
                onFeatureToggle={handleFeatureToggle}
                onStaffPickToggle={handleStaffPickToggle}
                onDelete={handleDelete}
                getCreatorName={getCreatorName}
                formatDate={formatDate}
                isAdmin={isAdmin}
              />
            </TabsContent>

            <TabsContent value="trending" className="mt-8">
              <InspireGrid 
                items={[...filteredItems].sort((a, b) => 
                  (b.like_count + b.view_count * 0.1) - (a.like_count + a.view_count * 0.1)
                ).slice(0, 24)} 
                onItemClick={setSelectedItem}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onFollow={handleFollow}
                onRemix={handleRemix}
                onFeatureToggle={handleFeatureToggle}
                onStaffPickToggle={handleStaffPickToggle}
                onDelete={handleDelete}
                getCreatorName={getCreatorName}
                formatDate={formatDate}
                isAdmin={isAdmin}
              />
            </TabsContent>

            <TabsContent value="fresh" className="mt-8">
              <InspireGrid 
                items={filteredItems} 
                onItemClick={setSelectedItem}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onFollow={handleFollow}
                onRemix={handleRemix}
                onFeatureToggle={handleFeatureToggle}
                onStaffPickToggle={handleStaffPickToggle}
                onDelete={handleDelete}
                getCreatorName={getCreatorName}
                formatDate={formatDate}
                isAdmin={isAdmin}
              />
            </TabsContent>

            {user && (
              <TabsContent value="similar" className="mt-8">
                <InspireGrid 
                  items={filteredItems.filter(i => i.isFollowing).slice(0, 24)} 
                  onItemClick={setSelectedItem}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onFollow={handleFollow}
                  onRemix={handleRemix}
                  onFeatureToggle={handleFeatureToggle}
                  onStaffPickToggle={handleStaffPickToggle}
                  onDelete={handleDelete}
                  getCreatorName={getCreatorName}
                  formatDate={formatDate}
                  isAdmin={isAdmin}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Detail Modal */}
      {isMobile ? (
        <Drawer open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DrawerContent className="max-h-[95dvh] overflow-y-auto">
            {selectedItem && (
              <div className="px-4 pb-4 space-y-6">
                {selectedItem.asset.image_url && (
                  <div className="relative overflow-hidden rounded-2xl bg-muted -mx-4">
                    <img
                      src={selectedItem.asset.image_url}
                      alt="Generated content"
                      className="w-full"
                      loading="lazy"
                    />
                    {(selectedItem.staff_pick || selectedItem.featured) && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        {selectedItem.staff_pick && (
                          <Badge className="bg-amber-500 text-white border-amber-600">
                            <Award className="w-3 h-3 mr-1" />
                            Staff Pick
                          </Badge>
                        )}
                        {selectedItem.featured && (
                          <Badge className="bg-primary">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg">
                        {getCreatorName(selectedItem)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-base">by {getCreatorName(selectedItem)}</p>
                          {user && user.id !== selectedItem.profile.id && (
                            <Button
                              size="sm"
                              variant={selectedItem.isFollowing ? "secondary" : "outline"}
                              onClick={(e) => handleFollow(selectedItem, e)}
                              className="min-h-[36px] text-xs"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              {selectedItem.isFollowing ? "Following" : "Follow"}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(selectedItem.asset.created_at)}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize text-xs px-2 py-1">
                      {selectedItem.asset.type}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <button
                      onClick={(e) => handleLike(selectedItem, e)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors min-h-[44px] px-2"
                    >
                      <Heart className={`h-5 w-5 ${selectedItem.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span className="font-medium">{selectedItem.like_count}</span>
                    </button>

                    <button
                      onClick={(e) => handleBookmark(selectedItem, e)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors min-h-[44px] px-2"
                    >
                      <Bookmark className={`h-5 w-5 ${selectedItem.isBookmarked ? 'fill-primary text-primary' : ''}`} />
                      <span className="font-medium">{selectedItem.bookmark_count}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      <span className="font-medium">{selectedItem.view_count} views</span>
                    </div>
                  </div>

                  {selectedItem.asset.prompt && (
                    <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">Prompt</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyPrompt(selectedItem.asset.prompt!)}
                          className="min-h-[36px]"
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed">{selectedItem.asset.prompt}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button 
                      className="w-full min-h-[48px]" 
                      size="lg"
                      onClick={() => handleUseInStudio(selectedItem)}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Use in Studio
                    </Button>
                    {user && (
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full min-h-[48px]"
                        onClick={(e) => handleRemix(selectedItem, e)}
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        Remix
                      </Button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-4 border-t border-border space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Admin Tools</p>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant={selectedItem.staff_pick ? "default" : "outline"}
                          onClick={(e) => handleStaffPickToggle(selectedItem, e)}
                          className="w-full min-h-[44px]"
                        >
                          <Award className="w-3 h-3 mr-1" />
                          {selectedItem.staff_pick ? "Remove Staff Pick" : "Add Staff Pick"}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedItem.featured ? "default" : "outline"}
                          onClick={(e) => handleFeatureToggle(selectedItem, e)}
                          className="w-full min-h-[44px]"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          {selectedItem.featured ? "Unfeature" : "Feature"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => handleDelete(selectedItem, e)}
                          className="w-full min-h-[44px]"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto">
            {selectedItem && (
              <div className="space-y-6">
                {selectedItem.asset.image_url && (
                  <div className="relative overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={selectedItem.asset.image_url}
                      alt="Generated content"
                      className="w-full"
                      loading="lazy"
                    />
                    {(selectedItem.staff_pick || selectedItem.featured) && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        {selectedItem.staff_pick && (
                          <Badge className="bg-amber-500 text-white border-amber-600">
                            <Award className="w-3 h-3 mr-1" />
                            Staff Pick
                          </Badge>
                        )}
                        {selectedItem.featured && (
                          <Badge className="bg-primary">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg">
                        {getCreatorName(selectedItem)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">by {getCreatorName(selectedItem)}</p>
                          {user && user.id !== selectedItem.profile.id && (
                            <Button
                              size="sm"
                              variant={selectedItem.isFollowing ? "secondary" : "outline"}
                              onClick={(e) => handleFollow(selectedItem, e)}
                              className="min-h-[36px]"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              {selectedItem.isFollowing ? "Following" : "Follow"}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedItem.asset.created_at)}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
                      {selectedItem.asset.type}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleLike(selectedItem, e)}
                            className="flex items-center gap-2 hover:text-foreground transition-colors min-h-[44px]"
                          >
                            <Heart className={`h-5 w-5 ${selectedItem.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                            <span className="font-medium">{selectedItem.like_count}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Like</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleBookmark(selectedItem, e)}
                            className="flex items-center gap-2 hover:text-foreground transition-colors min-h-[44px]"
                          >
                            <Bookmark className={`h-5 w-5 ${selectedItem.isBookmarked ? 'fill-primary text-primary' : ''}`} />
                            <span className="font-medium">{selectedItem.bookmark_count}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Bookmark</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      <span className="font-medium">{selectedItem.view_count} views</span>
                    </div>
                  </div>

                  {selectedItem.asset.prompt && (
                    <div className="space-y-3 p-6 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Prompt</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyPrompt(selectedItem.asset.prompt!)}
                          className="min-h-[36px]"
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed">{selectedItem.asset.prompt}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 min-h-[44px]" 
                      size="lg"
                      onClick={() => handleUseInStudio(selectedItem)}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Use in Studio
                    </Button>
                    {user && (
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="min-h-[44px]"
                        onClick={(e) => handleRemix(selectedItem, e)}
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        Remix
                      </Button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-4 border-t border-border space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Admin Tools</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={selectedItem.staff_pick ? "default" : "outline"}
                          onClick={(e) => handleStaffPickToggle(selectedItem, e)}
                          className="min-h-[36px]"
                        >
                          <Award className="w-3 h-3 mr-1" />
                          {selectedItem.staff_pick ? "Remove Staff Pick" : "Add Staff Pick"}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedItem.featured ? "default" : "outline"}
                          onClick={(e) => handleFeatureToggle(selectedItem, e)}
                          className="min-h-[36px]"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          {selectedItem.featured ? "Unfeature" : "Feature"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => handleDelete(selectedItem, e)}
                          className="min-h-[36px]"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface InspireGridProps {
  items: InspireItem[];
  onItemClick: (item: InspireItem) => void;
  onLike: (item: InspireItem, e: React.MouseEvent) => void;
  onBookmark: (item: InspireItem, e: React.MouseEvent) => void;
  onFollow: (item: InspireItem, e: React.MouseEvent) => void;
  onRemix: (item: InspireItem, e: React.MouseEvent) => void;
  onFeatureToggle: (item: InspireItem, e: React.MouseEvent) => void;
  onStaffPickToggle: (item: InspireItem, e: React.MouseEvent) => void;
  onDelete: (item: InspireItem, e: React.MouseEvent) => void;
  getCreatorName: (item: InspireItem) => string;
  formatDate: (date: string) => string;
  isAdmin: boolean;
}

const InspireGrid = ({ 
  items, 
  onItemClick, 
  onLike,
  onBookmark,
  onFollow,
  onRemix,
  onFeatureToggle,
  onStaffPickToggle,
  onDelete,
  getCreatorName, 
  formatDate,
  isAdmin
}: InspireGridProps) => {
  const { user } = useAuth();

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center glass">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No items found</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Card
          key={item.id}
          className="group cursor-pointer overflow-hidden hover:shadow-strong transition-all duration-300 interactive-card border-border/50 relative"
          onClick={() => onItemClick(item)}
        >
          {item.asset?.image_url && (
            <div className="aspect-square overflow-hidden bg-muted relative">
              <img
                src={item.asset.image_url}
                alt={`Generated artwork - ${item.asset.prompt?.substring(0, 100) || 'Creative inspiration'}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                decoding="async"
                width="400"
                height="400"
              />
              
              {/* Badges */}
              <div className="absolute top-2 right-2 flex gap-1">
                {item.staff_pick && (
                  <Badge className="bg-amber-500 text-white border-amber-600 text-xs">
                    <Award className="w-3 h-3" />
                  </Badge>
                )}
                {item.featured && (
                  <Badge className="bg-primary text-xs">
                    <Star className="w-3 h-3" />
                  </Badge>
                )}
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button
                           size="sm"
                           variant="secondary"
                           className="min-h-[44px] min-w-[44px] p-0"
                           onClick={(e) => onLike(item, e)}
                           aria-label={item.isLiked ? "Unlike this item" : "Like this item"}
                         >
                           <Heart className={`h-4 w-4 ${item.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                         </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {user ? (item.isLiked ? "Unlike" : "Like") : "Sign in to like"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button
                           size="sm"
                           variant="secondary"
                           className="min-h-[44px] min-w-[44px] p-0"
                           onClick={(e) => onBookmark(item, e)}
                           aria-label={item.isBookmarked ? "Remove bookmark" : "Bookmark this item"}
                         >
                           <Bookmark className={`h-4 w-4 ${item.isBookmarked ? 'fill-primary text-primary' : ''}`} />
                         </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {user ? (item.isBookmarked ? "Remove bookmark" : "Bookmark") : "Sign in to bookmark"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button
                           size="sm"
                           variant="secondary"
                           className="min-h-[44px] min-w-[44px] p-0"
                           onClick={(e) => onRemix(item, e)}
                           aria-label="Remix this creation"
                         >
                           <Shuffle className="h-4 w-4" />
                         </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {user ? "Remix this creation" : "Sign in to remix"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button
                           size="sm"
                           variant="secondary"
                           className="min-h-[44px] min-w-[44px] p-0 ml-auto"
                           onClick={(e) => e.stopPropagation()}
                           aria-label="Admin actions menu"
                         >
                           <MoreVertical className="h-4 w-4" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => onStaffPickToggle(item, e)}>
                          <Award className="w-4 h-4 mr-2" />
                          {item.staff_pick ? "Remove Staff Pick" : "Add Staff Pick"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => onFeatureToggle(item, e)}>
                          <Star className="w-4 h-4 mr-2" />
                          {item.featured ? "Unfeature" : "Feature"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => onDelete(item, e)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="capitalize text-xs">{item.asset.type}</Badge>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Heart className={`h-3 w-3 ${item.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{item.like_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{item.view_count}</span>
                </div>
              </div>
            </div>
            
            {item.asset.prompt && (
              <p className="text-sm line-clamp-2 leading-relaxed">{item.asset.prompt}</p>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
              <span className="flex items-center gap-1 font-medium">
                by {getCreatorName(item)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(item.asset.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Inspire;
