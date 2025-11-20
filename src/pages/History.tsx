import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { analytics } from "@/lib/analytics";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingState } from "@/components/LoadingState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Trash2, Search, Image as ImageIcon, FileCode, Share2, Copy, Clock, RefreshCw, Download, Edit } from "lucide-react";
import { toast } from "sonner";
import { ShareDialog } from "@/components/ShareDialog";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";
import { ImageEditor } from "@/components/ImageEditor";

type GeneratedAsset = Database['public']['Tables']['generated_assets']['Row'];

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [shareAssetId, setShareAssetId] = useState<string | null>(null);
  const [shareAssetType, setShareAssetType] = useState<string>("");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { 
        state: { message: "Please sign in to view your creation history." }
      });
    }
  }, [user, authLoading, navigate]);

  // Use react-query with caching for assets - always returns latest items
  const { data: assets = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['generated_assets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log(`[History] Fetching assets for user: ${user.id}`);
      const { data, error } = await supabase
        .from('generated_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) // Always return latest first
        .limit(1000); // Ensure we get all recent items

      if (error) {
        console.error('[History] Fetch error:', error);
        // Silently handle RLS errors
        if (error.code === '42501' || error.code === 'PGRST301') {
          console.warn('[History] RLS error, returning empty array');
          return [];
        }
        throw error;
      }
      
      console.log(`[History] Fetched ${data?.length || 0} assets`);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`assets-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_assets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newAsset = payload.new as GeneratedAsset | null;
          console.log('[History] Realtime update received:', {
            eventType: payload.eventType,
            assetId: newAsset?.id,
            assetType: newAsset?.type,
            hasImageUrl: !!newAsset?.image_url,
            userId: newAsset?.user_id
          });
          // Invalidate and refetch on realtime update
          setTimeout(() => {
            console.log('[History] Refreshing assets after realtime update...');
            refetch();
          }, 200);
        }
      )
      .subscribe((status) => {
        console.log('[History] Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[History] Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[History] Realtime subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleBulkDownload = async () => {
    const assetsToDownload = assets.filter(a => selectedAssets.has(a.id) && a.image_url);
    
    if (assetsToDownload.length === 0) {
      toast.error("No images selected for download");
      return;
    }

    toast.info(`Downloading ${assetsToDownload.length} image(s)...`);

    let successCount = 0;
    let errorCount = 0;

    for (const asset of assetsToDownload) {
      try {
        // Fetch as blob to ensure proper download
        const response = await fetch(asset.image_url!, {
          mode: 'cors',
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${asset.type}-${asset.id.slice(0, 8)}.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        }, 100);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        successCount++;
      } catch (error) {
        console.error(`Failed to download ${asset.id}:`, error);
        errorCount++;
      }
    }

    // Track bulk export
    analytics.track("Asset Exported", {
      tool: "export",
      action: "bulk_download",
      asset_count: assetsToDownload.length,
      success_count: successCount,
      error_count: errorCount,
      success: errorCount === 0,
    });

    toast.success(`Downloaded ${assetsToDownload.length} image(s)`);
    setSelectedAssets(new Set());
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
    
    // Search matching: if search query is empty, match all; otherwise check prompt or analysis
    const matchesSearch = searchQuery === "" || 
      asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysisData?.image_overview?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Batch filter: check if this is a batch item
    const isBatch = params?.batchItem === true || params?.batch === true;
    
    // Type matching: show all if filter is "all", or match specific type, or match batch
    // IMPORTANT: Ensure all image types are shown, including 'generate' action
    const matchesType = 
      filterType === "all" || 
      asset.type === filterType;
      // Batch feature temporarily disabled
      // || (filterType === "batch" && isBatch);
    
    // Ensure generated images (type='image' with action='generate') are always shown
    const isGeneratedImage = asset.type === 'image' && (asset.action === 'generate' || asset.image_url);
    
    return (matchesSearch && matchesType) || (filterType === "all" && isGeneratedImage && matchesSearch);
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
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 pb-20 md:pb-12 max-w-6xl">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3">
            My Projects
          </h1>
          <p className="text-lg text-muted-foreground">
            All your creations automatically saved and organized
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
              {/* Batch feature temporarily disabled */}
              {/* <SelectItem value="batch">Batch Results</SelectItem> */}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={async () => {
              try {
                await refetch();
                toast.success("Projects refreshed");
              } catch (error) {
                console.error("Error refreshing assets:", error);
                toast.error("Failed to refresh projects");
              }
            }}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Selection Mode & Bulk Actions Bar */}
        {filteredAssets.filter(a => a.image_url).length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-4 bg-muted/50 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedAssets.size > 0 ? `${selectedAssets.size} selected` : 'Select all'}
              </span>
            </div>
            {selectedAssets.size > 0 && (
              <div className="flex gap-2">
                <Button onClick={handleBulkDownload} size="sm" variant="default">
                  <Download className="h-4 w-4 mr-2" />
                  Download ({selectedAssets.size})
                </Button>
                <Button 
                  onClick={async () => {
                    const assetsToDelete = Array.from(selectedAssets);
                    let successCount = 0;
                    let errorCount = 0;
                    
                    for (const id of assetsToDelete) {
                      try {
                        await handleDelete(id);
                        successCount++;
                      } catch (error) {
                        errorCount++;
                      }
                    }
                    
                    setSelectedAssets(new Set());
                    if (successCount > 0) {
                      toast.success(`Deleted ${successCount} asset(s)`);
                    }
                    if (errorCount > 0) {
                      toast.error(`Failed to delete ${errorCount} asset(s)`);
                    }
                  }}
                  size="sm" 
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedAssets.size})
                </Button>
              </div>
            )}
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="glass-strong hover:shadow-strong transition-all duration-300 hover:-translate-y-1 group">
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {asset.image_url && (
                        <Checkbox 
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={() => toggleAssetSelection(asset.id)}
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        {getTypeBadge(asset.type)}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.image_url && asset.type === 'image' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            if (asset.image_url) {
                              setEditingImageUrl(asset.image_url);
                            }
                          }}
                          title="Edit Image"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
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

                  {/* Image with lazy loading - Clickable to open workspace */}
                  {asset.image_url && (
                    <div 
                      className="rounded-xl overflow-hidden border border-border/50 bg-muted flex items-center justify-center min-h-[200px] cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        if (asset.image_url) {
                          setEditingImageUrl(asset.image_url);
                        }
                      }}
                    >
                      <img 
                        src={getOptimizedImageUrl(asset.image_url, { width: 800, quality: 85, format: 'webp' })}
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

      {/* Image Editor Dialog */}
      {editingImageUrl && (
        <ImageEditor
          open={!!editingImageUrl}
          onOpenChange={(open) => {
            if (!open) {
              setEditingImageUrl(null);
            }
          }}
          imageUrl={editingImageUrl}
          onImageEdited={(newImageUrl) => {
            // Refresh assets after edit
            refetch();
            setEditingImageUrl(null);
            toast.success("Image edited successfully!");
          }}
        />
      )}

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
      </div>
    </ErrorBoundary>
  );
};

export default History;
