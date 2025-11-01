import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type GeneratedAsset = Database['public']['Tables']['generated_assets']['Row'];

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Analysis History</h1>
          <p className="text-muted-foreground">
            View all your previous image analyses
          </p>
        </div>

        {assets.length === 0 ? (
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
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
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
                <CardContent>
                  {asset.prompt && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Prompt:</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {asset.prompt}
                      </p>
                    </div>
                  )}
                  {asset.analysis_data && (
                    <div>
                      <p className="text-sm font-medium mb-1">Analysis:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
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
