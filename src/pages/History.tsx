import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, Search, Image as ImageIcon, FileCode } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type GeneratedAsset = Database['public']['Tables']['generated_assets']['Row'];

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_assets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAssets(data || []);
      } catch (error) {
        console.error("Error fetching assets:", error);
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();

    // Subscribe to realtime changes
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
  }, [user]);

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

  if (authLoading || loading) {
    return <LoadingState />;
  }

  if (!user) {
    return null;
  }

  // Filter assets based on search and type
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = searchQuery === "" || 
      asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.analysis_data as any)?.image_overview?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || asset.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Analysis History</h1>
          <p className="text-muted-foreground">
            View all your previous image analyses and generated content
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts and analyses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
            </SelectContent>
          </Select>
        </div>

        {filteredAssets.length === 0 && assets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                No analysis history yet. Upload an image to get started!
              </p>
              <Button 
                onClick={() => navigate("/")}
                className="mt-4"
              >
                Analyze Image
              </Button>
            </CardContent>
          </Card>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                No results found for your search
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                variant="outline"
                className="mt-4"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssets.map((asset) => (
              <Card key={asset.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {asset.type === 'analysis' ? 'Image Analysis' : asset.type === 'image' ? 'Image' : 'Prompt'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(asset.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {asset.image_url && (
                    <div>
                      <img 
                        src={asset.image_url} 
                        alt="Generated image" 
                        className="w-full max-w-md rounded-lg border border-border"
                      />
                    </div>
                  )}
                  {asset.prompt && (
                    <div>
                      <p className="text-sm font-medium mb-1">Prompt:</p>
                      <p className="text-sm text-muted-foreground">
                        {asset.prompt}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          navigate("/");
                          setTimeout(() => {
                            // Copy prompt to clipboard
                            navigator.clipboard.writeText(asset.prompt || "");
                            toast.success("Prompt copied to clipboard!");
                          }, 100);
                        }}
                      >
                        Load This Prompt
                      </Button>
                    </div>
                  )}
                  {asset.analysis_data && (
                    <div>
                      <p className="text-sm font-medium mb-1">Analysis:</p>
                      <p className="text-sm text-muted-foreground">
                        {(asset.analysis_data as any).image_overview || 'No overview available'}
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
    </div>
  );
};

export default History;
