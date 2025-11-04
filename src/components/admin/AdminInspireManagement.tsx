import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Star, Eye, Heart, Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SharedAsset {
  id: string;
  asset_id: string;
  user_id: string;
  is_public: boolean;
  featured: boolean;
  view_count: number;
  like_count: number;
  bookmark_count: number;
  created_at: string;
  user_email?: string;
  image_url?: string;
  prompt?: string;
}

export const AdminInspireManagement = () => {
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSharedAssets();
  }, []);

  const fetchSharedAssets = async () => {
    try {
      const { data: sharedAssets, error } = await supabase
        .from('shared_assets')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user emails
      const userIds = [...new Set(sharedAssets?.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]));

      // Get asset details (images and prompts)
      const assetIds = sharedAssets?.map(a => a.asset_id) || [];
      const { data: generatedAssets } = await supabase
        .from('generated_assets')
        .select('id, image_url, prompt')
        .in('id', assetIds);

      const assetMap = new Map(generatedAssets?.map(a => [a.id, a]));

      const assetsWithDetails = sharedAssets?.map(a => {
        const assetDetails = assetMap.get(a.asset_id);
        return {
          ...a,
          user_email: emailMap.get(a.user_id),
          image_url: assetDetails?.image_url,
          prompt: assetDetails?.prompt
        };
      }) || [];

      setAssets(assetsWithDetails);
    } catch (error) {
      console.error("Error fetching shared assets:", error);
      toast.error("Failed to load shared assets");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (assetId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_assets')
        .update({ featured: !currentStatus })
        .eq('id', assetId);

      if (error) throw error;

      toast.success(`Asset ${!currentStatus ? 'featured' : 'unfeatured'} successfully`);
      fetchSharedAssets();
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast.error("Failed to update featured status");
    }
  };

  const removeFromPublic = async (assetId: string) => {
    if (!confirm("Are you sure you want to remove this from the public gallery?")) return;

    try {
      const { error } = await supabase
        .from('shared_assets')
        .update({ is_public: false })
        .eq('id', assetId);

      if (error) throw error;

      toast.success("Asset removed from public gallery");
      fetchSharedAssets();
    } catch (error) {
      console.error("Error removing asset:", error);
      toast.error("Failed to remove asset");
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div>Loading assets...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Inspire Content Management
          <Badge variant="secondary">{assets.length} public assets</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    {asset.image_url ? (
                      <img 
                        src={asset.image_url} 
                        alt="Asset thumbnail"
                        className="w-20 h-20 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm line-clamp-2">
                      {asset.prompt || "No prompt available"}
                    </p>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{asset.user_email || "Unknown"}</TableCell>
                  <TableCell>
                    {asset.featured ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Featured</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {asset.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> {asset.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5" /> {asset.bookmark_count}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={asset.featured ? "default" : "outline"}
                        onClick={() => toggleFeatured(asset.id, asset.featured)}
                        className="gap-1"
                      >
                        <Star className={`w-4 h-4 ${asset.featured ? 'fill-current' : ''}`} />
                        {asset.featured ? 'Unfeature' : 'Feature'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromPublic(asset.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
