import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, Calendar, Copy, Check, Sparkles, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface InspireItem {
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
    username?: string;
  };
}

const Inspire = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<InspireItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InspireItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InspireItem | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    fetchInspireItems();
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

  const fetchInspireItems = async () => {
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
            email,
            username
          )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setItems(data as unknown as InspireItem[]);
      setFilteredItems(data as unknown as InspireItem[]);
    } catch (error) {
      console.error("Error fetching inspire items:", error);
      toast.error("Failed to load inspire gallery");
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

  const getCreatorName = (item: InspireItem) => {
    if (item.profile.username) {
      return item.profile.username;
    }
    return item.profile.email.split('@')[0];
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

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
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
              Get Inspired
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Discover community-shared AI creations and creative direction insights
            </p>
            {user ? (
              <Button size="lg" onClick={() => navigate("/")} className="mt-4">
                Open Studio
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate("/auth")} className="mt-4">
                Start Creating
              </Button>
            )}
          </div>

          {/* Tabs & Search */}
          <Tabs defaultValue="fresh" className="w-full">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
              <TabsList className="glass-strong">
                <TabsTrigger value="fresh" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Fresh
                </TabsTrigger>
                <TabsTrigger value="curated" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Curated
                </TabsTrigger>
                <TabsTrigger value="trending" className="gap-2">
                  <Shuffle className="w-4 h-4" />
                  Trending
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-strong"
                />
              </div>
            </div>

            <TabsContent value="fresh" className="mt-0">
              <InspireGrid items={filteredItems} onItemClick={setSelectedItem} getCreatorName={(item) => getCreatorName(item)} formatDate={formatDate} />
            </TabsContent>
            <TabsContent value="curated" className="mt-0">
              <InspireGrid items={filteredItems.slice(0, 12)} onItemClick={setSelectedItem} getCreatorName={(item) => getCreatorName(item)} formatDate={formatDate} />
            </TabsContent>
            <TabsContent value="trending" className="mt-0">
              <InspireGrid items={[...filteredItems].sort((a, b) => b.view_count - a.view_count)} onItemClick={setSelectedItem} getCreatorName={(item) => getCreatorName(item)} formatDate={formatDate} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-6">
              {selectedItem.asset.image_url && (
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={selectedItem.asset.image_url}
                    alt="Generated content"
                    className="w-full"
                  />
                </div>
              )}
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold">
                      {getCreatorName(selectedItem)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">by {getCreatorName(selectedItem)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedItem.asset.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">{selectedItem.asset.type}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{selectedItem.view_count} views</span>
                  </div>
                </div>

                {selectedItem.asset.prompt && (
                  <div className="space-y-3 p-4 rounded-xl bg-muted/30">
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
                    <p className="text-sm leading-relaxed">{selectedItem.asset.prompt}</p>
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
  getCreatorName: (item: InspireItem) => string;
  formatDate: (date: string) => string;
}

const InspireGrid = ({ items, onItemClick, getCreatorName, formatDate }: InspireGridProps) => {
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
          className="group cursor-pointer overflow-hidden hover:shadow-strong transition-all duration-300 interactive-card border-border/50"
          onClick={() => onItemClick(item)}
        >
          {item.asset.image_url && (
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={item.asset.image_url}
                alt="Generated content"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          )}
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="capitalize">{item.asset.type}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>{item.view_count}</span>
              </div>
            </div>
            {item.asset.prompt && (
              <p className="text-sm line-clamp-2 leading-relaxed">{item.asset.prompt}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
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
