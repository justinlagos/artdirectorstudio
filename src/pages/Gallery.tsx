import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LAYOUT, PADDING, GRID } from "@/lib/utils/layoutConstants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Eye, Calendar, User, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface GalleryItem {
  id: string;
  share_token: string;
  view_count: number;
  created_at: string;
  asset: {
    id: string;
    type: string;
    image_url: string | null;
    prompt: string | null;
    created_at: string;
  };
  profile: {
    email: string;
  };
}

const Gallery = () => {
  const { captureOrigin } = useNavigationContext();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(item =>
        item.asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const fetchGalleryItems = async () => {
    try {
      const { data, error } = await supabase
        .from("shared_assets")
        .select(`
          id,
          share_token,
          view_count,
          created_at,
          asset:generated_assets (
            id,
            type,
            image_url,
            prompt,
            created_at
          ),
          profile:profiles!shared_assets_user_id_fkey (
            email
          )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setItems(data as unknown as GalleryItem[]);
      setFilteredItems(data as unknown as GalleryItem[]);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className={`flex-1 container mx-auto ${PADDING.responsive} py-8 ${LAYOUT.gallery}`}>
          <div className="space-y-6">
            <Skeleton className="h-12 w-full max-w-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={`flex-1 container mx-auto ${PADDING.responsive} py-8 ${LAYOUT.gallery}`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Public Gallery</h1>
            <p className="text-muted-foreground">
              Explore and get inspired by community-shared AI creations
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Gallery Grid */}
          {filteredItems.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No items found matching your search" : "No public items yet"}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.asset.image_url && (
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={item.asset.image_url}
                        alt="Generated content"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{item.asset.type}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>{item.view_count}</span>
                      </div>
                    </div>
                    {item.asset.prompt && (
                      <p className="text-sm line-clamp-2">{item.asset.prompt}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(item.asset.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); captureOrigin(); }}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.asset.image_url && (
                <img
                  src={selectedItem.asset.image_url}
                  alt="Generated content"
                  className="w-full rounded-lg"
                />
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{selectedItem.asset.type}</Badge>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{selectedItem.view_count} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedItem.asset.created_at)}</span>
                    </div>
                  </div>
                </div>
                {selectedItem.asset.prompt && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Prompt</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPrompt(selectedItem.asset.prompt!)}
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Prompt
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedItem.asset.prompt}</p>
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

export default Gallery;
