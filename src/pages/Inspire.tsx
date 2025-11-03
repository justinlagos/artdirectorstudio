import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LAYOUT, PADDING, GRID } from "@/lib/utils/layoutConstants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { InspireCard } from "@/components/inspire/InspireCard";
import { InspireFilters, FilterOptions } from "@/components/inspire/InspireFilters";
import { InspireSearch } from "@/components/inspire/InspireSearch";
import { AdminInspireTools } from "@/components/admin/AdminInspireTools";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { 
  Sparkles, 
  Star, 
  TrendingUp, 
  Wand2,
  Copy,
  Check,
  Heart,
  Bookmark,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface InspireItem {
  id: string;
  share_token: string;
  view_count: number;
  like_count: number;
  bookmark_count: number;
  created_at: string;
  featured: boolean;
  tags: {
    style: string[];
    color: string[];
    mood: string[];
    composition: string[];
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
    email: string;
    username?: string;
  };
}

const Inspire = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const { captureOrigin } = useNavigationContext();
  const [items, setItems] = useState<InspireItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InspireItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<InspireItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InspireItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const [filters, setFilters] = useState<FilterOptions>({
    styles: [],
    colors: [],
    moods: [],
    compositions: [],
  });
  const [searchQuery, setSearchQuery] = useState({ terms: [] as string[], raw: "" });

  useEffect(() => {
    fetchInspireItems();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [filters, searchQuery, items]);

  useEffect(() => {
    // Reset to first page when filtered items change
    setPage(1);
    setDisplayedItems(filteredItems.slice(0, ITEMS_PER_PAGE));
  }, [filteredItems]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    const startIndex = 0;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    setDisplayedItems(filteredItems.slice(startIndex, endIndex));
    setPage(nextPage);
  }, [page, filteredItems]);

  const hasMore = displayedItems.length < filteredItems.length;

  const fetchInspireItems = async () => {
    try {
      const { data, error } = await supabase
        .from("shared_assets")
        .select(`
          id,
          share_token,
          view_count,
          like_count,
          bookmark_count,
          created_at,
          featured,
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
            email,
            username
          )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const validItems = (data as unknown as InspireItem[]).filter(
        item => item.asset !== null && item.asset.image_url
      );
      
      setItems(validItems);
      setFilteredItems(validItems);
    } catch (error) {
      console.error("Error fetching inspire items:", error);
      toast.error("Failed to load inspire gallery");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...items];

    // Apply tag filters
    const hasFilters = 
      filters.styles.length > 0 ||
      filters.colors.length > 0 ||
      filters.moods.length > 0 ||
      filters.compositions.length > 0;

    if (hasFilters) {
      result = result.filter(item => {
        const matchesStyle = filters.styles.length === 0 || 
          filters.styles.some(s => 
            item.tags.style.includes(s) || 
            item.asset.prompt?.toLowerCase().includes(s)
          );
        const matchesColor = filters.colors.length === 0 || 
          filters.colors.some(c => 
            item.tags.color.includes(c) || 
            item.asset.prompt?.toLowerCase().includes(c)
          );
        const matchesMood = filters.moods.length === 0 || 
          filters.moods.some(m => 
            item.tags.mood.includes(m) || 
            item.asset.prompt?.toLowerCase().includes(m)
          );
        const matchesComposition = filters.compositions.length === 0 || 
          filters.compositions.some(c => 
            item.tags.composition.includes(c) || 
            item.asset.prompt?.toLowerCase().includes(c)
          );

        return matchesStyle && matchesColor && matchesMood && matchesComposition;
      });
    }

    // Apply search with AND logic
    if (searchQuery.terms.length > 0) {
      result = result.filter(item => {
        const searchText = (item.asset.prompt || "").toLowerCase();
        return searchQuery.terms.every(term => 
          searchText.includes(term.toLowerCase())
        );
      });
    }

    setFilteredItems(result);
  };

  const handleRemix = (item: InspireItem) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Store the prompt in session storage and navigate to studio
    if (item.asset.prompt) {
      sessionStorage.setItem("remix_prompt", item.asset.prompt);
      navigate("/");
      toast.success("Prompt loaded in Studio!");
    }
  };

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

  const getCreatorName = (item: InspireItem) => {
    if (item.profile.username) {
      return item.profile.username;
    }
    return item.profile.email.split("@")[0];
  };

  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading: loading,
    onLoadMore: loadMore,
  });

  const staffPicks = filteredItems.filter(item => item.featured);
  const trending = [...filteredItems].sort((a, b) => {
    // Trending score based on recent activity
    const scoreA = a.like_count * 2 + a.view_count + a.bookmark_count;
    const scoreB = b.like_count * 2 + b.view_count + b.bookmark_count;
    return scoreB - scoreA;
  });

  const similarToYourWork = user 
    ? filteredItems.filter(item => item.user_id !== user.id).slice(0, 12)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-1">
        <Header />
        <main className={`flex-1 container mx-auto ${PADDING.responsive} py-12 ${LAYOUT.gallery}`}>
          <div className="space-y-8">
            <Skeleton className="h-48 w-full max-w-3xl mx-auto" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 flex-1 max-w-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-96" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className={`flex-1 container mx-auto ${PADDING.responsive} py-8 sm:py-12 ${LAYOUT.gallery}`}>
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* Hero Section */}
          <div className={`text-center space-y-4 sm:space-y-6 ${LAYOUT.contentWide} mx-auto`}>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Inspire Gallery</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent px-4">
              Discover Amazing Creations
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto px-4">
              Explore curated AI art from our community. Get inspired, remix ideas,
              and create your own masterpieces.
            </p>

            {user ? (
              <Button size="lg" onClick={() => navigate("/")} className="mt-4 gap-2 min-h-[48px] text-base">
                <Wand2 className="w-5 h-5" />
                Start Creating
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate("/auth")} className="mt-4 gap-2 min-h-[48px] text-base">
                <Sparkles className="w-5 h-5" />
                Try ArtDirector Free
              </Button>
            )}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="w-full">
              <InspireSearch onSearch={setSearchQuery} />
            </div>
            <InspireFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="glass-strong mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap">
              <TabsTrigger value="all" className="gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">All</span> ({filteredItems.length})
              </TabsTrigger>
              {staffPicks.length > 0 && (
                <TabsTrigger value="featured" className="gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0">
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Staff Picks</span> ({staffPicks.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="trending" className="gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Trending</span>
              </TabsTrigger>
              {user && similarToYourWork.length > 0 && (
                <TabsTrigger value="similar" className="gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0">
                  <Wand2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Similar</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <InspireGrid 
                items={displayedItems} 
                onItemClick={setSelectedItem}
                onRemix={handleRemix}
                getCreatorName={getCreatorName}
                sentinelRef={sentinelRef}
                hasMore={hasMore}
                isLoading={loading}
              />
            </TabsContent>

            {staffPicks.length > 0 && (
              <TabsContent value="featured" className="mt-0">
                <InspireGrid 
                  items={staffPicks}
                  onItemClick={setSelectedItem}
                  onRemix={handleRemix}
                  getCreatorName={getCreatorName}
                />
              </TabsContent>
            )}

            <TabsContent value="trending" className="mt-0">
              <InspireGrid 
                items={trending.slice(0, 24)}
                onItemClick={setSelectedItem}
                onRemix={handleRemix}
                getCreatorName={getCreatorName}
              />
            </TabsContent>

            {user && similarToYourWork.length > 0 && (
              <TabsContent value="similar" className="mt-0">
                <InspireGrid 
                  items={similarToYourWork}
                  onItemClick={setSelectedItem}
                  onRemix={handleRemix}
                  getCreatorName={getCreatorName}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); captureOrigin(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {selectedItem && (
            <div className="space-y-4 sm:space-y-6">
              {/* Admin Tools */}
              {isAdmin && (
                <AdminInspireTools
                  sharedAssetId={selectedItem.id}
                  currentTags={selectedItem.tags}
                  isFeatured={selectedItem.featured}
                  onUpdate={fetchInspireItems}
                />
              )}

              {selectedItem.asset.image_url && (
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
                  <img
                    src={selectedItem.asset.image_url}
                    alt="Generated content"
                    className="w-full"
                  />
                </div>
              )}
              
              <div className="space-y-4 sm:space-y-6">
                {/* Creator Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-base sm:text-lg flex-shrink-0">
                      {getCreatorName(selectedItem)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-base sm:text-lg truncate">by {getCreatorName(selectedItem)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(selectedItem.asset.created_at).toLocaleDateString("en-US", { 
                          month: "long", 
                          day: "numeric", 
                          year: "numeric" 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {selectedItem.featured && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
                      <Star className="w-4 h-4 text-primary fill-current" />
                      <span className="text-sm font-medium text-primary">Staff Pick</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedItem.like_count}</span>
                    <span className="text-muted-foreground">likes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedItem.view_count}</span>
                    <span className="text-muted-foreground">views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedItem.bookmark_count}</span>
                    <span className="text-muted-foreground">bookmarks</span>
                  </div>
                </div>

                {/* Prompt */}
                {selectedItem.asset.prompt && (
                  <div className="space-y-3 p-4 sm:p-6 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <h3 className="font-semibold text-base sm:text-lg">Prompt</h3>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyPrompt(selectedItem.asset.prompt!)}
                          className="min-h-[44px] flex-1 sm:flex-initial"
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Copy</span>
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRemix(selectedItem)}
                          className="min-h-[44px] flex-1 sm:flex-initial"
                        >
                          <Wand2 className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Remix in Studio</span>
                          <span className="sm:hidden">Remix</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed">{selectedItem.asset.prompt}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface InspireGridProps {
  items: InspireItem[];
  onItemClick: (item: InspireItem) => void;
  onRemix: (item: InspireItem) => void;
  getCreatorName: (item: InspireItem) => string;
  sentinelRef?: React.RefObject<HTMLDivElement>;
  hasMore?: boolean;
  isLoading?: boolean;
}

const InspireGrid = ({ 
  items, 
  onItemClick, 
  onRemix, 
  getCreatorName, 
  sentinelRef, 
  hasMore,
  isLoading 
}: InspireGridProps) => {
  if (items.length === 0) {
    return (
      <Card className="p-12 text-center glass">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">No items found</p>
        <p className="text-muted-foreground">Try adjusting your filters or search</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items.map((item) => (
          <InspireCard
            key={item.id}
            id={item.id}
            imageUrl={item.asset.image_url}
            prompt={item.asset.prompt}
            creator={{
              id: item.user_id,
              name: getCreatorName(item),
            }}
            viewCount={item.view_count}
            likeCount={item.like_count}
            bookmarkCount={item.bookmark_count}
            createdAt={item.asset.created_at}
            onClick={() => onItemClick(item)}
            onRemix={() => onRemix(item)}
          />
        ))}
      </div>
      
      {/* Infinite Scroll Sentinel */}
      {sentinelRef && hasMore && (
        <div ref={sentinelRef} className="h-20 flex items-center justify-center">
          {isLoading && (
            <div className="flex gap-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full hidden sm:block" />
              <Skeleton className="h-64 w-full hidden lg:block" />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Inspire;
