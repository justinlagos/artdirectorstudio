import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Search, Image as ImageIcon, FileCode, Share2, Copy, Clock } from "lucide-react";
import { toast } from "sonner";
import { ShareDialog } from "@/components/ShareDialog";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { FloatingCreditTracker } from "@/components/FloatingCreditTracker";

type GeneratedAsset = Database['public']['Tables']['generated_assets']['Row'];

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [shareAssetId, setShareAssetId] = useState<string | null>(null);
  const [shareAssetType, setShareAssetType] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { 
        state: { message: "Please sign in to view your creation history." }
      });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchAssets = async (retries = 3) => {
      try {
        const { data, error } = await supabase
          .from('generated_assets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[History] Fetch error:', error);
          throw error;
        }
        
        console.log(`[History] Fetched ${data?.length || 0} assets`);
        setAssets(data || []);
      } catch (error) {
        console.error("Error fetching assets:", error);
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          setTimeout(() => fetchAssets(retries - 1), 1000);
        } else {
          toast.error("Failed to load projects. Please refresh the page.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();

    // Subscribe to realtime changes - only if user.id is defined
    const channel = supabase
      .channel('assets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_assets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchAssets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('generated_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Asset deleted successfully");
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  if (authLoading || loading) {
    return <LoadingState />;
  }

  if (!user) {
    return null;
  }

  // Filter assets based on search and type
  const filteredAssets = assets.filter((asset) => {
    const analysisData = asset.analysis_data as Record<string, any> | null;
    const params = asset.params as Record<string, any> | null;
    const matchesSearch = searchQuery === "" || 
      asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysisData?.image_overview?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Batch filter: check if this is a batch item
    const isBatch = params?.batchItem === true || params?.batch === true;
    const matchesType = 
      filterType === "all" || 
      asset.type === filterType ||
      (filterType === "batch" && isBatch);
    
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    const config = {
      analysis: { label: "Analysis", icon: FileText, variant: "default" as const },
      image: { label: "Image", icon: ImageIcon, variant: "secondary" as const },
      prompt: { label: "Prompt", icon: FileCode, variant: "outline" as const }
    };
    
    const { label, icon: Icon, variant } = config[type as keyof typeof config] || config.analysis;
    
    return (
      <Badge variant={variant} className="gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3">
            My Projects
          </h1>
          <p className="text-lg text-muted-foreground">
            View all your previous image analyses and generated content
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 sticky top-[57px] z-40 bg-background/95 backdrop-blur-lg py-4 -mx-4 px-4 rounded-lg border border-border/40">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts and analyses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px] h-11">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="analysis">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Analysis
                </div>
              </SelectItem>
              <SelectItem value="image">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Images
                </div>
              </SelectItem>
              <SelectItem value="prompt">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Prompts
                </div>
              </SelectItem>
              <SelectItem value="batch">Batch Results</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredAssets.length === 0 && assets.length === 0 ? (
          <Card className="glass-strong">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">No projects yet</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Upload an image to get started with your first analysis!
              </p>
              <Button 
                onClick={() => navigate("/")}
                size="lg"
                className="min-w-[180px]"
              >
                Analyze Image
              </Button>
            </CardContent>
          </Card>
        ) : filteredAssets.length === 0 ? (
          <Card className="glass-strong">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">No results found</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Try adjusting your search or filter criteria
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                variant="outline"
                size="lg"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="glass-strong hover:shadow-strong transition-all duration-300 hover:-translate-y-1 group">
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      {getTypeBadge(asset.type)}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setShareAssetId(asset.id);
                          setShareAssetType(asset.type);
                        }}
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(asset.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image with lazy loading */}
                  {asset.image_url && (
                    <div className="rounded-xl overflow-hidden border border-border/50 bg-muted flex items-center justify-center min-h-[200px]">
                      <img 
                        src={asset.image_url}
                        alt="Generated content" 
                        className="w-full h-full object-contain max-h-[400px]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Prompt */}
                  {asset.prompt && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Prompt</p>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {asset.prompt}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyPrompt(asset.prompt || "")}
                          className="gap-2"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Prompt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/")}
                        >
                          Generate in Studio
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Analysis */}
                  {asset.analysis_data && (
                    <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm font-medium">Analysis Summary</p>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                        {(asset.analysis_data as Record<string, any>)?.image_overview || 'No overview available'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <Footer />

      <ShareDialog
        open={!!shareAssetId}
        onOpenChange={(open) => {
          if (!open) {
            setShareAssetId(null);
            setShareAssetType("");
          }
        }}
        assetId={shareAssetId || ""}
        assetType={shareAssetType}
      />
      <FloatingCreditTracker />
    </div>
  );
};

export default History;
